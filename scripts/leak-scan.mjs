// The leak scan. Must print OK before every commit and in the Pages workflow.
// Node built-ins only. Written by security@agenticcells.dinis, 2026-11-15.
// Site template version (factory@AgentiCCells.dinis, 2026-11-16): scans _site/ instead
// of site/, skips the vault's ciphertext under .sg_vault/bare/, fails on any tracked
// file from .sg_vault/local/, and fails if this checkout's own vault key or token
// appears anywhere (the last two from the site repositories made by sites@).
//
// Scans every file git knows about (tracked, plus untracked files that are not
// ignored, so a new file is caught before its first commit) and the built _site/.
// It looks for secret shapes and reports the file, the line and the kind of
// shape. It never prints the matched text: a finding is described, never quoted.
//
// Usage:
//   node scripts/leak-scan.mjs            scan the working tree and _site/
//   node scripts/leak-scan.mjs --history    scan every commit reachable in this
//                                         clone (git log -p --all); fetch more
//                                         history first in a shallow clone
//
// Public keys are allowed only in team/keys.json and team/keys/*.json, and only
// when those files hold no private part. Any change to the allowlist below must
// be narrow (one path, one kind) and say why.
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Built from parts so that this file does not match its own patterns.
const DASHES = '-'.repeat(5);
const PRIVATE_BLOCK = new RegExp(`${DASHES}BEGIN [A-Z0-9 ]*PRIVATE KEY( BLOCK)?${DASHES}`);
const PUBLIC_BLOCK = new RegExp(`${DASHES}BEGIN (?:RSA |EC )?PUBLIC KEY${DASHES}[\\s\\S]*?${DASHES}END (?:RSA |EC )?PUBLIC KEY${DASHES}`, 'g');
// An OpenSSH public-key line, of every type (security@'s ruling of 05:14 UTC, 19 Nov 2026; library.b@'s LIB-2026-060:
// ecdsa-sha2-* and the sk- forms do not begin "ssh-"). Allowed only as the exact value of a keys[].ssh_signing.public_key
// field in team/keys.json; flagged everywhere else, including any other field of that file.
const SSH_KEY_TYPES = 'ssh-ed25519|ssh-rsa|ssh-dss|ecdsa-sha2-nistp(?:256|384|521)|sk-ecdsa-sha2-nistp256@openssh\\.com|sk-ssh-ed25519@openssh\\.com';
const SSH_PUBLIC_LINE = new RegExp(`(?:^|[^A-Za-z0-9@.-])(?:${SSH_KEY_TYPES})\\s+AAAA[A-Za-z0-9+/]{16,}`);
const SSH_PUBLIC_VALUE = new RegExp(`^(?:${SSH_KEY_TYPES}) AAAA[A-Za-z0-9+/]{16,}={0,3}$`);
const PUBLIC_BEGIN = new RegExp(`${DASHES}BEGIN (?:RSA |EC |PGP )?PUBLIC KEY( BLOCK)?${DASHES}`);

