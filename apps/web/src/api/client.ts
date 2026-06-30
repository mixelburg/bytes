import type { AppType } from '@bytes/api';
import { hc } from 'hono/client';
import { getSessionId } from './session';

// Typed RPC client generated from the backend's route definitions — no codegen.
// `api.products.$get({ query })`, `api.orders.$post({ json })`, etc. are fully typed.
// Every request carries the anonymous `x-session-id` header so the backend can
// scope cart, saved, and orders without a login.
export const api = hc<AppType>(
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, {
        ...init,
        headers: { ...init?.headers, 'x-session-id': getSessionId() },
      }),
  },
);
