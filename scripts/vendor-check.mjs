// The pieces this site copies from promptugal.news, checked against the pins in its registry (security@'s ruling,
// 19 Nov 2026: compare each file's sha256 with the registry's integrity string at build; copy no pin into code).
// The registry is promptugal.news/api/v1/sites.json, copied to data/sites.json by scripts/sync-data.mjs, which keeps
// every version's pin (bar.versions, obs_tz.versions: append-only, conductor.b@, 07:15 UTC).
//  - our version listed, bytes match: on;
//  - our version no longer listed: off, never shipped unchecked, logged as "<piece> <version> off: the registry names <newer>";
//  - our version listed, bytes differ: the build stops.
// weather.b@PrompTugal.dinis. Code: Apache-2.0.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const VENDORED = {
  'sites bar': { key: 'bar', version: '1.2.0', files: { render: 'scripts/vendor/sites-bar/1.2.0/sites-bar-render.mjs', css: 'src/assets/sites-bar/1.2.0/sites-bar.css', js: 'src/assets/sites-bar/1.2.0/sites-bar.js' } },
  'time-zone table': { key: 'obs_tz', version: '1.1.0', files: { integrity: 'src/assets/obs/tz-country.json' } },
};
export const SRI = /^sha(256|384|512)-[A-Za-z0-9+/]{43,86}={0,2}$/;
const sri = (alg, bytes) => `sha${alg}-` + createHash(`sha${alg}`).update(bytes).digest('base64');

// Returns { '<piece>': { on, version, note } }; throws when a listed version's bytes differ.
export function checkVendored(reg, read = (f) => readFileSync(f), pieces = VENDORED) {
  const out = {};
  for (const [name, p] of Object.entries(pieces)) {
    const block = reg && typeof reg === 'object' ? reg[p.key] : null;
    const pins = block && block.versions && Object.prototype.hasOwnProperty.call(block.versions, p.version) ? block.versions[p.version] : null;
    if (!pins || typeof pins !== 'object') {
      const newer = block && typeof block.version === 'string' ? block.version.slice(0, 20) : 'no version';
      out[name] = { on: false, version: p.version, note: `${name} ${p.version} off: the registry names ${newer}` };
      continue;
    }
    for (const [field, file] of Object.entries(p.files)) {
      const pin = pins[field];
      if (typeof pin !== 'string' || !SRI.test(pin)) throw new Error(`${name} ${p.version}: the registry's pin for ${field} is missing or not an SRI string; not building`);
      if (sri(pin.match(SRI)[1], read(file)) !== pin) throw new Error(`${file}: differs from ${name} ${p.version} as the registry pins it; not building`);
    }
    out[name] = { on: true, version: p.version, note: `${name} ${p.version}: matches the registry's pins` + (block.version !== p.version ? ` (the registry names ${String(block.version).slice(0, 20)} as current)` : '') };
  }
  return out;
}

export function vendoredState(path = 'data/sites.json') {
  let reg = null; try { reg = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null; } catch { }
  return checkVendored(reg);
}
