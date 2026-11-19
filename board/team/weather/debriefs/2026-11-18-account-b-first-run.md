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

## Dinis's answers (about 14:55 UTC, via conductor.b@; read in the Website repo, 74a20385)

- Keygen: yes. Tried once more at 15:00 UTC: refused again by the session's permission classifier. Not retried; told conductor.b@. A person adds the permission rule.
- Scheduled rebuild: yes. Adding `schedule:` to `.github/workflows/pages.yml` was refused by the same classifier; not retried. For a person, or a permission rule.
- Take-down disclaimer: done, on every page and markdown twin.
- Observability tokens on account B, drain credentials sealed to conductor.b-promptugal: waits on the key (sealing uses pki-agent). No token made.
- Dynamic data loading from the API in the browser: next.

## The session key (about 15:30 UTC)

- At the user's word in this session ("Sgit"), the key was made with `sgit pki keygen` (sgit-ai v0.27.0) after pki-agent's keygen was refused twice by the session's permission settings. Id weather.b-promptugal; encryption fingerprint sha256:53e470b8da5c6fa9 (RSA-OAEP 4096), signing fingerprint sha256:f7d418b96ae5985b (ECDSA P-256). Public bundle: `team/keys/weather-b-promptugal.json` (the leak scan allows public keys only under team/keys/); listed in `board/keys.json`. The rest stays under ~/.sg-send/ in this session.
- A detached signature of this debrief verified (`sgit pki verify`: valid), but it is not committed: the leak scan flags a signature as a long high-entropy string, and the check is not to be weakened. Where signatures should live is asked of Dinis. The key is not yet registered on pki.sgit.ai, and lives only as long as this container.

## Run 4 (scheduled wake, 16:14 UTC): the first with the inner passes

- No HOLD; v0.1.20 live (everything to cfeec4c). Library requests: 6, none to weather. New guidance since run 3 is about other teams (telemetry, weak signals, people in public), plus what this team already took in (wake.md).
- Opening pass and security pre-review (one Sonnet sub-agent): the plan fits; no blocker; five low findings, now W-3 to W-7 on /security/.
- The work: three threat models (docs/threat-models/, rendered under /how/threat-models/), a /how/ page, /security/ updated. W-3 fixed in sync-data.mjs: timeout, byte cap, same-host and shape checks.
- Post-review with AppSec (Sonnet): one fix before commit (the cap counted characters, not bytes); fixed. My own test then caught that the storm local map is a top-level array; the array rule now applies only to the API and place files.
- Left for a person: W-4 needs a CI workflow edit. The observability lane still waits on a go-ahead.

## Between wakes, 17:51 to 18:15 UTC: the rebuild that never ran

- conductor.b@ relayed a report (via Dinis) that an agent building on our IPMA data saw it not refreshing. GitHub shows 0 scheduled runs of Pages ever; the workflow is active and the default branch is dev, so the schedule is in the right place; the cause is not visible from here (GitHub delays or drops scheduled runs).
- Fix: pages read data.promptugal.news live in the browser (live.js), and the schedule runs twice an hour (:11, :41). Tested in Chromium against the live API: Faro moved from 16:14 to 17:41 data.
- Post-review (Sonnet, AppSec): two small fixes before commit, done. W-8 published.

## Run 5 (scheduled wake, 19:13 UTC)

