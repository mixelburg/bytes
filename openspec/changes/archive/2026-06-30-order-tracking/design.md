## Context

Orders are placed via a server-authoritative `POST /orders` (Hono + Prisma,
`apps/api/src/main.ts`) and the UI ends at a static `/confirm` screen. The
`Order` model holds only `id`, `total`, `createdAt`, and items — no address, no
status. The checkout displays a hardcoded address ("Alex Rivera · 128 Linden St
· Berlin 10115"). The design system is strict "Mono Editorial": squared corners,
1.5px ink borders, monochrome, no gradients/glass/neon, two fixed typefaces. No
map library is installed. The app is a demo: data is effectively mock, but the
backend is real and progress should feel live.

## Goals / Non-Goals

**Goals:**
- A `/track/:id` screen showing a live, on-brand route from warehouse to the
  buyer's address with pass-points, ETA, and current position.
- Progress that is consistent across refreshes/devices and visibly advances
  during a session.
- Persist a delivery address on the order so tracking has a real destination.
- No new runtime dependencies.

**Non-Goals:**
- Real courier/logistics integration or real geolocation/lat-lng routing.
- A full address-entry form with validation (use the checkout's existing default
  address; richer entry is a later change).
- Real interactive geographic maps / map tiles.
- Push/websocket updates (polling is enough for a demo).

## Decisions

### 1. Server-computed deterministic timeline (not client timer, not stored steps)
`GET /orders/:id` derives the whole timeline from `createdAt` plus a fixed array
of stop offsets. Current stop = the last stop whose offset ≤ elapsed; ETA =
`createdAt + total duration`. Nothing about progress is persisted beyond
`createdAt`.
- *Why:* deterministic, survives refresh, consistent across devices, zero
  background jobs, trivial to test (inject elapsed).
- *Alternatives:* client-only timer (resets on refresh, not shareable);
  persisted per-step rows updated by a worker (needs a scheduler — overkill).

### 2. Demo time compression via one constant
A `TRACKING_DURATION_MS` constant (e.g. ~3 min total) compresses the delivery so
the user watches it advance. `// ponytail:` comment marks it as the calibration
knob — raise toward real durations for production.

### 3. Pass-points generated from the address, not stored
Stops are a fixed sequence — warehouse origin → sorting hub → in transit → local
depot → buyer's address — with labels derived from the delivery city (e.g.
"{city} sorting hub", "{city} local depot"). Generated in the endpoint; not
persisted.
- *Why:* no schema bloat; the schematic only needs ordered labelled stops +
  ETAs, not coordinates.

### 4. SVG schematic, no map library
A vertical route is drawn with plain SVG/MUI box nodes + a connecting line and a
courier marker positioned at the current stop, styled with theme tokens (ink
border, squared, mono labels).
- *Why:* zero deps, fully on-brand; a tiled map would violate the design system
  and add Leaflet + tiles + attribution.
- *Upgrade path:* swap the SVG component for react-leaflet behind the same
  `stops` data if real geography is ever needed.

### 5. Address on the Order model (minimal fields)
Add nullable `address*` columns to `Order` (recipient, line1, city, postal,
country). `POST /orders` accepts an optional `address` object and persists it;
checkout sends the address it already shows.
- *Why:* tracking needs a destination; reusing the displayed address avoids a
  form. Nullable keeps old orders valid.

### 6. Polling via TanStack Query
`useOrder(id)` uses `refetchInterval` (~5s) that returns `false` once
`status === 'delivered'` to stop polling. Reuses the existing query stack rather
than adding sockets.

## Risks / Trade-offs

- [SQLite dev DB: schema change needs `db:push`] → Run `nx run api:db:push`;
  fields are nullable so existing rows/seed stay valid.
- [Compressed timeline is unrealistic for production] → Isolated in one constant
  with a ponytail comment naming the upgrade.
- [Polling has up-to-interval lag] → Acceptable for a demo; interval is small.
- [Server clock is the source of truth] → Fine; deterministic and shared, no
  client-clock skew.

## Migration Plan

1. Add address fields to `Order` in `schema.prisma`; `nx run api:db:push`
   (regenerates client). Re-seed not required.
2. Extend `POST /orders` to accept/persist `address`; add `GET /orders/:id`.
   `AppType` updates automatically for the typed client.
3. Frontend: `useOrder` hook, `/track/:id` route + `TrackScreen` + SVG route
   component, checkout sends `address`, confirm links to tracking.

Rollback: remove the route/endpoint; nullable columns can stay unused.

## Open Questions

- None blocking. Future: real address entry and real geo map are tracked as
  separate enhancements (see Non-Goals).
