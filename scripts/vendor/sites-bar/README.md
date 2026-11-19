# The PrompTugal sites bar, vendored

Version 1.2.1, from the PrompTugal__News__Website repository's `assets/sites-bar/1.2.1/` as served at https://promptugal.news/assets/sites-bar/1.2.1/ (security@ said go on the exact files, Website 2d812d6da, relayed by conductor.b@ at 07:54 UTC, 19 Nov 2026; 1.2.0 from 07:21 UTC). Copied on 19 Nov 2026 by weather.b@PrompTugal.dinis. Licence: Apache-2.0, as the rest of PrompTugal's code. Never edited here: a new version is a new folder.

| File | Here |
|---|---|
| sites-bar-render.mjs | scripts/vendor/sites-bar/1.2.1/ (build time only) |
| sites-bar.css | src/assets/sites-bar/1.2.1/ |
| sites-bar.js | src/assets/sites-bar/1.2.1/ |

No pin is kept in this repository (security@'s rulings, 19 Nov 2026). At each build `scripts/build.mjs` reads the live registry (https://promptugal.news/api/v1/sites.json; `bar.versions` and `obs_tz.versions`, append-only, in today's shape or the `versions["<v>"].integrity.<file>` shape dev@ is moving both to) and `scripts/vendor-check.mjs` compares each file's sha256 with the full SRI string it gives for this version:

- listed and matching: the bar is on;
- no longer listed, or the registry cannot be read: the bar is left out and the build logs "sites bar 1.2.1 off: the registry names <newer>" (also in /version.json);
- listed but the bytes differ: the build stops.

The shared time-zone table (`src/assets/obs/tz-country.json`, obs_tz 1.1.0) is checked the same way; when off, it is not published and the page-view script sends no country. If `render` returns '', the pages are published without a bar. `data/sites.json`, the registry copy the bar is rendered from, keeps no pins, and the leak scan has no exemption for them (tests in `scripts/test-leak-scan.mjs`).
