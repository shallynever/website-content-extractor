# GitHub API Strategy Evaluation

## Decision

Do not add a general `api` extraction strategy in Phase 2.

The GitHub REST Search API can cover repository search and can approximate topic pages, but it does not cover GitHub Trending page semantics. Adding `api` now would make `auto` behavior surprising because the same supported site profile currently covers topics, trending, and repository search.

## Current Extractor Contract

The current GitHub repository ranking/list extractor returns:

- `fullName`
- `owner`
- `name`
- `url`
- `description`
- `language`
- `stars`
- `starsCount`
- `forks`
- `forksCount`
- `starsToday`
- `topics`

The web HTML parser also preserves visible page order and extracts `starsToday` when the page shows daily trending metadata.

## API Coverage

Anonymous probe:

```bash
curl -sS -D /tmp/github-search-headers.txt \
  'https://api.github.com/search/repositories?q=topic:artificial-intelligence&sort=stars&order=desc&per_page=3'
```

Observed usable fields:

- `full_name` maps to `fullName`.
- `owner.login` and `name` map to `owner` and `name`.
- `html_url` maps to `url`.
- `description` maps directly.
- `language` maps directly.
- `stargazers_count` maps to `starsCount`.
- `forks_count` maps to `forksCount`.
- `topics` maps directly.

Missing or mismatched fields:

- `stars` display text would need local formatting from `stargazers_count`.
- `forks` display text would need local formatting from `forks_count`.
- `starsToday` is not available from repository search results.
- Trending repositories are not available through a stable GitHub REST endpoint; `https://api.github.com/trending` returns HTTP 404.

## Page Type Fit

### Repository Search

Fit is good for `https://github.com/search?...&type=repositories...` when the requested sort maps clearly to Search API parameters.

Concern: API ranking can differ from visible GitHub web results if the web UI changes query interpretation, applies personalization, or exposes result modules that are not returned by the REST Search API.

### Topic Pages

Fit is partial. Topic pages can be approximated with `q=topic:<topic>&sort=stars&order=desc`, but that is not guaranteed to match the visible topic page order or filtering exactly.

### Trending

Fit is poor. GitHub Trending is a web page, not a REST Search API endpoint. The current parser extracts daily stars when visible; the API cannot provide the same field or the same time-window ranking.

## Rate Limit Notes

Observed anonymous rate limit headers for repository search:

```text
x-ratelimit-limit: 10
x-ratelimit-resource: search
```

Observed anonymous `/rate_limit` response also reported:

```json
{
  "core": { "limit": 60, "resource": "core" },
  "search": { "limit": 10, "resource": "search" }
}
```

This means an anonymous API strategy could be more fragile than static HTML for repeated repository searches. A token would raise limits, but the project should not require private token defaults for Phase 2.

## Recommendation

Keep Phase 2 focused on:

- Better static extraction for public GitHub HTML.
- Better browser/CDP fallback ergonomics.
- No `api` strategy in `auto`.

Future `api` support should be narrow and explicit:

- Only expose it for repository search URLs if a later implementation proves field parity and predictable sorting.
- Do not use it for trending.
- Do not use it as default `auto` behavior until anonymous rate limits and ordering differences are clearly documented in CLI output.

## Sources

- GitHub REST Search API documentation: https://docs.github.com/en/rest/search/search
- GitHub REST API rate limits documentation: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- Anonymous API probes run on 2026-06-16 against `api.github.com`.
