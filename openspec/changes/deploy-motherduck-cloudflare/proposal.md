## Why

The calculator now has a validated aggregate-only PLFS serving database, but it
can only be tried on the developer machine. Hosting that aggregate cube in
MotherDuck and the application on Cloudflare makes the experiment accessible
without exposing the authorized person-level source data.

## What Changes

- Copy only the aggregate serving tables from the admitted local DuckDB staging
  database into a dedicated MotherDuck database.
- Query MotherDuck through its PostgreSQL-compatible endpoint from the
  Cloudflare-hosted Next.js runtime.
- Keep local DuckDB as the ETL source and parity-test reference.
- Deploy the application to a Cloudflare Worker at
  `india-numbers.significanthobbies.com`.
- Add secret handling, parity checks, CI, deployment guards, and production
  smoke tests.
- Preserve the visible `PLFS-backed preview` label, disabled height filter, and
  unresolved PLFS usage-scope disclosure.

## Capabilities

### New Capabilities

- `hosted-aggregate-serving`: Aggregate-only MotherDuck storage, secure
  Cloudflare querying, deployment, and production verification.

### Modified Capabilities

None.

## Impact

The change affects the estimate and filter-metadata data access layer, Next.js
build configuration, package scripts, CI, and project documentation. It adds
the official `pg` client path for MotherDuck's Worker-compatible endpoint and
the OpenNext Cloudflare adapter. The authorized raw PLFS CSV remains local and
gitignored.
