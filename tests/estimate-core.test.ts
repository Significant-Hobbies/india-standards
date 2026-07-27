import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEstimate,
  buildPlfsPreviewEstimate,
  rangePrecisionFor,
  heightProbability,
  roundToThreeSignificantDigits,
} from "../lib/estimate-core.ts";
import { DEFAULT_FILTERS } from "../lib/types.ts";

test("rounds population counts to no more than three significant digits", () => {
  assert.equal(roundToThreeSignificantDigits(28_461.91), 28_500);
  assert.equal(roundToThreeSignificantDigits(0.004184), 0.00418);
  assert.equal(roundToThreeSignificantDigits(998), 998);
});

test("height probability remains bounded and increases for a wider interval", () => {
  const narrow = heightProbability(170, 175, 168, 6.4);
  const wide = heightProbability(165, 180, 168, 6.4);
  assert.ok(narrow > 0 && narrow < 1);
  assert.ok(wide > narrow && wide <= 1);
});

test("derives confidence from relative interval half-width", () => {
  const confidence = rangePrecisionFor(DEFAULT_FILTERS, 120, 100, 50, 150);

  assert.equal(confidence.score, 67);
  assert.match(confidence.disclaimer, /not a probability/i);
});

test("returns a widened best-effort estimate below 30 direct records", () => {
  const result = buildEstimate(
    DEFAULT_FILTERS,
    {
      weightedPopulation: 100_000,
      weightLow: 80_000,
      weightHigh: 120_000,
      observations: 29,
      genderDenominator: 300_000_000,
      ageDenominator: 20_000_000,
    },
    {
      meanCm: 168,
      sdCm: 6.4,
      observations: 3_000,
    },
  );

  assert.equal(result.status, "ok");
  assert.equal(result.observations, 29);
  assert.equal(result.estimateBasis.mode, "best_effort");
  assert.ok(
    result.rangePrecision.score >= 0 && result.rangePrecision.score <= 100,
  );
  assert.ok(result.estimate.low < result.estimate.central);
  assert.ok(result.estimate.high > result.estimate.central);
});

test("returns a best-effort range even with zero direct test records", () => {
  const result = buildEstimate(
    { ...DEFAULT_FILTERS, minIncome: 5_000_000 },
    {
      weightedPopulation: 2_500,
      weightLow: 1_000,
      weightHigh: 5_000,
      observations: 0,
      genderDenominator: 300_000_000,
      ageDenominator: 20_000_000,
    },
    {
      meanCm: 168,
      sdCm: 6.4,
      observations: 3_000,
    },
  );

  assert.equal(result.status, "ok");
  assert.equal(result.estimateBasis.mode, "best_effort");
  assert.equal(result.observations, 0);
  assert.ok(result.estimate.high > 0);
  assert.ok(result.rangePrecision.score >= 0);
});

test("returns ranges, both denominators, and a numeric confidence score", () => {
  const result = buildEstimate(
    {
      ...DEFAULT_FILTERS,
      minIncome: 2_000_000,
    },
    {
      weightedPopulation: 90_000,
      weightLow: 65_000,
      weightHigh: 125_000,
      observations: 82,
      genderDenominator: 330_000_000,
      ageDenominator: 23_000_000,
    },
    {
      meanCm: 168.5,
      sdCm: 6.4,
      observations: 4_500,
    },
  );

  assert.equal(result.status, "ok");
  assert.ok(
    result.rangePrecision.score >= 0 && result.rangePrecision.score <= 100,
  );
  assert.equal(
    result.rangePrecision.score,
    Math.round(
      100 /
        (1 +
          (result.estimate.high - result.estimate.low) /
            (2 * result.estimate.central)),
    ),
  );
  assert.ok(result.estimate.low < result.estimate.high);
  assert.ok(result.denominators.percentOfGender.high > 0);
  assert.ok(result.denominators.percentOfAgeCohort.high > 0);
  assert.ok(result.denominators.oneInAgeCohort.high > 1);
});

test("penalizes the high-income tail in the confidence score", () => {
  const demographic = {
    weightedPopulation: 90_000,
    weightLow: 65_000,
    weightHigh: 125_000,
    observations: 82,
    genderDenominator: 330_000_000,
    ageDenominator: 23_000_000,
  };
  const height = {
    meanCm: 168.5,
    sdCm: 6.4,
    observations: 4_500,
  };
  const broad = buildEstimate(
    { ...DEFAULT_FILTERS, minIncome: 500_000 },
    demographic,
    height,
  );
  const tail = buildEstimate(
    { ...DEFAULT_FILTERS, minIncome: 5_000_000 },
    demographic,
    height,
  );

  assert.ok(tail.rangePrecision.score < broad.rangePrecision.score);
});

test("builds a PLFS-backed preview without a height model", () => {
  const result = buildPlfsPreviewEstimate(
    DEFAULT_FILTERS,
    {
      observationCount: 14,
      estimate: 17_182.89,
      low95: 5_572.18,
      high95: 28_793.6,
      mode: "direct",
      modelVersion: null,
      intervalMethod: "PLFS 2025 published analytic domain-total variance",
    },
    360_000_000,
    19_000_000,
  );

  assert.equal(result.status, "ok");
  assert.equal(result.source.mode, "plfs_preview");
  assert.equal(result.heightModel, null);
  assert.equal(result.estimate.central, 17_200);
  assert.equal(result.estimateBasis.label, "Small direct PLFS sample");
  assert.ok(result.denominators.percentOfAgeCohort.high > 0);
  assert.match(result.rangePrecision.reason, /14 direct PLFS records/);
});

test("uses singular support wording for a one-record backoff", () => {
  const result = buildPlfsPreviewEstimate(
    { ...DEFAULT_FILTERS, minIncome: 7_500_000 },
    {
      observationCount: 0,
      backoffObservationCount: 1,
      estimate: 51.3,
      low95: 0,
      high95: 230,
      mode: "hierarchical_backoff",
      modelVersion: "plfs-zero-v1",
      intervalMethod:
        "PLFS analytic variance with disclosed hierarchical model widening",
    },
    360_000_000,
    19_000_000,
  );

  assert.match(result.estimateBasis.reason, /1 supporting PLFS record /);
  assert.doesNotMatch(result.estimateBasis.reason, /1 supporting PLFS records/);
});

test("height selections do not affect a PLFS-backed preview", () => {
  const aggregate = {
    observationCount: 42,
    estimate: 120_000,
    low95: 90_000,
    high95: 150_000,
    mode: "direct" as const,
    modelVersion: null,
    intervalMethod: "PLFS 2025 published analytic domain-total variance",
  };
  const shorter = buildPlfsPreviewEstimate(
    { ...DEFAULT_FILTERS, heightMin: 140, heightMax: 150 },
    aggregate,
    360_000_000,
    19_000_000,
  );
  const taller = buildPlfsPreviewEstimate(
    { ...DEFAULT_FILTERS, heightMin: 190, heightMax: 200 },
    aggregate,
    360_000_000,
    19_000_000,
  );

  assert.deepEqual(shorter, taller);
});
