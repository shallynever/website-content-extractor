import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { readBatchInput } from "./batchInput.mjs";

test("readBatchInput reads URLs while ignoring comments and blanks", async () => {
  const dir = await mkdtemp(join(tmpdir(), "website-content-extractor-"));
  const input = join(dir, "urls.txt");
  await writeFile(input, [
    "# comment",
    "",
    "https://github.com/topics/artificial-intelligence",
    "  https://github.com/trending  "
  ].join("\n"));

  assert.deepEqual(await readBatchInput(input), [
    "https://github.com/topics/artificial-intelligence",
    "https://github.com/trending"
  ]);
});

test("readBatchInput rejects an empty file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "website-content-extractor-"));
  const input = join(dir, "urls.txt");
  await writeFile(input, "# only comments\n\n");

  await assert.rejects(
    readBatchInput(input),
    /No URLs found in input file/
  );
});
