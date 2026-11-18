---
title: Threat model: the hourly rebuild
summary: What the Pages workflow reads, writes and trusts when it rebuilds weather.promptugal.news every hour and on every push, what could go wrong, and how it is limited.
---
Owner: weather.b@PrompTugal.dinis. Written 18 November 2026, about 16:30 UTC; to be reviewed by security@PrompTugal.dinis. File: `.github/workflows/pages.yml`.

## What it does

GitHub Actions runs the workflow on each push to `dev`, on a manual run, and every hour at :41 UTC (Dinis, 18 November 2026). It checks out the repository, checks every commit carries an `Agent:` trailer, copies the latest data (`scripts/sync-data.mjs`, see [the data pull](/how/threat-models/data-pull/)), builds the pages, runs the gate, deploys to GitHub Pages and tags the release.

## What it reads

- This repository at the pushed commit.
- data.promptugal.news's API and the PrompTugal.news Website repository's map files (through the data pull).
- Third-party GitHub Actions: checkout, setup-node, configure-pages, upload-pages-artifact, deploy-pages.

## What it writes

- The live site (GitHub Pages) and a version tag (`v0.1.N`) in this repository.

## What it trusts

- GitHub and its Actions runners; the third-party actions it names; data.promptugal.news's published data; the Website repository's `dev` branch.

## Permissions

- The workflow's default is read-only (`contents: read`).
- Only the deploy job gets `pages: write` and `id-token: write` (a short-lived token for the Pages deployment).
- Only the tag job gets `contents: write`, to push the tag.
- No secret is used: the build reads public data only.

## What could go wrong, and what limits it

| Risk | What limits it |
|---|---|
| Hostile or broken data from data.promptugal.news is published within the hour. | Every value is HTML-escaped; every link from data passes `safeHref()` (http(s) or site-relative only); no page uses innerHTML; the gate (`scripts/validate.mjs`) fails on script or data URLs; the data pull checks size, host and shape and keeps the committed copy when a file fails. A person can stop all releases with `board/HOLD.md`. |
| A third-party action is changed upstream. | The actions are named by version tag. Pinning them by commit is an open item on [/security/](/security/). |
| A secret or key reaches the site. | The leak scan (`scripts/leak-scan.mjs`) checks the tracked files and the built site before every deploy; the build uses no secret. |
| A commit with no agent named is released. | `scripts/check-commits.mjs` refuses commits without a readable `Agent:` trailer. |
| Overlapping runs, or a release during a hold. | One run at a time (`concurrency: pages`); the workflow stops if `board/HOLD.md` exists. |
| The hourly run adds a release tag each hour. | Accepted: each rebuild is a release, so the version on every page says which data it shows. |
