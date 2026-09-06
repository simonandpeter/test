#!/usr/bin/env node
/**
 * Which of the automatic cross-links belong in a saint's `related` list.
 *
 * `node scripts/related-from-links.mjs`   (needs `npm run build:manifest` first)
 * `node scripts/related-from-links.mjs --write`  applies the accepted ones
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
 */
import fs from 'node:fs';
import path from 'node:path';

import { buildNameIndex, matchableName } from '../src/lib/cross-link.js';

const WRITE = process.argv.includes('--write');

const manifest = JSON.parse(fs.readFileSync('data/manifest.json', 'utf8'));
const saints = manifest.saints ?? manifest;
const { bySlug, pattern } = buildNameIndex(saints);
if (!pattern) {
  console.log('no name index; run npm run build:manifest');
  process.exit(0);
}

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
 */
const NAMED_FOR =
  'church|chapel|cathedral|monastery|convent|lavra|skete|parish|abbey|hermitage|seminary|academy|brotherhood|society|feast|temple|altar|shrine|icon|hospital|almshouse|school';
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
  for (const m of text.matchAll(pattern)) {
    const form = m[0];
    const slug = bySlug.get(form);
    if (!slug || slug === dir || form === ownForm || seen.has(slug)) continue;
    seen.add(slug);
    const before = text.slice(Math.max(0, m.index - 60), m.index);
    const after = text.slice(m.index + form.length, m.index + form.length + 30);
    const dedication = BEFORE.test(before) || AFTER.test(after);
    rows.push({ dir, form, slug, dedication, quote: (before.slice(-45) + `«${form}»` + after).replace(/\s+/g, ' ').trim() });
  }
}

const already = new Map();
for (const dir of fs.readdirSync('saints')) {
  const file = path.join('saints', dir, 'saint.json');
  if (!fs.existsSync(file)) continue;
  already.set(dir, new Set(JSON.parse(fs.readFileSync(file, 'utf8')).related ?? []));
}

const refused = (r) => REFUSED.has(`${r.dir} -> ${r.slug}`);
const proposed = rows.filter((r) => !r.dedication && !refused(r) && !already.get(r.dir)?.has(r.slug));
const held = rows.filter((r) => r.dedication || refused(r));
const have = rows.filter((r) => !r.dedication && already.get(r.dir)?.has(r.slug));

console.log(`links in lives            : ${rows.length}`);
console.log(`already in related        : ${have.length}`);
console.log(`set aside, dedication or refused : ${held.length}`);
console.log(`proposed                  : ${proposed.length}\n`);

console.log('-- proposed ------------------------------------------------------');
for (const r of proposed) console.log(`  ${r.dir}\n      -> ${r.slug}   ${r.quote}`);
console.log('\n-- set aside as a dedication, read these ------------------------');
for (const r of held) console.log(`  ${r.dir}\n      -> ${r.slug}   ${r.quote}`);

if (!WRITE) {
  console.log('\nNothing written. Read the rows above, then --write.');
  process.exit(0);
}

const grouped = new Map();
for (const r of proposed) {
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
