## Why

India lacks a transparent, playful calculator for jointly exploring demographic
standards without turning separate datasets into a false claim about dating
success. A local experiment can validate the interaction, weighted calculation,
height-modelling boundary, and uncertainty language before licensed survey data
or hosted infrastructure is introduced.

## What Changes

- Add a mobile-first Next.js calculator for the eight defensible MVP filters.
- Add an embedded DuckDB query layer and deterministic demo aggregate data.
- Return a rounded estimate range, two denominators, unweighted observation
  count, source years, and numeric range-precision score.
- Treat height as a conditional probability model separate from jointly
  filterable demographic records.
- Add an expandable methodology panel and shareable result state.
- Persistently label synthetic results as a demo model.
- Add a documented import boundary for future licensed PLFS and NFHS inputs.

## Capabilities

### New Capabilities

- `demographic-estimation`: Weighted joint filtering, conditional height
  modelling, uncertainty ranges, denominators, and sparse-cell best-effort
  behavior.
- `calculator-experience`: Responsive filters, live result states,
  methodology disclosure, range-precision explanation, and sharing.
- `local-survey-store`: Local DuckDB initialization, deterministic demo data,
  source metadata, and a future official-data import contract.

### Modified Capabilities

None.

## Impact

- New standalone app at the repository root.
- New runtime dependencies: Next.js, React, and `@duckdb/node-api`.
- New local generated database under `data/`; raw or generated records are never
  served to the browser.
- No deploy, production configuration, cloud database, telemetry, or secrets.
