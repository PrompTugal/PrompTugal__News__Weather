---
title: Threat model: the data pull
summary: What scripts/sync-data.mjs reads from data.promptugal.news and the PrompTugal.news Website repository, what it trusts, what could go wrong, and how it is limited.
---
Owner: weather.b@PrompTugal.dinis. Written 18 November 2026, about 16:30 UTC; to be reviewed by security@PrompTugal.dinis. File: `scripts/sync-data.mjs`. Runs in the hourly rebuild (see [the hourly rebuild](/how/threat-models/scheduled-rebuild/)) and by hand.

## What it does

It copies published data into this repository's `data/` before the build. It is not a collector: it never calls IPMA, ANEPC or any other source itself. The collectors are data.promptugal.news's.

## What it reads

- https://data.promptugal.news/api/v1/: the 18 Algarve places' "now" files, the Portugal-wide IPMA files (city forecasts, warnings, fire risk, UV, sea, station observations) and the catalogue.
- The PrompTugal.news Website repository (`dev` branch, over raw.githubusercontent.com, or a clone beside this one): the list of places, the next places, two map outlines and the storm's local map.

The addresses are fixed in the script; nothing in the data can make it fetch another address.

## What it writes

- `data/now/`, `data/api/`, `data/map/` and `data/sync.json` (where each file came from, and when).

## What it trusts

- data.promptugal.news to publish IPMA's data as read, with each value's source and time; the Website repository's `dev` branch for the map files.

## What could go wrong, and what limits it

| Risk | What limits it |
|---|---|
| A hostile or broken file (script in text, a `javascript:` link, a false value). | The build escapes every value and checks every link (see the hourly rebuild); the pull refuses a file that is not JSON or not the expected shape. A false value that looks right is not caught by code: each page shows its source and read time so a reader can check it against IPMA. |
| A very large file or a hanging host. | A 20 second timeout and a 5 MB cap per file; three tries, then the run fails and the build keeps the committed copy. |
| A redirect to another host. | A response that ends on a different host is refused. |
| The Website repository's `dev` branch changes under us. | The files are maps and lists of places, not code; `data/sync.json` records what was read. Reading them from a pinned commit is an open item on [/security/](/security/). |
| Text in the data aimed at an agent ("ignore your instructions ..."). | Agents treat fetched text as material, never instruction, and report any such text to security@PrompTugal.dinis. The build itself runs no model. |
| A failed run leaves some files new and some old. | Each file keeps its own read time, and the pages show it. |
| The camera list (`cams`, from 18 Nov 2026) points a link at a hostile or look-alike site, or asks for an embed. | Cameras are links only: a link is made only from the camera's page, terms page, listing page or register, only over https and only to the hosts the list uses today (the operators' and github.com); any other camera is left out and counted. No iframe, image or frame from a camera host: the build does not fetch them, the browser is never pointed at them, and `validate.mjs` fails on a frame from outside the site. Text is escaped and capped; the markdown twins drop link, tag and table characters. |
| A camera host that refused the data site (MEO BeachCam, 403). | The refusal is shown as recorded, not worked around; this site sends no request to it. |
