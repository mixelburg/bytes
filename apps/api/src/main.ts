import { S3Client } from 'bun';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { db } from './db';
import { type Address, buildTimeline } from './tracking';

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`missing required env: ${key}`);
  return value;
};

// RustFS is S3-compatible, so Bun's native S3 client wires straight in — no SDK needed.
const BUCKET = requireEnv('S3_BUCKET');
const S3_PUBLIC_URL = requireEnv('S3_PUBLIC_URL');
const s3 = new S3Client({
  endpoint: requireEnv('S3_ENDPOINT'),
  accessKeyId: requireEnv('S3_ACCESS_KEY'),
  secretAccessKey: requireEnv('S3_SECRET_KEY'),
  bucket: BUCKET,
});

// `image` holds either a bucket storage key or an absolute external URL.
// Resolve keys to public URLs on the way out; pass external URLs through unchanged.
export const imageUrl = (value: string): string =>
  value.startsWith('http') ? value : `${S3_PUBLIC_URL}/${BUCKET}/${value}`;

const SORTS = {
  'price-asc': { priceMin: 'asc' },
  'price-desc': { priceMin: 'desc' },
  'rating-desc': { rating: 'desc' },
  newest: { createdAt: 'desc' },
} as const;

type SortKey = keyof typeof SORTS;

const clamp = (n: number, min: number, max: number) =>
  Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min;

