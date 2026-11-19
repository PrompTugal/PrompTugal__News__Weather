// ACC-015: every commit a push adds to dev, merges included, must carry a readable Agent: trailer,
// read the way git reads it: git log --format=%(trailers:key=Agent,valueonly).
// Usage: node scripts/check-commits.mjs <before> <after>   (the pushed range, before..after)
// Skips (security@'s rulings of 19 Nov 2026, relayed by conductor.b@ at 14:07 and 14:08 UTC, controls 6 and 8):
// a commit is skipped only when it is an ancestor of the trusted base below (git merge-base --is-ancestor),
// never by what a tree holds or by a commit's date (a date can be set to anything). Every commit with no parent
// (an orphan, including one brought in by merging an unrelated history) fails, except the trusted base itself.
// A shallow checkout fails, since ancestry cannot be decided in one. The base is pinned here by its full id and
// is not read from the environment. History is not rewritten (ACC-015). Prints OK or lists each failure, exits 1.
export const TRUSTED_BASE = 'd20148e9cf87cf239498b86c971c2e44db2e9102'; // v0.1.48, released 19 Nov 2026 13:21 UTC; every commit up to it passed this check in CI
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryGit = (...args) => { try { return git(...args); } catch { return null; } };
const lines = (s) => (s ? s.split('\n').filter(Boolean) : []);

// <before> is accepted for the workflow's sake and ignored: the range is always from the trusted base, so no tag,
// "before" or forced push can hide a commit (Sonnet security post-review, 19 Nov 2026, finding 1).
const [, afterArg] = process.argv.slice(2);
const after = /^[0-9A-Za-z._\/~^-]{1,200}$/.test(afterArg || 'HEAD') && !String(afterArg || '').startsWith('-') ? tryGit('rev-parse', '--verify', '--quiet', '--end-of-options', `${afterArg || 'HEAD'}^{commit}`) : null;
if (!after) { console.error(`check-commits: unknown commit ${String(afterArg).slice(0, 80)}`); process.exit(1); }

if (tryGit('rev-parse', '--is-shallow-repository') !== 'false') { console.error('check-commits: a shallow (or unreadable) checkout; ancestry cannot be decided, so nothing is checked: FAILED'); process.exit(1); }
if (!tryGit('rev-parse', '--verify', '--quiet', `${TRUSTED_BASE}^{commit}`)) { console.error(`check-commits: the trusted base ${TRUSTED_BASE} is not in this repository: FAILED`); process.exit(1); }
const isAncestorOfBase = (c) => { try { execFileSync('git', ['merge-base', '--is-ancestor', c, TRUSTED_BASE], { stdio: 'ignore' }); return true; } catch { return false; } };

const added = lines(git('rev-list', after, '--not', TRUSTED_BASE));

