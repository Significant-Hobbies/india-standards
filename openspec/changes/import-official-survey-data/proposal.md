## Why

The authorized PLFS 2025 person file is now available locally, while the app
still serves generated demo data and NFHS-5 access is pending review. Accuracy
requires a reproducible, fail-closed import and validation path before any
survey-backed claim, especially because the PLFS rider limits the file to
labour-market analysis and its two earnings fields use different monthly
reference periods.

## What Changes

- Add a local-only importer for the authorized PLFS 2025 CSV and, after
  approval, the minimum NFHS-5 individual recodes needed for measured height.
- Normalize documented survey codes, weights, earnings reference periods, and
  State/UT labels without retaining person rows in the serving database.
- Produce source manifests and validation reports covering checksums, row
  counts, categorical frequencies, weighted totals, missingness, income tails,
  and the PLFS use limitation.
- Build the joint demographic cube and conditional height model only from
  validated inputs, preserving unweighted support counts and uncertainty
  inputs.
- Add a local `PLFS-backed preview` state after the PLFS source, aggregate,
  variance, and fixed-query gates pass. This state uses real PLFS demographic
  aggregates, disables height entirely, and visibly discloses that the PLFS
  usage scope remains under review.
- Reserve `Survey-backed` for the future state in which both PLFS and NFHS
  manifests, the height model, and every usage-scope gate pass. A PLFS-only
  preview must never display `Survey-backed`.
- Keep raw authorized files local and gitignored. Do not add cloud storage,
  MotherDuck, telemetry, commercial use, or production deployment.
- Benchmark storage reduction only after representative query equivalence is
  established; accuracy and joint-filter coverage remain the first priority.
- Preserve exact annualized-earnings values in the aggregate-only variance
  sufficient statistics so high-income thresholds do not collapse into a
  single ₹50 lakh ceiling. Offer ₹1 lakh threshold steps through ₹85 lakh,
  the highest defensible whole-lakh cutoff below the observed PLFS maximum.

## Capabilities

### New Capabilities

- `official-survey-import`: Local ingestion, validation, aggregate generation,
  provenance, and fail-closed activation for authorized PLFS and NFHS inputs.

### Modified Capabilities

None.

## Impact

- Adds local ETL and validation scripts under `scripts/`.
- Adds ignored staging/report artifacts under `data/`.
- Extends DuckDB source-manifest, aggregate generation, and application response
  contracts without exposing raw microdata through the application API.
- Rebuilds the local aggregate-only staging database with exact-income variance
  cells; no person identifiers or additional production dependency are added.
- Updates data-acquisition and methodology documentation with the verified
  PLFS reference periods and use limitation.
- Uses the existing Node.js, DuckDB, and `pnpm` stack; no new production
  dependency, cloud service, migration, deployment, or release is required.
