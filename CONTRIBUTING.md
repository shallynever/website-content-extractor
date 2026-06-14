# Contributing

Thanks for helping improve Website Content Extractor.

## Development Setup

```bash
npm --prefix skill install
npm --prefix skill test
```

## Pull Request Checklist

- Add or update tests for parser behavior.
- Run `npm --prefix skill test`.
- Do not commit Chrome profiles, cookies, tokens, private extracted content, logs, or `tmp/` output.
- Keep each website's parser and profile rules isolated from unrelated sites.
- Update `README.md` and `skill/SKILL.md` when user-facing behavior changes.

## Adding A Website

1. Register a URL matcher and dedicated profile in `skill/scripts/siteProfiles.mjs`.
2. Add a parser under `skill/scripts/`.
3. Wire the parser through `skill/scripts/browserParsers.mjs` and `skill/scripts/extract.mjs`.
4. Add tests with local or inline HTML samples.
5. Document supported URL patterns and manual verification behavior.

Parser functions are injected into the browser with `Function.prototype.toString()`. Browser-injected parsers must not depend on module-level helper functions unless the injection strategy is updated and tested.

## Scope

This project does not bypass login, CAPTCHA, paywalls, permissions, or anti-automation controls. Contributions that attempt to evade access controls will not be accepted.
