// Shared pieces of the site generator: data loading, escaping, the page frame, markdown, maps and charts.
// Node 18+, no dependencies. weather@PrompTugal.dinis, 17 Nov 2026. Code: Apache-2.0.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const SITE = 'https://weather.promptugal.news';
export const readJSON = p => JSON.parse(readFileSync(p, 'utf8'));
export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// A link built from data (a fetched source or the API) is kept only if it is http(s) or site-relative; anything else
// (javascript:, data:, vbscript:, protocol-relative ...) becomes "#". Escaped for an attribute either way.
export const safeHref = u => { const v = String(u ?? '').trim(); return /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*|#[^\s]*)$/i.test(v) ? esc(v) : '#'; };

// ---------------------------------------------------------------- data
export function loadData() {
  const now = {};
  for (const f of readdirSync('data/now')) if (f.endsWith('.json')) now[f.replace(/\.json$/, '')] = readJSON(join('data/now', f));
  const placesSrc = readJSON('data/map/places-source.json').places;
  const next = readJSON('data/map/next-places-source.json').places;
  const local = readJSON('data/map/storm-local-map.json');
  const types = readJSON('data/reference/ipma-weather-types.json').types;
  const sync = readJSON('data/sync.json');
  const towns = placesSrc.filter(p => p.parent === 'algarve' || p.parent === 'loule').filter(p => now[p.id]).map(p => {
    const m = (Array.isArray(local) ? local : local.places || []).find(x => x.place === p.id) || {};
    return { id: p.id, name: p.name, kind: p.kind, at: p.at, dico: m.dico, now: now[p.id] };
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  const api = {};
  if (existsSync('data/api')) for (const f of readdirSync('data/api')) if (f.endsWith('.json')) api[f.replace(/\.json$/, '')] = readJSON(join('data/api', f));
  const capitals = next.map(p => capital(p, api))
    .concat([{ id: 'faro', name: 'Faro', district: 'Faro', at: [-7.935, 37.019], live: true, algarve: true, level: worstWarning(now.algarve) }])
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  const storms = existsSync('data/storms') ? readdirSync('data/storms').filter(f => f.endsWith('.json')).map(f => readJSON(join('data/storms', f))) : [];
  const stormExposure = existsSync('data/storm/charles-people-by-hour.json') ? readJSON('data/storm/charles-people-by-hour.json') : null;
  return { now, region: now.algarve, towns, capitals, types, sync, storms, api, stormExposure };
}

// ---------------------------------------------------------------- a district capital, from data.promptugal.news's API
// IPMA's place id holds the municipality's code (DICO): 1141600 is 1 + 1416 (Santarém) + 00. The warning area is the
// city forecast's own area code (LSB, PTO ...). Sea only where IPMA has a coastal point of the same name.
const plain = s => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
function capital(p, api) {
  const c = { id: p.id, name: p.name, district: p.district, at: p.at };
  const cf = api['ipma-city-forecasts'], wa = api['ipma-warnings'], fr = api['ipma-fire-risk'], sea = api['ipma-sea'];
  const city = cf?.cities?.find(x => plain(x.name) === plain(p.name));
  if (!city) return c;
  c.live = true;
  c.area = city.area;
  c.forecast = { place: city.name, id: city.id, source: city.source, page: cf.provenance?.page, read_at: city.read_at, updated: city.updated, days: city.days };
  c.dico = String(city.id).slice(1, 5);
  const m = fr?.municipalities?.find(x => x.dico === c.dico);
  if (m) c.fire_risk = { municipality: m.dico, days: m.days, page: fr.provenance?.page, source: fr.provenance?.source, read_at: fr.read_at };
  const active = (wa?.active || []).filter(a => a.area === city.area);
  c.warnings = { area: `${city.area} (the ${p.district} district)`, active, page: wa?.provenance?.page, source: wa?.provenance?.source, read_at: wa?.read_at };
  c.level = active.reduce((lv, a) => (LEVEL[a.level] ?? 0) > (LEVEL[lv] ?? 0) ? a.level : lv, 'green');
  const coast = sea?.coasts?.find(x => plain(x.name).replace(/, costa$/, '') === plain(p.name));
  if (coast) c.sea = { coast: coast.name, days: coast.days, page: sea.provenance?.page, source: sea.provenance?.source, read_at: sea.read_at };
  // UV: IPMA's file is keyed by the same place id as the city forecast; where it gives several values for a day,
  // the highest is kept (the reader's worst case), and the page says so
  const uvp = api['ipma-uv']?.places?.find(x => x.id === city.id);
  if (uvp?.days?.length) {
    const by = {}; let multi = false;
    for (const d of uvp.days) { if (d.index == null) continue; if (d.date in by) multi = true; by[d.date] = Math.max(by[d.date] ?? -1, d.index); }
    const days = Object.keys(by).sort().map(date => ({ date, index: by[date] }));
    if (days.length) c.uv = { days, multi, page: api['ipma-uv'].provenance?.page, source: api['ipma-uv'].provenance?.source, read_at: api['ipma-uv'].read_at };
  }
  // the nearest IPMA station that reported in the latest hour, within 25 km
  const ob = api['ipma-observations'];
  if (ob?.stations) {
    const [lon, lat] = p.at, k = Math.cos(lat * Math.PI / 180);
    const near = ob.stations.filter(x => x.reading && x.reading.temp_c != null)
      .map(x => ({ x, km: Math.round(Math.hypot((x.lat - lat) * 111.2, (x.lon - lon) * 111.2 * k) * 10) / 10 }))
      .sort((a, b) => a.km - b.km)[0];
    if (near && near.km <= 25) c.station = { name: near.x.name, id: near.x.id, km: near.km, at: ob.hour_utc, reading: near.x.reading, page: ob.provenance?.page, source: ob.provenance?.source, read_at: ob.read_at };
  }
  c.read_at = cf.read_at;
  return c;
}

// ---------------------------------------------------------------- words and numbers
export const WIND_DIR = { 0: 'calm', 1: 'N', 2: 'NE', 3: 'E', 4: 'SE', 5: 'S', 6: 'SW', 7: 'W', 8: 'NW', 9: 'N' };
export const FIRE = { low: 1, moderate: 2, high: 3, 'very high': 4, maximum: 5 };
export const FIRE_PT = { low: 'reduzido', moderate: 'moderado', high: 'elevado', 'very high': 'muito elevado', maximum: 'máximo' };
export const LEVEL = { green: 0, yellow: 1, orange: 2, red: 3 };
export const num = (v, unit = '', d = 1) => v === null || v === undefined || Number.isNaN(v) ? null : `${Number(v).toFixed(d).replace(/\.0$/, '')}${unit}`;
export const show = (v, unit, d) => num(v, unit, d) ?? '<span class="na">not reported</span>';
export const showMd = (v, unit, d) => num(v, unit, d) ?? 'not reported';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function when(iso) { // "17 Nov 2026, 17:16 UTC"
  if (!iso) return 'unknown time';
  const d = new Date(/Z$|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z');
  if (Number.isNaN(+d)) return esc(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}
export function localWhen(s) { // IPMA warning times are Portugal mainland local time (UTC in winter)
  const m = String(s || '').match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/);
  if (!m) return esc(s);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${DAYS[d.getUTCDay()]} ${+m[3]} ${MONTHS[+m[2] - 1]}, ${m[4]}:${m[5]}`;
}
export function dayName(date) { const d = new Date(date + 'T12:00:00Z'); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; }
export function ageHours(iso, ref) { return (ref - new Date(iso)) / 3600000; }
export const host = u => { try { return new URL(u).host; } catch { return u; } };

// ---------------------------------------------------------------- the frame
const NAV = [['/', 'Now'], ['/map/', 'Map'], ['/places/', 'Places'], ['/storms/', 'Storms'], ['/cameras/', 'Cameras'], ['/what-to-do/', 'What to do'], ['/about/', 'About']];
// The sites rail (promptugal.news's masthead, Website repo assets/top/top.tmpl, Dinis 17 Nov 2026)
const SITES = [['https://weather.promptugal.news/', 'Weather'], ['https://civic.promptugal.news/', 'Civic'], ['https://startups.promptugal.news/', 'Startups'], ['https://travel.promptugal.news/', 'Travel'], ['https://data.promptugal.news/', 'Data']];
export const CSS_VERSION = '5';

// ---------------------------------------------------------------- the front pages to choose from (as on hub.agenticcells.site's sites:
// a strip at the very top, a Designs chip that opens a picker of screenshots; the user, 18 Nov 2026, about 15:20 UTC)
// Screenshots: src/assets/designs/<id>.jpg, taken by scripts/shots.mjs (run by hand after a design changes).
export const DESIGNS = [
  { id: 'now', href: '/', name: 'Now', tag: 'the live front page' },
  { id: 'a', href: '/design/a/', name: 'A: Warnings first', tag: 'the worst warning, then the towns' },
  { id: 'b', href: '/design/b/', name: 'B: The map is the page', tag: 'maps first, list beneath' },
  { id: 'c', href: '/design/c/', name: 'C: Your town', tag: 'pick a place, five-day highs' },
];

// ---------------------------------------------------------------- licences (Dinis, 18 Nov 2026, about 14:25 UTC, kept in the Website
// repo's board/guidance/2026-11-18-licences-and-submissions.md: every piece of data, in the JSON and on the page, carries a licence link;
// ours is CC BY 4.0; a source with no published licence gets a link to its terms, labelled "the source's terms")
export const LICENCES = {
  ours: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', of: 'PrompTugal.news Weather (our pages, words, charts and the way the data is put together)' },
  ipma: { name: "the source's terms", url: 'https://api.ipma.pt/', of: 'IPMA (free for personal or public use with no profit-making purpose; name IPMA as the source)' },
  adsb: { name: 'ODbL 1.0', url: 'https://opendatacommons.org/licenses/odbl/1-0/', of: 'adsb.lol' },
  meteoalarm: { name: "the source's terms", url: 'https://www.meteoalarm.org/en/live/page/terms-and-conditions', of: 'MeteoAlarm' },
};
const LIC_RULES = [[/adsb\.lol/i, 'adsb'], [/meteoalarm/i, 'meteoalarm'], [/IPMA/, 'ipma']];
export const licLink = k => `<a class="lic" href="${LICENCES[k].url}">${k === 'ours' ? 'CC BY 4.0' : `${LICENCES[k].of.split(' (')[0]}: ${LICENCES[k].name}`}</a>`;
// every source line on a page names the licence of the data it cites
function addLicences(html) {
  return html.replace(/<p class="src">([\s\S]*?)<\/p>/g, (m, inner) => {
    if (/class="lic"/.test(inner)) return m;
    const keys = LIC_RULES.filter(([re]) => re.test(inner.replace(/<[^>]+>/g, ' '))).map(([, k]) => k);
    return keys.length ? `<p class="src">${inner} Licence: ${keys.map(licLink).join('; ')}.</p>` : m;
  });
}
function licencesUsed(html) { return Object.keys(LICENCES).filter(k => k === 'ours' || LIC_RULES.some(([re, kk]) => kk === k && re.test(html.replace(/<[^>]+>/g, ' ')))); }

export function page({ path, title, description, body: rawBody, md, made, extraHead = '', bodyClass = '' }) {
  const body = addLicences(rawBody);
  const used = licencesUsed(rawBody);
  const canonical = SITE + path;
  const twin = path.endsWith('/') ? path + 'index.md' : path.replace(/\.html$/, '.md');
  const nav = NAV.map(([href, label]) => `<a href="${href}"${(href === '/' ? path === '/' : path.startsWith(href)) ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="text/markdown" href="${twin}">
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/site.css?v=${CSS_VERSION}">
<meta name="page-type" content="free">
<script defer src="/assets/reading.js?v=${CSS_VERSION}"></script>
<script defer src="/assets/live.js?v=${CSS_VERSION}"></script>
<script defer src="/assets/obs/obs.js?v=${CSS_VERSION}" data-lane="weather"></script>
${extraHead}</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to the content</a>
<nav class="designs" aria-label="Front page designs"><a href="/design/">Same data, ${DESIGNS.length} front pages, for Dinis to choose:</a>${DESIGNS.map(d => `<a href="${d.href}"${(d.href === '/' ? path === '/' : path.startsWith(d.href)) ? ' aria-current="page"' : ''}>${esc(d.name)}</a>`).join('')}</nav>
<div class="version-bar"><span>Version __VERSION__</span><span><a href="${twin}">This page as markdown</a></span></div>
<header class="masthead">
  <div class="masthead-row">
    <a class="brand" href="/" aria-label="PrompTugal.news Weather, home"><span class="wm">Promp<span class="t">T</span><span class="g">ugal</span>.<i>news</i></span><span class="sub">· Weather</span></a>
    <a class="chip designs-chip" href="/design/" data-designs>Designs</a>
    <a class="tool meter free" id="nr-meter-chip" href="/account/" title="This site is free: it carries no billing, and only promptugal.news bills (Dinis, 18 Nov 2026). Your PrompTugal.news balance is kept on promptugal.news."><span class="meter-label">Pay for what you read · </span><b>free here</b></a>
  </div>
  <nav class="nav" aria-label="Sections">${nav}</nav>
</header>
<nav class="em-net" aria-label="The PrompTugal.news sites"><span>Also from PrompTugal.news</span>${SITES.map(([href, label]) => `<a href="${href}"${href === SITE + '/' ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
<p class="not-warning" role="note"><strong>Not a warning service.</strong> For warnings and what to do now, follow <a href="https://www.ipma.pt/">IPMA</a> and <a href="https://prociv.gov.pt/">ANEPC</a>. In an emergency call 112.</p>
<main id="main">
${body}
</main>
${madeBlock(made)}
<footer class="footer">
  <p>Part of <a href="https://promptugal.news/">PrompTugal.news</a>: Portugal, town by town. Independent: not an official or government site. Data from IPMA's open data, as collected and published by <a href="https://data.promptugal.news/">data.promptugal.news</a>. Free to read: this site carries no billing; only promptugal.news bills. Each value keeps its source's licence.</p>
  <p class="licences">Licences: ${used.map(k => k === 'ours' ? `our pages, words and charts ${licLink('ours')}` : `data from ${licLink(k)}`).join('; ')}. Every JSON file here carries a <code>license</code> field.</p>
  <p class="takedown"><strong>Is something here yours, and should it not be?</strong> <a href="https://github.com/PrompTugal/PrompTugal__News__Weather/issues/new?title=Take%20down%3A%20">Open an issue</a> saying what and why: we take it down while we talk.</p>
  <p class="sites-row">Also from PrompTugal.news: ${SITES.map(([href, label]) => `<a href="${href}">${label}</a>`).join(' · ')}</p>
  <p class="small">Version __VERSION__ · <a href="https://github.com/PrompTugal/PrompTugal__News__Weather">Source</a> · Code Apache-2.0, text CC BY 4.0 · <a href="/llms.txt">llms.txt</a> · <a href="/how/">How it works</a> · <a href="/security/">Security</a> (<a href="https://promptugal.news/security/">all sites</a>)</p>
</footer>
<dialog id="designs" class="picker" aria-labelledby="designs-t">
  <div class="phead"><p class="pt" id="designs-t">${DESIGNS.length} front pages, the same data: which should lead?</p><button type="button" class="pclose" aria-label="Close">×</button></div>
  <ul class="pick">${DESIGNS.map(d => `<li><a href="${d.href}"><img src="/assets/designs/${d.id}.jpg" width="1280" height="800" alt="" loading="lazy"><b>${esc(d.name)}</b><span>${esc(d.tag)}</span></a></li>`).join('')}</ul>
  <p class="pnote">Dinis chooses; the others stay at <a href="/design/">/design/</a>.</p>
</dialog>
<script defer src="/assets/designs.js?v=${CSS_VERSION}"></script>
</body>
</html>
`;
  const mdOut = `# ${title}\n\n> ${description}\n>\n> Not a warning service: follow IPMA (https://www.ipma.pt/) and ANEPC (https://prociv.gov.pt/). In an emergency call 112.\n> Version __VERSION__ · ${canonical}\n> Is something here yours, and should it not be? Open an issue at https://github.com/PrompTugal/PrompTugal__News__Weather/issues and we take it down while we talk.\n\n${md.trim()}\n\n## Licences\n\n${used.map(k => `- ${LICENCES[k].of}: ${LICENCES[k].name}, ${LICENCES[k].url}`).join('\n')}\n\n${madeMd(made)}\n`;
  return { path, html, md: mdOut, title, description };
}

const DEFAULT_MADE = { code: 'scripts/site/*.mjs builds this page from data/ on every push; no model runs at build time.', agents: 'weather@PrompTugal.dinis (Claude, Opus) wrote the first version; weather.b@PrompTugal.dinis (Claude, Opus) carries it on.', person: 'Not yet checked by a person.' };
function madeBlock(m = {}) {
  m = { ...DEFAULT_MADE, ...m };
  return `<aside class="made" aria-label="How this page was made"><h2>How this page was made</h2><dl><dt>Code</dt><dd>${m.code}</dd><dt>Agents</dt><dd>${m.agents}</dd><dt>A person</dt><dd>${m.person}</dd></dl><p><a href="/about/">More on how the site is made</a></p></aside>`;
}
function madeMd(m = {}) {
  m = { ...DEFAULT_MADE, ...m };
  const strip = s => s.replace(/<[^>]+>/g, '');
  return `## How this page was made\n\n- Code: ${strip(m.code)}\n- Agents: ${strip(m.agents)}\n- A person: ${strip(m.person)}\n`;
}

export function write(outDir, p) {
  const base = p.path.endsWith('/') ? join(outDir, p.path, 'index') : join(outDir, p.path.replace(/\.html$/, ''));
  mkdirSync(dirname(base + '.html'), { recursive: true });
  writeFileSync(base + '.html', p.html);
  writeFileSync(base + '.md', p.md);
}

// ---------------------------------------------------------------- markdown (the small subset the content files use)
export function parseFront(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  if (m) for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, ''); }
  return { meta, body: m ? text.slice(m[0].length) : text };
}
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${safeHref(u.replace(/&amp;/g, '&'))}">${t}</a>`)
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:])/g, '$1<a href="$2">$2</a>');
}
export function markdown(src) {
  const lines = src.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { const n = Math.min(m[1].length + 1, 5); const id = m[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); out.push(`<h${n} id="${id}">${inline(m[2])}</h${n}>`); i++; continue; }
    if (/^\s*[-*]\s+/.test(l)) { const items = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { let t = lines[i].replace(/^\s*[-*]\s+/, ''); i++; while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])) t += ' ' + lines[i++].trim(); items.push(`<li>${inline(t)}</li>`); } out.push(`<ul>${items.join('')}</ul>`); continue; }
    if (/^\s*\d+\.\s+/.test(l)) { const items = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`); i++; } out.push(`<ol>${items.join('')}</ol>`); continue; }
    if (/^\|/.test(l)) { const rows = []; while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]); const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()); const head = cells(rows[0]); const body = rows.slice(/^\|[\s:|-]+\|$/.test(rows[1] || '') ? 2 : 1); out.push(`<div class="table-wrap"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${cells(r).map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue; }
    if (/^>\s?/.test(l)) { const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, '')); out.push(`<blockquote><p>${inline(q.join(' '))}</p></blockquote>`); continue; }
    const p = []; while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*[-*]\s+|\s*\d+\.\s+|\||>)/.test(lines[i])) p.push(lines[i++].trim());
    out.push(`<p>${inline(p.join(' '))}</p>`);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- colours as classes (the CSS holds the values)
