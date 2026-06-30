// Anonymous identity: a UUID minted once and kept in localStorage, sent as the
// `x-session-id` header on every API request. No login — clearing storage starts
// a fresh session. Cached in-module so a blocked localStorage (private mode)
// still yields a stable id for the page's lifetime.
const KEY = 'bytes.sid';

let cached: string | null = null;

export function getSessionId(): string {
  if (cached) return cached;
  try {
    cached = localStorage.getItem(KEY);
    if (!cached) {
      cached = crypto.randomUUID();
      localStorage.setItem(KEY, cached);
    }
  } catch {
    // localStorage unavailable — ephemeral id, stable for this page load.
    cached = crypto.randomUUID();
  }
  return cached;
}
