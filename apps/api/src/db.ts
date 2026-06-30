import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';

// ponytail: single shared client; fine for one process.
// Prisma 7 requires a driver adapter (no native engine). libSQL is used over
// better-sqlite3 because the latter's native binding fails to load under Bun.
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});
export const db = new PrismaClient({ adapter });
