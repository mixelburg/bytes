// One-off: pull external product/variant images into our RustFS bucket and
// replace each external URL with the stored key. Idempotent — rerunning only
// retries URLs that previously failed (migrated rows already hold a bare key).
//
//   bun apps/api/scripts/migrate-images.ts
//
// On a failed download (dead demo host, non-image, timeout) the row is left as
// its original URL so nothing breaks; reruns pick it up again.
import { PrismaClient } from '@prisma/client';
import { S3Client } from 'bun';

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`missing required env: ${key}`);
  return value;
};

const db = new PrismaClient();
const s3 = new S3Client({
  endpoint: requireEnv('S3_ENDPOINT'),
  accessKeyId: requireEnv('S3_ACCESS_KEY'),
  secretAccessKey: requireEnv('S3_SECRET_KEY'),
  bucket: requireEnv('S3_BUCKET'),
});

const CONCURRENCY = 16;
const isExternal = (s: string): boolean => s.startsWith('http');

const products = await db.product.findMany({ select: { id: true, image: true } });
const variants = await db.productVariant.findMany({ select: { id: true, image: true } });

// Dedupe: the same URL is reused across products/variants — upload it once.
const urls = [...new Set([...products, ...variants].map((r) => r.image).filter(isExternal))];
console.log(`rows: ${products.length} products, ${variants.length} variants | unique external URLs: ${urls.length}`);

const keyByUrl = new Map<string, string>();
const failures: string[] = [];
let processed = 0;

async function fetchAndStore(url: string): Promise<void> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!type.startsWith('image/')) throw new Error(`not an image (${type || 'no content-type'})`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) throw new Error('empty body');
    const ext = (type.split('/')[1] ?? 'img').replace(/[^a-z0-9]/g, '') || 'img';
    const key = `${crypto.randomUUID()}.${ext}`;
    await s3.write(key, buf, { type });
    keyByUrl.set(url, key);
  } catch (e) {
    failures.push(url);
  } finally {
    if (++processed % 200 === 0) console.log(`  ${processed}/${urls.length} (uploaded ${keyByUrl.size}, failed ${failures.length})`);
  }
}

// Fixed-size worker pool over the URL list.
let cursor = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < urls.length) await fetchAndStore(urls[cursor++]);
  }),
);

console.log(`download done: uploaded ${keyByUrl.size}, failed ${failures.length}. Updating DB…`);

// One updateMany per migrated URL flips every product/variant row sharing it.
let updated = 0;
for (const [url, key] of keyByUrl) {
  const [p, v] = await Promise.all([
    db.product.updateMany({ where: { image: url }, data: { image: key } }),
    db.productVariant.updateMany({ where: { image: url }, data: { image: key } }),
  ]);
  updated += p.count + v.count;
}

console.log(`\nDONE. unique URLs ${urls.length} | uploaded ${keyByUrl.size} | failed ${failures.length} | rows updated ${updated}`);
if (failures.length) console.log(`failed hosts sample:`, [...new Set(failures.map((u) => { try { return new URL(u).host; } catch { return '?'; } }))].slice(0, 20));

await db.$disconnect();
