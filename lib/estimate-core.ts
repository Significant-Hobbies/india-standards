import type {
  EstimateFilters,
  EstimateResponse,
  EstimateSuccess,
} from "./types.ts";

export type DemographicAggregate = {
  weightedPopulation: number;
  weightLow: number;
  weightHigh: number;
  observations: number;
  genderDenominator: number;
  ageDenominator: number;
};

export type HeightAggregate = {
  meanCm: number;
  sdCm: number;
  observations: number;
};

export type PlfsPreviewAggregate = {
  observationCount: number;
  backoffObservationCount?: number;
  lowestMatchedIncome?: number | null;
  highestMatchedIncome?: number | null;
  estimate: number;
  low95: number;
  high95: number;
  mode:
    | "direct"
    | "hierarchical_backoff"
    | "insufficient_target_population"
    | "insufficient_backoff_support";
  modelVersion: string | null;
  intervalMethod: string;
};

const SOURCE: EstimateSuccess["source"] = {
  mode: "demo",
  label: "Synthetic test data",
  authoritative: false,
  validationStatus: "synthetic_fixture",
  notice: "Not a population estimate",
  demographic: "PLFS-shaped synthetic cube",
  demographicYear: 2025,
  height: "NFHS-shaped synthetic model",
  heightYear: "2019–2021",
};

const PLFS_PREVIEW_SOURCE: EstimateSuccess["source"] = {
  mode: "plfs_preview",
  label: "PLFS-backed preview",
  authoritative: true,
  validationStatus: "plfs_technical_checks_passed",
  notice: "PLFS usage scope under review",
  demographic: "PLFS 2025 weighted person aggregates",
  demographicYear: 2025,
  incomeDefinition: "Annualized current-earnings proxy",
  height: "Unavailable pending NFHS approval",
  heightYear: null,
};

function normalCdf(value: number, mean: number, sd: number) {
  const z = (value - mean) / (sd * Math.sqrt(2));
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z);
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    sign *
    (1 -
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
        0.284496736) *
        t +
        0.254829592) *
        t *
        Math.exp(-x * x));
  return 0.5 * (1 + erf);
}

export function heightProbability(
  heightMin: number,
  heightMax: number,
  meanCm: number,
  sdCm: number,
) {
  const lowerEdge = heightMin - 0.5;
  const upperEdge = heightMax + 0.5;
  return Math.max(
    0,
    Math.min(
      1,
      normalCdf(upperEdge, meanCm, sdCm) -
        normalCdf(lowerEdge, meanCm, sdCm),
    ),
  );
}

export function roundToThreeSignificantDigits(value: number) {
  if (!Number.isFinite(value) || value === 0) return 0;
  return Number(value.toPrecision(3));
}

function incomeTailMargin(minIncome: number) {
  if (minIncome >= 8_000_000) return 0.5;
  if (minIncome >= 7_000_000) return 0.45;
  if (minIncome >= 6_000_000) return 0.38;
  if (minIncome >= 5_000_000) return 0.3;
  if (minIncome >= 3_000_000) return 0.22;
  if (minIncome >= 2_000_000) return 0.16;
  if (minIncome >= 1_500_000) return 0.1;
  if (minIncome >= 1_200_000) return 0.08;
  if (minIncome >= 1_000_000) return 0.05;
  return 0;
}

export function rangePrecisionFor(
  filters: EstimateFilters,
  observations: number,
  central: number,
  low: number,
  high: number,
) {
  const relativeHalfWidth =
    central > 0
      ? Math.max(0, high - low) / (2 * central)
      : Number.POSITIVE_INFINITY;
  const score = Number.isFinite(relativeHalfWidth)
    ? Math.round(100 / (1 + relativeHalfWidth))
    : 0;
  const relativeLabel = Number.isFinite(relativeHalfWidth)
    ? `${Math.round(relativeHalfWidth * 100)}%`
    : "unbounded";
  const incomeNote =
    filters.minIncome >= 1_000_000
      ? " High-income-tail widening is included."
      : "";

  return {
    score,
    reason: `The range half-width is ${relativeLabel} of the central estimate, based on ${observations} direct test records.${incomeNote}`,
    disclaimer:
      "Range-precision score, not a probability that the estimate is correct" as const,
  };
}

