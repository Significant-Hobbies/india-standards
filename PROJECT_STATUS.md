# India Standards — PROJECT STATUS

Last updated: 2026-07-30

## Why / What

India Standards is an experiment for an entertaining, defensible
demographic standards calculator for India. It estimates a count range and two
denominators from jointly filterable demographic data, with height explicitly
modelled across datasets.

In scope: gender, age, earned income, marital status, education, State/UT,
urban/rural, and eventually height. Out of scope: children preferences, attractiveness,
hair/eye colour, caste/community, drinking/smoking, obesity, personality,
city-level estimates, dating probability, or mutual compatibility.

## Dependencies

- Next.js and React for the web application.
- DuckDB Node Neo for local ETL and aggregate parity tests.
- The authorized PLFS 2025 person CSV is available as a controlled, gitignored
  local ETL input. Its aggregate-only DuckDB output powers calculator results;
  raw person records are not served.
- NFHS-5 recode access is pending DHS review.
- MotherDuck stores the 12-table aggregate-only serving database. The
  Cloudflare runtime uses its PostgreSQL-compatible endpoint with a separate
  revocable secret token.
- OpenNext/Wrangler production configuration targets the canonical
  `india-standards.significanthobbies.com` hostname and retains
  `india-numbers.significanthobbies.com` as a compatibility alias. Telemetry
  is not included.

## Timeline

- 2026-07-31: Benchmarked the complete official aggregate serving cube against
  a full-schema index-free copy. The candidate preserved all 12 table schemas,
  row counts, and 46 deterministic estimator fixtures while reducing the local
  DuckDB file from 55.76 MiB to 18.26 MiB. Local median, mean, and p95 latency
  stayed within 0.5 ms across 216 samples per candidate; the current local and
  hosted cubes remain unchanged pending direct MotherDuck latency evidence.
- 2026-07-31: Prepared and locally verified public agent discovery for the
  aggregate-only calculator and changelog, with request-origin catalogs,
  sitemaps, robots declarations, and Markdown on both public hostnames;
  person-level survey data remains excluded and production deployment remains
  separate.
- 2026-07-30: Made the canonical GitHub repository publicly readable. The
  authorized survey microdata remains local and gitignored; only the existing
  aggregate serving boundary is hosted. No deployment, DNS, or licensing
  change was made.
- 2026-07-27: Product brief and calculator-workbench design direction approved;
  local implementation started.
- 2026-07-27: Local DuckDB experiment completed with a synthetic-only accuracy
  gate, responsive browser evidence, and passing project checks.
- 2026-07-27: Sparse cells changed from categorical coverage failure to
  best-effort widened ranges; result context now uses a reproducible numeric
  range-precision score. Accuracy and filter coverage were prioritized over
  serving-cube compaction.
- 2026-07-27: Public PLFS 2025 documentation and the authorized person CSV were
  acquired and checksummed locally. The CSV contains 1,148,634 person records.
- 2026-07-27: DHS/NFHS-5 project request submitted; access remains pending
  review.
- 2026-07-27: Project moved out of Fleet into an independent standalone
  repository at `/Users/sarthak/Desktop/india-standards`.
- 2026-07-27: Authorized PLFS source admission and aggregate-only staging
  completed: 1,148,634 source rows, 715,351 supported adults, 219,744 exact
  joint cells, and no persisted person table.
- 2026-07-27: The official revamped 2025 SRSWOR methodology replaced the
  proposed generic bootstrap. The implementation reproduces the published
  all-India rural LFPR (46.6%) and RSE (0.26%) after rounding.
- 2026-07-27: Added a 699,387-row server-only sufficient-statistics cube for
  direct analytic variance across arbitrary supported filters. Exact earnings
  resolution makes the complete PLFS staging database 56 MB.
- 2026-07-27: Added disclosed `plfs-zero-v1` hierarchical back-off for exact
  zero-support combinations, with population-rate scaling and model widening.
