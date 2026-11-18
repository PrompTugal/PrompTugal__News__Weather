// Sync: copy the published data this site reads into data/, with a record of where it came from.
// It is not a collector: it reads what data.promptugal.news already publishes (its /api/v1/, collected there by
// data@PrompTugal.dinis's code) and the map files the PrompTugal.news Website repository publishes, and never calls
// IPMA, ANEPC or any other source itself.
//   - data/now/<place>.json        from https://data.promptugal.news/api/v1/by-place/now/<place>.json (18 places)
//   - data/api/<source>.json       from https://data.promptugal.news/api/v1/<source>/latest.json (all of Portugal:
//                                  city forecasts, warnings by district, fire risk by municipality, UV, sea)
//   - data/map/*.json              from the Website repository (places, next places, outlines, the storm local map)
// Usage: node scripts/sync-data.mjs   (the Website files from ../PrompTugal__News__Website if it is beside this repo,
// else over HTTPS). Node 18+, no dependencies. weather@PrompTugal.dinis 17 Nov 2026; weather.b@PrompTugal.dinis 18 Nov
// 2026 (switched to data.promptugal.news's API at Dinis's word, kept in the Website repo's
// board/guidance/2026-11-18-five-sites-on-account-b.md).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const API = 'https://data.promptugal.news/api/v1/';
const REPO = 'PrompTugal/PrompTugal__News__Website';
const RAW = `https://raw.githubusercontent.com/${REPO}/dev/`;
const SIBLING = process.env.WEBSITE_CLONE || '../PrompTugal__News__Website';
const UA = { 'user-agent': 'weather.promptugal.news sync (PrompTugal/PrompTugal__News__Weather)' };
const PLACES = ['algarve', 'albufeira', 'alcoutim', 'aljezur', 'castro-marim', 'faro', 'lagoa', 'lagos', 'loule', 'monchique',
  'olhao', 'portimao', 'quarteira', 'sao-bras-de-alportel', 'silves', 'tavira', 'vila-do-bispo', 'vila-real-de-santo-antonio'];
const SOURCES = ['ipma-city-forecasts', 'ipma-warnings', 'ipma-fire-risk', 'ipma-uv', 'ipma-sea', 'ipma-observations'];
const API_FILES = [
  ...PLACES.map(p => [`by-place/now/${p}.json`, `data/now/${p}.json`]),
  ...SOURCES.map(s => [`${s}/latest.json`, `data/api/${s}.json`]),
];
const WEB_FILES = [
  ['data/by-place/places.json', 'data/map/places-source.json'],
  ['assets/portugal/next-places.json', 'data/map/next-places-source.json'],
  ['assets/portugal/portugal-outline.json', 'data/map/portugal-outline.json'],
  ['assets/portugal/algarve-outline.json', 'data/map/algarve-outline.json'],
  ['board/briefs/2026-11-16-storm-local-map.json', 'data/map/storm-local-map.json'],
];

const local = existsSync(join(SIBLING, 'data/by-place/now/faro.json'));
let commit = 'unknown';
if (local) { try { commit = execFileSync('git', ['-C', SIBLING, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch {} }
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Fetched data is untrusted (threat model docs/threat-models/data-pull.md): a 20 s timeout, a 5 MB cap per file,
// no redirect to another host, JSON only, and a shape check per kind; a file that fails keeps the committed copy.
const MAX_BYTES = 5 * 1024 * 1024;
async function fetchText(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (r.ok && new URL(r.url).host === new URL(url).host) {
        const declared = Number(r.headers.get('content-length') || 0);
        if (declared > MAX_BYTES) throw new Error(`${url}: larger than ${MAX_BYTES} bytes`);
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.byteLength > MAX_BYTES) throw new Error(`${url}: larger than ${MAX_BYTES} bytes`);
        return buf.toString('utf8');
      }
    } catch (e) { if (/larger than/.test(e.message)) throw e; }
    await sleep(2000 * (i + 1));
  }
  throw new Error(`could not read ${url}`);
}
const SHAPES = [
  [/^data\/now\//, j => typeof j.place === 'string' && typeof j.read_at === 'string'],
  [/^data\/api\//, j => typeof j.source === 'string' && typeof j.read_at === 'string'],
];
const save = (to, text) => {
  const j = JSON.parse(text); // refuse anything that is not JSON
  const shape = SHAPES.find(([re]) => re.test(to));
  if (!j || typeof j !== 'object' || (shape && (Array.isArray(j) || !shape[1](j)))) throw new Error(`${to}: not the expected shape; the committed copy is kept`);
  mkdirSync(join(to, '..'), { recursive: true });
  writeFileSync(to, text.endsWith('\n') ? text : text + '\n');
};
const got = [];
for (const [from, to] of API_FILES) { save(to, await fetchText(API + from)); got.push({ from: API + from, to }); await sleep(200); }
const catalogue = JSON.parse(await fetchText(API + 'index.json'));
for (const [from, to] of WEB_FILES) {
  save(to, local ? readFileSync(join(SIBLING, from), 'utf8') : await fetchText(RAW + from));
  got.push({ from: `https://github.com/${REPO}/blob/dev/${from}`, to });
  if (!local) await sleep(300);
}
writeFileSync('data/sync.json', JSON.stringify({
  about: 'Where data/now/, data/api/ and data/map/ came from. data/now and data/api are copies of data.promptugal.news\'s API; data/map of files the PrompTugal.news Website repository publishes. Each value inside keeps its own source and time read.',
  from: 'https://data.promptugal.news/api/v1/', api_version: catalogue.version || 'unknown', api_built_at: catalogue.built_at || null,
  maps_from: `https://github.com/${REPO}`, maps_via: local ? 'local clone' : 'raw.githubusercontent.com', commit,
  synced_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), files: got,
}, null, 2) + '\n');
console.log(`synced ${got.length} files: ${API_FILES.length} from data.promptugal.news (${catalogue.version}), ${WEB_FILES.length} from ${REPO}`);
