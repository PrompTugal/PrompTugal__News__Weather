// Generates the site's pages into _site/ from data/ and content/. Called by scripts/build.mjs after src/ is copied.
// Every page gets a markdown twin (index.md beside index.html); llms.txt and sitemap.xml list them.
// Node 18+, no dependencies. weather@PrompTugal.dinis, 17 Nov 2026. Code: Apache-2.0.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  SITE, esc, readJSON, loadData, page, write, markdown, parseFront, when, localWhen, dayName, ageHours, host,
  WIND_DIR, FIRE, FIRE_PT, LEVEL, num, show, showMd, fireClass, warnClass, worstFire, worstWarning, portugalMap, algarveMap, forecastChart,
} from './lib.mjs';

const OUT = '_site';
const D = loadData();
const BUILT = new Date();
const outline = readJSON('data/map/portugal-outline-50m.json');
const algOutline = readJSON('data/map/algarve-outline.json');
const pages = [];
const add = p => { pages.push(p); write(OUT, p); };

// ---------------------------------------------------------------- shared fragments
const levelWord = l => ({ green: 'Green', yellow: 'Yellow', orange: 'Orange', red: 'Red' }[l] || l);
function warningsHtml(w, { compact = false } = {}) {
  const active = w?.active || [];
  if (!active.length) return `<div class="warnings none"><p><strong>No IPMA warning above green</strong> for ${esc(w?.area || 'the Faro district')} in the file read. No warning is not the same as no risk.</p><p class="src">Source: <a href="${esc(w?.page)}">IPMA warnings</a>, <a href="${esc(w?.source)}">open data</a>.</p></div>`;
  return `<div class="warnings"><h3>IPMA warnings for ${esc(w.area)}</h3><ul>${active.map(a => `<li class="warning ${warnClass(a.level)}"><span class="lvl">${levelWord(a.level)}</span> <strong>${esc(a.type)}</strong> <span class="pt" lang="pt">(${esc(a.type_pt)})</span><br><span class="when">${localWhen(a.start)} to ${localWhen(a.end)}, Portugal time</span>${!compact && a.text ? `<br><span class="text" lang="pt">${esc(a.text)}</span>` : ''}</li>`).join('')}</ul><p class="src">Source: <a href="${esc(w.page)}">IPMA warnings page</a> and <a href="${esc(w.source)}">IPMA open data</a>. Check IPMA for the warning in force now.</p></div>`;
}
function warningsMd(w) {
  const active = w?.active || [];
  if (!active.length) return `No IPMA warning above green for ${w?.area || 'the Faro district'} in the file read. Source: ${w?.page}`;
  return active.map(a => `- **${levelWord(a.level)}: ${a.type}** (${a.type_pt}), ${localWhen(a.start)} to ${localWhen(a.end)} Portugal time. ${a.text ? `IPMA: "${a.text}"` : ''}`).join('\n') + `\n\nSource: IPMA, ${w.page} (open data ${w.source}).`;
}
function freshness(iso) {
  const h = ageHours(iso, BUILT);
  if (h <= 2) return `<p class="fresh">Read ${when(iso)}.</p>`;
  return `<p class="stale" role="status"><strong>This data is ${Math.round(h)} hours old</strong> (read ${when(iso)}). The page is rebuilt when new data is pushed; check IPMA for the latest.</p>`;
}
const fireChip = d => `<span class="chip ${fireClass(d.level)}" title="${esc(FIRE_PT[d.level] || '')}"><span class="d">${dayName(d.date)}</span> ${esc(d.level || 'unknown')}</span>`;
const typeOf = id => D.types[id]?.en || 'unknown';

