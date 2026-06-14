import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { renderMarkdown } from "./articleParser.mjs";
import { browserParserSource } from "./browserParsers.mjs";
import { pollUntilOk } from "./extractionLoop.mjs";
import { matchSiteProfile } from "./siteProfiles.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = dirname(scriptDir);
const repoRoot = dirname(skillDir);
const runtimeRoot = resolve(repoRoot, "tmp", "website-content-extractor");
const DEFAULT_OUTPUT = resolve(runtimeRoot, "out", "content-extract");

function parseArgs(argv) {
  const options = {
    profile: "",
    output: DEFAULT_OUTPUT,
    headed: true,
    waitMs: 15000,
    maxWaitMs: 300000,
    pollMs: 3000,
    keepOpen: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--url") options.url = argv[++index];
    else if (arg === "--profile") options.profile = argv[++index];
    else if (arg === "--output") options.output = argv[++index];
    else if (arg === "--wait-ms") options.waitMs = Number(argv[++index]);
    else if (arg === "--max-wait-ms") options.maxWaitMs = Number(argv[++index]);
    else if (arg === "--poll-ms") options.pollMs = Number(argv[++index]);
    else if (arg === "--cdp-url") options.cdpUrl = argv[++index];
    else if (arg === "--headless") options.headed = false;
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

Options:
  --url        Website URL to extract. Required.
  --profile    Persistent Chrome profile directory. Default: matched by site type
  --output     Output file path without extension. Default: ${DEFAULT_OUTPUT}
  --wait-ms    Time to wait after opening the page. Default: 15000
  --max-wait-ms Maximum time to wait for manual verification in --keep-open mode. Default: 300000
  --poll-ms    Time between extraction checks in --keep-open mode. Default: 3000
  --cdp-url    Connect to an existing Chrome remote debugging endpoint instead of launching Chrome.
  --headless   Run without showing the browser. Use only after verification is saved.
  --keep-open  Leave the browser open and keep checking until readable content appears or timeout.
`;
}

async function ensureParent(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function writeExtractionResult(outputBase, result) {
  await ensureParent(`${outputBase}.json`);
  await writeFile(`${outputBase}.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputBase}.md`, renderMarkdown(result));
}

async function extractWechatFromPage(page, url) {
  return page.evaluate(
    ({ articleUrl, parserSource }) => {
      const parser = new Function(`return (${parserSource});`)();
      return parser(document, { url: articleUrl, currentUrl: location.href });
    },
    { articleUrl: url, parserSource: browserParserSource("wechat") }
  );
}

async function extractGitHubRepositoryRankingFromPage(page, url) {
  return page.evaluate(
    ({ pageUrl, parserSource }) => {
      const parser = new Function(`return (${parserSource});`)();
      return parser(document, { url: pageUrl, currentUrl: location.href });
    },
    { pageUrl: url, parserSource: browserParserSource("github-repository-ranking") }
  );
}

async function extractYuqueDocumentFromPage(page, url) {
  return page.evaluate(
    ({ pageUrl, parserSource }) => {
      const parser = new Function(`return (${parserSource});`)();
      return parser(document, { url: pageUrl, currentUrl: location.href });
    },
    { pageUrl: url, parserSource: browserParserSource("yuque-document") }
  );
}

async function extractYuqueExploreFromPage(page, url) {
  return page.evaluate(
    ({ pageUrl, parserSource }) => {
      const parser = new Function(`return (${parserSource});`)();
      return parser(document, { url: pageUrl, currentUrl: location.href });
    },
    { pageUrl: url, parserSource: browserParserSource("yuque-explore-headlines") }
  );
}

async function extractContentFromPage(page, url, siteProfile) {
  if (siteProfile.extractorId === "wechat") {
    return extractWechatFromPage(page, url);
  }
  if (siteProfile.extractorId === "github-repository-ranking") {
    return extractGitHubRepositoryRankingFromPage(page, url);
  }
  if (siteProfile.extractorId === "yuque-document") {
    return extractYuqueDocumentFromPage(page, url);
  }
  if (siteProfile.extractorId === "yuque-explore-headlines") {
    return extractYuqueExploreFromPage(page, url);
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

async function extractViaCdp(options, siteProfile) {
  const version = await fetch(`${options.cdpUrl.replace(/\/$/, "")}/json/version`).then((response) => response.json());
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

  const parserSource = browserParserSource(siteProfile.extractorId);
  const expression = `(() => {
    const parser = new Function("return (" + ${JSON.stringify(parserSource)} + ");")();
    return parser(document, { url: ${JSON.stringify(options.url)}, currentUrl: location.href });
  })()`;
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  ws.close();
  return result.result.value;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage().trim());
    return;
  }
  if (!options.url) {
    throw new Error(`Missing required --url.\n\n${usage().trim()}`);
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

  const siteProfile = matchSiteProfile(options.url);
  const outputBase = resolve(options.output);

  if (!siteProfile) {
    const result = {
      status: "unsupported_site",
      url: options.url,
      reason: "No extractor is registered for this website yet."
    };
    await writeExtractionResult(outputBase, result);
    console.log(JSON.stringify(result, null, 2));
    console.log(`\nSaved:\n- ${outputBase}.json\n- ${outputBase}.md`);
    return;
  }

  if (options.cdpUrl) {
    const result = await extractViaCdp(options, siteProfile);
    result.siteType = siteProfile.id;
    result.siteName = siteProfile.displayName;
    await writeExtractionResult(outputBase, result);
    console.log(JSON.stringify(result, null, 2));
    console.log(`\nSaved:\n- ${outputBase}.json\n- ${outputBase}.md`);
    return;
  }

  const matchedProfile = options.profile || siteProfile.chromeProfile;
  const profileDir = resolve(matchedProfile);
  await mkdir(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: !options.headed,
    viewport: { width: 1280, height: 900 }
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto(options.url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(options.waitMs);

  const extractWithMetadata = async () => {
    const result = await extractContentFromPage(page, options.url, siteProfile);
    result.siteType = siteProfile.id;
    result.siteName = siteProfile.displayName;
    return result;
  };

  const result = options.keepOpen
    ? await pollUntilOk({
      maxWaitMs: options.maxWaitMs,
      pollMs: options.pollMs,
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
  result.siteType = siteProfile.id;
  result.siteName = siteProfile.displayName;
  await writeExtractionResult(outputBase, result);

  console.log(JSON.stringify(result, null, 2));
  console.log(`\nSaved:\n- ${outputBase}.json\n- ${outputBase}.md`);

  if (options.keepOpen) {
    if (result.status === "ok") {
      await context.close();
      return;
    }

    console.log("\nVerification did not complete before timeout. Browser left open for manual inspection.");
    return;
  }

  await context.close();
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
