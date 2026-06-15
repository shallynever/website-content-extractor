# CLAUDE.md

Guidance for Claude Code and other agents working in this repository.

## Commands

- Install dependencies: `npm --prefix skill install`
- Run all tests: `npm --prefix skill test`
- Run a single test file: `node --test skill/scripts/articleParser.test.mjs`
- Run the extractor: `npm --prefix skill run extract -- --url '<supported-url>' --wait-ms 8000`
- Run visibly for first-time login or manual verification: `npm --prefix skill run extract -- --url '<supported-url>' --wait-ms 15000 --keep-open`
- Run headless after access is saved: `npm --prefix skill run extract -- --url '<supported-url>' --headless --wait-ms 5000 --output "$HOME/Documents/Codex/shared/website-content-extractor/out/example"`

## Agent Tool Usage Notes

- When reading non-PDF files with local file tools, omit the `pages` parameter entirely. Use `pages` only for PDF files; passing an empty or irrelevant `pages` value can cause avoidable `Invalid pages parameter` errors.

## Architecture

- The Node package lives under `skill/`; repository-level docs describe installation, safety scope, and supported sites.
- `skill/scripts/extract.mjs` is the CLI entrypoint. It parses flags, matches URLs to site profiles, launches persistent Chrome or connects through CDP, injects browser parsers, renders Markdown, saves optional JSON/Markdown, and handles `--keep-open` polling.
- `skill/scripts/siteProfiles.mjs` owns URL routing and isolated Chrome profile paths. Current support covers WeChat Official Account articles, GitHub repository ranking/list pages, Yuque documents, and Yuque Explore headlines.
- `skill/scripts/browserParsers.mjs` selects browser-injected parsers. Parser functions are serialized with `Function.prototype.toString()`, so exported parser functions must be self-contained unless the injection strategy is changed with tests.
- `skill/scripts/*Parser.mjs` files return status objects such as `ok`, `needs_verification`, `needs_verification_timeout`, `unsupported_site`, or `unsupported_page`. `renderMarkdown()` in `articleParser.mjs` formats successful and non-OK results.
- Tests use Node's built-in test runner plus `linkedom`. Parser tests should use local or inline HTML, not live websites or private authenticated content.

## Adding Or Changing Extractors

- Register new site matchers and dedicated Chrome profiles in `skill/scripts/siteProfiles.mjs`.
- Add a parser under `skill/scripts/`, wire it through `skill/scripts/browserParsers.mjs` and `skill/scripts/extract.mjs`, and add parser tests.
- Update both `README.md` and `skill/SKILL.md` when user-facing behavior changes.
- Keep each site's parser, profile, verification handling, and routing isolated. Do not broaden a matcher in a way that captures a more specific supported site unless ordering is intentional and tested.

## Safety Scope

- Do not bypass login, CAPTCHA, verification, paywalls, permissions, or anti-automation controls. If a site requires manual action, open or connect to a visible Chrome session so the user can complete it.
- Do not commit Chrome profiles, cookies, tokens, private extracted content, logs, screenshots with private account data, or generated extraction outputs.
- Default extracted content belongs under `$HOME/Documents/Codex/shared/website-content-extractor/out/`, not under `skill/`. Inspect any generated artifacts before deciding whether to keep, move, or ignore them.
