// Design B: the map is the page. weather.design@PrompTugal.dinis, 17 Nov 2026. Code: Apache-2.0.
export function render({ D, BUILT, lib, outline, algOutline }) {
  const { esc, safeHref, when, localWhen, dayName, show, showMd, num, fireClass, warnClass, worstWarning, portugalMap, algarveMap, FIRE, FIRE_PT } = lib;
  const r = D.region, w = r.warnings || {}, lvl = worstWarning(r);
  const top = (w.active || [])[0];
  const temp = t => num(t.now.station?.reading?.temp_c, '°') ?? 'n/r';
  const algMap = algarveMap({ outline: algOutline, towns: D.towns, colour: t => fireClass(t.now.fire_risk?.days?.[0]?.level), label: t => `${t.name} ${temp(t)}`, width: 720, caption: 'The Algarve: each place with its station temperature now (n/r: not reported) and its fire risk today' });
  const ptMap = portugalMap({ outline, capitals: D.capitals, towns: D.towns, region: r, width: 300 });
  const legend = Object.keys(FIRE).map(k => `<span class="chip ${fireClass(k)}">${k}</span>`).join(' ');
  const f0 = D.now.faro;
  const rows = D.towns.map(t => {
    const n = t.now, f = n.forecast?.days?.[0] || {}, fr = n.fire_risk?.days?.[0] || {};
    return `<li><a href="/places/${t.id}/">${esc(t.name)}</a><span class="b-n b-now">${show(n.station?.reading?.temp_c, '°')}</span><span class="b-n b-hl">${show(f.t_max_c, '°')} / ${show(f.t_min_c, '°')}</span><span class="chip ${fireClass(fr.level)}">${esc(fr.level || '?')}</span></li>`;
  }).join('');
  const body = `<h1 class="b-h">The Algarve now</h1>
<p class="b-line ${warnClass(lvl)}"><span class="chip ${warnClass(lvl)}">${top ? `${esc(lvl)} warning` : 'no warning above green'}</span> ${top ? `${esc(top.type)}, ${localWhen(top.start)} to ${localWhen(top.end)} Portugal time. ` : ''}<span class="b-src">Read ${when(r.read_at)}. <a href="${safeHref(w.page)}">IPMA warnings</a>. Not a warning service: follow <a href="https://www.ipma.pt/">IPMA</a> and <a href="https://prociv.gov.pt/">ANEPC</a>.</span></p>
<section class="b-maps">
  <figure class="b-main">${algMap}<figcaption>Dots: today's fire risk (<a href="${safeHref(f0.fire_risk?.page)}">IPMA</a>). Figures: the nearest station's last hourly temperature (<a href="${safeHref(f0.station?.page)}">IPMA</a>); n/r means not reported.</figcaption></figure>
  <figure class="b-side"><a href="/map/">${ptMap}</a><figcaption>Mainland Portugal: the Faro district shaded by its worst warning. <a href="/map/">Full map, three days</a></figcaption></figure>
</section>
<p class="legend">Fire risk: ${legend}</p>
<section><h2>The same data, as a list</h2>
<ul class="b-list"><li class="b-head"><span>Place</span><span class="b-n b-now">Now</span><span class="b-n b-hl">High / low</span><span>Fire risk</span></li>${rows}</ul>
<p class="b-src">High / low: <a href="${safeHref(f0.forecast?.page)}">IPMA forecast</a> for the nearest of four Algarve places. Each place's page gives every source and time.</p></section>`;
  const md = `## The Algarve now\n\n${top ? `${lvl} warning: ${top.type}, ${localWhen(top.start)} to ${localWhen(top.end)} Portugal time.` : 'No IPMA warning above green.'} Read ${when(r.read_at)}. Source: IPMA, ${w.page}. Not a warning service: follow IPMA and ANEPC.\n\n${D.towns.map(t => { const n = t.now, f = n.forecast?.days?.[0] || {}; return `- [${t.name}](/places/${t.id}/): now ${showMd(n.station?.reading?.temp_c, '°C')}, high / low ${showMd(f.t_max_c, '°C')} / ${showMd(f.t_min_c, '°C')}, fire risk ${n.fire_risk?.days?.[0]?.level || '?'}`; }).join('\n')}\n`;
  const css = `
.design-b .b-h{margin:.2rem 0 .4rem}
.design-b .b-line{margin:.2rem 0 1rem;font-size:.95rem}
.design-b .b-src,.design-b .b-src a{font-size:.82rem;color:var(--muted)}
.design-b .b-maps{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:1.5rem;align-items:start}
.design-b .b-maps figure{margin:0}
.design-b .b-side svg{width:100%;max-width:300px;height:auto;display:block;margin:0 auto}
.design-b .b-main .map-algarve text{font-size:13px}
.design-b .b-list{list-style:none;margin:0;padding:0;font-size:.95rem}
.design-b .b-list li{display:grid;grid-template-columns:minmax(0,1fr) 8rem 9.5rem 6.5rem;gap:.5rem;align-items:center;padding:.35rem .2rem;border-bottom:1px solid var(--rule)}
.design-b .b-list .b-head{font:500 12px var(--mono);text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--ink)}
.design-b .b-n{font-family:var(--mono);white-space:nowrap}
.design-b .b-list .chip{justify-self:start}
@media (max-width:760px){.design-b .b-maps{grid-template-columns:1fr}
 .design-b .b-main{overflow-x:auto}.design-b .b-main svg{min-width:600px}.design-b .b-main figcaption{position:sticky;left:0;max-width:calc(100vw - 32px)}
 .design-b .b-list .b-head{display:none}
 .design-b .b-list li{grid-template-columns:minmax(0,1fr) auto;row-gap:.1rem}
 .design-b .b-list li>a{grid-column:1;grid-row:1}.design-b .b-list li>.chip{grid-column:2;grid-row:1;justify-self:end}
 .design-b .b-now{grid-column:1;grid-row:2}.design-b .b-hl{grid-column:2;grid-row:2;justify-self:end}
 .design-b .b-now::before{content:'now ';font-family:var(--sans);color:var(--muted)}}`;
  return { name: 'The map is the page', description: 'A large Algarve map with temperatures and fire risk, the Portugal map beside it, and the same data as a list underneath.', by: 'weather.design@PrompTugal.dinis', body, md, css };
}
