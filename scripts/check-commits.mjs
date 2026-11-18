// ACC-015: every non-merge commit a push adds to dev must carry a readable Agent: trailer,
// read the way git reads it: git log --format=%(trailers:key=Agent,valueonly).
// Usage: node scripts/check-commits.mjs <before> <after>   (the pushed range, before..after)
// Commits older than this check are skipped: those that neither descend from the commit
// that added this file nor were committed after it. History is not rewritten (ACC-015).
// Prints OK or lists each commit that fails and exits 1.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const tryGit = (...args) => { try { return git(...args); } catch { return null; } };
const lines = (s) => (s ? s.split('\n').filter(Boolean) : []);

const [beforeArg, afterArg] = process.argv.slice(2);
const after = afterArg || 'HEAD';
if (!tryGit('rev-parse', '--verify', '--quiet', `${after}^{commit}`)) { console.error(`check-commits: unknown commit ${after}`); process.exit(1); }

const first = lines(git('log', '--format=%H', '--diff-filter=A', '--reverse', after, '--', 'scripts/check-commits.mjs'))[0];
if (!first) { console.error('check-commits: cannot find the commit that added scripts/check-commits.mjs'); process.exit(1); }
const firstTime = Number(git('log', '-1', '--format=%ct', first));

// A new branch, a forced push or a manual run has no usable "before": check everything since the check began.
const zero = /^0+$/;
const before = beforeArg && !zero.test(beforeArg) && tryGit('rev-parse', '--verify', '--quiet', `${beforeArg}^{commit}`);
const range = before ? [`${before}..${after}`] : [after];
const added = lines(git('rev-list', '--no-merges', ...range));
const descendants = new Set([first, ...lines(git('rev-list', '--ancestry-path', `${first}..${after}`))]);

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
const EX = 'scripts/commit-exemptions.json';
if (existsSync(EX)) {
  let list;
  try { list = JSON.parse(readFileSync(EX, 'utf8')); } catch (e) { console.error(`${EX}: not JSON (${e.message})`); process.exit(1); }
  if (!Array.isArray(list)) { console.error(`${EX}: must be a list`); process.exit(1); }
  for (const x of list) {
    if (!x || !/^[0-9a-f]{40}$/.test(x.commit || '') || !(x.reason || '').trim() || !(x.approved_by || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(x.date || '')) {
      console.error(`${EX}: each entry needs a full 40-hex commit, a reason, approved_by and a date`); process.exit(1);
    }
    exempt.set(x.commit, x);
  }
}
const errors = [];
let checked = 0, exempted = 0;
for (const c of added) {
  const ct = Number(git('log', '-1', '--format=%ct', c));
  if (!descendants.has(c) && ct < firstTime) continue;
  if (exempt.has(c)) { exempted++; continue; }
  checked++;
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
console.log(`OK (${checked} commits checked, ${exempted} exempted, ${added.length - checked - exempted} older than the check skipped)`);
