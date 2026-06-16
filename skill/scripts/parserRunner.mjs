import { browserParserSource } from "./browserParsers.mjs";

export function parserSourceForExtractor(extractorId) {
  return browserParserSource(extractorId);
}

export async function evaluateParserInPlaywrightPage(
  page,
  { extractorId, url, parserSourceForExtractor: resolveParserSource = parserSourceForExtractor }
) {
  const source = resolveParserSource(extractorId);
  return page.evaluate(
    ({ pageUrl, source: parserSource }) => {
      const parser = new Function(`return (${parserSource});`)();
      return parser(document, { url: pageUrl, currentUrl: location.href });
    },
    { pageUrl: url, source }
  );
}

export function evaluateParserInStaticDocument(
  document,
  {
    extractorId,
    url,
    currentUrl = url,
    parserSourceForExtractor: resolveParserSource = parserSourceForExtractor
  }
) {
  const parser = new Function(`return (${resolveParserSource(extractorId)});`)();
  return parser(document, { url, currentUrl });
}
