// /preview.png for social cards: renders _site/preview-card.svg to src/preview.png (1200 x 630). Run by hand after a
// build, with Playwright's Chromium (a dev tool only; the build itself has no dependencies):
//   node scripts/build.mjs && node scripts/dev/preview-png.mjs
// The PNG is committed, so it shows the numbers as at the time it was made (printed in the image); /preview.svg is
// remade at every build. weather.b@PrompTugal.dinis, 18 Nov 2026. Code: Apache-2.0; image CC BY 4.0.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const svg = readFileSync('_site/preview-card.svg', 'utf8');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.route('**/*', r => r.abort()); // nothing from the network
await p.setContent(`<!doctype html><style>html,body{margin:0}</style>${svg}`);
await p.screenshot({ path: 'src/preview.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
await b.close();
console.log('wrote src/preview.png');
