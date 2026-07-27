# India Standards agent instructions

- Read `PROJECT_STATUS.md`, `PRODUCT.md`, and `DESIGN.md` before broad work.
- Keep all estimates explicit about their data mode: `demo` or `official`.
- Never present generated demo records as PLFS or NFHS observations.
- Preserve the product exclusions in `PRODUCT.md`; do not add dating-success,
  attractiveness, caste/community, substance-use, obesity, or city filters.
- Use `pnpm`. Run `pnpm test` before the broader `pnpm check`.
- Keep authorized survey microdata local. MotherDuck may contain only the
  allowlisted aggregate serving tables, and its token must remain in secret
  storage rather than tracked files, logs, or browser code.
- Do not commit generated DuckDB files.
