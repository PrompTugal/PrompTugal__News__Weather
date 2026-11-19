#!/usr/bin/env node
// Tests for scripts/vendor-check.mjs (security@'s ruling, 19 Nov 2026: a test for each rule). The pins here are
// computed at run time from made-up bytes. weather.b@PrompTugal.dinis. Code: Apache-2.0.
import { createHash } from 'node:crypto';
import { checkVendored } from './vendor-check.mjs';

const files = { a: Buffer.from('file a'), b: Buffer.from('file b') };
const read = (f) => files[f];
const pin = (buf) => 'sha256-' + createHash('sha256').update(buf).digest('base64');
const P = { piece: { key: 'k', version: '1.0.0', files: { x: 'a', y: 'b' } } };
const reg = (versions, version = '1.0.0') => ({ k: { version, versions } });
const good = { x: pin(files.a), y: pin(files.b) };
const results = [];
const t = (name, fn) => { try { results.push({ name, pass: fn() === true }); } catch (e) { results.push({ name, pass: false, got: e.message }); } };
const throws = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message); } };

t('listed, bytes match: on', () => checkVendored(reg({ '1.0.0': good }), read, P).piece.on === true);
t('listed with a newer current version: still on, and says so', () => { const r = checkVendored(reg({ '1.0.0': good, '1.1.0': good }, '1.1.0'), read, P).piece; return r.on && /names 1\.1\.0 as current/.test(r.note); });
t('no longer listed: off, with the ruling\'s wording', () => { const r = checkVendored(reg({ '1.1.0': good }, '1.1.0'), read, P).piece; return r.on === false && r.note === 'piece 1.0.0 off: the registry names 1.1.0'; });
t('no registry: off', () => checkVendored(null, read, P).piece.on === false);
t('no versions block: off', () => checkVendored({ k: { version: '1.0.0' } }, read, P).piece.on === false);
t('"__proto__" is not a listed version', () => checkVendored(reg({}), read, { piece: { ...P.piece, version: '__proto__' } }).piece.on === false);
t('same version, different bytes: stops', () => throws(() => checkVendored(reg({ '1.0.0': { ...good, y: pin(Buffer.from('other')) } }), read, P), /differs from piece 1\.0\.0/));
t('a pin missing for one file: stops', () => throws(() => checkVendored(reg({ '1.0.0': { x: good.x } }), read, P), /missing or not an SRI/));
t('a pin that is not an SRI string: stops', () => throws(() => checkVendored(reg({ '1.0.0': { ...good, x: good.x.slice(7) } }), read, P), /missing or not an SRI/));
t('a part of a pin is not accepted', () => throws(() => checkVendored(reg({ '1.0.0': { ...good, x: good.x.slice(0, 30) } }), read, P), /missing or not an SRI/));
t('sha384 pins are checked with sha384', () => checkVendored(reg({ '1.0.0': { x: 'sha384-' + createHash('sha384').update(files.a).digest('base64'), y: good.y } }), read, P).piece.on === true);

for (const r of results) if (!r.pass) console.log(`FAIL  ${r.name}${r.got ? '  [' + r.got + ']' : ''}`);
const bad = results.filter((r) => !r.pass);
if (bad.length) { console.error(`test-vendor-check: ${bad.length} of ${results.length} failed`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
