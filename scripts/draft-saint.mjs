#!/usr/bin/env node
/**
 * The one thing in this family that writes a folder, and it will not do it
 * from anything but a draft a person has typed.
 *
 * `node scripts/draft-saint.mjs .tmp/batch-2026-10-01.json`          dry run
 * `node scripts/draft-saint.mjs .tmp/batch-2026-10-01.json --write`
 * `node scripts/draft-saint.mjs --undo 2026-10-01-ru`
 *
 * **Dry run is the default.** `--write` has to be asked for by name, the way
 * `related-from-links.mjs` makes `--write-loose` be asked for: the cost of an
 * accidental run is 862 folders' worth of trust.
 *
 * ## What this is not
 *
 * It is **not a generator**. It composes nothing, translates nothing, dates
 * nothing and infers nothing. Every field it writes comes out of the draft
 * file, and the draft file is written by whoever read the source. This is the
 * project's oldest rule (Amendment 2, 2026-08-20): *"the model cannot tell its
 * own confident guesses from its sourced facts"*, so overnight work builds the
 * pipeline and the review workflow, never the corpus. Amendment 43 then
 * measured the temptation and priced it: a careful transliterator, checked
 * against 331 saints whose Greek and English forms the corpus already held,
 * reproduced **17**.
 *
 * What it *does* is everything a machine can be trusted with — the folder, the
 * JSON shape, the schema, the slug, the four attestation rows in the registry's
 * own order, the life's heading, and the eleven house rules below, each of
 * which has cost this corpus something at least once.
 *
 * ## The draft file
 *
 *     {
 *       "batch": "2026-10-01-ru",
 *       "read_on": "1 October 2026",
 *       "saints": [
 *         {
 *           "saint": { ... exactly what saint.json should contain ... },
 *           "life":  "Body paragraphs.\n\n*After …[the day](https://…); read 1 October 2026.*"
 *         }
 *       ]
 *     }
 *
 * `saint.slug` may be omitted and is then `slugify(display_name)`. `life` is
 * the body **without** the `# Name` heading, which is composed here so that
 * `tests/lives.test.mjs`'s first assertion cannot be got wrong by hand.
 *
 * ## Undo
 *
 * `--write` records the batch in `.tmp/corpus-batches/<batch>.json`, and
 * `--undo <batch>` deletes exactly the folders it created — refusing any whose
 * `saint.json` has changed since, because a folder somebody has since edited is
 * no longer this batch's to remove. That is the *pre-commit* undo. Once a batch
 * is committed the revert is `git revert <sha>`, which is why a batch is one
 * commit and one commit only; `docs/CORPUS.md` has the rhythm.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import { ROOT, SAINTS_DIR, readCorpus, feastIndex, onCivilDay, onMenologionDay, civilDate, calendarOf, nameKeys, slugify, CHURCH_IDS } from './corpus-index.mjs';
import { CHURCHES_BY_ID } from '../src/data/churches.js';

const args = process.argv.slice(2);
const has = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const BATCH_DIR = path.join(ROOT, '.tmp', 'corpus-batches');
const WRITE = has('--write');

/* ---- undo ---------------------------------------------------------------- */

