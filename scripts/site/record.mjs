// /track-record/: every forecast this site showed beside what happened, from this site's own predictions file
// (data/predictions/predictions.jsonl, scripts/predictions.mjs; the library's form), place by place. The full record
// that each place's past chart links to (designer@'s PF8, Website repo board/spec-past-and-forecast.md). The same file
// is the library's series PRED 2026/0006. weather.b@PrompTugal.dinis. Code: Apache-2.0; the values are IPMA's, under
// IPMA's terms (not for commercial use).
const esc = (s) => String(s ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mdt = (v) => String(v ?? '').replace(/\s+/g, ' ').replace(/[\[\]()<>|`*_!#\\]/g, '').slice(0, 200);
const PLACE = /^[a-z0-9-]{1,60}$/;
const isDay = (d) => { if (typeof d !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(d)) return false; const x = new Date(d + 'T12:00:00Z'); return !isNaN(+x) && x.toISOString().slice(0, 10) === d; };
const RESULTS = new Set(['held', 'missed', 'gap']);
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const long = (d) => { const x = new Date(d + 'T12:00:00Z'); return isNaN(+x) ? 'unknown day' : `${DOW[x.getUTCDay()]} ${x.getUTCDate()} ${MON[x.getUTCMonth()]}`; };
const when = (t) => (typeof t === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\dZ$/.test(t) ? `${long(t.slice(0, 10))}, ${t.slice(11, 16)} UTC` : 'unknown time');
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
export const SERIES = 'https://library.promptugal.news/predictions/PRED-2026-0006/';

// rows per place: [{ due, said (latest issue shown before the day), issued, shown_at, count, outcome }]
export function recordRows(lines) {
  // a prediction counts only with a real due day that matches its id, and only if it was shown before that day
  const preds = lines.filter((l) => l && l.type === 'prediction' && typeof l.id === 'string' && isDay(l.due) && l.id.split('.')[2] === l.due && typeof l.shown_at === 'string' && l.shown_at.slice(0, 10) < l.due);
  // the first outcome for each prediction counts (as in the library), and only a known result
  const outcome = new Map();
  for (const o of lines) if (o && o.type === 'outcome' && typeof o.of === 'string' && RESULTS.has(o.result) && !outcome.has(o.of)) outcome.set(o.of, o);
  const by = new Map();
  for (const p of preds) {
    const place = /^wx\.([a-z0-9-]{1,60})\./.exec(p.id)?.[1]; if (!place || !PLACE.test(place)) continue;
    const k = `${place}|${p.due}`, issue = p.id.split('.').pop();
    const cur = by.get(k);
    if (!cur || issue > cur.issue) by.set(k, { place, due: p.due, issue, said: num(p.value?.value), shown_at: p.shown_at, count: (cur?.count || 0) + 1, outcome: outcome.get(p.id) || null, id: p.id });
    else cur.count++;
  }
  return [...by.values()].sort((a, b) => (a.place === b.place ? (a.due < b.due ? 1 : -1) : a.place < b.place ? -1 : 1));
}

export function recordPage(lines, placeName) {
  const rows = recordRows(lines);
  const places = [...new Set(rows.map((r) => r.place))];
  const tally = (rs) => ({ held: rs.filter((r) => r.outcome?.result === 'held').length, missed: rs.filter((r) => r.outcome?.result === 'missed').length, gap: rs.filter((r) => r.outcome?.result === 'gap').length, open: rs.filter((r) => !r.outcome).length });
  const all = tally(rows);
  const res = (r) => (!r.outcome ? '<span class="na">open: the day is not over, or not yet in full</span>' : r.outcome.result === 'held' ? `held (${esc(r.outcome.difference || '')})` : r.outcome.result === 'missed' ? `<strong>missed</strong> (${esc(r.outcome.difference || '')})` : 'gap: no full record of the day');
  const resMd = (r) => (!r.outcome ? 'open' : r.outcome.result === 'gap' ? 'gap' : `${r.outcome.result === 'held' ? 'held' : 'missed'} (${mdt(r.outcome.difference)})`);
  const measured = (r) => num(r.outcome?.value?.value);
  const section = (p) => {
    const rs = rows.filter((r) => r.place === p), t = tally(rs), name = placeName(p) || p;
    return `<section id="${esc(p)}"><h2><a href="/places/${esc(p)}/">${esc(name)}</a></h2>
<p>${t.held} held, ${t.missed} missed, ${t.gap} gap${t.gap === 1 ? '' : 's'}, ${t.open} open.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Day</th><th scope="col">We said (the high)</th><th scope="col">Measured high</th><th scope="col">Result</th><th scope="col">Shown from</th></tr></thead><tbody>${rs.map((r) => `<tr><td>${esc(long(r.due))}</td><td class="n">${r.said == null ? 'n/a' : esc(r.said + ' °C')}${r.count > 1 ? ` <span class="src">(latest of ${r.count} issues)</span>` : ''}</td><td class="n">${measured(r) == null ? '<span class="na">n/a</span>' : esc(measured(r) + ' °C')}</td><td>${res(r)}</td><td>${esc(when(r.shown_at))}</td></tr>`).join('')}</tbody></table></div></section>`;
  };
  const body = `<h1>Track record: what we said and what happened</h1>
<p class="standfirst">Every next-day high this site showed on a place page, beside the high IPMA's station measured that day. A forecast holds when the measured high is within 2 °C of what we said; a miss is shown as plainly as a hit.</p>
<p>So far: <strong>${all.held}</strong> held, <strong>${all.missed}</strong> missed, ${all.gap} gap${all.gap === 1 ? '' : 's'}, ${all.open} still open, across ${places.length} places.${all.held + all.missed === 0 ? ' No forecast has been checked yet: the first are due when the day they were for has all 24 hours of readings.' : ''}</p>
<p class="note">How it is kept: each forecast is written down when this site first shows it live, before its day, and never changed afterwards (an append-only file, <a href="https://github.com/PrompTugal/PrompTugal__News__Weather/blob/dev/data/predictions/predictions.jsonl">data/predictions/predictions.jsonl</a>). The day's result is added once IPMA's station has all 24 hours of that UTC day, as kept by <a href="https://data.promptugal.news/">data.promptugal.news</a>. The library keeps the same record as <a href="${SERIES}">its series PRED 2026/0006</a>. Each row is the latest forecast shown before its day; this page shows the file's results as written and does not measure anything itself. The forecasts are IPMA's, under IPMA's terms (not for commercial use); the "we said" is what this site showed.</p>
${places.map(section).join('\n')}`;
  const md = `Every next-day high this site showed, beside the measured high. Holds within 2 °C.\n\nSo far: ${all.held} held, ${all.missed} missed, ${all.gap} gaps, ${all.open} open, across ${places.length} places. The library's copy: ${SERIES}\n\n${places.map((p) => `## ${mdt(placeName(p) || p)}\n\n| Day | We said (high) | Measured | Result |\n|---|---|---|---|\n${rows.filter((r) => r.place === p).map((r) => `| ${long(r.due)} | ${r.said == null ? 'n/a' : r.said + ' °C'} | ${measured(r) == null ? 'n/a' : measured(r) + ' °C'} | ${resMd(r)} |`).join('\n')}`).join('\n\n')}\n\nIPMA's forecasts and observations, under IPMA's terms (not for commercial use).\n`;
  return { body, md, counts: all };
}
