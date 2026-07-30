## ADDED Requirements

### Requirement: India Standards owns a public changelog route

India Standards SHALL expose a same-origin `/changelog` page from its owning
Next.js application. The page MUST contain deliberately published product
history and MUST NOT depend on Fleet runtime services.

#### Scenario: A visitor opens the changelog

- **WHEN** a visitor opens `/changelog`
- **THEN** the India Standards website renders a native changelog page
- **AND** the visitor does not need authentication

### Requirement: Published history is verified and responsive

Every changelog entry SHALL have a date, title, and at least one user-visible
outcome supported by the repository's durable shipped-product record. The page
SHALL remain readable without horizontal overflow at 390, 768, and 1440 CSS
pixels.

#### Scenario: Only the launch milestone is published

- **WHEN** the repository supports one deliberately public initial milestone
- **THEN** the page publishes that honest entry
- **AND** it does not pad the history with inferred or unreleased changes