// A role may be dotted, role.speciality (Dinis, 16 Nov 2026: "we definitely should allow dots because that's our terminology").
// PrompTugal agents sign as role@PrompTugal.dinis (Dinis, 18 Nov 2026, kept by conductor.b@ in
// PrompTugal__News__Website board/guidance/2026-11-18-five-sites-on-account-b.md: "In each of the five
// repos, the commit check accepts @PrompTugal.dinis agents"). Only that one address is added.
const agentShape = /^[a-z0-9]+(?:[.-][a-z0-9]+)*@(?:agenticcells\.[a-z0-9][a-z0-9.-]*|promptugal\.dinis)$/i;
// Exemptions (specialist.code@, 2026-11-16). CI checks from the last release tag, so one failing commit
// would block every later release, and history is never rewritten. A person may exempt that one commit in
// scripts/commit-exemptions.json: [{ "commit": "<full 40-hex sha>", "reason": "...", "approved_by": "Dinis Cruz",
// "date": "YYYY-MM-DD" }]. Each entry names exactly one commit; malformed entries fail the check.
const exempt = new Map();
// read from the trusted base's tree only, never the pushed one: a push cannot exempt its own commits (finding 2)
const EX = 'scripts/commit-exemptions.json';
const exText = tryGit('show', `${TRUSTED_BASE}:${EX}`);
if (exText) {
  let list;
  try { list = JSON.parse(exText); } catch (e) { console.error(`${EX}: not JSON (${e.message})`); process.exit(1); }
  if (!Array.isArray(list)) { console.error(`${EX}: must be a list`); process.exit(1); }
  for (const x of list) {
    if (!x || !/^[0-9a-f]{40}$/.test(x.commit || '') || !(x.reason || '').trim() || !(x.approved_by || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(x.date || '')) {
      console.error(`${EX}: each entry needs a full 40-hex commit, a reason, approved_by and a date`); process.exit(1);
    }
    exempt.set(x.commit, x);
  }
}
// Control 10 (security@ ed70bd996, relayed by conductor.b@ at 16:50 UTC): no commit after the base may add or change a
// symbolic link (mode 120000), checked per commit with git diff-tree, not only in the final tree. The only exceptions
// are paths listed, each with a reason, in scripts/symlink-exceptions.json in the trusted base's own tree.
const SYMLINK_EX = (() => { const t = tryGit('show', `${TRUSTED_BASE}:scripts/symlink-exceptions.json`); if (!t) return new Set(); try { const l = JSON.parse(t); return new Set((Array.isArray(l) ? l : []).filter((x) => x && typeof x.path === 'string' && typeof x.reason === 'string' && x.reason.trim()).map((x) => x.path)); } catch { console.error('scripts/symlink-exceptions.json in the trusted base: not JSON: FAILED'); process.exit(1); } })();
// read diff-tree -z output as NUL-separated fields and compare whole paths, never line by line (events.b@'s finding,
// relayed 16:57 UTC: a name containing a newline must not be cut short)
const symlinksIn = (c) => {
  const f = execFileSync('git', ['diff-tree', '-r', '--raw', '--no-commit-id', '--root', '-m', '-z', c], { maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').split('\0');
  const out = [];
  for (let k = 0; k < f.length; k++) {
    const m = /^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ ([A-Z])\d*$/.exec(f[k]); if (!m) continue;
    const paths = m[3] === 'R' || m[3] === 'C' ? [f[k + 1], f[k + 2]] : [f[k + 1]];
    k += paths.length;
    if (m[2] === '120000') out.push(paths[paths.length - 1]);
  }
  return out;
};
const errors = [];
let checked = 0, exempted = 0;
for (const c of added) {
  if (c === TRUSTED_BASE || isAncestorOfBase(c)) continue;
  checked++;
  if (!lines(git('log', '-1', '--format=%P', c)).join(' ').trim()) { errors.push(`${c.slice(0, 7)}: a commit with no parent (an orphan) after the trusted base: refused`); continue; }
  for (const l of symlinksIn(c)) if (!SYMLINK_EX.has(l)) errors.push(`${c.slice(0, 7)}: adds or changes a symbolic link (${l.slice(0, 120)}): refused (control 10)`);
  if (exempt.has(c)) { exempted++; checked--; continue; }
  const agents = lines(git('log', '-1', '--format=%(trailers:key=Agent,valueonly)', c)).map((s) => s.trim());
  const subject = git('log', '-1', '--format=%s', c);
  if (!agents.length) errors.push(`${c.slice(0, 7)} ${subject}: no readable Agent: trailer (it must sit in the final trailer block)`);
  else if (!agents.every((a) => agentShape.test(a))) errors.push(`${c.slice(0, 7)} ${subject}: Agent: trailer is not role@agenticcells.person or role@PrompTugal.dinis (${agents.join(', ')})`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`FAILED (${errors.length} of ${checked} commits checked)`);
  process.exit(1);
}
console.log(`OK (${checked} commits checked, ${exempted} exempted, ${added.length - checked - exempted} at or before the trusted base skipped)`);
