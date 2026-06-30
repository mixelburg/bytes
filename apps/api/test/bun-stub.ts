// Test stub for the `bun` module. Vitest runs under Node, where `bun` isn't
// resolvable; the app only imports `S3Client` from it, and tests never perform
// real S3 I/O (the resolver and product routes don't touch storage).
export class S3Client {
  constructor(_options?: unknown) {}
  write(_key: string, _data: unknown, _options?: unknown): Promise<number> {
    return Promise.resolve(0);
  }
}
