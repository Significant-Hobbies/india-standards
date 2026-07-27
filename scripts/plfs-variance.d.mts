import type { EstimateFilters } from "../lib/types.ts";

export type AggregateQueryConnection = {
  runAndReadAll(
    sql: string,
    parameters?: Record<string, unknown>,
  ): Promise<{
    getRowObjectsJson(): Record<string, unknown>[];
  }>;
};

export type PlfsVarianceFilters = Pick<
  EstimateFilters,
  | "gender"
  | "ageMin"
  | "ageMax"
  | "minIncome"
  | "maritalStatus"
  | "education"
  | "state"
  | "area"
>;

export type PlfsEstimateResult = {
  observationCount: number;
  backoffObservationCount?: number;
  lowestMatchedIncome: number | null;
  highestMatchedIncome: number | null;
  estimate: number;
  variance: number;
  standardError: number;
  relativeStandardError: number | null;
  low95: number;
  high95: number;
  pointBasis: string;
  intervalMethod: string;
  mode:
    | "direct"
    | "hierarchical_backoff"
    | "insufficient_target_population"
    | "insufficient_backoff_support";
  modelVersion: string | null;
  backoff: object | null;
  rangePrecisionScore: number;
};

export function validatePlfsVarianceFilters(
  filters: PlfsVarianceFilters,
): PlfsVarianceFilters;

export function estimatePlfsDomainVariance(
  connection: AggregateQueryConnection,
  filters: PlfsVarianceFilters,
): Promise<Omit<PlfsEstimateResult, "mode" | "modelVersion" | "backoff" | "rangePrecisionScore">>;

export function estimatePlfsBestEffort(
  connection: AggregateQueryConnection,
  filters: PlfsVarianceFilters,
): Promise<PlfsEstimateResult>;
