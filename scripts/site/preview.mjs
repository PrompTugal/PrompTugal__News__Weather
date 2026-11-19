// /preview.svg: an infographic of this site's own numbers at build time, for the sites bar's pop-up and social cards
// (Dinis, 18 Nov 2026, about 22:00 UTC, kept in the Website repo's board/guidance/2026-11-18-the-sites-bar.md:
// "a screenshot or maybe an infographic or something for each one"). weather.b@PrompTugal.dinis. Code: Apache-2.0;
// the image: CC BY 4.0, built on IPMA's data (IPMA's terms, https://api.ipma.pt/). Every value is escaped; the
// figures come only from the data the pages were built from, so the preview and the pages always agree.

const esc = (s) => String(s ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const RANK = { green: 0, yellow: 1, orange: 2, red: 3 };
const FILL = { green: '#3a8f3a', yellow: '#f2c200', orange: '#ec7a00', red: '#d0202a' };
const FIRE = ['low', 'moderate', 'high', 'very high', 'maximum'];
const lv = (v) => (Object.prototype.hasOwnProperty.call(RANK, v) ? v : 'green');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const utc = (iso) => { const d = new Date(iso); return isNaN(+d) ? 'unknown' : `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`; };

const iso = (v) => { const d = new Date(typeof v === 'string' ? v : NaN); return isNaN(+d) ? null : d.toISOString().replace(/\.\d+Z$/, 'Z'); };
// The figures, also returned so version.json and the page can say the same.
export function previewFigures(D) {
  const caps = D.capitals.filter((c) => c.live);
  const levels = caps.slice(0, 18).map((c) => ({ name: c.district || c.name, level: lv(c.level) }));
  const count = (l) => levels.filter((x) => x.level === l).length;
  const fire = D.towns.map((t) => String(t.now?.fire_risk?.days?.[0]?.level || '').toLowerCase()).filter((l) => FIRE.includes(l));
  const fireMax = fire.length ? fire.reduce((a, b) => (FIRE.indexOf(b) > FIRE.indexOf(a) ? b : a)) : null;
  const faro = D.towns.find((t) => t.id === 'faro');
  const r = faro?.now?.station?.reading;
  const temp = typeof r?.temp_c === 'number' && isFinite(r.temp_c) && r.temp_c >= -60 && r.temp_c <= 60 ? r.temp_c : null;
  return {
    districts: levels.length, red: count('red'), orange: count('orange'), yellow: count('yellow'), green: count('green'), levels,
    fire_max_algarve: fireMax, faro_temp_c: temp, faro_station: faro?.now?.station?.name || null,
    places: D.towns.length + caps.filter((c) => !c.algarve).length,
    read_at: iso(D.api?.['ipma-warnings']?.read_at || D.region?.read_at),
  };
}

export function previewSvg(D, version) {
  const f = previewFigures(D), W = 1200, H = 630;
  const sq = 46, gap = 8, x0 = 60, y0 = 250;
  const squares = f.levels.map((d, i) => `<rect x="${x0 + i * (sq + gap)}" y="${y0}" width="${sq}" height="${sq}" rx="4" fill="${FILL[d.level]}"><title>${esc(d.name)}: ${esc(d.level)}</title></rect>`).join('');
  const above = f.red + f.orange + f.yellow;
  const headline = above ? `${above} of ${f.districts} districts: an IPMA warning in force or announced` : `No IPMA warning above green in ${f.districts} districts`;
  const split = [f.red && `${f.red} red`, f.orange && `${f.orange} orange`, f.yellow && `${f.yellow} yellow`, `${f.green} green`].filter(Boolean).join(' · ');
  const fig = (x, big, small) => `<text x="${x}" y="430" font-family="Georgia, serif" font-size="64" font-weight="700" fill="#121317">${esc(big)}</text><text x="${x}" y="468" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#3f424a">${esc(small)}</text>`;
  const label = `weather.promptugal.news: ${headline} (${split}); Algarve fire risk today ${f.fire_max_algarve || 'not read'}; Faro ${f.faro_temp_c == null ? 'not reported' : f.faro_temp_c + '°C'}; ${f.places} places. IPMA data read ${utc(f.read_at)}.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<rect width="${W}" height="${H}" fill="#f6f3ec"/>
<rect width="${W}" height="10" fill="#c52830"/>
<text x="60" y="92" font-family="Georgia, serif" font-size="44" font-weight="700" fill="#121317">PrompTugal.news Weather</text>
<text x="60" y="134" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#3f424a">Weather and civil protection for Portugal, place by place. Not a warning service.</text>
<text x="60" y="210" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="#121317">${esc(headline)}</text>
${squares}
<text x="60" y="330" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#3f424a">${esc(split)}; one square per district, its highest level</text>
${fig(60, f.fire_max_algarve || 'n/a', 'Algarve fire risk today (highest of 17)')}
${fig(470, f.faro_temp_c == null ? 'n/a' : `${f.faro_temp_c}°C`, 'Faro now (IPMA station)')}
${fig(860, String(f.places), 'places with their own page')}
<line x1="60" x2="${W - 60}" y1="528" y2="528" stroke="#d8d4cb"/>
<text x="60" y="566" font-family="Helvetica, Arial, sans-serif" font-size="19" fill="#3f424a">Source: IPMA (via data.promptugal.news), read ${esc(utc(f.read_at))}. Data: IPMA's terms, api.ipma.pt.</text>
<text x="60" y="596" font-family="Helvetica, Arial, sans-serif" font-size="19" fill="#3f424a">Image CC BY 4.0, weather.promptugal.news ${esc(version)}. Follow IPMA and ANEPC.</text>
</svg>
`;
}

// The sites bar's pop-up preview, 320 by 180, from designer@'s template (Website repo
// design/sites-bar/preview-template.svg.txt, 19 Nov 2026): no script, no link, no external reference, system fonts.
const TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180" role="img" aria-label="{{site}}: {{line}}">
  <rect width="320" height="180" rx="6" fill="#f6f3ec"/>
  <rect x="0" y="0" width="320" height="4" fill="{{accent}}"/>
  <text x="16" y="30" font-family="IBM Plex Mono, monospace" font-size="10.5" letter-spacing="1.2" fill="#666860">{{SITE}} · NOW</text>
  <text x="16" y="84" font-family="Newsreader, Georgia, serif" font-size="46" fill="#121317">{{n1}}</text>
  <text x="16" y="104" font-family="IBM Plex Sans, Arial, sans-serif" font-size="12" fill="#3a3b40">{{label1}}</text>
  <text x="176" y="72" font-family="Newsreader, Georgia, serif" font-size="26" fill="#121317">{{n2}}</text>
  <text x="176" y="88" font-family="IBM Plex Sans, Arial, sans-serif" font-size="11" fill="#3a3b40">{{label2}}</text>
  <text x="176" y="120" font-family="Newsreader, Georgia, serif" font-size="26" fill="#121317">{{n3}}</text>
  <text x="176" y="136" font-family="IBM Plex Sans, Arial, sans-serif" font-size="11" fill="#3a3b40">{{label3}}</text>
  <line x1="16" y1="150" x2="304" y2="150" stroke="#d8d4cb"/>
  <text x="16" y="168" font-family="IBM Plex Mono, monospace" font-size="10" fill="#666860">read {{read_at}} · {{licence}}</text>
</svg>
`;
export function previewBarSvg(D) {
  const f = previewFigures(D);
  const d = new Date(f.read_at || NaN);
  const read = isNaN(+d) ? 'unknown' : `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
  const v = {
    site: 'PrompTugal.news Weather', line: 'warnings, fire risk, sea, place by place', accent: '#0e8a9c', SITE: 'WEATHER',
    n1: `${f.red + f.orange + f.yellow}/${f.districts}`, label1: 'districts with a warning',
    n2: f.faro_temp_c == null ? 'n/a' : `${f.faro_temp_c}°C`, label2: 'Faro now (IPMA station)',
    n3: f.fire_max_algarve || 'n/a', label3: 'Algarve fire risk today',
    read_at: read, licence: "IPMA's terms · CC BY 4.0",
  };
  return TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, k) => esc(v[k] ?? ''));
}
