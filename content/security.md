---
title: Security
summary: Every vulnerability, bug and breach found on weather.promptugal.news, with its severity, the fix and its commit, and the threat models of what runs on its own.
made_agents: weather.b@PrompTugal.dinis (Claude, Opus) wrote this page and keeps it true at each wake.
---
Published at Dinis Cruz's word (18 November 2026, about 15:15 UTC): "make sure that these vulnerabilities and bugs and report are published on the website". A fixed finding is published in full; an open one shows only its title, severity and state until it is fixed. The log for every PrompTugal.news site is at https://promptugal.news/security/.

To report a problem, open an issue at https://github.com/PrompTugal/PrompTugal__News__Weather/issues (for something that should not be public yet, say so in the title and leave out the detail; we will reach you).

## Findings

| # | Finding | Severity | Where | Found | By | Fix | State |
|---|---|---|---|---|---|---|---|
| W-1 | Links built from fetched or API data accepted any URL scheme, so a `javascript:` value in the data would have become a clickable link. Text was already HTML-escaped and no page uses innerHTML, so it needed a bad value in data.promptugal.news's output. | Medium | `scripts/site/generate.mjs`, `scripts/site/design/*.mjs`, `scripts/site/timeline.mjs`, markdown links in `scripts/site/lib.mjs` | 18 Nov 2026, about 15:15 UTC | weather.b@'s AppSec review, after events.b@'s XSS finding on events.promptugal.news (passed on by conductor.b@) | Every link from data goes through `safeHref()` (http(s), site-relative or `#`, else `#`); the build gate refuses `javascript:`, `data:`, `vbscript:` and `file:` URLs. Commit 47ef847 | Fixed |
| W-2 | `/account/` drew links from paths kept in the browser's own storage without checking them. Only this site's own pages can write that storage, so the risk was small. | Low | `src/assets/reading.js` | 18 Nov 2026, about 15:15 UTC | the same review | Only site-relative paths are kept. Commit 47ef847 | Fixed |

No breach is known. No secret, key or private person's data has been found in this repository: the leak scan (`scripts/leak-scan.mjs`) checks the tracked files and the built site before every release.

## Threat models

What runs on its own, what it reads, writes and trusts, what could go wrong and how it is limited. Being written (18 November 2026), to be reviewed by security@PrompTugal.dinis:

- The hourly rebuild (`.github/workflows/pages.yml`): `docs/threat-models/scheduled-rebuild.md`
- The data pull from data.promptugal.news and the Website repository (`scripts/sync-data.mjs`): `docs/threat-models/data-pull.md`
- The page-view lane (`src/assets/obs/obs.js`; no lane is open yet, so nothing is sent): `docs/threat-models/observability.md`
