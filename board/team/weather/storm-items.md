# The Storm site's weather items: this team's plan

weather.b@PrompTugal.dinis, 18 November 2026, about 14:00 UTC. From data.b@PrompTugal.dinis's list (PrompTugal__News__Data `board/team/data/storm-handoff.md`, commit d0ecfa6), passed on by conductor.b@PrompTugal.dinis, under Dinis's guidance of 18 November, 08:50 UTC (the data site carries everything the Storm site built; lose nothing). The list is a proposal; this is what this team takes and in what order. The Storm's data is read from https://data.promptugal.news/api/v1/storm/charles/ (answered 200 at 14:00 UTC), never copied from the frozen Storm repository unless the API lacks it.

Each item lands on `/storms/charles/` (the archive) unless said otherwise. A proposal, in the order this team will do it:

| # | Item (data.b@'s name) | Kind | What this team does | When |
|---|---|---|---|---|
| 1 | Residents under each IPMA level, hour by hour | visualization | Take: on the archive, reusing data.b@'s port (`src/assets/viz/storm-labs.js` in the Data repo) or a build-time SVG from the API's `people-by-hour.json` | next run |
| 2 | Warned against observed: every station on one time axis | visualization | Take: on the archive | next runs |
| 3 | Forecast models side by side (IPMA, MET Norway, Open-Meteo, TAF) | visualization | Take: on the archive, labelled as a record of that week | next runs |
| 4 | Wednesday hour by hour in bands | visualization | Take: on the archive; "our hypothesis" band marked as our analysis | after 3 |
| 5 | Weather face: warnings by hour strip, observations, airport METAR, rain, Madeira | visualization | Take the warnings-by-hour strip (it matches `/map/`'s timeline); the rest as archive panels; drop `data/agents/now.json` (Storm-only, as data.b@ says) | after 4 |
| 6 | Weather face (front page of the Storm) | page | Not rebuilt as a page: its parts come in as 5; the archive links the frozen Storm site for the original | with 5 |
| 7 | IPMA views: map, warnings, sea, cities forecast against observed, reads | visualization | Take the "forecast against observed" view for the live capitals (needs an adapter to data.promptugal.news's shapes) | later |
| 8 | Meteorology lineage: where a forecast comes from | page | Take as `/what-to-do/` companion page "Where a forecast comes from", with its licences file | later |
| 9 | Lineage map (SVG at build time) | visualization | With 8 | later |
| 10 | Meteorology lineage graph and licences | dataset | With 8; read from the API if served there, else ask data.b@ | later |
| 11 | Labs: timelines, decisions, weather | page | Its weather parts are 2 to 4; timelines and decisions are civic.b@'s per data.b@'s list | covered |
| 12 | MeteoAlarm feed browser | visualization | Take a small table of current MeteoAlarm messages for Portugal beside IPMA's warnings (data.promptugal.news collects `meteoalarm-pt`) | later |
| 13 | Broadcast: the storm as a live news channel | page | Not taken for now: its data (`broadcast/data/field.json`, `coast.json`) is not in the archive. Revisit if data.b@ archives it | not now |
| 14 | Wind and pressure field, coast | collector | Not this site's: collectors belong to the Data repo (this site's brief). If data.promptugal.news collects it, the site shows it | data.b@'s |

Nothing here is decided by Dinis; it is this team's order of work.
