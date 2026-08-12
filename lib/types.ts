export const GENDERS = ["men", "women"] as const;
export const MARITAL_STATUSES = [
  "any",
  "never_married",
  "married",
  "widowed_divorced",
] as const;
export const EDUCATION_LEVELS = [
  "any",
  "below_secondary",
  "secondary",
  "graduate",
  "postgraduate",
] as const;
export const AREA_TYPES = ["all", "urban", "rural"] as const;

const MAX_INCOME_THRESHOLD = 8_500_000;
export const INCOME_THRESHOLDS: readonly number[] = Object.freeze(
  [
    ...new Set([
      ...Array.from(
        { length: MAX_INCOME_THRESHOLD / 100_000 + 1 },
        (_, index) => index * 100_000
      ),
      // Preserve the two half-step thresholds already used by shared URLs.
      250_000,
      750_000,
    ]),
  ].sort((left, right) => left - right)
);

export const PLFS_STATES = [
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
] as const;

type Gender = (typeof GENDERS)[number];
type MaritalStatus = (typeof MARITAL_STATUSES)[number];
type Education = (typeof EDUCATION_LEVELS)[number];
type AreaType = (typeof AREA_TYPES)[number];
type PlfsState = (typeof PLFS_STATES)[number];

export type EstimateFilters = {
  gender: Gender;
  ageMin: number;
  ageMax: number;
  minIncome: number;
  maritalStatus: MaritalStatus;
  education: Education;
  state: PlfsState;
  area: AreaType;
  heightMin: number;
  heightMax: number;
};

export type EstimateSuccess = {
  status: "ok";
  estimate: {
    low: number;
    high: number;
    central: number;
  };
  observations: number;
  incomeSupport?: {
    lowestMatchedIncome: number;
    highestMatchedIncome: number;
    basis: "direct" | "broader_groups";
  };
  denominators: {
    selectedGender: number;
    ageCohort: number;
    percentOfGender: {
      low: number;
      high: number;
    };
    percentOfAgeCohort: {
      low: number;
      high: number;
    };
    oneInAgeCohort: {
      low: number;
      high: number;
    };
  };
  rangePrecision: {
    score: number;
    reason: string;
    disclaimer: "Range-precision score, not a probability that the estimate is correct";
  };
  estimateBasis: {
    mode: "direct" | "best_effort";
    label: string;
    reason: string;
  };
  heightModel: {
    probability: number;
    low: number;
    high: number;
    observations: number;
    label: "Modelled across datasets";
  } | null;
  source:
    | {
        mode: "demo";
        label: "Synthetic test data";
        authoritative: false;
        validationStatus: "synthetic_fixture";
        notice: "Not a population estimate";
        demographic: "PLFS-shaped synthetic cube";
        demographicYear: 2025;
        height: "NFHS-shaped synthetic model";
        heightYear: "2019–2021";
      }
    | {
        mode: "plfs_preview";
        label: "PLFS-backed preview";
        authoritative: true;
        validationStatus: "plfs_technical_checks_passed";
        notice: "PLFS usage scope under review";
        demographic: "PLFS 2025 weighted person aggregates";
        demographicYear: 2025;
        incomeDefinition: "Annualized current-earnings proxy";
        height: "Unavailable pending NFHS approval";
        heightYear: null;
      };
};

export type EstimateResponse = EstimateSuccess;

export const DEFAULT_FILTERS: EstimateFilters = {
  gender: "men",
  ageMin: 25,
  ageMax: 27,
  minIncome: 1_200_000,
  maritalStatus: "never_married",
  education: "graduate",
  state: "all",
  area: "all",
  heightMin: 170,
  heightMax: 183,
};
