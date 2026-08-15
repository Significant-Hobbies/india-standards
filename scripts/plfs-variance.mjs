const MAX_INCOME_THRESHOLD = 8_500_000;

function isSupportedIncomeThreshold(value) {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_INCOME_THRESHOLD &&
    (value % 100_000 === 0 || value === 250_000 || value === 750_000)
  );
}
const SUPPORTED_PRODUCT_STATES = new Set([
  "all",
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
]);

function optionalChoice(value, allowed, name) {
  if (!allowed.has(value)) {
    throw new Error(`Unsupported PLFS variance ${name}: ${value}.`);
  }
  return value;
}

export function validatePlfsVarianceFilters(filters) {
  if (
    !Number.isInteger(filters.ageMin) ||
    !Number.isInteger(filters.ageMax) ||
    filters.ageMin < 18 ||
    filters.ageMax > 60 ||
    filters.ageMin > filters.ageMax
  ) {
    throw new Error("PLFS variance ages must be whole years from 18 to 60.");
  }
  if (!isSupportedIncomeThreshold(filters.minIncome)) {
    throw new Error("Unsupported PLFS variance income threshold.");
  }

  return {
    gender: optionalChoice(filters.gender, new Set(["men", "women"]), "gender"),
    ageMin: filters.ageMin,
    ageMax: filters.ageMax,
    minIncome: filters.minIncome,
    maritalStatus: optionalChoice(
      filters.maritalStatus,
      new Set(["any", "never_married", "married", "widowed_divorced"]),
      "marital status"
    ),
    education: optionalChoice(
      filters.education,
      new Set([
        "any",
        "below_secondary",
        "secondary",
        "graduate",
        "postgraduate",
      ]),
      "education"
    ),
    state: optionalChoice(filters.state, SUPPORTED_PRODUCT_STATES, "State/UT"),
    area: optionalChoice(
      filters.area,
      new Set(["all", "rural", "urban"]),
      "area"
    ),
  };
}

const PLFS_DOMAIN_VARIANCE_SQL = `WITH selected AS (
      SELECT
        design_cell_id,
        psu_id,
        surveyed_fsu_count,
        sum(observation_count)::BIGINT AS observation_count,
        sum(weighted_population)::DOUBLE AS weighted_population,
        sum(expanded_psu_contribution)::DOUBLE AS expanded_psu_contribution,
        min(income_floor)::BIGINT AS lowest_matched_income,
        max(income_floor)::BIGINT AS highest_matched_income
      FROM plfs_variance_cells
      WHERE gender = $gender
        AND age BETWEEN $ageMin AND $ageMax
        AND income_floor >= $minIncome
        AND ($maritalStatus = 'any' OR marital_status = $maritalStatus)
        AND ($education = 'any' OR education = $education)
        AND ($state = 'all' OR product_state = $state)
        AND ($area = 'all' OR area = $area)
      GROUP BY design_cell_id, psu_id, surveyed_fsu_count
    ),
    design_totals AS (
      SELECT
        design_cell_id,
        max(surveyed_fsu_count)::INTEGER AS surveyed_fsu_count,
        count(*)::INTEGER AS observed_psus,
        sum(observation_count)::BIGINT AS observation_count,
        sum(weighted_population)::DOUBLE AS weighted_population,
        min(lowest_matched_income)::BIGINT AS lowest_matched_income,
        max(highest_matched_income)::BIGINT AS highest_matched_income
      FROM selected
      GROUP BY design_cell_id
    ),
    design_variance AS (
      SELECT
        selected.design_cell_id,
        any_value(design_totals.surveyed_fsu_count) AS surveyed_fsu_count,
        any_value(design_totals.observed_psus) AS observed_psus,
        any_value(design_totals.observation_count) AS observation_count,
        any_value(design_totals.weighted_population) AS weighted_population,
        any_value(design_totals.lowest_matched_income) AS lowest_matched_income,
        any_value(design_totals.highest_matched_income) AS highest_matched_income,
        (
          sum(
            pow(
              selected.expanded_psu_contribution -
                design_totals.weighted_population,
              2
            )
          ) +
          greatest(
            0,
            any_value(design_totals.surveyed_fsu_count) -
              any_value(design_totals.observed_psus)
          ) * pow(any_value(design_totals.weighted_population), 2)
        ) /
        nullif(
          any_value(design_totals.surveyed_fsu_count) *
            (any_value(design_totals.surveyed_fsu_count) - 1),
          0
        ) AS variance
      FROM selected
      JOIN design_totals USING (design_cell_id)
      GROUP BY selected.design_cell_id
    )
    SELECT
      coalesce(sum(observation_count), 0)::BIGINT AS observation_count,
      coalesce(sum(weighted_population), 0)::DOUBLE AS estimate,
      coalesce(sum(variance), 0)::DOUBLE AS variance,
      min(lowest_matched_income)::BIGINT AS lowest_matched_income,
      max(highest_matched_income)::BIGINT AS highest_matched_income
    FROM design_variance`;

