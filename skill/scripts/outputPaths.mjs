import { basename, dirname, resolve } from "node:path";

export const DEFAULT_OUTPUT_ROOT = resolve(
  process.env.HOME || ".",
  "Documents",
  "Codex",
  "shared",
  "website-content-extractor",
  "out"
);

export const DEFAULT_OUTPUT = resolve(DEFAULT_OUTPUT_ROOT, "content-extract");

export function slugifyTitle(value, fallback = "content-extract") {
  const slug = String(value || "")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, " ")
    .replace(/[，,、。；;：:！!？?（）()[\]{}]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .replace(/^-|-$/g, "");

  return slug || fallback;
}

export function resolveOutputBase(options, result) {
  const outputBase = resolve(options.output || DEFAULT_OUTPUT);
  if (options.outputWasProvided || result.status !== "ok") return outputBase;

  return resolve(dirname(outputBase), slugifyTitle(result.title, basename(outputBase)));
}
