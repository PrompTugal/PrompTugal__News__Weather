// The past beside the forecast on a place page (Dinis, 19 Nov 2026, about 01:17 UTC, Website repo
// board/guidance/2026-11-19-show-the-past.md: "show the past, not only the forecast"), drawn to designer@'s rule
// PF1 to PF9 (Website repo board/spec-past-and-forecast.md, 19 Nov 2026, about 02:15 UTC):
//   PF1 past, today, forecast on one time axis; PF2 observed solid; PF3 forecast hatched (texture, not colour);
//   PF4 today in a sand column; PF5 a gap is a dashed outline, never filled in; PF6 "Record begins <day>";
//   PF7 what we said the day before (brand-green outline) beside what was measured, the gap in plain units or a tick;
//   PF8 the track record in one line, computed; PF9 legend, source line, table, a tooltip per mark.
// Data: data.promptugal.news's history file for the place (data.b@; IPMA's station days and the forecasts it kept),
// copied to data/past/<place>.json; where that file has no forecast for a day, the forecast this site itself showed
// the day before, from its own archive (data/history/forecasts.jsonl, scripts/archive-forecasts.mjs). Nothing is
// interpolated. IPMA's values, under IPMA's terms (not for commercial use). weather.b@PrompTugal.dinis. Code: Apache-2.0.

