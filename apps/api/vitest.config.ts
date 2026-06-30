import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Point Prisma at the seeded dev DB with an absolute path so the test is cwd-independent.
const dbPath = fileURLToPath(new URL('./prisma/dev.db', import.meta.url));

export default defineConfig({
  // `bun` isn't resolvable under Node; stub it (tests do no real S3 I/O).
  resolve: {
    alias: {
      bun: fileURLToPath(new URL('./test/bun-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // Specs share one SQLite file; parallel files deadlock on write locks.
    fileParallelism: false,
    env: {
      DATABASE_URL: `file:${dbPath}`,
      // S3 config is read at import time; tests never hit the network, so dummy values suffice.
      S3_ENDPOINT: 'http://localhost:9000',
      S3_PUBLIC_URL: 'https://cdn.test',
      S3_BUCKET: 'test-bucket',
      S3_ACCESS_KEY: 'test',
      S3_SECRET_KEY: 'test',
    },
  },
});
