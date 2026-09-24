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
import { pickNameForms, englishNamesMany } from '../src/lib/saint-name.js';

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
  /*
   * **The files, named.** `node --test tests/` reads the directory as a module
   * specifier on Node 22 and later and dies with MODULE_NOT_FOUND before it
   * runs anything — so this step failed on every tree, clean or dirty, from
   * the day it was written (2026-09-10) until it was noticed on 2026-09-11,
   * and the gate it belongs to went red for a reason that had nothing to do
   * with the corpus. `package.json` passes a glob instead, which works there
   * because npm hands it to a shell; from `spawnSync` there is no shell to
   * expand it. Reading the directory needs neither.
   */
  const specs = fs
    .readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.test.mjs'))
    .map((f) => path.join('tests', f));
  const run = spawnSync('node', ['--test', ...specs], { cwd: ROOT, encoding: 'utf8' });
  const tail = (run.stdout ?? '').trim().split('\n').slice(-14).join('\n');
  console.log(tail);
  if (run.status !== 0) fail('npm test', 'the unit suite is red — read the whole log, not this tail');
}

/* ---- 3. duplicates ------------------------------------------------------- */

console.log('\n— duplicates ——————————————————————————————————————');
/*
 * **On the feast date, never on the name**. Two folders one
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
/**
 * **The folds that have been read, and what the reading was.** A fold is a
 * suspicion and the gate is right to stop on it; but a calendar year of one
 * church hands the same forename to men centuries apart — the Romanian
 * «Teoctist» is three different saints in this corpus — and a suspicion that
 * has been settled by reading both pages is not a finding any more. The key is
 * the folded form and both slugs, sorted, so that a *third* folder joining the
 * fold is an unread pair again and stops the gate as it should.
 */
