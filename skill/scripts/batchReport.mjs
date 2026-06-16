import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function batchReportEntry({ url, result, outputBase = "" }) {
  return {
    url,
    siteType: result.siteType || "",
    strategy: result.strategy || "",
    status: result.status || "",
    outputMarkdown: outputBase ? `${outputBase}.md` : "",
    outputJson: outputBase ? `${outputBase}.json` : "",
    reason: result.reason || "",
    nextStrategy: result.nextStrategy || ""
  };
}

export async function writeBatchReport(reportPath, entries) {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(entries, null, 2)}\n`);
}
