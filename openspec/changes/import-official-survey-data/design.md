## Context

The app currently serves a deterministic demo cube. The authorized PLFS 2025
CSV now exists locally with 1,148,634 person records and a SHA-256 checksum of
`6c5b6a2433dd79d7b16b93fe55aa3a6d7028232146865981f526f62d181083da`.
Its published multiplier is stored with two decimal places and must be divided
by 100. The pooled file weights sum to about 1.193 billion people; restricting
to supported adults aged 18–60 and published male/female codes yields about
719.7 million.

PLFS records regular salaried earnings for the preceding calendar month and
self-employment gross earnings for the last 30 days. The official file contains
no record with both fields positive. The product can therefore derive a clearly
labelled annualized current-earnings proxy as
`12 × (ern_reg + ern_self)`, but it must not describe that value as observed
annual income.

The supplied PLFS rider says unit-level data should not be used specifically to
study variables other than employment and unemployment indicators. This local,
non-commercial experiment therefore needs an explicit usage-scope gate before
its PLFS aggregates can be activated. NFHS-5 approval is still pending, so no
measured-height model can yet pass validation.

## Goals / Non-Goals

**Goals:**

- Import authorized PLFS and NFHS files reproducibly without serving person
  rows.
- Preserve the full joint filter dimensions before considering compaction.
- Record exact mappings, checksums, row counts, exclusions, weights, reference
  periods, and validation results.
- Produce design-aware uncertainty ranges and best-effort sparse-cell results
  without fake precision.
- Permit a clearly bounded, local PLFS-backed preview after all PLFS technical
  validation gates pass, while keeping the usage-scope limitation visible.
- Reserve the fully survey-backed state until every active official source and
  the usage-scope review pass.
- Keep the workflow local, secure, and non-commercial under both access
  agreements.

**Non-Goals:**

- Deploying the calculator, commercializing survey-derived outputs, or moving
  data to MotherDuck or any cloud service.
- Exposing raw PLFS or NFHS rows, identifiers, districts, clusters, or
  enumeration areas.
- Treating the annualized earnings proxy as tax-return income or observed
  twelve-month income.
- Adding excluded product filters or city-level estimates.
- Compressing or coarsening the serving cube before output-equivalence tests.

## Decisions

### Stage and aggregate without copying person rows into the serving database

The importer will read source files with an explicit DuckDB schema, normalize
through SQL views/CTEs, and write only source manifests, validation summaries,
joint demographic cells, conditional height cells, and uncertainty fields to a
separate staging database.

Alternative considered: retain a normalized person table in the application
database. Rejected because it increases storage and creates an unnecessary raw
microdata exposure surface.

### Use three explicit data states and fail closed within each state

The product supports three non-interchangeable states:

- `demo`: generated fixtures only, never described as a population estimate.
- `plfs_preview`: authoritative PLFS aggregates whose checksum, mappings,
  weighted totals, official variance reproduction, representative fixtures,
  and raw-data isolation checks pass. Height is unavailable and contributes no
  probability or multiplier. The UI says the PLFS usage scope is under review
  and that the preview is local and non-commercial.
- `official`: reserved until all required PLFS and NFHS manifests are
  authoritative and passed, the usage-scope review is passed, measured-height
  modelling passes, and fixed query fixtures reproduce.

The application reads the existing aggregate-only staging database for the
preview. It validates the manifest and every required PLFS check at connection
time and refuses to serve if any technical gate drifts. Pending
`usage_scope` and `nfhs_height_model` checks are allowed only in
`plfs_preview`; they continue to block `official`.

Alternative considered: expose a hybrid result with real PLFS and synthetic
height. Rejected because multiplying the real demographic estimate by a
synthetic height probability would invite users to read a partially synthetic
result as survey-backed.

### Use documented PLFS mappings and an annualized current-earnings proxy

- `sex`: `1 → men`, `2 → women`; code `3` is retained in validation counts but
  excluded because the current product has no matching filter.
- `sec`: `1 → rural`, `2 → urban`.
- `marst`: `1 → never_married`, `2 → married`,
  `3/4 → widowed_divorced`.
- `gedu_lvl`: `01–07 → below_secondary`, `08/10/11 → secondary`,
  `12 → graduate`, `13 → postgraduate`.
- `st`: mapped through the official State/UT code file, then grouped only where
  the current UI explicitly uses `Other States / UTs`.
- `mult`: final survey weight is `mult / 100`.
- `annual_earned_income_proxy`:
  `12 × (coalesce(ern_reg, 0) + coalesce(ern_self, 0))`.

The importer will assert that regular and self-employment earnings are never
simultaneously positive and will preserve source zero/missing diagnostics.
Casual daily wages are excluded because the approved product definition is
regular salary plus self-employment earnings.

Alternative considered: infer a more comprehensive annual-income measure from
weekly casual earnings or tax statistics. Rejected because it changes the
approved filter definition and mixes incompatible reference periods.

### Use each survey's published design and explicit sparse back-off

The official 2025 PLFS methodology says FSUs are selected by SRSWOR, removes
the earlier independent-subsample design, and publishes analytic variance/MSE
formulae for domain indicators. PLFS uncertainty will therefore reproduce that
estimator using its stratum, sub-stratum, FSU, second-stage stratum, `zst`,
`nsc`, `caph`, and `smallh` fields. It will not substitute a generic PSU
bootstrap. The implementation reproduces the official all-India rural
usual-status LFPR at 46.5641% with 0.2573% RSE, matching the published 46.6%
and 0.26% after rounding.

