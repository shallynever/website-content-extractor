import assert from "node:assert/strict";
import { test } from "node:test";
import { extractGitHubRepositoryRankingStatic } from "./githubStaticExtractor.mjs";

const topicHtml = `
  <html>
    <head><title>Artificial intelligence topic</title></head>
    <body>
      <article>
        <h3><a href="/Significant-Gravitas/AutoGPT">Significant-Gravitas / AutoGPT</a></h3>
        <p>AutoGPT is the vision of accessible AI for everyone.</p>
        <span itemprop="programmingLanguage">Python</span>
        <a href="/Significant-Gravitas/AutoGPT/stargazers">178k</a>
        <a href="/Significant-Gravitas/AutoGPT/forks">46.2k</a>
      </article>
    </body>
  </html>
`;

function htmlResponse(body, init = {}) {
  return new Response(body, {
    status: init.status || 200,
    headers: {
      "content-type": init.contentType || "text/html; charset=utf-8"
    }
  });
}

test("extracts GitHub repositories from fetched static HTML", async () => {
  const result = await extractGitHubRepositoryRankingStatic(
    "https://github.com/topics/artificial-intelligence",
    {
      fetchImpl: async () => htmlResponse(topicHtml)
    }
  );

  assert.equal(result.status, "ok");
  assert.equal(result.strategy, "static");
  assert.equal(result.currentUrl, "https://github.com/topics/artificial-intelligence");
  assert.equal(result.repositories[0].fullName, "Significant-Gravitas/AutoGPT");
});

test("returns needs_browser_rendering when static HTML has no repository rows", async () => {
  const result = await extractGitHubRepositoryRankingStatic(
    "https://github.com/trending",
    {
      fetchImpl: async () => htmlResponse("<html><head><title>GitHub</title></head><body>No rows</body></html>")
    }
  );

  assert.equal(result.status, "needs_browser_rendering");
  assert.equal(result.strategy, "static");
  assert.equal(result.nextStrategy, "browser");
  assert.equal(result.reason, "Static HTML did not contain GitHub repository ranking entries.");
});

test("reports rate limiting without hiding the HTTP status", async () => {
  const result = await extractGitHubRepositoryRankingStatic(
    "https://github.com/trending",
    {
      fetchImpl: async () => htmlResponse("slow down", { status: 429 })
    }
  );

  assert.equal(result.status, "rate_limited");
  assert.equal(result.strategy, "static");
  assert.equal(result.nextStrategy, "browser");
  assert.match(result.reason, /HTTP 429/);
});
