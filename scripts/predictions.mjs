// This site's predictions, in the library's form (library.promptugal.news/predictions/form/, read 19 Nov 2026, 13:20 UTC;
// Dinis, 19 Nov 2026, about 03:15 UTC: "The predictions are one collection"). Append-only JSON Lines in
// data/predictions/predictions.jsonl: never edits or deletes a line. weather.b@PrompTugal.dinis. Code: Apache-2.0.
//
// A prediction here is the next day's high that a place page showed on the live site: the same thing its past chart
// calls "what we said the day before" (scripts/site/past.mjs). At each wake this script reads, from the live site
// itself (weather.promptugal.news), the forecast files the deployed pages were built from and the deployed build's
// time (/version.json "built"). For each place page with a past chart, one line per IPMA issue: that issue's high for
// the day after the issue's own (Lisbon) day. shown_at is the deployed build's time when this script first saw the
// issue live, so it is never earlier than the page showing it (it can be later: the check runs at each wake). No line
// is written for an issue it did not see live, so nothing is back-filled.
//
// Outcomes: once data.promptugal.news's history file has the due day in full (all 24 hours of the UTC day), one outcome
// line: "held" when the measured high is within 2 °C of what was said (the page's track-record tolerance), else
// "missed". A "gap" only when the history file was read two days or more after the due day and still lacks it in full.
// Run at each wake after scripts/sync-data.mjs (it reads data/past/ for the outcomes).
import { existsSync, readFileSync, appendFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const FILE = 'data/predictions/predictions.jsonl';
export const SITE = 'weather.promptugal.news';
export const TOLERANCE_C = 2;
const LICENCE = { name: "IPMA's terms (not for commercial use)", url: 'https://api.ipma.pt/' };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_RE = /^\d{4}-\d\d-\d\d$/, PLACE = /^[a-z0-9-]{1,60}$/;
const isDay = (d) => { if (typeof d !== 'string' || !DAY_RE.test(d)) return false; const x = new Date(d + 'T12:00:00Z'); return !isNaN(+x) && x.toISOString().slice(0, 10) === d; };
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const longDay = (d) => { const x = new Date(d + 'T12:00:00Z'); return `${DOW[x.getUTCDay()]} ${x.getUTCDate()} ${MON[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
const minute = (iso) => { const x = new Date(typeof iso === 'string' ? iso : NaN); return isNaN(+x) ? null : x.toISOString().slice(0, 16) + 'Z'; };
const temp = (v) => (typeof v === 'number' && isFinite(v) && v >= -40 && v <= 55 ? Math.round(v * 10) / 10 : null);
// the library refuses control characters and [ ] < > ` in text; also no C1 controls, line or paragraph separators,
// zero-width or bidirectional marks, or lone surrogates
const clean = (s, n) => String(s ?? '').replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff\[\]<>`]/g, '').replace(/\p{Cs}/gu, '').replace(/\s+/g, ' ').trim().slice(0, n);
const ipmaSource = (id) => `https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/${id}.json`;

// live = [{ id, name, cityId, cityName, updated, days }] as the deployed pages showed them; builtAt = the deployed build's time
export function predictionLines(live, builtAt, have) {
  const out = [], shown = minute(builtAt);
  if (!shown) return out;
  for (const p of live) {
    if (!p || !PLACE.test(p.id || '') || !Number.isInteger(p.cityId) || typeof p.updated !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(p.updated)) continue;
    const issueDay = p.updated.slice(0, 10), due = addDays(issueDay, 1);
    if (!isDay(issueDay) || shown.slice(0, 10) >= due) continue; // shown before its day, or not counted (the library sets a late one apart)
    const d = Array.isArray(p.days) ? p.days.find((x) => x && x.date === due) : null, high = temp(d?.t_max_c);
    if (high == null) continue;
    const id = `wx.${p.id}.${due}.tmax.${p.updated.slice(0, 16).replace(/[-:T]/g, '')}`;
    if (have.has(id)) continue;
    have.add(id);
    const name = clean(p.name, 60) || p.id;
    out.push({
      type: 'prediction', id, site: SITE, page: `https://${SITE}/places/${p.id}/`, shown_at: shown, said_by: 'IPMA',
      source: ipmaSource(p.cityId), licence: LICENCE, kind: 'forecast', subject: clean(`${name}, daily high`, 120), due,
      said: clean(`${name}, ${longDay(due)}: high ${high} °C (IPMA's forecast for ${clean(p.cityName, 60) || name}, issued ${p.updated.slice(0, 16).replace('T', ' ')} Lisbon time)`, 300),
      value: { quantity: 't_max', unit: '°C', value: high },
    });
  }
  return out;
}

