// Warnings timeline by district: server-rendered SVG plus a markdown table.
// Times from IPMA are Portugal local wall-clock strings with no zone; they are
// handled here as wall-clock values (parsed as if UTC) and never converted.

const DAY = 86400000;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RANK = { yellow: 1, orange: 2, red: 3 };
const LEVEL_NAME = { yellow: 'Yellow', orange: 'Orange', red: 'Red' };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const cap = (s) => { s = String(s ?? ''); return s.charAt(0).toUpperCase() + s.slice(1); };

// Wall-clock string to a number (ms); NaN if unparseable.
function wall(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s ?? ''));
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
}

// The build time as Portugal wall-clock ms.
function lisbonWall(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const g = (t) => +parts.find((p) => p.type === t).value;
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
}

const dayLabel = (ms) => { const d = new Date(ms); return `${WD[d.getUTCDay()]} ${d.getUTCDate()}`; };
const full = (ms) => { const d = new Date(ms); return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };

export const TIMELINE_CSS = `
.timeline{margin:1rem 0}
.timeline svg{display:block;width:100%;height:auto;max-width:100%}
.timeline .rowbg{fill:var(--panel)}
.timeline .rowbg.alt{fill:none}
.timeline .rowline{stroke:var(--rule);stroke-width:1}
.timeline .grid{stroke:var(--rule);stroke-width:1}
.timeline .axis{fill:var(--muted);font:12.5px var(--mono)}
.timeline .dname{fill:var(--ink);font:13px var(--sans)}
.timeline a:hover .dname{fill:var(--red);text-decoration:underline}
.timeline .now{stroke:var(--red);stroke-width:2}
.timeline .nowlbl{fill:var(--red);font:600 12.5px var(--mono)}
.timeline .bar{stroke:var(--ink);stroke-opacity:.45;stroke-width:.75}
.timeline .bar.warn-yellow{fill:var(--w-yellow)}
.timeline .bar.warn-orange{fill:var(--w-orange)}
.timeline .bar.warn-red{fill:var(--w-red)}
.timeline .blabel{font:11px var(--sans);pointer-events:none}
.timeline .blabel.warn-yellow,.timeline .blabel.warn-orange{fill:#121317}
.timeline .blabel.warn-red{fill:#fff}
.timeline .empty{fill:var(--muted);font:italic 11px var(--sans)}
`.trim();

