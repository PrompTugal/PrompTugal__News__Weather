#!/usr/bin/env node
// Tests for scripts/vendor-check.mjs (security@'s rulings, 19 Nov 2026: a test for each rule; read both registry
// shapes). The pins here are computed at run time from made-up bytes. weather.b@PrompTugal.dinis. Code: Apache-2.0.
import { createHash } from 'node:crypto';
import { checkVendored } from './vendor-check.mjs';

const files = { a: Buffer.from('file a'), b: Buffer.from('file b'), t: Buffer.from('table') };
const read = (f) => files[f];
const pin = (buf) => 'sha256-' + createHash('sha256').update(buf).digest('base64');
const P = { piece: { key: 'k', version: '1.0.0', files: { x: 'a', y: 'b' } } };
const T = { table: { key: 'tz', version: '1.1.0', files: { 'tz-country.json': 't' }, single: true } };
const reg = (versions, version = '1.0.0') => ({ k: { version, versions } });
const good = { x: pin(files.a), y: pin(files.b) };
const results = [];
const t = (name, fn) => { try { results.push({ name, pass: fn() === true }); } catch (e) { results.push({ name, pass: false, got: e.message }); } };
const throws = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message); } };

// the bar's shapes
t('today\'s bar shape (versions[v] is the map), bytes match: on', () => checkVendored(reg({ '1.0.0': good }), read, P).piece.on === true);
t('the new shape (versions[v].integrity is the map), bytes match: on', () => checkVendored(reg({ '1.0.0': { integrity: good } }), read, P).piece.on === true);
t('the new shape, different bytes: stops', () => throws(() => checkVendored(reg({ '1.0.0': { integrity: { ...good, x: pin(Buffer.from('other')) } } }), read, P), /differs from piece 1\.0\.0/));
t('listed with a newer current version: still on, and says so', () => { const r = checkVendored(reg({ '1.0.0': good, '1.1.0': good }, '1.1.0'), read, P).piece; return r.on && /names 1\.1\.0 as current/.test(r.note); });
// off
t('no longer listed: off, with the ruling\'s wording', () => { const r = checkVendored(reg({ '1.1.0': good }, '1.1.0'), read, P).piece; return r.on === false && r.note === 'piece 1.0.0 off: the registry names 1.1.0'; });
t('registry unread: off, and says so', () => { const r = checkVendored(null, read, P).piece; return r.on === false && /could not be read/.test(r.note); });
t('no versions block: off', () => checkVendored({ k: { version: '1.0.0' } }, read, P).piece.on === false);
t('"__proto__" is not a listed version', () => checkVendored(reg({}), read, { piece: { ...P.piece, version: '__proto__' } }).piece.on === false);
// stops
t('same version, different bytes: stops', () => throws(() => checkVendored(reg({ '1.0.0': { ...good, y: pin(Buffer.from('other')) } }), read, P), /differs from piece 1\.0\.0/));
t('a pin missing for one file: stops', () => throws(() => checkVendored(reg({ '1.0.0': { x: good.x } }), read, P), /missing or not an SRI/));
t('a pin that is not an SRI string: stops', () => throws(() => checkVendored(reg({ '1.0.0': { ...good, x: good.x.slice(7) } }), read, P), /missing or not an SRI/));
t('a part of a pin is not accepted', () => throws(() => checkVendored(reg({ '1.0.0': { ...good, x: good.x.slice(0, 30) } }), read, P), /missing or not an SRI/));
t('sha384 pins are checked with sha384', () => checkVendored(reg({ '1.0.0': { x: 'sha384-' + createHash('sha384').update(files.a).digest('base64'), y: good.y } }), read, P).piece.on === true);
// the table's shapes
const treg = (entry) => ({ tz: { version: '1.1.0', versions: { '1.1.0': entry } } });
t('today\'s table shape ({ integrity: "<sri>" }): on', () => checkVendored(treg({ integrity: pin(files.t) }), read, T).table.on === true);
t('the new table shape ({ integrity: { <file>: "<sri>" } }): on', () => checkVendored(treg({ integrity: { 'tz-country.json': pin(files.t) } }), read, T).table.on === true);
t('the new table shape under another single key: on', () => checkVendored(treg({ integrity: { json: pin(files.t) } }), read, T).table.on === true);
t('the table, different bytes: stops', () => throws(() => checkVendored(treg({ integrity: pin(Buffer.from('x')) }), read, T), /differs/));
t('the table with two unnamed pins: stops (which one is not known)', () => throws(() => checkVendored(treg({ integrity: { a: pin(files.t), b: pin(files.t) } }), read, T), /missing or not an SRI/));

// the shared map (ptmap 1.0.0): the piece's paths read the vendored files, in the registry's integrity shape. No pins
// are written here (security@'s ruling): they are computed from the files; the real check is the live registry at build
import { VENDORED } from './vendor-check.mjs';
import { readFileSync } from 'node:fs';
const M = { 'shared map': VENDORED['shared map'] };
const mreg = (integrity) => ({ map: { version: '1.0.0', versions: { '1.0.0': { integrity } } } });
const p384 = (f) => 'sha384-' + createHash('sha384').update(readFileSync(f)).digest('base64');
const MPINS = Object.fromEntries(Object.entries(M['shared map'].files).map(([k, f]) => [k, p384(f)]));
t('the shared map: the vendored files, pinned: on', () => checkVendored(mreg(MPINS), (f) => readFileSync(f), M)['shared map'].on === true);
t('the shared map: one file changed: stops', () => throws(() => checkVendored(mreg(MPINS), (f) => f.endsWith('.css') ? Buffer.from('x') : readFileSync(f), M), /differs/));
t('the shared map: not listed (today\'s registry): off', () => checkVendored({ bar: {} }, (f) => readFileSync(f), M)['shared map'].on === false);

for (const r of results) if (!r.pass) console.log(`FAIL  ${r.name}${r.got ? '  [' + r.got + ']' : ''}`);
const bad = results.filter((r) => !r.pass);
if (bad.length) { console.error(`test-vendor-check: ${bad.length} of ${results.length} failed`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
