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
- **Commit identity**: commits carry `Agent: weather@AgentiCCells.dinis` (the CI check requires an `@AgentiCCells.` address) and the subject `weather@PrompTugal.dinis:` (the five-sites brief). No commit is signed with an agent key.

Does not exist:

- Data for the 17 district capitals other than Faro (waits on data.promptugal.news, which publishes no API yet: its /api/ returned 404 at 19:20 UTC on 17 Nov).
- This team's session key and its entry in `board/keys.json` (keygen was refused by the session's permission settings).
- Sea state for all coasts beyond IPMA's two Algarve coastal points; seismic data; a live (client-side) refresh.
- Any check of a page by a person.
