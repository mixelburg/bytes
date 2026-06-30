# order-history Specification

## Purpose
TBD - created by archiving change add-anonymous-session-persistence. Update Purpose after archive.
## Requirements
### Requirement: Orders attach to the session
Every order placed SHALL be linked to the current anonymous session via its `x-session-id`, so it can later be listed for that session. Orders placed without a session id SHALL still succeed but are not attributed to any session.

#### Scenario: Placed order is attributed
- **WHEN** the user places an order with an `x-session-id` header
- **THEN** the created order records that `sessionId`

### Requirement: Order history retrieval
`GET /orders` SHALL return the current session's orders, newest first, each with its line items. The history screen SHALL render loading, empty, and error states.

#### Scenario: List past orders
- **WHEN** the user opens order history for a session that has placed orders
- **THEN** the session's orders are listed newest-first with their totals and items

#### Scenario: No orders yet
- **WHEN** the user opens order history with no past orders
- **THEN** an empty state is shown with an action to start shopping

#### Scenario: Open tracking from history
- **WHEN** the user selects an order from the history list
- **THEN** the app navigates to that order's tracking screen at `/track/:id` (provided by the `order-tracking` capability)

#### Scenario: History reflects a new order
- **WHEN** the user places an order and returns to order history
- **THEN** the new order appears in the list (the orders query is invalidated on checkout success)

#### Scenario: Loading and error states
- **WHEN** the order history is loading or the request fails
- **THEN** the screen shows a loading indicator or an error state with retry

