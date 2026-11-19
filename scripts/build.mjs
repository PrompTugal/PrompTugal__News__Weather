// Build: copy src/ to _site/, generate the pages from data/ and content/ (scripts/site/generate.mjs),
// copy the data the pages were built from, stamp the version, write version.json.
// SITE_VERSION is set by CI only (v0.1.N); a local build says "dev".
import { cpSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const version = process.env.SITE_VERSION || 'dev';
const BUILT = (d => `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`)(new Date());
// the pieces copied from promptugal.news (the sites bar, the time-zone table), checked against the live registry's pins
// (scripts/vendor-check.mjs, its tests first). A version the registry no longer lists, or a registry that cannot be read,
// leaves the piece out, never shipped unchecked; different bytes stop the build.
const { execFileSync } = await import('node:child_process');
try { execFileSync(process.execPath, ['scripts/test-vendor-check.mjs'], { stdio: ['ignore', 'ignore', 'inherit'] }); } catch { console.error('vendor-check: its tests failed; not building'); process.exit(1); }
const { checkVendored, readRegistry } = await import('./vendor-check.mjs');
let VENDOR; try { VENDOR = checkVendored(await readRegistry()); } catch (e) { console.error(e.message); process.exit(1); }
process.env.VENDOR_STATE = JSON.stringify(VENDOR);
for (const v of Object.values(VENDOR)) console.log(v.note);
rmSync('_site', { recursive: true, force: true });
cpSync('src', '_site', { recursive: true });
if (!VENDOR['time-zone table'].on) rmSync('_site/assets/obs/tz-country.json'); // obs.js then sends no country
await import('./site/generate.mjs');
cpSync('data/now', '_site/data/now', { recursive: true });
cpSync('data/api', '_site/data/api', { recursive: true });
if (existsSync('data/storm')) cpSync('data/storm', '_site/data/storm', { recursive: true });
cpSync('data/sync.json', '_site/data/sync.json');
// every JSON file published carries a licence (Dinis, 18 Nov 2026; see LICENCES in scripts/site/lib.mjs)
const { LICENCES } = await import('./site/lib.mjs');
const lic = k => ({ name: LICENCES[k].name, url: LICENCES[k].url, of: LICENCES[k].of });
const walkJ = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walkJ(p) : [p]; });
for (const f of walkJ('_site/data').filter(f => f.endsWith('.json'))) {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  if (j.license) continue;
  const text = JSON.stringify(j);
  const data = [/api\.ipma\.pt|IPMA/.test(text) && lic('ipma'), /adsb\.lol/.test(text) && lic('adsb'), /meteoalarm/i.test(text) && lic('meteoalarm')].filter(Boolean);
  const license = { compilation: lic('ours'), data: data.length ? data : [lic('ours')] };
  writeFileSync(f, JSON.stringify(Array.isArray(j) ? { license, items: j } : { license, ...j }, null, 1) + '\n');
}
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk('_site')) {
  if (!/\.(html|js|css|json|md|txt|svg)$/.test(f)) continue;
  const s = readFileSync(f, 'utf8');
  if (s.includes('__VERSION__') || s.includes('__BUILT__')) writeFileSync(f, s.replaceAll('__VERSION__', version).replaceAll('__BUILT__', BUILT));
}
writeFileSync('_site/version.json', JSON.stringify({ license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }, version, commit: process.env.GITHUB_SHA || 'local', built: new Date().toISOString(), data_read_at: JSON.parse(readFileSync('_site/preview.json', 'utf8')).read_at, preview: { svg: '/preview.svg', card_svg: '/preview-card.svg', png: '/preview.png', figures: '/preview.json' }, sites_bar: VENDOR['sites bar'].on ? VENDOR['sites bar'].version : VENDOR['sites bar'].note, tz_country: VENDOR['time-zone table'].on ? VENDOR['time-zone table'].version : VENDOR['time-zone table'].note }, null, 2) + '\n');
writeFileSync('_site/.nojekyll', '');
console.log(`built _site/ (${version})`);
