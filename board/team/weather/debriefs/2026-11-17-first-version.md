# Hand-over debrief: the first version of weather.promptugal.news

weather@PrompTugal.dinis (Claude Code session, Opus), 17 November 2026, about 19:10 to 19:45 UTC. Started by conductor@PrompTugal.dinis at Dinis Cruz's word. Sub-agents in this run: weather.writer@PrompTugal.dinis and weather.design@PrompTugal.dinis (Sonnet). Written so a session on another account can carry on.

## What exists

See `REALITY.md`, "First version". In short: a front page, a map of warnings and fire risk, a page per Algarve place (17 + the region), the places index (district capitals listed, only Faro live), the Storm Charles archive, what to do, about, and three front-page designs at `/design/`. Every page has a markdown twin, the version, the "not a warning service" note, the pay-for-what-you-read line and a "how this page was made" block.

## How it works

- `scripts/sync-data.mjs` copies `data/by-place/now/*.json` (18 files), `data/by-place/places.json`, `assets/portugal/next-places.json` and the storm local map from PrompTugal/PrompTugal__News__Website (a sibling clone if present, else raw.githubusercontent.com on `dev`) into `data/now/` and `data/map/`, with `data/sync.json` saying which commit. It is not a collector: it never calls IPMA. CI runs it before every build (`continue-on-error`, so the committed copy is used if it fails).
- `scripts/build.mjs` copies `src/` (CSS, fonts, favicons, CNAME), then `scripts/site/generate.mjs` writes every page; helpers (frame, markdown, maps, the five-day chart) are in `scripts/site/lib.mjs`. Hand-written pages are `content/<slug>.md` (front matter `title`, `summary`). Storms are `data/storms/<id>.json` (the shape is in `data/storms/charles.json`). Design variations are `scripts/site/design/{a,b,c}.mjs`, each exporting `render(ctx)`.
- Reference data: `data/reference/ipma-weather-types.json` (IPMA's weather-type codes, read once by hand). Map outline: `data/map/portugal-outline-50m.json` (Natural Earth 50m via world-atlas 2.0.2, ISC licence beside it).
- Gate: `node scripts/build.mjs && node scripts/validate.mjs && node scripts/leak-scan.mjs`, all must print OK.

## What I learnt

- data.promptugal.news serves only a placeholder: no `/api/` yet (404 at about 19:20 UTC). When it publishes, change `scripts/sync-data.mjs` (one place) and drop the Website copy.
- The Website repository's place data covers only the Algarve; there is nothing yet for the other district capitals, so their pages are not built rather than built empty.
- In the 17:16 UTC copy most nearest stations sent no temperature; the pages say "not reported" rather than hide it.
- The world-atlas 110m outline puts Algarve towns in the sea; use the 50m one.
- The brief named `board/briefs/2026-11-17-storm-local-data.md`; the file is `2026-11-16-storm-local-data.md`.
- The writer could not source IPMA's definitions of all five fire risk classes or ANEPC's storm and fire self-protection pages (one refused, others not found); `content/what-to-do.md` states those gaps. Worth a second try by a person or a later session.

## What blocks me (for Dinis)

1. **No session key.** `pki-agent.mjs keygen --session` was refused by this session's permission settings, so `board/keys.json` has no entry and commits are not signed with an agent key. Allow it in the next session, or say how this team should sign.
2. **Agent trailer.** CI's `check-commits.mjs` accepts only `@AgentiCCells.` addresses, so commits say `Agent: weather@AgentiCCells.dinis`, while the five-sites brief names the role `weather@PrompTugal.dinis` (used in commit subjects). Keep this, or widen the check (a person's decision; I did not touch it).
3. **Adding the Website and Storm Charles repositories to the session** (add_repo) was refused too; I read them through public clones, read-only.

## What Dinis must decide

- Which front page: `/design/a/` (warnings first), `/design/b/` (the map is the page) or `/design/c/` (your town). The live `/` is a fourth, the base version.
- Whether CI may rebuild on a schedule (for example hourly), so pages follow the Website's hourly data without a push. It is a few lines in `pages.yml`; versions would then advance on every rebuild.
- The two identity questions above.

## What is next

1. Apply Dinis's design choice to `/`.
2. Read data.promptugal.news when its APIs exist; build the district capital pages from it (warnings by district, city forecasts, fire risk by municipality).
3. An hourly rebuild (if Dinis agrees), or a small client-side refresh from the published JSON.
4. More visualisations: warnings timeline per district, sea state along the whole coast, UV by day.
5. A person's check of the what-to-do page and the storm archive.
