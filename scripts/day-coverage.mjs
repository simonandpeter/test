#!/usr/bin/env node
/**
 * Which civil days the corpus can already fill, and where it runs out.
 *
 * `node scripts/day-coverage.mjs [--from YYYY-MM-DD] [--days N] [--church X]`
 * `node scripts/day-coverage.mjs --thin 3`      only the days under three folders
 * `node scripts/day-coverage.mjs --year`        one line a month, the whole year
 *
 * **This is where a sitting starts.** The corpus grew day by day along a
 * runway — 23 August to 28 September 2026 — and outside that stretch the Daily
 * page has readings, a fast and a tone but no people. A day with two folders
 * and a day with none are different jobs and this is the only thing that says
 * which is which without opening 862 folders.
 *
 * **It reports and never writes**, the standing of every audit in this
 * family (`place-candidates.mjs`, `date-audit.mjs`, `language-audit.mjs`). It
 * makes no network call either: the whole answer is in the folders.
 *
 * The count under a church is **that church's own reckoning of the civil
 * day**. The Russian and Serbian keep the Julian calendar, so their column for
 * 1 October is the menologion's 18 September; the Greek and Romanian columns
 * are the civil date itself. A day thin in one column and full in the next is
 * the ordinary state of this corpus, not a defect — it is the thing the site
 * exists to show.
 */
import { readCorpus, feastIndex, onCivilDay, churchDate, calendarOf, CHURCH_IDS } from './corpus-index.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(name);

const iso = (d) => d.toISOString().slice(0, 10);
const FROM = opt('--from', iso(new Date()));
const DAYS = Number(opt('--days', has('--year') ? 365 : 30));
const ONLY = opt('--church', null);
const THIN = opt('--thin', null) === null ? null : Number(opt('--thin', 3));
const churches = ONLY ? [ONLY] : CHURCH_IDS;

const corpus = readCorpus();
const index = feastIndex(corpus);

const start = new Date(`${FROM}T00:00:00Z`);
const rows = [];
for (let i = 0; i < DAYS; i += 1) {
  const d = new Date(start.getTime() + i * 86400000);
  const day = iso(d);
  const counts = Object.fromEntries(churches.map((c) => [c, onCivilDay(index, c, day).length]));
  rows.push({ day, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`corpus ${corpus.length} folders — civil days ${FROM} to ${rows.at(-1).day}\n`);
console.log(`${pad('civil day', 12)}${churches.map((c) => pad(c.slice(0, 8), 9)).join('')}  the church's own date`);

let empty = 0;
let thin = 0;
for (const row of rows) {
  if (THIN !== null && row.total > THIN) continue;
  if (row.total === 0) empty += 1;
  if (row.total > 0 && row.total <= 3) thin += 1;
  const own = churches
    .map((c) => {
      const { month, day } = churchDate(calendarOf(c), row.day);
      return `${c[0]}${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
    })
    .join(' ');
  console.log(`${pad(row.day, 12)}${churches.map((c) => pad(row.counts[c] || '·', 9)).join('')}  ${own}`);
}

/*
 * The reach, printed the way `e2e/daily-panel.spec.js` computes it: the last
 * civil day with at least one folder before the first gap a fortnight wide.
 * That test asserts the sentence the page prints ("the corpus reaches 28
 * September 2026"), as a literal, so a batch that moves this number and does
 * not move the literal turns `main` red. See `docs/CORPUS.md`, "What goes red
 * when the corpus grows".
 */
const scan = [];
for (let i = -60; i < 400; i += 1) {
  const d = iso(new Date(start.getTime() + i * 86400000));
  scan.push({ day: d, total: churches.reduce((n, c) => n + onCivilDay(index, c, d).length, 0) });
}
let reach = null;
let gap = 0;
for (const { day, total } of scan) {
  if (total > 0) {
    reach = day;
    gap = 0;
  } else if (++gap > 14 && reach) break;
}

console.log('');
if (THIN !== null) console.log(`shown: days with ${THIN} folders or fewer`);
console.log(`empty days in the window : ${empty}`);
console.log(`days with 1–3 folders    : ${thin}`);
console.log(`reach (14-day tolerance) : ${reach}`);
console.log('\nThis proposes a place to work. It writes nothing.');
