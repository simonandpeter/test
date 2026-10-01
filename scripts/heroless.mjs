/*
 * The work list for the images, stated the way the author's instruction states
 * it: "all main saint cards for each day and each calendar has an image in its
 * profile" (2026-08-28, quoted in `lib/calendar-page.js`). So the unit is a
 * day-and-church whose **hero** carries no image, and the product is the hero's
 * slug — not every imageless folder, which is thousands and not what a reader
 * meets.
 *
 * The hero is `pickHero`'s, read from the manifest rather than guessed, so this
 * says what the page would show today.
 *
 * usage: node scripts/heroless.mjs [church …]   (default: all four)
 *        node scripts/heroless.mjs --counts
 */
import { readFileSync } from 'node:fs';
import { pickHero } from '../src/lib/calendar-page.js';
import { feastIndex, onCivilDay, readCorpus, CHURCH_IDS } from './corpus-index.mjs';

const MANIFEST = JSON.parse(readFileSync(new URL('../data/manifest.json', import.meta.url), 'utf8'));
const bySlug = new Map(MANIFEST.map((c) => [c.slug, c]));
const FEASTS = feastIndex(readCorpus());

const args = process.argv.slice(2);
const countsOnly = args.includes('--counts');
const churches = args.filter((a) => !a.startsWith('--'));
const want = churches.length ? churches : CHURCH_IDS;

const days = [];
for (const d = new Date('2026-01-01'); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
  days.push(d.toISOString().slice(0, 10));
}

for (const church of want) {
  const gaps = [];
  let withEntries = 0;
  for (const iso of days) {
    const entries = onCivilDay(FEASTS, church, iso).map((s) => ({ slug: s.slug ?? s }));
    if (entries.length === 0) continue;
    withEntries += 1;
    const hero = pickHero(iso, entries, bySlug, church);
    if (hero && !bySlug.get(hero)?.image) gaps.push({ iso, hero });
  }
  const distinct = new Set(gaps.map((g) => g.hero));
  console.log(
    `${church}: ${gaps.length} of ${withEntries} days lead with an imageless hero, ${distinct.size} distinct saints`,
  );
  if (countsOnly) continue;
  const byHero = new Map();
  for (const g of gaps) byHero.set(g.hero, [...(byHero.get(g.hero) ?? []), g.iso]);
  for (const [hero, isos] of [...byHero].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${hero}\t${isos.join(' ')}`);
  }
}
