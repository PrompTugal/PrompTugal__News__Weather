#!/usr/bin/env node
// Tests for scripts/site/past.mjs: designer@'s PF rules that can be checked as data (a gap stays a gap, nothing
// before the record's first day, the score only on full days, what we said from the right issue), and hostile input.
// weather.b@PrompTugal.dinis. Code: Apache-2.0.
import { pastRows, saidBefore, scored, trackRecord, pastSection } from './site/past.mjs';

const results = [];
const t = (name, fn) => { try { results.push({ name, pass: fn() === true }); } catch (e) { results.push({ name, pass: false, got: e.message }); } };
const obs = (low, high, complete = true, hours = 24) => ({ low_c: low, high_c: high, rain_mm: 0, hours, complete });
const H = (rows, first = '2026-11-15') => ({ place: 'faro', first_day: first, data_read_at: '2026-11-19T10:00:00Z', rows });
const today = '2026-11-19';
const archive = [
  { id: 1, updated_local: '2026-11-17T09:31:02', days: [{ date: '2026-11-18', t_min_c: 10, t_max_c: 20 }] },
  { id: 1, updated_local: '2026-11-17T21:31:02', days: [{ date: '2026-11-18', t_min_c: 11, t_max_c: 22 }] },
  { id: 1, updated_local: '2026-11-18T09:31:02', days: [{ date: '2026-11-18', t_min_c: 0, t_max_c: 0 }] }, // same-day issue: not "the day before"
  { id: 2, updated_local: '2026-11-17T23:00:00', days: [{ date: '2026-11-18', t_min_c: 5, t_max_c: 5 }] }, // another city
];

t('what we said: the last issue of the day before, for this city only', () => { const s = saidBefore(archive, 1, '2026-11-18'); return s.high === 22 && s.low === 11 && s.issued === '2026-11-17T21:31:02'; });
t('what we said: none when no issue the day before', () => saidBefore(archive, 1, '2026-11-17') === null);
t('a missing day is a gap, never filled in', () => { const P = pastRows({ history: H([{ date: '2026-11-16', observed: obs(10, 20) }, { date: '2026-11-18', observed: obs(11, 21) }]), today }); const r = P.rows.find((x) => x.day === '2026-11-17'); return r && r.observed === null; });
t('nothing before the record\'s first day', () => { const P = pastRows({ history: H([{ date: '2026-11-18', observed: obs(1, 2) }], '2026-11-18'), today }); return P.rows[0].day === '2026-11-18' && P.first === '2026-11-18'; });
t('at most 7 past days, then today', () => { const P = pastRows({ history: H([{ date: '2026-11-01', observed: obs(1, 2) }], '2026-11-01'), today }); return P.rows.filter((r) => r.kind === 'past').length === 7 && P.rows.filter((r) => r.kind === 'today').length === 1; });
t('the forecast after today, at most 4 days', () => { const fd = [19, 20, 21, 22, 23, 24, 25].map((d) => ({ date: `2026-11-${d}`, t_min_c: 8, t_max_c: 18 })); const P = pastRows({ history: H([{ date: today, observed: obs(9, 15, false, 10) }]), today, forecastDays: fd }); return P.rows.filter((r) => r.kind === 'next').length === 4 && P.rows.find((r) => r.kind === 'today').forecast.high === 18; });
t('the score only on full past days', () => scored({ kind: 'past', observed: { high: 20, complete: false }, said: { high: 20 } }) === null && scored({ kind: 'today', observed: { high: 20, complete: true }, said: { high: 20 } }) === null);
t('a hit within 2 degrees, a miss beyond, the gap rounded', () => { const a = scored({ kind: 'past', observed: { high: 21.9, complete: true }, said: { high: 20 } }); const b = scored({ kind: 'past', observed: { high: 22.6, complete: true }, said: { high: 20 } }); return a.hit && a.gap === 2 && !b.hit && b.gap === 3; });
t('the track record counts computed days', () => { const tr = trackRecord([{ kind: 'past', observed: { high: 20, complete: true }, said: { high: 20 } }, { kind: 'past', observed: { high: 25, complete: true }, said: { high: 20 } }, { kind: 'past', observed: null, said: { high: 20 } }]); return tr.days === 2 && tr.hits === 1; });
t('what we said from the history file first, the archive second', () => { const P = pastRows({ history: H([{ date: '2026-11-18', observed: obs(11, 21), forecast: { d1: { t_min_c: 9, t_max_c: 19 } } }]), archive, cityId: 1, today }); const r = P.rows.find((x) => x.day === '2026-11-18'); return r.said.high === 19 && r.said.from === 'history'; });
t('implausible values are dropped, not drawn', () => { const P = pastRows({ history: H([{ date: '2026-11-18', observed: obs(-999, 1e9) }]), today }); return P.rows.find((x) => x.day === '2026-11-18').observed === null; });
t('no history file: no section', () => pastSection({ placeId: 'faro', name: 'Faro', history: null, today }) === null);
t('a hostile place id: no section', () => pastSection({ placeId: '../x', name: 'Faro', history: H([{ date: today, observed: obs(1, 2) }]), today }) === null);
t('text from the file is escaped in the page', () => { const s = pastSection({ placeId: 'faro', name: '<b>x</b>', history: { ...H([{ date: today, observed: obs(1, 2) }]), data_read_at: '<script>' }, today, stationName: '"><img src=x>' }); return !/<script>|<img src=x>|<b>x<\/b>/.test(s.html) && !/<img|\[|\]/.test(s.md.split('Measured:')[1]); });
t('a bad date row is ignored', () => { const P = pastRows({ history: H([{ date: '2026-11-18T00:00', observed: obs(1, 2) }, { date: today, observed: obs(1, 2) }]), today }); return P.rows.every((r) => /^\d{4}-\d\d-\d\d$/.test(r.day)); });

// from the security post-review (Sonnet, 19 Nov 2026)
t('a day is full only with all 24 hours, whatever the file says', () => { const P = pastRows({ history: H([{ date: '2026-11-18', observed: obs(10, 20, true, 2) }]), today }); return P.rows.find((x) => x.day === '2026-11-18').observed.complete === false; });
t('an impossible first day is not used', () => { const P = pastRows({ history: { ...H([{ date: '2026-11-18', observed: obs(1, 2) }]), first_day: '2026-00-00' }, today }); return P.first === '2026-11-18'; });
t('a file cannot claim a record longer than its rows', () => { const P = pastRows({ history: { ...H([{ date: '2026-11-18', observed: obs(1, 2) }]), first_day: '1900-01-01' }, today }); return P.first === '2026-11-18'; });
t('a hostile name makes no link, image or heading in the markdown', () => { const s = pastSection({ placeId: 'faro', name: 'Faro [click](https://evil.example)\n\n# pwn ![x](https://evil.example/i.png)', history: H([{ date: today, observed: obs(1, 2) }]), today, stationName: 'x http://evil.example' }); return !/\]\(|!\[|\n# |https?:\/\/evil/.test(s.md) && /track record/.test(s.md); });

for (const r of results) if (!r.pass) console.log(`FAIL  ${r.name}${r.got ? '  [' + r.got + ']' : ''}`);
const bad = results.filter((r) => !r.pass);
if (bad.length) { console.error(`test-past: ${bad.length} of ${results.length} failed`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