// ---------------------------------------------------------------- the front page
function headline(r) {
  const act = (r.warnings?.active || []).slice().sort((a, b) => (LEVEL[b.level] ?? 0) - (LEVEL[a.level] ?? 0));
  if (!act.length) return 'no IPMA warning above green';
  const w = act[0], started = new Date(w.start + 'Z') <= new Date(r.read_at);
  return `${esc(levelWord(w.level).toLowerCase())} warning for ${esc(w.type)} ${started ? `until ${localWhen(w.end)}` : `from ${localWhen(w.start)}`}`;
}
function front() {
  const r = D.region; const lvl = worstWarning(r);
  const rows = D.towns.map(t => {
    const n = t.now, st = n.station?.reading || {}, f0 = n.forecast?.days?.[0] || {}, fr = n.fire_risk?.days?.[0] || {};
    return { t, html: `<tr><th scope="row"><a href="/places/${t.id}/">${esc(t.name)}</a></th><td class="n">${show(st.temp_c, '°')}</td><td class="n">${show(f0.t_max_c, '°')} / ${show(f0.t_min_c, '°')}</td><td class="n">${f0.rain_prob_pct ?? '?'}%</td><td><span class="chip ${fireClass(fr.level)}">${esc(fr.level || '?')}</span></td><td class="n">${n.sea ? show(n.sea.waves_max_m, ' m') : '<span class="na">inland</span>'}</td></tr>`,
      md: `| [${t.name}](/places/${t.id}/) | ${showMd(st.temp_c, '°C')} | ${showMd(f0.t_max_c, '°C')} / ${showMd(f0.t_min_c, '°C')} | ${f0.rain_prob_pct ?? '?'}% | ${fr.level || '?'} | ${n.sea ? showMd(n.sea.waves_max_m, ' m') : 'inland'} |` };
  });
  const maxFire = Math.max(...D.towns.map(worstFire));
  const fireWord = Object.keys(FIRE).find(k => FIRE[k] === maxFire) || 'unknown';
  const faro = D.now.faro;
  const body = `
<section class="hero">
  <div class="hero-text">
    <p class="kicker">Weather and civil protection · Portugal, place by place</p>
    <h1>The Algarve now: ${headline(r)}</h1>
    <p class="standfirst">IPMA's warnings, forecasts, fire risk, sea and UV for the Algarve's 17 places, each value with its source and the time it was read. The other district capitals follow when <a href="https://data.promptugal.news/">data.promptugal.news</a> publishes their data.</p>
    ${freshness(r.read_at)}
    ${warningsHtml(r.warnings)}
    <p>Highest fire risk in the next three days across the 17: <span class="chip ${fireClass(fireWord)}">${esc(fireWord)}</span> (<a href="${esc(faro.fire_risk?.page)}">IPMA rural fire risk</a>).</p>
  </div>
  <div class="hero-map"><a href="/map/">${portugalMap({ outline, capitals: D.capitals, towns: D.towns, region: r })}</a><p class="caption">The Algarve (shading approximate) by its highest warning; dots by today's fire risk; grey: district capitals still to come. <a href="/map/">The full map</a></p></div>
</section>
<section>
  <h2>The 17 places</h2>
  <div class="table-wrap"><table class="towns"><thead><tr><th scope="col">Place</th><th scope="col">Now</th><th scope="col">Today high / low</th><th scope="col">Rain</th><th scope="col">Fire risk</th><th scope="col">Waves</th></tr></thead><tbody>${rows.map(x => x.html).join('')}</tbody></table></div>
  <p class="src">"Now" is the nearest IPMA weather station's last hourly reading; "not reported" means the station sent no value. Forecasts are IPMA's for the nearest of its four Algarve forecast places. Sources and times on each place's page.</p>
</section>
<section class="cards">
  <a class="card" href="/map/"><h2>Map</h2><p>Warnings and fire risk for the Algarve, day by day for three days.</p></a>
  <a class="card" href="/storms/charles/"><h2>Storm Charles</h2><p>The archive of 10 to 12 November 2026: warnings, peaks, decisions, timeline.</p></a>
  <a class="card" href="/what-to-do/"><h2>What to do</h2><p>IPMA's warning levels and fire risk classes explained, and who to follow.</p></a>
</section>`;
  const md = `## The Algarve now\n\n${warningsMd(r.warnings)}\n\nRead ${when(r.read_at)}. Highest fire risk in the next three days across the 17 places: ${fireWord}.\n\n## The 17 places\n\n| Place | Now | Today high / low | Rain | Fire risk | Waves |\n|---|---|---|---|---|---|\n${rows.map(x => x.md).join('\n')}\n\n"Now" is the nearest IPMA station's last hourly reading. Forecasts are IPMA's for the nearest of its four Algarve forecast places.\n\n## More\n\n- [Map](/map/): warnings and fire risk\n- [Places](/places/): every place, and the district capitals to come\n- [Storm Charles](/storms/charles/): the archive\n- [What to do](/what-to-do/)\n`;
  add(page({ path: '/', title: 'PrompTugal.news Weather: the Algarve now', description: 'Weather and civil protection for Portugal, place by place: IPMA warnings, forecasts, fire risk, sea and UV for the Algarve\'s 17 places, with sources.', body, md }));
}

