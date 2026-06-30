<!-- Builds on the `wire-saved-page` change, which introduces the `saved-items`
     capability with a localStorage-backed saved set. This change ONLY swaps that
     persistence to the backend session blob; the toggle, screen, and nav-wiring
     requirements from wire-saved-page are unchanged. Apply order: wire-saved-page
     first, then this change. -->

## RENAMED Requirements

- FROM: `### Requirement: Locally-persisted saved set`
- TO: `### Requirement: Session-persisted saved set`

## MODIFIED Requirements

### Requirement: Session-persisted saved set
The app SHALL maintain a set of saved product ids in Redux and persist it to the backend, scoped to the anonymous session (see the `anonymous-session` capability), rehydrating from the server on load. The saved set SHALL ride the same `PUT /session` blob as the cart and SHALL NOT use `localStorage`. Saving SHALL be keyed by product `id` (not `variantId`) — a product is saved or not, regardless of variant.

#### Scenario: Save persists across reload
- **WHEN** the user saves a product and reloads the app
- **THEN** the saved set is rehydrated from `GET /session` for the current session and that product is still saved

#### Scenario: Saving is idempotent
- **WHEN** the user saves a product that is already saved
- **THEN** the saved set is unchanged (no duplicate entry)

#### Scenario: Saved changes are written back
- **WHEN** the user toggles a product's saved state
- **THEN** the saved set is written back to the server (debounced, via the shared `PUT /session`)

#### Scenario: No session / API down on load
- **WHEN** the saved set cannot be loaded from the server (no session id yet or the API is down)
- **THEN** the app starts with an empty saved set without crashing
