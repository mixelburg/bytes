import { PrismaClient } from '@prisma/client';

// ponytail: single shared client; fine for one process.
export const db = new PrismaClient();