// Routes are chained so Hono accumulates the full type into `AppType`,
// which the UI consumes via `hc<AppType>` for an end-to-end typed client.
const app = new Hono()
  .use('*', cors())
  .get('/health', (c) => c.json({ ok: true }))
  // GET /products?page=1&limit=20&search=&category=&sort=price-asc
  .get('/products', async (c) => {
    const page = clamp(
      parseInt(c.req.query('page') ?? '1', 10),
      1,
      Number.MAX_SAFE_INTEGER,
    );
    const limit = clamp(parseInt(c.req.query('limit') ?? '20', 10), 1, 100);
    const search = c.req.query('search')?.trim() ?? '';
    const category = c.req.query('category')?.trim() ?? '';
    const sortKey = (c.req.query('sort') ?? 'newest') as SortKey;
    const orderBy = SORTS[sortKey] ?? SORTS.newest;

    const where = {
      ...(search ? { title: { contains: search } } : {}),
      ...(category ? { category } : {}),
    };

    const [rows, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          category: true,
          image: true,
          rating: true,
          priceMin: true,
          priceMax: true,
          totalStock: true,
        },
      }),
      db.product.count({ where }),
    ]);

    // inStock derived from the denormalized totalStock; raw count stays server-side.
    const items = rows.map(({ totalStock, ...p }) => ({
      ...p,
      image: imageUrl(p.image),
      inStock: totalStock > 0,
    }));

    return c.json({ items, total, page, limit, hasMore: page * limit < total });
  })
  .get('/categories', async (c) => {
    const rows = await db.product.findMany({
      distinct: ['category'],
      select: { category: true },
    });
    return c.json(rows.map((r) => r.category).sort());
  })
  .get('/products/:id', async (c) => {
    const id = parseInt(c.req.param('id'), 10);
    if (!Number.isInteger(id)) return c.json({ error: 'invalid id' }, 400);
    const product = await db.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { price: 'asc' } } },
    });
    if (!product) return c.json({ error: 'not found' }, 404);
    return c.json({
      ...product,
      image: imageUrl(product.image),
      variants: product.variants.map((v) => ({
        ...v,
        image: imageUrl(v.image),
      })),
    });
  })
  // POST /orders { items: [{ variantId, quantity }] }
  .post('/orders', async (c) => {
    const body = await c.req.json().catch(() => null);
    const items: unknown = body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'items required' }, 400);
    }

    const parsed = items.map((it) => ({
      variantId: Number((it as Record<string, unknown>).variantId),
      quantity: Number((it as Record<string, unknown>).quantity),
    }));
    if (
      parsed.some(
        (it) =>
          !Number.isInteger(it.variantId) ||
          !Number.isInteger(it.quantity) ||
          it.quantity < 1,
      )
    ) {
      return c.json({ error: 'invalid items' }, 400);
    }

    // Optional delivery address — each field a trimmed string or null. The
    // server owns price/stock, but the address is buyer-supplied display data.
    const str = (v: unknown): string | null =>
      typeof v === 'string' && v.trim() ? v.trim() : null;
    const a = (body?.address ?? {}) as Record<string, unknown>;
    const address = {
      recipient: str(a.recipient),
      line1: str(a.line1),
      city: str(a.city),
      postal: str(a.postal),
      country: str(a.country),
    };

    // Price + stock are authoritative on the server, never trusted from the client.
    const order = await db
      .$transaction(async (tx) => {
        const variants = await tx.productVariant.findMany({
          where: { id: { in: parsed.map((it) => it.variantId) } },
        });
        const byId = new Map(variants.map((v) => [v.id, v]));

        let total = 0;
        const lines = parsed.map((it) => {
          const variant = byId.get(it.variantId);
          if (!variant)
            throw new Response(
              JSON.stringify({ error: `unknown variant ${it.variantId}` }),
              { status: 400 },
            );
          if (variant.stock < it.quantity)
            throw new Response(
              JSON.stringify({
                error: `insufficient stock for variant ${variant.id}`,
              }),
              { status: 409 },
            );
          total += variant.price * it.quantity;
          return {
            variantId: variant.id,
            productId: variant.productId,
            quantity: it.quantity,
            price: variant.price,
          };
        });

        // Decrement variant stock and keep the product's denormalized totalStock in sync.
        const byProduct = new Map<number, number>();
        for (const l of lines)
          byProduct.set(
            l.productId,
            (byProduct.get(l.productId) ?? 0) + l.quantity,
          );

        await Promise.all([
          ...lines.map((l) =>
            tx.productVariant.update({
              where: { id: l.variantId },
              data: { stock: { decrement: l.quantity } },
            }),
          ),
          ...[...byProduct].map(([productId, qty]) =>
            tx.product.update({
              where: { id: productId },
              data: { totalStock: { decrement: qty } },
            }),
          ),
        ]);

        return tx.order.create({
          data: {
            total,
            ...address,
            items: {
              create: lines.map(({ variantId, quantity, price }) => ({
                variantId,
                quantity,
                price,
              })),
            },
          },
          include: { items: true },
        });
      })
      .catch((e) => {
        if (e instanceof Response) return e;
        throw e;
      });

    if (order instanceof Response) return order;
    return c.json(order, 201);
  })
  // GET /orders/:id -> order + deterministic delivery timeline (for tracking)
  .get('/orders/:id', async (c) => {
    const order = await db.order.findUnique({
      where: { id: c.req.param('id') },
    });
    if (!order) return c.json({ error: 'not found' }, 404);

    const address: Address = {
      recipient: order.recipient,
      line1: order.line1,
      city: order.city,
      postal: order.postal,
      country: order.country,
    };
    const timeline = buildTimeline(order.createdAt, address, new Date());

    return c.json({
      id: order.id,
      total: order.total,
      createdAt: order.createdAt.toISOString(),
      address,
      ...timeline,
    });
  })
  // POST /images  (multipart form, field `file`) -> { key, url }
  .post('/images', async (c) => {
    const form = await c.req.parseBody();
    const file = form.file;
    if (!(file instanceof File))
      return c.json({ error: 'file field required' }, 400);
    if (!file.type.startsWith('image/'))
      return c.json({ error: 'must be an image' }, 415);
    if (file.size > 5 * 1024 * 1024)
      return c.json({ error: 'image too large (max 5MB)' }, 413);

    const ext =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'img';
    const key = `${crypto.randomUUID()}.${ext}`;
    await s3.write(key, file, { type: file.type });

    return c.json({ key, url: `${S3_PUBLIC_URL}/${BUCKET}/${key}` }, 201);
  });

export type AppType = typeof app;

export default { port: Number(process.env.PORT ?? 3001), fetch: app.fetch };
