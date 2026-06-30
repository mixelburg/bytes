import { defineConfig } from 'prisma/config';

// Prisma 7 moved CLI connection config out of schema.prisma and no longer
// auto-loads .env, so read it directly with a fallback. SQLite urls resolve
// relative to this file (apps/api), so `file:./dev.db` → apps/api/dev.db —
// the same file the runtime adapter (src/db.ts) opens.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'bun prisma/seed.ts' },
  datasource: { url: process.env.DATABASE_URL ?? 'file:./dev.db' },
});
