/**
 * Every link the automatic cross-linker would make, across the whole corpus.
 *
 * `node scripts/cross-link-audit.mjs`   (needs `npm run build:manifest` first)
 *
 * This is how `lib/cross-link.js`'s four rules were arrived at, and it is the
 * check to run whenever the corpus grows or a rule is loosened: a wrong link in
 * a life is a claim that two people are one person, which is the error this
 * corpus spends most of its care avoiding. The rules were narrowed until every
 * proposed link was right, which on 2026-08-26 was 18 links across 742 lives.
 *
 * It reads the same index the runtime builds and applies the two things the
 * runtime does that a raw scan would not: the leading heading is stripped
 * before rendering, and text already inside a hand-written link is an <a> that
 * the DOM walker refuses to enter.
 *
 * Read the output. A name you do not recognise as belonging to the saint whose
 * life it is in is the whole point of the exercise.
 */
import fs from 'node:fs';
import path from 'node:path';

import { buildNameIndex, matchableName } from '../src/lib/cross-link.js';

const manifest = JSON.parse(fs.readFileSync('data/manifest.json', 'utf8'));
const saints = manifest.saints ?? manifest;
const { bySlug, pattern } = buildNameIndex(saints);

const usable = [...bySlug.entries()].filter(([, slug]) => slug);
const shared = [...bySlug.entries()].filter(([, slug]) => !slug).map(([form]) => form);
console.log(`forms the linker will match : ${usable.length} of ${saints.length} folders`);
console.log(`forms two saints share      : ${shared.length}  (${shared.join(' | ')})`);
if (!pattern) process.exit(0);

let lives = 0;
const links = [];
for (const dir of fs.readdirSync('saints')) {
  const file = path.join('saints', dir, 'life.md');
  if (!fs.existsSync(file)) continue;
  lives += 1;
  const text = fs
    .readFileSync(file, 'utf8')
    .replace(/^#[^\n]*\n/, '')            // the heading the renderer strips
    .replace(/\[[^\]]*\]\([^)]*\)/g, ''); // already a link, so already an <a>
  const own = saints.find((s) => s.slug === dir);
  const ownForm = own ? matchableName(own.display_name) : null;
  const seen = new Set();
  pattern.lastIndex = 0;
  for (const m of text.matchAll(pattern)) {
    const form = m[1];
    const slug = bySlug.get(form);
    if (!slug || form === ownForm || seen.has(slug)) continue;
    seen.add(slug);
    links.push(`${dir}: "${form}" -> ${slug}`);
  }
}

console.log(`\nlives scanned               : ${lives}`);
console.log(`links the reader would get  : ${links.length}\n`);
for (const line of links.sort()) console.log('  ' + line);