// UV index bands: the WHO's Global Solar UV Index (2002): low 0-2, moderate 3-5, high 6-7, very high 8-10, extreme 11+
export const uvBand = i => i == null ? null : i < 3 ? 'low' : i < 6 ? 'moderate' : i < 8 ? 'high' : i < 11 ? 'very high' : 'extreme';
export const uvClass = i => `uv-${['low', 'moderate', 'high', 'very high', 'extreme'].indexOf(uvBand(i)) + 1}`;
export const fireClass = level => `fire-${FIRE[level] || 0}`;
export const warnClass = level => `warn-${level || 'green'}`;
export function worstFire(town) { return (town.now.fire_risk?.days || []).reduce((m, d) => Math.max(m, FIRE[d.level] || 0), 0); }
export function worstWarning(region) { return (region?.warnings?.active || []).reduce((m, w) => (LEVEL[w.level] ?? 0) > (LEVEL[m] ?? 0) ? w.level : m, 'green'); }

// ---------------------------------------------------------------- maps
function projector(bbox, width) { // equirectangular, scaled by cos(mid latitude)
  const [x0, y0, x1, y1] = bbox; const k = Math.cos(((y0 + y1) / 2) * Math.PI / 180);
  const w = (x1 - x0) * k, h = y1 - y0, s = width / w;
  return { w: width, h: Math.round(h * s), p: ([lon, lat]) => [+(((lon - x0) * k) * s).toFixed(1), +((y1 - lat) * s).toFixed(1)] };
}
function polys(geo, pr) {
  return geo.map(poly => poly.map(ring => 'M' + ring.map(c => pr.p(c).join(',')).join('L') + 'Z').join('')).join('');
}
export function portugalMap({ outline, capitals, towns, region, width = 360, linkCapitals = false }) {
  const pr = projector([-9.6, 36.9, -6.1, 42.2], width);
  const pt = polys(outline.countries.Portugal, pr), es = outline.countries.Spain ? polys(outline.countries.Spain, pr) : '';
  const lvl = worstWarning(region);
  const caps = capitals.map(c => { const [x, y] = pr.p(c.at); const lv = c.level || 'green'; const label = c.algarve ? '' : `<text x="${x + 6}" y="${y + 3}">${esc(c.name)}</text>`; const dot = `<circle cx="${x}" cy="${y}" r="${c.live ? 4.5 : 3}"><title>${esc(c.name)}${c.live ? `: highest IPMA warning ${lv}` : ': data coming'}</title></circle>`; return `<g class="cap${c.live ? ` live ${warnClass(lv)}` : ''}">${linkCapitals && c.live ? `<a href="/places/${c.id}/">${dot}${label}</a>` : dot + label}</g>`; }).join('');
  const dots = towns.map(t => { const [x, y] = pr.p(t.at); return `<circle class="town ${fireClass(t.now.fire_risk?.days?.[0]?.level)}" cx="${x}" cy="${y}" r="${width > 400 ? 3.5 : 2.6}"><title>${esc(t.name)}</title></circle>`; }).join('');
  const cut = pr.p([-9.7, 37.5])[1]; // the Faro district, drawn approximately as the mainland south of 37.5 N
  const id = 'fd' + width;
  return `<svg class="map map-pt" viewBox="0 0 ${pr.w} ${pr.h}" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">Map of mainland Portugal</title><desc id="${id}-d">The Faro district (the Algarve) is shaded by its highest IPMA warning in force or announced (${lvl}); its 17 places are dots coloured by today's fire risk. Each district capital is a dot coloured by its district's highest IPMA warning; grey means no data yet.</desc><defs><clipPath id="${id}"><rect x="0" y="${cut}" width="${pr.w}" height="${pr.h - cut}"/></clipPath></defs><rect class="sea" width="${pr.w}" height="${pr.h}"/><path class="land-es" d="${es}"/><path class="land-pt" d="${pt}"/><path class="district ${warnClass(lvl)}" d="${pt}" clip-path="url(#${id})"/>${caps}${dots}<text class="label-faro" x="${pr.p([-8.2, 37.6])[0]}" y="${pr.p([-8.2, 37.6])[1]}" text-anchor="middle">Algarve</text></svg>`;
}
export function algarveMap({ outline, towns, colour = t => fireClass(t.now.fire_risk?.days?.[0]?.level), label = t => t.name, width = 720, caption }) {
  const pr = projector([-9.05, 36.92, -7.3, 37.58], width);
  const pt = polys(outline.countries.Portugal, pr), es = outline.countries.Spain ? polys(outline.countries.Spain, pr) : '';
  const dots = towns.map(t => { const [x, y] = pr.p(t.at); const anchor = x > width * 0.8 ? 'end' : 'start'; const dx = anchor === 'end' ? -9 : 9; return `<a href="/places/${t.id}/"><g class="pin"><circle class="town ${colour(t)}" cx="${x}" cy="${y}" r="7"/><text x="${x + dx}" y="${y + 4}" text-anchor="${anchor}">${esc(label(t))}</text></g><title>${esc(t.name)}</title></a>`; }).join('');
  return `<svg class="map map-algarve" viewBox="0 0 ${pr.w} ${pr.h}" role="img" aria-label="${esc(caption || 'Map of the Algarve with its 17 places')}"><rect class="sea" width="${pr.w}" height="${pr.h}"/><path class="land-es" d="${es}"/><path class="land-pt" d="${pt}"/>${dots}</svg>`;
}

