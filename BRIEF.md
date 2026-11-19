# BRIEF: weather.promptugal.news

The focus of this site, in full, as given to its lead agent, weather@PrompTugal.dinis, by conductor@PrompTugal.dinis at Dinis Cruz's word in his own session, 17 November 2026 (about 19:10 UTC). Read with PrompTugal/PrompTugal__News__Website `board/briefs/2026-11-17-the-five-sites.md`, which says what all five sites share and what a first version is.

> Your focus: weather and civil protection for Portugal, place by place, with visualisations: IPMA warnings and forecasts, fire risk, storms, sea state, UV, what to do and who to follow (IPMA and ANEPC are the authorities; say clearly the site is not a warning service). A Portugal map of warnings and fire risk, a page per place (the Algarve's 17 towns and the district capitals first), the storm archive. Read your data from data.promptugal.news's APIs as soon as the Data team publishes them (its lead is data@PrompTugal.dinis); until then read the Website repo's data/by-place/now/ files. Do not run collectors here: they belong to the Data repo.
>
> Deliver the first version as the brief describes, write your hand-over debrief, message the conductor's session in five lines, then stop.

Dinis's own words, as the five-sites brief quotes them (17 November 2026): "let's do them all in one go ... spin up an agentic team for them to set them up (Opus and Sonnet), and then once we have the first version that we are happy with, we archive them, and I start them on a schedule on my other Claude account".

## The first version (from the five-sites brief)

1. The repo set up to the estate's standard; the site live at its domain over HTTPS.
2. A front page and the three to five core pages that show the focus with real data.
3. One design pass: three variations of the front page side by side for Dinis to choose (`/design/`).
4. `REALITY.md` true; a hand-over debrief in `board/team/weather/debriefs/2026-11-17-first-version.md`.
5. Tell the conductor in five lines. Then stop.

## Account B, 18 November 2026

The fixes and the carry-on, as given to weather.b@PrompTugal.dinis by conductor.b@PrompTugal.dinis at Dinis's word. Dinis's words, as kept in PrompTugal__News__Website `board/guidance/2026-11-18-five-sites-on-account-b.md` (given about 02:30 UTC on 18 Nov 2026): "You don't need to add observability to the main website. That's already happening and draining from the other site, from my other account. You just need to add observability here ... remember that all your ones here should have, the main ones should have .b ... add observability to all the other sites like the data and the stuff."

The fixes from that guidance: make the session key and sign; the commit check accepts @PrompTugal.dinis agents; the masthead chip "Pay for what you read · £balance", the reading graph on the account page and the sites rail; pages built on IPMA data stay free, outside the meter, until Dinis decides; read data.promptugal.news's `/api/v1/by-place/now/<place>.json`; obs.js with a lane of its own ("weather"). Then carry on from the debrief and make the site better every run. Dinis keeps for himself: front page A, B or C on `/design/`.

## Dinis's decisions recorded here

- 19 November 2026, about 01:35 UTC, in weather@PrompTugal.dinis's session, on the front page designs: "I like the \"now\" option". The front page stays the live one (Now); A, B and C are kept at `/design/` as a record.
