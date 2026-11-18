# Hand-over debrief: account B, first run

weather.b@PrompTugal.dinis (Claude Code cloud session, Opus), 18 November 2026, about 09:20 to 09:50 UTC. Started by conductor.b@PrompTugal.dinis at Dinis's word (Website repo `board/guidance/2026-11-18-five-sites-on-account-b.md`). No sub-agents ran in this run. Carries on from `2026-11-17-first-version.md`.

## The six fixes

1. **Session key: not done.** `node pki-agent.mjs keygen --session` (downloaded from pki.sgit.ai and read first: keygen is local only, no network) was refused by this session's permission settings, as on account A. I did not work around it. `board/keys.json` records the gap; the id to publish is `weather.b-promptugal`.
2. **Commit check: done.** `scripts/check-commits.mjs` now accepts `role@PrompTugal.dinis` (only that address) as well as `@AgentiCCells.`. Tested: `weather.b@PrompTugal.dinis` passes; `x@promptugal.dinis.evil` and `x@PrompTugal.other` fail.
3. **Masthead: done**, adapted. The chip reads "Pay for what you read · free here", not a £ balance: the balance lives in promptugal.news's localStorage, which this origin cannot read, and nothing here is charged (fix 4). The sites rail is fixed at the right edge above 1180px wide, a footer row below. The reading graph is on `/account/`, drawn from a local log of pages read here.
4. **IPMA pages free: done.** Every page is built on IPMA data, so no page loads the meter. Said on the chip, `/account/`, `/about/` and the footer.
5. **data.promptugal.news: done.** The per-place files come from its API (same shape as the Website copies). The API also publishes Portugal-wide city forecasts, warnings and fire risk, which made the district capital pages possible.
6. **Observability: done, lane pending.** `obs.js` is on every page with lane `weather`, but `obs.json` has no tokens for it, so nothing is sent until observability@ on account A issues them. Lane name in `status.json` for conductor.b@ to relay.

## What else changed

- 17 district capital pages, a capitals table on the front page, capitals coloured by district warning on the map. See `REALITY.md`.
- The municipality code for fire risk comes from IPMA's place id (1141600 is DICO 1416); I checked all 17 against the nearest municipality in the fire file (16 match; Santarém's centre is nearer 1403, but the id says 1416, which is Santarém).

## What I learnt

- The API's `ipma-uv` file has entries with empty names and several values per day; I left UV off the capitals rather than guess. Worth a word with data.b@.
- The leak scan flags any public key outside team/keys, so `obs.json` reads the drain key from promptugal.news's published obs.json (it sends CORS `*`) instead of copying it.
- The pages are 7 hours behind the API at build time: CI rebuilds only on push. An hourly schedule needs Dinis's yes.

## For Dinis

- Front page A, B or C on `/design/`.
- Allow the keygen step in this environment's permissions, or say how this team signs.
- May CI rebuild hourly?
- The chip says "free here": keep, or say what it should show.

## Next

Station readings for the capitals (`ipma-observations`), UV once the file is understood, a warnings timeline by district, and an hourly rebuild if allowed.

## Run 2 (scheduled wake, 10:14 UTC)

- No HOLD. Run 1 deployed as v0.1.6 (checked at 10:14 UTC). New guidance since run 1 (08:50, the data site carries the Storm site's work) is for data.b@; nothing in it changes this site's work.
- Data re-synced: data.promptugal.news is at v0.1.9; `ipma-observations` added to the sync.
- Station readings on every capital page and a Now column in the front page's capitals table: nearest station reporting in the latest hour, within 25 km. Santarém reads Rio Maior (24.8 km); Setúbal has none in range and says so.
- A warnings timeline by district on `/map/`. weather.b.dev@PrompTugal.dinis (Sonnet sub-agent) wrote `scripts/site/timeline.mjs` to a brief with one file in scope; I reviewed it, wired it in and checked it at 1300 and 390 px (no horizontal scroll). At phone width the bar labels are small, so the same warnings sit in a table beneath.
- The session key was not retried: the refusal is a permission setting, which only Dinis can change.

## Run 3 (scheduled wake, 13:14 UTC)

- No HOLD; no new guidance since 08:50. Run 2 live as v0.1.8. data.promptugal.news now v0.1.11; its UV file now explains itself (places by IPMA place id; id 0 has several values a day and no place).
- UV for the 17 capitals: matched by place id (the same id as the city forecast), highest value each day where IPMA gives two, banded as the WHO's Global Solar UV Index. All low today (0.2 to 2.7).
- No sub-agent this run: the piece was small and touched the shared generator.

## Between wakes (14:00 to 14:45 UTC): messages from conductor.b@

- The Storm site's 14 weather items (data.b@'s list): planned in `board/team/weather/storm-items.md`; Broadcast's wind map taken once data.b@ showed its data is on data.promptugal.news (checked: both files 200).
- Dinis's licence rule (about 14:25 UTC; read in the Website repo's guidance before acting): licence or "the source's terms" on every source line and in every published JSON; footer and markdown twins list them. Gap left: terms links for the Storm archive's ~20 outside sources, for the next run.
