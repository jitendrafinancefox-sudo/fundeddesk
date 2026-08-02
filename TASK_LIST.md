# Task list

Status reflects the audit only; no implementation has started.

## Critical — resolve before production

- [ ] Define and commit the complete Supabase migration set for all frontend-referenced tables, fields, views, and RPCs.
- [ ] Implement atomic, server-authorized workflows for order approval/account creation, position close/risk breach, and payout processing.
- [ ] Decide the canonical simulated trading model and persist positions, marks, closures, and risk events.
- [ ] Replace the `http://localhost:5001` Angel relay assumption with an owned, authenticated, deployable service.
- [ ] Remove browser authority over hard-coded risk limits, account equity, payout amount, and administrative lifecycle transitions.
- [ ] Add authentication/authorization tests for all RLS and role-changing paths.

## High priority — structural consolidation

- [ ] Select `/portal` as the only authenticated namespace and document redirects for legacy routes.
- [ ] Consolidate `app/portal/layout.js` and `app/portal/portal/layout.js` into one shell.
- [ ] Choose `/portal/terminal` as the canonical terminal; extract feature components/hooks and retire `/india` after parity validation.
- [ ] Decide whether the Binance terminal is development-only or remove it; eliminate dual market-data architectures.
- [ ] Build a shared session/auth provider and protected-route policy.
- [ ] Build one theme provider and one sign-out utility.
- [ ] Replace page-local repeated Supabase loading patterns with feature data hooks/query layer.

## Medium priority — reliability and performance

- [ ] Define a versioned Angel relay API contract, error envelope, health/readiness behavior, and mock server.
- [ ] Add market feed connection state, reconnection/backoff, subscription cleanup, and multi-instrument SL/TP monitoring.
- [ ] Add input schema validation and domain error mapping for all form/mutation paths.
- [ ] Add loading, empty, unauthorized, and failure boundaries to protected pages.
- [ ] Lazy-load terminal/chart code and profile global canvas effects.
- [ ] Convert chart overlay/drawing behavior into testable modules; decide persistence and user-facing undo requirements.
- [ ] Add indexes, constraints, audit events, and idempotency keys to database workflows.

## Low priority — maintainability and polish

- [ ] Split `app/page.js`, `app/portal/terminal/page.js`, and `app/india/page.js` into focused components.
- [ ] Remove or formally retain `app/rules/landing-page-v9-stickyfix.js` after confirming it is unused.
- [ ] Standardize styling strategy and extract repeated inline styles.
- [ ] Review placeholder portal routes and navigation promises.
- [ ] Inspect the literal `'{app/'` directory and remove it only if confirmed accidental.
- [ ] Add README architecture, local setup, environment, migration, and relay-runbook documentation.

## Verification checklist for future work

- [ ] Fresh database migration produces a working signup -> order -> approval -> portal flow.
- [ ] Unauthorized clients cannot create accounts, alter roles, bypass risk, or set payout amounts.
- [ ] Canonical terminal works with a deployed market-data service and survives refresh/reconnect.
- [ ] Charts clean up subscriptions/observers on instrument and route changes.
- [ ] CI runs lint, type checks, unit tests, integration tests, and core E2E journeys.