function pointBasisFor(observationCount) {
  if (observationCount === 0) return "requires_validated_backoff";
  if (observationCount < 30) return "sparse_direct";
  return "direct";
}

function nullableNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

export async function estimatePlfsDomainVariance(connection, inputFilters) {
  const filters = validatePlfsVarianceFilters(inputFilters);
  const reader = await connection.runAndReadAll(
    PLFS_DOMAIN_VARIANCE_SQL,
    filters
  );
  const [result] = reader.getRowObjectsJson();
  const observationCount = Number(result?.observation_count ?? 0);
  const estimate = Number(result?.estimate ?? 0);
  const variance = Math.max(0, Number(result?.variance ?? 0));
  const standardError = Math.sqrt(variance);
  const lowestMatchedIncome = nullableNumber(result?.lowest_matched_income);
  const highestMatchedIncome = nullableNumber(result?.highest_matched_income);

  return {
    observationCount,
    estimate,
    variance,
    lowestMatchedIncome,
    highestMatchedIncome,
    standardError,
    relativeStandardError:
      estimate > 0 ? (standardError / estimate) * 100 : null,
    low95: Math.max(0, estimate - 1.96 * standardError),
    high95: estimate + 1.96 * standardError,
    pointBasis: pointBasisFor(observationCount),
    intervalMethod: "PLFS 2025 published analytic domain-total variance",
  };
}

