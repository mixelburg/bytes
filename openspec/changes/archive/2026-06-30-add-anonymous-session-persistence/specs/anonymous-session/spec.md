## ADDED Requirements

### Requirement: Browser-minted anonymous session identity
The client SHALL mint an opaque session id on first load using `crypto.randomUUID()`, persist it in `localStorage`, and reuse it thereafter. The id SHALL be sent on every API request as an `x-session-id` header. No login, password, or personal data is involved.

#### Scenario: First visit mints an id
- **WHEN** the app loads and no session id exists in `localStorage`
- **THEN** a new UUID is generated, stored, and used for subsequent requests

#### Scenario: Returning visit reuses the id
- **WHEN** the app loads and a session id already exists in `localStorage`
- **THEN** that same id is reused and sent as the `x-session-id` header

#### Scenario: Header on every request
- **WHEN** the client makes any call through the `hc` API client
- **THEN** the request carries the current `x-session-id` header

### Requirement: Server-side per-session store
The backend SHALL keep a `Session` record keyed by the client id that owns that session's `cart` and `saved` data, and to which orders are linked. `GET /session` SHALL upsert-on-read and return the session's `{ cart, saved }`. `PUT /session` SHALL upsert and overwrite whichever of `cart`/`saved` is provided.

#### Scenario: Read creates the session if absent
- **WHEN** `GET /session` is called with an `x-session-id` not seen before
- **THEN** the session is created and an empty `{ cart: [], saved: [] }` is returned

#### Scenario: Read returns stored data
- **WHEN** `GET /session` is called for a session that has stored cart and saved data
- **THEN** the response returns that exact `{ cart, saved }`

#### Scenario: Write persists a blob
- **WHEN** `PUT /session` is called with a `cart` (and/or `saved`) body
- **THEN** the provided blob(s) replace the stored value(s) for that session and persist across reloads

#### Scenario: Missing header degrades gracefully
- **WHEN** a session request arrives without an `x-session-id` header
- **THEN** the API returns a neutral empty result rather than an error, and the UI degrades to its empty/error state
