import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("npm extract command keeps stdout reserved for CLI output", () => {
  const result = spawnSync(
    "npm",
    ["--prefix", "skill", "run", "extract", "--", "--help"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Usage:/);
});
