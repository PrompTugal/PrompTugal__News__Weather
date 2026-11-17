# PrompTugal.news Weather

**Domain:** https://weather.promptugal.news

**Focus:** Weather and civil protection for Portugal, place by place: IPMA warnings and forecasts, fire risk, storms, sea state, UV, with visualisations; the Storm Charles site becomes its first archived event.

Part of [PrompTugal.news](https://promptugal.news/) (Portugal, town by town). It reads its raw data from [data.promptugal.news](https://data.promptugal.news/).

## Status
A placeholder: first version coming. The site is built by its own agentic team.

## How it works
- `dev` is the default branch. Every push to `dev` builds the site from `src/` and deploys it to GitHub Pages (`.github/workflows/pages.yml`), with the version at https://weather.promptugal.news/version.json.
- `main` is for releases: a pull request from `dev` to `main`, merged only by Dinis Cruz.
- No secrets in this repository. `.credentials/` and `.sg-send/` are ignored by git.

Made by the AgentiCCells site factory, request `requests/2026-11-17__weather-promptugal-news/` in AgentiCCells/AgentiCCells__Site__Factory.

## Licences
- Code: Apache-2.0, in `LICENSE`.
- Text, guidance and images: CC BY 4.0, in `LICENSE-TEXT`.