if (has('--undo')) {
  const id = opt('--undo', null);
  const file = path.join(BATCH_DIR, `${id}.json`);
  if (!id || !fs.existsSync(file)) {
    console.error(`No batch record at ${path.relative(ROOT, file)}. A committed batch is undone with \`git revert\`.`);
    process.exit(1);
  }
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  const changed = [];
  const missing = [];
  for (const entry of record.folders) {
    const jsonPath = path.join(SAINTS_DIR, entry.slug, 'saint.json');
    if (!fs.existsSync(jsonPath)) {
      missing.push(entry.slug);
      continue;
    }
    const now = crypto.createHash('sha256').update(fs.readFileSync(jsonPath)).digest('hex');
    if (now !== entry.hash) changed.push(entry.slug);
  }
  if (changed.length) {
    console.error(`Refusing: ${changed.length} folder(s) have changed since the batch was written:\n  ${changed.join('\n  ')}`);
    console.error('Remove them by hand, or `git checkout`/`git revert` if the batch is committed.');
    process.exit(1);
  }
  for (const entry of record.folders) {
    if (missing.includes(entry.slug)) continue;
    if (WRITE) fs.rmSync(path.join(SAINTS_DIR, entry.slug), { recursive: true, force: true });
    console.log(`${WRITE ? 'removed' : 'would remove'}  saints/${entry.slug}/`);
  }
  if (!WRITE) console.log('\nDry run. Add --write to actually remove them.');
  else fs.rmSync(file);
  process.exit(0);
}

/* ---- the draft ----------------------------------------------------------- */

const DRAFT = args.find((a) => !a.startsWith('--') && a !== opt('--undo', '\0'));
if (!DRAFT) {
  console.error('Usage: node scripts/draft-saint.mjs <draft.json> [--write]');
  console.error('       node scripts/draft-saint.mjs --undo <batch> [--write]');
  process.exit(1);
}

const draft = JSON.parse(fs.readFileSync(path.resolve(DRAFT), 'utf8').replace(/^﻿/, ''));
if (!draft.batch || !Array.isArray(draft.saints)) {
  console.error('The draft needs a "batch" name and a "saints" array.');
  process.exit(1);
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(fs.readFileSync(path.join(ROOT, 'schema/saint.schema.json'), 'utf8')));

const corpus = readCorpus();
const index = feastIndex(corpus);
const existingKeys = new Map();
for (const { slug, saint } of corpus) for (const k of nameKeys(saint)) existingKeys.set(k, slug);

/* ---- the house rules ----------------------------------------------------- */

/**
 * Each of these has cost the corpus something once. They are checks the schema
 * cannot make, either because they are about English prose or because they are
 * about the rest of the corpus rather than about one record.
 */
const RANK_WORDS =
  /\b(saint|st\.?|venerable|blessed|righteous|martyr|hieromartyr|new martyr|great martyr|virgin martyr|confessor|prophet|apostle|equal[- ]to[- ]the[- ]apostles|passion[- ]bearer|forefather|bishop|archbishop|metropolitan|patriarch|abbot|abbess|presbyter|priest|deacon|monk|nun|hieromonk|archimandrite|prince|princess|king|queen|emperor|empress|voivode)\b/i;

