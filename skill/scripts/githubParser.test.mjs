import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import { parseGitHubRepositoryRanking } from "./githubParser.mjs";

function makeDocument(html) {
  return parseHTML(html).document;
}

test("extracts GitHub topic repository ranking entries", () => {
  const document = makeDocument(`
    <html>
      <head><title>Artificial intelligence topic</title></head>
      <body>
        <article class="border rounded color-shadow-small color-bg-subtle my-4">
          <h3>
            <a href="/Significant-Gravitas/AutoGPT">
              <span>Significant-Gravitas</span> / <span>AutoGPT</span>
            </a>
          </h3>
          <p>AutoGPT is the vision of accessible AI for everyone.</p>
          <a class="topic-tag" href="/topics/ai">ai</a>
          <a class="topic-tag" href="/topics/agents">agents</a>
          <span itemprop="programmingLanguage">Python</span>
          <a href="/Significant-Gravitas/AutoGPT/stargazers">178k</a>
          <a href="/Significant-Gravitas/AutoGPT/forks">46.2k</a>
        </article>
        <article class="border rounded color-shadow-small color-bg-subtle my-4">
          <h3><a href="/open-webui/open-webui">open-webui / open-webui</a></h3>
          <p>User-friendly AI interface.</p>
          <span itemprop="programmingLanguage">Svelte</span>
          <a href="/open-webui/open-webui/stargazers">91,500</a>
        </article>
      </body>
    </html>
  `);

  assert.deepEqual(parseGitHubRepositoryRanking(document, {
    url: "https://github.com/topics/artificial-intelligence",
    currentUrl: "https://github.com/topics/artificial-intelligence"
  }), {
    status: "ok",
    url: "https://github.com/topics/artificial-intelligence",
    currentUrl: "https://github.com/topics/artificial-intelligence",
    title: "Artificial intelligence topic",
    listType: "github-repository-ranking",
    repositories: [
      {
        rank: 1,
        fullName: "Significant-Gravitas/AutoGPT",
        owner: "Significant-Gravitas",
        name: "AutoGPT",
        url: "https://github.com/Significant-Gravitas/AutoGPT",
        description: "AutoGPT is the vision of accessible AI for everyone.",
        language: "Python",
        stars: "178k",
        starsCount: 178000,
        forks: "46.2k",
        forksCount: 46200,
        starsToday: "",
        topics: ["ai", "agents"]
      },
      {
        rank: 2,
        fullName: "open-webui/open-webui",
        owner: "open-webui",
        name: "open-webui",
        url: "https://github.com/open-webui/open-webui",
        description: "User-friendly AI interface.",
        language: "Svelte",
        stars: "91,500",
        starsCount: 91500,
        forks: "",
        forksCount: null,
        starsToday: "",
        topics: []
      }
    ],
    content: "1. Significant-Gravitas/AutoGPT - 178k stars - Python\nAutoGPT is the vision of accessible AI for everyone.\n\n2. open-webui/open-webui - 91,500 stars - Svelte\nUser-friendly AI interface."
  });
});

test("prefers the full GitHub repository row over nested title containers", () => {
  const document = makeDocument(`
    <html>
      <head><title>Artificial intelligence topic</title></head>
      <body>
        <article>
          <div>
            <a href="/Significant-Gravitas/AutoGPT">
              <span>Significant-Gravitas</span> / <span>AutoGPT</span>
            </a>
          </div>
          <p>AutoGPT is the vision of accessible AI for everyone.</p>
          <span itemprop="programmingLanguage">Python</span>
          <a href="/Significant-Gravitas/AutoGPT/stargazers">178k</a>
          <a href="/Significant-Gravitas/AutoGPT/forks">46.2k</a>
        </article>
      </body>
    </html>
  `);

  const result = parseGitHubRepositoryRanking(document, {
    url: "https://github.com/topics/artificial-intelligence",
    currentUrl: "https://github.com/topics/artificial-intelligence"
  });

  assert.equal(result.repositories[0].description, "AutoGPT is the vision of accessible AI for everyone.");
  assert.equal(result.repositories[0].language, "Python");
  assert.equal(result.repositories[0].stars, "178k");
});

test("extracts GitHub topic stars from social counter buttons", () => {
  const document = makeDocument(`
    <html>
      <head><title>Artificial intelligence topic</title></head>
      <body>
        <article>
          <a href="/Significant-Gravitas/AutoGPT">AutoGPT</a>
          <a href="/login?return_to=%2FSignificant-Gravitas%2FAutoGPT">
            <span>Star</span>
            <span class="Counter js-social-count" title="184,886" aria-label="184886 users starred this repository">185k</span>
          </a>
        </article>
      </body>
    </html>
  `);

  const result = parseGitHubRepositoryRanking(document, {
    url: "https://github.com/topics/artificial-intelligence",
    currentUrl: "https://github.com/topics/artificial-intelligence"
  });

  assert.equal(result.repositories[0].stars, "185k");
  assert.equal(result.repositories[0].starsCount, 184886);
});