export function buildEstimate(
  filters: EstimateFilters,
  demographic: DemographicAggregate,
  height: HeightAggregate,
): EstimateResponse {
  const probability = heightProbability(
    filters.heightMin,
    filters.heightMax,
    height.meanCm,
    height.sdCm,
  );
  const heightMargin = Math.min(
    0.22,
    Math.max(0.035, 1.8 / Math.sqrt(Math.max(height.observations, 1))),
  );
  const probabilityLow = Math.max(0, probability * (1 - heightMargin));
  const probabilityHigh = Math.min(1, probability * (1 + heightMargin));
  const sparseMargin =
    demographic.observations >= 30
      ? 0
      : 0.75 * (1 - demographic.observations / 30);
  const tailMargin = incomeTailMargin(filters.minIncome);

  const central = demographic.weightedPopulation * probability;
  const low =
    demographic.weightLow *
    probabilityLow *
    Math.max(0, 1 - sparseMargin) *
    (1 - tailMargin);
  const high =
    demographic.weightHigh *
    probabilityHigh *
    (1 + sparseMargin) *
    (1 + tailMargin);
  const roundedLow = roundToThreeSignificantDigits(low);
  const roundedHigh = roundToThreeSignificantDigits(high);
  const roundedCentral = roundToThreeSignificantDigits(central);

  const percentOfGenderLow =
    (roundedLow / demographic.genderDenominator) * 100;
  const percentOfGenderHigh =
    (roundedHigh / demographic.genderDenominator) * 100;
  const percentOfAgeLow = (roundedLow / demographic.ageDenominator) * 100;
  const percentOfAgeHigh = (roundedHigh / demographic.ageDenominator) * 100;

  return {
    status: "ok",
    estimate: {
      low: roundedLow,
      high: roundedHigh,
      central: roundedCentral,
    },
    observations: demographic.observations,
    denominators: {
      selectedGender: roundToThreeSignificantDigits(
        demographic.genderDenominator,
      ),
      ageCohort: roundToThreeSignificantDigits(demographic.ageDenominator),
      percentOfGender: {
        low: roundToThreeSignificantDigits(percentOfGenderLow),
        high: roundToThreeSignificantDigits(percentOfGenderHigh),
      },
      percentOfAgeCohort: {
        low: roundToThreeSignificantDigits(percentOfAgeLow),
        high: roundToThreeSignificantDigits(percentOfAgeHigh),
      },
      oneInAgeCohort: {
        low: Math.max(
          1,
          roundToThreeSignificantDigits(
            demographic.ageDenominator / Math.max(roundedHigh, 1),
          ),
        ),
        high: Math.max(
          1,
          roundToThreeSignificantDigits(
            demographic.ageDenominator / Math.max(roundedLow, 1),
          ),
        ),
      },
    },
    rangePrecision: rangePrecisionFor(
      filters,
      demographic.observations,
      roundedCentral,
      roundedLow,
      roundedHigh,
    ),
    estimateBasis:
      demographic.observations < 30
        ? {
            mode: "best_effort",
            label: "Best-effort model",
            reason:
              demographic.observations === 0
                ? "No direct synthetic test records matched; the generated model cell supplies the central value and the range is widened."
                : "Fewer than 30 direct synthetic test records matched; the generated model cell supplies the central value and the range is widened.",
          }
        : {
            mode: "direct",
            label: "Direct cell estimate",
            reason:
              "At least 30 direct synthetic test records matched this generated model cell.",
          },
    heightModel: {
      probability: roundToThreeSignificantDigits(probability),
      low: roundToThreeSignificantDigits(probabilityLow),
      high: roundToThreeSignificantDigits(probabilityHigh),
      observations: height.observations,
      label: "Modelled across datasets",
    },
    source: SOURCE,
  };
}

