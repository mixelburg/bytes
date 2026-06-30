## Context

The app already has a typed Hono + Prisma backend and an `hc<AppType>` client. Cart lives in a Redux slice with no persistence; `Order`/`OrderItem` tables exist but orders aren't linked to any user, and the client only keeps the last order in memory. SAVED is an inert nav stub. We want cart, saved items, and order history to survive reloads and follow the user, with **no authentication** — identity is a browser-minted opaque id.

Constraints: TypeScript with no `any`; reads via TanStack Query, cart/checkout writes via RTK; SQLite in dev (`db:push`, no migration files); MUI v9 + styled-components; every async flow needs loading/empty/error/success states.

## Goals / Non-Goals

**Goals:**
- A stable anonymous identity per browser, sent to the backend on every request.
- Server-persisted cart and saved items, scoped to that identity.
- Order history queryable for the current identity.
- Zero new dependencies; minimal new surface area.

**Non-Goals:**
- Real auth, accounts, cross-device sync, or merging two sessions. (A session is one browser's `localStorage`. Clear storage → fresh session. Acceptable for an anonymous marketplace demo.)
- Server-authoritative cart validation at edit time — the server stays authoritative only at order time, exactly as today.
- Abuse/rate-limiting of session creation, GDPR export/delete tooling, session expiry/GC.

## Decisions

### Identity: client-minted UUID in `localStorage`, sent as `x-session-id`
On first load, `getSessionId()` returns the stored id or mints one with `crypto.randomUUID()` and persists it. A custom `fetch` wrapper passed to `hc()` injects the `x-session-id` header on every request.

- **Why over cookies?** No SSR, no CSRF surface, no cookie config across the Capacitor webview origin. A header from `localStorage` is the least-moving-parts option and works identically on web and native.
- **Why client-minted over server-issued?** Saves a round-trip and a "create session" endpoint; an opaque UUID carries no trust (every per-session row is namespaced by it, nothing sensitive is exposed), so letting the client pick it is fine.
- **Trade-off:** a user clearing storage loses their data; two browsers are two sessions. Accepted per Non-Goals.

### Storage: one `Session` row with JSON blobs for cart + saved; orders as a relation
```prisma
model Session {
  id        String   @id              // client-minted UUID
  cart      Json     @default("[]")   // CartEntry[] snapshot (variantId, qty, title, price, …)
  saved     Json     @default("[]")   // number[] of productIds
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]
}
```
`Order` gains `sessionId String?` + relation (nullable so existing seeded orders survive `db:push`).

- **Why blobs for cart/saved, not normalized `CartItem`/`SavedItem` tables?** The cart is already a client-owned snapshot bag (price/stock captured at add-time, server re-validates at order time). Normalizing it server-side would duplicate that model, add joins, and buy nothing — the server never reasons about individual cart rows. Saved is just a list of product ids. A blob is read/written whole; that's the entire access pattern. `// ponytail: JSON blob — normalize into CartItem rows only if the server ever needs to query/aggregate cart contents.`
- **Why orders stay a real relation?** Orders already are tables with their own integrity (stock decrement in a transaction) and are queried/listed individually. Linking by `sessionId` is one nullable column.

### Endpoints
- `GET /session` — upsert-on-read using the header id; returns `{ cart, saved }`. Upsert means the client never needs a separate "create" call.
- `PUT /session` — body `{ cart?, saved? }`; upserts and overwrites whichever blob is present. One endpoint, last-write-wins.
- `GET /orders` — returns the session's orders (newest first) with their items. Empty array if none / no header.
- `POST /orders` — unchanged contract, but now reads `x-session-id` and stamps the order's `sessionId` inside the existing transaction.

All read the id from a small `sessionId(c)` helper; requests without the header get an empty/neutral response rather than an error (the UI degrades, matching the existing "API down" posture).

### Cart + saved stay in Redux; only orders use TanStack Query
TanStack Query is for state the **server owns** and you cache/invalidate. Here the server is a dumb blob store — it never computes or validates the cart, it just holds a copy; the **client is the source of truth**. So cart/saved are Redux (interaction state with a server backup), and only orders — a genuine server-authoritative read — use TanStack Query.

- **Cart → Redux.** High-frequency local edits (qty +/–), derived `subtotal/shipping/total/count` selectors, edited far more than read. In TanStack you'd optimistic-update on every click and the query cache would *become* the real state — reimplementing Redux inside `queryClient`. It already works in RTK, and CLAUDE.md mandates RTK for cart/checkout.
- **Saved → Redux, alongside cart.** A `number[]`. It rides the *same* `PUT /session` blob as the cart, so a single owner must write that blob — otherwise two writers clobber each other's field. Keeping saved in the same store with the same debounced writer gives one write path, no race.
- **Order history → TanStack Query** (`useQuery(['orders'])`), matching the project's read/write split. Checkout success invalidates `['orders']`.

### Client sync: hydrate on load, single debounced write-back
One bootstrap read fills both slices; one `store.subscribe` is the *only* thing that writes the blob.

```ts
// saved-slice.ts — saved is just ids; toggle + hydrate
const savedSlice = createSlice({
  name: 'saved',
  initialState: [] as number[],
  reducers: {
    toggleSaved: (s, { payload }: PayloadAction<number>) => {
      const i = s.indexOf(payload); i === -1 ? s.push(payload) : s.splice(i, 1);
    },
    hydrateSaved: (_s, { payload }: PayloadAction<number[]>) => payload,
  },
});
export const selectIsSaved = (id: number) => (s: RootState) => s.saved.includes(id);

// cart-slice.ts — one reducer to seed items from the server array
hydrateCart: (_s, { payload }: PayloadAction<CartEntry[]>) =>
  ({ items: Object.fromEntries(payload.map((e) => [e.variantId, e])) }),

// bootstrap (app start) — header rides the hc fetch wrapper automatically
const { cart, saved } = await api.session.$get().then((r) => r.json());
store.dispatch(hydrateCart(cart));
store.dispatch(hydrateSaved(saved));

// the ONLY writer — RTK keeps slice refs stable when unchanged, so the
// equality check skips writes when an unrelated slice (e.g. order) changes
let last = { cart: store.getState().cart.items, saved: store.getState().saved };
let timer: ReturnType<typeof setTimeout>;
store.subscribe(() => {
  const s = store.getState();
  if (s.cart.items === last.cart && s.saved === last.saved) return;
  last = { cart: s.cart.items, saved: s.saved };
  clearTimeout(timer);
  // ponytail: 500ms debounce coalesces qty-spam into one write; last-write-wins
  timer = setTimeout(() => {
    api.session.$put({ json: { cart: Object.values(s.cart.items), saved: s.saved } });
  }, 500);
});
```

Components never touch the network for cart/saved — they `dispatch(addItem(...))` / `dispatch(toggleSaved(id))` and read selectors, exactly as today. Persistence is invisible to the UI.

- **Why `subscribe` over redux-persist or per-action mutations?** redux-persist is a dependency for ~20 lines; per-action POSTs hammer the API on every quantity tick. Hydrate + one debounced flush is the minimum that holds.

## Risks / Trade-offs

- **Lost-update across tabs** (two tabs editing, last PUT wins) → Accepted; single-user, low-stakes cart. Upgrade path: switch cart to a normalized table with per-line endpoints if real concurrency appears.
- **Stale cart snapshots** (price/stock drift after add) → Already the case today; the order transaction is authoritative and surfaces `409` on insufficient stock. No change.
- **`localStorage` cleared / private mode** → user silently starts fresh. Acceptable for anonymous; documented in Non-Goals.
- **Unbounded session rows** (no GC) → fine at demo scale; a periodic delete of stale sessions is the upgrade path if it ever matters. `// ponytail: no session expiry; add a cron sweep if row count becomes a problem.`
- **`Json` on SQLite** → already used for `ProductVariant.options`, so the pattern is proven in this datasource.
