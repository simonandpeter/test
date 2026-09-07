#!/usr/bin/env node
/**
 * Which of the automatic cross-links belong in a saint's `related` list.
 *
 * `node scripts/related-from-links.mjs`   (needs `npm run build:manifest` first)
 * `node scripts/related-from-links.mjs --write`         applies the accepted exact matches
 * `node scripts/related-from-links.mjs --write --write-loose`   also applies the loose ones
 *
 * **Proposes; the reading is the work**, the same standing as
 * `place-candidates.mjs`. A hyperlink and a related saint are different
 * claims and the difference is the whole reason this exists: `cross-link.js`
 * links every name it recognises in a life, which is right — a reader who
 * meets "Alexander Nevsky" should be able to go and read about him — but
 * `related` says *these two saints have to do with each other*, and
 * "he was ordained at the Alexander Nevsky Lavra" says nothing of the kind.
 *
 * Twenty-three of the first 86 links were exactly that: a monastery, a lavra,
 * a cathedral or a parish church named for a saint the priest never met, often
 * eight centuries after; a feast day; a warship. Carried into `related` unread
 * they would have made Alexander Nevsky the associate of six twentieth-century
 * martyrs and John the Theologian the associate of five more.
 *
 * So every link is printed with the words around it, and the ones that read as
 * a dedication are set aside rather than proposed. That test is deliberately
 * generous in the direction of setting aside: a link wrongly held back costs a
 * `related` entry somebody can add by hand, and a link wrongly proposed costs
 * a claim about two people.
 *
 * **Two tiers, not one.** `cross-link.js`'s own index — reused here unchanged,
 * so a "found in `related-from-links`" row is always a form the live site
 * would also link — only matches a saint's display name exactly. That missed
 * a real relation: John the Long-Suffering's own life says he prayed at "the
 * relics of Anthony of the Caves", and the folder is `Anthony of the Kyiv
 * Caves` — one word short of the corpus's own canonical form, and invisible to
 * an exact match. A life is translated prose, not a database key, and it drops
 * an interior qualifier ("Kyiv", "the Great", a patronymic) more often than a
 * spot check would suggest.
 *
 * The **loose** tier (`looseVariants`) tries every form of a display name with
 * one interior word missing — and, past four words, two consecutive ones — so
 * "Anthony of the Kyiv Caves" also answers to "Anthony of the Caves" and
 * "Anthony of the Kyiv" (the latter unusable on its own merits, since nothing
 * in a corpus this size should be matched two words short of its own name
 * without both anchors surviving). A variant that lands on another saint's own
 * exact form, or on two different saints' own loose forms, names nobody rather
 * than guessing between them — the same poisoning `buildNameIndex` already
 * does for a form two folders share. Loose rows are printed apart, under a
 * heading that says to read them twice, and `--write` alone never applies
 * them: `--write-loose` has to be asked for by name, because a dropped word is
 * a real inference this script is making about what a life meant, where an
 * exact match only ever reports what the life actually wrote.
 */
import fs from 'node:fs';
import path from 'node:path';

import { buildNameIndex, matchableName, usableName } from '../src/lib/cross-link.js';

const WRITE = process.argv.includes('--write');
const WRITE_LOOSE = process.argv.includes('--write-loose');

const manifest = JSON.parse(fs.readFileSync('data/manifest.json', 'utf8'));
const saints = manifest.saints ?? manifest;
const { bySlug, pattern } = buildNameIndex(saints);
if (!pattern) {
  console.log('no name index; run npm run build:manifest');
  process.exit(0);
}

/**
 * Every way to write `form` one interior word short. The first and last word
 * are always kept — they carry the given name and the anchor that makes the
 * shorter form still recognisable — so only words strictly between them are
 * ever dropped, one at a time, and (past four words, where a single drop still
 * leaves three) two consecutive ones as well.
 */
function looseVariants(form) {
  const words = form.trim().split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 1; i < words.length - 1; i += 1) {
    out.add([...words.slice(0, i), ...words.slice(i + 1)].join(' '));
  }
  if (words.length >= 5) {
    for (let i = 1; i < words.length - 2; i += 1) {
      out.add([...words.slice(0, i), ...words.slice(i + 2)].join(' '));
    }
  }
  out.delete(form);
  return [...out].filter(usableName);
}

/**
 * `looseBySlug`: a variant form to the one slug it names, or `null` once a
 * second claimant is found — a variant that collides with anything, another
 * saint's own exact form or a second saint's own loose one, is unusable
 * precisely because a reader meeting it in a life could not tell which was
 * meant either.
 */
