export type SourceManifestGate = {
  dataMode: unknown;
  validationStatus: unknown;
  authoritative: unknown;
};

export type PlfsPreviewManifestGate = SourceManifestGate & {
  accessStatus: unknown;
  usageScopeStatus: unknown;
  uncertaintyStatus: unknown;
  activationEligible: unknown;
};

export type ValidationCheckGate = {
  name: unknown;
  status: unknown;
};

export const REQUIRED_PLFS_PREVIEW_CHECKS = [
  "source_checksum",
  "source_header",
  "source_row_count",
  "weight_parse_and_scaling",
  "earnings_mutual_exclusivity",
  "state_mapping",
  "representative_point_fixtures",
  "official_lfpr_and_rse_reproduction",
  "weighted_all_person_total_plausibility",
  "supported_adult_total_plausibility",
  "plfs_uncertainty",
  "sparse_backoff",
] as const;

export function assertSourceManifestCanServe(manifest: SourceManifestGate) {
  if (
    manifest.dataMode === "official" &&
    (manifest.validationStatus !== "passed" || manifest.authoritative !== true)
  ) {
    throw new Error(
      "Official-data mode is blocked because the source validation manifest has not passed.",
    );
  }
  if (manifest.dataMode !== "demo" && manifest.dataMode !== "official") {
    throw new Error("The local database has an unsupported data mode.");
  }
}

export function assertPlfsPreviewCanServe(
  manifest: PlfsPreviewManifestGate,
  validationChecks: ValidationCheckGate[],
) {
  const manifestIsEligible =
    manifest.dataMode === "official" &&
    manifest.validationStatus === "pending" &&
    manifest.authoritative === true &&
    manifest.accessStatus === "accepted" &&
    (manifest.usageScopeStatus === "pending_review" ||
      manifest.usageScopeStatus === "approved") &&
    manifest.uncertaintyStatus === "direct_variance_validated_backoff_v1" &&
    manifest.activationEligible === false;

  if (!manifestIsEligible) {
    throw new Error(
      "PLFS preview mode is blocked because its aggregate source manifest is not eligible.",
    );
  }

  const statuses = new Map(
    validationChecks.map(({ name, status }) => [name, status]),
  );
  const failedOrMissing = REQUIRED_PLFS_PREVIEW_CHECKS.filter(
    (name) => statuses.get(name) !== "passed",
  );

  if (failedOrMissing.length > 0) {
    throw new Error(
      `PLFS preview mode is blocked by required validation checks: ${failedOrMissing.join(", ")}.`,
    );
  }
}
