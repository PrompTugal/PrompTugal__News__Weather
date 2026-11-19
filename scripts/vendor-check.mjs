// The pieces this site copies from promptugal.news, checked against the pins in its live registry at each build
// (security@'s rulings, 19 Nov 2026: compare each file's sha256 with the registry's full integrity string; copy no pin
// into code; until dev@ reshapes the registry, read it live, with no leak-scan exemption, and read both shapes).
// Registry shapes read (conductor.b@, 07:19 UTC):
//   bar.versions["<v>"] = { js, css, render }                 (today)
//   obs_tz.versions["<v>"] = { integrity }                    (today)
//   <piece>.versions["<v>"].integrity = { <file>: ... }       (the shape both are moving to)
// Rules: our version listed and the bytes match: on. Our version not listed (or the registry unread): off, never shipped
// unchecked, logged as "<piece> <version> off: the registry names <newer>". Listed but the bytes differ: the build stops.
// weather.b@PrompTugal.dinis. Code: Apache-2.0.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const REGISTRY = 'https://promptugal.news/api/v1/sites.json';
export const VENDORED = {
  'sites bar': { key: 'bar', version: '1.2.1', files: { render: 'scripts/vendor/sites-bar/1.2.1/sites-bar-render.mjs', css: 'src/assets/sites-bar/1.2.1/sites-bar.css', js: 'src/assets/sites-bar/1.2.1/sites-bar.js' } },
  // the shared map (designer@'s ptmap; Dinis, 19 Nov 2026, about 17:40 UTC; security@'s go, b5fc4fdef): pinned sha384
  'shared map': { key: 'map', version: '1.0.2', files: { 'ptmap.js': 'src/assets/ptmap/1.0.2/ptmap.js', 'ptmap.css': 'src/assets/ptmap/1.0.2/ptmap.css' } },
  'time-zone table': { key: 'obs_tz', version: '1.1.0', files: { 'tz-country.json': 'src/assets/obs/tz-country.json' }, single: true },
};
export const SRI = /^sha(256|384|512)-[A-Za-z0-9+/]{43,86}={0,2}$/;
const own = (o, k) => o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
const sri = (alg, bytes) => `sha${alg}-` + createHash(`sha${alg}`).update(bytes).digest('base64');

// The pin for one file of a listed version, in either shape, or undefined.
function pinFor(entry, field, single) {
  const m = own(entry, 'integrity') ? entry.integrity : entry;
  if (typeof m === 'string') return single ? m : undefined; // obs_tz today: { integrity: "<sri>" }
  if (!m || typeof m !== 'object') return undefined;
  if (own(m, field)) return m[field];
  if (single) { const vals = Object.values(m); return vals.length === 1 ? vals[0] : undefined; } // one file, whatever its key
  return undefined;
}

// Returns { '<piece>': { on, version, note } }; throws when a listed version's bytes differ.
export function checkVendored(reg, read = (f) => readFileSync(f), pieces = VENDORED) {
  const out = {};
  for (const [name, p] of Object.entries(pieces)) {
    const block = own(reg, p.key) ? reg[p.key] : null;
    const entry = block && own(block.versions, p.version) ? block.versions[p.version] : null;
    if (!entry || typeof entry !== 'object') {
      const newer = !reg ? 'nothing (it could not be read)' : block && typeof block.version === 'string' ? block.version.slice(0, 20) : 'no version';
      out[name] = { on: false, version: p.version, note: `${name} ${p.version} off: the registry names ${newer}` };
      continue;
    }
    for (const [field, file] of Object.entries(p.files)) {
      const pin = pinFor(entry, field, p.single);
      if (typeof pin !== 'string' || !SRI.test(pin)) throw new Error(`${name} ${p.version}: the registry's pin for ${field} is missing or not an SRI string; not building`);
      if (sri(pin.match(SRI)[1], read(file)) !== pin) throw new Error(`${file}: differs from ${name} ${p.version} as the registry pins it; not building`);
    }
    out[name] = { on: true, version: p.version, note: `${name} ${p.version}: matches the registry's pins` + (block.version !== p.version ? ` (the registry names ${String(block.version).slice(0, 20)} as current)` : '') };
  }
  return out;
}

// The live registry, or null. Same host only, capped, three tries of 20 s.
export async function readRegistry(url = REGISTRY) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'weather.promptugal.news build' } });
      if (!r.ok || new URL(r.url).host !== new URL(url).host) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.byteLength > 1024 * 1024) return null;
      return JSON.parse(buf.toString('utf8'));
    } catch { }
  }
  return null;
}

// What the page generator reads: the state build.mjs worked out, passed in VENDOR_STATE; with none, everything is off.
export const vendorState = () => { try { return JSON.parse(process.env.VENDOR_STATE || '{}'); } catch { return {}; } };