const READ_FOLDS = {
  'bassus companion eusebius bassus-companion-of-eusebius eusebius-companion-of-bassus':
    'two men, each named in the calendar as the other’s companion, so the fold is the key sorting their two names into one — doxologia’s 20 January prints both and its life has them die together (read 19 September 2026)',
  'valerian valerian-of-tomis valerian-of-trebizond':
    'the martyr of Tomis kept on 13 September with Gordian, Macrobius, Helias and Lucian, against the soldier taken in the mountains above Trebizond with Candidus and Aquila on the Romanian 21 January: another day, another passion, another province (read 19 September 2026)',
  'agapie agapius-disciple-of-babylas agapius-son-of-eustathius':
    'the boy martyred at Sicily with his teacher Babylas and with Timothy, Romanian 24 January, against the son of Eustathius Placidas roasted with his parents and brother at Rome under Hadrian, kept on 20 September by all four. Two boys, two passions (read 19 September 2026)',
  'timotei timothy-disciple-of-babylas timothy-of-ephesus':
    'the second of Babylas of Sicily’s two disciples, Romanian 24 January, against the apostle and first bishop of Ephesus clubbed to death at the Catagogion, Romanian 22 January. A third Timothy, of Gaza, is kept on 19 August (read 19 September 2026)',
  'david david-of-georgia david-the-builder':
    'the prince of Argveti drowned in the Rioni with his brother Constantine in 740, Romanian 2 October, against the king of Georgia who rebuilt the country after the Seljuks and died in 1125, Romanian 26 January. Four centuries apart (read 19 September 2026)',
  'ioan john-of-edessa john-son-of-xenophon john-the-theologian':
    'three men called Ioan and nothing else shared: the soldier of Edessa who left the army under Diocletian and suffered at Alexandria with Cyrus, Romanian 31 January; the elder of Xenophon’s two sons, Romanian 26 January; and the apostle and evangelist (read 19 September 2026)',
  'maria maria-of-gatchina mary-sister-of-lykarion mary-wife-of-xenophon':
    'a third Maria joins the two of the Romanian 26 January: the virgin of Asia who with her sister Martha called out to a pagan governor from their door that they were Christians and was hung on a cross beside her and run through with a sword, sister of the child martyr Lykarion, Romanian 8 February. Her passion, her province and her day are all her own (read 24 September 2026). And, as before, the nun of Gatchina, paralysed, taken from her bed by the Cheka and dead in prison about 1930, against the wife of the nobleman Xenophon of Constantinople, who took the habit at Jerusalem with her husband and whose years doxologia gives not at all. Both fall on the Romanian 26 January, so the date scan cannot part them and the reading has to (read 19 September 2026)',
  'pavel paul-with-valentina-and-ennatha platon-kulbusch':
    'Platon Kulbusch, the first bishop of Estonia, was christened Paul at Pootsi in 1869, and the corpus stores that baptismal form beside his monastic one. The other Pavel is the third of the three the governor Firmilian sentenced at Caesarea, beheaded after Ennatha and Valentina went to the fire, Romanian 10 February. A baptismal name against a martyr’s, and sixteen centuries between them (read 24 September 2026)',
  'nichifor nicephorus-of-antioch nicephorus-of-corinth':
    'the townsman of Antioch the Great who begged the priest Sapricius on his way to the sword not to deny Christ and, when he denied him anyway, asked the executioners to cut him down in his place and was beheaded on the ninth day of February, against one of the seven men of Corinth seized under Decius in 250 whose page doxologia prints under each of their names, Romanian 31 January. Two cities, two persecutions, two days (read 24 September 2026)',
  'iacob jacob-the-hermit james-of-nisibis james-of-samosata':
    'three men called Iacob and nothing else shared: the hermit of the Romanian 28 January, fifteen years in a cave and then a murder and the rest of his life in a tomb; the bishop of Nisibis who fasted on the mountains, 13 January; and one of the seven of Samosata hung up with iron nails driven through their heads, Romanian 29 January, whose page gives no year and no emperor (read 19 September 2026)',
  'arsenie arsenios-of-paros arsenius-of-corfu':
    'the schoolmaster of Paros, born at Ioannina in 1800 and reposed on Paros in 1877, Romanian 31 January, against the archbishop of Corfu who died in 953 and is kept on the Romanian 19 January. Nine centuries (read 19 September 2026)',
  'victor victor-of-corinth victor-presbyter-martyr-1918':
    'one of the seven of Corinth whose page doxologia prints under each of their names, Romanian 31 January, against the Russian priest killed in 1918. The forename is all (read 19 September 2026)',
  'iulian julian-of-emesa julian-of-samosata':
    'the physician of Emesa who encouraged Silvanus, Luke and Mocius on their way to the beasts and was himself nailed through the head, hands and feet in 312, Romanian 6 February, against one of the seven of Samosata, Romanian 29 January. A third Iulian, the presbyter of Ancyra, is kept on 12 September (read 19 September 2026)',
  'clement clement-apostle-of-sardis clement-of-ancyra':
    'one of the Seventy, kept on 10 September by the Russian, Greek and Serbian, against the bishop of Ancyra the Romanian keeps on 23 January — twenty-eight years of torments and a death at the altar. Two men (read 19 September 2026)',
  'teoctist theoctistus-of-kucumia theoctistus-the-martyr':
    'the abbot of Kucumia in Sicily, Romanian 4 January, against the martyr by the sword the Greek and Romanian keep on 3 October; doxologia’s own page for 4 January is a note saying which Theoctistus the day is not (read 19 September 2026)',
};
const foldKey = (key, slugs) => [key, ...[...slugs].sort()].join(' ');

const collisions = [...folded].filter(([, slugs]) => slugs.length > 1);
const fresh = collisions.filter(([, slugs]) => slugs.some((s) => !batchSlugs || batchSlugs.has(s)));
const unread = fresh.filter(([key, slugs]) => !READ_FOLDS[foldKey(key, slugs)]);
console.log(`name forms two or more folders share : ${collisions.length}`);
for (const [key, slugs] of fresh) {
  const read = READ_FOLDS[foldKey(key, slugs)];
  console.log(`  ${read ? '·' : '?'} "${key}" — ${slugs.join(', ')}${read ? `\n      read: ${read}` : ''}`);
}
if (BATCH && unread.length) fail('duplicates', `${unread.length} folded name form(s) shared with the batch — read each pair`);

