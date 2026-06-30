# order-tracking Specification

## Purpose
TBD - created by archiving change order-tracking. Update Purpose after archive.
## Requirements
### Requirement: Order status endpoint
The API SHALL expose `GET /orders/:id` returning the order id, total, delivery
address, overall `status`, an `eta` timestamp, and an ordered list of `stops`
(the pass-points from warehouse origin to the buyer's address). Each stop SHALL
carry a `label`, an `etaAt` timestamp, and a `state` of `done`, `current`, or
`pending`. Exactly one stop SHALL be `current` until delivery, after which all
stops are `done`. Progress SHALL be derived deterministically from the order's
`createdAt` and a fixed timeline so repeated requests are consistent and survive
a page refresh.

#### Scenario: Fetch a known order
- **WHEN** `GET /orders/:id` is called with an existing order id
- **THEN** the response includes the address, ordered stops with per-stop ETAs and states, the overall status, and the final ETA

#### Scenario: Deterministic progress
- **WHEN** the same order is fetched twice without the clock advancing past a stop boundary
- **THEN** both responses report the same current stop, states, and ETA

#### Scenario: Unknown order
- **WHEN** the id does not match any order
- **THEN** the API responds `404` with an error body

#### Scenario: Time advances the route
- **WHEN** enough time has elapsed for the next pass-point to be reached
- **THEN** the previously `current` stop becomes `done` and the next stop becomes `current`

#### Scenario: Delivered
- **WHEN** elapsed time reaches the final ETA
- **THEN** status is `delivered` and every stop is `done`

### Requirement: Tracking screen with route schematic
The app SHALL provide a tracking screen at `/track/:id` that renders the route
as an SVG schematic: the warehouse origin, each intermediate pass-point, and the
buyer's address as ordered nodes connected by a line, with the courier position
shown along the line at the current stop. Passed stops, the current stop, and
pending stops SHALL be visually distinct, and the destination SHALL be labelled
with the delivery address. The screen SHALL display the ETA and a human-readable
status (e.g. "3 of 5 stops passed"). No external map library or map tiles SHALL
be used.

#### Scenario: Render the route
- **WHEN** the tracking screen loads a valid order
- **THEN** it shows origin, pass-points, and the address as ordered nodes with the courier marker at the current stop, plus the ETA

#### Scenario: Distinct stop states
- **WHEN** stops have mixed states
- **THEN** done, current, and pending stops are rendered with visually distinct treatment

#### Scenario: Delivered view
- **WHEN** the order is delivered
- **THEN** the courier marker is at the address, all stops read as passed, and the status reads delivered

### Requirement: Live progress updates
The tracking screen SHALL poll `GET /orders/:id` on an interval while open so the
displayed stop, courier position, and ETA advance without a manual reload, and
SHALL stop polling once the order is delivered.

#### Scenario: Progress advances live
- **WHEN** the screen is open and the courier reaches the next pass-point
- **THEN** the screen updates the current stop and courier position on the next poll without a reload

#### Scenario: Polling halts when delivered
- **WHEN** the order reaches delivered
- **THEN** the screen stops polling

### Requirement: Tracking screen states
The tracking screen SHALL expose loading, not-found, and error states in
addition to the success view, with no dead ends.

#### Scenario: Loading
- **WHEN** the order request is in flight on first load
- **THEN** the screen shows a loading indicator

#### Scenario: Not found
- **WHEN** the API returns `404` for the id
- **THEN** the screen shows a not-found state with a path back to the catalog

#### Scenario: Error
- **WHEN** the request fails (network/server error)
- **THEN** the screen shows an error state with a retry action
