// Storm Charles, item 2 of this team's storm plan (board/team/weather/storm-items.md): "warned against observed",
// every Lisbon station's hourly mean wind on one time axis, under the Lisbon wind warnings in force. A build-time
// SVG (no script; CSP script-src 'self'), with a table view and a markdown twin. Data: the Storm site's record of
// IPMA's hourly station observations, as moved to data.promptugal.news (api/v1/storm/charles/weather/stations.json),
// and the archive's own warnings (data/storms/charles.json). weather.b@PrompTugal.dinis. Code: Apache-2.0.
//
// Colours (the dataviz method, validated with its script on 21 Nov 2026 against this site's paper #f6f3ec and
// #121317): the two windiest stations take categorical slots 1 and 3 (blue, aqua; orange is left out because the
// warning bands use the warning colours); the other six are muted grey. Every coloured line is labelled directly.

const esc = (s) => String(s ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const HOUR = /^\d{4}-\d\d-\d\dT\d\d:00Z$/;
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (t) => { const d = new Date(t); return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
const hm = (t) => new Date(t).toISOString().slice(11, 16);
const wind = (v) => (typeof v === 'number' && isFinite(v) && v >= 0 && v < 300 ? v : null);
const LEVELS = { yellow: 1, orange: 2, red: 3 };

export const STORMWIND_CSS = `
.sw-chart{display:block;width:100%;height:auto}
.sw{--sw-1:#2a78d6;--sw-2:#1baf7a;--sw-rest:#a3a29a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .sw{--sw-1:#3987e5;--sw-2:#199e70;--sw-rest:#5f5e58}}
:root[data-theme="dark"] .sw{--sw-1:#3987e5;--sw-2:#199e70;--sw-rest:#5f5e58}
.sw .sw-grid{stroke:var(--rule);stroke-width:1}
.sw .sw-axis{fill:var(--muted);font:12px var(--sans)}
.sw .sw-lab{fill:var(--ink);font:700 12px var(--sans)}
.sw .sw-line{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
.sw .sw-rest{stroke:var(--sw-rest);stroke-width:1.5}
.sw .sw-1{stroke:var(--sw-1)}.sw .sw-2{stroke:var(--sw-2)}
.sw .sw-key{display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:middle;margin-right:4px}
.sw .sw-key.sw-1{background:var(--sw-1)}.sw .sw-key.sw-2{background:var(--sw-2)}.sw .sw-key.sw-rest{background:var(--sw-rest)}
.sw .sw-band.red{fill:#c62828}.sw .sw-band.red.sw-lowered{fill:none;stroke:#c62828;stroke-width:2;stroke-dasharray:4 3}.sw .sw-band.orange.sw-lowered{fill:none;stroke:#ef8a17;stroke-width:2;stroke-dasharray:4 3}.sw .sw-band.orange{fill:#ef8a17}.sw .sw-band.yellow{fill:#f2c94c}
.sw .sw-legend{margin:.4rem 0;font-size:.9rem}
.sw .sw-legend span{margin-right:1rem;white-space:nowrap}
`;

// stations = the stations file's `stations`; warnings = the archive's warnings (district, kind, level, from, to)
export function stormWindSection(stationsFile, warnings) {
  const st = (Array.isArray(stationsFile?.stations) ? stationsFile.stations : []).slice(0, 20)
    .map((s) => ({ id: String(s?.id ?? '').replace(/[^0-9A-Za-z]/g, '').slice(0, 12), name: String(s?.name ?? '').replace(/[\s\u2028\u2029]+/g, ' ').replace(/[\[\]()<>*_`#|\\]/g, '').trim().slice(0, 60),
      hours: (Array.isArray(s?.hourly) ? s.hourly : []).filter((h) => h && HOUR.test(h.time_utc)).map((h) => ({ t: Date.parse(h.time_utc), v: wind(h.wind_mean_kmh) })).filter((h) => Number.isFinite(h.t)) }))
    .filter((s) => s.id && s.name && s.hours.some((h) => h.v != null));
  if (st.length < 2) return null;
  const all = st.flatMap((s) => s.hours.map((h) => h.t));
  const t0 = Math.min(...all), t1 = Math.max(...all);
  if (!(t1 > t0) || t1 - t0 > 14 * 86400e3) return null;
  const max = (s) => Math.max(...s.hours.map((h) => h.v ?? -1));
  const ranked = [...st].sort((a, b) => max(b) - max(a));
  const cls = new Map(ranked.map((s, i) => [s.id, i === 0 ? 'sw-1' : i === 1 ? 'sw-2' : 'sw-rest']));
  const lisbonWind = (Array.isArray(warnings) ? warnings : []).filter((w) => w && w.district === 'Lisboa' && w.kind === 'wind' && Object.hasOwn(LEVELS, w.level) && !isNaN(Date.parse(w.from)) && !isNaN(Date.parse(w.to)));
  // a warning another one says it lowered ("lowering the red wind warning", with that one's sent time) is drawn in
  // outline, not as in force: the archive records IPMA lowering Lisbon's red to orange before the red period began
  const sent = (w) => { const m = /sent (\d{1,2}) Nov (\d\d:\d\d)/.exec(String(w.source || '')); return m ? { day: +m[1], at: m[2] } : null; };
  const lowered = (w) => { for (const o of lisbonWind) { const m = /lowering the (red|orange|yellow) wind warning/.exec(String(o.source || '')); const so = sent(o), sw = sent(w);
    if (o !== w && m && m[1] === w.level && so && (!sw || so.day * 1440 + +so.at.slice(0, 2) * 60 + +so.at.slice(3) > sw.day * 1440 + +sw.at.slice(0, 2) * 60 + +sw.at.slice(3))) return { to: o.level, at: `${so.day} Nov ${so.at} UTC` }; } return null; };
  const bands = lisbonWind.map((w) => ({ level: w.level, from: Math.max(t0, Date.parse(w.from)), to: Math.min(t1, Date.parse(w.to)), rawFrom: w.from, rawTo: w.to, source: String(w.source || '').slice(0, 300), lowered: lowered(w) }))
    .filter((b) => b.to > b.from);

  const W = 760, L = 44, R = 150, T = 12, bandH = 18, gap = 6, plotTop = T + bands.length * (bandH + 4) + gap, plotH = 220, H = plotTop + plotH + 42;
  const top = Math.max(10, Math.ceil(Math.max(...st.map(max)) / 10) * 10);
  const x = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R), y = (v) => plotTop + plotH - (v / top) * plotH;
  const f = (n) => Math.round(n * 10) / 10;
  let svg = '';
  // the warnings, one row each, above the plot
  bands.forEach((b, i) => { const yy = T + i * (bandH + 4), x0 = x(b.from), x1 = x(b.to);
    svg += `<rect class="sw-band ${b.level}${b.lowered ? ' sw-lowered' : ''}" x="${f(x0)}" y="${yy}" width="${f(Math.max(2, x1 - x0))}" height="${bandH}" rx="3"><title>${esc(`${b.level} wind warning, Lisboa, ${day(b.rawFrom)} ${hm(b.rawFrom)} to ${hm(b.rawTo)} UTC: ${b.source}`)}</title></rect>`;
    // the period shaded faintly through the plot, so each line reads against it
    if (!b.lowered) svg += `<rect class="sw-band ${b.level}" opacity="0.12" x="${f(x0)}" y="${plotTop}" width="${f(Math.max(2, x1 - x0))}" height="${plotH}"/>`;
    // the label beside the bar, in ink: after it when there is room, else before it
    const text = b.lowered ? `${b.level}, ${hm(b.rawFrom)} to ${hm(b.rawTo)}: lowered to ${b.lowered.to} ${b.lowered.at}` : `${b.level} wind warning, ${hm(b.rawFrom)} to ${hm(b.rawTo)} UTC`, after = W - x1 > 300;
    svg += `<text class="sw-axis" x="${f(after ? x1 + 6 : x0 - 6)}" y="${yy + 13}"${after ? '' : ' text-anchor="end"'}>${esc(text)}</text>`; });
  // grid and axes: every 10 km/h; a tick at each UTC midnight and noon
  for (let v = 0; v <= top; v += 10) svg += `<line class="sw-grid" x1="${L}" x2="${W - R}" y1="${f(y(v))}" y2="${f(y(v))}"/><text class="sw-axis" x="${L - 6}" y="${f(y(v)) + 4}" text-anchor="end">${v}</text>`;
  for (let t = Math.ceil(t0 / 43200e3) * 43200e3; t <= t1; t += 43200e3) {
    const midnight = new Date(t).getUTCHours() === 0;
    svg += `<line class="sw-grid" x1="${f(x(t))}" x2="${f(x(t))}" y1="${plotTop}" y2="${plotTop + plotH}"${midnight ? '' : ' stroke-dasharray="2 3"'}/><text class="sw-axis" x="${f(x(t))}" y="${plotTop + plotH + 16}" text-anchor="middle">${midnight ? esc(day(t)) : '12:00'}</text>`;
  }
  svg += `<text class="sw-axis" x="${L}" y="${H - 2}">km/h, mean wind each hour; times UTC (Lisbon's clock in November)</text>`;
  // lines, grey first so the coloured ones sit on top; a missing hour breaks the line
  for (const s of [...ranked].reverse()) {
    let d = '', pen = false;
    for (const h of s.hours) { if (h.v == null) { pen = false; continue; } d += `${pen ? 'L' : 'M'}${f(x(h.t))} ${f(y(h.v))}`; pen = true; }
    svg += `<path class="sw-line ${cls.get(s.id)}" d="${d}"><title>${esc(`${s.name}: highest hourly mean wind ${max(s)} km/h`)}</title></path>`;
  }
  // direct labels for the two coloured lines, at their last reading, kept apart
  const labs = ranked.slice(0, 2).map((s) => { const last = [...s.hours].reverse().find((h) => h.v != null); return { s, yy: y(last.v) }; }).sort((a, b) => a.yy - b.yy);
  if (labs.length === 2 && labs[1].yy - labs[0].yy < 14) labs[1].yy = labs[0].yy + 14;
  for (const l of labs) svg += `<text class="sw-lab" x="${W - R + 6}" y="${f(l.yy) + 4}">${esc(l.s.name.length > 22 ? l.s.name.slice(0, 21) + '…' : l.s.name)}</text>`;

  const aria = `Hourly mean wind at ${st.length} IPMA stations in and next to Lisbon, ${day(t0)} to ${day(t1)}, under Lisbon's wind warnings. Highest: ${ranked[0].name}, ${max(ranked[0])} km/h.`;
  const legend = `<p class="sw-legend">${ranked.slice(0, 2).map((s) => `<span><i class="sw-key ${cls.get(s.id)}"></i>${esc(s.name)} (windiest hour ${max(s)} km/h)</span>`).join('')}<span><i class="sw-key sw-rest"></i>the other ${st.length - 2} stations</span></p>`;
  const rows = ranked.map((s) => { const at = s.hours.find((h) => h.v === max(s)); return { name: s.name, id: s.id, peak: max(s), at: at ? `${day(at.t)} ${hm(at.t)} UTC` : 'n/a', hours: s.hours.filter((h) => h.v != null).length }; });
  const table = `<details><summary>The figures as a table</summary><div class="table-wrap"><table><thead><tr><th scope="col">Station</th><th scope="col">Highest hourly mean wind</th><th scope="col">At</th><th scope="col">Hours kept</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.name)} (${esc(r.id)})</td><td class="n">${r.peak} km/h</td><td>${esc(r.at)}</td><td class="n">${r.hours}</td></tr>`).join('')}</tbody></table></div></details>`;
  const srcTxt = `IPMA's hourly station observations, as kept by the Storm Charles site across its reads and moved to <a href="https://data.promptugal.news/api/v1/storm/charles/weather/stations.json">data.promptugal.news</a>. Warnings: IPMA's, as recorded in this archive (table above). This is the mean wind for each hour: IPMA's station feed carries no gusts, which ran far higher (see the peaks).`;
  const html = `<section class="sw"><h2>Warned against observed: wind in Lisbon, hour by hour</h2>
<p>The ${st.length} IPMA stations in and next to Lisbon that the Storm site kept, on one time axis, under the wind warnings IPMA issued for the Lisboa district. The shading is the time a warning was in force; a dashed outline is one IPMA lowered before it began. The coloured lines are the two stations with the windiest hour; the grey ones are the rest.</p>
${legend}<svg class="sw-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">${svg}</svg>
${table}
<p class="src">${srcTxt}</p></section>`;
  const md = `## Warned against observed: wind in Lisbon, hour by hour\n\n${aria}\n\nWind warnings IPMA issued for the Lisboa district: ${bands.map((b) => `${b.level} ${day(b.rawFrom)} ${hm(b.rawFrom)} to ${hm(b.rawTo)} UTC${b.lowered ? ` (lowered to ${b.lowered.to} ${b.lowered.at}, before it began)` : ''}`).join('; ') || 'none recorded'}.\n\n| Station | Highest hourly mean wind | At | Hours kept |\n|---|---|---|---|\n${rows.map((r) => `| ${r.name.replace(/[|\n\r]/g, ' ')} (${r.id}) | ${r.peak} km/h | ${r.at} | ${r.hours} |`).join('\n')}\n\nSource: IPMA's hourly station observations, kept by the Storm Charles site, at https://data.promptugal.news/api/v1/storm/charles/weather/stations.json. Mean wind only: the feed carries no gusts.\n\n`;
  return { html, md };
}