function backoffCandidates(filters) {
  const candidates = [];
  const seen = new Set();
  const ageRanges = [
    [filters.ageMin, filters.ageMax, "same age"],
    [
      Math.max(18, filters.ageMin - 2),
      Math.min(60, filters.ageMax + 2),
      "age ±2",
    ],
    [
      Math.max(18, filters.ageMin - 5),
      Math.min(60, filters.ageMax + 5),
      "age ±5",
    ],
    [18, 60, "all supported ages"],
  ];
  const states = [
    [filters.state, "same geography"],
    ["all", "national geography"],
  ];
  const areas = [
    [filters.area, "same area"],
    ["all", "both areas"],
  ];

  for (const [area, areaLabel] of areas) {
    for (const [ageMin, ageMax, ageLabel] of ageRanges) {
      for (const [state, stateLabel] of states) {
        const candidate = {
          ...filters,
          ageMin,
          ageMax,
          state,
          area,
        };
        const key = JSON.stringify(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        if (
          ageMin === filters.ageMin &&
          ageMax === filters.ageMax &&
          state === filters.state &&
          area === filters.area
        ) {
          continue;
        }
        candidates.push({
          filters: candidate,
          label: `${stateLabel}, ${ageLabel}, ${areaLabel}`,
          depth:
            Number(state !== filters.state) +
            Number(ageMin !== filters.ageMin || ageMax !== filters.ageMax) +
            Number(area !== filters.area),
        });
      }
    }
  }

  return candidates;
}

function structuralBackoffCandidates(filters) {
  const broadBase = {
    ...filters,
    ageMin: 18,
    ageMax: 60,
    state: "all",
    area: "all",
  };
  const candidates = [];

  if (filters.maritalStatus !== "any") {
    candidates.push({
      filters: {
        ...broadBase,
        maritalStatus: "any",
      },
      label:
        "national geography, all supported ages, both areas, marital status relaxed",
      depth: 4,
    });
  }
  if (filters.education !== "any") {
    candidates.push({
      filters: {
        ...broadBase,
        education: "any",
      },
      label:
        "national geography, all supported ages, both areas, education relaxed",
      depth: 4,
    });
  }
  if (filters.maritalStatus !== "any" && filters.education !== "any") {
    candidates.push({
      filters: {
        ...broadBase,
        maritalStatus: "any",
        education: "any",
      },
      label:
        "national geography, all supported ages, both areas, marital status and education relaxed",
      depth: 5,
    });
  }

  return candidates;
}

function denominatorFilters(filters) {
  return {
    ...filters,
    minIncome: 0,
  };
}

export async function estimatePlfsBestEffort(connection, inputFilters) {
  const filters = validatePlfsVarianceFilters(inputFilters);
  const direct = await estimatePlfsDomainVariance(connection, filters);
  if (direct.observationCount > 0) {
    return {
      ...direct,
      mode: "direct",
      modelVersion: null,
      backoff: null,
      rangePrecisionScore: Math.round(
        100 /
          (1 +
            (direct.high95 - direct.low95) / (2 * Math.max(direct.estimate, 1)))
      ),
    };
  }

  const targetDenominator = await estimatePlfsDomainVariance(
    connection,
    denominatorFilters(filters)
  );
  if (targetDenominator.estimate <= 0) {
    return {
      ...direct,
      mode: "insufficient_target_population",
      modelVersion: "plfs-zero-v1",
      backoff: null,
      rangePrecisionScore: 0,
    };
  }

  let selected;
  const candidates = [
    ...backoffCandidates(filters),
    ...structuralBackoffCandidates(filters),
  ];
  for (const candidate of candidates) {
    const numerator = await estimatePlfsDomainVariance(
      connection,
      candidate.filters
    );
    if (numerator.observationCount === 0 || numerator.estimate <= 0) continue;
    const denominator = await estimatePlfsDomainVariance(
      connection,
      denominatorFilters(candidate.filters)
    );
    if (denominator.estimate <= 0) continue;

    const option = { ...candidate, numerator, denominator };
    if (
      !selected ||
      numerator.observationCount > selected.numerator.observationCount
    ) {
      selected = option;
    }
    if (numerator.observationCount >= 30) {
      selected = option;
      break;
    }
  }

  if (!selected) {
    return {
      ...direct,
      mode: "insufficient_backoff_support",
      modelVersion: "plfs-zero-v1",
      backoff: null,
      rangePrecisionScore: 0,
    };
  }

  return buildBackoffEstimate(selected, targetDenominator);
}

function buildBackoffEstimate(selected, targetDenominator) {
  const estimate =
    (selected.numerator.estimate / selected.denominator.estimate) *
    targetDenominator.estimate;
  const relativeSamplingError = Math.sqrt(
    (selected.numerator.standardError /
      Math.max(selected.numerator.estimate, 1)) **
      2 +
      (selected.denominator.standardError /
        Math.max(selected.denominator.estimate, 1)) **
        2 +
      (targetDenominator.standardError /
        Math.max(targetDenominator.estimate, 1)) **
        2
  );
  const supportPenalty =
    selected.numerator.observationCount >= 30
      ? 0
      : Math.min(1.5, Math.sqrt(30 / selected.numerator.observationCount) - 1);
  const modelRelativeError =
    0.35 + 0.15 * selected.depth + 0.35 * supportPenalty;
  const standardError =
    estimate * Math.sqrt(relativeSamplingError ** 2 + modelRelativeError ** 2);
  const low95 = Math.max(0, estimate - 1.96 * standardError);
  const high95 = estimate + 1.96 * standardError;
  const relativeHalfWidth =
    estimate > 0 ? (high95 - low95) / (2 * estimate) : Infinity;

  return {
    observationCount: 0,
    backoffObservationCount: selected.numerator.observationCount,
    lowestMatchedIncome: selected.numerator.lowestMatchedIncome,
    highestMatchedIncome: selected.numerator.highestMatchedIncome,
    estimate,
    variance: standardError ** 2,
    standardError,
    relativeStandardError:
      estimate > 0 ? (standardError / estimate) * 100 : null,
    low95,
    high95,
    pointBasis: "hierarchical_backoff",
    intervalMethod:
      "PLFS analytic variance with disclosed hierarchical model widening",
    mode: "hierarchical_backoff",
    modelVersion: "plfs-zero-v1",
    backoff: {
      label: selected.label,
      depth: selected.depth,
      numeratorFilters: selected.filters,
      numeratorObservationCount: selected.numerator.observationCount,
      targetPopulation: targetDenominator.estimate,
      backoffPopulation: selected.denominator.estimate,
      modelRelativeError,
    },
    rangePrecisionScore: Number.isFinite(relativeHalfWidth)
      ? Math.round(100 / (1 + relativeHalfWidth))
      : 0,
  };
}