/* ---- 4. the naming contract ---------------------------------------------- */

console.log('\n— names ————————————————————————————————————————————');
/*
 * The bug this section was written for, and which it found: the Romanian name
 * days printed «Sfântul Cuvios Mărturisitor Sofian de la Antim» as
 * *Mărturisitor* and «Sfânta Împărăteasă Pulheria» as *Împărăteasă*, because
 * `stripPrefixes` in `lib/saint-name.js` runs a list of known ranks and stops
 * at the first word it does not know. English was right on both. A rank that
 * reaches the reader as a name is invisible to every other check in this repo,
 * so it is checked here on the corpus's own data by asking the build's own
 * function what it would print and looking at the first word. Eighteen forms
 * were fixed on 2026-09-11; the list below is what is left, and each is left
 * knowingly.
 *
 * **This check under-reported by four and the vocabulary is why.** It named
 * fourteen forms while the corpus held eighteen, and the four it walked past
 * were not subtle: three Romanian ranks missing from the list below (*Martir*,
 * *Mare Muceniță*) or spelled with the other Romanian t — «Muceniţă» has the
 * cedilla ţ and the class here had only the comma-below ț — and the Serbian
 * abbreviation «Свешт. муч.», which four forms carried past the whole strip
 * list and past this regex too. A checker written from the rows that prompted
 * it sees the rows that prompted it.
 */
const RANK_HEAD = {
  ru: /^(преподобн|священномученик|мученик|мучениц|святител|благоверн|праведн|блаженн|исповедник|пророк|апостол|великомученик|новомученик|архиеп|епископ|митрополит|патриарх|игумен|архимандрит|иеромонах|монах|князь|царь|царица|император)/i,
  ro: /^(sf[âa]nt|cuvios|cuvioas|mucenic|muceni[țţt]|martir|mare|ierarh|m[ăa]rturisitor|m[ăa]rturisitoare|prooroc|proroc|apostol|drept|fericit|[îi]mp[ăa]rat|[îi]mp[ăa]r[ăa]teas|voievod|domnitor|episcop|arhiepiscop|mitropolit|patriarh|preot|diacon|monah|ieromonah|arhimandrit|stare[țţt]|principe|prin[țţt]|regin|rege)/i,
  el: /^(άγι|αγί|όσι|οσί|ιερομάρτυ|οσιομάρτυ|μεγαλομάρτυ|νεομάρτυ|μάρτυ|προφήτ|απόστολ|δίκαι|ομολογητ|επίσκοπ|αρχιεπίσκοπ|μητροπολίτ|πατριάρχ|ηγούμεν|αρχιμανδρίτ|ιερομόναχ|μοναχ|βασιλ|αυτοκράτ)/i,
  sr: /^(свет|свешт|преподобн|свештеномученик|мученик|мученица|праведн|блажен|исповедник|пророк|апостол|великомученик|епископ|архиепископ|митрополит|патријарх|игуман|архимандрит|јеромонах|монах|кнез|цар|царица|краљ)/i,
};
/*
 * **Two shapes where a rank at the head is the right answer**, and both are
 * held out here rather than papered over in the strip list.
 *
 * A saint whose *English* name is a company is named by the rank: the Russian
 * for "The Monk-martyrs of Belogorsk" is «Преподобномученики Белогорские» and
 * there is no other name to print. `saint-name.js` already reads the display
 * name the same way for its two company rules, and this reads the same
 * function so the two cannot drift apart.
 *
 * And a rank word can *be* a name. «Άγιος Όσιος επίσκοπος Κορδούης» is
 * Hosius of Córdoba, whose name is the Greek for *Venerable*; Βασίλισσα and
 * Πάπας are two more. What tells them apart is the office behind them,
 * the same discriminator `saint-name.js` uses to leave the word standing, so
 * the exemption is stated in the same terms rather than as a list of slugs.
 */
