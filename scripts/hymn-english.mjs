/**
 * English for the hymns, in the two tracks `ui/hymns.js` already draws
 * (author, 2026-09-12: "I want all the hymns translated to English … ALL
 * HYMNS TRANSLATED. No double ups").
 *
 * **It proposes nothing and translates nothing.** Like `draft-saint.mjs`, this
 * writes only what a person typed: `--emit` prints the hymns still lacking an
 * English, grouped so that one text can answer for every tradition that sings
 * it, and `--write <file>` puts the typed English back into the folders. No
 * machine translation happens here and none is invoked from here — a rendering
 * is written by hand, into the work file, and this moves it.
 *
 * **The group is the unit, not the hymn object.** A saint's apolytikion is
 * often the same text in Greek, Church Slavonic and Romanian, each tradition
 * citing its own book; 33 of the corpus's hymns are like that. The key is
 * `slug · kind · tone`, because the same hymn keeps its mode across
 * traditions and two hymns in one mode are the ones a reading has to tell
 * apart. Every object in a group takes the same English text and keeps its own
 * source, which is what lets `mergeForReading` collapse them for an English
 * reader and leave a Greek one alone.
 *
 * **Two hymns that are not the same hymn must not share a group**, and the
 * tone is only a first filter: where a group holds texts that are plainly
 * different, `--emit` prints them together and the person filling the file
 * splits it by giving them different English. `mergeForReading` keys on the
 * rendered text, so two different Englishes are simply two hymns again.
 *
 *   node scripts/hymn-english.mjs --emit [--limit N] [--out work.json]
 *   node scripts/hymn-english.mjs --write work.json [--dry]
 *
 * The work file is a list of `{ key, english: { text, rendered | source } }`.
 * An entry with no `english.text` is skipped, so a file may be filled in over
 * several sittings.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toneNumber } from '../src/lib/tone.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const opt = (n, d = null) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

/*
 * **`lib/tone.js`, not a digit match.** Greek writes its mode in Greek
 * numerals — `Ἦχος γ΄` is tone 3 — so a `/(\d+)/` reads every Greek hymn as
 * toneless and none of them ever groups with the Slavonic and Romanian twins
 * it is the same hymn as. Found on the first batch emitted: Adrian of
 * Nicomedia's troparion came out as two hymns, `· none` holding the Greek and
 * `· 3` holding the Romanian and the Russian, which are one text in three
 * tongues. The site already had the reader for this and the page uses it.
 */
const toneKey = (t) => toneNumber(t) ?? 'none';

const folders = fs
  .readdirSync(path.join(ROOT, 'saints'))
  .filter((d) => fs.existsSync(path.join(ROOT, 'saints', d, 'saint.json')));

/** Every hymn in the corpus, grouped by `slug · kind · tone`. */
function groups() {
  const out = new Map();
  for (const slug of folders) {
    const file = path.join(ROOT, 'saints', slug, 'saint.json');
    const saint = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [i, h] of (saint.hymns ?? []).entries()) {
      const key = `${slug} · ${h.kind} · ${toneKey(h.tone)}`;
      if (!out.has(key)) out.set(key, { key, slug, kind: h.kind, members: [] });
      out.get(key).members.push({ i, h, file, name: saint.display_name });
    }
  }
  return out;
}

if (has('--emit')) {
  const limit = Number(opt('--limit', '0')) || Infinity;
  const all = [...groups().values()];
  const todo = all.filter((g) => !g.members.some((m) => m.h.english?.text));
  const work = todo.slice(0, limit).map((g) => ({
    key: g.key,
    saint: g.members[0].name,
    // Every tradition's own text, so the person writing the English is
    // reading all of them and can see whether they are one hymn or two.
    sources: g.members.map((m) => ({
      church: m.h.church,
      lang: m.h.lang,
      tone: m.h.tone,
      text: m.h.text,
    })),
    english: { text: '', rendered: 'site' },
  }));
  const out = opt('--out', null);
  const json = JSON.stringify(work, null, 2);
  if (out) {
    fs.writeFileSync(path.join(ROOT, out), json);
    console.log(`${work.length} group(s) → ${out}`);
  } else {
    console.log(json);
  }
  console.log(`\n${todo.length} of ${all.length} distinct hymns still have no English.`);
  process.exit(0);
}

if (has('--write')) {
  const file = opt('--write', null) ?? args.find((a) => a.endsWith('.json'));
  if (!file) {
    console.error('give the work file: --write work.json');
    process.exit(1);
  }
  const dry = has('--dry');
  const work = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const g = groups();
  let wrote = 0;
  let objects = 0;
  const problems = [];
  const touched = new Map();

  for (const entry of work) {
    const text = entry.english?.text?.trim();
    if (!text) continue;
    const group = g.get(entry.key);
    if (!group) {
      problems.push(`no such hymn: ${entry.key}`);
      continue;
    }
    // The English the person wrote, and how it came to be: a rendering made
    // here says so, a copied one names its book. One or the other, never both
    // and never neither — `ui/hymns.js` prints a different line for each.
    const english = { text };
    if (entry.english.source) english.source = entry.english.source;
    else english.rendered = 'site';
    if (entry.english.source && entry.english.rendered) {
      problems.push(`${entry.key}: both a source and 'rendered'`);
      continue;
    }
    /*
     * **A group may hold two hymns, and the tone cannot tell.** Adrian of
     * Nicomedia's tone-4 kontakia are the hymn for him and Natalia in Romanian
     * and Slavonic *and* a general kontakion of the martyrs, all in mode 4 —
     * three objects, two hymns. `only` is the list of source indices an entry
     * answers for, so the file splits a group by carrying two entries with the
     * same key and different `only`. Absent, an entry answers for all of them,
     * which is the ordinary case.
     */
    const only = Array.isArray(entry.only) ? entry.only : null;
    const members = only ? only.map((i) => group.members[i]).filter(Boolean) : group.members;
    if (only && members.length !== only.length) {
      problems.push(`${entry.key}: 'only' names a source that is not there`);
      continue;
    }
    for (const m of members) {
      const saint = touched.get(m.file) ?? JSON.parse(fs.readFileSync(m.file, 'utf8'));
      saint.hymns[m.i].english = english;
      touched.set(m.file, saint);
      objects += 1;
    }
    wrote += 1;
  }

  for (const p of problems) console.log(`  ! ${p}`);
  console.log(`${wrote} hymn(s) → ${objects} hymn object(s) in ${touched.size} folder(s)`);
  if (problems.length) {
    console.log('refusing to write with problems above');
    process.exit(1);
  }
  if (dry) {
    console.log('dry run: nothing written. --write without --dry to apply.');
    process.exit(0);
  }
  for (const [file, saint] of touched) fs.writeFileSync(file, `${JSON.stringify(saint, null, 2)}\n`);
  console.log('written');
  process.exit(0);
}

console.log('usage: --emit [--limit N] [--out work.json]  |  --write work.json [--dry]');
