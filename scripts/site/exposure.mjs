// Storm Charles: residents in areas under IPMA's warnings, by UTC hour. Build-time stacked SVG, a table of the same
// numbers, the file's own about/method/confidence, and where it came from. weather.b@PrompTugal.dinis, 18 Nov 2026.
// Code: Apache-2.0. The data is the Storm site's (Apache-2.0), built on IPMA open data and INE census counts.
// Wording rules (security pre-review, 18 Nov 2026, 19:20 UTC): "residents in areas under", never "people affected";
// not a warning; no area finer than the file's own.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LEVELS = ['red', 'orange', 'yellow'];
const NAME = { red: 'Red', orange: 'Orange', yellow: 'Yellow' };
const int = (v) => (Number.isFinite(v) && v >= 0 ? Math.round(Math.min(v, 2e7)) : 0); // Portugal has about 1e7 residents
// fetched text: a string, one line, capped; the markdown twin also loses the characters that make links, tags or table cells
const txt = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 600) : '');
const mdt = (v) => txt(v).replace(/[\[\]<>|`]/g, '');
const fmt = (n) => int(n).toLocaleString('en-GB');
const hourOf = (iso) => { const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):/.exec(String(iso ?? '')); return m ? { day: +m[3], mon: +m[2], h: m[4], key: `${m[3]}/${m[2]} ${m[4]}:00` } : null; };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SOURCE_URL = 'https://data.promptugal.news/api/v1/storm/charles/exposure/people-by-hour.json';

export const EXPOSURE_CSS = `
.exposure svg{display:block;width:100%;height:auto;max-width:100%}
.exposure .grid{stroke:var(--rule);stroke-width:1}
.exposure .axis{fill:var(--muted);font:12px var(--mono)}
.exposure .bar{stroke:var(--ink);stroke-opacity:.35;stroke-width:.5}
.exposure .bar.warn-yellow{fill:var(--w-yellow)}
.exposure .bar.warn-orange{fill:var(--w-orange)}
.exposure .bar.warn-red{fill:var(--w-red)}
.exposure .key{display:flex;gap:1rem;flex-wrap:wrap;font-size:.9rem;margin:.4rem 0}
.exposure .key span::before{content:"";display:inline-block;width:.9em;height:.9em;margin-right:.35em;vertical-align:-.1em;border:1px solid var(--rule)}
.exposure .key .warn-yellow::before{background:var(--w-yellow)}
.exposure .key .warn-orange::before{background:var(--w-orange)}
.exposure .key .warn-red::before{background:var(--w-red)}
.exposure td.n{text-align:right;font-variant-numeric:tabular-nums}
.exposure .prov dt{font-weight:600}
.exposure .prov dd{margin:0 0 .5rem 0}
`.trim();

function rows(j) {
  return (Array.isArray(j?.hours) ? j.hours : []).map((h) => ({ at: hourOf(h?.hour_utc), red: int(h?.red), orange: int(h?.orange), yellow: int(h?.yellow) })).filter((r) => r.at).slice(0, 400);
}

function chart(list, W = 760, H = 300) {
  const L = 64, R = 8, T = 10, B = 34, iw = W - L - R, ih = H - T - B;
  const max = Math.max(1, ...list.map((r) => r.red + r.orange + r.yellow));
  const step = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / step) * step;
  const y = (v) => T + ih - (v / top) * ih, bw = iw / list.length;
  const ticks = [];
  for (let v = 0; v <= top + 1; v += top / 4) ticks.push(`<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="axis" x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${(v / 1e6).toFixed(v && v < 1e6 ? 1 : 0)}m</text>`);
  const bars = list.map((r, i) => {
    let base = 0; const x = (L + i * bw + 1).toFixed(1), w = Math.max(1, bw - 2).toFixed(1);
    const out = LEVELS.map((lv) => { const v = r[lv]; if (!v) return ''; const y1 = y(base + v), y0 = y(base); base += v; return `<rect class="bar warn-${lv}" x="${x}" y="${y1.toFixed(1)}" width="${w}" height="${(y0 - y1).toFixed(1)}"><title>${esc(r.at.key)} UTC: ${fmt(v)} residents in areas under ${NAME[lv].toLowerCase()}</title></rect>`; }).join('');
    const lbl = (r.at.h === '00' && i > 2) || i === 0 ? `<text class="axis" x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - 18}" text-anchor="middle">${r.at.h}:00</text><text class="axis" x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle">${r.at.day} ${MON[r.at.mon - 1]}</text>` : (+r.at.h % 6 === 0 ? `<text class="axis" x="${(L + i * bw + bw / 2).toFixed(1)}" y="${H - 18}" text-anchor="middle">${r.at.h}:00</text>` : '');
    return out + lbl;
  }).join('');
  const peak = list.reduce((a, r) => (r.red + r.orange + r.yellow > a.red + a.orange + a.yellow ? r : a), list[0]);
  const label = `Stacked bars, one per UTC hour from ${list[0].at.key} to ${list[list.length - 1].at.key}: residents in areas under red, orange and yellow IPMA warnings. Highest total ${fmt(peak.red + peak.orange + peak.yellow)} at ${peak.at.key} UTC. The same numbers are in the table below.`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${ticks.join('')}${bars}</svg>`;
}

