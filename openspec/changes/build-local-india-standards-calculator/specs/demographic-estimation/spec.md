## ADDED Requirements

### Requirement: Joint demographic estimate

The system SHALL filter weighted demographic aggregates by gender, age range,
minimum annual earned income, marital status, education, State/UT, and
urban/rural area, then apply a separately stored conditional height probability.

#### Scenario: Supported filters produce an estimate

- **WHEN** a valid filter set is submitted
- **THEN** the response includes a rounded lower and upper population count
- **AND** the response identifies height as modelled across datasets

### Requirement: Honest uncertainty

The system SHALL combine demographic and height uncertainty into a range and
SHALL NOT return more than three significant digits.

#### Scenario: Sparse or high-income selection

- **WHEN** filters include a high earned-income threshold or sparse cells
- **THEN** the returned range is wider than the central estimate
- **AND** a 0–100 range-precision score and plain-language reason are returned

### Requirement: Best-effort sparse-cell coverage

The system SHALL return the model's best available estimate for every valid
filter combination and SHALL distinguish sparse modelled output from directly
supported cells.

#### Scenario: Fewer than 30 observations

- **WHEN** the matching unweighted observation count is 29 or fewer
- **THEN** the range receives additional sparse-cell widening
- **AND** the response identifies the best-effort basis and direct count
- **AND** official mode uses a documented back-off model rather than inventing
  an exact-cell weight

### Requirement: Numeric range-precision score

The system SHALL derive a 0–100 range-precision score from the final range's relative
half-width and SHALL state that it is not the probability that the estimate is
correct.

#### Scenario: Range-precision score calculation

- **WHEN** an estimate is returned
- **THEN** the score equals `100 / (1 + relative half-width)`, rounded to a
  whole number
- **AND** demographic, height, sparse-cell, and high-income uncertainty affect
  the score through the returned interval

### Requirement: Two denominators

The system SHALL compare the estimate with the entire selected gender and with
the selected gender-and-age cohort.

#### Scenario: Estimate response

- **WHEN** an estimate is available
- **THEN** both denominator counts and rounded percentages are returned
- **AND** the age-cohort reciprocal is derived from the same response

### Requirement: Source disclosure

The system SHALL include the data mode and source year beside every result.

#### Scenario: Demo data

- **WHEN** the local deterministic dataset is active
- **THEN** the result is labelled `Synthetic test data`
- **AND** it SHALL NOT describe generated observations as official survey data

### Requirement: Accuracy gate

The system SHALL block official-data mode unless the source manifest is marked
authoritative and every required validation has passed.

#### Scenario: Unvalidated official manifest

- **WHEN** a database identifies itself as official but its validation status is
  not `passed`
- **THEN** the estimate request fails closed
- **AND** the UI cannot present the result as survey-backed

#### Scenario: Synthetic fixture

- **WHEN** the deterministic demo database is active
- **THEN** every numeric output is labelled synthetic and non-authoritative
- **AND** sharing includes `Not a population estimate`
