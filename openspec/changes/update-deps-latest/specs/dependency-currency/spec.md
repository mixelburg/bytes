## ADDED Requirements

### Requirement: Verification gates pass on updated dependencies

After all dependencies are bumped to their latest versions, the project SHALL
remain fully buildable and verifiable with no regressions. Every gate that
passed before the bump MUST pass after it.

#### Scenario: Lint and type-check pass

- **WHEN** `biome check .` and the TypeScript build run against the updated deps
- **THEN** both complete with no errors (TS 6 default changes resolved in code)

#### Scenario: Build succeeds

- **WHEN** `nx run-many -t build` runs (web + api)
- **THEN** all projects build successfully

#### Scenario: Tests pass

- **WHEN** `nx test web` and `nx e2e web` run
- **THEN** all unit and Playwright e2e specs pass as before the update

#### Scenario: Local database tooling works on Prisma 7

- **WHEN** `nx run api:db:push` then `nx run api:db:seed` run after the Prisma 7 bump
- **THEN** the Prisma client regenerates, the schema syncs, and seed data loads
  without error
