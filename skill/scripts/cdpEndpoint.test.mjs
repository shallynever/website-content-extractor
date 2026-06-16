import assert from "node:assert/strict";
import { test } from "node:test";
import { cdpConnectionHelp, cdpConnectionHelpMessage, fetchCdpVersion, normalizeCdpUrl } from "./cdpEndpoint.mjs";

test("normalizeCdpUrl preserves explicit cdpUrl without trailing slash", () => {
  assert.equal(normalizeCdpUrl({
    cdpUrl: "http://127.0.0.1:9333/",
    cdpPort: "9222"
  }), "http://127.0.0.1:9333");
});

test("normalizeCdpUrl builds localhost URL from cdpPort", () => {
  assert.equal(normalizeCdpUrl({
    cdpUrl: "",
    cdpPort: "9222"
  }), "http://127.0.0.1:9222");
});

test("normalizeCdpUrl returns empty string without cdpUrl or cdpPort", () => {
  assert.equal(normalizeCdpUrl({ cdpUrl: "", cdpPort: "" }), "");
});

test("normalizeCdpUrl rejects invalid cdpPort", () => {
  assert.throws(
    () => normalizeCdpUrl({ cdpUrl: "", cdpPort: "abc" }),
    /--cdp-port must be a number from 1 to 65535/
  );
});

test("fetchCdpVersion requests json version endpoint", async () => {
  const calls = [];
  const result = await fetchCdpVersion("http://127.0.0.1:9222", {
    fetchImpl: async (url, init) => {
      calls.push({ url, hasSignal: Boolean(init.signal) });
      return new Response(JSON.stringify({
        webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/browser/abc"
      }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    },
    timeoutMs: 100
  });

  assert.deepEqual(calls, [{
    url: "http://127.0.0.1:9222/json/version",
    hasSignal: true
  }]);
  assert.equal(result.webSocketDebuggerUrl, "ws://127.0.0.1:9222/devtools/browser/abc");
});

test("fetchCdpVersion explains connection failures", async () => {
  await assert.rejects(
    fetchCdpVersion("http://127.0.0.1:9222", {
      fetchImpl: async () => {
        throw new Error("connect ECONNREFUSED");
      },
      timeoutMs: 100
    }),
    /Could not connect to Chrome remote debugging endpoint at http:\/\/127\.0\.0\.1:9222/
  );
});

test("fetchCdpVersion rejects responses without websocket URL", async () => {
  await assert.rejects(
    fetchCdpVersion("http://127.0.0.1:9222", {
      fetchImpl: async () => new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" }
      }),
      timeoutMs: 100
    }),
    /did not return webSocketDebuggerUrl/
  );
});

test("cdpConnectionHelp builds an open command for the matched profile", () => {
  assert.deepEqual(cdpConnectionHelp({
    cdpUrl: "http://127.0.0.1:9222",
    url: "https://www.yuque.com/dashboard/explore#headlines",
    siteProfile: {
      displayName: "Yuque Explore Headlines",
      chromeProfile: "/tmp/chrome profiles/yuque"
    }
  }), {
    cdpUrl: "http://127.0.0.1:9222",
    port: "9222",
    command: "open -na 'Google Chrome' --args --user-data-dir='/tmp/chrome profiles/yuque' --remote-debugging-port=9222 'https://www.yuque.com/dashboard/explore#headlines'",
    siteName: "Yuque Explore Headlines"
  });
});

test("cdpConnectionHelpMessage includes the command", () => {
  const message = cdpConnectionHelpMessage({
    cause: new Error("connect ECONNREFUSED"),
    help: {
      cdpUrl: "http://127.0.0.1:9222",
      command: "open -na 'Google Chrome' --args --remote-debugging-port=9222 'https://example.com'",
      siteName: "Example"
    }
  });

  assert.match(message, /Could not connect to Chrome remote debugging endpoint at http:\/\/127\.0\.0\.1:9222/);
  assert.match(message, /open -na 'Google Chrome'/);
});

test("cdpConnectionHelpMessage does not duplicate endpoint context", () => {
  const message = cdpConnectionHelpMessage({
    cause: new Error("Could not connect to Chrome remote debugging endpoint at http://127.0.0.1:9222: fetch failed"),
    help: {
      cdpUrl: "http://127.0.0.1:9222",
      command: "open -na 'Google Chrome' --args --remote-debugging-port=9222 'https://example.com'",
      siteName: "Example"
    }
  });

  assert.equal(
    message.match(/Could not connect to Chrome remote debugging endpoint/g)?.length,
    1
  );
});
