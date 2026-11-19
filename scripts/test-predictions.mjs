#!/usr/bin/env node
// Tests for scripts/predictions.mjs, and a check of data/predictions/predictions.jsonl against the library's form
// (library.promptugal.news/api/v1/predictions/form.json, read 19 Nov 2026, 13:20 UTC). weather.b@PrompTugal.dinis.
// Code: Apache-2.0.
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { predictionLines, outcomeLines, FILE, SITE } from './predictions.mjs';
const KINDS = ['forecast', 'warning', 'countdown', 'score', 'expected-date', 'statement'];

const results = [];
const t = (name, fn) => { try { results.push({ name, pass: fn() === true }); } catch (e) { results.push({ name, pass: false, got: e.message }); } };
const live = (over = {}) => [{ id: 'faro', name: 'Faro', cityId: 1, cityName: 'Faro', updated: '2026-11-19T09:31:02', days: [{ date: '2026-11-19', t_max_c: 20 }, { date: '2026-11-20', t_max_c: 18.2 }, { date: '2026-11-21', t_max_c: 19 }], ...over }];
const BUILT = '2026-11-19T10:21:05.380Z';
t('one line per place for the next day only, shown at the live build\'s time', () => { const l = predictionLines(live(), BUILT, new Set()); return l.length === 1 && l[0].due === '2026-11-20' && l[0].value.value === 18.2 && l[0].shown_at === '2026-11-19T10:21Z'; });
t('the source is IPMA\'s address for the city, never one from the input', () => predictionLines(live({ source: 'https://evil.example/' }), BUILT, new Set())[0].source === 'https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/1.json');
t('no line twice', () => { const have = new Set(); predictionLines(live(), BUILT, have); return predictionLines(live(), BUILT, have).length === 0; });
t('not when the live build is on or after its day', () => predictionLines(live(), '2026-11-20T00:05:00Z', new Set()).length === 0);
t('not without a live build time', () => predictionLines(live(), null, new Set()).length === 0);
t('not with an implausible value', () => predictionLines(live({ days: [{ date: '2026-11-20', t_max_c: 999 }] }), BUILT, new Set()).length === 0);
t('not for a hostile place id', () => predictionLines(live({ id: 'a b/../"<' }), BUILT, new Set()).length === 0);
t('hostile text is cleaned (brackets, controls, bidi, lone surrogates)', () => { const l = predictionLines(live({ name: 'Fa[ro]<x>`\u202e\ud800\u2028y', cityName: 'C\x07ity' }), BUILT, new Set())[0]; return !/[\x00-\x1f\x7f-\x9f\u2028\u2029\u202a-\u202e\[\]<>`]|\p{Cs}/u.test(l.said + l.subject); });
const P = predictionLines(live(), BUILT, new Set());
const hist = (high, hours = 24, complete = true, read = '2026-11-21T10:00:00Z') => ({ faro: { place: 'faro', data_read_at: read, rows: [{ date: '2026-11-20', observed: { high_c: high, hours, complete } }] } });
const NOW = new Date('2026-11-21T10:00:00Z');
t('held within 2 degrees', () => { const o = outcomeLines(P, new Set(), hist(20.1), NOW); return o.length === 1 && o[0].result === 'held' && o[0].difference === '±1.9 °C' && /UTC day/.test(o[0].happened); });
t('missed beyond 2 degrees', () => outcomeLines(P, new Set(), hist(20.5), NOW)[0].result === 'missed');
t('exact when the same to the nearest degree', () => outcomeLines(P, new Set(), hist(18.4), NOW)[0].difference === 'exact');
t('no outcome on a part day', () => outcomeLines(P, new Set(), hist(20, 10, false), NOW).length === 0);
t('a day marked complete on 2 hours is not full', () => outcomeLines(P, new Set(), hist(20, 2, true, '2026-11-20T12:00:00Z'), NOW).length === 0);
t('a gap only when the history file itself is two days past the due day', () => outcomeLines(P, new Set(), hist(null, 10, false, '2026-11-21T09:00:00Z'), new Date('2026-11-25T00:00:00Z')).length === 0 && outcomeLines(P, new Set(), hist(null, 10, false, '2026-11-22T09:00:00Z'), NOW)[0].result === 'gap');
t('no outcome when what was said is not a number', () => outcomeLines([{ ...P[0], value: {} }], new Set(), hist(20), NOW).length === 0);
t('a hostile read time is not written', () => !/evil/.test(outcomeLines(P, new Set(), { faro: { ...hist(20).faro, data_read_at: 'evil<x>' } }, NOW)[0].happened));
t('one outcome per prediction', () => { const seen = new Set(); outcomeLines(P, seen, hist(20), NOW); return outcomeLines(P, seen, hist(20), NOW).length === 0; });

// the real file, against the library's form
const REQ_P = ['type', 'id', 'site', 'page', 'shown_at', 'said_by', 'source', 'licence', 'kind', 'subject', 'due', 'said'];
const TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\dZ$/, BAD = /[\x00-\x1f\x7f\[\]<>`]/;
const lines = existsSync(FILE) ? readFileSync(FILE, 'utf8').split('\n').filter(Boolean) : [];
t('the file: every line is JSON, within the library\'s limits', () => lines.length <= 50000 && lines.every((l) => { JSON.parse(l); return true; }));
const J = lines.map((l) => JSON.parse(l)), ids = new Set();
t('the file: every prediction has the form\'s fields, a unique id, https and real times', () => J.filter((l) => l.type === 'prediction').every((l) => REQ_P.every((k) => l[k] != null) && !ids.has(l.id) && ids.add(l.id) && /^[A-Za-z0-9._-]{1,100}$/.test(l.id) && l.site === SITE && KINDS.includes(l.kind) && (l.value == null || (typeof l.value === 'object' && Number.isFinite(l.value.value))) && l.page.startsWith(`https://${SITE}/`) && l.source.startsWith('https://') && l.licence.url.startsWith('https://') && TIME.test(l.shown_at) && /^\d{4}-\d\d-\d\d$/.test(l.due) && l.shown_at.slice(0, 10) < l.due && l.said.length <= 300 && l.subject.length <= 120 && l.said_by.length <= 80 && !BAD.test(l.said + l.subject + l.said_by)));
t('the file: every outcome names a prediction before it, with the form\'s fields', () => { const before = new Set(); return J.every((l) => { if (l.type === 'prediction') { before.add(l.id); return true; } return l.type === 'outcome' && before.has(l.of) && TIME.test(l.checked_at) && ['held', 'missed', 'gap'].includes(l.result) && (l.result === 'gap' ? !!l.gap : !!l.happened && Array.isArray(l.evidence) && l.evidence.length > 0 && l.evidence.every((e) => typeof e === 'string' && e.startsWith('https://') && !BAD.test(e))) && (l.difference == null || /^(exact|±\d+(\.\d)? °C)$/.test(l.difference)) && (l.value == null || Number.isFinite(l.value.value)) && !BAD.test(String(l.happened || l.gap)); }); });

t('the file: within 20 MB', () => !existsSync(FILE) || readFileSync(FILE).byteLength <= 20 * 1024 * 1024);
// append-only: the committed file must be a prefix of the file now
t('the file: only ever appended to (the last commit\'s copy is a prefix of it)', () => { let head = ''; try { head = execFileSync('git', ['show', `HEAD:${FILE}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return true; } return (existsSync(FILE) ? readFileSync(FILE, 'utf8') : '').startsWith(head); });

for (const r of results) if (!r.pass) console.log(`FAIL  ${r.name}${r.got ? '  [' + r.got + ']' : ''}`);
const bad = results.filter((r) => !r.pass);
if (bad.length) { console.error(`test-predictions: ${bad.length} of ${results.length} failed`); process.exit(1); }
console.log(`OK (${results.length} cases, ${lines.length} lines in the file)`);