const looseBySlug = new Map();
for (const saint of saints) {
  const own = matchableName(saint.display_name);
  if (!usableName(own)) continue;
  for (const variant of looseVariants(own)) {
    if (bySlug.has(variant)) {
      looseBySlug.set(variant, null);
      continue;
    }
    const claimant = looseBySlug.get(variant);
    if (claimant === undefined) looseBySlug.set(variant, saint.slug);
    else if (claimant !== saint.slug) looseBySlug.set(variant, null);
  }
}
const looseForms = [...looseBySlug.entries()]
  .filter(([, slug]) => slug)
  .map(([form]) => form)
  .sort((a, b) => b.length - a.length);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const loosePattern = looseForms.length
  ? new RegExp(`(?<!\\p{L})(${looseForms.map(escape).join('|')})(?!\\p{L})`, 'gu')
  : null;

/**
 * The words that turn a saint's name into a building's — or into a date.
 *
 * **Adjacency, not proximity**, and the difference was a real false positive.
 * The first version looked for the word anywhere in the forty characters
 * before the name, and set aside "of the Trinity-Sergius monastery, sent with
 * Andrew Oslyabya to the battle by Sergius of Radonezh" — the one relationship
 * in the corpus nobody would want to lose, two monks sent to Kulikovo
 * together. A dedication runs straight into the name: the word, then at most
 * "of", "of the", or "of St".
 *
 * `Lavra`, `Skete` and `Podvorye` are looked for *after* the name as well,
 * since Russian usage puts them there — "the Alexander Nevsky Lavra" rather
 * than "the Lavra of Alexander Nevsky".
 *
 * `feast` is in the list for the same reason as the buildings: "he died on the
 * feast of Alexander Nevsky" dates a death and relates nobody.
 *
 * **A feast's own name reads the same way**, and the loose tier found the gap:
 * "the church of the Nativity of John the Forerunner" and "the Beheading of
 * John the Forerunner" both name a building or a commemoration, not a meeting,
 * and neither is a monastery or a lavra for the first NAMED_FOR list to catch
 * — the word standing in front of the name is the feast's own title. The
 * Slavic calendar's own commonest ones are listed rather than guessed at.
 *
 * **`protection` and `intercession` are left out on purpose**, having gone in
 * and straight back out: both name the Pokrov feast in a church's title, but
 * both are also ordinary English for a saint's patronage — "she put herself
 * under the protection of", "with the intercession of" — and the run that
 * added them promptly hid a real relation (Nicholas of Alma-Ata "served
 * afterwards under the protection of Theodosius of Chernigov, whom he
 * honoured greatly") behind a feast that sentence was never naming.
 */
const NAMED_FOR =
  'church|chapel|cathedral|monastery|convent|lavra|skete|parish|abbey|hermitage|seminary|academy|brotherhood|society|feast|temple|altar|shrine|icon|hospital|almshouse|school|' +
  'nativity|dormition|beheading|annunciation|transfiguration|presentation|entrance|ascension|assumption|exaltation|elevation|resurrection|epiphany|theophany';
const BEFORE = new RegExp(`\\b(?:${NAMED_FOR})\\b(?:\\s+of)?(?:\\s+the)?(?:\\s+(?:St|Saint|Ss)\\.?)?\\s*$`, 'i');
/*
 * Plural, and `chapel`, because both were read off the first run: "sent
 * travelling, to the Trinity and Alexander Nevsky lavras" and "buried in a
 * vault made in the John Chrysostom chapel" were proposed as relationships.
 * A dedication is a dedication in the plural too.
 */
const AFTER =
  /^\s*(lavra|monastery|convent|cathedral|church|chapel|skete|podvorye|seminary|academy|hermitage)s?\b/i;

/**
 * The ones a reading refused, which no rule was going to catch.
 *
 * Amendment 44's lesson about the hymn matching, in a second place: **the
 * matching is a table rather than a rule.** `BEFORE` and `AFTER` above catch
 * the shape "the church of X"; nothing catches a battleship named for a saint,
 * and nothing should try. Each row says why it is here, and a row removed from
 * this table is a claim proposed again on the next run.
 */