// outcomes for predictions now due: history = { <place>: history file }, now = Date
export function outcomeLines(predictions, outcomesOf, history, now) {
  const out = [], checked = minute(now.toISOString());
  for (const p of predictions) {
    if (!p || outcomesOf.has(p.id) || !isDay(p.due)) continue;
    const said = temp(p.value?.value); if (said == null) continue;
    const place = /^wx\.([a-z0-9-]{1,60})\./.exec(p.id)?.[1], h = place && history[place];
    if (!h) continue;
    const readAt = minute(h.data_read_at);
    const row = Array.isArray(h.rows) ? h.rows.find((x) => x && x.date === p.due) : null, o = row?.observed;
    const got = o && o.complete === true && o.hours === 24 ? temp(o.high_c) : null;
    const evidence = `https://data.promptugal.news/api/v1/history/weather/${place}.json`;
    if (got != null) {
      const diff = Math.abs(got - said);
      outcomesOf.add(p.id);
      out.push({
        type: 'outcome', of: p.id, checked_at: checked, result: diff <= TOLERANCE_C ? 'held' : 'missed',
        happened: clean(`Measured high ${got} °C at IPMA's station for ${place} on ${longDay(p.due)} (the UTC day, all 24 hours seen), as kept by data.promptugal.news, read ${readAt || 'at an unknown time'}. Held means within ${TOLERANCE_C} °C.`, 400),
        value: { quantity: 't_max', unit: '°C', value: got }, difference: Math.round(diff) === 0 ? 'exact' : `±${Math.round(diff * 10) / 10} °C`, evidence: [evidence],
      });
    } else if (readAt && readAt.slice(0, 10) >= addDays(p.due, 2)) { // the file itself is two days past the due day
      outcomesOf.add(p.id);
      out.push({ type: 'outcome', of: p.id, checked_at: checked, result: 'gap', gap: clean(`data.promptugal.news's history for ${place}, read ${readAt}, has no full UTC day (all 24 hours) for ${p.due}.`, 400) });
    }
  }
  return out;
}

// read the file; any line that is not JSON stops the run (append-only: never written around)
export function readFile(file = FILE) {
  if (!existsSync(file)) return { lines: [], text: '' };
  const text = readFileSync(file, 'utf8');
  if (text && !text.endsWith('\n')) throw new Error(`${file}: does not end in a newline; not appending`);
  const lines = text.split('\n').filter(Boolean).map((l, i) => { try { return JSON.parse(l); } catch { throw new Error(`${file}: line ${i + 1} is not JSON; not appending`); } });
  return { lines, text };
}

async function getJSON(path) {
  const r = await fetch(`https://${SITE}${path}`, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'weather.promptugal.news predictions check' } });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  const b = Buffer.from(await r.arrayBuffer()); if (b.byteLength > 5 * 1024 * 1024) throw new Error(`${path}: too large`);
  return JSON.parse(b.toString('utf8'));
}

async function main() {
  const { lines } = readFile();
  const have = new Set(lines.filter((l) => l.type === 'prediction').map((l) => l.id)), outcomesOf = new Set(lines.filter((l) => l.type === 'outcome').map((l) => l.of));
  const history = {};
  for (const f of existsSync('data/past') ? readdirSync('data/past') : []) { const id = f.replace(/\.json$/, ''); if (!PLACE.test(id)) continue; try { const h = JSON.parse(readFileSync(`data/past/${f}`, 'utf8')); if (h.place === id) history[id] = h; } catch { } }
  // what the live site showed: its build time, its city forecasts (with each issue's time), and each town's forecast
  let live = [], builtAt = null;
  try {
    const v = await getJSON('/version.json'); builtAt = v.built;
    const cf = await getJSON('/data/api/ipma-city-forecasts.json');
    const issue = new Map((Array.isArray(cf.cities) ? cf.cities.slice(0, 200) : []).filter((c) => c && Number.isInteger(c.id)).map((c) => [c.id, c]));
    const { loadData } = await import('./site/lib.mjs');
    const D = loadData();
    for (const t of D.towns) if (history[t.id] && PLACE.test(t.id)) {
      const n = await getJSON(`/data/now/${t.id}.json`), f = n?.forecast, c = f && issue.get(f.id);
      if (c && Number.isInteger(f.id)) live.push({ id: t.id, name: t.name, cityId: f.id, cityName: f.place, updated: c.updated, days: f.days });
    }
    for (const c of D.capitals) if (c.live && !c.algarve && history[c.id] && PLACE.test(c.id) && Number.isInteger(c.forecast?.id)) {
      const lc = issue.get(c.forecast.id); if (lc) live.push({ id: c.id, name: c.name, cityId: lc.id, cityName: lc.name, updated: lc.updated, days: lc.days });
    }
  } catch (e) { console.log(`predictions: the live site was not read (${e.message}); no new predictions this run`); live = []; }
  const preds = predictionLines(live, builtAt, have);
  const outs = outcomeLines([...lines.filter((l) => l.type === 'prediction'), ...preds], outcomesOf, history, new Date());
  const add = [...preds, ...outs];
  if (add.length) { mkdirSync('data/predictions', { recursive: true }); readFile(); appendFileSync(FILE, add.map((l) => JSON.stringify(l)).join('\n') + '\n'); }
  console.log(`predictions: ${preds.length} new (live build ${minute(builtAt) || 'not read'}), ${outs.length} outcomes (${outs.filter((o) => o.result === 'held').length} held, ${outs.filter((o) => o.result === 'missed').length} missed, ${outs.filter((o) => o.result === 'gap').length} gaps); ${live.length} places seen live`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