function houseRules(saint, life, readOn) {
  const bad = [];
  const name = String(saint.display_name ?? '');

  /*
   * The naming contract (PLAN.md). `display_name` held name, office, rank and
   * death year in one string until 2026-08-27 — "Gorazd, Bishop of Bohemia and
   * Moravia-Silesia, Hieromartyr (1942)" — and every naming rule since rests on
   * having taken it apart. A rank left in the name is the live bug this
   * protocol exists partly to stop: the Romanian name days print «Mărturisitor»
   * for Sofian of Antim today, because a rank the strip-list has never heard of
   * is indistinguishable from a personal name.
   */
  if (/\(\s*\d{3,4}\s*\)|\b\d{3,4}\b/.test(name)) bad.push(`display_name carries a year: "${name}"`);
  if (RANK_WORDS.test(name.replace(/^The\s/, ''))) {
    const hit = RANK_WORDS.exec(name)[0];
    // Kinship and companionship clauses stay ("son of Bassa", "with 28
    // martyrs"): they are how the source names the person. A rank at the head
    // of the name, or after a comma, is the case this catches.
    if (new RegExp(`^${hit}\\b|,\\s*${hit}\\b`, 'i').test(name)) bad.push(`display_name carries the rank "${hit}": "${name}"`);
  }
  if (/\bof [A-Z][a-z]+,\s*(Bishop|Archbishop|Metropolitan|Patriarch)\b/.test(name)) bad.push(`display_name carries an office: "${name}"`);

  // Every church in the registry gets a row, and a gap is `undocumented` with
  // a note naming the source that was not read — the honest starting state,
  // and the one that costs nothing to leave in place.
  const rows = new Map((saint.attestations ?? []).map((a) => [a.church, a]));
  for (const church of CHURCH_IDS) {
    if (!rows.has(church)) bad.push(`no attestation row for ${church} — an unread calendar is "undocumented" with a note, not a silence`);
  }
  for (const att of saint.attestations ?? []) {
    if (att.status === 'undocumented' && !att.note) bad.push(`${att.church}: undocumented with no note saying which source was not read`);
    if (att.status !== 'undocumented') {
      if (!att.source?.url) bad.push(`${att.church}: ${att.status} without a source url — a veneration and a refusal are both positive findings`);
      if (att.source?.text && !/[«"„”]/.test(att.source.text)) {
        bad.push(`${att.church}: the source line does not quote the calendar's own wording`);
      }
    }
    /*
     * The calendar trap, and the one a reviewer cannot see. The Russian and
     * Serbian record a Julian day; the Greek and Romanian a Revised Julian
     * one. A Greek page's date written into a Russian row moves the saint
     * thirteen days and nothing downstream complains.
     */
    if (att.feast && att.feast.calendar !== 'paschal') {
      const expected = CHURCHES_BY_ID[att.church]?.default_calendar;
      if (expected && att.feast.calendar !== expected && !att.feast.note) {
        bad.push(`${att.church}: feast recorded as ${att.feast.calendar} where that church keeps ${expected}, with no note saying why`);
      }
    }
  }

  // `tests/lives.test.mjs`, in advance of the test rather than after it.
  const body = String(life ?? '').trim();
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words < 30) bad.push(`the life has ${words} words; the test asks for 30`);
  const last = body.split(/\n\s*\n/).pop().trim();
  if (!/^\*After .+\*$/s.test(last)) bad.push('the life does not close with an italic *After …* source line');
  if (!/\]\(https?:\/\/[^)\s]+\)/.test(last)) bad.push('the source line has no link');
  if (!/read \d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/.test(last)) {
    bad.push('the source line does not say when it was read');
  }
  if (readOn && !last.includes(readOn)) bad.push(`the source line's read-date is not the batch's "${readOn}"`);

  // A date the source did not print is an invention, and `note` is where the
  // source's own words go. An interval with no note cannot be checked.
  for (const [which, iv] of Object.entries(saint.dates ?? {})) {
    if (!iv) continue;
    if ((iv.earliest !== null && iv.earliest !== undefined) || (iv.latest !== null && iv.latest !== undefined)) {
      if (!iv.note) bad.push(`dates.${which} states a year with no note quoting where it came from`);
      if (iv.basis === 'attested' && iv.earliest !== null && iv.latest !== null && iv.latest - iv.earliest > 100) {
        bad.push(`dates.${which} calls itself attested and spans ${iv.latest - iv.earliest} years`);
      }
    }
  }

  // Amendment 86: no point beats a wrong one.
  for (const loc of saint.locations ?? []) {
    if (loc.lat !== undefined && !loc.uncertainty_km) bad.push(`location "${loc.kind}" has coordinates and no uncertainty_km`);
  }

  return bad;
}

/* ---- the run ------------------------------------------------------------- */

const planned = [];
let problems = 0;

