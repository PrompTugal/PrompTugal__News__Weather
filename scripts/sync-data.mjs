// Sync: copy the published per-place data this site reads into data/, with a record of where it came from.
// It is not a collector: it reads files the PrompTugal.news Website repository already publishes (public, in git)
// and never calls IPMA, ANEPC or any other source. When data.promptugal.news publishes its APIs, this script
// switches to them (one constant below) and the Website copy is dropped.
// Usage: node scripts/sync-data.mjs           (from ../PrompTugal__News__Website if it is beside this repo, else over HTTPS)
// Node 18+, no dependencies. weather@PrompTugal.dinis, 17 Nov 2026.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO = 'PrompTugal/PrompTugal__News__Website';
const RAW = `https://raw.githubusercontent.com/${REPO}/dev/`;
const SIBLING = process.env.WEBSITE_CLONE || '../PrompTugal__News__Website';
const PLACES = ['algarve', 'albufeira', 'alcoutim', 'aljezur', 'castro-marim', 'faro', 'lagoa', 'lagos', 'loule', 'monchique',
  'olhao', 'portimao', 'quarteira', 'sao-bras-de-alportel', 'silves', 'tavira', 'vila-do-bispo', 'vila-real-de-santo-antonio'];
const FILES = [
  ...PLACES.map(p => [`data/by-place/now/${p}.json`, `data/now/${p}.json`]),
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
async function get(path) {
  if (local) return readFileSync(join(SIBLING, path), 'utf8');
  for (let i = 0; i < 3; i++) {
    const r = await fetch(RAW + path, { headers: { 'user-agent': 'weather.promptugal.news sync (PrompTugal/PrompTugal__News__Weather)' } });
    if (r.ok) return await r.text();
    await sleep(2000 * (i + 1));
  }
  throw new Error(`could not read ${path}`);
}
const got = [];
for (const [from, to] of FILES) {
  const text = await get(from);
  JSON.parse(text); // refuse anything that is not JSON
  mkdirSync(join(to, '..'), { recursive: true });
  writeFileSync(to, text.endsWith('\n') ? text : text + '\n');
  got.push({ from, to });
  if (!local) await sleep(500);
}
writeFileSync('data/sync.json', JSON.stringify({
  about: 'Where data/now/ and data/map/ came from. Copies of files published by the PrompTugal.news Website repository; each value inside keeps its own source and time read.',
  from: `https://github.com/${REPO}`, via: local ? 'local clone' : 'raw.githubusercontent.com', commit,
  synced_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), files: got,
}, null, 2) + '\n');
console.log(`synced ${got.length} files from ${REPO} (${local ? 'local clone ' + commit.slice(0, 7) : 'HTTPS'})`);
