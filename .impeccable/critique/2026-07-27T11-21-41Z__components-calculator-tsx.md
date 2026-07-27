---
target: PLFS calculator workbench and result hierarchy
total_score: 28
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
timestamp: 2026-07-27T11-21-41Z
slug: components-calculator-tsx
---
Method: dual-agent (A: critique_design · B: critique_detector_final)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 4 | Querying, updating, sharing, and stale-result states are clearly communicated. |
| 2 | Match system / real world | 2 | Internal survey terms and the interval hierarchy require statistical interpretation. |
| 3 | User control and freedom | 3 | Reset, editable filters, URL state, and a mobile return action exist, but the mobile loop needs stronger presentation. |
| 4 | Consistency and standards | 3 | The visual system is cohesive; result-first desktop order diverges from the documented filter-first workbench. |
| 5 | Error prevention | 2 | Inputs are constrained, but a zero lower bound and numeric precision badge invite incorrect conclusions. |
| 6 | Recognition rather than recall | 3 | Active-filter chips expose state; methodology terms still need translation. |
| 7 | Flexibility and efficiency | 2 | Automatic recalculation helps, but precise paired sliders and the mobile return loop are inefficient. |
| 8 | Aesthetic and minimalist design | 3 | Clean and disciplined, though the mobile result repeats caveat material. |
| 9 | Error recovery | 3 | Retry preserves filters and fallback modelling is disclosed. |
| 10 | Help and documentation | 3 | Inline methodology is strong, but interpretation guidance follows the headline instead of shaping it. |
| **Total** | | **28/40** | **Good foundation; three major semantic/interaction issues remain.** |

## Design Specificity Verdict

The interface feels authored for India Standards. Indian number formatting,
PLFS provenance, the annualized-earnings definition, active-filter chips,
height unavailability, and range methodology create a coherent product-specific
workbench. The familiar filter-card matrix is generic, but the overall system
is not category-interchangeable.

The deterministic scan found zero issues in `components/calculator.tsx` and
`app/globals.css`. Browser checks at 390, 768, and 1440 found no horizontal
overflow, console errors, warnings, clipped result text, or inaccessible
color-only states. The detector therefore does not contradict the design
review: the problems are semantic hierarchy and interaction quality, not
mechanical anti-patterns.

No live overlay was produced. The browser evaluation surface was read-only, so
mutable injection failed during preflight and the detector live server was
correctly not started.

## Overall Impression

This is a responsible, legible calculator with an unusually strong source
boundary. Its biggest weakness is that it makes an uncertainty interval look
like the answer and then uses a confidence-like score to explain the confusion.
The design needs a more truthful result hierarchy, not more decoration.

## What's Working

- Persistent PLFS provenance, usage-scope review, and unavailable-height
  messaging establish trust without pretending the preview is complete.
- Active-filter chips and the edit link make the result auditable and reduce
  memory burden.
- Loading, updating, error, share, keyboard focus, native controls, and
  responsive stacking are technically solid.

## Priority Issues

### [P1] A zero lower bound reads like the estimate

The headline `0–733 Indian men` makes zero feel like the answer even when the
central estimate is positive. Present the central estimate as the primary
number, label the interval explicitly as a 95% uncertainty range, and rename
the endpoints lower/upper bounds.

Suggested command: `$impeccable clarify`

### [P1] The range-precision badge reads like confidence

`Range precision 46/100` appears before the explanation that it is not a
correctness probability. Lead with a qualitative interval label such as
`Wide uncertainty`, keep the numeric tightness score secondary, and bind its
meaning to every occurrence.

Suggested command: `$impeccable clarify`

### [P1] The mobile return loop lacks sufficient visual authority

The fixed return-to-result action is the only persistent way back after
adjusting lower filters. It needs to fill its shell, remain comfortably inside
the safe area, and be verified from 320 through 390 pixels.

Suggested command: `$impeccable adapt`

### [P2] Internal methodology leaks into the primary result

`plfs-zero-v1`, `hierarchical back-off`, and `domain-total variance` are useful
diagnostics but poor reassurance. Translate the primary result to plain
language and move exact method/version identifiers into the methodology panel.

Suggested command: `$impeccable distill`

## Persona Red Flags

**Jordan (first-timer):** Reads `0–733` as possibly nobody existing and
`46/100` as a 46% chance the answer is correct. Internal method names add
confusion at the moment reassurance is needed.

**Sam (accessibility-dependent):** Native controls, focus rings, labelled
states, and 44px targets are strong. The paired age sliders remain cognitively
demanding, while the mobile return action needs stronger low-vision legibility.

**Casey (distracted mobile user):** Result-first ordering gives a fast payoff,
but the result is long before controls begin. The return action must create an
unmistakable end to the adjust-then-review loop.

## Minor Observations

- `Best-effort PLFS model` sounds provisional beside the stronger real-data
  claim.
- Provenance, support, usage scope, precision, and height status repeat across
  several result bands on mobile.
- The unavailable-height card is clear and appropriately non-interactive.

## Questions to Consider

- Should an interval reaching zero ever own the headline, or should it always
  remain secondary to the central estimate?
- Is the numeric tightness score useful to ordinary users once a plain-language
  wide/moderate/narrow label is present?
- Can the result keep its statistical honesty while becoming shorter on mobile?

Questions skipped: the owner already requested the hierarchy correction and
the three major findings are direct consequences of that same issue.
