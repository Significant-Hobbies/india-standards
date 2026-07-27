import assert from "node:assert/strict";
import test from "node:test";
import { DuckDBInstance } from "@duckdb/node-api";
import {
  estimatePlfsBestEffort,
  estimatePlfsDomainVariance,
  validatePlfsVarianceFilters,
} from "../scripts/plfs-variance.mjs";

const FILTERS = {
  gender: "men",
  ageMin: 25,
  ageMax: 27,
  minIncome: 1_200_000,
  maritalStatus: "never_married",
  education: "graduate",
  state: "all",
  area: "all",
};

test("rejects unsupported variance filter values", () => {
  assert.throws(
    () => validatePlfsVarianceFilters({ ...FILTERS, state: "Mumbai" }),
    /Unsupported PLFS variance State\/UT/,
  );
  assert.equal(
    validatePlfsVarianceFilters({ ...FILTERS, minIncome: 1_400_000 }).minIncome,
    1_400_000,
  );
  assert.throws(
    () => validatePlfsVarianceFilters({ ...FILTERS, minIncome: 1_450_000 }),
    /income threshold/,
  );
  assert.throws(
    () => validatePlfsVarianceFilters({ ...FILTERS, minIncome: 8_600_000 }),
    /income threshold/,
  );
});

test("computes published domain-total variance from sufficient statistics", async () => {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  await connection.run(`
    CREATE TABLE plfs_variance_cells (
      design_cell_id INTEGER,
      psu_id INTEGER,
      surveyed_fsu_count INTEGER,
      gender VARCHAR,
      age INTEGER,
      product_state VARCHAR,
      area VARCHAR,
      marital_status VARCHAR,
      education VARCHAR,
      income_floor INTEGER,
      observation_count INTEGER,
      weighted_population DOUBLE,
      expanded_psu_contribution DOUBLE
    )
  `);
  await connection.run(`
    INSERT INTO plfs_variance_cells VALUES
      (1, 1, 2, 'men', 25, 'Delhi', 'urban', 'never_married',
       'graduate', 1200000, 1, 10, 20),
      (1, 2, 2, 'men', 25, 'Delhi', 'urban', 'never_married',
       'graduate', 1200000, 1, 20, 40)
  `);

  const result = await estimatePlfsDomainVariance(connection, FILTERS);
  connection.closeSync();

  assert.equal(result.observationCount, 2);
  assert.equal(result.estimate, 30);
  assert.equal(result.variance, 100);
  assert.equal(result.standardError, 10);
  assert.equal(result.pointBasis, "sparse_direct");
});

test("distinguishes exact high-income thresholds", async () => {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  await connection.run(`
    CREATE TABLE plfs_variance_cells (
      design_cell_id INTEGER,
      psu_id INTEGER,
      surveyed_fsu_count INTEGER,
      gender VARCHAR,
      age INTEGER,
      product_state VARCHAR,
      area VARCHAR,
      marital_status VARCHAR,
      education VARCHAR,
      income_floor INTEGER,
      observation_count INTEGER,
      weighted_population DOUBLE,
      expanded_psu_contribution DOUBLE
    )
  `);
  await connection.run(`
    INSERT INTO plfs_variance_cells VALUES
      (1, 1, 2, 'men', 25, 'Delhi', 'urban', 'never_married',
       'graduate', 3200000, 1, 10, 20),
      (1, 2, 2, 'men', 25, 'Delhi', 'urban', 'never_married',
       'graduate', 6000000, 1, 20, 40)
  `);

  const atThirtyLakh = await estimatePlfsDomainVariance(connection, {
    ...FILTERS,
    minIncome: 3_000_000,
    state: "Delhi",
    area: "urban",
  });
  const atFiftyLakh = await estimatePlfsDomainVariance(connection, {
    ...FILTERS,
    minIncome: 5_000_000,
    state: "Delhi",
    area: "urban",
  });
  connection.closeSync();

  assert.equal(atThirtyLakh.observationCount, 2);
  assert.equal(atThirtyLakh.estimate, 30);
  assert.equal(atFiftyLakh.observationCount, 1);
  assert.equal(atFiftyLakh.estimate, 20);
});