// Exact shapes: [kind, regex]. Order matters only for the report.
const SHAPES = [
  ['private key block', PRIVATE_BLOCK],
  ['AWS access key id', /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA)[0-9A-Z]{16}\b/],
  ['AWS secret access key assignment', /aws_?secret_?(?:access_?)?key\s*["']?\s*[:=]\s*["']?[A-Za-z0-9\/+]{40}(?![A-Za-z0-9\/+])/i],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{22,}/],
  ['sgit vault or read key', /\bsgit_(?:private_vault|private_read|vk1|rk1)_[A-Za-z0-9:]{8,}/],
  ['JSON Web Token', /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/],
  ['Google OAuth access token', /\bya29\.[A-Za-z0-9_-]{20,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Anthropic or OpenAI API key', /\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}/],
];

// sgit vault key without its prefix: {passphrase}:{vault_id}. sgit generates a
// 24-character lowercase alphanumeric passphrase and an 8-character vault id.
// The passphrase side must mix letters and digits and not be pure hex, so that
// "sha256:<fingerprint>" and "<commit>:<path>" do not count.
const VAULT_PAIR = /(?<![A-Za-z0-9_\/.-])([a-z0-9]{16,64}):([a-z0-9]{4,24})(?![A-Za-z0-9_\/.-])/g;
function vaultPair(line) {
  for (const m of line.matchAll(VAULT_PAIR)) {
    const p = m[1];
    if (/[a-z]/.test(p) && /[0-9]/.test(p) && !/^[0-9a-f]+$/.test(p)) return true;
  }
  return false;
}

// A secret-looking value assigned to a secret-looking name.
const ASSIGN = /\b(?:pass(?:word|phrase)|secret|token|api_?key|private_?key|access_?key)\w*["']?\s*[:=]\s*["']?([A-Za-z0-9\/+_=.-]{16,})/gi;

function entropy(s) {
  const n = {};
  for (const c of s) n[c] = (n[c] || 0) + 1;
  let h = 0;
  for (const k in n) { const p = n[k] / s.length; h -= p * Math.log2(p); }
  return h;
}

// Long high-entropy strings. Pure hex of 40 characters is a git object id and
// is allowed (pinned actions, commit references); longer hex is flagged.
const LONG = /[A-Za-z0-9+\/_-]{32,}={0,2}/g;
function highEntropy(line) {
  for (const m of line.matchAll(LONG)) {
    const s = m[0].replace(/=+$/, '');
    if (/^[0-9a-f]+$/i.test(s)) { if (s.length >= 48 && entropy(s) >= 3.5) return true; continue; }
    if (s.includes('/') && !/[+=]/.test(m[0]) && s.split('/').some((seg) => /^[a-z][a-z.-]*$/.test(seg))) continue; // a path or URL
    const classes = [/[a-z]/, /[A-Z]/, /[0-9]/].filter((r) => r.test(s)).length;
    if (classes >= 3 && entropy(s) >= 4.3) return true;
  }
  return false;
}

// Narrow allowlist: [path, kind, reason]. Keep each entry to one file and one kind.
const ALLOW = [
];
const allowed = (path, kind) => ALLOW.some(([p, k]) => p === path && k === kind);

// The registry copy's pins (security@'s ruling, 19 Nov 2026): in data/sites.json only, only the fields
// bar.versions.<v>.{js,css,render} and obs_tz.versions.<v>.integrity, only a whole value of exactly this shape.
const PIN_VALUE = /^sha(256|384|512)-[A-Za-z0-9+/]{43,86}={0,2}$/;
function registryPins(text) {
  const out = [];
  try {
    const j = JSON.parse(text);
    const take = (block, fields) => { const vs = block && block.versions; if (vs && typeof vs === 'object') for (const v of Object.values(vs)) if (v && typeof v === 'object') for (const f of fields) if (typeof v[f] === 'string' && PIN_VALUE.test(v[f])) out.push([f, v[f]]); };
    take(j && j.bar, ['js', 'css', 'render']); take(j && j.obs_tz, ['integrity']);
  } catch { }
  return out;
}

const PUBLIC_KEY_FILES = (p) => p === 'team/keys.json' || /^team\/keys\/[a-z0-9-]+\.json$/.test(p);

// Returns a list of {line, kind} for one file's text. Never returns the match.
export function scanText(path, text) {
  const found = [];
  const add = (line, kind) => { if (!allowed(path, kind)) found.push({ line, kind }); };
  let body = text;
  if (PUBLIC_KEY_FILES(path)) {
    if (/private|passphrase|secret|seed/i.test(text)) add(0, 'public key file mentions a private part');
    // Blank the allowed public key blocks, keeping line numbers.
    body = text.replace(PUBLIC_BLOCK, (b) => b.replace(/[^\n]/g, ' '));
    // Blank the exact values of keys[].ssh_signing.public_key (team/keys.json only), and nothing else.
    if (path === 'team/keys.json') {
      let vals = [];
      try { const j = JSON.parse(text); vals = (Array.isArray(j.keys) ? j.keys : []).map((k) => k && k.ssh_signing && k.ssh_signing.public_key).filter((v) => typeof v === 'string' && SSH_PUBLIC_VALUE.test(v)); } catch { }
      for (const v of vals) body = body.split('"public_key": ' + JSON.stringify(v)).join('"public_key": ' + JSON.stringify(v.replace(/./g, ' ')));
    }
  }
  if (path === 'data/sites.json') for (const [f, v] of registryPins(text)) body = body.split(`"${f}": ${JSON.stringify(v)}`).join(`"${f}": ${JSON.stringify(v.replace(/./g, ' '))}`);
  body.split('\n').forEach((line, i) => {
    const n = i + 1;
    for (const [kind, re] of SHAPES) if (re.test(line)) add(n, kind);
    if (PUBLIC_BEGIN.test(line)) add(n, 'public key outside team/keys');
    if (SSH_PUBLIC_LINE.test(line)) add(n, 'ssh public key outside its published field');
    if (vaultPair(line)) add(n, 'sgit vault key shape (passphrase:vault_id)');
    for (const m of line.matchAll(ASSIGN)) {
      const v = m[1];
      if (/[0-9]/.test(v) && /[A-Za-z]/.test(v) && entropy(v) >= 3.5) { add(n, 'secret-looking value assigned to a secret name'); break; }
    }
    if (highEntropy(line)) add(n, 'long high-entropy string');
  });
  return found;
}

function isBinary(buf) { return buf.subarray(0, 8000).includes(0); }

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function scanTree() {
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root })
    .toString().split('\0').filter(Boolean);
  const siteDir = join(root, '_site');
  if (!existsSync(join(siteDir, 'index.html'))) return { errors: ['_site/ is not built: run node scripts/build.mjs first'], count: 0 };
  const paths = [...new Set([...files, ...walk(siteDir).map((p) => p.slice(root.length + 1))])];
  const errors = [];
  let count = 0, skipped = 0;
  // The vault's own secrets, when this checkout holds them, must appear nowhere.
  const secrets = [];
  for (const k of ['.sg_vault/local/vault_key', '.sg_vault/local/token']) {
    const f = join(root, k);
    if (existsSync(f)) { const v = readFileSync(f, 'utf8').trim(); secrets.push(v, v.split(':')[0]); }
  }
  for (const p of paths) {
    if (p.startsWith('.sg_vault/local/')) { errors.push(`${p}: a file from .sg_vault/local/ is in the tree (it holds vault keys)`); continue; }
    if (p.startsWith('.sg_vault/bare/')) { skipped++; continue; } // ciphertext, protected by the vault key
    const full = join(root, p);
    if (!existsSync(full) || statSync(full).isDirectory()) continue; // deleted in the working tree
    const buf = readFileSync(full);
    if (isBinary(buf)) { skipped++; continue; }
    count++;
    const t = buf.toString('utf8');
    for (const f of scanText(p, t)) errors.push(`${p}:${f.line}: ${f.kind}`);
    for (const x of secrets) if (x && x.length >= 8 && t.includes(x)) errors.push(`${p}: holds this checkout's vault key or token`);
  }
  return { errors, count, skipped };
}

function scanHistory() {
  // Added lines only: a removed line was already caught when it was added.
  const log = execFileSync('git', ['log', '-p', '--all', '--no-color', '--no-ext-diff', '--format=commit %H'], { cwd: root, maxBuffer: 1 << 30 }).toString();
  const errors = [];
  let commit = '', file = '', commits = 0;
  const byFile = new Map(); // commit+file -> added lines
  const flush = () => {
    for (const [key, lines] of byFile) {
      const [c, f] = key.split('\t');
      const found = scanText(f, lines.join('\n'));
      for (const x of found) errors.push(`${c.slice(0, 7)} ${f}: ${x.kind}`);
    }
    byFile.clear();
  };
  for (const line of log.split('\n')) {
    if (line.startsWith('commit ')) { flush(); commit = line.slice(7); commits++; file = ''; continue; }
    if (line.startsWith('+++ ')) { file = line.startsWith('+++ b/') ? line.slice(6) : ''; continue; }
    if (file && line.startsWith('+')) {
      const k = `${commit}\t${file}`;
      if (!byFile.has(k)) byFile.set(k, []);
      byFile.get(k).push(line.slice(1));
    }
  }
  flush();
  return { errors: [...new Set(errors)], count: commits };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // The key rules' tests run first, so the scan that CI runs cannot pass with a broken rule (security@, 19 Nov 2026).
  try { execFileSync(process.execPath, [join(root, 'scripts/test-leak-scan.mjs')], { stdio: ['ignore', 'ignore', 'inherit'] }); }
  catch { console.error('leak-scan: its own rule tests failed (node scripts/test-leak-scan.mjs)'); process.exit(1); }
  const history = process.argv.includes('--history');
  const { errors, count, skipped } = history ? scanHistory() : scanTree();
  if (errors.length) {
    console.error(errors.join('\n'));
    console.error(`FAILED (${errors.length}) in ${count} ${history ? 'commits' : 'files'}`);
    process.exit(1);
  }
  console.log(history ? `OK (${count} commits)` : `OK (${count} files, ${skipped} binary skipped)`);
}
