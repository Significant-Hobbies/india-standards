# India Standards agent instructions

- Read `PROJECT_STATUS.md`, `PRODUCT.md`, and `DESIGN.md` before broad work.
- Keep all estimates explicit about their data mode: `demo` or `official`.
- Never present generated demo records as PLFS or NFHS observations.
- Preserve the product exclusions in `PRODUCT.md`; do not add dating-success,
  attractiveness, caste/community, substance-use, obesity, or city filters.
- Use `pnpm`. Run `pnpm test` before the broader `pnpm check`.
- Run `pnpm quality` for the complete Fleet gate. It covers the changed-source
  format boundary, lint, types, coverage, unused code, complexity, duplication,
  cycles, dependency risk, suppressions, Cloudflare types/build, and repository
  hygiene. Lower a checked-in ratchet when the measured result improves.
- Existing files are not under a broad formatter rewrite. New or changed
  JavaScript/TypeScript must pass `pnpm format:check`.
- Keep authorized survey microdata local. MotherDuck may contain only the
  allowlisted aggregate serving tables, and its token must remain in secret
  storage rather than tracked files, logs, or browser code.
- Do not commit generated DuckDB files.
