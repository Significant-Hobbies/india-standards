---
target: PLFS calculator workbench and result hierarchy
total_score: 33
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 0
timestamp: 2026-07-27T11-34-40Z
slug: components-calculator-tsx
---
Method: dual-agent (A: critique_design_final · B: critique_detector_final)

## Design Health Score

| # | Heuristic | Score | Key finding |
|---|---|---:|---|
| 1 | Visibility of system status | 4 | Loading, live query status, update feedback, sharing, and mobile return state are clear. |
| 2 | Match system / real world | 3 | Central estimate, bounds, records, and annualized income are understandable; survey acronyms still assume some literacy. |
| 3 | User control and freedom | 3 | Reset, Edit filters, URL state, and return-to-result work; there is no reset undo or direct numeric entry. |
| 4 | Consistency and standards | 4 | Result-first visual, DOM, and keyboard order now agree at every width. |
| 5 | Error prevention | 4 | Inputs are constrained and height remains unavailable instead of being fabricated. |
| 6 | Recognition rather than recall | 4 | Current values, active-filter chips, source mode, and uncertainty context remain visible. |
| 7 | Flexibility and efficiency | 2 | Native keyboard controls, sharing, and URL state help; range sliders remain the only precision path. |
| 8 | Aesthetic and minimalist design | 3 | The hierarchy is strong, though the result and eight-control workbench remain information-dense. |
| 9 | Error recovery | 3 | Retry preserves filters and gives a specific action; invalid URL state silently resets. |
| 10 | Help and documentation | 3 | Inline explanations and methodology are task-focused; PLFS and NFHS are not expanded in visible copy. |
| **Total** | | **33/40** | **Excellent; no unresolved P0 or P1 issues.** |

## Design Specificity Verdict

The interface feels authored for India Standards. Indian number formatting,
PLFS provenance, the unavailable-height gate, central/range hierarchy,
range-tightness language, active standards, and three-point interval treatment
are product-specific. The filter-card matrix is familiar, but the result
composition is not category-interchangeable.

The deterministic scan found zero issues in `components/calculator.tsx` and
`app/globals.css`. Browser checks at 320, 390, 768, and 1440 found no horizontal
overflow, console errors, warnings, clipped result text, or inaccessible
color-only states.

No live overlay was produced. Browser evaluation was read-only, so mutable
injection failed during preflight and the detector live server was not started.

## Overall Impression

The result now behaves like a careful statistical product without losing the
playful calculator tone. The best estimate is the answer, the 95% interval is
supporting evidence, and sparse observations remain visible rather than being
hidden behind a false confidence label.

## What's Working

- `About 2,180` owns the hierarchy for the 25–27, ₹30 lakh example while
  `0–5,450` is explicitly a 95% uncertainty range.
- A zero lower bound is explained in-place and never presented as a zero
  population estimate.
- The qualitative uncertainty badge and secondary range-tightness score cannot
  reasonably be mistaken for a correctness probability.
- Result-first DOM, visual, and keyboard order agree at every breakpoint.
- The mobile return-to-result action remains visible, unclipped, and at least
  44px high through 320px.
- Source, usage-scope, small-sample, and height-unavailable boundaries remain
  explicit.

## Priority Issues

No P0 or P1 issues remain.

## Minor Observations

- The eight-control filter workbench is still a long mobile journey.
- PLFS and NFHS could be expanded once in visible copy for first-time users.
- Exact numeric entry could make high income and narrow age selection more
  efficient for keyboard users.

## Persona Red Flags

**Jordan (first-timer):** The misleading zero headline and correctness-like
score are resolved. Survey acronyms remain the only notable interpretation
barrier.

**Sam (accessibility-dependent):** Semantic controls, visible focus, 44px
targets, pressed and disabled states, live result updates, and aligned focus
order are strong. Paired age sliders still require care.

**Casey (distracted mobile user):** The result arrives immediately, and the
fixed return action repairs the adjust-then-review loop. The filter stack is
long but no longer strands the user.

## Questions to Consider

- Would optional numeric entry improve precision without making the calculator
  feel like a form?
- Should PLFS and NFHS be expanded in the source badge or only in methodology?
