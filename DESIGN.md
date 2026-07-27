# India Standards Design System

## Direction

The calculator uses the approved “calculator workbench” direction: a playful
white product surface with compact filters and a wide statistical result canvas.
The result appears first and filter controls compose below it at every width,
keeping visual and keyboard order aligned.

The physical scene is a person opening a shared result on their phone during a
lively daytime group chat: the interface must read instantly in bright ambient
light, invite adjustment, and still feel credible on closer inspection.

## Color

Use OKLCH tokens only.

- Background: `oklch(1 0 0)`
- Surface: `oklch(0.97 0.025 250)`
- Surface strong: `oklch(0.93 0.045 250)`
- Ink: `oklch(0.21 0.06 252)`
- Muted ink: `oklch(0.46 0.045 252)`
- Primary cobalt: `oklch(0.50 0.18 250)`
- Primary hover: `oklch(0.44 0.18 250)`
- Mango: `oklch(0.82 0.15 95)`
- Coral: `oklch(0.65 0.16 29)`
- Success: `oklch(0.56 0.14 155)`

Cobalt owns actions, selection, and the central estimate range. Mango identifies
useful comparison moments. Coral is reserved for best-effort notices and errors.
Color never carries meaning alone.

## Typography

Use one locally available system grotesk stack:
`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
sans-serif`. Data uses tabular numerals. Product headings use a fixed compact
scale; no display font or fluid hero typography.

## Layout

- Desktop: result workbench above a compact filter matrix.
- Tablet: two-column controls with a single result canvas.
- Mobile: result first, filters second, with a context-aware return-to-result
  action that hides while the result itself is visible.
- Maximum content width: 1240px.
- Minimum touch target: 44px.
- Cards top out at 16px radius; nested cards are prohibited.

## Components

- Filter controls use familiar segmented buttons, selects, and paired range
  inputs.
- Result canvas leads with the central estimate, then presents the explicitly
  labelled 95% uncertainty range, two denominators, a three-point range line,
  active-filter summary, range-tightness explanation, and methodology
  disclosure as one composition.
- A zero lower bound never owns the headline; endpoints use `bound` language
  and the central estimate remains visually primary.
- The source-mode badge is persistent and supports `Test-only`,
  `PLFS-backed preview`, and—only after every source and usage gate
  passes—`Survey-backed`.
- In PLFS-backed preview, height is an unavailable control with the NFHS gate
  explained in place; no modelled-height language appears in the result.
- Loading uses a stable skeleton; calculation errors preserve the user's
  filters and offer a specific retry action.

## Motion

Use 150–220ms state transitions with an ease-out curve. Animate only state
feedback where it aids comprehension. Under `prefers-reduced-motion: reduce`,
the skeleton and disclosure transitions stop without globally disabling useful
browser feedback.

## Direction Evidence

- Palette:
  `artifacts/design/directions/palette.png`
- Direction A, result-first split:
  `artifacts/design/directions/result-first-split.png`
- Direction B, guided mobile flow:
  `artifacts/design/directions/guided-mobile-flow.png`
- Selected direction C, calculator workbench:
  `artifacts/design/directions/calculator-workbench.png`

The generated boards are composition references. All controls, text, and charts
remain semantic application code.
