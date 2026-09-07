import assert from "node:assert/strict";
import test from "node:test";
import { estimateShareUrl, parseEstimateFilters } from "../lib/validation.ts";
import { DEFAULT_FILTERS } from "../lib/types.ts";

test("share URL describes displayed result filters even after the address bar changes", () => {
  const displayed = {
    ...DEFAULT_FILTERS,
    state: "Delhi" as const,
    education: "postgraduate" as const,
  };
  const url = new URL(
    estimateShareUrl(
      "https://example.test/?state=Kerala&ageMin=50#filters",
      displayed
    )
  );
  assert.equal(url.searchParams.get("state"), "Delhi");
  assert.equal(url.searchParams.get("ageMin"), "25");
  assert.equal(url.searchParams.get("education"), "postgraduate");
  assert.equal(url.searchParams.get("maritalStatus"), "never_married");
  assert.equal(url.searchParams.has("heightMin"), false);
  assert.equal(url.searchParams.has("heightMax"), false);
  assert.equal(url.hash, "");
});

test("validates source-supported filter categories and boundaries", () => {
  assert.deepEqual(parseEstimateFilters(DEFAULT_FILTERS), DEFAULT_FILTERS);
  for (const input of [null, undefined, 4]) {
    assert.throws(() => parseEstimateFilters(input), /filter object/);
  }
  for (const [key, value] of Object.entries({
    gender: "other",
    maritalStatus: "unknown",
    education: "degree",
    state: "Mumbai",
    area: "city",
    minIncome: 123,
  })) {
    assert.throws(
      () => parseEstimateFilters({ ...DEFAULT_FILTERS, [key]: value }),
      /Choose/
    );
  }
  for (const [key, value] of [
    ["ageMin", 17],
    ["ageMax", 61],
    ["ageMin", 18.5],
    ["heightMin", 139],
    ["heightMax", 201],
  ] as const) {
    assert.throws(
      () => parseEstimateFilters({ ...DEFAULT_FILTERS, [key]: value }),
      /whole number/
    );
  }
  assert.throws(
    () => parseEstimateFilters({ ...DEFAULT_FILTERS, ageMin: 30, ageMax: 20 }),
    /Minimum age/
  );
  assert.throws(
    () =>
      parseEstimateFilters({
        ...DEFAULT_FILTERS,
        heightMin: 190,
        heightMax: 180,
      }),
    /Minimum height/
  );
});
