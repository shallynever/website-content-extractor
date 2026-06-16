import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";
import { closeContextOnError } from "./browserContextLifecycle.mjs";
import { readBatchInput } from "./batchInput.mjs";
import { batchReportEntry, writeBatchReport } from "./batchReport.mjs";
import { cdpConnectionHelp, cdpConnectionHelpMessage, fetchCdpVersion, normalizeCdpUrl } from "./cdpEndpoint.mjs";
import { getExtractor } from "./extractorRegistry.mjs";
import { pollUntilOk } from "./extractionLoop.mjs";
import { parseMarkdownFormat, renderFormattedMarkdown } from "./markdownFormat.mjs";
import { DEFAULT_OUTPUT, DEFAULT_OUTPUT_ROOT, resolveOutputBase } from "./outputPaths.mjs";
import { evaluateParserInPlaywrightPage, parserSourceForExtractor } from "./parserRunner.mjs";
import { withExtractionMetadata } from "./resultMetadata.mjs";
import { matchSiteProfile } from "./siteProfiles.mjs";
import { runStrategyPlan } from "./strategyExecution.mjs";
import { buildStrategyPlan, parseStrategy } from "./strategySelection.mjs";

function logSaved(outputBase) {
  console.log(`\nSaved:\n- ${outputBase}.json\n- ${outputBase}.md`);
}

function shouldSave(options) {
  return options.save || options.outputWasProvided;
}

async function outputExtractionResult(options, result) {
  console.log(renderFormattedMarkdown(result, { markdownFormat: options.markdownFormat }));

  if (!shouldSave(options)) return;

  const outputBase = resolveOutputBase(options, result);
  await writeExtractionResult(outputBase, result, options);
  logSaved(outputBase);
  return outputBase;
}