test("uses a disclosed national backoff when an exact cell has zero support", async () => {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  await connection.run(`
    CREATE TABLE plfs_variance_cells (
      design_cell_id INTEGER,
      psu_id INTEGER,
      surveyed_fsu_count INTEGER,
      gender VARCHAR,
      age INTEGER,
      product_state VARCHAR,
      area VARCHAR,
      marital_status VARCHAR,
      education VARCHAR,
      income_floor INTEGER,
      observation_count INTEGER,
      weighted_population DOUBLE,
      expanded_psu_contribution DOUBLE
    )
  `);
  await connection.run(`
    INSERT INTO plfs_variance_cells VALUES
      (1, 1, 2, 'women', 18, 'Delhi', 'rural', 'never_married',
       'below_secondary', 0, 10, 1000, 2000),
      (1, 2, 2, 'women', 18, 'Delhi', 'rural', 'never_married',
       'graduate', 0, 10, 1000, 2000),
      (1, 1, 2, 'women', 18, 'Delhi', 'rural', 'never_married',
       'postgraduate', 0, 2, 200, 400),
      (2, 3, 2, 'women', 18, 'Maharashtra', 'rural', 'never_married',
       'postgraduate', 5000000, 1, 100, 200),
      (2, 4, 2, 'women', 18, 'Maharashtra', 'rural', 'never_married',
       'below_secondary', 0, 10, 1900, 3800)
  `);

  const result = await estimatePlfsBestEffort(connection, {
    ...FILTERS,
    gender: "women",
    ageMin: 18,
    ageMax: 18,
    minIncome: 5_000_000,
    education: "postgraduate",
    state: "Delhi",
    area: "rural",
  });
  connection.closeSync();

  assert.equal(result.mode, "hierarchical_backoff");
  assert.equal(result.modelVersion, "plfs-zero-v1");
  assert.ok(result.estimate > 0);
  assert.equal(result.observationCount, 0);
  assert.ok(result.backoffObservationCount > 0);
  assert.ok(result.low95 <= result.estimate);
  assert.ok(result.high95 > result.estimate);
  assert.ok(result.rangePrecisionScore >= 0);
});

test("relaxes marital support only after demographic backoff is exhausted", async () => {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  await connection.run(`
    CREATE TABLE plfs_variance_cells (
      design_cell_id INTEGER,
      psu_id INTEGER,
      surveyed_fsu_count INTEGER,
      gender VARCHAR,
      age INTEGER,
      product_state VARCHAR,
      area VARCHAR,
      marital_status VARCHAR,
      education VARCHAR,
      income_floor INTEGER,
      observation_count INTEGER,
      weighted_population DOUBLE,
      expanded_psu_contribution DOUBLE
    )
  `);
  await connection.run(`
    INSERT INTO plfs_variance_cells VALUES
      (1, 1, 2, 'men', 25, 'Delhi', 'urban', 'never_married',
       'graduate', 0, 10, 1000, 2000),
      (1, 2, 2, 'men', 25, 'Delhi', 'urban', 'married',
       'graduate', 0, 10, 1000, 2000),
      (2, 3, 2, 'men', 45, 'Maharashtra', 'urban', 'married',
       'graduate', 8500000, 1, 100, 200)
  `);

  const result = await estimatePlfsBestEffort(connection, {
    ...FILTERS,
    minIncome: 7_500_000,
    state: "Delhi",
    area: "urban",
  });
  connection.closeSync();

  assert.equal(result.mode, "hierarchical_backoff");
  assert.equal(result.modelVersion, "plfs-zero-v1");
  assert.equal(result.observationCount, 0);
  assert.equal(result.backoffObservationCount, 1);
  assert.match(result.backoff.label, /marital status relaxed/);
  assert.ok(result.estimate > 0);
  assert.equal(result.low95, 0);
  assert.ok(result.high95 > result.estimate);
});