// ---------------------------------------------------------------- the five-day chart
export function forecastChart(days, types, width = 640) {
  if (!days?.length) return '';
  const h = 220, top = 28, bottom = 52, left = 34, right = 10;
  const ph = h - top - bottom, cw = (width - left - right) / days.length;
  const ts = days.flatMap(d => [d.t_min_c, d.t_max_c]).filter(v => typeof v === 'number');
  const lo = Math.floor(Math.min(...ts) / 5) * 5, hi = Math.ceil(Math.max(...ts) / 5) * 5 || lo + 5;
  const y = t => top + ph - ((t - lo) / (hi - lo)) * ph;
  const cx = i => left + cw * i + cw / 2;
  const grid = []; for (let t = lo; t <= hi; t += 5) grid.push(`<line class="grid" x1="${left}" x2="${width - right}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${left - 6}" y="${y(t) + 4}" text-anchor="end">${t}°</text>`);
  const bars = days.map((d, i) => { const bh = (d.rain_prob_pct || 0) / 100 * ph; return `<rect class="rain" x="${cx(i) - cw * 0.3}" y="${top + ph - bh}" width="${cw * 0.6}" height="${bh}"><title>${dayName(d.date)}: rain ${d.rain_prob_pct ?? '?'}%</title></rect>`; }).join('');
  const line = (k, cls) => `<polyline class="${cls}" points="${days.map((d, i) => `${cx(i)},${y(d[k])}`).join(' ')}"/>` + days.map((d, i) => `<circle class="${cls}" cx="${cx(i)}" cy="${y(d[k])}" r="3.5"/><text class="val ${cls}" x="${cx(i)}" y="${y(d[k]) + (k === 't_max_c' ? -8 : 16)}" text-anchor="middle">${num(d[k], '°')}</text>`).join('');
  const labels = days.map((d, i) => `<text class="axis day" x="${cx(i)}" y="${h - bottom + 18}" text-anchor="middle">${dayName(d.date).split(' ').slice(0, 2).join(' ')}</text><text class="axis rainpct" x="${cx(i)}" y="${h - bottom + 34}" text-anchor="middle">${d.rain_prob_pct ?? '?'}% rain</text>`).join('');
  const desc = days.map(d => `${dayName(d.date)}: ${num(d.t_min_c, '°C')} to ${num(d.t_max_c, '°C')}, ${d.rain_prob_pct}% chance of rain, ${types[d.weather_type]?.en || 'unknown'}`).join('; ');
  return `<figure class="chart"><svg viewBox="0 0 ${width} ${h}" role="img" aria-label="Five-day forecast. ${esc(desc)}">${grid.join('')}${bars}${line('t_max_c', 'tmax')}${line('t_min_c', 'tmin')}${labels}</svg><figcaption><span class="key tmax">highest</span> <span class="key tmin">lowest</span> <span class="key rain">chance of rain</span></figcaption></figure>`;
}
