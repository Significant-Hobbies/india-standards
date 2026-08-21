import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export const PLFS_2025_CONTRACT = Object.freeze({
  contractVersion: 1,
  sourceName: "Periodic Labour Force Survey, Calendar Year 2025, person file",
  sourceYear: 2025,
  relativePath: "data/sources/plfs-2025/PLFS_2025.csv",
  sha256: "6c5b6a2433dd79d7b16b93fe55aa3a6d7028232146865981f526f62d181083da",
  headerSha256:
    "0c2bbac899fd1d37d3e1788423e7ce8b2b20b2659d37a252acb426675c4f943a",
  rowCount: 1_148_634,
  columnCount: 153,
  requiredColumns: [
    "file_id",
    "qtr",
    "month",
    "visit",
    "sec",
    "st",
    "bstrm",
    "strm",
    "grp",
    "sstrm",
    "mfsu",
    "sss",
    "ssu",
    "sex",
    "age",
    "marst",
    "gedu_lvl",
    "pas",
    "sas",
    "ern_reg",
    "ern_self",
    "nsc",
    "mult",
    "zst",
    "caph",
    "smallh",
  ],
  access: {
    status: "accepted",
    storage: "authorized local input; gitignored",
    redistribution: "prohibited",
    usageScopeStatus: "pending_review",
    rider:
      "The supplied README says PLFS unit-level data should not be specifically used to study variables other than employment and unemployment indicators.",
  },
  weight: {
    variable: "mult",
    divisor: 100,
    description: "Final survey weight = mult / 100.",
  },
  earnings: {
    regular: {
      variable: "ern_reg",
      referencePeriod: "preceding calendar month",
    },
    selfEmployed: {
      variable: "ern_self",
      referencePeriod: "last 30 days",
    },
    derived:
      "annual_earned_income_proxy = 12 * (coalesce(ern_reg, 0) + coalesce(ern_self, 0))",
    casualWagesIncluded: false,
  },
  design: {
    methodologySource: {
      relativePath: "data/sources/plfs-2025/PLFS_changes_in_2025_Final.pdf",
      sha256:
        "58bfbabe3c5efa99df00ec6799f683a21c0d0ffd7a88011eb20aa3f1584c7c15",
    },
    validationFixture: {
      relativePath: "data/sources/plfs-2025/PLFS_Annual_Report_2025.pdf",
      sha256:
        "134bf2de5e4b1142d3bae4899c90ec5be3bf5ec03a2ff4b3f7b0bba34eee0da7",
      name: "All-India rural usual-status LFPR, all ages",
      publishedEstimatePercent: 46.6,
      publishedRelativeStandardErrorPercent: 0.26,
    },
    selectionMethod: "SRSWOR",
    stratumVariables: ["sec", "st", "strm", "grp", "sstrm"],
    primarySamplingUnitVariable: "mfsu",
    observedPrimarySamplingUnits: 22_594,
    secondStageStratumVariable: "sss",
    sampleHouseholdVariable: "ssu",
    varianceInputs: ["zst", "nsc", "caph", "smallh"],
    varianceEstimator: "published PLFS 2025 analytic domain-total formula",
    uncertaintyStatus: "direct_variance_validated_backoff_v1",
  },
});

export const PLFS_CODE_MAPPINGS = Object.freeze({
  gender: Object.freeze({
    1: "men",
    2: "women",
  }),
  area: Object.freeze({
    1: "rural",
    2: "urban",
  }),
  maritalStatus: Object.freeze({
    1: "never_married",
    2: "married",
    3: "widowed_divorced",
    4: "widowed_divorced",
  }),
  education: Object.freeze({
    "01": "below_secondary",
    "02": "below_secondary",
    "03": "below_secondary",
    "04": "below_secondary",
    "05": "below_secondary",
    "06": "below_secondary",
    "07": "below_secondary",
    "08": "secondary",
    10: "secondary",
    11: "secondary",
    12: "graduate",
    13: "postgraduate",
  }),
});

