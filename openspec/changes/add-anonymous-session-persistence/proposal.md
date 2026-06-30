## Why

Today the cart lives only in Redux (lost on reload), order history isn't kept at all (the client remembers just the last order), and the SAVED nav tab is a dead `active: false` stub. Shoppers lose their cart and have no way to revisit past orders or save products. We want this data to survive reloads and follow the user — without forcing anyone to create an account.

## What Changes

- Mint an **anonymous session id** in the browser on first load (stored in `localStorage`), sent on every API request via an `x-session-id` header. No login, no passwords, no PII.
- Add a backend **`Session`** record that owns each anonymous user's per-session data; orders attach to it so history can be queried.
- **Cart persists to the backend**: hydrate from the server on load, write back (debounced) on change. Redux stays the in-memory working copy.
- **Saved set persists to the backend** instead of `localStorage`: the saved slice (from `wire-saved-page`) is hydrated from `GET /session` and rides the same debounced `PUT /session` as the cart.
- **Order history**: `GET /orders` returns the session's past orders; a screen renders them with loading/empty/error states and links each to its tracking view.

> **Relationship to in-flight changes.** Two pending changes overlap and are
> accounted for here rather than duplicated:
> - `wire-saved-page` introduces the `saved-items` capability (save toggle, `/saved`
>   screen, nav) with a **localStorage** saved set. This change only **swaps that
>   persistence to the backend session**. Apply order: `wire-saved-page` → this change.
> - `order-tracking` adds the `order-tracking` capability and owns the
>   `cart-and-checkout` order-placement delta (delivery address + "track order" link)
>   plus `GET /orders/:id`. This change does **not** re-modify that requirement; it
>   adds session attribution (so orders can be listed) and `GET /orders` (history),
>   which compose with order-tracking on the same `POST /orders`. History rows link
>   to its `/track/:id` screen.

## Capabilities

### New Capabilities
- `anonymous-session`: browser-minted session identity and the server-side per-session store that scopes cart, saved items, and orders without authentication.
- `order-history`: view past orders placed under the current session (links each to `order-tracking`'s `/track/:id`).

### Modified Capabilities
- `cart-and-checkout`: the cart now persists server-side per session (was in-memory only). Only the cart requirement is modified; order placement is left to `order-tracking`.
- `saved-items` (from `wire-saved-page`): the saved set persists to the backend session instead of `localStorage`.

## Impact

- **Backend** (`apps/api`): new `Session` model + `Order.sessionId` relation in `prisma/schema.prisma`; new routes in `src/main.ts` (`GET /session`, `PUT /session`, `GET /orders`), and `POST /orders` reads the session header. Requires `db:push` (no migrations configured for SQLite dev).
- **Frontend** (`apps/web`): new `session` util + header injection into the `hc` client (`api/client.ts`); cart hydrate/sync; new `saved` RTK slice; new SAVED and order-history screens; SAVED/ME nav wired up.
- **No new dependencies.** Session id via `crypto.randomUUID()`, persistence via the existing Prisma/Hono/RTK/TanStack stacks.
