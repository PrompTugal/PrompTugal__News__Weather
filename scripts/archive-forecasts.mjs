// Keep every forecast this site shows, and the station readings it shows, so a forecast can later be compared with
// what was observed (Dinis, 18 Nov 2026, about 22:20 UTC, kept in the Website repo's board/guidance/2026-11-18-london.md:
// "I can also check for things like the weather ... and can see how accurate it is"). weather.b@PrompTugal.dinis.
// Code: Apache-2.0. The values are IPMA's (IPMA's terms, https://api.ipma.pt/), copied as read from
// data.promptugal.news; nothing is computed here.
//
// Appends to data/history/forecasts.jsonl (one line per city per IPMA issue: its "updated" time) and
// data/history/observations.jsonl (one line per station per hour, for the stations the pages use). Run after
// scripts/sync-data.mjs, at each wake: node scripts/archive-forecasts.mjs. Only runs that are committed are kept, so the
// observations are a sample (the hours a sync ran), not every hour; the accuracy page will say so.
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const finite = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
const str = (v, n = 120) => (typeof v === 'string' ? v.slice(0, n) : null);
const when = (v) => (typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?Z?$/.test(v) ? v : null); // a time, or nothing
const MAX_ROWS = 200, MAX_FILE = 50 * 1024 * 1024; // a hostile file cannot make the archive grow without bound
mkdirSync('data/history', { recursive: true });

function seen(file, key) {
  const s = new Set();
  if (existsSync(file)) for (const line of readFileSync(file, 'utf8').split('\n')) { if (!line) continue; try { s.add(key(JSON.parse(line))); } catch {} }
  return s;
}
function append(file, rows, key) {
  const have = seen(file, key);
  if (existsSync(file) && readFileSync(file).byteLength > MAX_FILE) throw new Error(`${file} is over ${MAX_FILE} bytes: split it before archiving more`);
  const fresh = rows.filter((r) => { const k = key(r); if (have.has(k)) return false; have.add(k); return true; });
  if (fresh.length) appendFileSync(file, fresh.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return fresh.length;
}

// forecasts: every IPMA city (the 17 district capitals, Faro among them, and the other cities IPMA forecasts)
const cf = read('data/api/ipma-city-forecasts.json');
const fRows = (Array.isArray(cf.cities) ? cf.cities.slice(0, MAX_ROWS) : []).filter((c) => Number.isInteger(c?.id) && when(c.updated)).map((c) => ({
  id: c.id, name: str(c.name), updated_local: when(c.updated), read_at: when(c.read_at), source: str(c.source, 200),
  days: (Array.isArray(c.days) ? c.days.slice(0, 10) : []).map((d) => ({ date: str(d?.date, 10), t_min_c: finite(d?.t_min_c), t_max_c: finite(d?.t_max_c), rain_prob_pct: finite(d?.rain_prob_pct), weather_type: finite(d?.weather_type) })),
}));
const nf = append('data/history/forecasts.jsonl', fRows, (r) => `${r.id}|${r.updated_local}`);

// observations: the stations the pages show (each Algarve place's and each capital's nearest station)
const ids = new Set();
for (const f of existsSync('data/now') ? (await import('node:fs')).readdirSync('data/now') : []) {
  try { const id = read(`data/now/${f}`).station?.id; if (id != null) ids.add(String(id)); } catch {}
}
const ob = read('data/api/ipma-observations.json');
const { loadData } = await import('./site/lib.mjs');
for (const c of loadData().capitals) if (c.station?.id != null) ids.add(String(c.station.id));
const oRows = (when(ob.hour_utc) && Array.isArray(ob.stations) ? ob.stations.slice(0, 1000) : []).filter((s) => s && ids.has(String(s.id)) && s.reading).map((s) => ({
  id: String(s.id), name: str(s.name), hour_utc: when(ob.hour_utc), temp_c: finite(s.reading.temp_c), rain_mm: finite(s.reading.rain_mm),
  humidity_pct: finite(s.reading.humidity_pct), wind_kmh: finite(s.reading.wind_kmh), read_at: when(ob.read_at),
}));
const no = append('data/history/observations.jsonl', oRows, (r) => `${r.id}|${r.hour_utc}`);
console.log(`archived ${nf} new forecasts and ${no} new station readings (${ids.size} stations)`);
