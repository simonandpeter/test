#!/usr/bin/env node
/**
 * Everything that has to pass before a batch of saints is committed, in one
 * command, ending in a verdict.
 *
 * `node scripts/corpus-gate.mjs`                     the whole corpus
 * `node scripts/corpus-gate.mjs --batch 2026-10-01-ru`   and the batch's own folders
 * `node scripts/corpus-gate.mjs --online`            also check every new citation resolves
 * `node scripts/corpus-gate.mjs --quick`             skip `npm test`
 *
 * **Why a gate and not a test.** Most of what is below *is* a test and is run
 * as one; this exists because the expensive failures of the last month were
 * not test failures. They were a batch that turned twenty-four browser tests
 * red for a number nobody had updated, a duplicate saint under a variant
 * spelling, and a run where the suite was green and the batch had moved a
 * literal in `e2e/` that only CI would find seventeen minutes later. So the
 * last section of this report is not a check at all: it is the arithmetic the
 * e2e specs hard-code, printed beside the literal each currently holds, so a
 * batch that moves one is caught here rather than on CI.
 *
 * It writes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { ROOT, readCorpus, feastIndex, nameKeys, calendarOf, churchDate, onCivilDay, CHURCH_IDS } from './corpus-index.mjs';
import { build, report } from './build-manifest.mjs';
import { makeInterval, overlaps, within, primaryCentury } from '../src/lib/dates.js';
import { pickNameForms } from '../src/lib/saint-name.js';

const args = process.argv.slice(2);
const has = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const BATCH = opt('--batch', null);
const failures = [];
const notes = [];
const fail = (section, msg) => failures.push(`${section}: ${msg}`);

const corpus = readCorpus();
const index = feastIndex(corpus);

/** The folders this batch wrote, when a batch is named; otherwise all of them. */
let batchSlugs = null;
if (BATCH) {
  const file = path.join(ROOT, '.tmp', 'corpus-batches', `${BATCH}.json`);
  if (!fs.existsSync(file)) {
    console.error(`No batch record at ${path.relative(ROOT, file)}.`);
    process.exit(1);
  }
  batchSlugs = new Set(JSON.parse(fs.readFileSync(file, 'utf8')).folders.map((f) => f.slug));
}
const inBatch = ({ slug }) => !batchSlugs || batchSlugs.has(slug);

console.log(`corpus ${corpus.length} folders${BATCH ? `, batch "${BATCH}" of ${batchSlugs.size}` : ''}\n`);

/* ---- 1. the build's own validation --------------------------------------- */

console.log('— schema and build ————————————————————————————————');
const built = await build({ write: false });
if (report(built, { write: false }) !== 0) fail('build', `${built.errors.length} folder problem(s) above`);

/* ---- 2. the unit suite --------------------------------------------------- */

if (!has('--quick')) {
  console.log('\n— npm test ————————————————————————————————————————');
  const run = spawnSync('node', ['--test', 'tests/'], { cwd: ROOT, encoding: 'utf8' });
  const tail = (run.stdout ?? '').trim().split('\n').slice(-14).join('\n');
  console.log(tail);
  if (run.status !== 0) fail('npm test', 'the unit suite is red — read the whole log, not this tail');
}

/* ---- 3. duplicates ------------------------------------------------------- */

console.log('\n— duplicates ——————————————————————————————————————');
/*
 * **On the feast date, never on the name** (Amendment 45). Two folders one
 * church keeps on one menologion day are not automatically a duplicate — the
 * Greek keeps Sozon of Cyprus and Sozon of Pompeiopolis on 7 September and is
 * right to — so a crowded day is printed, not failed. The name fold under it
 * is the weaker signal and is the one that catches a variant transliteration.
 */
const folded = new Map();
for (const { slug, saint } of corpus) {
  for (const key of nameKeys(saint)) {
    if (!folded.has(key)) folded.set(key, []);
    folded.get(key).push(slug);
  }
}
const collisions = [...folded].filter(([, slugs]) => slugs.length > 1);
const fresh = collisions.filter(([, slugs]) => slugs.some((s) => !batchSlugs || batchSlugs.has(s)));
console.log(`name forms two or more folders share : ${collisions.length}`);
for (const [key, slugs] of fresh) console.log(`  ? "${key}" — ${slugs.join(', ')}`);
if (BATCH && fresh.length) fail('duplicates', `${fresh.length} folded name form(s) shared with the batch — read each pair`);

/* ---- 4. the naming contract ---------------------------------------------- */

console.log('\n— names ————————————————————————————————————————————');
/*
 * The live bug this section exists for: the Romanian name days print
 * «Sfântul Cuvios Mărturisitor Sofian de la Antim» as *Mărturisitor* and
 * «Sfânta Împărăteasă Pulheria» as *Împărăteasă*, because `stripPrefixes` in
 * `lib/saint-name.js` runs a list of known ranks and stops at the first word it
 * does not know. English is right on both. A rank that reaches the reader as a
 * name is invisible to every other check in this repo, so it is checked here
 * on the corpus's own data by asking the build's own function what it would
 * print and looking at the first word.
 */