export const PLFS_STATE_NAMES = Object.freeze({
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  10: "Bihar",
  11: "Sikkim",
  12: "Arunachal Pradesh",
  13: "Nagaland",
  14: "Manipur",
  15: "Mizoram",
  16: "Tripura",
  17: "Meghalaya",
  18: "Assam",
  19: "West Bengal",
  20: "Jharkhand",
  21: "Odisha",
  22: "Chhattisgarh",
  23: "Madhya Pradesh",
  24: "Gujarat",
  25: "Dadra and Nagar Haveli and Daman and Diu",
  27: "Maharashtra",
  28: "Andhra Pradesh",
  29: "Karnataka",
  30: "Goa",
  31: "Lakshadweep",
  32: "Kerala",
  33: "Tamil Nadu",
  34: "Puducherry",
  35: "Andaman and Nicobar Islands",
  36: "Telangana",
  37: "Ladakh",
});

export const DIRECT_UI_STATES = new Set([
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
]);

export class SourceAdmissionError extends Error {
  constructor(errors) {
    super(`PLFS source admission failed: ${errors.join(" ")}`);
    this.name = "SourceAdmissionError";
    this.errors = errors;
  }
}

function headerColumns(headerLine) {
  return headerLine.replace(/^\uFEFF/, "").split(",");
}

function validatePlfsContract(
  { sha256, headerSha256, columns, rowCount },
  contract
) {
  const duplicateColumns = columns.filter(
    (column, index) => columns.indexOf(column) !== index
  );
  const missingColumns = contract.requiredColumns.filter(
    (column) => !columns.includes(column)
  );
  const errors = [];

  if (sha256 !== contract.sha256) {
    errors.push(
      `Checksum mismatch: expected ${contract.sha256}, got ${sha256}.`
    );
  }
  if (headerSha256 !== contract.headerSha256) {
    errors.push(
      `Header fingerprint mismatch: expected ${contract.headerSha256}, got ${headerSha256}.`
    );
  }
  if (columns.length !== contract.columnCount) {
    errors.push(
      `Column-count mismatch: expected ${contract.columnCount}, got ${columns.length}.`
    );
  }
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(", ")}.`);
  }
  if (duplicateColumns.length > 0) {
    errors.push(
      `Duplicate columns: ${[...new Set(duplicateColumns)].join(", ")}.`
    );
  }
  if (rowCount !== contract.rowCount) {
    errors.push(
      `Row-count mismatch: expected ${contract.rowCount}, got ${rowCount}.`
    );
  }
  return errors;
}

export async function inspectPlfsSource(
  sourcePath,
  contract = PLFS_2025_CONTRACT
) {
  const fileHash = createHash("sha256");
  let headerBuffer = Buffer.alloc(0);
  let headerComplete = false;
  let newlineCount = 0;
  let lastByte;
  let byteCount = 0;

  for await (const chunk of createReadStream(sourcePath)) {
    fileHash.update(chunk);
    byteCount += chunk.length;
    for (const byte of chunk) {
      if (byte === 10) newlineCount += 1;
    }
    if (chunk.length > 0) lastByte = chunk[chunk.length - 1];

    if (!headerComplete) {
      const newlineIndex = chunk.indexOf(10);
      if (newlineIndex === -1) {
        headerBuffer = Buffer.concat([headerBuffer, chunk]);
      } else {
        headerBuffer = Buffer.concat([
          headerBuffer,
          chunk.subarray(0, newlineIndex),
        ]);
        headerComplete = true;
      }
    }
  }

  if (!headerComplete) {
    throw new SourceAdmissionError(["The file has no complete CSV header."]);
  }

  const headerLine = headerBuffer.toString("utf8").replace(/\r$/, "");
  const columns = headerColumns(headerLine);
  const rowCount = newlineCount + (lastByte === 10 ? 0 : 1) - 1;
  const sha256 = fileHash.digest("hex");
  const headerSha256 = createHash("sha256").update(headerLine).digest("hex");

  const errors = validatePlfsContract(
    { sha256, headerSha256, columns, rowCount },
    contract
  );
  if (errors.length > 0) {
    throw new SourceAdmissionError(errors);
  }

  return {
    sourcePath,
    byteCount,
    rowCount,
    columnCount: columns.length,
    columns,
    sha256,
    headerSha256,
  };
}
