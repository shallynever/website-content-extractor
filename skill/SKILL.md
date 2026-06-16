---
name: website-content-extractor
description: Use when the user wants to read, extract, monitor, or automate content extraction from supported websites using site-specific Chrome profiles. The skill is a generic entry point that detects the URL type, selects the matching extractor and persistent Chrome profile, and currently supports WeChat Official Account / 微信公众号 articles, GitHub repository ranking/list pages, and Yuque / 语雀 documents or Explore headline lists that the user can access.
---

# Website Content Extractor

Use this skill when the user provides a website URL and wants the page content extracted into structured JSON and Markdown.

Start by saying briefly: “使用 website-content-extractor skill：先识别网站类型，匹配专用 Chrome profile，再提取页面内容；当前已支持微信公众号文章、GitHub 仓库榜单页、语雀文档和语雀逛逛头条。”

默认使用 `--strategy auto`：GitHub 公开仓库榜单页先尝试 static fetch；微信公众号和语雀仍使用站点专用 Chrome profile，或在用户显式提供 `--strategy cdp` 加 `--cdp-url` / `--cdp-port` 时连接已有 Chrome。不要绕过验证、登录、验证码、权限或反自动化机制。

## Core Rule

Do not try to bypass verification, login checks, CAPTCHA, or anti-automation systems. This skill uses site-specific persistent Chrome profiles so the user can complete required verification manually, then later runs can reuse that saved state.

Keep profiles separated by purpose under:

```text
${WEBSITE_CONTENT_EXTRACTOR_PROFILE_ROOT:-$HOME/Documents/Codex/shared/chrome-profiles}/
```

Current registered profile:

```text
wechat-official-account -> $PROFILE_ROOT/wechat-official-account
github -> $PROFILE_ROOT/github
yuque -> $PROFILE_ROOT/yuque
```

Do not use one universal Chrome profile for every site unless the user explicitly asks; profile isolation reduces accidental cookie/session leakage between unrelated automations.

## Setup

Install dependencies from the skill directory if needed:

```bash
npm --prefix skill install
```

Run tests after code changes:

```bash
npm --prefix skill test
```

## Supported Websites

### WeChat Official Account

Supported URL pattern:

```text
https://mp.weixin.qq.com/s/...
```

First run or re-verification:

```bash
npm --prefix skill run extract -- \
  --url 'https://mp.weixin.qq.com/s/ARTICLE_ID' \
  --wait-ms 15000 \
  --keep-open
```

If WeChat shows verification, login, a slider, a CAPTCHA, or another manual checkpoint, tell the user to finish the visible action in that dedicated Chrome window. The command keeps checking the page and automatically extracts the article once readable content appears. By default, `--keep-open` waits up to 5 minutes and checks every 3 seconds; override this with `--max-wait-ms` and `--poll-ms`.

If the profile is locked because a previous `--keep-open` run is still open, close only that dedicated profile:

```bash
pkill -f 'chrome-profiles/wechat-official-account'
```

Automated extraction after verification is saved:

```bash
npm --prefix skill run extract -- \
  --url 'https://mp.weixin.qq.com/s/ARTICLE_ID' \
  --wait-ms 8000
```

### GitHub Repository Rankings

Supported URL patterns:

```text
https://github.com/topics/...
https://github.com/trending...
https://github.com/search?...&type=repositories...
```

The GitHub extractor is for repository ranking/list pages, including AI skill related repository search results. It extracts rank, repository full name, URL, description, language, stars, star count, daily stars when visible, and topics.

Example: extract GitHub AI skill repositories sorted by stars:

```bash
npm --prefix skill run extract -- \
  --url 'https://github.com/search?q=AI+skill&type=repositories&s=stars&o=desc' \
  --headless \
  --wait-ms 5000 \
  --output "$HOME/Documents/Codex/shared/website-content-extractor/out/github-ai-skill-search"
```

Example: extract an AI topic ranking:

```bash
npm --prefix skill run extract -- \
  --url 'https://github.com/topics/artificial-intelligence' \
  --strategy static
```

Use `--strategy browser` when a GitHub page needs the previous Playwright Chrome path.

### Yuque Documents And Explore Headlines

Supported URL patterns:

```text
https://www.yuque.com/{user_or_org}/{book}/{slug}
https://www.yuque.com/dashboard/explore#headlines
```

The Yuque extractor reads documents and Explore headline feeds that the user can access. It does not bypass login, sliders, CAPTCHA, or document permissions.

