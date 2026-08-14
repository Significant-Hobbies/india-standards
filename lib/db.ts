import "server-only";

import { Client } from "pg";
import { assertPlfsPreviewCanServe } from "./accuracy";
import {
  buildPlfsPreviewEstimate,
  type PlfsPreviewAggregate,
} from "./estimate-core";
import { PgDuckDBConnection } from "./pg-duckdb-connection";
import type { EstimateFilters, EstimateResponse } from "./types";
import {
  estimatePlfsBestEffort,
  estimatePlfsDomainVariance,
} from "../scripts/plfs-variance.mjs";

const DEFAULT_MOTHERDUCK_HOST = "pg.us-east-1-aws.motherduck.com";
const DEFAULT_MOTHERDUCK_DATABASE = "india_standards";
const CONNECTION_TIMEOUT_MS = 10_000;
const QUERY_TIMEOUT_MS = 25_000;

function requiredMotherDuckToken() {
  const token = process.env.MOTHERDUCK_TOKEN;
  if (!token) {
    throw new Error("Hosted aggregate data is not configured.");
  }
  return token;
}

function createMotherDuckClient() {
  return new Client({
    host: process.env.MOTHERDUCK_HOST ?? DEFAULT_MOTHERDUCK_HOST,
    port: 5432,
    user: "postgres",
    password: requiredMotherDuckToken(),
    database: process.env.MOTHERDUCK_DATABASE ?? DEFAULT_MOTHERDUCK_DATABASE,
    ssl: {
      rejectUnauthorized: true,
    },
    application_name: "india-numbers-cloudflare",
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
    statement_timeout: QUERY_TIMEOUT_MS,
  });
}

function numberValue(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error("The hosted database returned a non-numeric aggregate.");
  }
  return number;
}

function optionalNumberValue(value: unknown) {
  return value === undefined ? undefined : numberValue(value);
}

function nullableNumberValue(value: unknown) {
  return value === null || value === undefined ? null : numberValue(value);
}

function normalizeDemographic(demographic: Record<string, unknown>) {
  return {
    ...demographic,
    observationCount: numberValue(demographic.observationCount),
    backoffObservationCount: optionalNumberValue(
      demographic.backoffObservationCount
    ),
    lowestMatchedIncome: nullableNumberValue(demographic.lowestMatchedIncome),
    highestMatchedIncome: nullableNumberValue(demographic.highestMatchedIncome),
    estimate: numberValue(demographic.estimate),
    low95: numberValue(demographic.low95),
    high95: numberValue(demographic.high95),
  } as PlfsPreviewAggregate;
}

export async function estimatePopulation(
  filters: EstimateFilters
): Promise<EstimateResponse> {
  const client = createMotherDuckClient();

  try {
    await client.connect();
    const connection = new PgDuckDBConnection(client);
    const metadataReader = await connection.runAndReadAll(`
      SELECT
        data_mode,
        validation_status,
        authoritative,
        access_status,
        usage_scope_status,
        uncertainty_status,
        activation_eligible
      FROM source_manifest
      LIMIT 1
    `);
    const [metadata] = metadataReader.getRowObjectsJson();
    if (!metadata) {
      throw new Error("The hosted database has no source-validation manifest.");
    }

    const checksReader = await connection.runAndReadAll(`
      SELECT check_name AS name, status
      FROM validation_checks
    `);
    const validationChecks = checksReader.getRowObjectsJson().map((check) => ({
      name: check.name,
      status: check.status,
    }));

    assertPlfsPreviewCanServe(
      {
        dataMode: metadata.data_mode,
        validationStatus: metadata.validation_status,
        authoritative: metadata.authoritative,
        accessStatus: metadata.access_status,
        usageScopeStatus: metadata.usage_scope_status,
        uncertaintyStatus: metadata.uncertainty_status,
        activationEligible: metadata.activation_eligible,
      },
      validationChecks
    );

    const selectedFilters = {
      gender: filters.gender,
      ageMin: filters.ageMin,
      ageMax: filters.ageMax,
      minIncome: filters.minIncome,
      maritalStatus: filters.maritalStatus,
      education: filters.education,
      state: filters.state,
      area: filters.area,
    };
    const demographic = await estimatePlfsBestEffort(
      connection,
      selectedFilters
    );
    const genderDenominator = await estimatePlfsDomainVariance(connection, {
      ...selectedFilters,
      ageMin: 18,
      ageMax: 60,
      minIncome: 0,
      maritalStatus: "any",
      education: "any",
      state: "all",
      area: "all",
    });
    const ageDenominator = await estimatePlfsDomainVariance(connection, {
      ...selectedFilters,
      minIncome: 0,
      maritalStatus: "any",
      education: "any",
      state: "all",
      area: "all",
    });

    return buildPlfsPreviewEstimate(
      filters,
      normalizeDemographic(demographic),
      numberValue(genderDenominator.estimate),
      numberValue(ageDenominator.estimate)
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}
