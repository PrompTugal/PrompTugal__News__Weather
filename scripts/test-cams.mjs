#!/usr/bin/env node
// Tests for scripts/site/cams.mjs: cameras are credited links only (Dinis, 19 Nov 2026, about 17:40 UTC, Website repo
// board/guidance/2026-11-19-cameras-as-links-and-the-map.md): no frame, image or stream; https links to known operator
// hosts only; text escaped. weather.b@PrompTugal.dinis. Code: Apache-2.0.
import { camUrl, camsSection, camerasPage } from './site/cams.mjs';

const results = [];
const t = (name, fn) => { try { results.push({ name, pass: fn() === true }); } catch (e) { results.push({ name, pass: false, got: e.message }); } };
const cam = (o = {}) => ({ id: 'c1', name: 'Cam', place: 'faro', operator: 'Op', page: 'https://www.skylinewebcams.com/x.html', terms_page: 'https://www.skylinewebcams.com/terms.html', embed: '<iframe src="https://evil.example/"></iframe>', embed_allowed: true, state: 'up', checked_at: '2026-11-19T18:00:00Z', provenance: {}, ...o });
const api = (cams) => ({ cams: { read_at: '2026-11-19T18:00:00Z', cameras: cams } });

t('SkylineWebcams and MEO BeachCam links are allowed', () => !!camUrl('https://www.skylinewebcams.com/en/webcam/portugal/algarve/faro/faro.html') && !!camUrl('https://beachcam.meo.pt/livecams/faro/'));
t('any other host, http, a port or a password is refused', () => [ 'https://evil.example/', 'http://beachcam.meo.pt/', 'https://beachcam.meo.pt:8443/', 'https://u:p@beachcam.meo.pt/', 'javascript:alert(1)' ].every((u) => camUrl(u) === null));
t('no frame, image or video is ever drawn, even when the register says an embed is allowed', () => { const h = camsSection(api([cam()]), 'faro').html + camerasPage(api([cam()]), () => 'Faro').body; return !/<(iframe|img|video|embed|object)\b/i.test(h) && !/evil\.example/.test(h); });
t('a camera on an unknown host is left out and counted', () => { const p = camerasPage(api([cam(), cam({ id: 'c2', page: 'https://evil.example/' })]), () => 'Faro'); return p.count === 1 && /1 listed camera is left out/.test(p.body); });
t('names and terms text are escaped', () => { const h = camsSection(api([cam({ name: '<script>x</script>', terms_summary: '"><img src=x>' })]), 'faro').html; return !/<script>|<img src=x>/.test(h); });
t('the markdown twin holds no link markup from the register', () => { const m = camsSection(api([cam({ name: 'a [b](https://evil.example)' })]), 'faro').md; return !/\]\(https:\/\/evil/.test(m); });

for (const r of results) if (!r.pass) console.log(`FAIL  ${r.name}${r.got ? '  [' + r.got + ']' : ''}`);
const bad = results.filter((r) => !r.pass);
if (bad.length) { console.error(`test-cams: ${bad.length} of ${results.length} failed`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
