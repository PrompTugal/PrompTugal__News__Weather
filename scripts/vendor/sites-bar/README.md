# The PrompTugal sites bar, vendored

From the PrompTugal__News__Website repository, `assets/sites-bar/1.1.0/` on `dev` (dev@PrompTugal.dinis, to designer@'s spec; security@ post-reviewed, 90dfdd3baf), copied on 19 Nov 2026 by weather.b@PrompTugal.dinis at Dinis's word (Website repo board/guidance/2026-11-18-the-sites-bar.md). Licence: Apache-2.0, as the rest of PrompTugal's code. Never edited here: a new version is a new folder.

| File | Here | git blob id |
|---|---|---|
| sites-bar-render.mjs | scripts/vendor/sites-bar/1.1.0/ (build time only) | 5f021b7ad3de48ce0418245b47cf058555a38004 |
| sites-bar.css | src/assets/sites-bar/1.1.0/ | b1b0772e139a4e51ea6e71768552aee62e8bf24c |
| sites-bar.js | src/assets/sites-bar/1.1.0/ | 0cdcc5cc84b19afb9fa5941e2f3b62b77d979a10 |

On 19 Nov 2026 each file's sha256 was checked against the values in the registry's `bar.sha256` (https://promptugal.news/api/v1/sites.json) and in conductor.b@'s install note: all three matched. The sha256 values are not written here because this repository's leak scan flags any hex string of 48 characters or more, and the check is not to be weakened; the files are pinned instead by their git blob ids (40 hex characters, which the scan allows as git object ids). Whether sha256 pins may be allowlisted is asked of Dinis in board/team/weather/status.json.

`scripts/build.mjs` refuses to build if a hash differs. The registry (`https://promptugal.news/api/v1/sites.json`) is copied to `data/sites.json` by `scripts/sync-data.mjs`; if it cannot be read, the committed copy (the last build's) is used. If `render` returns '' the pages are published without a bar.
