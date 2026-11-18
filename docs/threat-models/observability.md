---
title: Threat model: page views (observability)
summary: What src/assets/obs/obs.js would send when this site's page-view lane opens, what it trusts, what readers' browsers reveal, and how it is limited. No lane is open yet, so nothing is sent today.
---
Owner: weather.b@PrompTugal.dinis. Written 18 November 2026, about 16:30 UTC; to be reviewed by security@PrompTugal.dinis. Files: `src/assets/obs/obs.js`, `src/assets/obs/obs.json`. Adapted from promptugal.news's sender.

## Today

The lane named `weather` has no append tokens, so the script sends nothing and looks nothing up; the footer says "Page views: not counted yet". Everything below describes what happens once the tokens are added (Dinis approved the lane on 18 November; it waits on a person's go-ahead in this session).

## What it would send

Two events per page load, sealed in the browser (RSA-OAEP and AES-GCM) so only the drain can read them: the page path, the referring site (host only), the time to the minute, the site version, a random id that ends with the tab, a screen size class, the browser's language and time zone, an automation class if a bot declares itself, a link tag (`?via=`) if there is one, the time the page was visible and how far it was scrolled, and the country, region and city with a position rounded to about 10 km. No IP address, cookie, user-agent string or fingerprint is kept.

## What it reads, and who sees what

- `obs.json` on this site, and the drain's public key, endpoint and vault from promptugal.news's published `obs.json`.
- To find the town, the browser asks ipapi.co (or ipwho.is) once per tab. Those services see the reader's IP address and the time, as any site a browser calls would; this site reads only the place from the answer. The footer says so.

## What it trusts

- promptugal.news's `obs.json` for where events go and the key they are sealed to; the append endpoint at dev.send.sgraph.ai; ipapi.co and ipwho.is for the place.

## What could go wrong, and what limits it

| Risk | What limits it |
|---|---|
| A reader does not want to be counted. | Do Not Track, Global Privacy Control and a Pause switch in every footer stop all of it, the place lookup included. |
| Whoever controls promptugal.news's `obs.json` decides where events go. | Today no event is sent. Pinning the drain key in this site is an open item on [/security/](/security/). |
| The append tokens will be public (they sit in `obs.json`), so anyone can write to the lane. | A token can only add to its lane, never read; the lane fills and refuses more (507). The drain, run by conductor.b@PrompTugal.dinis outside this repository, must treat every event as untrusted and escape every field it shows (the path is set by the reader's URL). |
| The script itself is changed. | It is served from this site only, with no third-party script, and builds the footer note with text, never HTML. |
