## Why

Today the cart lives only in Redux (lost on reload), order history isn't kept at all (the client remembers just the last order), and the SAVED nav tab is a dead `active: false` stub. Shoppers lose their cart and have no way to revisit past orders or save products. We want this data to survive reloads and follow the user — without forcing anyone to create an account.

## What Changes

- Mint an **anonymous session id** in the browser on first load (stored in `localStorage`), sent on every API request via an `x-session-id` header. No login, no passwords, no PII.
- Add a backend **`Session`** record that owns each anonymous user's per-session data; orders attach to it so history can be queried.
- **Cart persists to the backend**: hydrate from the server on load, write back (debounced) on change. Redux stays the in-memory working copy.
- **Saved items** become real: save/unsave a product, persisted per session, and the SAVED screen lists them.
- **Order history**: `GET /orders` returns the session's past orders; a screen renders them with loading/empty/error states.

## Capabilities

### New Capabilities
- `anonymous-session`: browser-minted session identity and the server-side per-session store that scopes cart, saved items, and orders without authentication.
- `saved-items`: save/unsave products and view the saved list, persisted per session.
- `order-history`: view past orders placed under the current session.

### Modified Capabilities
- `cart-and-checkout`: the cart now persists server-side per session (was in-memory only), and placed orders attach to the session id.

## Impact

- **Backend** (`apps/api`): new `Session` model + `Order.sessionId` relation in `prisma/schema.prisma`; new routes in `src/main.ts` (`GET /session`, `PUT /session`, `GET /orders`), and `POST /orders` reads the session header. Requires `db:push` (no migrations configured for SQLite dev).
- **Frontend** (`apps/web`): new `session` util + header injection into the `hc` client (`api/client.ts`); cart hydrate/sync; new `saved` RTK slice; new SAVED and order-history screens; SAVED/ME nav wired up.
- **No new dependencies.** Session id via `crypto.randomUUID()`, persistence via the existing Prisma/Hono/RTK/TanStack stacks.
