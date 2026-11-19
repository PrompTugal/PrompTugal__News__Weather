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
| W-3 | The data pull accepted any file that parsed as JSON, with no size cap, timeout or shape check. | Low | `scripts/sync-data.mjs` | 18 Nov 2026, about 16:20 UTC | the security pre-review pass (Sonnet) | A 20 s timeout, a 5 MB cap per file, no redirect to another host, and a shape check per kind; a file that fails keeps the committed copy. This wake's commit | Fixed |
| W-4 | Third-party build actions named by version tag, not by commit | Low | `.github/workflows/pages.yml` | 18 Nov 2026, about 16:20 UTC | the security pre-review pass | | Open |
| W-5 | Page-view events' destination and key read from another site's file without pinning (inactive: no lane open) | Low | `src/assets/obs/obs.js` | 18 Nov 2026, about 16:20 UTC | the security pre-review pass | | Open |
| W-6 | Map files read from a moving branch, not a pinned commit | Low | `scripts/sync-data.mjs` | 18 Nov 2026, about 16:20 UTC | the security pre-review pass | | Open |
| W-7 | The release tag step holds write access to the repository | Informational | `.github/workflows/pages.yml` | 18 Nov 2026, about 16:20 UTC | the security pre-review pass | | Accepted for now: it pushes the version tag only |
| W-8 | Bug: the hourly rebuild did not run. The schedule added at 15:20 UTC on 18 November never fired (no scheduled run recorded by 17:51 UTC), so pages showed data up to about two hours old. | Low | `.github/workflows/pages.yml` | 18 Nov 2026, 17:51 UTC | conductor.b@PrompTugal.dinis, after an agent building on the data reported it was not refreshing | Pages now read data.promptugal.news in the browser and update when it has newer data (`src/assets/live.js`); the schedule runs twice an hour. This commit. 19 Nov 2026: scheduled runs do fire, but far less often than asked (Pages #32 at 22:42 UTC and #35 at 00:15 UTC; Dinis checked the Actions tab, nothing is disabled), so every page now also says when its data was read and when it was built. | Mitigated; open (GitHub's schedule is not dependable; a rebuild triggered after each collection is for Dinis to decide) |

No breach is known. No secret, key or private person's data has been found in this repository: the leak scan (`scripts/leak-scan.mjs`) checks the tracked files and the built site before every release.

## Threat models

What runs on its own, what it reads, writes and trusts, what could go wrong and how it is limited. Published 18 November 2026; review by security@PrompTugal.dinis requested. All three are on [How it works](/how/):

- [The hourly rebuild](/how/threat-models/scheduled-rebuild/) (`.github/workflows/pages.yml`)
- [The data pull](/how/threat-models/data-pull/) (`scripts/sync-data.mjs`)
- [Page views](/how/threat-models/observability/) (`src/assets/obs/obs.js`; no lane is open yet, so nothing is sent)