// ---------------------------------------------------------------- the map page
function mapPage() {
  const r = D.region;
  const days = D.now.faro.fire_risk?.days || [];
  const maps = days.map((d, i) => `<figure class="map-day"><figcaption><strong>${dayName(d.date)}</strong>: rural fire risk</figcaption>${algarveMap({ outline: algOutline, towns: D.towns, colour: t => fireClass(t.now.fire_risk?.days?.[i]?.level), label: t => t.name, caption: `Fire risk on ${dayName(d.date)} for the 17 Algarve places` })}</figure>`).join('');
  const legend = `<p class="legend">${Object.keys(FIRE).map(k => `<span class="chip ${fireClass(k)}">${k} <span lang="pt">(${FIRE_PT[k]})</span></span>`).join(' ')}</p>`;
  const table = `<div class="table-wrap"><table><thead><tr><th scope="col">Place</th>${days.map(d => `<th scope="col">${dayName(d.date)}</th>`).join('')}</tr></thead><tbody>${D.towns.map(t => `<tr><th scope="row"><a href="/places/${t.id}/">${esc(t.name)}</a></th>${(t.now.fire_risk?.days || []).map(d => `<td><span class="chip ${fireClass(d.level)}">${esc(d.level)}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const body = `<h1>Map: warnings and fire risk</h1>
<p class="standfirst">IPMA issues weather warnings by district: the whole Algarve is the Faro district. It gives rural fire risk by municipality, for today and the next two days.</p>
${freshness(r.read_at)}
<section class="map-split"><div>${portugalMap({ outline, capitals: D.capitals, towns: D.towns, region: r, width: 420 })}</div><div>${warningsHtml(r.warnings)}<p>The other 17 district capitals are on the map in grey: their warnings and forecasts appear here once <a href="https://data.promptugal.news/">data.promptugal.news</a> publishes them. Until then, see <a href="https://www.ipma.pt/en/otempo/prev-sam/">IPMA's warnings map</a>.</p></div></section>
<section><h2>Fire risk, by place and day</h2>${legend}<div class="map-days">${maps}</div>${table}<p class="src">Source: <a href="${esc(D.now.faro.fire_risk?.page)}">IPMA rural fire risk (RCM)</a>, open data <a href="https://api.ipma.pt/open-data/forecast/meteorology/rcm/rcm-d0.json">d0</a>, d1, d2. Quarteira shares Loulé's municipal value.</p></section>`;
  const md = `IPMA issues weather warnings by district (the Algarve is the Faro district) and rural fire risk by municipality.\n\nRead ${when(r.read_at)}.\n\n## Warnings, Faro district\n\n${warningsMd(r.warnings)}\n\n## Fire risk, by place and day\n\n| Place | ${days.map(d => dayName(d.date)).join(' | ')} |\n|---|${days.map(() => '---').join('|')}|\n${D.towns.map(t => `| ${t.name} | ${(t.now.fire_risk?.days || []).map(d => d.level).join(' | ')} |`).join('\n')}\n\nSource: IPMA rural fire risk, ${D.now.faro.fire_risk?.page}\n\nDistrict capitals still to come: ${D.capitals.filter(c => !c.live).map(c => c.name).join(', ')}.\n`;
  add(page({ path: '/map/', title: 'Map: warnings and fire risk in the Algarve', description: 'IPMA warnings for the Faro district and rural fire risk for each of the Algarve\'s 17 places, for three days, on a map.', body, md }));
}

// ---------------------------------------------------------------- a page per place
function placePage(t) {
  const n = t.now, st = n.station, rd = st?.reading || {}, fc = n.forecast, fr = n.fire_risk, uv = n.uv, sea = n.sea, ap = n.airport;
  const coast = !!sea;
  const far = fc && fc.km > 15 ? `<p class="note">IPMA has no forecast place in ${esc(t.name)}: this is its forecast for <strong>${esc(fc.place)}</strong>, ${fc.km} km away. The station reading above is ${st?.km <= 5 ? 'the town\'s own' : `from ${esc(st?.name)}, ${st?.km} km away`}.</p>` : '';
  const reads = Object.entries(n.reads || {}).map(([k, v]) => `<tr><td>${esc(k)}</td><td><a href="${esc(v.url)}">${esc(host(v.url))}${esc(new URL(v.url).pathname.replace(/^\/open-data/, '').slice(0, 60))}</a></td><td>${when(v.at)}</td><td class="n">${esc(v.status)}</td></tr>`).join('');
  const body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="/places/">Places</a> › <a href="/places/algarve/">The Algarve</a> › ${esc(t.name)}</nav>
<h1>${esc(t.name)}: weather and civil protection</h1>
<p class="standfirst">${esc(t.name)}${t.kind === 'city' ? ', a city in the municipality of Loulé' : ', a municipality'} in the Faro district. IPMA's data for here, each value with its source.</p>
${freshness(n.read_at)}
${warningsHtml(n.warnings)}
<section class="grid2">
  <div class="panel"><h2>Now</h2>
    <p class="big">${show(rd.temp_c, '°C')}</p>
    <dl class="kv"><dt>Humidity</dt><dd>${show(rd.humidity_pct, '%', 0)}</dd><dt>Wind</dt><dd>${rd.wind_kmh != null ? `${num(rd.wind_kmh, ' km/h')} from ${WIND_DIR[rd.wind_dir_id] || '?'}` : '<span class="na">not reported</span>'}</dd><dt>Rain, last hour</dt><dd>${show(rd.rain_mm, ' mm')}</dd><dt>Pressure</dt><dd>${show(rd.pressure_hpa, ' hPa')}</dd></dl>
    <p class="src">IPMA station <strong>${esc(st?.name)}</strong> (${st?.km} km away), reading of ${when(rd.at)}. <a href="${esc(st?.page)}">IPMA observations</a>.</p></div>
  <div class="panel"><h2>Fire risk</h2><p>${(fr?.days || []).map(fireChip).join(' ')}</p><p class="src">IPMA rural fire risk for the municipality (code ${esc(fr?.municipality)}). <a href="${esc(fr?.page)}">IPMA fire risk</a>. In high fire risk, see <a href="/what-to-do/">what to do</a>.</p></div>
</section>
<section class="panel"><h2>Five days</h2>${forecastChart(fc?.days, D.types)}
<div class="table-wrap"><table class="days"><thead><tr><th scope="col">Day</th><th scope="col">Weather</th><th scope="col">Low</th><th scope="col">High</th><th scope="col">Rain</th></tr></thead><tbody>${(fc?.days || []).map(d => `<tr><th scope="row">${dayName(d.date)}</th><td>${esc(typeOf(d.weather_type))}</td><td class="n">${show(d.t_min_c, '°')}</td><td class="n">${show(d.t_max_c, '°')}</td><td class="n">${d.rain_prob_pct ?? '?'}%</td></tr>`).join('')}</tbody></table></div>
${far}<p class="src">IPMA forecast for ${esc(fc?.place)} (${fc?.km} km). <a href="${esc(fc?.page)}">IPMA forecast page</a>, <a href="${esc(fc?.source)}">open data</a>.</p></section>
<section class="grid2">
  ${coast ? `<div class="panel"><h2>Sea</h2><dl class="kv"><dt>Highest waves</dt><dd>${show(sea.waves_max_m, ' m')}</dd><dt>Highest total sea</dt><dd>${show(sea.sea_max_m, ' m')}</dd><dt>Sea temperature, up to</dt><dd>${show(sea.sea_temp_max_c, '°C')}</dd></dl><p class="src">IPMA's coastal forecast for the ${esc(sea.coast)}, ${dayName(sea.date)}. <a href="${esc(sea.page)}">IPMA sea forecast</a>.</p></div>` : `<div class="panel"><h2>Sea</h2><p>${esc(t.name)} is inland: no coastal forecast is shown.</p></div>`}
  <div class="panel"><h2>UV</h2>${uv ? `<p class="big">${show(uv.index, '', 1)}</p><p class="src">IPMA UV index forecast for ${esc(uv.place)}, ${dayName(uv.date)}. <a href="${esc(uv.page)}">IPMA UV</a>.</p>` : '<p class="na">No UV forecast in the data.</p>'}</div>
</section>
${ap ? `<section class="panel"><h2>Faro airport</h2><p>${ap.airline.length} airline flight${ap.airline.length === 1 ? '' : 's'} and ${ap.other_aircraft} other aircraft seen within ${ap.within_nm} nautical miles at ${when(ap.at)}.</p><p class="src">${esc(ap.note)} <a href="${esc(ap.page)}">adsb.lol</a>. For flight status, ask your airline or <a href="https://www.aeroportofaro.pt/">the airport</a>.</p></section>` : ''}
<section class="panel follow"><h2>What to do, and who to follow</h2><ul><li>Warnings and forecasts: <a href="https://www.ipma.pt/">IPMA</a>, the national weather service.</li><li>Civil protection: <a href="https://prociv.gov.pt/">ANEPC</a>, and your municipality's civil protection service.</li><li>In an emergency: call <strong>112</strong>.</li></ul><p><a href="/what-to-do/">What IPMA's warning levels and fire risk classes mean, and what to do</a>.</p></section>
<section><h2>Sources, as read</h2><div class="table-wrap"><table class="reads"><thead><tr><th scope="col">Data set</th><th scope="col">Address</th><th scope="col">Read</th><th scope="col">HTTP</th></tr></thead><tbody>${reads}</tbody></table></div><p class="src">Read by ${esc(n.by)}; copied here from the <a href="https://github.com/PrompTugal/PrompTugal__News__Website/blob/dev/data/by-place/now/${t.id}.json">PrompTugal.news Website repository</a> (commit ${esc(D.sync.commit.slice(0, 7))}).</p></section>`;
  const md = `${t.name}, in the Faro district. Read ${when(n.read_at)}.

## Warnings

${warningsMd(n.warnings)}

## Now

IPMA station ${st?.name} (${st?.km} km away), reading of ${when(rd.at)}: ${showMd(rd.temp_c, '°C')}, humidity ${showMd(rd.humidity_pct, '%', 0)}, wind ${rd.wind_kmh != null ? `${num(rd.wind_kmh, ' km/h')} from ${WIND_DIR[rd.wind_dir_id] || '?'}` : 'not reported'}, rain in the last hour ${showMd(rd.rain_mm, ' mm')}, pressure ${showMd(rd.pressure_hpa, ' hPa')}. Source: ${st?.source}

## Fire risk

${(fr?.days || []).map(d => `- ${dayName(d.date)}: ${d.level} (${FIRE_PT[d.level] || ''})`).join('\n')}

Source: IPMA, ${fr?.page}

## Five days (IPMA forecast for ${fc?.place}, ${fc?.km} km)

| Day | Weather | Low | High | Rain |
|---|---|---|---|---|
${(fc?.days || []).map(d => `| ${dayName(d.date)} | ${typeOf(d.weather_type)} | ${showMd(d.t_min_c, '°C')} | ${showMd(d.t_max_c, '°C')} | ${d.rain_prob_pct ?? '?'}% |`).join('\n')}

Source: ${fc?.source}
${coast ? `\n## Sea\n\n${sea.coast}, ${dayName(sea.date)}: waves up to ${showMd(sea.waves_max_m, ' m')}, total sea up to ${showMd(sea.sea_max_m, ' m')}, sea temperature up to ${showMd(sea.sea_temp_max_c, '°C')}. Source: ${sea.source}\n` : ''}
## UV

${uv ? `${uv.place}, ${dayName(uv.date)}: ${showMd(uv.index, '', 1)}. Source: ${uv.source}` : 'No UV forecast in the data.'}

## Who to follow

- IPMA: https://www.ipma.pt/
- ANEPC: https://prociv.gov.pt/
- Emergency: 112

## Sources, as read

${Object.entries(n.reads || {}).map(([k, v]) => `- ${k}: ${v.url}, read ${when(v.at)}, HTTP ${v.status}`).join('\n')}
`;
  add(page({ path: `/places/${t.id}/`, title: `${t.name}: weather, warnings and fire risk`, description: `IPMA warnings, the nearest station, a five-day forecast, fire risk, sea and UV for ${t.name} (Algarve), with sources and times read.`, body, md }));
}

function regionPage() {
  const r = D.region;
  const body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="/places/">Places</a> › The Algarve</nav>
<h1>The Algarve: weather and civil protection</h1>
<p class="standfirst">The Faro district: 16 municipalities and Quarteira. One set of IPMA warnings covers all of it; fire risk is per municipality; each place reads its nearest station.</p>
${freshness(r.read_at)}
${warningsHtml(r.warnings)}
<figure>${algarveMap({ outline: algOutline, towns: D.towns, label: t => { const p = r.places.find(x => x.place === t.id); return `${t.name} ${p?.temp_c != null ? num(p.temp_c, '°') : ''}`; }, caption: 'The 17 Algarve places with the nearest station\'s temperature' })}<figcaption>Dots by today's fire risk; temperatures from each place's nearest IPMA station, where it reported.</figcaption></figure>
<div class="table-wrap"><table><thead><tr><th scope="col">Place</th><th scope="col">Nearest station</th><th scope="col">Temperature</th></tr></thead><tbody>${r.places.map(p => { const t = D.towns.find(x => x.id === p.place); return `<tr><th scope="row"><a href="/places/${p.place}/">${esc(t?.name || p.place)}</a></th><td>${esc(p.station)}</td><td class="n">${show(p.temp_c, '°C')}</td></tr>`; }).join('')}</tbody></table></div>`;
  const md = `Read ${when(r.read_at)}.\n\n## Warnings, Faro district\n\n${warningsMd(r.warnings)}\n\n## Places\n\n| Place | Nearest station | Temperature |\n|---|---|---|\n${r.places.map(p => `| [${D.towns.find(x => x.id === p.place)?.name || p.place}](/places/${p.place}/) | ${p.station} | ${showMd(p.temp_c, '°C')} |`).join('\n')}\n`;
  add(page({ path: '/places/algarve/', title: 'The Algarve: weather, warnings and fire risk', description: 'IPMA warnings for the Faro district and the nearest station reading for each of the Algarve\'s 17 places.', body, md }));
}

function placesIndex() {
  const body = `<h1>Places</h1>
<p class="standfirst">The Algarve's 17 places first, then the capitals of mainland Portugal's 18 districts.</p>
<h2><a href="/places/algarve/">The Algarve</a></h2>
<ul class="place-list">${D.towns.map(t => `<li><a href="/places/${t.id}/">${esc(t.name)}</a> <span class="chip ${fireClass(t.now.fire_risk?.days?.[0]?.level)}">${esc(t.now.fire_risk?.days?.[0]?.level || '?')}</span></li>`).join('')}</ul>
<h2>District capitals</h2>
<p>Faro is live. The other 17 wait for their data: warnings, forecasts and fire risk for every district, read by the Data team and published at <a href="https://data.promptugal.news/">data.promptugal.news</a>. This site does not collect data itself.</p>
<ul class="place-list coming">${D.capitals.map(c => c.live ? `<li><a href="/places/faro/">Faro</a> <span class="tag-live">live</span></li>` : `<li>${esc(c.name)} <span class="na">(${esc(c.district)} district, data coming)</span></li>`).join('')}</ul>`;
  const md = `## The Algarve\n\n${D.towns.map(t => `- [${t.name}](/places/${t.id}/): fire risk today ${t.now.fire_risk?.days?.[0]?.level || '?'}`).join('\n')}\n\n## District capitals\n\nFaro is live; the others wait for data.promptugal.news.\n\n${D.capitals.map(c => `- ${c.name} (${c.district})${c.live ? ': live, /places/faro/' : ': data coming'}`).join('\n')}\n`;
  add(page({ path: '/places/', title: 'Places: the Algarve and the district capitals', description: 'Every place with weather and civil protection data: the Algarve\'s 17 now, the district capitals next.', body, md }));
}

// ---------------------------------------------------------------- storms
const lab = l => `<span class="label label-${esc(l || 'fact')}">${esc(l || 'fact')}</span>`;
const src = (s, u) => u ? `<a href="${esc(u)}">${esc(s || host(u))}</a>` : esc(s || '');
function stormPage(s) {
  const made = { code: 'scripts/site/generate.mjs renders data/storms/' + s.id + '.json.', agents: `${esc(s.written_by || 'weather.writer@PrompTugal.dinis')} (Claude, Sonnet) wrote the record from the Storm Charles repository; weather@PrompTugal.dinis (Claude, Opus) reviewed it.`, person: s.checked_by_person ? esc(s.checked_by_person) : 'Not yet checked by a person.' };
  const body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="/storms/">Storms</a> › ${esc(s.name)}</nav>
<h1>${esc(s.name)}, ${esc(s.dates.from)} to ${esc(s.dates.to)}</h1>
<p class="kicker">Archived event · ${esc((s.areas || []).join(', '))}</p>
<p class="standfirst">${esc(s.standfirst)}</p>
<p>The full record, as it was kept during the storm: <a href="${esc(s.archive_site)}">${esc(host(s.archive_site))}</a> (<a href="${esc(s.archive_repo)}">repository</a>).</p>
${s.peaks?.length ? `<section><h2>The peaks</h2><div class="peaks">${s.peaks.map(p => `<div class="peak"><p class="v">${esc(p.value)}</p><p class="w">${esc(p.what)}${p.where ? `, ${esc(p.where)}` : ''}</p><p class="src">${lab(p.label)} ${src(p.source, p.url)}${p.read ? `, ${esc(p.read)}` : ''}</p></div>`).join('')}</div></section>` : ''}
${s.warnings?.length ? `<section><h2>IPMA's warnings</h2><div class="table-wrap"><table><thead><tr><th scope="col">District</th><th scope="col">Warning</th><th scope="col">Level</th><th scope="col">From</th><th scope="col">To</th><th scope="col">Source</th></tr></thead><tbody>${s.warnings.map(w => `<tr><td>${esc(w.district)}</td><td>${esc(w.kind)}</td><td><span class="chip ${warnClass(w.level)}">${esc(w.level)}</span></td><td>${esc(w.from)}</td><td>${esc(w.to)}</td><td>${src(w.source, w.url)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
${s.algarve ? `<section><h2>In the Algarve</h2><p>${esc(s.algarve)}</p></section>` : ''}
${s.decisions?.length ? `<section><h2>Decisions</h2><ul class="decisions">${s.decisions.map(d => `<li><strong>${esc(d.who)}</strong>: ${esc(d.what)} <span class="when">${esc(d.at)}</span> ${src(d.source, d.url)}</li>`).join('')}</ul></section>` : ''}
${s.timeline?.length ? `<section><h2>Timeline</h2><ol class="timeline">${s.timeline.map(e => `<li><time>${when(e.at)}</time> ${lab(e.label)} ${esc(e.text)} <span class="src">${src(e.source, e.url)}</span></li>`).join('')}</ol></section>` : ''}
${s.lessons?.length ? `<section><h2>For the next storm</h2><p class="note">Our analysis, not advice: follow IPMA and ANEPC.</p><ul>${s.lessons.map(l => `<li>${esc(l)}</li>`).join('')}</ul></section>` : ''}
${s.sources?.length ? `<section><h2>Sources</h2><ul>${s.sources.map(x => `<li>${src(x.name, x.url)}</li>`).join('')}</ul></section>` : ''}`;
  const md = `${s.standfirst}\n\nFull record: ${s.archive_site} (repository ${s.archive_repo}).\n\n${s.peaks?.length ? `## The peaks\n\n${s.peaks.map(p => `- **${p.value}**: ${p.what}${p.where ? `, ${p.where}` : ''} (${p.label}; ${p.source}${p.url ? `, ${p.url}` : ''})`).join('\n')}\n\n` : ''}${s.warnings?.length ? `## IPMA's warnings\n\n| District | Warning | Level | From | To | Source |\n|---|---|---|---|---|---|\n${s.warnings.map(w => `| ${w.district} | ${w.kind} | ${w.level} | ${w.from} | ${w.to} | ${w.url || w.source} |`).join('\n')}\n\n` : ''}${s.algarve ? `## In the Algarve\n\n${s.algarve}\n\n` : ''}${s.decisions?.length ? `## Decisions\n\n${s.decisions.map(d => `- ${d.who}: ${d.what} (${d.at}; ${d.url || d.source})`).join('\n')}\n\n` : ''}${s.timeline?.length ? `## Timeline\n\n${s.timeline.map(e => `- ${when(e.at)} [${e.label}] ${e.text} (${e.url || e.source})`).join('\n')}\n\n` : ''}${s.lessons?.length ? `## For the next storm (our analysis)\n\n${s.lessons.map(l => `- ${l}`).join('\n')}\n\n` : ''}${s.sources?.length ? `## Sources\n\n${s.sources.map(x => `- ${x.name}: ${x.url}`).join('\n')}\n` : ''}`;
  add(page({ path: `/storms/${s.id}/`, title: `${s.name}: the archive`, description: `${s.name}, ${s.dates.from} to ${s.dates.to}: IPMA's warnings, the peaks, the decisions and the timeline, each with its source.`, body, md, made }));
}
function stormsIndex() {
  const body = `<h1>Storms</h1><p class="standfirst">Past events, archived with their sources. A storm's own site is kept as it was; this archive summarises it and links to it.</p>
${D.storms.length ? `<ul class="storm-list">${D.storms.map(s => `<li><a href="/storms/${s.id}/"><strong>${esc(s.name)}</strong></a>, ${esc(s.dates.from)} to ${esc(s.dates.to)}: ${esc((s.areas || []).join(', '))}</li>`).join('')}</ul>` : '<p>The first archived event, Storm Charles, is being written.</p>'}`;
  const md = D.storms.map(s => `- [${s.name}](/storms/${s.id}/), ${s.dates.from} to ${s.dates.to}`).join('\n') || 'The first archived event, Storm Charles, is being written.';
  add(page({ path: '/storms/', title: 'Storms: the archive', description: 'Past storms in Portugal, archived with their IPMA warnings, peaks, decisions and sources.', body, md }));
}

// ---------------------------------------------------------------- content pages (content/*.md)
function contentPages() {
  if (!existsSync('content')) return;
  for (const f of readdirSync('content').filter(f => f.endsWith('.md'))) {
    const { meta, body } = parseFront(readFileSync(join('content', f), 'utf8'));
    const slug = f.replace(/\.md$/, '');
    const made = meta.made_agents ? { agents: meta.made_agents, code: 'scripts/site/generate.mjs renders content/' + f + '.' } : { code: 'scripts/site/generate.mjs renders content/' + f + '.' };
    add(page({ path: `/${slug}/`, title: meta.title || slug, description: meta.summary || meta.title || slug, body: `<article class="prose"><h1>${esc(meta.title || slug)}</h1>${meta.summary ? `<p class="standfirst">${esc(meta.summary)}</p>` : ''}${markdown(body)}</article>`, md: body, made }));
  }
}

// ---------------------------------------------------------------- design variations (scripts/site/design/*.mjs)
async function designPages() {
  const dir = 'scripts/site/design';
  if (!existsSync(dir)) return;
  const mods = readdirSync(dir).filter(f => /^[a-z]\.mjs$/.test(f)).sort();
  const shown = [];
  for (const f of mods) {
    const m = await import(new URL(`./design/${f}`, import.meta.url));
    const v = m.render({ D, BUILT, lib: await import('./lib.mjs'), outline, algOutline });
    const id = f.replace('.mjs', '');
    add(page({ path: `/design/${id}/`, title: `Design ${id.toUpperCase()}: ${v.name}`, description: v.description, body: `<div class="design-note"><p>Front page variation ${id.toUpperCase()}, <strong>${esc(v.name)}</strong>, for Dinis to choose. <a href="/design/">All three</a></p></div><div class="design design-${id}">${v.body}</div>`, md: v.md || v.description, extraHead: v.css ? `<style>${v.css}</style>` : '', made: { agents: `${esc(v.by || 'weather.design@PrompTugal.dinis')} (Claude, Sonnet) designed it; weather@PrompTugal.dinis (Claude, Opus) reviewed it.` } }));
    shown.push({ id, ...v });
  }
  if (!shown.length) return;
  const body = `<h1>Three front pages, for Dinis to choose</h1><p class="standfirst">The same data, three ways. Each is a full page; open them side by side.</p><div class="design-grid">${shown.map(v => `<figure><a href="/design/${v.id}/"><iframe src="/design/${v.id}/" title="Design ${v.id.toUpperCase()}" loading="lazy" tabindex="-1"></iframe></a><figcaption><a href="/design/${v.id}/"><strong>${v.id.toUpperCase()}: ${esc(v.name)}</strong></a><br>${esc(v.description)}</figcaption></figure>`).join('')}</div><p>The live front page is <a href="/">the current one</a>; the choice replaces it.</p>`;
  const md = shown.map(v => `- [${v.id.toUpperCase()}: ${v.name}](/design/${v.id}/): ${v.description}`).join('\n');
  add(page({ path: '/design/', title: 'Design: three front pages', description: 'Three variations of the weather.promptugal.news front page, side by side, for Dinis to choose.', body, md }));
}

// ---------------------------------------------------------------- about
function about() {
  const body = `<article class="prose"><h1>About this site</h1>
<p class="standfirst">PrompTugal.news Weather shows weather and civil protection for Portugal, place by place, from public data, each value with its source and the time it was read.</p>
<h2>Not a warning service</h2><p>Nothing here is a forecast or advice of our own. Warnings are IPMA's; civil protection is ANEPC's and your municipality's. The pages are rebuilt when new data is pushed, so they can be hours behind: always check <a href="https://www.ipma.pt/">IPMA</a> and <a href="https://prociv.gov.pt/">ANEPC</a>.</p>
<h2>Where the data comes from</h2><p>IPMA's open data (<a href="https://api.ipma.pt/open-data/">api.ipma.pt/open-data</a>), read hourly by the PrompTugal.news Website repository's collector (no model involved) and published there as one small JSON file per place. This site copies those files (<code>scripts/sync-data.mjs</code>) and builds its pages from them. When <a href="https://data.promptugal.news/">data.promptugal.news</a> publishes its APIs, the site reads from them instead. This site runs no collector of its own.</p>
<p>Last copy: ${when(D.sync.synced_at)}, from commit <code>${esc(D.sync.commit.slice(0, 7))}</code> of <a href="${esc(D.sync.from)}">${esc(D.sync.from.replace('https://github.com/', ''))}</a>. Data last read from IPMA: ${when(D.region.read_at)}. Built ${when(BUILT.toISOString())}.</p>
<h2>How it is made</h2><ul><li><strong>Code</strong>: a small build in Node with no dependencies (<code>scripts/</code>) turns the data into pages, a markdown twin for each, <a href="/llms.txt">llms.txt</a> and a sitemap. A gate checks every page before it goes live.</li><li><strong>Agents</strong>: weather@PrompTugal.dinis (Claude, Opus) leads the team and wrote the code; weather.writer@ and weather.design@ (Claude, Sonnet) wrote the storm archive, the advice page and the design variations. Each page says who made it.</li><li><strong>A person</strong>: Dinis Cruz instructs the team. No page has been checked by a person yet; each page says so until one is.</li></ul>
<h2>Licences</h2><p>Code Apache-2.0; text CC BY 4.0. IPMA's data is IPMA's. Map outlines from Natural Earth (public domain) via world-atlas (ISC). Fonts under the SIL Open Font License (<a href="/fonts/LICENSE.md">details</a>).</p>
<h2>Corrections</h2><p>Open an issue on <a href="https://github.com/PrompTugal/PrompTugal__News__Weather/issues">the repository</a>.</p></article>`;
  const md = `PrompTugal.news Weather shows weather and civil protection for Portugal, place by place, from public data.\n\n## Not a warning service\n\nWarnings are IPMA's; civil protection is ANEPC's. Pages can be hours behind.\n\n## Data\n\nIPMA open data, read hourly by the PrompTugal.news Website repository and copied here by scripts/sync-data.mjs. Last copy ${when(D.sync.synced_at)} (commit ${D.sync.commit.slice(0, 7)}). Data read from IPMA ${when(D.region.read_at)}.\n\n## How it is made\n\n- Code: Node, no dependencies, scripts/.\n- Agents: weather@PrompTugal.dinis (Claude, Opus); weather.writer@ and weather.design@ (Claude, Sonnet).\n- A person: Dinis Cruz instructs; no page checked by a person yet.\n\n## Licences\n\nCode Apache-2.0, text CC BY 4.0.\n`;
  add(page({ path: '/about/', title: 'About PrompTugal.news Weather', description: 'How weather.promptugal.news is made: where the data comes from, who wrote what, and why it is not a warning service.', body, md }));
}

// ---------------------------------------------------------------- run
front(); mapPage(); placesIndex(); regionPage(); for (const t of D.towns) placePage(t);
for (const s of D.storms) stormPage(s); stormsIndex(); contentPages(); about();
await designPages();

const llms = `# PrompTugal.news Weather

> Weather and civil protection for Portugal, place by place: IPMA warnings, forecasts, fire risk, sea and UV, each value with its source and time read. Not a warning service: follow IPMA (https://www.ipma.pt/) and ANEPC (https://prociv.gov.pt/).

Version __VERSION__. Every page has a markdown twin (index.md beside index.html).

## Pages

${pages.filter(p => !p.path.startsWith('/design/')).map(p => `- [${p.title}](${SITE}${p.path}index.md): ${p.description}`).join('\n')}

## Data

- Per-place data, copied from https://github.com/PrompTugal/PrompTugal__News__Website (data/by-place/now/): ${SITE}/data/now/{place}.json
- Where it came from: ${SITE}/data/sync.json
`;
writeFileSync(join(OUT, 'llms.txt'), llms);
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${SITE}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`generated ${pages.length} pages with markdown twins`);
