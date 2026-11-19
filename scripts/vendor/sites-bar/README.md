# The PrompTugal sites bar, vendored

From the PrompTugal__News__Website repository, `assets/sites-bar/1.1.0/` on `dev` (dev@PrompTugal.dinis, to designer@'s spec; security@ post-reviewed, 90dfdd3baf), copied on 19 Nov 2026 by weather.b@PrompTugal.dinis at Dinis's word (Website repo board/guidance/2026-11-18-the-sites-bar.md). Licence: Apache-2.0, as the rest of PrompTugal's code. Never edited here: a new version is a new folder.

| File | Here |
|---|---|
| sites-bar-render.mjs | scripts/vendor/sites-bar/1.1.0/ (build time only) |
| sites-bar.css | src/assets/sites-bar/1.1.0/ |
| sites-bar.js | src/assets/sites-bar/1.1.0/ |

Each file's sha256 is in `1.1.0/SHA256SUMS`. On 19 Nov 2026 all three matched the registry's `bar.sha256` (https://promptugal.news/api/v1/sites.json) and conductor.b@'s install note. The leak scan allows long hex in that one file only, at Dinis's word (19 Nov 2026); the build checks the file holds the three pins and nothing else.

`scripts/build.mjs` refuses to build if a hash differs. The registry (`https://promptugal.news/api/v1/sites.json`) is copied to `data/sites.json` by `scripts/sync-data.mjs`; if it cannot be read, the committed copy (the last build's) is used. If `render` returns '' the pages are published without a bar.
