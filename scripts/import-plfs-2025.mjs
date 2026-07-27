import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import {
  DIRECT_UI_STATES,
  PLFS_2025_CONTRACT,
  PLFS_CODE_MAPPINGS,
  PLFS_STATE_NAMES,
  inspectPlfsSource,
} from "./plfs-2025-contract.mjs";
import {
  estimatePlfsBestEffort,
  estimatePlfsDomainVariance,
} from "./plfs-variance.mjs";

const projectRoot = process.cwd();
const defaultSourcePath = path.join(
  projectRoot,
  PLFS_2025_CONTRACT.relativePath,
);
const defaultDatabasePath = path.join(
  projectRoot,
  "data",
  "india-standards.official.staging.duckdb",
);
const defaultReportPath = path.join(
  projectRoot,
  "data",
  "validation",
  "plfs-2025.json",
);

function argumentValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a path.`);
  }
  return path.resolve(projectRoot, value);
}

const sourcePath = argumentValue("--source", defaultSourcePath);
const databasePath = argumentValue("--database", defaultDatabasePath);
const reportPath = argumentValue("--report", defaultReportPath);

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function mappingRows() {
  return Object.entries(PLFS_CODE_MAPPINGS).flatMap(
    ([dimension, mapping]) =>
      Object.entries(mapping).map(([sourceCode, normalizedValue]) => [
        dimension,
        sourceCode,
        normalizedValue,
      ]),
  );
}

function stateRows() {
  return Object.entries(PLFS_STATE_NAMES).map(([sourceCode, stateName]) => [
    sourceCode,
    stateName,
    DIRECT_UI_STATES.has(stateName) ? stateName : "Other States / UTs",
  ]);
}

function valuesSql(rows) {
  return rows
    .map((row) => `(${row.map((value) => sqlString(value)).join(", ")})`)
    .join(",\n");
}

async function assertAbsent(targetPath, label) {
  try {
    await stat(targetPath);
    throw new Error(
      `${label} already exists at ${targetPath}. Move it aside before staging again.`,
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

function jsonSafe(value) {
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, jsonSafe(nested)]),
    );
  }
  return value;
}

function numericFields(row, fields) {
  return {
    ...row,
    ...Object.fromEntries(fields.map((field) => [field, Number(row[field])])),
  };
}

async function rows(connection, sql, parameters) {
  const reader = await connection.runAndReadAll(sql, parameters);
  return jsonSafe(reader.getRowObjectsJson());
}

function check(status, name, observed, expected, notes) {
  return { status, name, observed, expected, notes };
}

await assertAbsent(databasePath, "Staging database");
await assertAbsent(reportPath, "Validation report");

const admission = await inspectPlfsSource(sourcePath);
await mkdir(path.dirname(databasePath), { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });

const temporaryDatabasePath = `${databasePath}.tmp-${process.pid}`;
const temporaryReportPath = `${reportPath}.tmp-${process.pid}`;
const instance = await DuckDBInstance.create(temporaryDatabasePath);
const connection = await instance.connect();
let completed = false;

try {
  await connection.run(`
    CREATE TABLE source_manifest (
      contract_version INTEGER NOT NULL,
      data_mode VARCHAR NOT NULL,
      source_name VARCHAR NOT NULL,
      source_year INTEGER NOT NULL,
      source_sha256 VARCHAR NOT NULL,
      header_sha256 VARCHAR NOT NULL,
      source_bytes BIGINT NOT NULL,
      row_count BIGINT NOT NULL,
      eligible_row_count BIGINT,
      weight_variable VARCHAR NOT NULL,
      weight_divisor INTEGER NOT NULL,
      access_status VARCHAR NOT NULL,
      usage_scope_status VARCHAR NOT NULL,
      uncertainty_status VARCHAR NOT NULL,
      validation_status VARCHAR NOT NULL,
      authoritative BOOLEAN NOT NULL,
      activation_eligible BOOLEAN NOT NULL,
      created_at TIMESTAMP NOT NULL,
      notes VARCHAR NOT NULL
    )
  `);
  await connection.run(`
    CREATE TABLE code_mapping (
      dimension VARCHAR NOT NULL,
      source_code VARCHAR NOT NULL,
      normalized_value VARCHAR NOT NULL,
      PRIMARY KEY (dimension, source_code)
    )
  `);
  await connection.run(`
    INSERT INTO code_mapping VALUES
    ${valuesSql(mappingRows())}
  `);
  await connection.run(`
    CREATE TABLE state_mapping (
      source_code VARCHAR PRIMARY KEY,
      state_name VARCHAR NOT NULL,
      product_state VARCHAR NOT NULL
    )
  `);
  await connection.run(`
    INSERT INTO state_mapping VALUES
    ${valuesSql(stateRows())}
  `);

  await connection.run(`
    CREATE TEMP VIEW plfs_selected AS
    SELECT
      nullif(trim(file_id), '') AS file_id,
      nullif(trim(qtr), '') AS quarter,
      nullif(trim(month), '') AS month,
      nullif(trim(visit), '') AS visit,
      nullif(trim(sec), '') AS area_code,
      lpad(nullif(trim(st), ''), 2, '0') AS state_code,
      nullif(trim(bstrm), '') AS basic_stratum,
      nullif(trim(strm), '') AS stratum,
      nullif(trim(grp), '') AS sample_group,
      nullif(trim(sstrm), '') AS substratum,
      nullif(trim(mfsu), '') AS primary_sampling_unit,
      nullif(trim(sss), '') AS second_stage_stratum,
      nullif(trim(ssu), '') AS sample_household,
      nullif(trim(sex), '') AS gender_code,
      try_cast(nullif(trim(age), '') AS INTEGER) AS age,
      nullif(trim(marst), '') AS marital_code,
      lpad(nullif(trim(gedu_lvl), ''), 2, '0') AS education_code,
      try_cast(nullif(trim(ern_reg), '') AS DOUBLE) AS regular_earnings,
      try_cast(nullif(trim(ern_self), '') AS DOUBLE) AS self_employed_earnings,
      try_cast(nullif(trim(nsc), '') AS INTEGER) AS surveyed_fsu_count,
      try_cast(nullif(trim(mult), '') AS DOUBLE) / 100.0 AS survey_weight,
      try_cast(nullif(trim(zst), '') AS DOUBLE) AS basic_stratum_size,
      try_cast(nullif(trim(caph), '') AS INTEGER) AS listed_households,
      try_cast(nullif(trim(smallh), '') AS INTEGER) AS surveyed_households
    FROM read_csv(
      ${sqlString(sourcePath)},
      header = true,
      all_varchar = true,
      strict_mode = true
    )
  `);

  await connection.run(`
    CREATE TEMP VIEW plfs_normalized AS
    SELECT
      raw.*,
      gender.normalized_value AS gender,
      area.normalized_value AS area,
      marital.normalized_value AS marital_status,
      education.normalized_value AS education,
      states.state_name,
      states.product_state,
      cast(
        round(
          12.0 * (
            coalesce(raw.regular_earnings, 0) +
            coalesce(raw.self_employed_earnings, 0)
          )
        ) AS BIGINT
      ) AS annual_earned_income_proxy,
      raw.regular_earnings IS NULL AND raw.self_employed_earnings IS NULL
        AS earnings_both_missing,
      raw.regular_earnings > 0 AND raw.self_employed_earnings > 0
        AS earnings_both_positive
    FROM plfs_selected raw
    LEFT JOIN code_mapping gender
      ON gender.dimension = 'gender'
      AND gender.source_code = raw.gender_code
    LEFT JOIN code_mapping area
      ON area.dimension = 'area'
      AND area.source_code = raw.area_code
    LEFT JOIN code_mapping marital
      ON marital.dimension = 'maritalStatus'
      AND marital.source_code = raw.marital_code
    LEFT JOIN code_mapping education
      ON education.dimension = 'education'
      AND education.source_code = raw.education_code
    LEFT JOIN state_mapping states
      ON states.source_code = raw.state_code
  `);

  await connection.run(`
    CREATE TEMP VIEW plfs_eligible AS
    SELECT *
    FROM plfs_normalized
    WHERE gender IS NOT NULL
      AND age BETWEEN 18 AND 60
      AND area IS NOT NULL
      AND marital_status IS NOT NULL
      AND education IS NOT NULL
      AND state_name IS NOT NULL
      AND survey_weight > 0
      AND annual_earned_income_proxy >= 0
  `);

  await connection.run(`
    CREATE TABLE category_frequencies AS
    SELECT 'gender' AS dimension, coalesce(gender_code, '<missing>') AS source_code,
      count(*)::BIGINT AS unweighted_count,
      sum(coalesce(survey_weight, 0))::DOUBLE AS weighted_count
    FROM plfs_normalized GROUP BY gender_code
    UNION ALL
    SELECT 'area', coalesce(area_code, '<missing>'), count(*)::BIGINT,
      sum(coalesce(survey_weight, 0))::DOUBLE
    FROM plfs_normalized GROUP BY area_code
    UNION ALL
    SELECT 'marital_status', coalesce(marital_code, '<missing>'), count(*)::BIGINT,
      sum(coalesce(survey_weight, 0))::DOUBLE
    FROM plfs_normalized GROUP BY marital_code
    UNION ALL
    SELECT 'education', coalesce(education_code, '<missing>'), count(*)::BIGINT,
      sum(coalesce(survey_weight, 0))::DOUBLE
    FROM plfs_normalized GROUP BY education_code
    UNION ALL
    SELECT 'state', coalesce(state_code, '<missing>'), count(*)::BIGINT,
      sum(coalesce(survey_weight, 0))::DOUBLE
    FROM plfs_normalized GROUP BY state_code
  `);

  await connection.run(`
    CREATE TABLE field_diagnostics AS
    SELECT 'age' AS field,
      count(*) FILTER (WHERE age IS NULL)::BIGINT AS missing_or_invalid_count
    FROM plfs_normalized
    UNION ALL
    SELECT 'survey_weight',
      count(*) FILTER (WHERE survey_weight IS NULL OR survey_weight <= 0)::BIGINT
    FROM plfs_normalized
    UNION ALL
    SELECT 'regular_earnings',
      count(*) FILTER (WHERE regular_earnings IS NULL)::BIGINT
    FROM plfs_normalized
    UNION ALL
    SELECT 'self_employed_earnings',
      count(*) FILTER (WHERE self_employed_earnings IS NULL)::BIGINT
    FROM plfs_normalized
    UNION ALL
    SELECT 'both_earnings_missing',
      count(*) FILTER (WHERE earnings_both_missing)::BIGINT
    FROM plfs_normalized
    UNION ALL
    SELECT 'both_earnings_positive',
      count(*) FILTER (WHERE earnings_both_positive)::BIGINT
    FROM plfs_normalized
    UNION ALL
    SELECT 'unsupported_gender',
      count(*) FILTER (WHERE gender_code IS NOT NULL AND gender IS NULL)::BIGINT
    FROM plfs_normalized
    UNION ALL
    SELECT 'unsupported_education',
      count(*) FILTER (WHERE education_code IS NOT NULL AND education IS NULL)::BIGINT
    FROM plfs_normalized
    UNION ALL
    SELECT 'unknown_state',
      count(*) FILTER (WHERE state_code IS NOT NULL AND state_name IS NULL)::BIGINT
    FROM plfs_normalized
  `);

  await connection.run(`
    CREATE TABLE population_totals AS
    SELECT 'all_person_records' AS population,
      count(*)::BIGINT AS unweighted_count,
      sum(survey_weight)::DOUBLE AS weighted_count
    FROM plfs_normalized
    UNION ALL
    SELECT 'supported_adults_18_60',
      count(*)::BIGINT,
      sum(survey_weight)::DOUBLE
    FROM plfs_eligible
    UNION ALL
    SELECT 'supported_men_18_60',
      count(*)::BIGINT,
      sum(survey_weight)::DOUBLE
    FROM plfs_eligible WHERE gender = 'men'
    UNION ALL
    SELECT 'supported_women_18_60',
      count(*)::BIGINT,
      sum(survey_weight)::DOUBLE
    FROM plfs_eligible WHERE gender = 'women'
  `);

  await connection.run(`
    CREATE TABLE income_tail_diagnostics AS
    WITH thresholds(threshold_rupees) AS (
      SELECT threshold_rupees::BIGINT
      FROM range(0, 8600000, 100000) AS values_table(threshold_rupees)
      UNION
      SELECT 250000::BIGINT
      UNION
      SELECT 750000::BIGINT
    )
    SELECT
      threshold_rupees,
      count(*) FILTER (
        WHERE annual_earned_income_proxy >= threshold_rupees
      )::BIGINT AS unweighted_count,
      sum(survey_weight) FILTER (
        WHERE annual_earned_income_proxy >= threshold_rupees
      )::DOUBLE AS weighted_count
    FROM thresholds
    CROSS JOIN plfs_eligible
    GROUP BY threshold_rupees
    ORDER BY threshold_rupees
  `);

  await connection.run(`
    CREATE TABLE plfs_joint_cells AS
    SELECT
      gender,
      age::UTINYINT AS age,
      state_code,
      state_name,
      product_state,
      area,
      marital_status,
      education,
      annual_earned_income_proxy,
      count(*)::INTEGER AS observation_count,
      count(*) FILTER (WHERE earnings_both_missing)::INTEGER
        AS earnings_both_missing_count,
      sum(survey_weight)::DOUBLE AS weighted_population,
      NULL::DOUBLE AS weight_low,
      NULL::DOUBLE AS weight_high,
      'available_via_variance_cube'::VARCHAR AS uncertainty_status
    FROM plfs_eligible
    GROUP BY ALL
  `);
  await connection.run(`
    CREATE INDEX plfs_joint_filters ON plfs_joint_cells
      (gender, age, product_state, area, marital_status, education,
       annual_earned_income_proxy)
  `);
  await connection.run(`
    CREATE TABLE plfs_variance_cells AS
    WITH bucketed AS (
      SELECT
        dense_rank() OVER (
          ORDER BY
            area_code, state_code, stratum, sample_group, substratum,
            second_stage_stratum
        )::INTEGER AS design_cell_id,
        dense_rank() OVER (
          ORDER BY primary_sampling_unit
        )::INTEGER AS psu_id,
        surveyed_fsu_count,
        gender,
        age,
        product_state,
        area,
        marital_status,
        education,
        annual_earned_income_proxy::INTEGER AS income_floor,
        survey_weight
      FROM plfs_eligible
    )
    SELECT
      design_cell_id,
      psu_id,
      max(surveyed_fsu_count)::INTEGER AS surveyed_fsu_count,
      gender,
      age::UTINYINT AS age,
      product_state,
      area,
      marital_status,
      education,
      income_floor,
      count(*)::INTEGER AS observation_count,
      sum(survey_weight)::DOUBLE AS weighted_population,
      sum(surveyed_fsu_count * survey_weight)::DOUBLE
        AS expanded_psu_contribution
    FROM bucketed
    GROUP BY
      design_cell_id, psu_id, gender, age, product_state, area,
      marital_status, education, income_floor
  `);
  await connection.run(`
    CREATE INDEX plfs_variance_filters ON plfs_variance_cells
      (gender, age, product_state, area, marital_status, education, income_floor)
  `);
  await connection.run(`
    CREATE TABLE representative_query_fixtures AS
    WITH fixtures AS (
      SELECT
        'men_25_27_never_married_degree_12l' AS fixture_name,
        '{"gender":"men","ageMin":25,"ageMax":27,"maritalStatus":"never_married","education":["graduate","postgraduate"],"minIncome":1200000}' AS filters_json,
        coalesce(sum(observation_count), 0)::BIGINT AS observation_count,
        coalesce(sum(weighted_population), 0)::DOUBLE AS weighted_population
      FROM plfs_joint_cells
      WHERE gender = 'men'
        AND age BETWEEN 25 AND 27
        AND marital_status = 'never_married'
        AND education IN ('graduate', 'postgraduate')
        AND annual_earned_income_proxy >= 1200000
      UNION ALL
      SELECT
        'all_supported_adults_50l',
        '{"minIncome":5000000}',
        coalesce(sum(observation_count), 0)::BIGINT,
        coalesce(sum(weighted_population), 0)::DOUBLE
      FROM plfs_joint_cells
      WHERE annual_earned_income_proxy >= 5000000
      UNION ALL
      SELECT
        'zero_support_exact_cell',
        '{"gender":"men","ageMin":25,"ageMax":27,"state":"Delhi","area":"all","maritalStatus":"never_married","education":"graduate","minIncome":1200000}',
        coalesce(sum(observation_count), 0)::BIGINT,
        coalesce(sum(weighted_population), 0)::DOUBLE
      FROM plfs_joint_cells
      WHERE gender = 'men'
        AND age BETWEEN 25 AND 27
        AND product_state = 'Delhi'
        AND marital_status = 'never_married'
        AND education = 'graduate'
        AND annual_earned_income_proxy >= 1200000
    )
    SELECT
      *,
      CASE
        WHEN observation_count = 0 THEN 'requires_validated_backoff'
        WHEN observation_count < 30 THEN 'sparse_direct'
        ELSE 'direct'
      END AS point_basis,
      'available_via_variance_cube'::VARCHAR AS interval_status
    FROM fixtures
  `);

  const [rawTotalResult] = await rows(
    connection,
    `SELECT
      count(*)::BIGINT AS row_count,
      count(*) FILTER (WHERE survey_weight IS NULL OR survey_weight <= 0)::BIGINT
        AS invalid_weight_count,
      count(*) FILTER (WHERE earnings_both_positive)::BIGINT
        AS both_earnings_positive_count,
      count(*) FILTER (WHERE state_code IS NOT NULL AND state_name IS NULL)::BIGINT
        AS unknown_state_count,
      sum(survey_weight)::DOUBLE AS weighted_population
    FROM plfs_normalized`,
  );
  const rawTotal = numericFields(rawTotalResult, [
    "row_count",
    "invalid_weight_count",
    "both_earnings_positive_count",
    "unknown_state_count",
    "weighted_population",
  ]);
  const [eligibleTotalResult] = await rows(
    connection,
    `SELECT
      count(*)::BIGINT AS row_count,
      sum(survey_weight)::DOUBLE AS weighted_population
    FROM plfs_eligible`,
  );
  const eligibleTotal = numericFields(eligibleTotalResult, [
    "row_count",
    "weighted_population",
  ]);
  const [tailAtTwelveLakhResult] = await rows(
    connection,
    `SELECT unweighted_count, weighted_count
     FROM income_tail_diagnostics
     WHERE threshold_rupees = 1200000`,
  );
  const tailAtTwelveLakh = numericFields(tailAtTwelveLakhResult, [
    "unweighted_count",
    "weighted_count",
  ]);
  const [tailAtFiftyLakhResult] = await rows(
    connection,
    `SELECT unweighted_count, weighted_count
     FROM income_tail_diagnostics
     WHERE threshold_rupees = 5000000`,
  );
  const tailAtFiftyLakh = numericFields(tailAtFiftyLakhResult, [
    "unweighted_count",
    "weighted_count",
  ]);
  const [jointSummaryResult] = await rows(
    connection,
    `SELECT
      count(*)::BIGINT AS cell_count,
      sum(observation_count)::BIGINT AS represented_rows,
      sum(weighted_population)::DOUBLE AS represented_population
    FROM plfs_joint_cells`,
  );

  const jointSummary = numericFields(jointSummaryResult, [
    "cell_count",
    "represented_rows",
    "represented_population",
  ]);
  const representativeFixtureRows = await rows(
    connection,
    `SELECT *
     FROM representative_query_fixtures
     ORDER BY fixture_name`,
  );
  const representativeFixtures = representativeFixtureRows.map((fixture) =>
    numericFields(fixture, ["observation_count", "weighted_population"]),
  );
  const fixtureByName = new Map(
    representativeFixtures.map((fixture) => [
      fixture.fixture_name,
      numericFields(fixture, ["observation_count", "weighted_population"]),
    ]),
  );
  const representativeFixtureStatus =
    fixtureByName.get("men_25_27_never_married_degree_12l")
      ?.observation_count === 29 &&
    Math.round(
      fixtureByName.get("men_25_27_never_married_degree_12l")
        ?.weighted_population ?? 0,
    ) === 37_575 &&
    fixtureByName.get("all_supported_adults_50l")?.observation_count === 12 &&
    Math.round(
      fixtureByName.get("all_supported_adults_50l")?.weighted_population ?? 0,
    ) === 12_933 &&
    fixtureByName.get("zero_support_exact_cell")?.observation_count === 0;
  const [officialLfprResult] = await rows(
    connection,
    `WITH ratio_base AS (
      SELECT
        nullif(trim(sec), '') AS area_code,
        lpad(nullif(trim(st), ''), 2, '0') AS state_code,
        nullif(trim(strm), '') AS stratum,
        nullif(trim(grp), '') AS sample_group,
        nullif(trim(sstrm), '') AS substratum,
        nullif(trim(sss), '') AS second_stage_stratum,
        nullif(trim(mfsu), '') AS primary_sampling_unit,
        try_cast(nullif(trim(nsc), '') AS INTEGER) AS surveyed_fsu_count,
        try_cast(nullif(trim(mult), '') AS DOUBLE) / 100.0 AS survey_weight,
        CASE
          WHEN try_cast(nullif(trim(pas), '') AS INTEGER) BETWEEN 11 AND 51
            OR try_cast(nullif(trim(pas), '') AS INTEGER) = 81
            OR try_cast(nullif(trim(sas), '') AS INTEGER) BETWEEN 11 AND 51
          THEN 1.0
          ELSE 0.0
        END AS labour_force
      FROM read_csv(
        ${sqlString(sourcePath)},
        header = true,
        all_varchar = true,
        strict_mode = true
      )
      WHERE trim(sec) = '1'
    ),
    overall AS (
      SELECT
        sum(labour_force * survey_weight) AS y_total,
        sum(survey_weight) AS x_total,
        sum(labour_force * survey_weight) / sum(survey_weight) AS ratio
      FROM ratio_base
    ),
    design_cells AS (
      SELECT
        area_code, state_code, stratum, sample_group, substratum,
        second_stage_stratum,
        max(surveyed_fsu_count) AS surveyed_fsu_count,
        count(DISTINCT primary_sampling_unit) AS observed_psus,
        sum(labour_force * survey_weight) AS y_total,
        sum(survey_weight) AS x_total
      FROM ratio_base
      GROUP BY
        area_code, state_code, stratum, sample_group, substratum,
        second_stage_stratum
    ),
    psu_contributions AS (
      SELECT
        area_code, state_code, stratum, sample_group, substratum,
        second_stage_stratum, primary_sampling_unit,
        sum(labour_force * surveyed_fsu_count * survey_weight) AS y_expanded,
        sum(surveyed_fsu_count * survey_weight) AS x_expanded
      FROM ratio_base
      GROUP BY
        area_code, state_code, stratum, sample_group, substratum,
        second_stage_stratum, primary_sampling_unit
    ),
    design_variance AS (
      SELECT
        psu.area_code, psu.state_code, psu.stratum, psu.sample_group,
        psu.substratum, psu.second_stage_stratum,
        any_value(cells.surveyed_fsu_count) AS surveyed_fsu_count,
        any_value(cells.observed_psus) AS observed_psus,
        any_value(cells.y_total - overall.ratio * cells.x_total) AS residual,
        sum(
          pow(
            (psu.y_expanded - overall.ratio * psu.x_expanded) -
              (cells.y_total - overall.ratio * cells.x_total),
            2
          )
        ) AS observed_squared_error
      FROM psu_contributions psu
      JOIN design_cells cells USING (
        area_code, state_code, stratum, sample_group, substratum,
        second_stage_stratum
      )
      CROSS JOIN overall
      GROUP BY
        psu.area_code, psu.state_code, psu.stratum, psu.sample_group,
        psu.substratum, psu.second_stage_stratum
    ),
    variance AS (
      SELECT sum(
        (
          observed_squared_error +
          greatest(0, surveyed_fsu_count - observed_psus) * pow(residual, 2)
        ) / nullif(surveyed_fsu_count * (surveyed_fsu_count - 1), 0)
      ) AS value
      FROM design_variance
    )
    SELECT
      overall.ratio * 100 AS estimate_percent,
      100 * sqrt(variance.value / pow(overall.x_total, 2)) / overall.ratio
        AS rse_percent
    FROM overall CROSS JOIN variance`,
  );
  const officialLfpr = numericFields(officialLfprResult, [
    "estimate_percent",
    "rse_percent",
  ]);
  const officialLfprReproduced =
    Math.round(officialLfpr.estimate_percent * 10) / 10 === 46.6 &&
    Math.round(officialLfpr.rse_percent * 100) / 100 === 0.26;

  const varianceFixtureDefinitions = [
    {
      fixtureName: "default_supported_filter",
      filters: {
        gender: "men",
        ageMin: 25,
        ageMax: 27,
        minIncome: 1_200_000,
        maritalStatus: "never_married",
        education: "graduate",
        state: "all",
        area: "all",
      },
    },
    {
      fixtureName: "high_income_sparse_filter",
      filters: {
        gender: "men",
        ageMin: 25,
        ageMax: 27,
        minIncome: 5_000_000,
        maritalStatus: "any",
        education: "any",
        state: "all",
        area: "all",
      },
    },
    {
      fixtureName: "zero_support_filter",
      filters: {
        gender: "men",
        ageMin: 25,
        ageMax: 27,
        minIncome: 1_200_000,
        maritalStatus: "never_married",
        education: "graduate",
        state: "Delhi",
        area: "all",
      },
    },
  ];
  const varianceFixtures = [];
  for (const definition of varianceFixtureDefinitions) {
    varianceFixtures.push({
      fixtureName: definition.fixtureName,
      filters: definition.filters,
      ...(await estimatePlfsBestEffort(connection, definition.filters)),
    });
  }

  await connection.run(`
    CREATE TABLE variance_validation_fixtures (
      fixture_name VARCHAR PRIMARY KEY,
      fixture_type VARCHAR NOT NULL,
      filters_json VARCHAR,
      observation_count BIGINT,
      estimate DOUBLE NOT NULL,
      variance DOUBLE NOT NULL,
      standard_error DOUBLE NOT NULL,
      relative_standard_error DOUBLE,
      low_95 DOUBLE NOT NULL,
      high_95 DOUBLE NOT NULL,
      point_basis VARCHAR NOT NULL,
      interval_method VARCHAR NOT NULL,
      model_version VARCHAR,
      backoff_json VARCHAR,
      range_precision_score INTEGER
    )
  `);
  await connection.run(
    `INSERT INTO variance_validation_fixtures VALUES (
      'official_rural_all_ages_lfpr',
      'official_reproduction',
      NULL,
      NULL,
      $estimate,
      0,
      0,
      $rse,
      $estimate,
      $estimate,
      'official_fixture',
      'PLFS 2025 published analytic ratio MSE',
      NULL,
      NULL,
      NULL
    )`,
    {
      estimate: officialLfpr.estimate_percent,
      rse: officialLfpr.rse_percent,
    },
  );
  for (const fixture of varianceFixtures) {
    await connection.run(
      `INSERT INTO variance_validation_fixtures VALUES (
        $fixtureName,
        'product_domain',
        $filtersJson,
        $observationCount,
        $estimate,
        $variance,
        $standardError,
        $relativeStandardError,
        $low95,
        $high95,
        $pointBasis,
        $intervalMethod,
        $modelVersion,
        $backoffJson,
        $rangePrecisionScore
      )`,
      {
        fixtureName: fixture.fixtureName,
        filtersJson: JSON.stringify(fixture.filters),
        observationCount: fixture.observationCount,
        estimate: fixture.estimate,
        variance: fixture.variance,
        standardError: fixture.standardError,
        relativeStandardError: fixture.relativeStandardError,
        low95: fixture.low95,
        high95: fixture.high95,
        pointBasis: fixture.pointBasis,
        intervalMethod: fixture.intervalMethod,
        modelVersion: fixture.modelVersion,
        backoffJson: fixture.backoff
          ? JSON.stringify(fixture.backoff)
          : null,
        rangePrecisionScore: fixture.rangePrecisionScore,
      },
    );
  }
  const validations = [
    check(
      "passed",
      "source_checksum",
      admission.sha256,
      PLFS_2025_CONTRACT.sha256,
      "Verified before DuckDB staging.",
    ),
    check(
      "passed",
      "source_header",
      admission.headerSha256,
      PLFS_2025_CONTRACT.headerSha256,
      `${admission.columnCount} columns; required fields present.`,
    ),
    check(
      rawTotal.row_count === PLFS_2025_CONTRACT.rowCount ? "passed" : "failed",
      "source_row_count",
      rawTotal.row_count,
      PLFS_2025_CONTRACT.rowCount,
      "Person records before product exclusions.",
    ),
    check(
      rawTotal.invalid_weight_count === 0 ? "passed" : "failed",
      "weight_parse_and_scaling",
      rawTotal.invalid_weight_count,
      0,
      "Invalid/non-positive final weights after mult / 100.",
    ),
    check(
      rawTotal.both_earnings_positive_count === 0 ? "passed" : "failed",
      "earnings_mutual_exclusivity",
      rawTotal.both_earnings_positive_count,
      0,
      "Records with both ern_reg and ern_self positive.",
    ),
    check(
      rawTotal.unknown_state_count === 0 ? "passed" : "failed",
      "state_mapping",
      rawTotal.unknown_state_count,
      0,
      "Published state codes not found in the official mapping.",
    ),
    check(
      representativeFixtureStatus ? "passed" : "failed",
      "representative_point_fixtures",
      representativeFixtureStatus ? "matched" : "drifted",
      "matched",
      "Checks a representative sparse cohort, the ₹50 lakh tail, and an exact zero-support cell.",
    ),
    check(
      officialLfprReproduced ? "passed" : "failed",
      "official_lfpr_and_rse_reproduction",
      `${officialLfpr.estimate_percent.toFixed(6)}% / ${officialLfpr.rse_percent.toFixed(6)}% RSE`,
      "46.6% / 0.26% RSE after published rounding",
      "All-India rural usual-status LFPR, all ages, PLFS Annual Report 2025.",
    ),
    check(
      rawTotal.weighted_population >= 1_000_000_000 &&
        rawTotal.weighted_population <= 1_400_000_000
        ? "passed"
        : "failed",
      "weighted_all_person_total_plausibility",
      Math.round(rawTotal.weighted_population),
      "1.00B–1.40B",
      "Broad staging guard, not an external population benchmark.",
    ),
    check(
      eligibleTotal.weighted_population >= 650_000_000 &&
        eligibleTotal.weighted_population <= 800_000_000
        ? "passed"
        : "failed",
      "supported_adult_total_plausibility",
      Math.round(eligibleTotal.weighted_population),
      "650M–800M",
      "Ages 18–60 with supported product mappings.",
    ),
    check(
      "pending",
      "usage_scope",
      PLFS_2025_CONTRACT.access.usageScopeStatus,
      "approved",
      PLFS_2025_CONTRACT.access.rider,
    ),
    check(
      "passed",
      "plfs_uncertainty",
      PLFS_2025_CONTRACT.design.uncertaintyStatus,
      PLFS_2025_CONTRACT.design.uncertaintyStatus,
      "The official formula reproduction, direct-domain sufficient-statistics cube, and versioned zero-support back-off pass.",
    ),
    check(
      varianceFixtures.some(
        (fixture) =>
          fixture.fixtureName === "zero_support_filter" &&
          fixture.mode === "hierarchical_backoff" &&
          fixture.estimate > 0 &&
          fixture.high95 > fixture.estimate,
      )
        ? "passed"
        : "failed",
      "sparse_backoff",
      "plfs-zero-v1",
      "plfs-zero-v1",
      "Zero-support cells use a disclosed geography/age/area hierarchy, population-rate scaling, and additional model widening.",
    ),
    check(
      "pending",
      "nfhs_height_model",
      "DHS approval pending",
      "passed",
      "PLFS-only staging cannot activate Survey-backed mode.",
    ),
  ];
  const failedDataChecks = validations.filter(
    (validation) => validation.status === "failed",
  );
  if (failedDataChecks.length > 0) {
    throw new Error(
      `PLFS staging validation failed: ${failedDataChecks
        .map((validation) => validation.name)
        .join(", ")}.`,
    );
  }

  await connection.run(`
    CREATE TABLE validation_checks (
      check_name VARCHAR PRIMARY KEY,
      status VARCHAR NOT NULL,
      observed VARCHAR NOT NULL,
      expected VARCHAR NOT NULL,
      notes VARCHAR NOT NULL
    )
  `);
  for (const validation of validations) {
    await connection.run(
      `INSERT INTO validation_checks VALUES ($name, $status, $observed, $expected, $notes)`,
      {
        name: validation.name,
        status: validation.status,
        observed: String(validation.observed),
        expected: String(validation.expected),
        notes: validation.notes,
      },
    );
  }

  await connection.run(
    `INSERT INTO source_manifest VALUES (
      $contractVersion,
      'official',
      $sourceName,
      $sourceYear,
      $sourceSha256,
      $headerSha256,
      $sourceBytes,
      $rowCount,
      $eligibleRowCount,
      $weightVariable,
      $weightDivisor,
      $accessStatus,
      $usageScopeStatus,
      $uncertaintyStatus,
      'pending',
      true,
      false,
      current_timestamp,
      $notes
    )`,
    {
      contractVersion: PLFS_2025_CONTRACT.contractVersion,
      sourceName: PLFS_2025_CONTRACT.sourceName,
      sourceYear: PLFS_2025_CONTRACT.sourceYear,
      sourceSha256: admission.sha256,
      headerSha256: admission.headerSha256,
      sourceBytes: admission.byteCount,
      rowCount: admission.rowCount,
      eligibleRowCount: eligibleTotal.row_count,
      weightVariable: PLFS_2025_CONTRACT.weight.variable,
      weightDivisor: PLFS_2025_CONTRACT.weight.divisor,
      accessStatus: PLFS_2025_CONTRACT.access.status,
      usageScopeStatus: PLFS_2025_CONTRACT.access.usageScopeStatus,
      uncertaintyStatus: PLFS_2025_CONTRACT.design.uncertaintyStatus,
      notes:
        "Authorized aggregate-only staging artifact. Not a serving database; official activation is blocked.",
    },
  );

  const persistedTables = await rows(
    connection,
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'main'
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );
  const forbiddenTables = persistedTables.filter(({ table_name: tableName }) =>
    /raw|person|selected|normalized|eligible/i.test(tableName),
  );
  if (forbiddenTables.length > 0) {
    throw new Error(
      `Raw-data isolation failed; forbidden persisted tables: ${forbiddenTables
        .map(({ table_name: tableName }) => tableName)
        .join(", ")}.`,
    );
  }

  const report = jsonSafe({
    reportVersion: 1,
    generatedAt: new Date().toISOString(),
    activationEligible: false,
    validationStatus: "pending",
    blockers: [
      "PLFS usage-scope decision is pending.",
      "NFHS-5 approval, import, and measured-height validation are pending.",
    ],
    source: {
      contractVersion: PLFS_2025_CONTRACT.contractVersion,
      name: PLFS_2025_CONTRACT.sourceName,
      year: PLFS_2025_CONTRACT.sourceYear,
      relativePath: PLFS_2025_CONTRACT.relativePath,
      sha256: admission.sha256,
      headerSha256: admission.headerSha256,
      bytes: admission.byteCount,
      rows: admission.rowCount,
      columns: admission.columnCount,
      accessStatus: PLFS_2025_CONTRACT.access.status,
      usageScopeStatus: PLFS_2025_CONTRACT.access.usageScopeStatus,
    },
    derivation: {
      weight: PLFS_2025_CONTRACT.weight,
      earnings: PLFS_2025_CONTRACT.earnings,
      design: PLFS_2025_CONTRACT.design,
    },
    validations,
    totals: {
      raw: rawTotal,
      eligible: eligibleTotal,
      joint: jointSummary,
    },
    incomeTail: {
      atOrAbove1200000: tailAtTwelveLakh,
      atOrAbove5000000: tailAtFiftyLakh,
    },
    categoryFrequencies: await rows(
      connection,
      `SELECT * FROM category_frequencies ORDER BY dimension, source_code`,
    ),
    fieldDiagnostics: await rows(
      connection,
      `SELECT * FROM field_diagnostics ORDER BY field`,
    ),
    populationTotals: await rows(
      connection,
      `SELECT * FROM population_totals ORDER BY population`,
    ),
    representativeFixtures,
    officialReproduction: {
      fixture: "All-India rural usual-status LFPR, all ages",
      published: {
        estimatePercent: 46.6,
        relativeStandardErrorPercent: 0.26,
      },
      reproduced: officialLfpr,
      passed: officialLfprReproduced,
    },
    varianceFixtures,
    persistedTables: persistedTables.map(({ table_name: tableName }) => tableName),
  });

  await writeFile(
    temporaryReportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  connection.closeSync();
  await rename(temporaryDatabasePath, databasePath);
  await rename(temporaryReportPath, reportPath);
  completed = true;

  console.log(
    JSON.stringify(
      {
        databasePath,
        reportPath,
        sourceRows: admission.rowCount,
        eligibleRows: eligibleTotal.row_count,
        jointCells: jointSummary.cell_count,
        representedPopulation: Math.round(jointSummary.represented_population),
        validationStatus: "pending",
        activationEligible: false,
        pendingGates: ["usage_scope", "nfhs_height_model"],
      },
      null,
      2,
    ),
  );
} finally {
  if (!completed) {
    connection.closeSync();
    console.error(
      `Staging did not complete. Diagnostic temporary artifacts, if created, remain at ${temporaryDatabasePath} and ${temporaryReportPath}.`,
    );
  }
}
