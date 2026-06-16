import { renderMarkdown } from "./articleParser.mjs";

const MARKDOWN_FORMATS = ["article", "knowledge"];

function yamlString(value = "") {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function knowledgeFrontMatter(result, extractedAt) {
  return [
    "---",
    `title: ${yamlString(result.title || "Untitled Website Content")}`,
    `url: ${yamlString(result.url || "")}`,
    `site: ${yamlString(result.siteName || "")}`,
    `site_type: ${yamlString(result.siteType || "")}`,
    `strategy: ${yamlString(result.strategy || "")}`,
    `account: ${yamlString(result.account || "")}`,
    `published: ${yamlString(result.publishTime || "")}`,
    `extracted_at: ${yamlString(extractedAt)}`,
    "tags: []",
    "---"
  ].join("\n");
}

export function parseMarkdownFormat(value = "article") {
  const format = value || "article";
  if (!MARKDOWN_FORMATS.includes(format)) {
    throw new Error(`--markdown-format must be one of ${MARKDOWN_FORMATS.join(", ")}.`);
  }
  return format;
}

export function renderFormattedMarkdown(
  result,
  {
    markdownFormat = "article",
    extractedAt = new Date().toISOString()
  } = {}
) {
  const markdown = renderMarkdown(result);
  if (markdownFormat === "article") return markdown;

  return `${knowledgeFrontMatter(result, extractedAt)}\n\n${markdown}`;
}