First run or re-verification:

```bash
npm --prefix skill run extract -- \
  --url 'https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz' \
  --wait-ms 15000 \
  --keep-open
```

If the output status indicates manual verification, tell the user to log in or complete the visible Yuque verification in that dedicated Chrome window. The command keeps checking the page and automatically extracts the document once readable content appears.

Automated extraction after the profile has access:

```bash
npm --prefix skill run extract -- \
  --url 'https://www.yuque.com/maixiaodou/dfdykf/ptq3u0picm2wbflz' \
  --wait-ms 8000
```

If the profile is locked because a previous `--keep-open` run is still open, close only that dedicated profile:

```bash
pkill -f 'chrome-profiles/yuque'
```

Some Yuque login and slider checks reject Playwright-launched Chrome even after a normal login. In that case, open normal Chrome with remote debugging and connect to it instead of launching a second browser:

```bash
open -na 'Google Chrome' --args \
  --user-data-dir="${WEBSITE_CONTENT_EXTRACTOR_PROFILE_ROOT:-$HOME/Documents/Codex/shared/chrome-profiles}/yuque" \
  --remote-debugging-port=9222 \
  'https://www.yuque.com/dashboard/explore#headlines'
```

After the user confirms the page is logged in and loaded, extract through the existing browser:

```bash
npm --prefix skill run extract -- \
  --url 'https://www.yuque.com/dashboard/explore#headlines' \
  --strategy cdp \
  --cdp-port 9222 \
  --wait-ms 10000 \
  --output "$HOME/Documents/Codex/shared/website-content-extractor/out/yuque-explore-headlines"
```

If the remote debugging endpoint is not reachable, the CLI prints a site-specific `open -na 'Google Chrome' ... --remote-debugging-port=...` command. CDP remains opt-in; do not make it the hidden default for sites that can use the normal browser strategy.

## Outputs

By default, extraction prints Markdown to stdout and does not write files. Use `--save` to write JSON and Markdown under `$HOME/Documents/Codex/shared/website-content-extractor/out/`; on successful extraction without `--output`, the basename is generated from the page title, otherwise it falls back to `content-extract`.

Use `--markdown-format knowledge` when the user wants Markdown with YAML front matter:

```bash
npm --prefix skill run extract -- \
  --url 'https://github.com/topics/artificial-intelligence' \
  --strategy static \
  --markdown-format knowledge
```

Keep `--markdown-format article` as the default unless the user asks for knowledge-base style Markdown. Do not generate summaries, entity lists, or extra tags unless the user separately asks for that behavior.

For multiple URLs, use `--input urls.txt` and optionally `--report extraction-report.json`:

```bash
npm --prefix skill run extract -- \
  --input urls.txt \
  --report "$HOME/Documents/Codex/shared/website-content-extractor/out/extraction-report.json"
```

Batch mode prints Markdown for each URL to stdout and does not save extracted content unless `--save` or `--output` is provided. The report is safe to inspect because it records statuses, reasons, next strategies, and output paths, not extracted private content.

```text
$HOME/Documents/Codex/shared/website-content-extractor/out/
```

Default outputs:

```text
$HOME/Documents/Codex/shared/website-content-extractor/out/<page-title>.json
$HOME/Documents/Codex/shared/website-content-extractor/out/<page-title>.md
```

## Output Status

- `ok`: content metadata and body were extracted. GitHub ranking pages include a `repositories` array; Yuque Explore pages include an `entries` array.
- `needs_browser_rendering`: static HTML did not contain readable supported content; rerun with `--strategy browser` or let `--strategy auto` escalate.
- `static_unavailable`: the matched site does not support static extraction.
- `rate_limited`: the lightweight fetch path was rate limited.
- `needs_verification`: the supported site showed verification, CAPTCHA, environment abnormality, or the expected content was not visible.
- `needs_verification_timeout`: `--keep-open` waited for readable content until `--max-wait-ms` expired.
- `unsupported_site`: no extractor is registered for this URL yet.

When `needs_verification` appears during a scheduled automation, report that the user must rerun a visible `--keep-open` extraction and complete verification.

## Adding New Websites

Add new website support by registering a matcher and Chrome profile in `scripts/siteProfiles.mjs`, then adding or wiring a site-specific extractor. Keep each website's verification and parsing rules isolated so future profiles can be added without changing existing WeChat or GitHub behavior.
