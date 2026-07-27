import { mkdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";

const projectRoot = process.cwd();
const dataDir = path.join(projectRoot, "data");
const databasePath = path.join(dataDir, "india-standards.duckdb");
const stagingPath = path.join(dataDir, "india-standards.staging.duckdb");

await mkdir(dataDir, { recursive: true });

try {
  await stat(stagingPath);
  throw new Error(
    `A staging database already exists at ${stagingPath}. Move it aside before reseeding.`,
  );
} catch (error) {
  if (error instanceof Error && !("code" in error && error.code === "ENOENT")) {
    throw error;
  }
}

const instance = await DuckDBInstance.create(stagingPath);
const connection = await instance.connect();

const statements = [
  `CREATE TABLE dataset_metadata (
    data_mode VARCHAR NOT NULL,
    demographic_label VARCHAR NOT NULL,
    demographic_year INTEGER NOT NULL,
    height_label VARCHAR NOT NULL,
    height_year VARCHAR NOT NULL,
    validation_status VARCHAR NOT NULL,
    authoritative BOOLEAN NOT NULL,
    generated_at TIMESTAMP NOT NULL,
    notes VARCHAR NOT NULL
  )`,
  `INSERT INTO dataset_metadata VALUES (
    'demo',
    'PLFS-shaped synthetic cube',
    2025,
    'NFHS-shaped synthetic model',
    '2019–2021',
    'synthetic_fixture',
    false,
    TIMESTAMP '2026-07-27 00:00:00',
    'Deterministic generated aggregates for product testing. Not official survey observations.'
  )`,
  `CREATE TABLE states (
    state VARCHAR PRIMARY KEY,
    population_share DOUBLE NOT NULL,
    urban_share DOUBLE NOT NULL,
    height_offset DOUBLE NOT NULL
  )`,
  `INSERT INTO states VALUES
    ('Delhi', 0.015, 0.975, 0.7),
    ('Gujarat', 0.052, 0.48, 0.4),
    ('Karnataka', 0.055, 0.44, 0.6),
    ('Kerala', 0.029, 0.48, 0.9),
    ('Maharashtra', 0.091, 0.49, 0.7),
    ('Rajasthan', 0.064, 0.25, 0.5),
    ('Tamil Nadu', 0.060, 0.54, 0.4),
    ('Telangana', 0.029, 0.46, 0.3),
    ('Uttar Pradesh', 0.170, 0.24, -0.5),
    ('West Bengal', 0.076, 0.33, -0.4),
    ('Other States / UTs', 0.359, 0.32, 0.0)`,
  `CREATE TABLE demographic_cube AS
  WITH
  genders(gender, gender_share, income_factor) AS (
    VALUES ('men', 0.515, 1.0), ('women', 0.485, 0.62)
  ),
  ages AS (
    SELECT
      age,
      (0.82 + 0.32 * exp(-pow((age - 28) / 12.0, 2))) AS raw_age_share
    FROM range(18, 61) t(age)
  ),
  normalized_ages AS (
    SELECT age, raw_age_share / sum(raw_age_share) OVER () AS age_share
    FROM ages
  ),
  areas(area) AS (VALUES ('urban'), ('rural')),
  marital(marital_status) AS (
    VALUES ('never_married'), ('married'), ('widowed_divorced')
  ),
  education(education) AS (
    VALUES ('below_secondary'), ('secondary'), ('graduate'), ('postgraduate')
  ),
  incomes(income_floor, income_ceiling, base_income_share) AS (
    VALUES
      (0, 100000, 0.150),
      (100000, 250000, 0.185),
      (250000, 500000, 0.265),
      (500000, 750000, 0.150),
      (750000, 1000000, 0.090),
      (1000000, 1200000, 0.045),
      (1200000, 1500000, 0.040),
      (1500000, 2000000, 0.032),
      (2000000, 3000000, 0.024),
      (3000000, 5000000, 0.013),
      (5000000, NULL, 0.006)
  ),
  base AS (
    SELECT
      g.gender,
      a.age,
      s.state,
      ar.area,
      m.marital_status,
      e.education,
      i.income_floor,
      i.income_ceiling,
      g.gender_share,
      a.age_share,
      s.population_share,
      CASE ar.area
        WHEN 'urban' THEN s.urban_share
        ELSE 1 - s.urban_share
      END AS area_share,
      CASE
        WHEN a.age <= 23 AND m.marital_status = 'never_married' THEN 0.88
        WHEN a.age <= 23 AND m.marital_status = 'married' THEN 0.115
        WHEN a.age <= 23 THEN 0.005
        WHEN a.age <= 29 AND m.marital_status = 'never_married' THEN
          CASE g.gender WHEN 'men' THEN 0.59 ELSE 0.38 END
        WHEN a.age <= 29 AND m.marital_status = 'married' THEN
          CASE g.gender WHEN 'men' THEN 0.40 ELSE 0.61 END
        WHEN a.age <= 29 THEN 0.01
        WHEN a.age <= 44 AND m.marital_status = 'never_married' THEN 0.095
        WHEN a.age <= 44 AND m.marital_status = 'married' THEN 0.875
        WHEN a.age <= 44 THEN 0.03
        WHEN m.marital_status = 'never_married' THEN 0.035
        WHEN m.marital_status = 'married' THEN 0.82
        ELSE 0.145
      END AS marital_share,
      CASE
        WHEN e.education = 'below_secondary' THEN
          CASE ar.area WHEN 'urban' THEN 0.25 ELSE 0.47 END
        WHEN e.education = 'secondary' THEN
          CASE ar.area WHEN 'urban' THEN 0.38 ELSE 0.36 END
        WHEN e.education = 'graduate' THEN
          CASE ar.area WHEN 'urban' THEN 0.27 ELSE 0.14 END
        ELSE CASE ar.area WHEN 'urban' THEN 0.10 ELSE 0.03 END
      END AS education_share,
      i.base_income_share *
        pow(
          CASE e.education
            WHEN 'postgraduate' THEN 1.85
            WHEN 'graduate' THEN 1.48
            WHEN 'secondary' THEN 0.92
            ELSE 0.56
          END,
          greatest(0, ln(1 + i.income_floor / 500000.0))
        ) *
        pow(
          CASE ar.area WHEN 'urban' THEN 1.20 ELSE 0.72 END,
          greatest(0, ln(1 + i.income_floor / 750000.0))
        ) *
        pow(
          g.income_factor,
          greatest(0, ln(1 + i.income_floor / 750000.0))
        ) AS raw_income_share
    FROM genders g
    CROSS JOIN normalized_ages a
    CROSS JOIN states s
    CROSS JOIN areas ar
    CROSS JOIN marital m
    CROSS JOIN education e
    CROSS JOIN incomes i
  ),
  normalized AS (
    SELECT
      *,
      raw_income_share /
        sum(raw_income_share) OVER (
          PARTITION BY gender, age, state, area, marital_status, education
        ) AS income_share
    FROM base
  ),
  weighted AS (
    SELECT
      gender,
      age,
      state,
      area,
      marital_status,
      education,
      income_floor,
      income_ceiling,
      650000000.0 * gender_share * age_share * population_share * area_share *
        marital_share * education_share * income_share AS weighted_population
    FROM normalized
  )
  SELECT
    *,
    greatest(
      0,
      round(weighted_population / 650000000.0 * 650000.0 *
        (0.90 + ((age + income_floor / 100000)::INTEGER % 13) / 100.0)
      )
    )::INTEGER AS observation_count,
    weighted_population * (
      1 - least(
        0.34,
        0.035 + 0.55 / sqrt(greatest(1, observation_count)) +
        CASE
          WHEN income_floor >= 5000000 THEN 0.16
          WHEN income_floor >= 2000000 THEN 0.10
          WHEN income_floor >= 1000000 THEN 0.055
          ELSE 0
        END
      )
    ) AS weight_low,
    weighted_population * (
      1 + least(
        0.40,
        0.04 + 0.65 / sqrt(greatest(1, observation_count)) +
        CASE
          WHEN income_floor >= 5000000 THEN 0.20
          WHEN income_floor >= 2000000 THEN 0.13
          WHEN income_floor >= 1000000 THEN 0.07
          ELSE 0
        END
      )
    ) AS weight_high
  FROM weighted`,
  `CREATE INDEX demographic_filters ON demographic_cube
    (gender, age, state, area, marital_status, education, income_floor)`,
  `CREATE TABLE height_model AS
  WITH
  genders(gender, base_height, sd_cm) AS (
    VALUES ('men', 168.2, 6.4), ('women', 155.7, 5.8)
  ),
  age_bands(age_band, age_min, age_max, age_offset) AS (
    VALUES
      ('18–24', 18, 24, 0.6),
      ('25–34', 25, 34, 0.3),
      ('35–44', 35, 44, 0.0),
      ('45–54', 45, 54, -0.6),
      ('55–60', 55, 60, -1.1)
  ),
  areas(area, area_offset) AS (
    VALUES ('urban', 0.6), ('rural', -0.2)
  )
  SELECT
    g.gender,
    b.age_band,
    b.age_min,
    b.age_max,
    s.state,
    a.area,
    g.base_height + b.age_offset + s.height_offset + a.area_offset AS mean_cm,
    g.sd_cm AS sd_cm,
    round(52000 * s.population_share * (b.age_max - b.age_min + 1) / 43.0 *
      CASE a.area WHEN 'urban' THEN s.urban_share ELSE 1 - s.urban_share END
    )::INTEGER AS observation_count
  FROM genders g
  CROSS JOIN age_bands b
  CROSS JOIN states s
  CROSS JOIN areas a`,
  `CREATE INDEX height_filters ON height_model
    (gender, age_min, age_max, state, area)`,
];

for (const statement of statements) {
  await connection.run(statement);
}

const summary = await connection.runAndReadAll(`
  SELECT
    count(*)::INTEGER AS cube_rows,
    round(sum(weighted_population))::BIGINT AS represented_population,
    sum(observation_count)::BIGINT AS synthetic_observations
  FROM demographic_cube
`);
const [row] = summary.getRowObjectsJson();

connection.closeSync();
await rename(stagingPath, databasePath);

console.log(
  JSON.stringify(
    {
      databasePath,
      ...row,
      dataMode: "demo",
      authoritative: false,
      validationStatus: "synthetic_fixture",
    },
    null,
    2,
  ),
);
