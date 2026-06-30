import { hc } from 'hono/client';
import type { AppType } from '@bytes/api';

// Typed RPC client generated from the backend's route definitions — no codegen.
// `api.products.$get({ query })`, `api.orders.$post({ json })`, etc. are fully typed.
export const api = hc<AppType>(import.meta.env.VITE_API_URL ?? 'http://localhost:3001');
