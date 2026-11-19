#!/usr/bin/env node
// Tests for scripts/leak-scan.mjs's key rules (security@'s ruling of 05:14 UTC, 19 Nov 2026: a test for each rule):
// every private-key header fails in every file, with no exemption; an OpenSSH public-key line of any type (ssh-ed25519,
// ssh-rsa, ssh-dss, ecdsa-sha2-nistp256/384/521, the sk- forms) is flagged outside keys[].ssh_signing.public_key in
// team/keys.json, including in another field of that file. Every key and header here is built at run time from parts,
// so this file holds none; the key bodies are random bytes, not keys. weather.b@PrompTugal.dinis. Code: Apache-2.0.
import { randomBytes } from 'node:crypto';
import { scanText } from './leak-scan.mjs';

const D = '-'.repeat(5), results = [];
const kinds = (path, text) => scanText(path, text).map((f) => f.kind);
const expect = (name, got, kind, present) => results.push({ name, pass: got.includes(kind) === present, got: got.join(', ') });
const body = () => 'AAAA' + randomBytes(48).toString('base64').replace(/=+$/, '');

// 1. private-key headers fail everywhere, team/keys.json included
for (const t of ['OPENSSH ', 'RSA ', 'EC ', 'DSA ', 'ENCRYPTED ', '']) {
  const block = `${D}BEGIN ${t}PRIVATE KEY${D}\n${randomBytes(30).toString('base64')}\n${D}END ${t}PRIVATE KEY${D}`;
  for (const path of ['README.md', 'team/keys.json', 'team/keys/x.json', 'src/assets/a.js'])
    expect(`private key header "${t}PRIVATE KEY" in ${path} fails`, kinds(path, block), 'private key block', true);
}
// 2. every OpenSSH public-key type, outside the published field
const TYPES = ['ssh-ed25519', 'ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'sk-ecdsa-sha2-nistp256@openssh.com', 'sk-ssh-ed25519@openssh.com'];
for (const t of TYPES) {
  const line = `${t} ${body()}`;
  expect(`${t} in a README fails`, kinds('README.md', `key: ${line} someone@host`), 'ssh public key outside its published field', true);
  expect(`${t} in team/keys.json under another field fails`, kinds('team/keys.json', JSON.stringify({ keys: [{ id: 'x', note: line }] }, null, 1)), 'ssh public key outside its published field', true);
  const ok = JSON.stringify({ keys: [{ id: 'x', ssh_signing: { public_key: line } }] }, null, 1);
  expect(`${t} as keys[].ssh_signing.public_key in team/keys.json passes`, kinds('team/keys.json', ok), 'ssh public key outside its published field', false);
  expect(`${t} as keys[].ssh_signing.public_key raises no other finding`, kinds('team/keys.json', ok), 'long high-entropy string', false);
  expect(`${t} in ssh_signing.public_key of another file fails`, kinds('board/keys.json', ok), 'ssh public key outside its published field', true);
}
// 3. a public-key value with anything else in the field is not allowed (the exact whole value only)
{ const v = `ssh-ed25519 ${body()} weather@host`; expect('a published key with a comment appended is flagged', kinds('team/keys.json', JSON.stringify({ keys: [{ ssh_signing: { public_key: v } }] }, null, 1)), 'ssh public key outside its published field', true); }
// 4. PEM public-key blocks: allowed in team/keys.json, flagged elsewhere
{ const pem = `${D}BEGIN PUBLIC KEY${D}\n${randomBytes(44).toString('base64')}\n${D}END PUBLIC KEY${D}`;
  expect('a PEM public key in team/keys.json passes', kinds('team/keys.json', pem), 'public key outside team/keys', false);
  expect('a PEM public key in a README fails', kinds('README.md', pem), 'public key outside team/keys', true); }

// 5. no exemption for pins (security@, 19 Nov 2026: the build reads them from the live registry): an SRI string fails
//    in data/sites.json as anywhere else, in either registry shape
{ const sri = () => 'sha256-' + randomBytes(32).toString('base64'), HE = 'long high-entropy string';
  expect('a registry pin (today\'s shape) in data/sites.json fails', kinds('data/sites.json', JSON.stringify({ bar: { versions: { '1.2.0': { js: sri() } } } }, null, 1)), HE, true);
  expect('a registry pin (the new shape) in data/sites.json fails', kinds('data/sites.json', JSON.stringify({ obs_tz: { versions: { '1.1.0': { integrity: { 'tz-country.json': sri() } } } } }, null, 1)), HE, true);
  expect('a pin in a code file fails', kinds('scripts/build.mjs', `const PIN = '${sri()}';`), HE, true); }

for (const r of results) if (!r.pass) console.log(`FAIL  ${r.name}  [${r.got}]`);
const bad = results.filter((r) => !r.pass);
if (bad.length) { console.error(`test-leak-scan: ${bad.length} of ${results.length} failed`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