const RANK_HEAD = {
  ru: /^(преподобн|священномученик|мученик|мучениц|святител|благоверн|праведн|блаженн|исповедник|пророк|апостол|великомученик|новомученик|архиеп|епископ|митрополит|патриарх|игумен|архимандрит|иеромонах|монах|князь|царь|царица|император)/i,
  ro: /^(sf[âa]nt|cuvios|cuvioas|mucenic|muceni[țt]|ierarh|m[ăa]rturisitor|m[ăa]rturisitoare|prooroc|proroc|apostol|drept|fericit|[îi]mp[ăa]rat|[îi]mp[ăa]r[ăa]teas|voievod|domnitor|episcop|arhiepiscop|mitropolit|patriarh|preot|diacon|monah|ieromonah|arhimandrit|stare[țt]|principe|prin[țt]|regin|rege)/i,
  el: /^(άγι|αγί|όσι|οσί|ιερομάρτυ|οσιομάρτυ|μεγαλομάρτυ|νεομάρτυ|μάρτυ|προφήτ|απόστολ|δίκαι|ομολογητ|επίσκοπ|αρχιεπίσκοπ|μητροπολίτ|πατριάρχ|ηγούμεν|αρχιμανδρίτ|ιερομόναχ|μοναχ|βασιλ|αυτοκράτ)/i,
  sr: /^(свет|преподобн|свештеномученик|мученик|мученица|праведн|блажен|исповедник|пророк|апостол|великомученик|епископ|архиепископ|митрополит|патријарх|игуман|архимандрит|јеромонах|монах|кнез|цар|царица|краљ)/i,
};
let rankInName = 0;
for (const { slug, saint } of corpus) {
  const forms = pickNameForms(saint.names, saint.display_name);
  for (const [lang, form] of Object.entries(forms)) {
    const head = String(form).split(/[\s ]+/)[0] ?? '';
    if (RANK_HEAD[lang]?.test(head)) {
      rankInName += 1;
      if (inBatch({ slug }) || !BATCH) console.log(`  ! ${slug} ${lang}: the printed name begins "${head}" — a rank, not a name`);
    }
  }
}
console.log(`name forms whose first word is a rank : ${rankInName}`);
if (BATCH && rankInName) notes.push('a rank reaching the reader as a name is a defect in lib/saint-name.js\'s strip list, not in the folder — fix the list, in its own commit');

/* ---- 5. citations -------------------------------------------------------- */

console.log('\n— citations ————————————————————————————————————————');
let missingSource = 0;
let missingLifeLine = 0;
const urls = new Set();
for (const entry of corpus) {
  const { slug, saint, life } = entry;
  for (const att of saint.attestations ?? []) {
    if (att.status === 'undocumented') continue;
    if (!att.source?.url) {
      missingSource += 1;
      if (inBatch(entry)) console.log(`  ! ${slug} ${att.church}: ${att.status} with no source url`);
    } else if (inBatch(entry)) urls.add(att.source.url);
  }
  const last = String(life ?? '').trim().split(/\n\s*\n/).pop() ?? '';
  if (!/^\*After .+\*$/s.test(last.trim())) {
    missingLifeLine += 1;
    if (inBatch(entry) && batchSlugs) console.log(`  ! ${slug}: the life does not close with a source line`);
  }
  for (const m of last.matchAll(/\((https?:\/\/[^)\s]+)\)/g)) if (inBatch(entry)) urls.add(m[1]);
}
console.log(`attestations claiming a status with no source url : ${missingSource}`);
console.log(`lives with no closing source line                 : ${missingLifeLine} (6 predate the rule)`);
if (missingSource) fail('citations', `${missingSource} sourceless claim(s)`);

if (has('--online')) {
  console.log(`\nchecking ${urls.size} citation url(s) resolve…`);
  let dead = 0;
  for (const url of urls) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(url, { method: 'GET', headers: { 'user-agent': 'Mozilla/5.0 (agios-corpus link check)' } });
      if (!res.ok) {
        dead += 1;
        console.log(`  ! ${res.status}  ${url}`);
      }
    } catch (e) {
      dead += 1;
      console.log(`  ! ${e.message}  ${url}`);
    }
  }
  console.log(`dead citation links : ${dead}`);
  if (dead) fail('citations', `${dead} citation url(s) do not resolve`);
}

/* ---- 6. the calendars ---------------------------------------------------- */

console.log('\n— calendars ————————————————————————————————————————');
let wrongCalendar = 0;
for (const entry of corpus) {
  for (const att of entry.saint.attestations ?? []) {
    if (!att.feast || att.feast.calendar === 'paschal') continue;
    if (att.feast.calendar !== calendarOf(att.church) && !att.feast.note) {
      wrongCalendar += 1;
      if (inBatch(entry)) console.log(`  ! ${entry.slug} ${att.church}: ${att.feast.calendar} where the church keeps ${calendarOf(att.church)}`);
    }
  }
}
console.log(`feasts on a calendar the church does not keep, unexplained : ${wrongCalendar}`);
if (wrongCalendar) fail('calendars', `${wrongCalendar} feast(s) on the wrong calendar`);