// Returns { html, md } or null when the file is missing or empty.
export function exposureSection(j) {
  const list = rows(j);
  if (!list.length) return null;
  const head = '<tr><th scope="col">Hour (UTC)</th><th scope="col">Red</th><th scope="col">Orange</th><th scope="col">Yellow</th></tr>';
  const table = list.map((r) => `<tr><td>${esc(r.at.key)}</td><td class="n">${fmt(r.red)}</td><td class="n">${fmt(r.orange)}</td><td class="n">${fmt(r.yellow)}</td></tr>`).join('');
  const html = `<section class="exposure" id="residents-by-hour"><h2>Residents in areas under IPMA's warnings, by hour</h2>
<p class="note">Not a warning: IPMA issues the warnings and ANEPC the instructions. These are census residents living in the warning areas, not a count of people harmed or where people were.</p>
<div class="key"><span class="warn-red">Red</span><span class="warn-orange">Orange</span><span class="warn-yellow">Yellow</span></div>
${chart(list)}
<p class="src">An hour at zero had no warning above green in the file read.</p>
<details><summary>The same numbers as a table</summary><div class="table-wrap"><table><thead>${head}</thead><tbody>${table}</tbody></table></div></details>
<dl class="prov">
<dt>What it is</dt><dd>${esc(txt(j.about))}</dd>
<dt>How it was worked out</dt><dd>${esc(txt(j.method))}</dd>
<dt>Confidence</dt><dd>${esc(txt(j.confidence))}</dd>
<dt>Where it came from</dt><dd>The Storm Charles site's data (written by ${esc(txt(j.by))}), from IPMA's warnings and INE's 2021 census, read ${esc(txt(j.read_utc))}; copied unchanged from <a href="${SOURCE_URL}">data.promptugal.news</a>. Licence: ${esc(txt(j.license?.name) || 'Apache-2.0')} for the file; ${esc(txt(j.licence))}.</dd>
</dl></section>`;
  const md = `## Residents in areas under IPMA's warnings, by hour\n\nNot a warning: IPMA issues the warnings and ANEPC the instructions.\n\n| Hour (UTC) | Red | Orange | Yellow |\n|---|---|---|---|\n${list.map((r) => `| ${r.at.key} | ${fmt(r.red)} | ${fmt(r.orange)} | ${fmt(r.yellow)} |`).join('\n')}\n\n- What it is: ${mdt(j.about)}\n- How it was worked out: ${mdt(j.method)}\n- Confidence: ${mdt(j.confidence)}\n- Where it came from: ${SOURCE_URL} (read ${mdt(j.read_utc)}; by ${mdt(j.by)}). Licence: ${mdt(j.license?.name) || 'Apache-2.0'} for the file; ${mdt(j.licence)}.\n\n`;
  return { html, md };
}
