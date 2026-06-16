import { readFile } from "node:fs/promises";

export async function readBatchInput(inputPath) {
  const text = await readFile(inputPath, "utf8");
  const urls = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (urls.length === 0) {
    throw new Error(`No URLs found in input file: ${inputPath}`);
  }

  return urls;
}
