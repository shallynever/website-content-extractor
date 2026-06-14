# Security Policy

## Supported Versions

This project is pre-1.0. Security fixes are applied to the latest `main` branch.

## Reporting A Vulnerability

Please do not open a public issue for vulnerabilities that expose credentials, cookies, private documents, or browser profile data.

Report sensitive issues privately to the project maintainer. Include:

- A short description of the issue
- Steps to reproduce with non-sensitive sample data
- The affected website type or extractor
- Any relevant logs with tokens, cookies, and private content removed

## Sensitive Data

Chrome profiles can contain cookies, login sessions, localStorage, browsing history, and site data. Extracted outputs can contain private or copyrighted content.

Do not upload any of the following to public issues, pull requests, releases, or sample fixtures:

- Chrome profile directories
- Cookies, tokens, API keys, or authorization headers
- Private extracted page content
- Screenshots that reveal private documents or account data
- `tmp/` output generated from private pages

This project does not bypass login, CAPTCHA, paywalls, permissions, or anti-automation controls. Users are responsible for following target website terms, copyright rules, privacy requirements, and applicable laws.
