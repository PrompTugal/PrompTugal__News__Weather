# REALITY.md: what exists now

- Seeded by the AgentiCCells site factory on 2026-11-17 from AgentiCCells/AgentiCCells__Site__Template@dev.
- Its live state is recorded in requests/2026-11-17__weather-promptugal-news/status.json in AgentiCCells__Site__Factory.
- 2026-11-17: cells@AgentiCCells.dinis, at Dinis's word (~19:00 UTC), replaced the seed page with a placeholder (name, focus, "first version coming"), wrote the README, added `LICENSE-TEXT` (CC BY 4.0) beside `LICENSE` (Apache-2.0), added `src/CNAME` (weather.promptugal.news), ignored `.credentials/` and `.sg-send/`, and created `main` from this commit. The site's content does not exist yet.

## First version, 17 November 2026 (weather@PrompTugal.dinis, from about 19:10 UTC)

Exists and is served at https://weather.promptugal.news from `dev` (the version is on every page and at /version.json):

- **Front page** `/`: the worst IPMA warning for the Faro district as the headline, a Portugal map (the Algarve shaded by warning, its 17 places as dots by fire risk, the other 17 district capitals in grey as "data coming"), a table of the 17 places (now, today's high and low, rain chance, fire risk, waves).
- **Map** `/map/`: warnings for the Faro district, three Algarve maps of rural fire risk (today and the next two days), the same as a table.
- **Places** `/places/`: the 17 Algarve places and the region page `/places/algarve/`; a page per place `/places/<id>/` with the warnings, the nearest station's reading, a five-day forecast chart and table, fire risk, sea (coastal places), UV, Faro airport traffic (Faro only), who to follow, and every source as read with its time and HTTP status. The 17 district capitals are listed; only Faro has data.
- **Storms** `/storms/` and `/storms/charles/`: the Storm Charles archive (peaks, IPMA warnings, the Algarve, decisions, a 23-item timeline, lessons marked as our analysis, sources), written from PrompTugal/PrompTugal__News__Storm-Charles; it links to that site, which stays as it was.
- **What to do** `/what-to-do/`: not a warning service; IPMA's warning levels and thresholds; the fire risk classes (with a stated source gap); heat advice from ANEPC; who to follow; 112.
- **About** `/about/`: data path, who made what, licences.
- **Design** `/design/`: three front-page variations (A warnings first, B the map is the page, C your town) for Dinis to choose.
- On every page: the "not a warning service" note, the "pay for what you read" statement linking https://promptugal.news/account/, the version, a "how this page was made" block (code, agents and models, "not yet checked by a person"), a markdown twin (`index.md`). Also `/llms.txt`, `/sitemap.xml`, `/robots.txt`, and the data the pages were built from at `/data/now/<place>.json` and `/data/sync.json`.
- **Build**: `scripts/sync-data.mjs` (copies the Website repository's `data/by-place/now/*.json` and map files; CI runs it before each build), `scripts/build.mjs` + `scripts/site/` (generator), `scripts/validate.mjs` (gate), `scripts/leak-scan.mjs`. Node 18+, no dependencies.

Exists, with a stated limit:

- **Freshness**: pages are static and rebuilt only on a push to `dev`; each page says how old its data is. Nothing rebuilds the site hourly yet.
- **Station readings**: most of the Algarve's nearest stations reported no temperature in the copy read at 17:16 UTC on 17 Nov; pages say "not reported".
- **The Faro district** on the Portugal map is drawn approximately (the mainland south of 37.5 N).
- **Commit identity**: first-version commits carry `Agent: weather@AgentiCCells.dinis`; from 18 Nov the check also accepts `@PrompTugal.dinis` (see below). No commit is signed with an agent key.

Does not exist:

- This team's session key and its entry in `board/keys.json` (keygen was refused by the session's permission settings on 17 and again on 18 Nov).
- Sea state for all coasts beyond IPMA's two Algarve coastal points; seismic data; a live (client-side) refresh.
- Any check of a page by a person.

## Account B, run 1, 18 November 2026 (weather.b@PrompTugal.dinis, from about 09:20 UTC)

Started by conductor.b@PrompTugal.dinis at Dinis's word (PrompTugal__News__Website `board/guidance/2026-11-18-five-sites-on-account-b.md`). Exists in `dev` (live after CI deploys it):

- **Data from data.promptugal.news**: `scripts/sync-data.mjs` reads `https://data.promptugal.news/api/v1/by-place/now/<place>.json` (18 places, same shape as before) and the Portugal-wide `ipma-city-forecasts`, `ipma-warnings`, `ipma-fire-risk`, `ipma-uv` and `ipma-sea` `latest.json` into `data/api/` (served at `/data/api/`). Map files still come from the Website repository. The API answered 200 at about 09:25 UTC; its data was read from IPMA at 02:28 UTC.
- **District capitals**: a page for each of the 17 other capitals (`/places/<id>/`): the district's IPMA warnings, IPMA's five-day city forecast, fire risk for the capital's municipality (code taken from IPMA's place id), and the sea where IPMA has a coastal point of the same name (Lisboa, Porto, Viana do Castelo). From the second run (10:15 UTC) each capital page also shows the nearest IPMA station that reported in the latest hour, within 25 km (`ipma-observations`): 16 of 17 have one (Santarém's is Rio Maior, 24.8 km; Setúbal has none in range and says so). From run 3 (13:30 UTC) each capital page also shows IPMA's UV index for five days (`ipma-uv`, matched by IPMA's place id; where IPMA gives two values for a day the highest is shown), in the WHO's bands.
- **Front page and map**: a table of the 17 capitals (district warning, today, rain, fire risk); the Portugal map colours each capital by its district's highest warning; on /map/ they link to their pages.
- **Masthead** (from the Website's `assets/meter/` and `assets/top/`): the chip "Pay for what you read · free here" linking to `/account/`; the sites rail (Weather, Civic, Startups, Travel, Data) fixed at the right edge on wide screens, a footer row on narrow ones.
- **Free, outside the meter**: IPMA's terms allow no profit-making use, so no page loads the meter or charges anything; the chip, `/account/`, `/about/` and the footer say so. Every page carries `<meta name="page-type" content="free">`.
- **/account/**: the pages read on this site, kept in this browser only (`assets/reading.js`, localStorage `pt.weather.reads`), drawn as the reading graph (adapted from the Website's meter.js). Nothing is sent.
- **Observability**: `assets/obs/obs.js` (the Website's sender) on every page, writing only to lane `weather` in `assets/obs/obs.json`. The lane has no append tokens yet, so **nothing is sent** and the footer says "not counted yet". observability@ on account A issues the tokens.
- **Commit check**: `scripts/check-commits.mjs` accepts `role@PrompTugal.dinis` as well as `@AgentiCCells.` addresses (Dinis's fix 2).

- **Warnings timeline** (run 2): `/map/` shows every IPMA warning above green for the 18 districts as bars over time (`scripts/site/timeline.mjs`, written by weather.b.dev@PrompTugal.dinis, Sonnet), with the same warnings as a table beneath it.

Does not exist yet: the session key; an hourly rebuild; a person's check of any page.
