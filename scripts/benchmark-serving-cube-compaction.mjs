import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { DuckDBInstance } from "@duckdb/node-api";
import { estimatePlfsBestEffort } from "./plfs-variance.mjs";
import { comparableEstimate } from "./estimate-comparison.mjs";

const DEFAULT_DATABASE_PATH = path.join(
  process.cwd(),
  "data",
  "india-standards.official.staging.duckdb"
);
const BENCHMARK_REPETITIONS = 3;
const BENCHMARK_ROUNDS = 3;
const TIMING_FIXTURE_COUNT = 24;

function parseArguments(argv) {
  const databaseArgumentIndex = argv.indexOf("--database");
  if (databaseArgumentIndex === -1) {
    return { databasePath: DEFAULT_DATABASE_PATH };
  }

  const databasePath = argv[databaseArgumentIndex + 1];
  if (!databasePath) {
    throw new Error("--database requires a path.");
  }
  return { databasePath: path.resolve(databasePath) };
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function readRows(connection, sql, values) {
  const reader = values
    ? await connection.runAndReadAll(sql, values)
    : await connection.runAndReadAll(sql);
  return reader.getRowObjectsJson();
}

async function readServingTables(connection) {
  return readRows(
    connection,
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'main'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
  );
}

async function readServingSchema(connection) {
  return readRows(
    connection,
    `
      SELECT
        table_name,
        column_name,
        data_type,
        ordinal_position,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'main'
      ORDER BY table_name, ordinal_position
    `
  );
}

async function readConstraints(connection) {
  return readRows(
    connection,
    `
      SELECT
        table_name,
        constraint_index,
        constraint_type,
        constraint_text,
        expression,
        constraint_column_indexes,
        constraint_column_names,
        constraint_name,
        referenced_table,
        referenced_column_names
      FROM duckdb_constraints()
      WHERE database_name = current_database()
      ORDER BY table_name, constraint_index
    `
  );
}

async function readTableCounts(connection, tables) {
  const counts = [];
  for (const { table_name: tableName } of tables) {
    const [{ row_count: rowCount }] = await readRows(
      connection,
      `SELECT count(*)::BIGINT AS row_count FROM ${quoteIdentifier(tableName)}`
    );
    counts.push({ tableName, rowCount: Number(rowCount) });
  }
  return counts;
}

async function readIndexes(connection) {
  const indexes = await readRows(
    connection,
    `
      SELECT index_name, table_name, is_unique
      FROM duckdb_indexes()
      WHERE database_name = current_database()
      ORDER BY index_name
    `
  );
  return indexes.map(
    ({
      index_name: indexName,
      table_name: tableName,
      is_unique: isUnique,
    }) => ({
      indexName,
      tableName,
      isUnique,
    })
  );
}

async function buildIndexFreeCandidate(
  sourceDatabasePath,
  intermediateDatabasePath,
  candidateDatabasePath
) {
  const intermediateInstance = await DuckDBInstance.create(
    intermediateDatabasePath
  );
  const intermediateConnection = await intermediateInstance.connect();
  try {
    const escapedSourcePath = sourceDatabasePath.replaceAll("'", "''");
    await intermediateConnection.run(
      `ATTACH '${escapedSourcePath}' AS source_database (READ_ONLY)`
    );
    await intermediateConnection.run(
      "COPY FROM DATABASE source_database TO intermediate"
    );
    await intermediateConnection.run("DETACH source_database");

    const sourceIndexes = await readIndexes(intermediateConnection);
    assert.deepEqual(
      sourceIndexes.map(({ indexName }) => indexName),
      ["plfs_joint_filters", "plfs_variance_filters"],
      "expected removable ART indexes"
    );
    for (const { indexName } of sourceIndexes) {
      await intermediateConnection.run(
        `DROP INDEX ${quoteIdentifier(indexName)}`
      );
    }
    await intermediateConnection.run("CHECKPOINT");
  } finally {
    intermediateConnection.closeSync();
  }

  const candidateInstance = await DuckDBInstance.create(candidateDatabasePath);
  const candidateConnection = await candidateInstance.connect();
  const escapedIntermediatePath = intermediateDatabasePath.replaceAll(
    "'",
    "''"
  );
  await candidateConnection.run(
    `ATTACH '${escapedIntermediatePath}' AS index_free_source (READ_ONLY)`
  );
  await candidateConnection.run(
    "COPY FROM DATABASE index_free_source TO candidate"
  );
  await candidateConnection.run("DETACH index_free_source");
  await candidateConnection.run("CHECKPOINT");
  return candidateConnection;
}

function benchmarkComparableEstimate(result) {
  return {
    ...comparableEstimate(result),
    backoffReason: result.backoffReason,
    backoffSteps: result.backoffSteps,
  };
}

function assertClose(actual, expected, label) {
  if (
    actual === null ||
    expected === null ||
    actual === undefined ||
    expected === undefined ||
    typeof actual !== "number" ||
    typeof expected !== "number"
  ) {
    assert.deepEqual(actual, expected, label);
    return;
  }

  const tolerance = Math.max(1e-7, Math.abs(expected) * 1e-12);
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`
  );
}

function assertEstimateParity(actual, expected, label) {
  for (const field of Object.keys(expected)) {
    assertClose(actual[field], expected[field], `${label} ${field}`);
  }
}

function buildParityFixtures() {
  const states = [
    "Delhi",
    "Gujarat",
    "Karnataka",
    "Kerala",
    "Maharashtra",
    "Rajasthan",
    "Tamil Nadu",
    "Telangana",
    "Uttar Pradesh",
    "West Bengal",
    "Other States / UTs",
  ];
  const ageBands = [
    [18, 24],
    [25, 27],
    [28, 34],
    [35, 44],
    [45, 60],
  ];
  const incomes = [0, 300_000, 1_200_000, 3_000_000, 6_500_000, 7_500_000];
  const maritalStatuses = ["any", "never_married", "married"];
  const educationLevels = ["any", "secondary", "graduate", "postgraduate"];
  const areas = ["all", "rural", "urban"];
  const fixtures = [];

  for (const [stateIndex, state] of states.entries()) {
    for (const [genderIndex, gender] of ["men", "women"].entries()) {
      const fixtureIndex = stateIndex * 2 + genderIndex;
      const [ageMin, ageMax] = ageBands[fixtureIndex % ageBands.length];
      fixtures.push({
        gender,
        ageMin,
        ageMax,
        minIncome: incomes[fixtureIndex % incomes.length],
        maritalStatus: maritalStatuses[fixtureIndex % maritalStatuses.length],
        education: educationLevels[fixtureIndex % educationLevels.length],
        state,
        area: areas[fixtureIndex % areas.length],
      });
    }
  }

  for (let fixtureIndex = 0; fixtureIndex < 24; fixtureIndex += 1) {
    const [ageMin, ageMax] = ageBands[fixtureIndex % ageBands.length];
    fixtures.push({
      gender: fixtureIndex % 2 === 0 ? "men" : "women",
      ageMin,
      ageMax,
      minIncome: incomes[(fixtureIndex * 5) % incomes.length],
      maritalStatus:
        maritalStatuses[(fixtureIndex * 2) % maritalStatuses.length],
      education: educationLevels[(fixtureIndex * 3) % educationLevels.length],
      state: "all",
      area: areas[(fixtureIndex * 2) % areas.length],
    });
  }

  return fixtures;
}

async function verifyEstimateParity(
  sourceConnection,
  candidateConnection,
  fixtures
) {
  for (const [fixtureIndex, filters] of fixtures.entries()) {
    const sourceEstimate = benchmarkComparableEstimate(
      await estimatePlfsBestEffort(sourceConnection, filters)
    );
    const candidateEstimate = benchmarkComparableEstimate(
      await estimatePlfsBestEffort(candidateConnection, filters)
    );
    assertEstimateParity(
      candidateEstimate,
      sourceEstimate,
      `fixture ${fixtureIndex + 1}`
    );
  }
}

function summarizeTimings(timings) {
  const sortedTimings = [...timings].sort((left, right) => left - right);
  const percentile = (fraction) =>
    sortedTimings[
      Math.min(
        sortedTimings.length - 1,
        Math.ceil(sortedTimings.length * fraction) - 1
      )
    ];
  return {
    sampleCount: sortedTimings.length,
    medianMs: Number(percentile(0.5).toFixed(3)),
    p95Ms: Number(percentile(0.95).toFixed(3)),
    meanMs: Number(
      (
        sortedTimings.reduce((total, timing) => total + timing, 0) /
        sortedTimings.length
      ).toFixed(3)
    ),
  };
}

async function measureEstimator(connection, fixtures) {
  for (const filters of fixtures.slice(0, 4)) {
    await estimatePlfsBestEffort(connection, filters);
  }

  const timings = [];
  for (let round = 0; round < BENCHMARK_ROUNDS; round += 1) {
    for (const filters of fixtures) {
      const start = performance.now();
      await estimatePlfsBestEffort(connection, filters);
      timings.push(performance.now() - start);
    }
  }
  return timings;
}

const { databasePath } = parseArguments(process.argv.slice(2));
const temporaryDirectory = await mkdtemp(
  path.join(tmpdir(), "india-standards-compaction-")
);
const candidateDatabasePath = path.join(temporaryDirectory, "candidate.duckdb");
const intermediateDatabasePath = path.join(
  temporaryDirectory,
  "intermediate.duckdb"
);
const sourceInstance = await DuckDBInstance.fromCache(databasePath);
const sourceConnection = await sourceInstance.connect();
let candidateConnection;

try {
  const candidateBuildStartedAt = performance.now();
  candidateConnection = await buildIndexFreeCandidate(
    databasePath,
    intermediateDatabasePath,
    candidateDatabasePath
  );
  const candidateBuildMs = performance.now() - candidateBuildStartedAt;

  const sourceTables = await readServingTables(sourceConnection);
  const candidateTables = await readServingTables(candidateConnection);
  assert.deepEqual(candidateTables, sourceTables, "serving table allowlist");

  const sourceSchema = await readServingSchema(sourceConnection);
  const candidateSchema = await readServingSchema(candidateConnection);
  assert.deepEqual(candidateSchema, sourceSchema, "serving table schema");

  const sourceConstraints = await readConstraints(sourceConnection);
  const candidateConstraints = await readConstraints(candidateConnection);
  assert.deepEqual(
    candidateConstraints,
    sourceConstraints,
    "serving table constraints"
  );

  const sourceTableCounts = await readTableCounts(
    sourceConnection,
    sourceTables
  );
  const candidateTableCounts = await readTableCounts(
    candidateConnection,
    candidateTables
  );
  assert.deepEqual(
    candidateTableCounts,
    sourceTableCounts,
    "serving table row counts"
  );

  const parityFixtures = buildParityFixtures();
  await verifyEstimateParity(
    sourceConnection,
    candidateConnection,
    parityFixtures
  );

  const timingFixtures = parityFixtures.slice(0, TIMING_FIXTURE_COUNT);
  const indexedTimings = [];
  const indexFreeTimings = [];
  const indexedRuns = [];
  const indexFreeRuns = [];
  for (
    let repetition = 0;
    repetition < BENCHMARK_REPETITIONS;
    repetition += 1
  ) {
    let currentIndexedTimings;
    let currentIndexFreeTimings;
    if (repetition % 2 === 0) {
      currentIndexedTimings = await measureEstimator(
        sourceConnection,
        timingFixtures
      );
      currentIndexFreeTimings = await measureEstimator(
        candidateConnection,
        timingFixtures
      );
    } else {
      currentIndexFreeTimings = await measureEstimator(
        candidateConnection,
        timingFixtures
      );
      currentIndexedTimings = await measureEstimator(
        sourceConnection,
        timingFixtures
      );
    }
    indexedTimings.push(...currentIndexedTimings);
    indexFreeTimings.push(...currentIndexFreeTimings);
    indexedRuns.push(summarizeTimings(currentIndexedTimings));
    indexFreeRuns.push(summarizeTimings(currentIndexFreeTimings));
  }
  const indexedTiming = {
    ...summarizeTimings(indexedTimings),
    runs: indexedRuns,
  };
  const indexFreeTiming = {
    ...summarizeTimings(indexFreeTimings),
    runs: indexFreeRuns,
  };

  const sourceSizeBytes = (await stat(databasePath)).size;
  const candidateSizeBytes = (await stat(candidateDatabasePath)).size;
  const sizeReductionPercent =
    ((sourceSizeBytes - candidateSizeBytes) / sourceSizeBytes) * 100;
  const result = {
    benchmarkVersion: "serving-cube-compaction-v1",
    candidate: "copy all serving tables without ART indexes",
    source: {
      sizeBytes: sourceSizeBytes,
      indexes: await readIndexes(sourceConnection),
      latency: indexedTiming,
    },
    indexFree: {
      sizeBytes: candidateSizeBytes,
      indexes: await readIndexes(candidateConnection),
      buildMs: Number(candidateBuildMs.toFixed(3)),
      latency: indexFreeTiming,
    },
    reduction: {
      bytes: sourceSizeBytes - candidateSizeBytes,
      percent: Number(sizeReductionPercent.toFixed(3)),
    },
    parity: {
      tableCount: sourceTables.length,
      constraintCount: sourceConstraints.length,
      tableRowCounts: sourceTableCounts,
      fixtureCount: parityFixtures.length,
      mismatches: 0,
      tolerance: "max(1e-7, abs(expected) * 1e-12)",
    },
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  sourceConnection.closeSync();
  candidateConnection?.closeSync();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