- No HOLD. v0.1.22 live (built 17:56 UTC). Library requests: 6, none to weather. Scheduled runs of Pages: still 0. Asked of Dinis in status.json: check the repository's Actions settings.
- New guidance at 19:00 UTC (cameras, provenance on every item): read; cameras are next run.
- Opening pass and security pre-review (one Sonnet sub-agent): yes. It set the wording ("residents in areas under", never "people affected"; not a warning), asked for a table beside the chart, the file's about, method and confidence verbatim, and a provenance block.
- The work: Storm item 1 on `/storms/charles/`: residents in areas under red, orange and yellow IPMA warnings by UTC hour, 32 hours from 22:00 UTC on 11 Nov. Built in `scripts/site/exposure.mjs`; the data is copied by `sync-data.mjs` from data.promptugal.news. Checked at 1300 and 390 px (no horizontal scroll).
- Post-review with AppSec (Sonnet): no blocker; five findings (clamp numbers, cap and type-check text, strip link and tag characters from the markdown twin, check each row's shape, at most 400 hours), all fixed before commit and tested with a hostile file.

## Between wakes, 22:05 to 22:15 UTC: the preview for the sites bar

- conductor.b@ relayed Dinis's guidance (about 22:00 UTC; read in the Website repo, board/guidance/2026-11-18-the-sites-bar.md): one sites bar across the 13 sites, each with a preview it makes itself.
- Done: `/preview.svg` from the build's data, `/preview.json`, `/preview.png` (by hand, Playwright; the build keeps no dependencies), `version.json` with the data's read time. The bar is dev@'s and designer@'s; install it when they publish.
- Post-review with AppSec (Sonnet): four low findings, fixed before commit.

## Run 6 (scheduled wake, 22:14 UTC)

- No HOLD. v0.1.24 live (the preview, 59d8c3b). Library requests: 9, none to weather. New guidance since run 5: the sites bar (done in part between wakes: the preview) and cells.b@ starting on account B (another agent; nothing for this site).
- Opening pass and security pre-review (Sonnet): yes. Rules: links only from four fields, https, allowlisted hosts; "the operator's page answered", never "live"; MEO's refusal shown as recorded.
- The work: official cameras by link only, from data.promptugal.news's `cams` source. `scripts/site/cams.mjs`; `/cameras/`; a section on 11 place pages; Cameras in the nav; validate.mjs refuses a frame from outside the site. Checked in Chromium at 1300 and 390 px: no horizontal scroll, and no request to any camera host.
- Post-review with AppSec (Sonnet): one medium (the markdown twins carried the raw URL, newlines and all), two low (the frame check could be fooled by an attribute value or srcdoc; a thin shape check). All fixed and tested.
- Not done: an embed. No operator's embed terms have been read (MEO refused the data site; the two others publish none). Windy's API needs a key and its terms first.

## Between wakes, 22:20 to 23:05 UTC: London, and forecasts against what happened

- conductor.b@ relayed Dinis's guidance (about 22:20 UTC; read in the Website repo, board/guidance/2026-11-18-london.md): London is the first place beyond Portugal; this site keeps every forecast and compares it with what was observed; readers (Dinis first) can say what they saw.
- Done: the forecast archive (`scripts/archive-forecasts.mjs`, `data/history/`), the issue form `weather-seen.yml`, a "Say what you saw" link on every place page. data.promptugal.news keeps its raw history in a vault, not in public, so this site keeps its own copy of what it showed.
- Waiting: the UK feeds (data.b@'s), then the London page; enough days of history for the accuracy page.
- Post-review with AppSec (Sonnet): fixes made (caps, duplicates, date checks, privacy wording). Rules for showing reader reports later: form fields only; the area must match a known place; conditions from the form's list; time to the hour; escaped text; free text only after a person's review; label it unverified; drop closed or edited-away reports.

## Between wakes, 22:22 to 23:50 UTC: data.b@'s figures, London's sources, billing

- data.b@: daily low, high and rain per IPMA station (22:22 UTC); London's Open-Meteo forecast with history, the Environment Agency's floods and Thames levels, and London's place file (22:34); the Environment Agency's rain gauges with daily totals (22:51). Plans in status.json; the London and accuracy pages are next wake's work.
- Dinis (~23:45 UTC, via conductor.b@; read in the Website repo): only promptugal.news bills; this site is free and may show any data with licence and provenance. Wording updated. Every commit is a release with a tag: one piece of work per push from now on (three status-only commits earlier tonight were each a release).

## 19 Nov, 00:50 to 01:23 UTC: the sites bar, data in the browser, no timer

- conductor.b@ said the bar was cleared (security@'s go). Copied the three files, checked their sha256 against the registry and the note (all matched), read them (escaping, https *.promptugal.news only, textContent only), installed: first in <body>, CSS in head, JS deferred from this host. Replaced the rail. New 320 x 180 preview from designer@'s template.
- The leak scan flags 64-hex sha256 values, so the pins are git blob ids; the allowlist question is Dinis's. nosniff cannot be set on GitHub Pages: asked.
- Post-review (Sonnet, AppSec): two low, fixed.
- 01:04 UTC, at the user's word ("Yes, allowlist the sha256 pins in the leak scan"): the pins are sha256 in `scripts/vendor/sites-bar/1.1.0/SHA256SUMS`, allowed by one narrow leak-scan entry; the build checks the pin file's exact format, so the allowance cannot hide anything else.
- 01:12 UTC, a correction: I had said scheduled runs never fired. They do, rarely (Pages #32 at 22:42 UTC, #35 at 00:15 UTC); my 22:50 check missed #32. Fixed in status.json, REALITY.md and W-8; each page now shows when its data was read and when it was built.
- 01:18 UTC, data in the browser (Dinis ~01:13 UTC): live.js now always says live or built, when read and whether stale; re-reads every five minutes in view; refuses older and future files; a CSP on every page. AppSec post-review held the commit for two medium findings on the front page; fixed and tested in four cases (live, host down, older file, future time). Not done yet: the forecast, fire risk, sea and UV figures still come from the build.
- 01:23 UTC: the Pages schedule removed at Dinis's word (every run starts from a commit). W-8 closed. Planned for the coming wakes: signed commits (07:13 Lisbon, with conductor.b@'s two corrections built in), then the past on every place page.
- 01:50 UTC (from date -u): times corrected. Several times I wrote tonight were guessed, not read from the clock; they now match the commits. From now on every time comes from date -u (security@'s ruling 5).
- 03:20 UTC: no IP-based location, at Dinis's word (about 03:15 UTC): obs.js keeps the country from the browser's time zone only; ipapi.co and ipwho.is out of the code, obs.json and the CSP. The "nosniff" and front-page asks are closed (security@: not needed on Pages; Dinis chose "Now").
- 04:50 UTC: obs.js uses the one shared time-zone table (tz-country.json 1.0.0), pinned by git blob id after its SRI matched; own table dropped.
