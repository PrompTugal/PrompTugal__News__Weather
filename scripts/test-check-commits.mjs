#!/usr/bin/env node
// Tests for scripts/check-commits.mjs against security@'s controls 6 and 8 (19 Nov 2026, relayed by conductor.b@
// at 14:07 and 14:08 UTC). Each test builds a throwaway git repository, writes the checker into it with that
// repository's own base pinned (the checker takes no override), and asserts the reason it fails.
// weather.b@PrompTugal.dinis. Code: Apache-2.0.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SRC = readFileSync(new URL('./check-commits.mjs', import.meta.url), 'utf8');
const results = [];
const OK_MSG = 'work\n\nAgent: weather.b@PrompTugal.dinis\n';
function repo() {
  const d = mkdtempSync(join(tmpdir(), 'cc-test-'));
  const g = (...a) => execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', ...a], { cwd: d, encoding: 'utf8', env: { ...process.env, GIT_COMMITTER_DATE: process.env.GIT_COMMITTER_DATE || '' } }).trim();
  g('init', '-q', '-b', 'dev');
  mkdirSync(join(d, 'scripts'));
  writeFileSync(join(d, 'scripts/check-commits.mjs'), SRC); writeFileSync(join(d, 'seed.txt'), String(Math.random()));
  g('add', '.'); g('commit', '-q', '-m', 'base\n\nAgent: weather.b@PrompTugal.dinis\n');
  const base = g('rev-parse', 'HEAD');
  const pinned = SRC.replace(/export const TRUSTED_BASE = '[0-9a-f]{40}'/, `export const TRUSTED_BASE = '${base}'`);
  writeFileSync(join(d, 'checker.mjs'), pinned); // outside git's view of the test: a trusted copy, as CI should run it
  const commit = (file, msg, env = {}) => { writeFileSync(join(d, file), String(Math.random())); execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'add', '-A'], { cwd: d }); execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', msg], { cwd: d, env: { ...process.env, ...env } }); return g('rev-parse', 'HEAD'); };
  const run = (from = base, to = 'HEAD', cwd = d) => spawnSync(process.execPath, [join(d, 'checker.mjs'), from, to], { cwd, encoding: 'utf8' });
  return { d, g, base, commit, run };
}
const t = (name, fn) => { let r; try { r = fn(); results.push({ name, pass: r === true }); } catch (e) { results.push({ name, pass: false, got: e.message }); } };
const fails = (res, re) => res.status === 1 && re.test(res.stderr);

