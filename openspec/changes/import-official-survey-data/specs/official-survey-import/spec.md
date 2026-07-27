## ADDED Requirements

### Requirement: Authorized source admission
The importer SHALL admit only explicitly configured local PLFS and NFHS source
files whose checksum, expected schema, source year, and access status are
recorded in a source manifest.

#### Scenario: PLFS source matches the approved file
- **WHEN** the importer reads the authorized PLFS 2025 CSV
- **THEN** it records the checksum, 1,148,634 source rows, source year, weight
  variable, and access-agreement status before aggregation

#### Scenario: Source checksum or schema drifts
- **WHEN** a configured source checksum, required column, or column type does
  not match
- **THEN** the import fails before creating an activatable serving database

### Requirement: Raw microdata isolation
The system MUST keep person-level PLFS and NFHS rows out of the serving
database, application API, browser responses, logs, and tracked repository
files.

#### Scenario: Serving database is inspected
- **WHEN** the official staging or serving database tables are enumerated
- **THEN** they contain only manifests, mappings, validation summaries,
  aggregate cells, and uncertainty fields

### Requirement: Documented PLFS normalization
The importer SHALL normalize PLFS gender, age, marital status, education,
State/UT, sector, earnings, and survey weights using versioned mappings tied to
the 2025 schedule and README.

#### Scenario: PLFS earnings are annualized
- **WHEN** a person record has regular salaried or self-employment earnings
- **THEN** the importer derives the annualized current-earnings proxy as twelve
  times the sum of the two mutually exclusive monthly fields and records their
  different source reference periods

#### Scenario: PLFS survey weights are applied
- **WHEN** a PLFS record contributes to an aggregate
- **THEN** its final weight is the published `mult` value divided by 100

#### Scenario: Unsupported published categories are present
- **WHEN** a source category has no current product filter, including published
  transgender code 3
- **THEN** the importer retains it in validation frequencies, excludes it from
  incompatible product aggregates, and records the exclusion count

### Requirement: Joint aggregate fidelity
The importer SHALL build demographic cells from joint person-level combinations
rather than multiplying marginal percentages, and SHALL preserve exact age and
all supported filter dimensions before any storage compaction.

#### Scenario: Representative filter is aggregated
- **WHEN** gender, age, income, marital status, education, State/UT, and sector
  filters are combined
- **THEN** the result is the weighted sum of matching joint records and includes
  the matching unweighted support count

#### Scenario: Storage optimization is proposed
- **WHEN** a smaller physical representation is benchmarked
- **THEN** fixed representative outputs and intervals must remain within the
  documented equivalence tolerance before it can replace the full cube

#### Scenario: High-income thresholds are compared
- **WHEN** a user moves the minimum income between supported whole-lakh values
  from ₹30 lakh through ₹85 lakh
- **THEN** the query filters exact annualized-earnings sufficient statistics
  before aggregation rather than treating every value above ₹50 lakh as one
  bucket
- **AND** an unchanged adjacent result is permitted only when the admitted
  sample contains no reported earnings value between those cutoffs

#### Scenario: Threshold exceeds source coverage
- **WHEN** a requested minimum is above ₹85 lakh
- **THEN** validation rejects it instead of presenting an unsupported
  high-income extrapolation as PLFS-backed

### Requirement: Survey-design uncertainty and sparse coverage
The importer SHALL derive uncertainty using the published design for each
survey—PLFS 2025 analytic domain-total variance and the approved NFHS
complex-survey method—and SHALL return best-effort ranges for sparse
combinations with their direct support and back-off basis.

#### Scenario: PLFS variance has not reproduced an official estimate
- **WHEN** the published PLFS analytic variance implementation has not matched
  an official estimate and RSE fixture
- **THEN** interval fields remain null and the official activation gate remains
  pending

#### Scenario: High-income cell has fewer than 30 direct records
- **WHEN** a selected high-income joint combination has sparse direct support
- **THEN** the system returns its best available widened range, direct support
  count, back-off basis, and numeric range-precision index without presenting
  the index as a correctness probability

#### Scenario: Exact cell has no direct records
- **WHEN** an exact filter cell is empty
- **THEN** the system uses only a versioned hierarchical model or back-off and
  MUST NOT invent an expected record weight

### Requirement: NFHS measured-height import
After access approval, the importer SHALL use the minimum authorized NFHS-5
individual recodes needed to model measured height by gender, age band,
State/UT, and urban/rural area with the supplied survey design.

#### Scenario: NFHS height record is eligible
- **WHEN** a record has a valid measured height and falls within the published
  sex-specific age coverage
- **THEN** it contributes with the documented sample weight, cluster, and
  stratum to the appropriate conditional height cell

#### Scenario: Requested age is outside measured coverage
- **WHEN** women aged 50–60 or men aged 55–60 are requested
- **THEN** the model applies only an explicitly approved extrapolation policy,
  widens the range, and discloses the extrapolation

### Requirement: Fail-closed survey-backed activation
The calculator SHALL keep `Survey-backed` activation blocked until PLFS, NFHS,
uncertainty, fixed-query, height-model, and usage-scope validation gates all
pass.

#### Scenario: Only PLFS validation passes
- **WHEN** all required PLFS technical checks pass but NFHS approval or the
  PLFS usage-scope decision is pending
- **THEN** the local calculator may display `PLFS-backed preview`, MUST NOT
  display `Survey-backed`, and MUST NOT apply a height model

#### Scenario: Every official gate passes
- **WHEN** all required manifests are authoritative and passed, the usage scope
  is approved, and representative fixtures reproduce
- **THEN** the serving database may be atomically replaced and every result
  displays the official source years and cross-dataset height label

### Requirement: PLFS-backed local preview
The calculator SHALL serve a local PLFS-backed preview only from the validated,
aggregate-only PLFS staging database and SHALL disclose the unresolved usage
scope beside every result.

#### Scenario: PLFS preview gates pass
- **WHEN** the PLFS checksum, schema, mappings, weighted totals, official
  variance reproduction, representative fixtures, uncertainty implementation,
  and raw-data isolation checks pass
- **THEN** the calculator returns a PLFS-weighted count range, both requested
  denominators, direct support, a numeric range-precision score, and PLFS 2025
  provenance

#### Scenario: Height is requested during the preview
- **WHEN** the calculator is in `PLFS-backed preview`
- **THEN** height controls are disabled, height is excluded from active filters
  and sharing, and no synthetic or assumed height probability affects the
  estimate

#### Scenario: A required PLFS technical check fails
- **WHEN** the preview manifest or any required PLFS technical validation check
  is missing or not passed
- **THEN** the application refuses to serve the PLFS preview rather than
  falling through to an unlabelled or partially validated estimate

#### Scenario: Preview provenance is displayed
- **WHEN** a PLFS-backed result is shown or shared
- **THEN** it states that income is an annualized current-earnings proxy, the
  source year is 2025, the PLFS usage scope is under review, height is
  unavailable, and the result is not a dating-success probability

### Requirement: Non-commercial and secure operation
The official-data workflow MUST remain local, access-controlled,
non-commercial, and compliant with the PLFS and DHS access agreements.

#### Scenario: Commercial or cloud use is requested
- **WHEN** an operation would deploy, commercialize, upload, or share
  survey-derived microdata beyond the authorized local environment
- **THEN** the workflow blocks and requires a separate licensing and scope
  decision
