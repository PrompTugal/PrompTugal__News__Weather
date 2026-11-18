// Build: copy src/ to _site/, generate the pages from data/ and content/ (scripts/site/generate.mjs),
// copy the data the pages were built from, stamp the version, write version.json.
// SITE_VERSION is set by CI only (v0.1.N); a local build says "dev".
import { cpSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const version = process.env.SITE_VERSION || 'dev';
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
  if (!/\.(html|js|css|json|md|txt)$/.test(f)) continue;
  const s = readFileSync(f, 'utf8');
  if (s.includes('__VERSION__')) writeFileSync(f, s.replaceAll('__VERSION__', version));
}
writeFileSync('_site/version.json', JSON.stringify({ license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }, version, commit: process.env.GITHUB_SHA || 'local', built: new Date().toISOString() }, null, 2) + '\n');
writeFileSync('_site/.nojekyll', '');
console.log(`built _site/ (${version})`);
