## ADDED Requirements

### Requirement: Aggregate-only hosted database

The system SHALL store only approved aggregate serving relations and source
metadata in MotherDuck and SHALL NOT upload authorized person-level survey
records.

#### Scenario: Hosted database migration

- **WHEN** the admitted local PLFS staging database is migrated
- **THEN** every migrated relation is present on an explicit allowlist
- **AND** the migration aborts if a person-level relation is detected
- **AND** hosted relation counts and validation metadata match the local source

### Requirement: Hosted estimate parity

The hosted estimator SHALL preserve the local estimator's filters, central
estimate, uncertainty interval, denominators, back-off behavior, and source
disclosures.

#### Scenario: Representative hosted query

- **WHEN** the same valid filter request is evaluated locally and through the
  hosted adapter against equivalent data
- **THEN** the returned numeric estimate fields are equal
- **AND** both responses identify the result as a `PLFS-backed preview`

### Requirement: Secret and query safety

The hosted runtime SHALL receive its MotherDuck credential from a Cloudflare
secret and SHALL execute only fixed aggregate queries with bound parameters.

#### Scenario: Production request

- **WHEN** a user requests filter metadata or an estimate
- **THEN** the token is not included in source code, build output, logs, API
  responses, or browser assets
- **AND** user-provided filter values are bound rather than interpolated into
  SQL

### Requirement: Controlled hosted failures

The hosted runtime SHALL bound connection and query duration and SHALL return a
retryable aggregate-data error without leaking connection details.

#### Scenario: MotherDuck is unavailable

- **WHEN** the hosted database cannot be reached within the configured timeout
- **THEN** the API returns a controlled service-unavailable response
- **AND** the response does not contain the database host, token, SQL, or stack
  trace

### Requirement: Verified Cloudflare deployment

The application SHALL deploy from a clean, pushed, CI-green `main` revision to
`india-numbers.significanthobbies.com`, and the Worker version SHALL be tagged
with that exact 40-character Git SHA.

#### Scenario: Production release

- **WHEN** the deployment guard passes and the Worker is released
- **THEN** the custom domain serves the calculator over HTTPS
- **AND** production filter metadata and representative estimate requests pass
  smoke tests
- **AND** the visible source and height limitations match the local application
