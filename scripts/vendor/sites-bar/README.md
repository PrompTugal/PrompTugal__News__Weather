# The PrompTugal sites bar, vendored

Version 1.2.0, from the PrompTugal__News__Website repository's `assets/sites-bar/1.2.0/` as served at https://promptugal.news/assets/sites-bar/1.2.0/ (security@ said go, Website 055e6c1430, relayed by conductor.b@ at 07:15 UTC, 19 Nov 2026). Copied on 19 Nov 2026 by weather.b@PrompTugal.dinis. Licence: Apache-2.0, as the rest of PrompTugal's code. Never edited here: a new version is a new folder.

| File | Here |
|---|---|
| sites-bar-render.mjs | scripts/vendor/sites-bar/1.2.0/ (build time only) |
| sites-bar.css | src/assets/sites-bar/1.2.0/ |
| sites-bar.js | src/assets/sites-bar/1.2.0/ |

No pin is kept in this repository's code (security@'s ruling, 19 Nov 2026). `scripts/sync-data.mjs` copies the registry (https://promptugal.news/api/v1/sites.json) to `data/sites.json`, keeping every version's pins (`bar.versions`, `obs_tz.versions`, append-only). At each build `scripts/vendor-check.mjs` compares each file's sha256 with the full SRI string the registry gives for this version:

- listed and matching: the bar is on;
- no longer listed: the bar is left out and the build logs "sites bar 1.2.0 off: the registry names <newer>" (also in /version.json);
- listed but the bytes differ: the build stops.

The shared time-zone table (`src/assets/obs/tz-country.json`, obs_tz 1.1.0) is checked the same way; when off, it is not published and the page-view script sends no country. If `render` returns '', the pages are published without a bar. The leak scan allows SRI strings only in those fields of `data/sites.json` (tests in `scripts/test-leak-scan.mjs`).
