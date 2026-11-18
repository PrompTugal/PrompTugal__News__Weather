// Design C: your town. weather.design@PrompTugal.dinis, 17 Nov 2026. Code: Apache-2.0.
export function render({ D, BUILT, lib }) {
  const { esc, safeHref, when, localWhen, dayName, show, showMd, num, fireClass, warnClass, worstWarning } = lib;
  const r = D.region, w = r.warnings || {}, lvl = worstWarning(r), top = (w.active || [])[0];
  const f0 = D.now.faro;
  const picker = D.towns.map(t => {
    const n = t.now, f = n.forecast?.days?.[0] || {}, fr = n.fire_risk?.days?.[0] || {};
    return `<li><a class="c-pick" href="/places/${t.id}/"><span class="c-name">${esc(t.name)}</span><span class="c-line">now ${show(n.station?.reading?.temp_c, '°')} · today ${show(f.t_max_c, '°')}/${show(f.t_min_c, '°')} · <span class="chip ${fireClass(fr.level)}">${esc(fr.level || '?')}</span></span></a></li>`;
  }).join('');
  // small multiples: highest temperature over the forecast days, one shared scale
  const all = D.towns.flatMap(t => (t.now.forecast?.days || []).map(d => d.t_max_c)).filter(v => typeof v === 'number');
  const lo = Math.floor(Math.min(...all)) - 1, hi = Math.ceil(Math.max(...all)) + 1;
  const W = 120, H = 40, px = 6, py = 6;
  const spark = t => {
    const days = t.now.forecast?.days || [];
    const pts = days.map((d, i) => typeof d.t_max_c === 'number' ? [px + i * (W - 2 * px) / Math.max(days.length - 1, 1), py + (hi - d.t_max_c) / (hi - lo) * (H - 2 * py), d] : null).filter(Boolean);
    if (!pts.length) return '<p class="na">no forecast</p>';
    const desc = pts.map(p => `${dayName(p[2].date)} ${num(p[2].t_max_c, '°C')}`).join(', ');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Highest temperature, ${esc(desc)}"><polyline points="${pts.map(p => p[0] + ',' + p[1].toFixed(1)).join(' ')}"/>${pts.map(p => `<circle cx="${p[0]}" cy="${p[1].toFixed(1)}" r="2.2"><title>${esc(dayName(p[2].date))}: ${num(p[2].t_max_c, '°C')}</title></circle>`).join('')}</svg>`;
  };
  const days0 = D.towns[0]?.now.forecast?.days || [];
  const multiples = D.towns.map(t => { const d = t.now.forecast?.days || []; return `<li><a href="/places/${t.id}/"><span class="c-name">${esc(t.name)}</span>${spark(t)}<span class="c-range">${show(d[0]?.t_max_c, '°')} to ${show(d[d.length - 1]?.t_max_c, '°')}</span></a></li>`; }).join('');
  const body = `<section class="c-head">
<p class="kicker">Your town</p>
<h1>Pick your place in the Algarve</h1>
<p class="c-warn"><span class="chip ${warnClass(lvl)}">${top ? `${esc(lvl)} warning` : 'no warning above green'}</span> ${top ? `${esc(top.type)}, ${localWhen(top.start)} to ${localWhen(top.end)} Portugal time. ` : ''}<span class="c-src">Read ${when(r.read_at)}. <a href="${safeHref(w.page)}">IPMA warnings</a>. Not a warning service: follow <a href="https://www.ipma.pt/">IPMA</a> and <a href="https://prociv.gov.pt/">ANEPC</a>.</span></p>
</section>
<ul class="c-grid">${picker}</ul>
<p class="c-src">Now: nearest station's last hourly reading (<a href="${safeHref(f0.station?.page)}">IPMA</a>). Today: <a href="${safeHref(f0.forecast?.page)}">IPMA forecast</a> high/low. Fire risk: <a href="${safeHref(f0.fire_risk?.page)}">IPMA</a>.</p>
<section><h2>Five days of highest temperature</h2>
<p class="c-src">One small chart per place, all on the same scale (${lo}° to ${hi}°), from ${days0.length ? `${dayName(days0[0].date)} to ${dayName(days0[days0.length - 1].date)}` : 'the forecast days'}. Each value is <a href="${safeHref(f0.forecast?.page)}">IPMA's forecast</a> for the nearest of four Algarve places.</p>
<ul class="c-multi">${multiples}</ul></section>`;
  const md = `## Pick your place\n\n${top ? `${lvl} warning: ${top.type}, ${localWhen(top.start)} to ${localWhen(top.end)} Portugal time.` : 'No IPMA warning above green.'} Read ${when(r.read_at)}. Not a warning service: follow IPMA and ANEPC.\n\n${D.towns.map(t => { const n = t.now, f = n.forecast?.days || []; return `- [${t.name}](/places/${t.id}/): now ${showMd(n.station?.reading?.temp_c, '°C')}, today ${showMd(f[0]?.t_max_c, '°C')}/${showMd(f[0]?.t_min_c, '°C')}, fire risk ${n.fire_risk?.days?.[0]?.level || '?'}; highest ${f.map(d => showMd(d.t_max_c, '°')).join(', ')}`; }).join('\n')}\n`;
  const css = `
.design-c .c-head h1{margin:.2rem 0 .4rem}
.design-c .c-src,.design-c .c-src a{font-size:.82rem;color:var(--muted)}
.design-c .c-warn{font-size:.95rem;margin:.2rem 0 1rem}
.design-c .c-grid,.design-c .c-multi{list-style:none;margin:.6rem 0;padding:0;display:grid;gap:.5rem}
.design-c .c-grid{grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))}
.design-c .c-pick{display:block;text-decoration:none;background:var(--panel);border:1px solid var(--rule);border-left:4px solid var(--red);padding:.45rem .7rem;height:100%}
.design-c .c-pick:hover{background:color-mix(in srgb,var(--red) 8%,var(--panel))}
.design-c .c-name{display:block;font:600 1.15rem var(--serif)}
.design-c .c-line{display:block;font:13px/1.9 var(--mono);color:var(--muted)}
.design-c .c-multi{grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))}
.design-c .c-multi a{display:block;text-decoration:none;border-top:2px solid var(--ink);padding:.3rem .2rem}
.design-c .c-multi .c-name{font-size:.95rem;overflow-wrap:anywhere}
.design-c .c-multi svg{width:100%;height:auto;display:block}
.design-c .c-multi polyline{fill:none;stroke:var(--red);stroke-width:2}
.design-c .c-multi circle{fill:var(--red)}
.design-c .c-range{font:12px var(--mono);color:var(--muted)}
@media (max-width:480px){.design-c .c-grid{grid-template-columns:1fr}.design-c .c-multi{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  return { name: 'Your town', description: 'A place picker with each town\'s now, today and fire risk in one line, then five-day small multiples of highest temperature.', by: 'weather.design@PrompTugal.dinis', body, md, css };
}
