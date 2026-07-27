## ADDED Requirements

### Requirement: Mobile-first live calculator

The system SHALL provide touch-friendly controls for every MVP filter and
recalculate after a short debounce without a submit step.

#### Scenario: Filter adjustment

- **WHEN** a user changes a filter
- **THEN** the current result remains spatially stable in a loading state
- **AND** the updated result replaces it without resetting other filters

### Requirement: Result context

The result surface SHALL show the count range, two denominator comparisons,
numeric range-precision score, source mode/year, and the cross-dataset height label
together.

#### Scenario: Wide-uncertainty result

- **WHEN** the returned interval is wide
- **THEN** the 0–100 score and reason are visible without opening methodology
- **AND** the result remains shareable as an estimate rather than an exact count

### Requirement: Methodology disclosure

The system SHALL provide an expandable explanation of filters, weights, height
modelling, uncertainty, demo-data status, and excluded interpretations.

#### Scenario: User opens methodology

- **WHEN** `How this was calculated` is expanded
- **THEN** the panel identifies which fields are joined and which are modelled
- **AND** it states that the result does not predict dating success

### Requirement: Shareable state

The system SHALL encode the selected filters in a local URL and support the
platform share API with a clipboard fallback.

#### Scenario: Share action

- **WHEN** the user activates `Share result`
- **THEN** the URL contains only filter values and no raw data
- **AND** success or failure feedback is announced accessibly

### Requirement: Responsive and accessible operation

The calculator SHALL support 390px, 768px, and 1440px viewports, keyboard
operation, visible focus, and reduced motion.

#### Scenario: Keyboard-only use

- **WHEN** a user navigates all controls and disclosures with a keyboard
- **THEN** every action is reachable in logical order
- **AND** focus is never hidden by sticky UI