export function warningsTimeline({ warnings, districts, now, width = 760 }) {
  const W = Number(width) || 760;
  const order = new Map(districts.map((d, i) => [d.area, i]));
  const items = [];
  for (const w of (warnings && warnings.active) || []) {
    if (!order.has(w.area) || !RANK[w.level]) continue;
    const s = wall(w.start), e = wall(w.end);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) continue;
    items.push({ ...w, s, e, di: order.get(w.area) });
  }
  items.sort((a, b) => a.di - b.di || a.s - b.s || a.e - b.e);

  const nowMs = lisbonWall(now instanceof Date ? now : new Date());
  const t0 = Math.floor(nowMs / DAY) * DAY;
  let t1 = items.length ? Math.max(...items.map((i) => i.e)) : t0 + DAY;
  t1 = Math.min(Math.max(t1, t0 + 6 * 3600000), t0 + 4 * DAY);
  const span = t1 - t0;

  const L = 118, R = 12, TOP = 34, LANE = 15, GAP = 2, PADV = 4, MINROW = 26;
  const plotW = W - L - R;
  const x = (t) => L + ((Math.min(Math.max(t, t0), t1) - t0) / span) * plotW;
  const f = (n) => Math.round(n * 10) / 10;

  // Sub-lanes per district.
  const lanesOf = districts.map(() => []);
  for (const it of items) {
    const lanes = lanesOf[it.di];
    let k = lanes.findIndex((end) => end <= it.s);
    if (k < 0) { k = lanes.length; lanes.push(0); }
    lanes[k] = it.e;
    it.lane = k;
  }
  const rowH = lanesOf.map((l) => Math.max(MINROW, PADV * 2 + Math.max(1, l.length) * (LANE + GAP) - GAP));
  const rowY = []; let y = TOP;
  for (const h of rowH) { rowY.push(y); y += h; }
  const H = y + 22;

  const g = [];
  // Row backgrounds and separators.
  districts.forEach((d, i) => {
    g.push(`<rect class="rowbg${i % 2 ? ' alt' : ''}" x="0" y="${rowY[i]}" width="${W}" height="${rowH[i]}"/>`);
  });
  // Day gridlines and labels.
  for (let t = t0; t <= t1; t += DAY) {
    const gx = f(x(t));
    g.push(`<line class="grid" x1="${gx}" y1="${TOP - 6}" x2="${gx}" y2="${y}"/>`);
    if (t + DAY * 0.35 <= t1) {
      const cx = x(t) + Math.min(x(Math.min(t + DAY, t1)) - x(t), plotW) / 2;
      g.push(`<text class="axis" x="${f(cx)}" y="${TOP - 12}" text-anchor="middle">${esc(dayLabel(t))}</text>`);
    }
  }
  // District rows.
  districts.forEach((d, i) => {
    const cy = rowY[i] + rowH[i] / 2 + 4.5;
    g.push(`<a href="${esc(d.href)}"><text class="dname" x="8" y="${f(cy)}">${esc(d.name)}</text></a>`);
    g.push(`<line class="rowline" x1="0" y1="${rowY[i] + rowH[i]}" x2="${W}" y2="${rowY[i] + rowH[i]}"/>`);
    if (!lanesOf[i].length) {
      g.push(`<text class="empty" x="${L + 6}" y="${f(cy)}">no warning</text>`);
    }
  });
  // Bars.
  for (const it of items) {
    const bx = x(it.s), bw = Math.max(2, x(it.e) - bx);
    const by = rowY[it.di] + PADV + it.lane * (LANE + GAP);
    const dn = districts[it.di].name;
    const tip = `${dn}: ${LEVEL_NAME[it.level]} ${it.type}, ${full(it.s)} to ${full(it.e)} (Portugal time)`;
    const label = cap(it.type);
    const fits = bw >= label.length * 6 + 10;
    g.push(`<g><title>${esc(tip)}</title><rect class="bar warn-${it.level}" x="${f(bx)}" y="${by}" width="${f(bw)}" height="${LANE}" rx="2"/>` +
      (fits ? `<text class="blabel warn-${it.level}" x="${f(bx + 5)}" y="${by + 11}">${esc(label)}</text>` : '') + `</g>`);
  }
  // Now line.
  if (nowMs >= t0 && nowMs <= t1) {
    const nx = f(x(nowMs));
    const right = nx > W - 50;
    g.push(`<line class="now" x1="${nx}" y1="${TOP - 4}" x2="${nx}" y2="${y + 4}"/>`);
    g.push(`<text class="nowlbl" x="${nx}" y="${y + 16}" text-anchor="${nx > W - 20 ? 'end' : nx < L + 20 ? 'start' : 'middle'}">now</text>`);
  }

  const top = items.reduce((m, i) => Math.max(m, RANK[i.level]), 0);
  const topName = top ? Object.keys(RANK).find((k) => RANK[k] === top) : null;
  const nDist = new Set(items.map((i) => i.di)).size;
  const label = items.length
    ? `Timeline of ${items.length} IPMA weather warning${items.length === 1 ? '' : 's'} across ${nDist} of ${districts.length} districts from ${dayLabel(t0)} to ${dayLabel(t1 - 1)}. Highest level: ${topName}. Portugal time.`
    : `Timeline of IPMA weather warnings: none active in the ${districts.length} districts of mainland Portugal.`;

  const svg = `<svg role="img" aria-label="${esc(label)}" viewBox="0 0 ${W} ${f(H)}" width="${W}" height="${f(H)}" preserveAspectRatio="xMidYMin meet" xmlns="http://www.w3.org/2000/svg">${g.join('')}</svg>`;
  const cap2 = items.length
    ? `Warnings by district, ${dayLabel(t0)} to ${dayLabel(t1 - 1)}, Portugal time. Bars are coloured by level; overlapping warnings sit on separate lines. Source: IPMA.`
    : 'No active IPMA warnings in mainland districts. Source: IPMA.';
  const html = `<figure class="chart timeline">${svg}<figcaption>${esc(cap2)}</figcaption></figure>`;

  const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ');
  const md = ['| District | Level | Warning | From | To |', '| --- | --- | --- | --- | --- |']
    .concat(items.map((i) => `| ${cell(districts[i.di].name)} | ${LEVEL_NAME[i.level]} | ${cell(i.type)} | ${full(i.s)} | ${full(i.e)} |`))
    .join('\n');

  return { html, md };
}
