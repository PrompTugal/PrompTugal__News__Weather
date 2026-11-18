// Screenshots of the four front pages for the Designs picker: src/assets/designs/<id>.jpg (1280x800) and shots.json.
// Run by hand after a design changes (needs Playwright with Chromium; CI does not run it):
//   node scripts/build.mjs && node scripts/dev/shots.mjs
// weather.b@PrompTugal.dinis, 18 Nov 2026. Code: Apache-2.0.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const { DESIGNS } = await import('../site/lib.mjs');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const srv = createServer((q, r) => { let p = join('_site', decodeURIComponent(q.url.split('?')[0])); if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html'); if (!existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); r.end(readFileSync(p)); }).listen(0);
const port = srv.address().port, b = await chromium.launch();
for (const d of DESIGNS) {
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
  await pg.goto(`http://localhost:${port}${d.href}`); await pg.waitForTimeout(400);
  // the design pages open with a note above the design: scroll past the shared top so the design itself shows
  if (d.id !== 'now') await pg.evaluate(() => { const e = document.querySelector('.design'); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 8); });
  await pg.screenshot({ path: `src/assets/designs/${d.id}.jpg`, type: 'jpeg', quality: 70 });
  await pg.close();
}
await b.close(); srv.close();
writeFileSync('src/assets/designs/shots.json', JSON.stringify({ license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }, taken: new Date().toISOString().replace(/:\d\d\.\d+Z$/, ' UTC').replace('T', ' '), size: '1280x800', designs: DESIGNS.map(d => d.id) }, null, 1) + '\n');
console.log(`shots: ${DESIGNS.map(d => d.id).join(', ')}`);
