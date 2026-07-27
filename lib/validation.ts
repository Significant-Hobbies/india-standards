import {
  AREA_TYPES,
  PLFS_STATES,
  EDUCATION_LEVELS,
  GENDERS,
  INCOME_THRESHOLDS,
  MARITAL_STATUSES,
  type EstimateFilters,
} from "./types";

function isMember<T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function integerInRange(
  value: unknown,
  name: string,
  minimum: number,
  maximum: number,
) {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error(`${name} must be a whole number from ${minimum} to ${maximum}.`);
  }
  return Number(value);
}

export function parseEstimateFilters(value: unknown): EstimateFilters {
  if (!value || typeof value !== "object") {
    throw new Error("The estimate request needs a filter object.");
  }

  const input = value as Record<string, unknown>;
  if (!isMember(GENDERS, input.gender)) {
    throw new Error("Choose men or women.");
  }
  if (!isMember(MARITAL_STATUSES, input.maritalStatus)) {
    throw new Error("Choose a supported marital status.");
  }
  if (!isMember(EDUCATION_LEVELS, input.education)) {
    throw new Error("Choose a supported education level.");
  }
  if (!isMember(PLFS_STATES, input.state)) {
    throw new Error("Choose a supported PLFS State/UT group.");
  }
  if (!isMember(AREA_TYPES, input.area)) {
    throw new Error("Choose urban, rural, or both areas.");
  }
  if (
    !Number.isInteger(input.minIncome) ||
    !INCOME_THRESHOLDS.includes(Number(input.minIncome))
  ) {
    throw new Error("Choose one of the supported annual income thresholds.");
  }

  const ageMin = integerInRange(input.ageMin, "Minimum age", 18, 60);
  const ageMax = integerInRange(input.ageMax, "Maximum age", 18, 60);
  const heightMin = integerInRange(input.heightMin, "Minimum height", 140, 200);
  const heightMax = integerInRange(input.heightMax, "Maximum height", 140, 200);

  if (ageMin > ageMax) {
    throw new Error("Minimum age cannot be higher than maximum age.");
  }
  if (heightMin > heightMax) {
    throw new Error("Minimum height cannot be higher than maximum height.");
  }

  return {
    gender: input.gender,
    ageMin,
    ageMax,
    minIncome: Number(input.minIncome),
    maritalStatus: input.maritalStatus,
    education: input.education,
    state: input.state,
    area: input.area,
    heightMin,
    heightMax,
  };
}