for (const item of draft.saints) {
  const saint = { ...item.saint };
  saint.slug ??= slugify(saint.display_name ?? '');
  saint.text ??= { life: 'life.md' };
  if (saint.text.life !== 'life.md') saint.text = { ...saint.text, life: 'life.md' };

  const bad = [];
  if (!validate(saint)) {
    for (const e of validate.errors) bad.push(`schema ${e.instancePath || '(root)'}: ${e.message}`);
  }
  bad.push(...houseRules(saint, item.life, draft.read_on));

  const dir = path.join(SAINTS_DIR, saint.slug);
  if (fs.existsSync(dir)) bad.push(`saints/${saint.slug}/ already exists — refusing to overwrite`);
  if (planned.some((p) => p.saint.slug === saint.slug)) bad.push(`the draft names ${saint.slug} twice`);

  /*
   * The two duplicate checks, in the order Amendment 45 earned. The feast one
   * is the decision; the name one is a suspicion, printed and never fatal,
   * because nothing that folds Theodore to Theodoros can also keep Sozon of
   * Cyprus apart from Sozon of Pompeiopolis, whom the Greek keeps on one day.
   */
  const warnings = [];
  for (const att of saint.attestations ?? []) {
    if (att.status !== 'venerated' || !att.feast || att.feast.calendar === 'paschal') continue;
    const civil = civilDate(calendarOf(att.church), att.feast.month, att.feast.day, 2026);
    const held = onCivilDay(index, att.church, civil);
    if (held.length) warnings.push(`${att.church} civil ${civil}: the corpus already keeps ${held.length} there — ${held.join(', ')}`);
    /*
     * And the menologion number, across every calendar, which is the scan that
     * catches the same person under another church's reckoning: the Russian's
     * 18 September and the Greek's are one menologion page and a fortnight
     * apart in civil days.
     */
    const number = onMenologionDay(index, att.feast.month, att.feast.day).filter((s) => !held.includes(s));
    if (number.length) warnings.push(`menologion ${att.feast.day}/${att.feast.month}: ${number.length} folder(s) on that day in some calendar — ${number.join(', ')}`);
  }
  for (const key of nameKeys(saint)) {
    if (existingKeys.has(key)) warnings.push(`a name form folds onto ${existingKeys.get(key)} — read both before writing`);
  }

  planned.push({ saint, life: item.life, dir, bad, warnings: [...new Set(warnings)] });
  problems += bad.length;
}

for (const p of planned) {
  console.log(`\n${p.bad.length ? '✗' : '·'} saints/${p.saint.slug}/  ${p.saint.display_name}`);
  for (const w of p.warnings) console.log(`    ? ${w}`);
  for (const b of p.bad) console.log(`    ! ${b}`);
}

console.log(`\n${planned.length} folder(s) in batch "${draft.batch}"; ${problems} problem(s).`);

if (problems) {
  console.error('\nNothing written. Fix the drafts and run again.');
  process.exit(1);
}

if (!WRITE) {
  console.log('\nDry run — nothing written. Add --write when the drafts have been read.');
  process.exit(0);
}

const record = { batch: draft.batch, written: new Date().toISOString(), folders: [] };
for (const p of planned) {
  fs.mkdirSync(path.join(p.dir, 'images'), { recursive: true });
  const json = JSON.stringify(p.saint, null, 2) + '\n';
  fs.writeFileSync(path.join(p.dir, 'saint.json'), json, 'utf8');
  fs.writeFileSync(path.join(p.dir, 'life.md'), `# ${p.saint.display_name}\n\n${String(p.life).trim()}\n`, 'utf8');
  record.folders.push({ slug: p.saint.slug, hash: crypto.createHash('sha256').update(json).digest('hex') });
  console.log(`wrote  saints/${p.saint.slug}/`);
}

fs.mkdirSync(BATCH_DIR, { recursive: true });
fs.writeFileSync(path.join(BATCH_DIR, `${draft.batch}.json`), JSON.stringify(record, null, 2) + '\n', 'utf8');

console.log(`
Batch "${draft.batch}" recorded. Next, in this order:
  node scripts/corpus-gate.mjs --batch ${draft.batch}
  git add saints && git commit && bash scripts/push.sh
Undo before committing: node scripts/draft-saint.mjs --undo ${draft.batch} --write
`);
