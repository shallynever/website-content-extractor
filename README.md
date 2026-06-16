# Website Content Extractor Skill

A Codex/agent skill for extracting readable website content into structured JSON and Markdown.

It currently supports:

- WeChat Official Account articles: `https://mp.weixin.qq.com/s/...`
- GitHub repository ranking/list pages: topics, trending, and repository search
- Yuque documents and Yuque Explore headline lists

The skill uses site-specific persistent Chrome profiles so users can complete login or verification manually once, then reuse that state later.

## Safety And Scope

This project does not bypass login, CAPTCHA, verification, paywalls, permissions, or anti-automation controls. If a supported website requires a manual action, the extractor opens a visible browser session and waits for the user to complete it.

Do not commit Chrome profiles, cookies, extracted private content, or `tmp/` output files.

Users are responsible for complying with each website's terms of service, robots policy, copyright rules, privacy requirements, and applicable laws. Only extract content that you are allowed to access and store.

## Repository Layout

```text
.
├── README.md
├── LICENSE
└── skill/
    ├── SKILL.md
    ├── agents/openai.yaml
    ├── package.json
    ├── package-lock.json
    └── scripts/
```

## Requirements

- Node.js 22 or newer
- npm
- Google Chrome when running the browser-based extractor

The CDP mode uses the runtime `fetch` and `WebSocket` APIs available in modern Node.js versions.

## Install Dependencies

```bash
npm --prefix skill install
```

## Run Tests

```bash
npm --prefix skill test
```

## Extract A Page

```bash
npm --prefix skill run extract -- \
  --url 'https://mp.weixin.qq.com/s/ARTICLE_ID' \
  --wait-ms 8000
```

For first-time login or verification, run visibly with `--keep-open`:

```bash
npm --prefix skill run extract -- \
  --url 'https://mp.weixin.qq.com/s/ARTICLE_ID' \
  --wait-ms 15000 \
  --keep-open
```

With `--keep-open`, the extractor checks repeatedly until readable content appears or the timeout expires. Defaults:

- `--max-wait-ms 300000`
- `--poll-ms 3000`

## Extraction Strategy

The extractor follows a light-to-heavy strategy model:

- `--strategy auto`: default. Use the lightest registered strategy for the matched site, then escalate only when needed.
- `--strategy static`: fetch public HTML and parse it without launching Chrome. Currently supported for GitHub repository ranking/list pages.
- `--strategy browser`: launch the site-specific persistent Chrome profile with Playwright.
- `--strategy cdp`: connect to an existing Chrome remote debugging endpoint. Requires `--cdp-url` or `--cdp-port`.

Decision logs are written to stderr so stdout can remain useful as Markdown output.

GitHub public repository ranking/list pages can use static extraction:

```bash
npm --prefix skill run extract -- \
  --url 'https://github.com/topics/artificial-intelligence' \
  --strategy static
```

Use `--strategy browser` when you specifically want the previous browser-based behavior.

For sites that reject Playwright-launched Chrome, start a visible Chrome instance with remote debugging and connect to it:

```bash
open -na 'Google Chrome' --args \
  --user-data-dir="$HOME/Documents/Codex/shared/chrome-profiles/yuque" \
  --remote-debugging-port=9222 \
  'https://www.yuque.com/dashboard/explore#headlines'
```

Then extract through the existing browser:

```bash
npm --prefix skill run extract -- \
  --url 'https://www.yuque.com/dashboard/explore#headlines' \
  --strategy cdp \
  --cdp-port 9222
```

If the endpoint is not reachable, the CLI prints a site-specific `open -na 'Google Chrome' ... --remote-debugging-port=...` command.

## Chrome Profile Location

By default, profiles are stored under:

```text
$HOME/Documents/Codex/shared/chrome-profiles/
```

Override this with:

```bash
export WEBSITE_CONTENT_EXTRACTOR_PROFILE_ROOT="$HOME/.local/share/website-content-extractor/chrome-profiles"
```

Registered profile folders:

- `wechat-official-account`
- `github`
- `yuque`

Chrome profiles may contain cookies, login state, browsing history, localStorage, and other private data. Do not upload profile directories, browser screenshots with private content, or extracted private documents to public issues or pull requests.

## Output

By default, extraction prints Markdown to stdout and does not write files. Use `--save` to write JSON and Markdown under `$HOME/Documents/Codex/shared/website-content-extractor/out/`; on successful extraction without `--output`, the basename is generated from the page title, otherwise it falls back to `content-extract`:

```text
$HOME/Documents/Codex/shared/website-content-extractor/out/<page-title>.json
$HOME/Documents/Codex/shared/website-content-extractor/out/<page-title>.md
```

Use `--output` to choose a different basename; it implies `--save`:

```bash
npm --prefix skill run extract -- \
  --url 'https://github.com/topics/artificial-intelligence' \
  --headless \
  --wait-ms 5000 \
  --output "$HOME/Documents/Codex/shared/website-content-extractor/out/github-ai-topic"
```

Use `--markdown-format knowledge` when the Markdown should include YAML front matter for a knowledge base:

```bash
npm --prefix skill run extract -- \
  --url 'https://github.com/topics/artificial-intelligence' \
  --strategy static \
  --markdown-format knowledge
```

The default `--markdown-format article` preserves the previous Markdown shape.

For batch extraction, put one URL per line in a text file. Blank lines and `#` comments are ignored:

```bash
npm --prefix skill run extract -- \
  --input urls.txt \
  --report "$HOME/Documents/Codex/shared/website-content-extractor/out/extraction-report.json"
```

Batch mode prints each extraction's Markdown to stdout. It does not save extracted content unless `--save` or `--output` is also provided. The report records URL, site type, strategy, status, output paths when saved, reason, and next strategy.

## Install As A Local Skill

Symlink the `skill/` directory into your agent's skill directory. For Codex:

```bash
ln -s "$PWD/skill" "$HOME/.codex/skills/website-content-extractor"
```

For Claude Code:

```bash
ln -s "$PWD/skill" "$HOME/.claude/skills/website-content-extractor"
```

## Contributing

Before opening a pull request, run:

```bash
npm --prefix skill install
npm --prefix skill test
```

When adding a new website, register its URL matcher and dedicated Chrome profile in `skill/scripts/siteProfiles.mjs`, add a site-specific parser, and include parser tests using local HTML fixtures or inline HTML. Do not add real cookies, browser profiles, private extracted content, or live-site credentials to the repository.

Parser functions are injected into the browser with `Function.prototype.toString()`, so each exported parser must be able to run without closing over module-level helper functions. If a helper is needed by a browser-injected parser, define it inside that parser or change the injection strategy with tests.
