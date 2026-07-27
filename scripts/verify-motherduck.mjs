import assert from "node:assert/strict";
import path from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { Client } from "pg";
import { PgDuckDBConnection } from "../lib/pg-duckdb-connection.ts";
import {
  estimatePlfsBestEffort,
  estimatePlfsDomainVariance,
} from "./plfs-variance.mjs";

const SERVING_TABLES = Object.freeze([
  "category_frequencies",
  "code_mapping",
  "field_diagnostics",
  "income_tail_diagnostics",
  "plfs_joint_cells",
  "plfs_variance_cells",
  "population_totals",
  "representative_query_fixtures",
  "source_manifest",
  "state_mapping",
  "validation_checks",
  "variance_validation_fixtures",
]);

const FIXTURES = Object.freeze([
  {
    gender: "men",
    ageMin: 25,
    ageMax: 27,
    minIncome: 3_000_000,
    maritalStatus: "never_married",
    education: "graduate",
    state: "all",
    area: "all",
  },
  {
    gender: "men",
    ageMin: 25,
    ageMax: 27,
    minIncome: 6_500_000,
    maritalStatus: "never_married",
    education: "graduate",
    state: "all",
    area: "all",
  },
  {
    gender: "women",
    ageMin: 25,
    ageMax: 27,
    minIncome: 7_500_000,
    maritalStatus: "never_married",
    education: "postgraduate",
    state: "Delhi",
    area: "urban",
  },
  {
    gender: "men",
    ageMin: 25,
    ageMax: 27,
    minIncome: 7_500_000,
    maritalStatus: "never_married",
    education: "graduate",
    state: "all",
    area: "all",
  },
]);

function comparableEstimate(result) {
  return {
    observationCount: Number(result.observationCount),
    backoffObservationCount:
      result.backoffObservationCount === undefined
        ? undefined
        : Number(result.backoffObservationCount),
    estimate: Number(result.estimate),
    variance: Number(result.variance),
    low95: Number(result.low95),
    high95: Number(result.high95),
    lowestMatchedIncome:
      result.lowestMatchedIncome === null
        ? null
        : Number(result.lowestMatchedIncome),
    highestMatchedIncome:
      result.highestMatchedIncome === null
        ? null
        : Number(result.highestMatchedIncome),
    mode: result.mode,
    modelVersion: result.modelVersion,
  };
}

function assertClose(actual, expected, label) {
  if (actual === null || expected === null || actual === undefined || expected === undefined) {
    assert.equal(actual, expected, label);
    return;
  }
  const tolerance = Math.max(1e-7, Math.abs(expected) * 1e-12);
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

function assertEstimateParity(hosted, local, label) {
  assert.equal(hosted.mode, local.mode, `${label} mode`);
  assert.equal(hosted.modelVersion, local.modelVersion, `${label} model`);
  for (const field of [
    "observationCount",
    "backoffObservationCount",
    "estimate",
    "variance",
    "low95",
    "high95",
    "lowestMatchedIncome",
    "highestMatchedIncome",
  ]) {
    assertClose(hosted[field], local[field], `${label} ${field}`);
  }
}

const token = process.env.MOTHERDUCK_TOKEN;
if (!token) {
  throw new Error("Set MOTHERDUCK_TOKEN before running hosted parity checks.");
}

const databasePath = path.join(
  process.cwd(),
  "data",
  "india-standards.official.staging.duckdb",
);
const localInstance = await DuckDBInstance.fromCache(databasePath);
const local = await localInstance.connect();
const hostedClient = new Client({
  host:
    process.env.MOTHERDUCK_HOST ?? "pg.us-east-1-aws.motherduck.com",
  port: 5432,
  user: "postgres",
  password: token,
  database: process.env.MOTHERDUCK_DATABASE ?? "india_standards",
  ssl: { rejectUnauthorized: true },
  application_name: "india-standards-parity",
  connectionTimeoutMillis: 10_000,
  query_timeout: 25_000,
  statement_timeout: 25_000,
});

try {
  await hostedClient.connect();
  const hosted = new PgDuckDBConnection(hostedClient);
  const localTablesReader = await local.runAndReadAll(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const localTables = localTablesReader
    .getRowObjectsJson()
    .map(({ table_name }) => table_name);
  const hostedTables = (
    await hostedClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'main'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
  ).rows.map(({ table_name }) => table_name);

  assert.deepEqual(localTables, SERVING_TABLES, "local table allowlist");
  assert.deepEqual(hostedTables, SERVING_TABLES, "hosted table allowlist");

  for (const table of SERVING_TABLES) {
    const localCountReader = await local.runAndReadAll(
      `SELECT count(*)::BIGINT AS rows FROM "${table}"`,
    );
    const hostedCount = await hostedClient.query(
      `SELECT count(*)::BIGINT AS rows FROM "${table}"`,
    );
    assert.equal(
      Number(hostedCount.rows[0].rows),
      Number(localCountReader.getRowObjectsJson()[0].rows),
      `${table} row count`,
    );
  }

  for (const [index, filters] of FIXTURES.entries()) {
    const [localEstimate, hostedEstimate] = await Promise.all([
      estimatePlfsBestEffort(local, filters),
      estimatePlfsBestEffort(hosted, filters),
    ]);
    assertEstimateParity(
      comparableEstimate(hostedEstimate),
      comparableEstimate(localEstimate),
      `fixture ${index + 1}`,
    );

    const [localDenominator, hostedDenominator] = await Promise.all([
      estimatePlfsDomainVariance(local, {
        ...filters,
        minIncome: 0,
        maritalStatus: "any",
        education: "any",
        state: "all",
        area: "all",
      }),
      estimatePlfsDomainVariance(hosted, {
        ...filters,
        minIncome: 0,
        maritalStatus: "any",
        education: "any",
        state: "all",
        area: "all",
      }),
    ]);
    assertEstimateParity(
      comparableEstimate(hostedDenominator),
      comparableEstimate(localDenominator),
      `fixture ${index + 1} denominator`,
    );
  }

  console.log(
    `MotherDuck parity passed for ${SERVING_TABLES.length} tables and ${FIXTURES.length} estimate fixtures.`,
  );
} finally {
  local.closeSync();
  await hostedClient.end().catch(() => undefined);
}