export function buildPlfsPreviewEstimate(
  filters: EstimateFilters,
  demographic: PlfsPreviewAggregate,
  genderDenominator: number,
  ageDenominator: number,
): EstimateResponse {
  const roundedLow = roundToThreeSignificantDigits(demographic.low95);
  const roundedHigh = roundToThreeSignificantDigits(demographic.high95);
  const roundedCentral = roundToThreeSignificantDigits(demographic.estimate);
  const roundedGenderDenominator =
    roundToThreeSignificantDigits(genderDenominator);
  const roundedAgeDenominator = roundToThreeSignificantDigits(ageDenominator);
  const relativeHalfWidth =
    roundedCentral > 0
      ? (roundedHigh - roundedLow) / (2 * roundedCentral)
      : Number.POSITIVE_INFINITY;
  const rangePrecisionScore = Number.isFinite(relativeHalfWidth)
    ? Math.max(0, Math.min(100, Math.round(100 / (1 + relativeHalfWidth))))
    : 0;
  const isBackoff = demographic.mode === "hierarchical_backoff";
  const isSparse = demographic.observationCount < 30;
  const directRecordLabel =
    demographic.observationCount === 1 ? "record" : "records";
  const backoffRecordCount = demographic.backoffObservationCount ?? 0;
  const backoffRecordLabel = backoffRecordCount === 1 ? "record" : "records";
  const supportDescription = isBackoff
    ? `No direct records matched. This estimate uses ${backoffRecordCount} supporting PLFS ${backoffRecordLabel} from broader but similar groups.`
    : `${demographic.observationCount} direct PLFS ${directRecordLabel} matched.`;
  const precisionDescription = isBackoff
    ? `${supportDescription} The uncertainty range is widened to account for that modelling step.`
    : isSparse
      ? `${supportDescription} The uncertainty range is especially wide because the direct sample is small.`
      : `${supportDescription} The uncertainty range reflects the PLFS survey design.`;

  return {
    status: "ok",
    estimate: {
      low: roundedLow,
      high: roundedHigh,
      central: roundedCentral,
    },
    observations: demographic.observationCount,
    incomeSupport:
      demographic.lowestMatchedIncome === null ||
      demographic.lowestMatchedIncome === undefined
        ? undefined
        : {
            lowestMatchedIncome: roundToThreeSignificantDigits(
              demographic.lowestMatchedIncome,
            ),
            highestMatchedIncome: roundToThreeSignificantDigits(
              demographic.highestMatchedIncome ??
                demographic.lowestMatchedIncome,
            ),
            basis: isBackoff ? "broader_groups" : "direct",
          },
    denominators: {
      selectedGender: roundedGenderDenominator,
      ageCohort: roundedAgeDenominator,
      percentOfGender: {
        low: roundToThreeSignificantDigits(
          (roundedLow / Math.max(roundedGenderDenominator, 1)) * 100,
        ),
        high: roundToThreeSignificantDigits(
          (roundedHigh / Math.max(roundedGenderDenominator, 1)) * 100,
        ),
      },
      percentOfAgeCohort: {
        low: roundToThreeSignificantDigits(
          (roundedLow / Math.max(roundedAgeDenominator, 1)) * 100,
        ),
        high: roundToThreeSignificantDigits(
          (roundedHigh / Math.max(roundedAgeDenominator, 1)) * 100,
        ),
      },
      oneInAgeCohort: {
        low: Math.max(
          1,
          roundToThreeSignificantDigits(
            roundedAgeDenominator / Math.max(roundedHigh, 1),
          ),
        ),
        high: Math.max(
          1,
          roundToThreeSignificantDigits(
            roundedAgeDenominator / Math.max(roundedLow, 1),
          ),
        ),
      },
    },
    rangePrecision: {
      score: rangePrecisionScore,
      reason: precisionDescription,
      disclaimer:
        "Range-precision score, not a probability that the estimate is correct",
    },
    estimateBasis:
      isBackoff || isSparse
        ? {
            mode: "best_effort",
            label: isBackoff
              ? "Modelled from broader PLFS groups"
              : "Small direct PLFS sample",
            reason: supportDescription,
          }
        : {
            mode: "direct",
            label: "Direct PLFS estimate",
            reason: supportDescription,
          },
    heightModel: null,
    source: PLFS_PREVIEW_SOURCE,
  };
}
