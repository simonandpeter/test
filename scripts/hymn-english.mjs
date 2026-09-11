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
/*
 * **The standing English for the formulas**, so that a hymn rendered in one
 * sitting and the same formula rendered in another come out as one text. The
 * commons are most of what is left — one troparion of a martyr sung for each
 * martyr in turn — and `mergeForReading` keys on the rendered English, so two
 * wordings of one formula are two hymns to the page. Anyone filling a work
 * file, person or agent, is given this list:
 *
 * | original | English |
 * | --- | --- |
 * | моли Христа Бога спастися душам нашим / πρέσβευε Χριστῷ τῷ Θεῷ σωθῆναι τὰς ψυχὰς ἡμῶν / roagă-te lui Hristos Dumnezeu să mântuiască sufletele noastre | Pray to Christ God that our souls may be saved. |
 * | спаси души наша | save our souls |
 * | Слава Давшему тебе крепость, слава Венчавшему тя, слава Действующему тобою всем исцеления | Glory to him who gave thee strength; glory to him who crowned thee; glory to him who works healings for all through thee. |
 * | преподобне отче | O venerable father |
 * | богомудре | O thou of godly wisdom |
 * | страстотерпче | O passion-bearer |
 * | священномучениче | O hieromartyr |
 *
 * And the register: traditional liturgical English — thou, thee, thy, verbs in
 * -est and -eth — because that is what the corpus's existing renderings and
 * its two cited books are in, and a modern-English hymn beside an Orloff
 * citation would read as two different sites.
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

/*
 * **The same text under two saints is one rendering.** 29 of the source texts
 * still lacking an English appear under more than one saint — the commons do,
 * by construction: one troparion of a martyr, sung for each martyr in turn, and
 * the six martyrs of Tomis share a Romanian text between them. Rendered per
 * hymn they would come out six slightly different ways, which is the same
 * defect the author called double-ups arriving from the other direction.
 *
 * So `--emit-texts` emits the distinct *texts*, each naming every hymn it
 * belongs to, and `--write-texts` applies one English to all of them. 240
 * hymns are 202 texts.
 */
const normText = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/*
 * **Hymns filed under the wrong saint, held out of the rendering.** A scrape
 * that ran over a day boundary put the Beheading of the Forerunner's Romanian
 * hymns under the patriarchs kept the following day, and the Archangel's
 * Serbian troparion under Alexander Nevsky. A correct translation of the wrong
 * hymn is still a false claim, and removing cited corpus data is the author's
 * call, so these sit in `scripts/hymn-wrong-saint.json` and are skipped here
 * rather than deleted.
 *
 * **Keyed on the saint as well as the text, which is the whole point.** The
 * Forerunner's troparion is correctly filed under him too, and `--write-texts`
 * applies a rendering to every object carrying the text — which is how the
 * English for it reached the two patriarchs' folders in 8a6e080 without anyone
 * choosing that. The key here is `slug` + text, so the hymn is still rendered
 * where it belongs and only the misfiled rows are passed over.
 */
const HELD = new Map();
for (const h of JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/hymn-wrong-saint.json'), 'utf8'))) {
  HELD.set(`${h.slug} ${normText(h.text)}`, h.why);
}
const heldOut = (slug, text) => HELD.has(`${slug} ${normText(text)}`);

if (has('--emit-texts')) {
  const limit = Number(opt('--limit', '0')) || Infinity;
  const skip = Number(opt('--skip', '0')) || 0;
  const byText = new Map();
  for (const g of groups().values()) {
    for (const m of g.members) {
      if (m.h.english?.text) continue;
      if (heldOut(g.slug, m.h.text)) continue;
      const k = normText(m.h.text);
      if (!byText.has(k)) byText.set(k, { text: m.h.text, church: m.h.church, lang: m.h.lang, tone: m.h.tone, saints: [] });
      byText.get(k).saints.push(`${g.key} [${m.h.church}]`);
    }
  }
  const all = [...byText.values()];
  const work = all.slice(skip, skip + limit).map((t) => ({
    lang: t.lang,
    church: t.church,
    tone: t.tone,
    saints: t.saints,
    text: t.text,
    english: '',
  }));
  const out = opt('--out', null);
  const json = JSON.stringify(work, null, 2);
  if (out) fs.writeFileSync(path.join(ROOT, out), json);
  else console.log(json);
  console.log(`${work.length} text(s)${out ? ` → ${out}` : ''}; ${all.length} distinct texts still lack an English.`);
  process.exit(0);
}

if (has('--write-texts')) {
  const file = opt('--write-texts', null);
  const dry = has('--dry');
  const work = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const wanted = new Map();
  for (const e of work) {
    const english = String(e.english ?? '').trim();
    if (english) wanted.set(normText(e.text), english);
  }
  const touched = new Map();
  let objects = 0;
  let skipped = 0;
  for (const g of groups().values()) {
    for (const m of g.members) {
      if (m.h.english?.text) continue;
      if (heldOut(g.slug, m.h.text)) {
        skipped += 1;
        continue;
      }
      const english = wanted.get(normText(m.h.text));
      if (!english) continue;
      const saint = touched.get(m.file) ?? JSON.parse(fs.readFileSync(m.file, 'utf8'));
      saint.hymns[m.i].english = { text: english, rendered: 'site' };
      touched.set(m.file, saint);
      objects += 1;
    }
  }
  console.log(`${wanted.size} text(s) → ${objects} hymn object(s) in ${touched.size} folder(s)`);
  if (skipped) console.log(`${skipped} object(s) passed over: filed under the wrong saint, see scripts/hymn-wrong-saint.json`);
  if (dry) {
    console.log('dry run: nothing written.');
    process.exit(0);
  }
  for (const [f, saint] of touched) fs.writeFileSync(f, `${JSON.stringify(saint, null, 2)}
`);
  console.log('written');
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