const REFUSED = new Set([
  // A warship of the Black Sea Fleet, the *Sviatoi Ioann Zlatoust*, whose
  // mutiny of 1912 Roman Medved calmed. A dedication like any church's.
  'roman-medved -> john-chrysostom',
  // Not a meeting but a quotation — "God is not in strength but in truth",
  // said seven centuries before Nicholas of Alma-Ata repeated it to his flock.
  'nicholas-of-alma-ata -> alexander-nevsky',
]);

const already = new Map();
for (const dir of fs.readdirSync('saints')) {
  const file = path.join('saints', dir, 'saint.json');
  if (!fs.existsSync(file)) continue;
  already.set(dir, new Set(JSON.parse(fs.readFileSync(file, 'utf8')).related ?? []));
}

const rows = [];
for (const dir of fs.readdirSync('saints')) {
  const file = path.join('saints', dir, 'life.md');
  if (!fs.existsSync(file)) continue;
  const text = fs
    .readFileSync(file, 'utf8')
    .replace(/^#[^\n]*\n/, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '');
  const own = saints.find((s) => s.slug === dir);
  // The same three refusals `cross-link-audit.mjs` makes, in its own words:
  // the saint's own form, an unusable one, and a slug already met in this life.
  const ownForm = own ? matchableName(own.display_name) : null;
  const seen = new Set();

  const scan = (rx, kind) => {
    if (!rx) return;
    rx.lastIndex = 0;
    for (const m of text.matchAll(rx)) {
      const form = m[0];
      const slug = kind === 'exact' ? bySlug.get(form) : looseBySlug.get(form);
      if (!slug || slug === dir || form === ownForm || seen.has(slug)) continue;
      seen.add(slug);
      const before = text.slice(Math.max(0, m.index - 60), m.index);
      const after = text.slice(m.index + form.length, m.index + form.length + 30);
      const dedication = BEFORE.test(before) || AFTER.test(after);
      rows.push({
        dir,
        form,
        slug,
        kind,
        dedication,
        quote: (before.slice(-45) + `«${form}»` + after).replace(/\s+/g, ' ').trim(),
      });
    }
  };
  scan(pattern, 'exact');
  scan(loosePattern, 'loose');
}

const refused = (r) => REFUSED.has(`${r.dir} -> ${r.slug}`);
const proposed = rows.filter((r) => !r.dedication && !refused(r) && !already.get(r.dir)?.has(r.slug));
const held = rows.filter((r) => r.dedication || refused(r));
const have = rows.filter((r) => !r.dedication && already.get(r.dir)?.has(r.slug));

const exactProposed = proposed.filter((r) => r.kind === 'exact');
const looseProposed = proposed.filter((r) => r.kind === 'loose');

console.log(`links in lives                   : ${rows.length} (${rows.filter((r) => r.kind === 'loose').length} loose)`);
console.log(`already in related               : ${have.length}`);
console.log(`set aside, dedication or refused : ${held.length}`);
console.log(`proposed, exact                  : ${exactProposed.length}`);
console.log(`proposed, loose — read twice     : ${looseProposed.length}\n`);

console.log('-- proposed, exact -------------------------------------------------');
for (const r of exactProposed) console.log(`  ${r.dir}\n      -> ${r.slug}   ${r.quote}`);
console.log('\n-- proposed, loose (a word was dropped to match) — read twice -----');
for (const r of looseProposed) console.log(`  ${r.dir}\n      -> ${r.slug}   ${r.quote}`);
console.log('\n-- set aside as a dedication, read these ----------------------------');
for (const r of held) console.log(`  ${r.dir}\n      -> ${r.slug}   ${r.quote}`);

if (!WRITE) {
  console.log('\nNothing written. Read the rows above, then --write (add --write-loose for the loose tier too).');
  process.exit(0);
}

const toWrite = WRITE_LOOSE ? proposed : exactProposed;
if (!WRITE_LOOSE && looseProposed.length) {
  console.log(`\n${looseProposed.length} loose row(s) read but not written — pass --write-loose to include them.`);
}

const grouped = new Map();
for (const r of toWrite) {
  if (!grouped.has(r.dir)) grouped.set(r.dir, new Set());
  grouped.get(r.dir).add(r.slug);
}
let touched = 0;
for (const [dir, slugs] of grouped) {
  const file = path.join('saints', dir, 'saint.json');
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const next = [...new Set([...(d.related ?? []), ...slugs])].sort();
  if (JSON.stringify(next) === JSON.stringify(d.related ?? [])) continue;
  d.related = next;
  fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
  touched += 1;
}
console.log(`\nwrote ${touched} folders.`);
