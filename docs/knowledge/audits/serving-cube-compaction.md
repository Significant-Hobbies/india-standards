# Serving-cube compaction benchmark

Date: 2026-07-31

Data mode: official PLFS-backed preview aggregates

Benchmark: `serving-cube-compaction-v1`

## Decision

Keep the current indexed local and hosted serving databases unchanged for now.
Do not coarsen or pre-aggregate any joint dimensions.

An index-free copy is the only measured compaction candidate worth carrying
forward. It preserves the full 12-table schema and every tested estimator
output while reducing the local DuckDB file by 67.25%. Across 216 timed samples
per candidate, its local median, mean, and p95 latency were all within 0.5 ms of
the indexed baseline. The 55.7 MiB baseline is not a present storage problem,
and local process timings do not prove hosted behavior, so changing production
is not warranted before direct MotherDuck endpoint evidence is collected under
[GitHub issue #4](https://github.com/Significant-Hobbies/india-standards/issues/4).

If hosted storage becomes material, create a separate index-free MotherDuck
candidate, repeat the hosted parity gate, and compare direct endpoint latency
before switching traffic. Do not mutate the current hosted database in place.

## Measured candidates

The benchmark copied the complete database schema, removed only the two
non-unique ART indexes, and copied the result into a fresh compact DuckDB file.
It did not change tables, columns, nullability, physical column types, rows, or
estimator logic.

| Candidate | Bytes | MiB | Change |
| --- | ---: | ---: | ---: |
| Current cube with two ART indexes | 58,470,400 | 55.76 | baseline |
| Full-schema copy without ART indexes | 19,148,800 | 18.26 | -67.25% |

The removed indexes were:

- `plfs_joint_filters` on `plfs_joint_cells`
- `plfs_variance_filters` on `plfs_variance_cells`

Forced global Zstandard compression was rejected during exploration because it
expanded the same cube to 120.2 MiB. Coarser aggregation was not benchmarked
because it would violate the joint-filter and survey-variance contract.

## Output-equivalence evidence

The accepted candidate passed all of these gates:

- the same 12-table allowlist;
- identical column names, order, physical types, defaults, nullability, and all
  42 table constraints;
- identical row counts, including 219,744 joint cells and 699,387 variance
  cells;
- 46 deterministic estimator fixtures covering both genders, every supported
  product geography, national queries, all area modes, multiple age bands,
  marital states, education levels, and income thresholds;
- zero estimator mismatches for counts, back-off state, central estimate,
  variance, 95% bounds, and matched-income support;
- numeric tolerance `max(1e-7, abs(expected) * 1e-12)`.

## Local latency

Environment: arm64 macOS, Node.js 26.5.0, DuckDB Node API 1.5.5-r.1. The script
warms each connection, then records three rounds over 24 deterministic fixtures
in each of three alternating-order repetitions, for 216 timed samples per
candidate.

| Candidate | Median | p95 | Mean |
| --- | ---: | ---: | ---: |
| Current indexed cube | 15.846 ms | 75.526 ms | 20.931 ms |
| Index-free candidate | 15.375 ms | 75.270 ms | 20.832 ms |

These are local process timings, not hosted request timings. They must not be
presented as MotherDuck or production latency.

## Reproduce

The official aggregate database remains gitignored. Run:

```bash
pnpm data:benchmark:compaction -- \
  --database data/india-standards.official.staging.duckdb
```

The command builds candidates under the operating system's temporary directory,
prints a machine-readable JSON receipt, and removes the temporary databases
after the comparison. It does not read source microdata, contact MotherDuck, or
change the official staging database.
