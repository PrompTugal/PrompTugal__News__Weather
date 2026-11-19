// Official live cameras, by link only (Dinis, 18 Nov 2026, about 19:00 UTC, kept in the Website repo's
// board/guidance/2026-11-18-cameras-provenance-and-bulletins.md: "official cameras only, embeds only, and of course
// your link, never record"). The list is data.promptugal.news's cams source (data.b@'s register/cams.json), copied to
// data/api/cams.json. This site shows each camera as a link to its operator's page: no iframe, image, frame or
// stream, and nothing is fetched from a camera host by the build or the browser. No operator has published embed
// terms we have read, so there is no embed. weather.b@PrompTugal.dinis, 18 Nov 2026. Code: Apache-2.0.
// Security pre-review (Sonnet, 22:25 UTC): links only from the fields below, https, and an allowlisted host; text
// escaped and capped; "the operator's page answered", never "live" or "working".

const esc = (s) => String(s ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const txt = (v, n = 300) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
const mdt = (v, n) => txt(v, n).replace(/[\[\]<>|`]/g, '');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const utc = (iso) => { const d = new Date(typeof iso === 'string' ? iso : NaN); return isNaN(+d) ? 'unknown time' : `${d.getUTCDate()} ${MON[d.getUTCMonth()]}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`; };

// The hosts a camera link may go to. A camera whose page is on any other host is left out (and counted).
const HOSTS = ['www.portodelisboa.pt', 'portodelisboa.pt', 'meteorologia.aemtg.pt', 'beachcam.meo.pt', 'www.skylinewebcams.com', 'github.com', 'data.promptugal.news'];
export function camUrl(u) {
  if (typeof u !== 'string' || u.length > 500) return null;
  let p; try { p = new URL(u); } catch { return null; }
  if (p.protocol !== 'https:' || p.username || p.password || p.port || !HOSTS.includes(p.hostname)) return null;
  return p.href;
}
export const camHref = (u) => { const v = camUrl(u); return v ? esc(v) : null; };
const link = (u, text) => { const h = camHref(u); return h ? `<a href="${h}" rel="noopener noreferrer external">${esc(text)}</a>` : esc(text); };
const SOURCE_PAGE = 'https://data.promptugal.news/sources/cams/';

export function camList(api) {
  const j = api?.cams;
  const all = Array.isArray(j?.cameras) ? j.cameras.slice(0, 100) : [];
  const ok = all.filter((c) => c && typeof c.id === 'string' && /^[a-z0-9-]{1,80}$/.test(c.id) && typeof c.place === 'string' && txt(c.name) && camHref(c.page));
  return { j, cams: ok, left_out: all.length - ok.length };
}

function state(c) {
  if (c.state === 'up') return { cls: 'ok', text: `The operator's page answered when checked, ${utc(c.checked_at)}.` };
  if (c.state === 'down') return { cls: 'down', text: `The operator's page did not answer when checked, ${utc(c.checked_at)}.` };
  if (isMeo(c)) return { cls: 'na', text: 'Not checked: MEO BeachCam\'s site refused our data site\'s requests, so whether its page answers is not known.' };
  return { cls: 'na', text: `Not checked: ${txt(c.check_note, 240) || 'no check recorded.'}` };
}
const isMeo = (c) => { try { return new URL(c.page).hostname === 'beachcam.meo.pt'; } catch { return false; } };

function item(c, withPlace) {
  const s = state(c), p = c.provenance || {};
  return `<li class="cam"><p><strong>${link(c.page, txt(c.name))}</strong>${withPlace ? ` <span class="src">(${esc(txt(c.municipality, 80))})</span>` : ''}<br><span class="src">${esc(txt(c.operator, 120))}</span></p>
<p class="cam-state ${s.cls}">${esc(s.text)}</p>
<p class="src">Terms: ${link(c.terms_page, "the operator's terms")}${txt(c.terms_summary) ? ` (${esc(txt(c.terms_summary, 240))})` : ''}. Listed from ${link(p.listed_from, "the operator's page")} by ${esc(txt(p.listed_by, 120))}, ${esc(utc(p.listed_at))}; in ${link(p.register, 'the camera register')}.</p></li>`;
}
// in markdown, a URL keeps no character that could open a link, tag or table cell
const mdUrl = (u) => { const v = camUrl(u); return v && v.replace(/[\[\]()<>|`*_]/g, (ch) => '%' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')); };
const mdItem = (c) => `- ${mdt(c.name)} (${mdt(c.operator, 120)}): ${mdUrl(c.page) || ''}. ${state(c).text.replace(/[\[\]<>|`]/g, '')} Terms: ${mdUrl(c.terms_page) || 'not given'}.`;

const MEO_NOTE = 'MEO BeachCam\'s terms (section 1) need MEO\'s prior, express authorisation before a third-party site shows its live streams, so its cameras are credited links only. Its site refused our data site\'s checks, so whether a page answers is not known; viewing some cameras there may need a subscription.';
const meoNote = (list) => (list.some(isMeo) ? `<p class="src">${esc(MEO_NOTE)}</p>` : '');
const NOTE = 'Each link opens the operator\'s own page. This site shows in full only what it has full right to use (an open licence or the owner\'s written permission: Dinis, 19 Nov 2026), and no camera here has that, so every camera is a credited link. It never shows, fetches, records or re-hosts a frame or stream, and only data.promptugal.news checks whether the operator\'s page answers. Take-down on request.';

// The section on a place page, or null when no camera is listed for the place.
export function camsSection(api, placeId) {
  const { j, cams } = camList(api);
  const here = cams.filter((c) => c.place === placeId);
  if (!here.length) return null;
  const html = `<section class="panel cams" id="cameras"><h2>Live cameras (official, by link)</h2>
<p class="note">${esc(NOTE)}</p>
${meoNote(here)}<ul class="cam-list">${here.map((c) => item(c, true)).join('')}</ul>
<p class="src">List: <a href="${SOURCE_PAGE}">data.promptugal.news's cameras</a>, read ${esc(utc(j.read_at))}; all cameras on <a href="/cameras/">/cameras/</a>.</p></section>`;
  const md = `## Live cameras (official, by link)\n\n${NOTE}${here.some(isMeo) ? ' ' + MEO_NOTE : ''}\n\n${here.map(mdItem).join('\n')}\n\nList: ${SOURCE_PAGE}, read ${utc(j.read_at)}.\n\n`;
  return { html, md };
}

// The /cameras/ page.
export function camerasPage(api, placeName) {
  const { j, cams, left_out } = camList(api);
  const places = [...new Set(cams.map((c) => c.place))];
  const counts = { up: cams.filter((c) => c.state === 'up').length, down: cams.filter((c) => c.state === 'down').length };
  counts.na = cams.length - counts.up - counts.down;
  const gaps = Array.isArray(j?.gaps) ? j.gaps.slice(0, 30).filter((g) => g && txt(g.host) && txt(g.reason)) : [];
  const body = `<h1>Live cameras</h1>
<p class="standfirst">Official cameras in the places this site covers, each a link to its operator's own page. ${cams.length} cameras in ${places.length} places: ${counts.up} with the operator's page answering, ${counts.down} not answering, ${counts.na} not checked.</p>
<p class="note">${esc(NOTE)} Nothing is embedded here: MEO BeachCam's terms need its express authorisation, and SkylineWebcams' terms need written permission for journalistic use (Dinis, 19 Nov 2026, about 17:40 UTC: credited links; never re-hosted).</p>
${meoNote(cams)}
${places.map((p) => `<section><h2>${placeName(p) ? `<a href="/places/${esc(p)}/">${esc(placeName(p))}</a>` : esc(p)}</h2><ul class="cam-list">${cams.filter((c) => c.place === p).map((c) => item(c, true)).join('')}</ul></section>`).join('\n')}
${gaps.length ? `<section><h2>What the list does not cover yet</h2><p>As recorded by data.promptugal.news (each refusal is respected, not worked around):</p><ul>${gaps.map((g) => `<li><strong>${esc(txt(g.host, 200))}</strong>: ${esc(txt(g.reason, 400))}</li>`).join('')}</ul></section>` : ''}
<section><h2>Where this comes from</h2><p><a href="${SOURCE_PAGE}">data.promptugal.news's cameras source</a> (data.b@PrompTugal.dinis), read ${esc(utc(j?.read_at))}; each camera's terms and licence are its operator's.${left_out ? ` ${left_out} listed camera${left_out === 1 ? ' is' : 's are'} left out here: no https page on a known operator host.` : ''}</p></section>`;
  const md = `${cams.length} official cameras in ${places.length} places, each a link to its operator's page. ${NOTE} ${MEO_NOTE}\n\n${places.map((p) => `## ${mdt(placeName(p) || p, 80)}\n\n${cams.filter((c) => c.place === p).map(mdItem).join('\n')}`).join('\n\n')}\n\n${gaps.length ? `## What the list does not cover yet\n\n${gaps.map((g) => `- ${mdt(g.host, 200)}: ${mdt(g.reason, 400)}`).join('\n')}\n\n` : ''}Source: ${SOURCE_PAGE}, read ${utc(j?.read_at)}.\n`;
  return { body, md, count: cams.length };
}

export const CAMS_CSS = `.cam-list{list-style:none;padding:0;margin:0;display:grid;gap:.8rem}.cam p{margin:.2rem 0}.cam{border-left:3px solid var(--rule);padding-left:.7rem}.cam-state{font-size:.92rem}.cam-state.ok{color:var(--green)}.cam-state.na{color:var(--muted)}`;
