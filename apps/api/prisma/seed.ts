import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

type NewProduct = {
  title: string;
  description: string;
  price: number;
  category: string;
  image: string;
  rating: number;
  stock: number;
};

const TARGET = 2000; // ponytail: real APIs only give ~215; pad with variants so pagination has thousands.

// Deterministic pseudo-random so seeds are reproducible.
const rng = (seed: number) => {
  let s = seed % 0x7fffffff || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
};
const r = rng(42);

const round2 = (n: number) => Math.round(n * 100) / 100;

// Platzi sometimes returns images as stringified arrays / escaped junk.
const cleanUrl = (raw: unknown, fallbackSeed: number): string => {
  const s = String(raw ?? '')
    .replace(/[[\]"\\]/g, '')
    .trim();
  return /^https?:\/\//.test(s)
    ? s
    : `https://picsum.photos/seed/bytes-${fallbackSeed}/400/400`;
};

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

// --- Source adapters: each returns normalized products, never throws (failure → []) ---

async function fromFakeStore(): Promise<NewProduct[]> {
  const data = (await getJson('https://fakestoreapi.com/products')) as Array<{
    title: string;
    description: string;
    price: number;
    category: string;
    image: string;
    rating?: { rate?: number };
  }>;
  return data.map((p, i) => ({
    title: p.title,
    description: p.description,
    price: round2(p.price),
    category: p.category,
    image: cleanUrl(p.image, 1000 + i),
    rating: p.rating?.rate ?? round2(1 + r() * 4),
    stock: Math.floor(r() * 200),
  }));
}

async function fromPlatzi(): Promise<NewProduct[]> {
  const data = (await getJson(
    'https://api.escuelajs.co/api/v1/products?limit=300&offset=0',
  )) as Array<{
    title: string;
    description: string;
    price: number;
    category?: { name?: string };
    images?: unknown[];
  }>;
  return data.map((p, i) => ({
    title: p.title,
    description: p.description,
    price: round2(p.price),
    category: p.category?.name?.toLowerCase() ?? 'misc',
    image: cleanUrl(p.images?.[0], 2000 + i),
    rating: round2(1 + r() * 4),
    stock: Math.floor(r() * 200),
  }));
}

async function fromFakeApiNet(): Promise<NewProduct[]> {
  const body = (await getJson('https://fakeapi.net/products?limit=1000')) as {
    data?: Array<{
      title: string;
      description: string;
      price: number;
      category: string;
      image: string;
      rating?: { rate?: number };
      stock?: number;
    }>;
  };
  return (body.data ?? []).map((p, i) => ({
    title: p.title,
    description: p.description,
    price: round2(p.price),
    category: p.category,
    image: cleanUrl(p.image, 3000 + i),
    rating: p.rating?.rate ?? round2(1 + r() * 4),
    stock: p.stock ?? Math.floor(r() * 200),
  }));
}

// Last-resort synthetic so the DB is never left empty if every API is down.
function synthetic(n: number): NewProduct[] {
  const CATS = [
    'electronics',
    'clothing',
    'home',
    'books',
    'toys',
    'sports',
    'beauty',
    'grocery',
  ];
  return Array.from({ length: n }, (_, i) => ({
    title: `Product ${i + 1}`,
    description: `A quality item. SKU #${i + 1}.`,
    price: round2(1 + r() * 499),
    category: CATS[Math.floor(r() * CATS.length)],
    image: `https://picsum.photos/seed/bytes-${i + 1}/400/400`,
    rating: round2(1 + r() * 4),
    stock: Math.floor(r() * 200),
  }));
}

// --- Variant generation: apparel → size×color, shoes → sizes, everything else → one default ---

type VariantSpec = {
  options: Record<string, string>;
  optionsLabel: string;
  price: number;
  stock: number;
  image: string;
};

const APPAREL = /cloth|shirt|tee|t-shirt|jacket|dress|apparel|hoodie/i;
const SHOES = /shoe|sneaker|footwear|boot/i;

function variantsFor(base: NewProduct): VariantSpec[] {
  const mk = (options: Record<string, string>, label: string): VariantSpec => ({
    options,
    optionsLabel: label,
    price: round2(base.price * (0.9 + r() * 0.3)),
    stock: Math.floor(r() * 120),
    image: base.image,
  });

  if (SHOES.test(base.category) || SHOES.test(base.title)) {
    return ['38', '40', '42', '44'].map((size) => mk({ size }, size));
  }
  if (APPAREL.test(base.category) || APPAREL.test(base.title)) {
    const out: VariantSpec[] = [];
    for (const size of ['S', 'M', 'L'])
      for (const color of ['Black', 'White'])
        out.push(mk({ size, color }, `${size} / ${color}`));
    return out;
  }
  // Default single variant — keeps the cart/order path uniform (always a variant).
  return [
    {
      options: {},
      optionsLabel: '',
      price: base.price,
      stock: base.stock,
      image: base.image,
    },
  ];
}

async function settle(
  label: string,
  p: Promise<NewProduct[]>,
): Promise<NewProduct[]> {
  try {
    const items = await p;
    console.log(`  ${label}: ${items.length}`);
    return items;
  } catch (e) {
    console.warn(`  ${label}: failed (${(e as Error).message})`);
    return [];
  }
}

async function main() {
  console.log('Fetching real products...');
  const sources = await Promise.all([
    settle('fakestoreapi.com', fromFakeStore()),
    settle('escuelajs.co (Platzi)', fromPlatzi()),
    settle('fakeapi.net', fromFakeApiNet()),
  ]);

  // Dedup real products by title.
  const seen = new Set<string>();
  let base = sources.flat().filter((p) => {
    const key = p.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (base.length === 0) {
    console.warn('All APIs unreachable — falling back to synthetic data.');
    base = synthetic(TARGET);
  }

  // Pad to TARGET by cloning real products with labeled variants + jittered price/stock.
  const products: NewProduct[] = [...base];
  for (let i = 0; products.length < TARGET; i++) {
    const src = base[i % base.length];
    const v = Math.floor(i / base.length) + 2;
    products.push({
      ...src,
      title: `${src.title} · v${v}`,
      price: round2(src.price * (0.8 + r() * 0.4)),
      rating: round2(Math.min(5, Math.max(1, src.rating + (r() - 0.5)))),
      stock: Math.floor(r() * 200),
    });
  }

  // Build each product's variants up front so we can denormalize price range + stock onto the product.
  const built = products.map((src) => {
    const specs = variantsFor(src);
    const prices = specs.map((s) => s.price);
    return {
      product: {
        title: src.title,
        description: src.description,
        category: src.category,
        image: src.image,
        rating: src.rating,
        priceMin: Math.min(...prices),
        priceMax: Math.max(...prices),
        totalStock: specs.reduce((sum, s) => sum + s.stock, 0),
      },
      specs,
    };
  });

  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.productVariant.deleteMany();
  await db.product.deleteMany();

  const created = await db.product.createManyAndReturn({
    data: built.map((b) => b.product),
  });
  const variants = created.flatMap((row, i) =>
    built[i].specs.map((s) => ({ ...s, productId: row.id })),
  );
  await db.productVariant.createMany({ data: variants });

  console.log(
    `Seeded ${products.length} products (${base.length} real + ${products.length - base.length} clones) ` +
      `and ${variants.length} variants.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
