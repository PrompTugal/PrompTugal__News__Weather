// Design A: warnings first. weather.design@PrompTugal.dinis, 17 Nov 2026. Code: Apache-2.0.
export function render({ D, BUILT, lib }) {
  const { esc, safeHref, when, localWhen, dayName, show, showMd, num, fireClass, warnClass, worstWarning } = lib;
  const r = D.region, w = r.warnings || {};
  const active = (w.active || []).slice().sort((a, b) => ['green', 'yellow', 'orange', 'red'].indexOf(b.level) - ['green', 'yellow', 'orange', 'red'].indexOf(a.level));
  const lvl = worstWarning(r), top = active[0];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const started = top && new Date(top.start + 'Z') <= new Date(r.read_at);
  const band = top
    ? `<div class="a-band ${warnClass(lvl)}"><p class="a-lvl">${cap(lvl)} warning</p><h1>${esc(cap(top.type))}</h1><p class="a-times">${started ? 'In force until' : 'From'} ${started ? localWhen(top.end) : `${localWhen(top.start)} to ${localWhen(top.end)}`}, Portugal time</p><p class="a-text" lang="pt">${esc(top.text || '')}</p></div>`
    : `<div class="a-band warn-green"><p class="a-lvl">Green</p><h1>No IPMA warning above green</h1><p class="a-times">${esc(w.area)}. No warning is not the same as no risk.</p></div>`;
  const more = active.slice(1).map(a => `<li class="warning ${warnClass(a.level)}"><span class="lvl">${cap(a.level)}</span> <strong>${esc(a.type)}</strong> <span lang="pt">(${esc(a.type_pt)})</span><br><span class="when">${localWhen(a.start)} to ${localWhen(a.end)}, Portugal time</span></li>`).join('');
  const tiles = D.towns.map(t => {
    const n = t.now, st = n.station?.reading || {}, f = n.forecast?.days?.[0] || {}, fr = n.fire_risk?.days?.[0] || {};
    return `<li><a class="a-tile" href="/places/${t.id}/"><span class="a-name">${esc(t.name)}</span><span class="a-now">${show(st.temp_c, '°')}</span><span class="a-hl">${show(f.t_max_c, '°')} / ${show(f.t_min_c, '°')}</span><span class="chip ${fireClass(fr.level)}">${esc(fr.level || '?')}</span></a></li>`;
  }).join('');
  const f0 = D.now.faro;
  const body = `<section class="a-top">
${band}
${more ? `<ul class="a-more">${more}</ul>` : ''}
<p class="a-src">Warnings for ${esc(w.area)}, read ${when(r.read_at)}. Source: <a href="${safeHref(w.page)}">IPMA warnings</a>, <a href="${safeHref(w.source)}">open data</a>. This site is not a warning service: follow <a href="https://www.ipma.pt/">IPMA</a> and <a href="https://prociv.gov.pt/">ANEPC</a>.</p>
</section>
<section>
<h2>The 17 places</h2>
<p class="a-key">Each tile: now (nearest station), today's high / low, today's fire risk.</p>
<ul class="a-tiles">${tiles}</ul>
<p class="a-src">Sources: <a href="${safeHref(f0.station?.page)}">IPMA station readings</a> (last hourly value), <a href="${safeHref(f0.forecast?.page)}">IPMA forecast</a> (nearest of four Algarve places), <a href="${safeHref(f0.fire_risk?.page)}">IPMA rural fire risk</a>. "Not reported" means the station sent no value. Open a tile for each value's source and time.</p>
</section>`;
  const md = `## ${top ? `${cap(lvl)} warning: ${top.type}` : 'No IPMA warning above green'}\n\n${top ? `${localWhen(top.start)} to ${localWhen(top.end)} Portugal time. ${top.text || ''}\n\n` : ''}Source: IPMA, ${w.page}. Read ${when(r.read_at)}. Not a warning service: follow IPMA and ANEPC.\n\n## The 17 places\n\n${D.towns.map(t => { const n = t.now, f = n.forecast?.days?.[0] || {}; return `- [${t.name}](/places/${t.id}/): now ${showMd(n.station?.reading?.temp_c, '°C')}, today ${showMd(f.t_max_c, '°C')} / ${showMd(f.t_min_c, '°C')}, fire risk ${n.fire_risk?.days?.[0]?.level || '?'}`; }).join('\n')}\n`;
  const css = `
.design-a .a-band{padding:1.2rem 1.2rem 1rem;border-left:14px solid var(--w-green);background:var(--panel);border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.design-a .a-band h1{font-size:clamp(2rem,7vw,3.6rem);margin:.1rem 0 .3rem}
.design-a .a-band p{margin:.2rem 0}
.design-a .a-lvl{font:600 13px var(--mono);text-transform:uppercase;letter-spacing:.05em}
.design-a .a-times{font:15px var(--mono)}
.design-a .a-text{font-style:italic;max-width:46rem}
.design-a .a-band.warn-yellow{border-color:var(--w-yellow);background:color-mix(in srgb,var(--w-yellow) 28%,var(--paper))}
.design-a .a-band.warn-orange{border-color:var(--w-orange);background:color-mix(in srgb,var(--w-orange) 28%,var(--paper))}
.design-a .a-band.warn-red{border-color:var(--w-red);background:color-mix(in srgb,var(--w-red) 28%,var(--paper))}
.design-a .a-band.warn-green{background:color-mix(in srgb,var(--w-green) 18%,var(--paper))}
.design-a .a-more{list-style:none;padding:0;margin:.6rem 0}
.design-a .a-src,.design-a .a-key{font-size:.82rem;color:var(--muted)}
.design-a .a-tiles{list-style:none;margin:.6rem 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(10.5rem,1fr));gap:.6rem}
.design-a .a-tile{display:grid;gap:.15rem;text-decoration:none;background:var(--panel);border:1px solid var(--rule);border-top:3px solid var(--ink);padding:.5rem .65rem .6rem;height:100%}
.design-a .a-tile:hover{border-top-color:var(--red)}
.design-a .a-name{font:600 1.05rem var(--serif);overflow-wrap:anywhere}
.design-a .a-now{font:500 1.9rem/1.1 var(--serif);min-height:2.1rem;display:flex;align-items:flex-end}
.design-a .a-now .na{font:italic 400 .8rem var(--sans)}
.design-a .a-hl{font:13px var(--mono);color:var(--muted)}
.design-a .a-tile .chip{justify-self:start;margin-top:.2rem}
@media (max-width:480px){.design-a .a-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  return { name: 'Warnings first', description: 'A large band for the worst IPMA warning in force and its times, then the 17 places as compact tiles.', by: 'weather.design@PrompTugal.dinis', body, md, css };
}
