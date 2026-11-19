// Build: copy src/ to _site/, generate the pages from data/ and content/ (scripts/site/generate.mjs),
// copy the data the pages were built from, stamp the version, write version.json.
// SITE_VERSION is set by CI only (v0.1.N); a local build says "dev".
import { cpSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const version = process.env.SITE_VERSION || 'dev';
const BUILT = (d => `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`)(new Date());
// the vendored sites bar must be exactly the reviewed files (scripts/vendor/sites-bar/README.md): each one's sha256 is
// pinned in SHA256SUMS (the values the registry and conductor.b@'s install note gave). The pin file itself must hold
// exactly the three lines below and nothing else (the leak scan allows high-entropy text in it for that reason only).
const { createHash } = await import('node:crypto');
const BAR_FILES = ['scripts/vendor/sites-bar/1.1.0/sites-bar-render.mjs', 'src/assets/sites-bar/1.1.0/sites-bar.css', 'src/assets/sites-bar/1.1.0/sites-bar.js'];
const pins = readFileSync('scripts/vendor/sites-bar/1.1.0/SHA256SUMS', 'utf8').split('\n').filter(Boolean).map(l => /^([0-9a-f]{64})  (\S+)$/.exec(l));
if (pins.length !== BAR_FILES.length || pins.some((m, k) => !m || m[2] !== BAR_FILES[k])) { console.error('scripts/vendor/sites-bar/1.1.0/SHA256SUMS: not the expected three pins; not building'); process.exit(1); }
for (const [, h, f] of pins) if (createHash('sha256').update(readFileSync(f)).digest('hex') !== h) { console.error(`${f}: sha256 differs from the reviewed file; not building`); process.exit(1); }
rmSync('_site', { recursive: true, force: true });
cpSync('src', '_site', { recursive: true });
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
writeFileSync('_site/version.json', JSON.stringify({ license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }, version, commit: process.env.GITHUB_SHA || 'local', built: new Date().toISOString(), data_read_at: JSON.parse(readFileSync('_site/preview.json', 'utf8')).read_at, preview: { svg: '/preview.svg', card_svg: '/preview-card.svg', png: '/preview.png', figures: '/preview.json' }, sites_bar: '1.1.0' }, null, 2) + '\n');
writeFileSync('_site/.nojekyll', '');
console.log(`built _site/ (${version})`);
