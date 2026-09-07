# Calculator evidence — 2026-09-07

This is local source/aggregate qualification, not hosted or browser proof.
The admitted staging DuckDB was attached READ_ONLY to an in-memory database;
only allowlisted aggregate tables were queried. No source person records,
credentials, hosted database, or production settings were read or changed.

## Actual admitted dataset

The local manifest reports PLFS calendar year 2025: 1,148,634 input records,
715,351 eligible records. Required technical check rows pass; overall status
remains pending because usage_scope and nfhs_height_model are pending.
These are stored admission receipts, not a fresh raw-source reimport.

The importer admits mapped men/women aged 18–60, supported category mappings,
positive survey weights and nonnegative annualized earnings proxy. The proxy
is twelve times regular salary plus self-employment earnings, treating missing
components as zero. Casual wages are excluded; it is not total annual income,
wealth or a zero-income classification. Education is categorical, not a floor.

## Recomputed aggregate cases

All cases below select men aged 25–27, never married, graduate, all India,
urban+rural; height is excluded. National male denominator ages 18–60:
353,020,230.03. National male age-cohort denominator: 30,388,481.31.
Both denominators include every supported marital/education group and no
income minimum, regardless of the numerator's state/area selection.

| Minimum proxy | Central estimate | Lower / upper count bounds | Direct support | Basis |
| --- | ---: | --- | ---: | --- |
| ₹12 lakh | 17,182.89 | 5,572.18 / 28,793.60 | 14 | Direct |
| ₹30 lakh | 640.89 | 0 / 1,897.03 | 1 | Direct |
| ₹65 lakh | 640.89 | 0 / 1,897.03 | 1 | Direct |
| ₹75 lakh | 51.29 | 0 / 230.44 | 0 | Broader model, 1 supporting record |

The unchanged ₹30/65 lakh value is an observed aggregate support plateau.
Women aged 25–27, never married, graduate, all India at ₹85 lakh produces
`insufficient_backoff_support`, with zero direct support. The repaired
application rejects that as unavailable instead of serving “0 people”.

## Repairs and executable boundaries

- Unavailable support modes and invalid/empty comparison populations cannot
  produce successful estimates. The API returns a specific 422 explanation.
- Fractional count bounds retain their actual reciprocal; e.g. a 0.1–2 count
  range against 1,000 gives 1 in 500–10,000. Zero lower count gives an unbounded
  reciprocal endpoint (`null`), not an invented finite bound.
- Percentage endpoints use unrounded aggregate inputs. They scale count
  bounds against fixed estimated denominators; they are not separately fitted
  ratio confidence intervals.
- Shared URLs use the displayed result's filters even if the address bar has
  advanced; education and marital filters remain in the text/link.
- The UI exposes denominator counts, national scope, eligible ages and missing
  earnings/casual-wage limits alongside the persistent 2025 preview boundary.

All 38 tests and the complete `pnpm quality` gate pass, including Cloudflare
bundle/type checks and unchanged complexity/duplication ratchets. One existing
unused suppression warning in the generated layout is non-blocking.

Automated checks cover arithmetic, missing support, national denominator
filter reset, stale URL serialization, allowed filters and published-formula
sufficient-statistics fixtures. They do not exercise a hosted response or
human verification. See the task's exact-commit CI receipt for build checks.

## Remaining owner gates

- [Hosted result and deployment qualification #35](https://github.com/Significant-Hobbies/india-standards/issues/35).
- [Source usage and NFHS activation gates #36](https://github.com/Significant-Hobbies/india-standards/issues/36).