- 2026-07-27: Replaced the synthetic runtime with a fail-closed local
  PLFS-backed preview. Height is disabled, PLFS usage scope remains visibly
  under review, and fully survey-backed mode remains blocked.
- 2026-07-27: Reworked sparse-result presentation around a central estimate,
  secondary 95% uncertainty bounds, and a clearly labelled range-tightness
  score. A zero lower bound no longer appears as a zero population estimate.
- 2026-07-27: Completed a preserve-mode design pass with responsive result-first
  ordering, a repaired mobile return action, and plain-language support labels.
- 2026-07-27: Replaced the ₹50 lakh top-coded variance bucket with exact-income
  sufficient statistics and expanded the UI to ₹1 lakh steps through ₹85
  lakh. The result now explains truthful plateaus and exposes distinct ₹65
  lakh and ₹75 lakh estimates for the tested cohort.
- 2026-07-27: Migrated only the 12 allowlisted aggregate/diagnostic tables to
  MotherDuck. Hosted row counts match 219,744 joint cells and 699,387 variance
  cells; representative estimate parity passes.
- 2026-07-27: Extended the disclosed zero-support hierarchy to structurally
  relax marital status and education only after age/geography support is
  exhausted, with additional model widening. The tested ₹75 lakh cohort now
  returns a best-effort estimate rather than a fabricated exact zero.
- 2026-07-27: Added the MotherDuck PostgreSQL runtime adapter and a Cloudflare
  OpenNext production target.
- 2026-07-27: Passed the six-gate Fleet deployment guard, deployed the
  SHA-tagged Worker, and verified the homepage plus ₹30 lakh, ₹65 lakh, and
  structurally backed-off ₹75 lakh estimates over HTTPS at
  `india-numbers.significanthobbies.com`.
- 2026-07-29: Moved the private repository to Significant Hobbies, returned
  its local checkout to the active Fleet workspace, and prepared
  `india-standards.significanthobbies.com` as the canonical domain while
  retaining the existing Worker name and hostname as internal compatibility
  surfaces. No deployment or DNS change was performed.

## Products

- Standalone Next.js app at the repository root.
- [Public GitHub repository](https://github.com/Significant-Hobbies/india-standards)
  with its [Roadmap](https://github.com/Significant-Hobbies/india-standards/issues).
- Local generated DuckDB database under `data/` (gitignored).
- Aggregate-only MotherDuck database `india_standards`.
- Live Cloudflare Worker `india-numbers` at
  `india-numbers.significanthobbies.com`.

## Features (shipped)

- Eight-filter calculator with server-side MotherDuck aggregate queries.
- Rounded central estimates and 95% ranges, two denominators, reciprocal
  age-cohort context, height disclosure, sparse-cell best-effort widening, and
  a numeric range-tightness score that is explicitly not correctness.
- Shareable URL state, native share/clipboard fallback, and expandable
  methodology.
- Fail-closed source manifest: official mode cannot serve until source files
  are authoritative and the required validation status is `passed`.
- Fail-closed source states prevent generated demo fixtures or a PLFS-only
  preview from being presented as fully survey-backed.
- Fail-closed PLFS source contract, aggregate-only staging database, validation
  diagnostics, and machine-readable report. The staging manifest is explicitly
  ineligible for activation.
- Official-formula direct-domain PLFS intervals with an Annual Report point/RSE
  reproduction fixture; no source FSU, household, district, or person IDs are
  persisted.
- PLFS-backed preview with real weighted demographic/earnings ranges,
  independent gender and age-cohort denominators, sparse back-off, range
  tightness, and no height multiplier.
- Dense whole-lakh income thresholds through the admitted source ceiling,
  exact-income variance queries, and in-result explanations when adjacent
  cutoffs share the same sampled support.
- Production OpenNext Worker with a custom domain, aggregate-only MotherDuck
  queries, redacted database failures, generated binding types, and
  version-metadata-backed homepage caching.

## Todo / Planned / Deferred / Blocked

Future and blocked work is tracked in
[GitHub Issues](https://github.com/Significant-Hobbies/india-standards/issues).