function parseArgs(argv) {
  const options = {
    profile: "",
    output: DEFAULT_OUTPUT,
    headed: true,
    waitMs: 15000,
    maxWaitMs: 300000,
    pollMs: 3000,
    keepOpen: false,
    strategy: "auto",
    markdownFormat: "article"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--url") options.url = argv[++index];
    else if (arg === "--input") options.input = argv[++index];
    else if (arg === "--report") options.report = argv[++index];
    else if (arg === "--profile") options.profile = argv[++index];
    else if (arg === "--output") {
      options.output = argv[++index];
      options.outputWasProvided = true;
    }
    else if (arg === "--wait-ms") options.waitMs = Number(argv[++index]);
    else if (arg === "--max-wait-ms") options.maxWaitMs = Number(argv[++index]);
    else if (arg === "--poll-ms") options.pollMs = Number(argv[++index]);
    else if (arg === "--cdp-url") options.cdpUrl = argv[++index];
    else if (arg === "--cdp-port") options.cdpPort = argv[++index];
    else if (arg === "--strategy") options.strategy = parseStrategy(argv[++index]);
    else if (arg === "--markdown-format") options.markdownFormat = parseMarkdownFormat(argv[++index]);
    else if (arg === "--headless") options.headed = false;
    else if (arg === "--save") options.save = true;
    else if (arg === "--keep-open") options.keepOpen = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function usage() {
  return `
Usage:
  npm run extract -- --url <website-url> [--wait-ms 30000] [--keep-open]
  npm run extract -- --input urls.txt [--report extraction-report.json]

Options:
  --url        Website URL to extract. Required.
  --input      Read one URL per line from a text file. Blank lines and # comments are ignored.
  --report     Write a safe batch report JSON file with statuses and output paths.
  --profile    Persistent Chrome profile directory. Default: matched by site type
  --save       Save JSON and Markdown files. Default prints Markdown to stdout only.
  --output     Save to this output path without extension. Implies --save. Default directory: ${DEFAULT_OUTPUT_ROOT}; default basename: page title on successful extraction, otherwise content-extract
  --wait-ms    Time to wait after opening the page. Default: 15000
  --max-wait-ms Maximum time to wait for manual verification in --keep-open mode. Default: 300000
  --poll-ms    Time between extraction checks in --keep-open mode. Default: 3000
  --cdp-url    Connect to an existing Chrome remote debugging endpoint instead of launching Chrome.
  --cdp-port   Convenience shortcut for --cdp-url http://127.0.0.1:<port>.
  --strategy   Extraction strategy: auto, static, browser, or cdp. Default: auto.
               GitHub public ranking pages use static first in auto mode.
  --markdown-format Markdown output format: article or knowledge. Default: article.
  --headless   Run without showing the browser. Use only after verification is saved.
  --keep-open  Leave the browser open and keep checking until readable content appears or timeout.
`;
}

async function ensureParent(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function writeExtractionResult(outputBase, result, options = {}) {
  await ensureParent(`${outputBase}.json`);
  await writeFile(`${outputBase}.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputBase}.md`, renderFormattedMarkdown(result, {
    markdownFormat: options.markdownFormat
  }));
}

async function extractContentFromPage(page, url, siteProfile, extractor = getExtractor(siteProfile.extractorId)) {
  try {
    return await evaluateParserInPlaywrightPage(page, {
      extractorId: extractor.browserParser,
      url
    });
  } catch (error) {
    if (!/^Unknown browser parser:/.test(error.message)) throw error;
  }

  return {
    status: "unsupported_site",
    url,
    currentUrl: page.url(),
    reason: `No extractor implementation is available for ${siteProfile.displayName}.`
  };
}

async function sendCdpCommand(ws, pending, nextIdRef, method, params = {}, sessionId = "") {
  const id = nextIdRef.value;
  nextIdRef.value += 1;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  ws.send(JSON.stringify(payload));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function extractViaCdp(options, siteProfile, extractor = getExtractor(siteProfile.extractorId)) {
  const cdpUrl = normalizeCdpUrl(options);
  let version;
  try {
    version = await fetchCdpVersion(cdpUrl);
  } catch (error) {
    throw new Error(cdpConnectionHelpMessage({
      cause: error,
      help: cdpConnectionHelp({ cdpUrl, url: options.url, siteProfile })
    }));
  }
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  const pending = new Map();
  const nextIdRef = { value: 1 };

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  const send = (method, params = {}, sessionId = "") => sendCdpCommand(ws, pending, nextIdRef, method, params, sessionId);
  const created = await send("Target.createTarget", { url: options.url });
  const attached = await send("Target.attachToTarget", { targetId: created.targetId, flatten: true });
  const sessionId = attached.sessionId;

  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, options.waitMs));

  const parserSource = parserSourceForExtractor(extractor.browserParser);
  const expression = `(() => {
    const parser = new Function("return (" + ${JSON.stringify(parserSource)} + ");")();
    return parser(document, { url: ${JSON.stringify(options.url)}, currentUrl: location.href });
  })()`;
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  ws.close();
  return result.result.value;
}

function validateOptions(options) {
  if (!options.url && !options.input) {
    throw new Error(`Missing required --url or --input.\n\n${usage().trim()}`);
  }
  if (options.url && options.input) {
    throw new Error("Use either --url or --input, not both.");
  }
  if (!Number.isFinite(options.waitMs) || options.waitMs < 0) {
    throw new Error("--wait-ms must be a non-negative number.");
  }
  if (!Number.isFinite(options.maxWaitMs) || options.maxWaitMs < 0) {
    throw new Error("--max-wait-ms must be a non-negative number.");
  }
  if (!Number.isFinite(options.pollMs) || options.pollMs <= 0) {
    throw new Error("--poll-ms must be a positive number.");
  }
}

async function extractSingleUrl(options, url) {
  const urlOptions = { ...options, url };
  const siteProfile = matchSiteProfile(url);

  if (!siteProfile) {
    const result = {
      status: "unsupported_site",
      url,
      reason: "No extractor is registered for this website yet."
    };
    const outputBase = await outputExtractionResult(urlOptions, result);
    return { result, outputBase };
  }

  const strategyPlan = buildStrategyPlan({
    requestedStrategy: urlOptions.strategy,
    siteProfile,
    cdpUrl: normalizeCdpUrl(urlOptions)
  });
  const extractor = getExtractor(siteProfile.extractorId);

  const executeStatic = async () => {
    if (!extractor.static) {
      return {
        status: "static_unavailable",
        strategy: "static",
        nextStrategy: "browser",
        reason: `${siteProfile.displayName} does not support static extraction.`
      };
    }
    return extractor.static(url);
  };

  const executeCdp = async () => {
    const result = await extractViaCdp(urlOptions, siteProfile, extractor);
    return withExtractionMetadata(result, { siteProfile, strategy: "cdp" });
  };

  const executeBrowser = async () => {
    const matchedProfile = urlOptions.profile || siteProfile.chromeProfile;
    const profileDir = resolve(matchedProfile);
    await mkdir(profileDir, { recursive: true });

    const context = await chromium.launchPersistentContext(profileDir, {
      channel: "chrome",
      headless: !urlOptions.headed,
      viewport: { width: 1280, height: 900 }
    });

    return closeContextOnError(context, async () => {
      const page = context.pages()[0] || await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(urlOptions.waitMs);

      const extractWithMetadata = async () => {
        const result = await extractContentFromPage(page, url, siteProfile, extractor);
        return withExtractionMetadata(result, { siteProfile, strategy: "browser" });
      };

      const result = urlOptions.keepOpen
        ? await pollUntilOk({
          maxWaitMs: urlOptions.maxWaitMs,
          pollMs: urlOptions.pollMs,
          sleep: (ms) => page.waitForTimeout(ms),
          extract: extractWithMetadata,
          onAttempt: ({ attempt, result: attemptResult }) => {
            if (attemptResult.status === "ok") {
              console.log(`Extraction succeeded on attempt ${attempt}.`);
            } else if (attempt === 1) {
              console.log(
                `Manual action may be required: ${attemptResult.reason || attemptResult.status}. ` +
                "Keep this browser window open; extraction will continue automatically."
              );
            } else {
              console.log(`Still waiting for readable content (${attemptResult.status}) on attempt ${attempt}.`);
            }
          }
        })
        : await extractWithMetadata();

      if (urlOptions.keepOpen && result.status !== "ok") {
        console.log("\nVerification did not complete before timeout. Browser left open for manual inspection.");
        return result;
      }

      await context.close();
      return result;
    });
  };

  const result = await runStrategyPlan({
    plan: strategyPlan,
    logDecision: (line) => console.error(line),
    executeStatic: async () => withExtractionMetadata(await executeStatic(), {
      siteProfile,
      strategy: "static"
    }),
    executeBrowser,
    executeCdp
  });

  const outputBase = await outputExtractionResult(urlOptions, result);
  return { result, outputBase };
}

function batchUrlOptions(options, url, index) {
  const next = { ...options, url };
  if (options.outputWasProvided) {
    next.output = `${options.output}-${String(index + 1).padStart(3, "0")}`;
  }
  return next;
}

async function runBatch(options) {
  const urls = await readBatchInput(options.input);
  const entries = [];

  for (const [index, url] of urls.entries()) {
    console.error(`Batch ${index + 1}/${urls.length}: ${url}`);
    const urlOptions = batchUrlOptions(options, url, index);
    const { result, outputBase } = await extractSingleUrl(urlOptions, url);
    entries.push(batchReportEntry({ url, result, outputBase }));
  }

  if (options.report) {
    await writeBatchReport(options.report, entries);
    console.error(`Batch report written: ${options.report}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage().trim());
    return;
  }

  validateOptions(options);

  if (options.input) {
    await runBatch(options);
    return;
  }

  await extractSingleUrl(options, options.url);

  if (options.keepOpen) {
    return;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