t('a commit with an Agent trailer after the base passes', () => { const r = repo(); r.commit('a.txt', OK_MSG); const x = r.run(); rmSync(r.d, { recursive: true }); return x.status === 0 && /1 commits checked/.test(x.stdout); });
t('a commit with no Agent trailer fails', () => { const r = repo(); r.commit('a.txt', 'no trailer'); const x = r.run(); rmSync(r.d, { recursive: true }); return fails(x, /no readable Agent/); });
t('a backdated commit is not skipped (no skip by date)', () => { const r = repo(); r.commit('a.txt', 'old, no trailer', { GIT_COMMITTER_DATE: '2000-01-01T00:00:00Z', GIT_AUTHOR_DATE: '2000-01-01T00:00:00Z' }); const x = r.run(); rmSync(r.d, { recursive: true }); return fails(x, /no readable Agent/); });
t('control 8: removing the checker and adding a change with no trailer fails', () => { const r = repo(); rmSync(join(r.d, 'scripts/check-commits.mjs')); r.commit('a.txt', 'remove the checker'); const x = r.run(); rmSync(r.d, { recursive: true }); return fails(x, /no readable Agent/); });
t('control 6: an orphan merged in from an unrelated history fails, even with a trailer', () => {
  const r = repo();
  r.g('checkout', '-q', '--orphan', 'other'); r.g('rm', '-rq', '--cached', '.');
  r.commit('o.txt', OK_MSG);
  r.g('checkout', '-q', '-f', 'dev');
  execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'merge', '-q', '--allow-unrelated-histories', '-m', OK_MSG, 'other'], { cwd: r.d });
  const x = r.run(); rmSync(r.d, { recursive: true }); return fails(x, /no parent \(an orphan\)/);
});
t('control 8: a backdated orphan merged in fails, whatever its date', () => {
  const r = repo();
  r.g('checkout', '-q', '--orphan', 'old'); r.g('rm', '-rq', '--cached', '.');
  r.commit('o.txt', OK_MSG, { GIT_COMMITTER_DATE: '2001-01-01T00:00:00Z', GIT_AUTHOR_DATE: '2001-01-01T00:00:00Z' });
  r.g('checkout', '-q', '-f', 'dev');
  execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'merge', '-q', '--allow-unrelated-histories', '-m', OK_MSG, 'old'], { cwd: r.d });
  const x = r.run(); rmSync(r.d, { recursive: true }); return fails(x, /no parent \(an orphan\)/);
});
t('a merge commit with no trailer fails (merges are checked)', () => {
  const r = repo();
  r.g('checkout', '-q', '-b', 'side'); r.commit('s.txt', OK_MSG); r.g('checkout', '-q', 'dev'); r.commit('m.txt', OK_MSG);
  execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'merge', '-q', '--no-ff', '-m', 'merge, no trailer', 'side'], { cwd: r.d });
  const x = r.run(); rmSync(r.d, { recursive: true }); return fails(x, /no readable Agent/);
});
t('a shallow checkout fails', () => {
  const r = repo(); r.commit('a.txt', OK_MSG); r.commit('b.txt', OK_MSG);
  const s = mkdtempSync(join(tmpdir(), 'cc-shallow-'));
  execFileSync('git', ['clone', '-q', '--depth', '1', `file://${r.d}`, s]);
  const x = spawnSync(process.execPath, [join(r.d, 'checker.mjs'), '', 'HEAD'], { cwd: s, encoding: 'utf8' });
  rmSync(r.d, { recursive: true }); rmSync(s, { recursive: true }); return fails(x, /shallow/);
});
t('a repository without the trusted base fails', () => { const r = repo(); const other = repo(); const x = spawnSync(process.execPath, [join(r.d, 'checker.mjs'), '', 'HEAD'], { cwd: other.d, encoding: 'utf8' }); rmSync(r.d, { recursive: true }); rmSync(other.d, { recursive: true }); return fails(x, /trusted base .* is not in this repository/); });
t('the base and its ancestors are skipped, not checked', () => { const r = repo(); const x = r.run('', 'HEAD'); rmSync(r.d, { recursive: true }); return x.status === 0 && /0 commits checked/.test(x.stdout); });
t('a "before" or tag on a bad commit does not hide it', () => { const r = repo(); const bad = r.commit('a.txt', 'no trailer'); r.g('tag', 'v0.1.99', bad); r.commit('b.txt', OK_MSG); const x = r.run(bad, 'HEAD'); const y = r.run('v0.1.99', 'HEAD'); rmSync(r.d, { recursive: true }); return fails(x, /no readable Agent/) && fails(y, /no readable Agent/); });
t('a commit from a dropped run (between the anchor and BEFORE) fails', () => { const r = repo(); r.commit('a.txt', 'dropped push, no trailer'); const before = r.commit('b.txt', OK_MSG); r.commit('c.txt', OK_MSG); const x = r.run(before, 'HEAD'); rmSync(r.d, { recursive: true }); return fails(x, /no readable Agent/); });
t('a tag on the pushed head itself does not empty the range', () => { const r = repo(); r.commit('a.txt', 'no trailer'); r.g('tag', 'v0.1.99'); const x = r.run('v0.1.99', 'v0.1.99'); rmSync(r.d, { recursive: true }); return fails(x, /no readable Agent/); });
t('a push cannot exempt its own commit', () => { const r = repo(); const bad = r.commit('a.txt', 'no trailer'); writeFileSync(join(r.d, 'scripts/commit-exemptions.json'), JSON.stringify([{ commit: bad, reason: 'x', approved_by: 'Dinis Cruz', date: '2026-11-19' }])); r.commit('c.txt', OK_MSG); const ex = JSON.parse(r.g('show', 'HEAD:scripts/commit-exemptions.json'))[0].commit === bad; const x = r.run(); rmSync(r.d, { recursive: true }); return ex && fails(x, /no readable Agent/); });
t('an option-looking commit argument is refused', () => { const r = repo(); const x = r.run('', '--all'); rmSync(r.d, { recursive: true }); return fails(x, /unknown commit/); });
t('control 10: a pushed symbolic link fails', () => { const r = repo(); symlinkSync('../etc/passwd', join(r.d, 'evil')); r.commit('a.txt', OK_MSG); const x = r.run(); rmSync(r.d, { recursive: true }); return fails(x, /symbolic link \(evil\)/); });
t('control 10: a link listed only in the pushed tree\'s exceptions fails', () => { const r = repo(); writeFileSync(join(r.d, 'scripts/symlink-exceptions.json'), JSON.stringify([{ path: 'evil', reason: 'x' }])); symlinkSync('x', join(r.d, 'evil')); r.commit('a.txt', OK_MSG); const x = r.run(); rmSync(r.d, { recursive: true }); return fails(x, /symbolic link \(evil\)/); });
t('control 10: a link listed in the trusted base\'s exceptions passes', () => {
  const d = mkdtempSync(join(tmpdir(), 'cc-test-')); const g = (...a) => execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', ...a], { cwd: d, encoding: 'utf8' }).trim();
  g('init', '-q', '-b', 'dev'); mkdirSync(join(d, 'scripts')); writeFileSync(join(d, 'scripts/check-commits.mjs'), SRC); writeFileSync(join(d, 'scripts/symlink-exceptions.json'), JSON.stringify([{ path: 'docs-link', reason: 'test' }])); writeFileSync(join(d, 'seed.txt'), String(Math.random()));
  g('add', '.'); g('commit', '-q', '-m', OK_MSG); const base = g('rev-parse', 'HEAD');
  writeFileSync(join(d, 'checker.mjs'), SRC.replace(/export const TRUSTED_BASE = '[0-9a-f]{40}'/, `export const TRUSTED_BASE = '${base}'`));
  symlinkSync('seed.txt', join(d, 'docs-link')); g('add', 'docs-link'); g('commit', '-q', '-m', OK_MSG);
  const x = spawnSync(process.execPath, [join(d, 'checker.mjs'), '', 'HEAD'], { cwd: d, encoding: 'utf8' }); rmSync(d, { recursive: true }); return x.status === 0;
});
t('the checker reads no override of the base from the environment', () => !/process\.env/.test(SRC));

for (const r of results) if (!r.pass) console.log(`FAIL  ${r.name}${r.got ? '  [' + r.got.slice(0, 200) + ']' : ''}`);
const bad = results.filter((r) => !r.pass);
if (bad.length) { console.error(`test-check-commits: ${bad.length} of ${results.length} failed`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
