## ADDED Requirements

### Requirement: Embedded local database

The system SHALL query a local DuckDB file through server-only code.

#### Scenario: Local startup

- **WHEN** the database file does not exist
- **THEN** the developer can generate it with the documented seed command
- **AND** no account, secret, network database, or production service is needed

### Requirement: Aggregate-only API

The public application API SHALL expose estimate responses and filter metadata,
not source rows or raw microdata.

#### Scenario: API request

- **WHEN** a valid estimate request is received
- **THEN** SQL parameters are bound rather than interpolated
- **AND** only aggregate results and methodology metadata are returned

### Requirement: Accuracy-first aggregate storage

The serving database SHALL store joint weighted cells and conditional height
parameters rather than person-level source records or products of independent
marginal probabilities.

#### Scenario: Storage optimization

- **WHEN** compression, narrower physical types, or coarser pre-aggregation is
  proposed
- **THEN** representative counts, intervals, and range-precision scores are compared
  with the full joint cube
- **AND** the optimization is accepted only when documented output tolerances
  are preserved

### Requirement: Deterministic demo mode

The seed process SHALL produce the same generated aggregate dataset on every
run and record `demo` as its data mode.

#### Scenario: Repeated seed

- **WHEN** the database is regenerated with the same repository revision
- **THEN** representative queries produce identical results

### Requirement: Official-data import boundary

The repository SHALL document canonical normalized fields for future PLFS and
NFHS inputs without bundling or fetching restricted microdata.

#### Scenario: Source files are later supplied

- **WHEN** authorized PLFS and NFHS files are mapped
- **THEN** their data mode, source year, sample counts, weight fields, and
  validation results must be stored before the UI may say `Survey-backed`
