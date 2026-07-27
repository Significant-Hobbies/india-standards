# Survey data contract

The app uses an aggregate-only serving boundary intended for a future full
survey-backed pass. The current PLFS preview reads demographic and variance
aggregates from MotherDuck in production; the separate conditional height
model remains absent. Source files are never uploaded or served to the browser.

Authorized person-level files are controlled ETL inputs, not application
storage. After validation, the serving artifact contains joint weighted cells,
uncertainty bounds, support counts, and source metadata only. The raw files may
be retained or removed according to their license and the reproducibility
policy of the data environment; the product does not depend on them at runtime.

## Source manifest

Every imported dataset must record:

| Field | Meaning |
| --- | --- |
| `data_mode` | `demo` or `official` |
| `source_name` | Survey and file/recode name |
| `source_year` | Survey reference period |
| `source_sha256` | Local input checksum; never the source file itself |
| `row_count` | Imported rows before exclusions |
| `eligible_row_count` | Rows contributing to aggregates |
| `weight_variable` | Exact source weight/multiplier field |
| `created_at` | Import time |
| `validation_status` | `pending`, `passed`, or `failed` |

Application source mode is separate from source provenance:

- `demo` may read only generated fixtures.
- `plfs_preview` requires an authoritative, accepted PLFS manifest plus every
  named PLFS technical validation check. It permits only the explicitly pending
  `usage_scope` and `nfhs_height_model` checks.
- `official` may say `Survey-backed` only when every active manifest and usage
  gate is passed.

The server fails closed within each state.

## PLFS normalized fields

| Normalized field | PLFS 2025 metadata candidate | Rule |
| --- | --- | --- |
| `gender` | `sex` | Preserve published codes and labels |
| `age` | `age` | Whole years; enforce the app's supported range |
| `marital_status` | `marst` | Map only documented categories |
| `education` | `gedu_lvl` | Version the mapping table |
| `state` | `st` | State/UT only; discard district for product output |
| `area` | `sec` | Urban/rural |
| `regular_earnings` | `ern_reg` | Confirm reference period and annualization |
| `self_employed_earnings` | `ern_self` | Confirm reference period and annualization |
| `annual_earned_income` | derived | Sum compatible earned-income components only |
| `survey_weight` | `mult` | Apply the published multiplier convention |

The real importer must verify earning reference periods from the schedule and
methodology before annualizing them. Missing versus zero income must remain
distinct during validation.

### PLFS 2025 design identifiers

The supplied official README defines the multiplier domain as a first-stage
unit within sector × State/UT × stratum × group × substratum. The corresponding
person-file fields are `sec`, `st`, `strm`, `grp`, and `sstrm`; `mfsu` is the
FSU serial number, `sss` is the second-stage stratum, and `ssu` is the sample
household number. The file contains first-visit records only.

Aggregate inspection found 22,594 distinct `mfsu` values. Each maps to exactly
one `sec` × `st` × `strm` × `grp` × `sstrm` combination, so `mfsu` is unique as
a PSU identifier in this annual person file. The quarterly counts are 5,652,
5,656, 5,639, and 5,647 FSUs for Q1–Q4 respectively.

The official 2025 methodology further says FSUs are selected independently by
SRSWOR for each month, removes the previous independent-subsample design, and
provides an analytic variance formula for domain totals. It explicitly allows
indicator variables for domains not considered in the sample design. The
method uses the stratum size and surveyed-FSU count along with FSU and
second-stage contributions; the local fields include `zst`, `nsc`, `caph`, and
`smallh`.

This rules out silently substituting a generic cluster bootstrap. Admission of
the direct-domain variance implementation required reproducing an official
PLFS 2025 estimate and RSE.

The implementation now reproduces the Annual Report 2025 all-India rural
usual-status LFPR fixture: 46.5641% with 0.2573% RSE, which matches the
published 46.6% and 0.26% after its stated rounding. Direct product-domain
intervals use the same analytic design formula.

To preserve covariance across arbitrary user-selected ranges, the staging
database stores a server-only sufficient-statistics cube grouped by opaque PSU
and design-cell keys plus product dimensions and the exact annualized
current-earnings proxy. It does not retain source FSU
codes, district codes, household/person identifiers, or non-product variables.
This cube has 699,387 rows and supports exact age ranges, ₹1 lakh income
thresholds through ₹85 lakh, the legacy ₹2.5 lakh and ₹7.5 lakh thresholds,
State/UT grouping, area, marital status, and education without
materializing every final query combination. It is an internal analytical
table and is never returned by the API.

The admitted source maximum is a ₹85.2 lakh annualized current-earnings proxy,
so higher UI thresholds are not offered. Adjacent supported cutoffs can
truthfully return the same estimate when the sample has no earnings observation
between them; the API returns the lowest matching aggregate earnings value so
the interface can explain that plateau.

