/**
 * What to look at before a rendering goes into the corpus.
 *
 * It proves nothing about whether a translation is *right* — only a reading
 * against the original does that, and this exists to say which ones most need
 * one. The failure modes it can see are the mechanical ones: an entry left
 * empty, a clause dropped, a paraphrase padded out, the chant's slashes left
 * in, a placeholder, or a formula rendered two different ways in two files
 * when the whole point of rendering by text was that it would not be.
 *
 *   node scripts/hymn-check.mjs scratchpad/hymn-slice-*.json
 */
import fs from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) {
  console.log('usage: node scripts/hymn-check.mjs <slice.json> [...]');
  process.exit(1);
}

/*
 * **The ratio is the instrument, and the band is measured rather than guessed.**
 * Across the 163 renderings already in the corpus, characters of English per
 * character of source:
 *
 * | source | n | min | median | max |
 * | --- | ---: | ---: | ---: | ---: |
 * | Church Slavonic | 56 | 0.90 | 1.23 | 1.54 |
 * | Greek | 41 | 1.06 | 1.22 | 1.59 |
 * | Romanian | 55 | 0.85 | 1.04 | 1.30 |
 * | Serbian | 11 | 1.13 | 1.31 | 1.47 |
 *
 * So the whole corpus sits between 0.85 and 1.59, and Romanian runs shortest
 * because it is already an analytic language where Slavonic packs a clause
 * into a compound. The bounds below sit just outside the observed range: a row
 * outside them is not a defect, it is the row to read first. Written after
 * this file first carried a guessed band of 0.8 to 2.4, which would have
 * flagged nothing the corpus has ever contained.
 */
const LOW = 0.8;
const HIGH = 1.7;

const rows = [];
let total = 0;
let filled = 0;
const byEnglish = new Map();

for (const file of files) {
  const work = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [i, e] of work.entries()) {
    total += 1;
    const en = String(e.english ?? '').trim();
    const src = String(e.text ?? '').replace(/\s+/g, ' ').trim();
    const where = `${file}[${i}] ${e.lang}`;
    if (!en) {
      rows.push(['EMPTY', where, '']);
      continue;
    }
    filled += 1;
    const ratio = en.length / Math.max(1, src.length);
    if (ratio < LOW) rows.push(['SHORT', where, `${ratio.toFixed(2)}× — a clause may be missing`]);
    if (ratio > HIGH) rows.push(['LONG', where, `${ratio.toFixed(2)}× — padded, or the source is Slavonic`]);
    if (/[/\\]{1,2}/.test(en)) rows.push(['SLASH', where, 'chant line marks left in the English']);
    if (/\b(TODO|TBD|lorem|placeholder|untranslated)\b/i.test(en)) rows.push(['STUB', where, en.slice(0, 60)]);
    // Cyrillic or Greek left in an English rendering.
    if (/[Ѐ-ӿͰ-Ͽ]/.test(en)) rows.push(['UNTRANSLATED', where, 'source script in the English']);
    const key = en.replace(/\s+/g, ' ').toLowerCase();
    if (!byEnglish.has(key)) byEnglish.set(key, []);
    byEnglish.get(key).push(where);
  }
}

/*
 * **The same English under two different originals** is the one finding here
 * that is usually real: either two texts genuinely are one hymn, in which case
 * the corpus should say so, or a rendering has been copied onto the wrong row.
 */
for (const [, where] of [...byEnglish].filter(([, w]) => w.length > 1)) {
  rows.push(['SAME', where.join(' + '), 'one English under two different originals']);
}

for (const [kind, where, note] of rows) console.log(`  ${kind.padEnd(13)} ${where}  ${note}`);
console.log(`\n${filled} of ${total} filled; ${rows.length} row(s) to read.`);
process.exit(rows.some(([k]) => k === 'EMPTY' || k === 'STUB' || k === 'UNTRANSLATED') ? 1 : 0);
