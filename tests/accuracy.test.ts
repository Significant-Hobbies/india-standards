import assert from "node:assert/strict";
import test from "node:test";
import {
  REQUIRED_PLFS_PREVIEW_CHECKS,
  assertPlfsPreviewCanServe,
  assertSourceManifestCanServe,
} from "../lib/accuracy.ts";

test("allows a synthetic fixture only as demo mode", () => {
  assert.doesNotThrow(() =>
    assertSourceManifestCanServe({
      dataMode: "demo",
      validationStatus: "synthetic_fixture",
      authoritative: false,
    }),
  );
});

test("fails closed when official mode is not authoritative and passed", () => {
  assert.throws(
    () =>
      assertSourceManifestCanServe({
        dataMode: "official",
        validationStatus: "pending",
        authoritative: false,
      }),
    /Official-data mode is blocked/,
  );
});

test("blocks an authoritative PLFS-only staging manifest while gates are pending", () => {
  assert.throws(
    () =>
      assertSourceManifestCanServe({
        dataMode: "official",
        validationStatus: "pending",
        authoritative: true,
      }),
    /Official-data mode is blocked/,
  );
});

test("allows official mode only after validation passes", () => {
  assert.doesNotThrow(() =>
    assertSourceManifestCanServe({
      dataMode: "official",
      validationStatus: "passed",
      authoritative: true,
    }),
  );
});

const previewManifest = {
  dataMode: "official",
  validationStatus: "pending",
  authoritative: true,
  accessStatus: "accepted",
  usageScopeStatus: "pending_review",
  uncertaintyStatus: "direct_variance_validated_backoff_v1",
  activationEligible: false,
};
const previewChecks = REQUIRED_PLFS_PREVIEW_CHECKS.map((name) => ({
  name,
  status: "passed",
}));

test("allows a technically validated PLFS-only local preview", () => {
  assert.doesNotThrow(() =>
    assertPlfsPreviewCanServe(previewManifest, previewChecks),
  );
});

test("blocks a PLFS preview when a required technical check is missing", () => {
  assert.throws(
    () => assertPlfsPreviewCanServe(previewManifest, previewChecks.slice(1)),
    /source_checksum/,
  );
});

test("blocks a PLFS preview when its manifest drifts", () => {
  assert.throws(
    () =>
      assertPlfsPreviewCanServe(
        { ...previewManifest, authoritative: false },
        previewChecks,
      ),
    /aggregate source manifest is not eligible/,
  );
});
