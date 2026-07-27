---
score: 32
maximum: 40
p0: 0
p1: 0
detectorFindings: 0
auditScore: 19
auditMaximum: 20
timestamp: 2026-07-27T05-04-40Z
slug: dry-apps-india-standards-components-calculator-tsx
---
# India Standards post-fix critique

Method: fresh dual assessment after the best-effort and numeric range-precision
change. Assessment A inspected the source and live app at 390x844 and
1440x1000. Assessment B reran the exact detector, responsive overflow checks,
and browser console review.

## Result

- Nielsen score: 32/40
- Unresolved P0: 0
- Unresolved P1: 0
- Detector findings: 0
- Browser console errors or warnings: 0
- Horizontal overflow at 390, 768, and 1440: none

## Accuracy and coverage treatment

- Every valid combination returns the generated model's best available range.
- Fewer than 30 direct records triggers best-effort disclosure and additional
  interval widening rather than a categorical coverage failure.
- The first-order label says `Range precision X/100`, with `Not a correctness
  probability` immediately adjacent. No probability-like meter is shown.
- The 0-100 score is reproducible from the returned interval's relative
  half-width and is documented in the methodology.
- Zero-record cells expose the direct count, model basis, wider range, and
  test-only source boundary.

## Storage treatment

- The runtime stores joint aggregate cells rather than person-level records.
- Accuracy and filter coverage take priority over compaction; storage
  optimization requires output-equivalence checks against the full cube.

## Audit

- Accessibility: 4/4
- Performance: 4/4
- Theming: 3/4
- Responsive design: 4/4
- Content integrity: 4/4
- Total: 19/20
