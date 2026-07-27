import assert from "node:assert/strict";
import test from "node:test";
import { bindNamedParameters } from "../lib/pg-duckdb-connection.ts";

test("converts named DuckDB parameters to stable Postgres positions", () => {
  const query = bindNamedParameters(
    "WHERE gender = $gender AND age >= $ageMin AND other = $gender",
    {
      gender: "men",
      ageMin: 25,
    },
  );

  assert.equal(
    query.text,
    "WHERE gender = $1 AND age >= $2 AND other = $1",
  );
  assert.deepEqual(query.values, ["men", 25]);
});

test("rejects a missing named SQL parameter before querying", () => {
  assert.throws(
    () => bindNamedParameters("WHERE age <= $ageMax", {}),
    /Missing bound SQL parameter: ageMax/,
  );
});
