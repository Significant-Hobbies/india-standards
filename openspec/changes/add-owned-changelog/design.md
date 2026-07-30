# Design

## Approach

Implement `/changelog` as a static App Router page at
`app/changelog/page.tsx`. Keep the established calculator-workbench identity:
system grotesk typography, cobalt actions, mango accents, white and pale-blue
surfaces, compact headings, and the existing 1240px layout boundary. Page-only
layout rules live in a colocated CSS module so the calculator remains
unchanged except for its discoverability link.

The page contains one dated editorial entry. Its date and claims come directly
from the verified 2026-07-27 production milestone in `PROJECT_STATUS.md`. The
public repository and its GitHub Issues roadmap remain the source of truth for
source and future work, so the page links both without copying either.

## Accessibility and responsive behavior

- One `h1` and semantic `article`, `time`, and list elements.
- Visible keyboard focus through the existing global focus token.
- Links retain at least a 44px touch target.
- The release layout collapses from a date/content grid to one column below
  tablet width without horizontal overflow.

## Verification

- Confirm the canonical route shape resolves to `/changelog`.
- Run `pnpm typecheck`, then the repository's smallest relevant tests/build.
- Inspect at 390, 768, and 1440 CSS pixels and record the preserve-mode design
  evidence.
