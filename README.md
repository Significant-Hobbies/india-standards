# India Standards

An experiment for a playful, transparent India demographic standards
calculator. It serves a PLFS 2025-backed demographic and earnings preview from
validated aggregates; height remains unavailable.

## Try it

Production target:
[india-numbers.significanthobbies.com](https://india-numbers.significanthobbies.com).

For local development, requirements are Node.js 22+, pnpm 10, and a separate
MotherDuck access token supplied as `MOTHERDUCK_TOKEN`:

```bash
pnpm install
pnpm dev --hostname 127.0.0.1 --port 3217
```

Open [http://127.0.0.1:3217](http://127.0.0.1:3217).

The result must show `PLFS-backed preview`, `PLFS usage scope under review`,
and `height unavailable`. It must not say `Survey-backed`.

## What is implemented

- Joint filters for gender, age, annual earned income, marital status,
  education, PLFS State/UT group, and urban/rural area.
- Income minimums move in ₹1 lakh steps through ₹85 lakh, with legacy ₹2.5
  lakh and ₹7.5 lakh links preserved. Exact-income sufficient statistics keep
  the high-income tail from collapsing into one ₹50 lakh bucket.
- Height is disabled and contributes no probability or multiplier while NFHS
  access is pending.
- PLFS-weighted ranges, two denominators, reciprocal age-cohort context, and a
  0–100 range-precision score derived from relative range width. It is not the
  probability that an estimate is correct.
- Direct analytic survey ranges plus a disclosed hierarchical back-off for
  exact zero-support combinations.
- Shareable URL state and native-share/clipboard behavior.
- MotherDuck queried through its PostgreSQL-compatible endpoint only from the
  server route; parameters are bound and connection failures are redacted.

## Data boundary

Local ETL and parity tests read
`data/india-standards.official.staging.duckdb`. Production reads a dedicated
MotherDuck database containing the same 12 aggregate, diagnostic, and manifest
tables. The local database and its WAL are gitignored.

Neither serving database contains person-level survey rows. Authorized
PLFS/NFHS files are controlled local ETL inputs only; they are not uploaded to
MotherDuck or exposed by the application API.

Keeping the joint cells matters because age, income, education, marital status,
state, and urban/rural area are correlated. Storage may be reduced later only
through output-equivalent compression or aggregation validated against the
full cube—not by multiplying independent marginal percentages.

The authorized PLFS 2025 person CSV is available as a controlled, gitignored
local input. The staging command verifies its checksum, header, row count, code
mappings, weights, and earnings fields before creating an aggregate-only
database:

```bash
pnpm data:stage:plfs
```

The current run admits 1,148,634 source rows, retains 715,351 supported adults,
and produces 219,744 exact joint cells plus 699,387 server-only variance
sufficient-statistic cells in
`data/india-standards.official.staging.duckdb`. The 56 MB database is much
smaller than the source and preserves design covariance across every supported
filter combination, including exact annualized-earnings values through the
source maximum of ₹85.2 lakh. It also writes an ignored machine-readable validation
report under `data/validation/`.

The published variance implementation reproduces the official 2025 rural
usual-status LFPR and RSE after rounding. The PLFS technical gates and
zero-support back-off pass, so these aggregates may power the explicit
`PLFS-backed preview`. PLFS usage scope and NFHS access/height modelling remain
pending, so the app must not say `Survey-backed`. See
[docs/data-contract.md](docs/data-contract.md) before changing that boundary.

Hosted parity is checked against every allowlisted table and representative
high-income estimates:

```bash
MOTHERDUCK_TOKEN=... pnpm data:verify:motherduck
```

Sources:

- [PLFS 2025 catalog and data dictionary](https://microdata.gov.in/NADA/index.php/catalog/284/data-dictionary/F2)
- [Official PLFS sampling changes and 2025 estimation procedure](https://mospi.gov.in/sites/default/files/publication_reports/PLFS_changes_in_2025_Final.pdf)
- [NFHS-5 India fact sheet](https://dhsprogram.com/pubs/pdf/OF43/India_National_Fact_Sheet.pdf)
- [CBDT income-return statistics, AY 2023–24](https://www.incometaxindia.gov.in/w/income-tax-return-statistics-for-assessment-year-2023-24-1)

CBDT tables are a high-income-tail sanity check only. They cannot create the
required age–gender–height joint distribution.

Current official-data acquisition status and the exact authorized download
steps are documented in
[docs/data-acquisition.md](docs/data-acquisition.md).

## Checks

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm build:cf
```

`pnpm check` runs all three in that order.

## Not included

No children preference, attractiveness, hair/eye colour, caste/community,
drinking/smoking, obesity, personality, city-level estimate, dating-success
probability, telemetry, or raw-data API.