const OFFICE_AFTER = {
  ru: /^(митрополит|архиепископ|епископ|патриарх|архимандрит|игумен|княз|цар|император)/i,
  el: /^(αρχιεπίσκοπ|επίσκοπ|μητροπολίτ|πατριάρχ|πρεσβύτερ|ηγούμεν|αρχιμανδρίτ|βασιλ|αυτοκράτ|πάπ)/i,
  ro: /^(arhiepiscop|mitropolit|episcop|patriarh|arhimandrit|egumen|rege|regin|[îi]mp[ăa]rat|voievod|pap)/i,
  sr: /^(архиепископ|митрополит|епископ|патријарх|архимандрит|игуман|краљ|кнез|цар|пап)/i,
};
let rankInName = 0;
let rankIsTheName = 0;
for (const { slug, saint } of corpus) {
  const forms = pickNameForms(saint.names, saint.display_name);
  const company = englishNamesMany(saint.display_name);
  for (const [lang, form] of Object.entries(forms)) {
    const words = String(form).split(/[\s ]+/);
    const head = words[0] ?? '';
    if (!RANK_HEAD[lang]?.test(head)) continue;
    const inNameSlot = words.length > 1 && OFFICE_AFTER[lang]?.test(words[1]);
    if (company || inNameSlot) {
      rankIsTheName += 1;
      if (inBatch({ slug }) || !BATCH) {
        const why = company ? 'the saint is a company, so the rank is the name' : 'an office follows, so the head is the name';
        console.log(`  · ${slug} ${lang}: «${form}» — ${why}`);
      }
      continue;
    }
    rankInName += 1;
    if (inBatch({ slug }) || !BATCH) console.log(`  ! ${slug} ${lang}: the printed name begins "${head}" — a rank, not a name`);
  }
}
console.log(`name forms where the rank is the name  : ${rankIsTheName}`);
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
 * the folders. `STRUCTURE.md` section 5 says tests must not name instances and 85
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
const hermits = cards.filter((s) => [s.display_name ?? '', ...(s.names ?? []).map((n) => n.form), ...(s.types ?? [])].some((t) => /hermit/i.test(t))).length;

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
  ['e2e/index-controls.spec.js:317     a feast in the church\'s own January', januaryOwn, '138'],
];
for (const [where, now, literal] of EXPECTED) {
  const moved = String(now) !== literal;
  console.log(`  ${moved ? '!' : '·'} ${where.padEnd(52)} now ${String(now).padEnd(12)} spec says ${literal}`);
  if (moved) fail('e2e literals', `${where} — the spec still says ${literal}, the corpus now says ${now}`);
}
console.log(`  · corpus total (e2e reads META.total)                 now ${corpus.length}`);
console.log(`  · 240–460 overlaps (e2e reads countInRange)          now ${overlapsRange(240, 460)}`);
console.log(`  · 240–460 within   (e2e reads countInRange)          now ${withinRange(240, 460)}`);
console.log(`  · undated tray     (e2e reads undatedCount)          now ${undated}`);
/*
 * The empty-range test reads `emptyRange()` from the manifest: the widest run of
 * years no dated life touches with dated lives on both sides. Printed, and red
 * only when no such run is left, which is the test losing its premise.
 */
{
  let best = null;
  let start = null;
  let seen = false;
  for (let y = -3000; y <= new Date().getFullYear(); y++) {
    if (overlapsRange(y, y) === 0) { if (seen && start === null) start = y; continue; }
    if (start !== null && (!best || y - 1 - start > best[1] - best[0])) best = [start, y - 1];
    start = null;
    seen = true;
  }
  console.log(`  · empty range    (e2e reads emptyRange)            now ${best ? best.join('–') : 'none'}`);
  if (!best) fail('e2e literals', 'no year range inside the corpus is untouched; the empty-range test has no premise');
}
console.log(`  · type "hermit"    (e2e reads carryingWord)          now ${hermits}`);
/*
 * Read, not held: daily-panel's reach sentence works the reach out from the
 * manifest itself (2026-09-16), so this is a figure to look at, not a literal
 * a batch has to move. It is every church summed from 1 August, where the
 * page walks one church from today, so the two need not agree.
 */
console.log(`  · corpus runway, all churches (no spec holds it)     now ${reach}`);
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