Zero-support exact combinations use the versioned `plfs-zero-v1` hierarchy. It
first preserves gender, income, marital status, and education while
progressively backing off State/UT, age width, and urban/rural area. If that
still finds no high-income support anywhere in the admitted sample, it keeps
gender and income fixed but tries national all-age support with marital status,
education, and finally both relaxed. The selected broader joint rate is applied
to the exact target population denominator. Structural relaxation receives a
larger model-depth penalty, and the UI identifies the result as modelled from
broader PLFS groups. The range combines published-design sampling error with
explicit widening for model depth and support below 30; the model version and
basis remain part of the result.

## NFHS height model fields

Normalize gender, eligible age, State/UT, urban/rural area, measured height,
sample weight, cluster, and stratum. Enforce the published eligible age ranges:
women 15–49 and men 15–54. App ages outside those bounds require an explicit
extrapolation policy and a wider range; they must not silently inherit the
nearest band.

Height probabilities are estimated by gender, age band, State/UT, and area.
Sparse cells must back off in this order:

1. State + area + age band.
2. State + age band.
3. National + area + age band.
4. National + age band.

Every back-off step widens the returned range, lowers its numeric
range-precision score, and is disclosed in the API response.

## Aggregate serving tables

The PLFS preview uses `plfs_joint_cells` for exact joint point cells and
`plfs_variance_cells` for server-only design sufficient statistics. The latter
preserves covariance required for arbitrary supported filters. A future
`height_model` will contain only conditional distribution parameters,
probabilities, sample counts, and design-aware bounds.

The cube intentionally preserves the joint dimensions rather than multiplying
independent marginals. With the MVP buckets, exact ages, and current State/UT
groups, the deterministic demo contains 249,744 demographic rows and 220 height
rows in a roughly 20 MB DuckDB file. Storage optimization is secondary to
accuracy and coverage: compression, narrower physical types, or coarser
pre-aggregation is acceptable only when representative outputs and intervals
remain unchanged within the documented tolerance.

The estimate API returns only:

- rounded count range;
- rounded central estimate;
- two denominator comparisons;
- unweighted matching count;
- aggregate income-support bounds used to explain threshold plateaus;
- height availability; a probability/model label only after NFHS validation;
- numeric range-precision score, formula inputs, and reason;
- data mode and source years.

It never returns source rows, record identifiers, district/city output, or
restricted variables.

### Hosted serving boundary

The production runtime uses the dedicated MotherDuck database
`india_standards` through its regional PostgreSQL-compatible endpoint. The
hosted relation allowlist is:

- `category_frequencies`
- `code_mapping`
- `field_diagnostics`
- `income_tail_diagnostics`
- `plfs_joint_cells`
- `plfs_variance_cells`
- `population_totals`
- `representative_query_fixtures`
- `source_manifest`
- `state_mapping`
- `validation_checks`
- `variance_validation_fixtures`

Migration and parity checks fail if either the local or hosted schema contains
any additional base table. They compare all table row counts and representative
₹30 lakh, ₹65 lakh, and structurally backed-off ₹75 lakh estimates. Runtime SQL
is fixed and parameterized; the MotherDuck token is a Cloudflare secret and is
not included in source, build output, logs, API responses, or browser assets.

## Required validations before PLFS preview

1. Input checksum and row count match the supplied files.
2. Categorical frequencies match published or portal metadata.
3. Weighted national gender/age totals are plausible and documented.
4. Earnings units/reference periods are verified against the schedule.
5. The official PLFS point/RSE fixture reproduces after published rounding.
6. Representative exact, sparse, and zero-support queries reproduce.
7. Raw person, household, FSU, and district identifiers are absent from
   persisted tables and API responses.
8. The browser says `PLFS-backed preview`, discloses the usage-scope review,
   and excludes height.

## Additional validations before Survey-backed mode

1. PLFS usage scope is approved.
2. NFHS source admission, measured-height exclusions, weights, and survey
   design pass.
3. Cross-dataset height fixtures and out-of-coverage age policy pass.
4. The browser shows both source years and labels height as modelled across
   datasets.

## Sparse-cell and range-precision policy

A valid filter combination always returns the model's best available range.
Cells with fewer than 30 direct records are not treated as equally reliable:
they use the documented best-effort basis, receive additional sparse-cell
widening, and disclose the direct count. Official mode must use a documented
hierarchical/back-off model when an exact cell has no direct support; it must
not invent an expected cell weight.

The 0–100 range-precision score is computed from the final interval:
`100 / (1 + relative half-width)`, rounded to a whole number, where relative
half-width is `(upper - lower) / (2 × central)`. It is a range-precision index,
not a frequentist coverage probability and not the probability that the answer
is correct. In PLFS preview, direct-sample uncertainty and hierarchical model
widening affect the score through the interval. Height uncertainty can affect
it only after a validated NFHS model exists.