The staging database keeps two complementary aggregate representations. Exact
person-level product dimensions are collapsed into joint point-estimate cells.
For arbitrary filter-range variance, the importer also stores sufficient
statistics grouped by opaque design-cell/PSU keys, product dimensions, and the
exact annualized current-earnings proxy. This
preserves within-PSU covariance without retaining source FSU codes, household
identifiers, district codes, or person rows. It avoids materializing roughly
15 million complete query combinations while preserving every supported age
range and income threshold. Because the prior ₹50 lakh top bucket made
₹30 lakh and ₹50 lakh queries indistinguishable whenever no sampled record sat
between them, the variance representation must not coarsen income before
filtering.

The application accepts a dense ladder of whole-lakh minimums from ₹0 through
₹85 lakh, while retaining the existing ₹2.5 lakh and ₹7.5 lakh cutoffs for
shared-link compatibility. ₹85 lakh is the highest supported whole-lakh
threshold because the admitted PLFS file's maximum annualized proxy is
₹85.2 lakh. The UI does not offer ₹1 crore or higher: those cutoffs have zero
support across the entire source and would be extrapolation rather than added
resolution. Adjacent thresholds may still produce the same estimate when the
survey has no observed earnings value between them; that plateau is truthful
and is explained in the control.

NFHS uncertainty will use its supplied weight, cluster, and stratum variables
with a method appropriate to its published complex-survey design. The serving
cube stores central, lower, upper, unweighted support, and model-basis fields
rather than raw rows or replicate weights.

For sparse high-income combinations, the point estimate uses the finest
supported joint cell or a documented hierarchical back-off model. Its interval
widens with direct support, income-tail instability, and back-off depth. The UI
continues to show a numeric range-precision index, never a probability that the
answer is correct.

For an exact PLFS zero, `plfs-zero-v1` preserves gender, income, marital status,
and education while backing off geography, age width, then area. It estimates
the target population by applying the selected back-off joint rate to the
target gender/age/geography/area denominator. Sampling error is propagated from
the numerator and both denominators, then widened again for model depth and
support below 30. The API must disclose the model version, back-off basis,
support, and range-precision score.

Alternative considered: mark every cell below 30 observations unavailable.
Rejected because the owner explicitly prefers best-effort coverage with
uncertainty, while retaining the direct support count and a visibly wider
range.

### Preserve raw inputs once and optimize only the serving artifact

Authorized inputs remain gitignored under `data/sources/` for reproducibility.
The importer creates a staging database and machine-readable validation report.
Only after fixed representative queries match may physical types, compression,
or aggregate layout be changed. The converter archive is not required by the
runtime and can be removed later only through an explicit, recoverable storage
cleanup.

## Risks / Trade-offs

- **PLFS usage rider may not cover a demographic rarity calculator** →
  keep the product local and non-commercial, record the limitation, and require
  an explicit usage-scope validation decision before official activation.
- **Monthly earnings are a noisy annual-income proxy** → label the derivation,
  widen high-income ranges, compare only directionally with CBDT slabs, and
  never claim observed annual income.
- **Very high income has tiny direct support** → use design-aware intervals and
  hierarchical back-off; retain support counts and do not show false precision.
- **Adjacent exact thresholds can still plateau** → show ₹1 lakh resolution,
  retain the direct-support count, and explain that unchanged results mean the
  sample contains no additional reported earnings between the two cutoffs.
- **NFHS age coverage ends at 49 for women and 54 for men** → require an
  explicit extrapolation policy and wider intervals outside those ranges.
- **Design-aware aggregation can be expensive** → compute variance inputs in
  staging and store only interval summaries; storage optimization cannot change
  fixed outputs beyond documented tolerance.
- **Authorized data could leak through tooling or logs** → aggregate-only
  diagnostics, gitignored sources, no raw-row logging, and no browser/API
  response containing person records.

## Migration Plan

1. Add an explicit PLFS schema, mapping tables, source checksum, and validation
   command.
2. Generate `data/india-standards.official.staging.duckdb` and a validation
   report without changing `data/india-standards.duckdb`.
3. Implement and verify PLFS point estimates and survey-design intervals.
4. After DHS approval, import the minimum NFHS recodes and validate measured
   height, design variables, back-off, and intervals.
5. After the PLFS technical gates pass, point the local application at the
   aggregate-only staging database, remove height from the active calculation,
   and display `PLFS-backed preview` with the usage-scope limitation.
6. Run fixed query, API, and browser fixtures proving that height does not
   affect preview results and that no survey-backed claim appears.
7. Only when every PLFS, NFHS, height, and usage-scope gate passes, atomically
   replace the serving database and switch the source badge to
   `Survey-backed`.
8. Roll back the preview by restoring the existing demo database path; source
   inputs and staging artifacts remain untouched.

## Open Questions

- Does MoSPI consider this exact non-commercial labour-earnings calculator
  within the PLFS rider, or should official activation require written
  clarification?
- Which NFHS recode variable names and special height codes apply to the
  approved India release?
- What extrapolation, if any, is acceptable for women aged 50–60 and men aged
  55–60?
- Which official PLFS 2025 published estimate and RSE should be the mandatory
  reproduction fixture for the analytic variance implementation?
