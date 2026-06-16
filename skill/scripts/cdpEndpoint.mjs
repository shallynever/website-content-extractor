export function normalizeCdpUrl({ cdpUrl = "", cdpPort = "" } = {}) {
  if (cdpUrl) return cdpUrl.replace(/\/$/, "");
  if (!cdpPort) return "";

  const port = Number(cdpPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("--cdp-port must be a number from 1 to 65535.");
  }
  return `http://127.0.0.1:${port}`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function portFromCdpUrl(cdpUrl) {
  const url = new URL(cdpUrl);
  return url.port || (url.protocol === "https:" ? "443" : "80");
}

export function cdpConnectionHelp({ cdpUrl, url, siteProfile }) {
  const port = portFromCdpUrl(cdpUrl);
  return {
    cdpUrl,
    port,
    command: [
      "open -na 'Google Chrome' --args",
      `--user-data-dir=${shellQuote(siteProfile.chromeProfile)}`,
      `--remote-debugging-port=${port}`,
      shellQuote(url)
    ].join(" "),
    siteName: siteProfile.displayName
  };
}

export function cdpConnectionHelpMessage({ cause, help }) {
  const causeMessage = cause.message.includes(help.cdpUrl)
    ? cause.message
    : `Could not connect to Chrome remote debugging endpoint at ${help.cdpUrl}: ${cause.message}`;

  return [
    causeMessage,
    `Start a visible Chrome session for ${help.siteName}, then rerun the extractor:`,
    help.command
  ].join("\n");
}

export async function fetchCdpVersion(cdpUrl, { fetchImpl = fetch, timeoutMs = 3000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchImpl(`${cdpUrl}/json/version`, { signal: controller.signal });
  } catch (error) {
    throw new Error(
      `Could not connect to Chrome remote debugging endpoint at ${cdpUrl}: ${error.message}`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(
      `Chrome remote debugging endpoint at ${cdpUrl} returned HTTP ${response.status}.`
    );
  }

  const version = await response.json();
  if (!version.webSocketDebuggerUrl) {
    throw new Error(
      `Chrome remote debugging endpoint at ${cdpUrl} did not return webSocketDebuggerUrl.`
    );
  }

  return version;
}
