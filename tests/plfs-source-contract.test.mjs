import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  PLFS_STATE_NAMES,
  SourceAdmissionError,
  inspectPlfsSource,
} from "../scripts/plfs-2025-contract.mjs";

async function fixtureContract(contents, overrides = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "india-standards-plfs-"));
  const sourcePath = path.join(directory, "fixture.csv");
  await writeFile(sourcePath, contents);
  const [header] = contents.trimEnd().split("\n");
  const columns = header.split(",");

  return {
    sourcePath,
    contract: {
      sha256: createHash("sha256").update(contents).digest("hex"),
      headerSha256: createHash("sha256").update(header).digest("hex"),
      rowCount: contents.trimEnd().split("\n").length - 1,
      columnCount: columns.length,
      requiredColumns: columns,
      ...overrides,
    },
  };
}

test("admits a source only when checksum, header, columns, and rows match", async () => {
  const fixture = await fixtureContract("sex,age,mult\n1,25,100.00\n");
  const result = await inspectPlfsSource(fixture.sourcePath, fixture.contract);

  assert.equal(result.rowCount, 1);
  assert.equal(result.columnCount, 3);
});

test("uses the official PLFS State/UT code mapping", () => {
  assert.equal(PLFS_STATE_NAMES["07"], "Delhi");
  assert.equal(PLFS_STATE_NAMES["09"], "Uttar Pradesh");
  assert.equal(PLFS_STATE_NAMES["27"], "Maharashtra");
  assert.equal(PLFS_STATE_NAMES["32"], "Kerala");
  assert.equal(PLFS_STATE_NAMES["36"], "Telangana");
});

test("rejects checksum drift", async () => {
  const fixture = await fixtureContract("sex,age,mult\n1,25,100.00\n", {
    sha256: "0".repeat(64),
  });

  await assert.rejects(
    inspectPlfsSource(fixture.sourcePath, fixture.contract),
    (error) =>
      error instanceof SourceAdmissionError &&
      error.message.includes("Checksum mismatch"),
  );
});

test("rejects header and required-column drift", async () => {
  const fixture = await fixtureContract("sex,years,mult\n1,25,100.00\n", {
    headerSha256: "0".repeat(64),
    requiredColumns: ["sex", "age", "mult"],
  });

  await assert.rejects(
    inspectPlfsSource(fixture.sourcePath, fixture.contract),
    (error) =>
      error instanceof SourceAdmissionError &&
      error.message.includes("Header fingerprint mismatch") &&
      error.message.includes("Missing required columns: age"),
  );
});

test("rejects row-count and column-count drift", async () => {
  const fixture = await fixtureContract("sex,age,mult\n1,25,100.00\n", {
    rowCount: 2,
    columnCount: 4,
  });

  await assert.rejects(
    inspectPlfsSource(fixture.sourcePath, fixture.contract),
    (error) =>
      error instanceof SourceAdmissionError &&
      error.message.includes("Column-count mismatch") &&
      error.message.includes("Row-count mismatch"),
  );
});