const esc = (s) => String(s ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const temp = (v) => (typeof v === 'number' && isFinite(v) && v >= -40 && v <= 55 ? v : null); // a plausible air temperature, or nothing
const mm = (v) => (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 500 ? v : null);
const DAY_RE = /^\d{4}-\d\d-\d\d$/;
const DAY = { test: (d) => { if (typeof d !== 'string' || !DAY_RE.test(d)) return false; const x = new Date(d + 'T12:00:00Z'); return !isNaN(+x) && x.toISOString().slice(0, 10) === d; } }; // a real calendar day
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dt = (d) => new Date(d + 'T12:00:00Z');
const label = (d) => { const x = dt(d); return `${DOW[x.getUTCDay()]} ${x.getUTCDate()}`; };
const long = (d) => { const x = dt(d); return `${DOW[x.getUTCDay()]} ${x.getUTCDate()} ${MON[x.getUTCMonth()]}`; };
const longY = (d) => `${long(d)} ${dt(d).getUTCFullYear()}`;
const addDays = (d, n) => { const x = dt(d); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const f1 = (v) => (v == null ? 'n/a' : `${Math.round(v * 10) / 10}°C`);
export const TOLERANCE_C = 2; // a day's high within 2 °C of what we said counts as a hit
const PAST_DAYS = 7, NEXT_DAYS = 4;

// a forecast pair { low, high } from either shape: ours ({ t_min_c, t_max_c }) or a history file's
const pair = (f) => { if (!f || typeof f !== 'object') return null; const low = temp(f.t_min_c ?? f.low_c), high = temp(f.t_max_c ?? f.high_c); return low == null && high == null ? null : { low, high }; };

// what this site showed the day before for `day`: the last IPMA issue archived on the previous local day
export function saidBefore(archive, cityId, day) {
  const before = addDays(day, -1);
  let best = null;
  for (const r of archive) if (r && r.id === cityId && typeof r.updated_local === 'string' && r.updated_local.slice(0, 10) === before && (!best || r.updated_local > best.updated_local)) best = r;
  const d = best && Array.isArray(best.days) ? best.days.find((x) => x && x.date === day) : null;
  const p = pair(d);
  return p ? { ...p, issued: best.updated_local, from: 'archive' } : null;
}

// The rows to draw: up to 7 past days, today, up to 4 forecast days. Returns null when there is no history file.
export function pastRows({ history, archive = [], cityId, forecastDays = [], today }) {
  const rows = Array.isArray(history?.rows) ? history.rows.slice(-60).filter((r) => r && DAY.test(r.date)) : [];
  if (!rows.length || !DAY.test(today || '')) return null;
  // the record begins at the file's first day, but never before its earliest row (a file cannot claim a longer record than it holds)
  const earliest = rows.map((r) => r.date).sort()[0];
  const first = DAY.test(history.first_day) && history.first_day > earliest ? history.first_day : earliest;
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const fc = new Map((Array.isArray(forecastDays) ? forecastDays : []).filter((d) => d && DAY.test(d.date)).map((d) => [d.date, pair(d)]));
  const out = [];
  for (let i = PAST_DAYS; i >= 0; i--) {
    const day = addDays(today, -i);
    if (day < first) continue; // PF6: nothing before the record begins
    const r = byDate.get(day), o = r?.observed;
    const obs = o && typeof o === 'object' ? { low: temp(o.low_c), high: temp(o.high_c), rain: mm(o.rain_mm), hours: Number.isInteger(o.hours) && o.hours >= 0 && o.hours <= 24 ? o.hours : null, complete: o.complete === true && o.hours === 24 } : null;
    const observed = obs && (obs.low != null || obs.high != null) ? obs : null;
    const fromFile = pair(r?.forecast?.d1);
    const said = fromFile ? { ...fromFile, from: 'history' } : saidBefore(archive, cityId, day);
    out.push({ day, kind: i === 0 ? 'today' : 'past', observed, said, forecast: i === 0 ? fc.get(day) || null : null });
  }
  for (let i = 1; i <= NEXT_DAYS; i++) { const day = addDays(today, i); const f = fc.get(day); if (f) out.push({ day, kind: 'next', observed: null, said: null, forecast: f }); }
  return { first, rows: out };
}

// PF7 and PF8: the gap on the high, on full past days only
export function scored(row) {
  if (row.kind !== 'past' || !row.observed?.complete || row.observed.high == null || row.said?.high == null) return null;
  const gap = Math.round(Math.abs(row.observed.high - row.said.high));
  return { gap, hit: Math.abs(row.observed.high - row.said.high) <= TOLERANCE_C };
}
export function trackRecord(rows) {
  const s = rows.map(scored).filter(Boolean);
  return { days: s.length, hits: s.filter((x) => x.hit).length };
}

function chart(P, W = 760, H = 300, narrow = false) {
  const hatch = narrow ? 'pf-hatch-n' : 'pf-hatch-w', dayLabel = narrow ? (d) => String(dt(d).getUTCDate()) : label;
  const L = 40, R = 8, T = 34, B = 50, iw = W - L - R, ih = H - T - B;
  const vals = P.rows.flatMap((r) => [r.observed?.low, r.observed?.high, r.said?.low, r.said?.high, r.forecast?.low, r.forecast?.high]).filter((v) => v != null);
  const lo = Math.floor((vals.length ? Math.min(...vals) : 0) - 2), hi = Math.ceil((vals.length ? Math.max(...vals) : 20) + 2);
  const y = (v) => T + ih - ((v - lo) / (hi - lo)) * ih;
  const cw = iw / P.rows.length;
  const step = hi - lo > 20 ? 5 : 2;
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(`<line class="pf-grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="pf-axis" x="${L - 5}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}°</text>`);
  const bar = (cls, x, w, p, tip) => (p && p.low != null && p.high != null ? `<rect class="${cls}"${cls === 'pf-fc' ? ` fill="url(#${hatch})"` : ''} x="${x.toFixed(1)}" y="${y(p.high).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(2, y(p.low) - y(p.high)).toFixed(1)}" rx="3"><title>${esc(tip)}</title></rect>` : '');
  const gapMark = (x, w, tip) => `<rect class="pf-gap" x="${x.toFixed(1)}" y="${(T + ih * 0.3).toFixed(1)}" width="${w.toFixed(1)}" height="${(ih * 0.4).toFixed(1)}" rx="3"><title>${esc(tip)}</title></rect>${w > 30 ? `<text class="pf-note" x="${(x + w / 2).toFixed(1)}" y="${(T + ih / 2 + 4).toFixed(1)}" text-anchor="middle">no reading</text>` : ''}`;
  const cols = P.rows.map((r, i) => {
    const x0 = L + i * cw, mid = x0 + cw / 2, w = Math.min(22, cw * 0.34);
    let s = '';
    if (r.kind === 'today') s += `<rect class="pf-today" x="${(x0 + 1).toFixed(1)}" y="${T - 4}" width="${(cw - 2).toFixed(1)}" height="${ih + 8}"/><text class="pf-today-label" x="${mid.toFixed(1)}" y="${T - 10}" text-anchor="middle">Today</text>`;
    const obsTip = (o) => `${long(r.day)}, measured${r.kind === 'today' ? ' so far' : ''}: low ${f1(o.low)}, high ${f1(o.high)}${o.rain != null ? `, rain ${o.rain} mm` : ''}${o.hours != null ? `; ${o.hours} of 24 hours seen` : ''}`;
    const saidTip = (p) => `${long(r.day)}, what we said the day before: low ${f1(p.low)}, high ${f1(p.high)}`;
    const fcTip = (p) => `${long(r.day)}, IPMA's forecast: low ${f1(p.low)}, high ${f1(p.high)}`;
    if (r.kind === 'past') {
      s += r.observed?.low != null && r.observed?.high != null ? bar('pf-obs', mid - w - 1, w, r.observed, obsTip(r.observed)) : gapMark(mid - w - 1, w, `${long(r.day)}: no reading`);
      if (r.said) s += bar('pf-said', mid + 1, w, r.said, saidTip(r.said));
    } else if (r.kind === 'today') {
      s += r.observed?.low != null && r.observed?.high != null ? bar('pf-obs', mid - w - 1, w, r.observed, obsTip(r.observed)) : gapMark(mid - w - 1, w, `${long(r.day)}: no reading yet`);
      if (r.forecast) s += bar('pf-fc', mid + 1, w, r.forecast, fcTip(r.forecast));
    } else s += bar('pf-fc', mid - w / 2, w, r.forecast, fcTip(r.forecast));
    const sc = scored(r);
    const under = r.kind === 'past' ? (sc ? (sc.gap === 0 ? '✓' : `±${sc.gap}°`) : r.observed && !r.observed.complete ? 'partial' : '') : '';
    s += `<text class="pf-axis${r.kind === 'today' ? ' pf-bold' : ''}" x="${mid.toFixed(1)}" y="${H - B + 18}" text-anchor="middle">${esc(dayLabel(r.day))}</text>`;
    if (under) s += `<text class="pf-under" x="${mid.toFixed(1)}" y="${H - B + 36}" text-anchor="middle">${esc(under)}</text>`;
    return s;
  }).join('');
  const aria = `Daily low to high temperature: ${P.rows.filter((r) => r.kind !== 'next').length} days measured (solid, the last of them today so far), what we said the day before (green outline), and IPMA's forecast for today and the next ${P.rows.filter((r) => r.kind === 'next').length} days (hatched). Record begins ${longY(P.first)}. The same values are in the table below.`;
  return `<svg class="pf-chart ${narrow ? 'pf-narrow' : 'pf-wide'}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}"><defs><pattern id="${hatch}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="pf-hatch-bg"/><line x1="0" y1="0" x2="0" y2="6" class="pf-hatch-line"/></pattern></defs>
<text class="pf-begins" x="${L}" y="14">Record begins ${esc(longY(P.first))}</text>${ticks.join('')}${cols}</svg>`;
}

export const PAST_CSS = `
.past .pf-chart{display:block;width:100%;height:auto;max-width:100%}
.past{--sand:#ece3cf}
@media (prefers-color-scheme:dark){.past{--sand:#2c2a24}}
.past .pf-grid{stroke:var(--rule);stroke-width:1}
.past .pf-axis,.past .pf-under,.past .pf-note,.past .pf-begins{fill:var(--muted);font:12px var(--sans)}
.past .pf-bold{font-weight:700;fill:var(--ink)}
.past .pf-begins{font-size:12px}
.past .pf-under{fill:var(--ink)}
.past .pf-today{fill:var(--sand)}
.past .pf-today-label{fill:var(--ink);font:700 12px var(--sans)}
.past .pf-obs{fill:var(--ink)}
.past .pf-fc{stroke:var(--ink);stroke-width:1.5}
.past .pf-narrow{display:none}
@media (max-width:600px){.past .pf-wide{display:none}.past .pf-narrow{display:block}}
.past .pf-hatch-bg{fill:var(--paper)}
.past .pf-hatch-line{stroke:var(--ink);stroke-width:2}
.past .pf-said{fill:none;stroke:var(--green);stroke-width:2.5}
.past .pf-gap{fill:none;stroke:var(--muted);stroke-width:1.5;stroke-dasharray:4 3}
.past .pf-key{display:flex;gap:1rem;flex-wrap:wrap;font-size:.9rem;margin:.4rem 0;list-style:none;padding:0}
.past .pf-key li::before{content:"";display:inline-block;width:.8em;height:1.1em;margin-right:.35em;vertical-align:-.2em;border-radius:2px}
.past .pf-key .k-obs::before{background:var(--ink)}
.past .pf-key .k-said::before{border:2px solid var(--green)}
.past .pf-key .k-fc::before{border:1.5px solid var(--ink);background:repeating-linear-gradient(45deg,var(--ink) 0 2px,var(--paper) 2px 5px)}
.past .pf-key .k-gap::before{border:1.5px dashed var(--muted)}
.past td.n{text-align:right;font-variant-numeric:tabular-nums}
`.trim();

const cell = (v) => (v == null ? '<span class="na">n/a</span>' : esc(f1(v)));
const saidFrom = (s) => (!s ? 'none kept' : s.from === 'history' ? 'data.promptugal.news' : `this site, IPMA's issue of ${s.issued.replace('T', ' ').slice(0, 16)} Lisbon time`);

// Returns { html, md } or null when there is no history file for the place.
const mdt = (v) => String(v ?? '').replace(/\s+/g, ' ').replace(/[\[\]()<>|`*_!#:\/\\&]/g, '').slice(0, 120); // no link, image, heading, tag, autolink or entity
// the station a history file's observations come from: its id in sources.observed.field (daily[date]["<id>"])
export const historyStation = (h) => { const m = /\["(\d{1,10})"\]$/.exec(String(h?.sources?.observed?.field || '')); return m ? m[1] : null; };
const PLACE_ID = /^[a-z0-9-]{1,60}$/;

export function pastSection({ placeId, name, history, archive, cityId, forecastDays, today, stationName, forecastPlace }) {
  if (!PLACE_ID.test(placeId || '')) return null;
  const P = pastRows({ history, archive, cityId, forecastDays, today });
  if (!P || !P.rows.length) return null;
  const tr = trackRecord(P.rows);
  const trackText = (nm) => tr.days ? `${tr.hits} of ${tr.days} full past day${tr.days === 1 ? '' : 's'} with a high within ${TOLERANCE_C}° of what we said the day before · our track record for ${nm}, every day since ${longY(P.first)}.` : `No full past day yet has a forecast we showed the day before, so there is no track record for ${nm} yet; the record began ${longY(P.first)}.`;
  const trackMd = trackText(mdt(name));
  const track = tr.days ? `${tr.hits} of ${tr.days} full past day${tr.days === 1 ? '' : 's'} with a high within ${TOLERANCE_C}° of what we said the day before · our track record for ${esc(name)}, every day since ${esc(longY(P.first))}.` : `No full past day yet has a forecast we showed the day before, so there is no track record for ${esc(name)} yet; the record began ${esc(longY(P.first))}.`;
  const src = `Measured: IPMA's station ${esc(stationName || 'for this place')}, day by day (UTC days; a day is full only when all 24 hours were seen). Forecast: IPMA's for ${esc(forecastPlace || name)}. What we said: IPMA's forecast for that day as published the day before (data.promptugal.news's record of it, or this site's own archive of what it showed; the table says which). Read ${esc(/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(String(history.data_read_at)) ? String(history.data_read_at).replace('T', ' ').slice(0, 16) + ' UTC' : 'at an unknown time')} from <a href="https://data.promptugal.news/api/v1/history/weather/${placeId}.json">data.promptugal.news's history</a>. IPMA's data, under IPMA's terms (not for commercial use).`;
  const rowsHtml = P.rows.map((r) => `<tr><td>${esc(long(r.day))}${r.kind === 'today' ? ' (today, so far)' : r.kind === 'next' ? ' (forecast)' : ''}</td><td class="n">${cell(r.observed?.low)}</td><td class="n">${cell(r.observed?.high)}</td><td class="n">${r.observed?.rain != null ? esc(r.observed.rain + ' mm') : '<span class="na">n/a</span>'}</td><td class="n">${r.observed?.hours != null ? esc(r.observed.hours) : '<span class="na">n/a</span>'}</td><td class="n">${cell(r.said?.low)}</td><td class="n">${cell(r.said?.high)}</td><td class="n">${cell(r.forecast?.low)}</td><td class="n">${cell(r.forecast?.high)}</td><td>${r.kind === 'past' ? esc(saidFrom(r.said)) : ''}</td></tr>`).join('');
  const html = `<section class="past panel" id="past"><h2>The past week, today and the forecast</h2>
<p class="src">${src}</p>
<ul class="pf-key"><li class="k-obs">Measured</li><li class="k-said">What we said the day before</li><li class="k-fc">Forecast</li><li class="k-gap">No reading</li></ul>
${chart(P)}
${chart(P, 360, 290, true)}
<p>${track} A miss is shown as plainly as a hit: under each full past day, how far the measured high was from what we said (✓ when it was the same to the nearest degree).</p>
<details><summary>The same values as a table</summary><div class="table-wrap"><table><thead><tr><th scope="col">Day</th><th scope="col">Low</th><th scope="col">High</th><th scope="col">Rain</th><th scope="col">Hours seen</th><th scope="col">We said: low</th><th scope="col">We said: high</th><th scope="col">Forecast: low</th><th scope="col">Forecast: high</th><th scope="col">What we said, from</th></tr></thead><tbody>${rowsHtml}</tbody></table></div></details></section>`;
  const md = `## The past week, today and the forecast\n\nRecord begins ${longY(P.first)}. ${trackMd}\n\n| Day | Low | High | Rain | Hours seen | We said: low | We said: high | Forecast: low | Forecast: high |\n|---|---|---|---|---|---|---|---|---|\n${P.rows.map((r) => `| ${long(r.day)}${r.kind === 'today' ? ' (today, so far)' : r.kind === 'next' ? ' (forecast)' : ''} | ${f1(r.observed?.low)} | ${f1(r.observed?.high)} | ${r.observed?.rain != null ? r.observed.rain + ' mm' : 'n/a'} | ${r.observed?.hours ?? 'n/a'} | ${f1(r.said?.low)} | ${f1(r.said?.high)} | ${f1(r.forecast?.low)} | ${f1(r.forecast?.high)} |`).join('\n')}\n\nMeasured: IPMA's station ${mdt(stationName)} (UTC days). What we said: IPMA's forecast for that day as published the day before. Source: https://data.promptugal.news/api/v1/history/weather/${placeId}.json. IPMA's data, under IPMA's terms (not for commercial use).\n\n`;
  return { html, md };
}