test("extracts modern GitHub search repository result rows", () => {
  const document = makeDocument(`
    <html>
      <head><title>Repository search results · GitHub</title></head>
      <body>
        <a href="/search/advanced">Advanced search</a>
        <div data-testid="results-list">
          <div class="Result-module__Result__Up5vk">
            <div class="Repositories-module__resultRow__OxgKG">
              <div class="Repositories-module__resultContent___BS2W">
                <h3><div class="search-title"><a href="/nextlevelbuilder/ui-ux-pro-max-skill">nextlevelbuilder/ui-ux-pro-max-skill</a></div></h3>
                <div class="Content-module__Content__mHmep">An AI SKILL that provide design intelligence for building professional UI/UX multiple platforms</div>
                <a href="/topics/react">react</a>
                <a href="/topics/ui-design">ui-design</a>
                <span aria-label="Python language">Python</span>
                <a href="/nextlevelbuilder/ui-ux-pro-max-skill/stargazers" aria-label="90309 stars">90.3k</a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);

  const result = parseGitHubRepositoryRanking(document, {
    url: "https://github.com/search?q=AI+skill&type=repositories&s=stars&o=desc",
    currentUrl: "https://github.com/search?q=AI+skill&type=repositories&s=stars&o=desc"
  });

  assert.equal(result.repositories.length, 1);
  assert.equal(result.repositories[0].fullName, "nextlevelbuilder/ui-ux-pro-max-skill");
  assert.equal(result.repositories[0].description, "An AI SKILL that provide design intelligence for building professional UI/UX multiple platforms");
  assert.equal(result.repositories[0].language, "Python");
  assert.equal(result.repositories[0].stars, "90.3k");
});

test("ignores sponsor owner text when extracting search descriptions", () => {
  const document = makeDocument(`
    <html>
      <head><title>Repository search results · GitHub</title></head>
      <body>
        <div data-testid="results-list">
          <div class="Result-module__Result__Up5vk">
            <div class="Repositories-module__resultRow__OxgKG">
              <div class="Repositories-module__resultContent___BS2W">
                <h3><a href="/JuliusBrussee/caveman">JuliusBrussee/caveman</a></h3>
                <p>JuliusBrussee</p>
                <div class="Content-module__Content__mHmep">why use many token when few token do trick</div>
                <span aria-label="JavaScript language">JavaScript</span>
                <a href="/JuliusBrussee/caveman/stargazers" aria-label="71402 stars">71.4k</a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);

  const result = parseGitHubRepositoryRanking(document, {
    url: "https://github.com/search?q=AI+skill&type=repositories&s=stars&o=desc",
    currentUrl: "https://github.com/search?q=AI+skill&type=repositories&s=stars&o=desc"
  });

  assert.equal(result.repositories[0].description, "why use many token when few token do trick");
});

test("extracts GitHub trending daily stars from repository rows", () => {
  const document = makeDocument(`
    <html>
      <head><title>Trending repositories on GitHub today</title></head>
      <body>
        <article class="Box-row">
          <h2><a href="/modelcontextprotocol/servers">modelcontextprotocol / servers</a></h2>
          <p>Model Context Protocol servers.</p>
          <span itemprop="programmingLanguage">TypeScript</span>
          <a href="/modelcontextprotocol/servers/stargazers">62,300</a>
          <span>1,234 stars today</span>
        </article>
      </body>
    </html>
  `);

  const result = parseGitHubRepositoryRanking(document, {
    url: "https://github.com/trending?since=daily",
    currentUrl: "https://github.com/trending?since=daily"
  });

  assert.equal(result.status, "ok");
  assert.equal(result.repositories[0].fullName, "modelcontextprotocol/servers");
  assert.equal(result.repositories[0].starsToday, "1,234 stars today");
});

test("reports GitHub pages without repository list entries", () => {
  const document = makeDocument(`
    <html>
      <head><title>GitHub</title></head>
      <body><main>No repositories here.</main></body>
    </html>
  `);

  assert.deepEqual(parseGitHubRepositoryRanking(document, {
    url: "https://github.com/settings/profile",
    currentUrl: "https://github.com/settings/profile"
  }), {
    status: "unsupported_page",
    url: "https://github.com/settings/profile",
    currentUrl: "https://github.com/settings/profile",
    title: "GitHub",
    reason: "No GitHub repository ranking entries were found on this page.",
    visibleTextSample: "No repositories here."
  });
});