/* ---- 7. what goes red when the corpus grows ------------------------------ */

/*
 * Not a check. These are the numbers `e2e/` writes as literals, computed from
 * the folders. `PLAN.md` section 5 says tests must not name instances and 85
 * hard-coded slugs and dates are still in the specs; until they are derived,
 * **a batch that moves one of these has to move the literal in the same
 * commit** or `main` goes red seventeen minutes after the push.
 */
console.log('\n— what the e2e specs hard-code ————————————————————');

const cards = corpus.map(({ saint }) => saint);
const venerated = Object.fromEntries(
  CHURCH_IDS.map((c) => [c, cards.filter((s) => (s.attestations ?? []).some((a) => a.church === c && a.status === 'venerated')).length]),
);
const iv = (s) => ({
  birth: makeInterval(s.dates?.birth),
  death: makeInterval(s.dates?.death),
  floruit: makeInterval(s.dates?.floruit),
});
const spanOf = (s) => {
  const d = iv(s);
  const lo = d.birth.earliest ?? d.floruit.earliest ?? d.death.earliest;
  const hi = d.death.latest ?? d.floruit.latest ?? d.birth.latest;
  return lo === null || lo === undefined || hi === null || hi === undefined ? null : { earliest: lo, latest: hi };
};
const dated = cards.map((s) => ({ slug: s.slug, span: spanOf(s), types: s.types ?? [] }));
const overlapsRange = (from, to) => dated.filter((d) => d.span && overlaps(d.span, from, to)).length;
const withinRange = (from, to) => dated.filter((d) => d.span && within(d.span, from, to)).length;
const undated = cards.filter((s) => primaryCentury(s.dates ?? {}) === null).length;
const januaryOwn = cards.filter((s) =>
  (s.attestations ?? []).some((a) => a.status === 'venerated' && a.feast && a.feast.calendar !== 'paschal' && a.feast.month === 1),
).length;
/*
 * The search index is `name` *and* `types`, not `types` alone — Dorotheus the
 * Hermit of Egypt is typed `venerable` and is the tenth hit. Counting the type
 * on its own gave 9 against the spec's 10 and would have read as the spec
 * being stale when it was this arithmetic that was.
 */
const hermits = cards.filter((s) => /hermit/i.test(s.display_name ?? '') || (s.types ?? []).some((t) => /hermit/i.test(t))).length;

let reach = null;
let gap = 0;
for (let i = 0; i < 460; i += 1) {
  const d = new Date(Date.UTC(2026, 7, 1) + i * 86400000).toISOString().slice(0, 10);
  const total = CHURCH_IDS.reduce((n, c) => n + onCivilDay(index, c, d).length, 0);
  if (total > 0) {
    reach = d;
    gap = 0;
  } else if (++gap > 14 && reach) break;
}

const EXPECTED = [
  ['e2e/index-controls.spec.js:69,261  Romanian venerated', venerated.romanian, '160'],
  ['e2e/index-controls.spec.js:130     240–460 overlaps', overlapsRange(240, 460), '219'],
  ['e2e/index-controls.spec.js:132     240–460 within', withinRange(240, 460), '205'],
  ['e2e/index-controls.spec.js:160     1396–1400 must be empty', overlapsRange(1396, 1400), '0'],
  ['e2e/index-controls.spec.js:215     undated tray', undated, '126'],
  ['e2e/index-controls.spec.js:229     type "hermit"', hermits, '10'],
  ['e2e/index-controls.spec.js:317     a feast in the church\'s own January', januaryOwn, '6'],
  ['e2e/daily-panel.spec.js:2479       the corpus reaches', reach, '2026-09-28'],
];
for (const [where, now, literal] of EXPECTED) {
  const moved = String(now) !== literal;
  console.log(`  ${moved ? '!' : '·'} ${where.padEnd(52)} now ${String(now).padEnd(12)} spec says ${literal}`);
  if (moved) fail('e2e literals', `${where} — the spec still says ${literal}, the corpus now says ${now}`);
}
console.log(`  · corpus total (e2e reads META.total)                 now ${corpus.length}`);
for (const [c, n] of Object.entries(venerated)) console.log(`  · venerated ${c.padEnd(9)} (e2e reads META.by_church)     now ${n}`);

/* ---- verdict ------------------------------------------------------------- */

console.log('\n———————————————————————————————————————————————————');
for (const n of notes) console.log(`note: ${n}`);
if (failures.length) {
  console.log(`\nGATE RED — ${failures.length} problem(s):`);
  for (const f of failures) console.log(`  ${f}`);
  console.log('\nDo not commit. Fix, or `node scripts/draft-saint.mjs --undo <batch> --write`.');
  process.exit(1);
}
console.log('\nGATE GREEN. Still to do by hand before the push:');
console.log('  - read every new folder against the source page it cites');
console.log('  - `npm run build && npm run test:e2e` if any literal above moved');
console.log('  - one back-out, watched to fail (docs/CORPUS.md, "The back-out")');
