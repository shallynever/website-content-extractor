import assert from "node:assert/strict";
import { test } from "node:test";
import { join, resolve } from "node:path";
import { DEFAULT_OUTPUT_ROOT, resolveOutputBase, slugifyTitle } from "./outputPaths.mjs";

test("slugifies readable titles for filenames", () => {
  assert.equal(
    slugifyTitle("别再一上来就写爬虫了：Claude Code 联网五层方案，从轻到重够用就停"),
    "别再一上来就写爬虫了-Claude-Code-联网五层方案-从轻到重够用就停"
  );
});

test("removes filesystem-unsafe filename characters", () => {
  assert.equal(
    slugifyTitle("a/b:c*d?e\"f<g>h|i"),
    "a-b-c-d-e-f-g-h-i"
  );
});

test("falls back when title has no filename-safe content", () => {
  assert.equal(slugifyTitle("////", "content-extract"), "content-extract");
});

test("uses successful extraction title for default output basename", () => {
  assert.equal(
    resolveOutputBase(
      { output: join(DEFAULT_OUTPUT_ROOT, "content-extract") },
      { status: "ok", title: "文章标题" }
    ),
    resolve(DEFAULT_OUTPUT_ROOT, "文章标题")
  );
});

test("keeps explicit output basename unchanged", () => {
  assert.equal(
    resolveOutputBase(
      { output: "tmp/custom-name", outputWasProvided: true },
      { status: "ok", title: "文章标题" }
    ),
    resolve("tmp/custom-name")
  );
});

test("keeps fallback basename for non-ok extraction results", () => {
  assert.equal(
    resolveOutputBase(
      { output: join(DEFAULT_OUTPUT_ROOT, "content-extract") },
      { status: "needs_verification", title: "验证" }
    ),
    resolve(DEFAULT_OUTPUT_ROOT, "content-extract")
  );
});
