// Re-point rows whose image is still an external (dead-host) URL at a fresh
// picsum.photos image, deterministic by row id. Then run migrate-images.ts to
// pull these into the bucket. Idempotent: rows already on a bucket key are skipped.
//
//   bun apps/api/scripts/reseed-dead-images.ts && bun apps/api/scripts/migrate-images.ts
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const seedUrl = (tag: string): string => `https://picsum.photos/seed/${tag}/400/400`;

const products = await db.product.findMany({ select: { id: true, image: true } });
const variants = await db.productVariant.findMany({ select: { id: true, image: true } });

const deadProducts = products.filter((r) => r.image.startsWith('http'));
const deadVariants = variants.filter((r) => r.image.startsWith('http'));
console.log(`re-seeding ${deadProducts.length} products + ${deadVariants.length} variants with picsum URLs`);

for (const r of deadProducts) {
  await db.product.update({ where: { id: r.id }, data: { image: seedUrl(`prod-${r.id}`) } });
}
for (const r of deadVariants) {
  await db.productVariant.update({ where: { id: r.id }, data: { image: seedUrl(`var-${r.id}`) } });
}

console.log('done — now run migrate-images.ts to copy these into the bucket');
await db.$disconnect();
