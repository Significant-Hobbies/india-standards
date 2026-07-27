---
score: 32
maximum: 40
p0: 0
p1: 0
detectorFindings: 0
auditScore: 19
auditMaximum: 20
timestamp: 2026-07-27T04-51-28Z
slug: dry-apps-india-standards-components-calculator-tsx
---
# India Standards post-fix critique

Method: fresh dual assessment. Assessment A used source review and browser
inspection at 390x844 and 1440x1000. Assessment B ran the exact detector,
responsive overflow checks, and browser console review. The overlay path was
unavailable because the browser evaluation surface was read-only, so the review
used DOM and screenshot evidence.

## Result

- Nielsen score: 32/40
- Unresolved P0: 0
- Unresolved P1: 0
- Detector findings: 0
- Browser console errors: 0
- Horizontal overflow at 390, 768, and 1440: none

## Strengths

- The test-only source boundary, source schema years, and non-population warning
  remain adjacent to the generated count.
- Result and filters now have the same visual and semantic order on mobile.
- Active filters, edit/return paths, 44px controls, URL state, focus treatment,
  reduced motion, sparse-data recovery, and endpoint labels reduce ambiguity.
- The range visual is explicitly two endpoints and no longer implies a
  population distribution.

## Remaining lower-priority opportunities

- The eight-filter flow is deliberately dense and could later be grouped into
  basic and advanced sections.
- Visible demo terminology is standardized, while manifest and schema language
  remains in the methodology for technical readers.
- Direct numeric entry beside paired range controls could improve expert speed
  in a later iteration.

## Audit

- Accessibility: 4/4
- Performance: 4/4
- Theming: 3/4
- Responsive design: 4/4
- Content integrity: 4/4
- Total: 19/20
