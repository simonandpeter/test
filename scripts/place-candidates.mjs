/**
 * Which unlocated saints their own lives already place, and where.
 *
 * Author, 2026-09-01: "research more location information for everyone."
 * There are 793 saints with no coordinate, and going out to find a place for
 * each of them one search at a time is the slowest possible way to do it —
 * because for a great many the place is *already in the repository*. The
 * lives were written from sources that named towns; the coordinate was
 * simply never added beside the prose.
 *
 * **This proposes; it never writes.** A place named in a life is a candidate
 * and not a finding: "he was sent to Rome" is not "he died at Rome", and the
 * gazetteer's `Antioch` matches a sentence about Antioch in Pisidia as
 * happily as one about Antioch on the Orontes. So the output is the saint,
 * the matched name, and the sentence it was matched in — enough to decide
 * from, and never enough to skip reading. Amendment 86's rule holds: no
 * point beats a wrong one.
 *
 * Two corpora are matched against, and both are already in the repository:
 * `src/data/places.js`, the map's own hand-written gazetteer, and every
 * coordinate a located saint already carries, keyed by its `modern_name` and
 * `historical_name`. The second is the more useful of the two — it is where
 * Nicomedia, Sirmium, Gortyna and the Kyiv Caves live, with the exact
 * coordinates a colleague already checked.
 *
 *   node scripts/place-candidates.mjs                every candidate
 *   node scripts/place-candidates.mjs --limit 40
 *   node scripts/place-candidates.mjs --place Nicomedia
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { PLACES } from '../src/data/places.js';

const SAINTS = path.join(process.cwd(), 'saints');

/** Every place name the repository already knows a coordinate for. */
function knownPlaces() {
  const known = new Map();
  const add = (name, where) => {
    const key = name?.trim();
    if (!key || key.length < 4) return;
    if (!known.has(key.toLowerCase())) known.set(key.toLowerCase(), { name: key, ...where });
  };
  /*
   * Towns only, out of the gazetteer. Its countries and regions are there so
   * a reader can fly to Romania, and they match the phrase "the Romanian
   * calendar" in every life that cites one — noise on a scale that buries
   * the signal, and useless as a candidate anyway: a dot for "Persia" is a
   * two-thousand-kilometre halo saying nothing. `zoom` is what tells them
   * apart, being sized to what the place actually is.
   */
  for (const place of PLACES) {
    if (place.zoom < 20) continue;
    add(place.name, { lon: place.lon, lat: place.lat, from: 'gazetteer' });
    for (const alias of place.also ?? []) add(alias, { lon: place.lon, lat: place.lat, from: 'gazetteer' });
  }
  for (const dir of readdirSync(SAINTS, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    const file = path.join(SAINTS, dir.name, 'saint.json');
    if (!existsSync(file)) continue;
    const saint = JSON.parse(readFileSync(file, 'utf8'));
    for (const loc of saint.locations ?? []) {
      if (typeof loc.lat !== 'number') continue;
      const where = { lon: loc.lon, lat: loc.lat, from: `corpus (${saint.slug})`, uncertainty_km: loc.uncertainty_km };
      // The bare town, not "Kyiv Pechersk Lavra, Ukraine" — a life says
      // "Kyiv", and matching the whole administrative string would match
      // nothing at all.
      for (const name of [loc.modern_name, loc.historical_name]) {
        if (!name) continue;
        add(name, where);
        for (const part of name.split(',')) add(part, where);
      }
    }
  }
  return known;
}

/**
 * A life without its own citation line. Every life ends with an italic
 * *After the ...* naming the calendar it was read from, and those lines
 * name places — Ohrid, Constantinople — that are facts about the *source*
 * and not about the saint. Matching them proposed the Ohrid Prologue's own
 * town for a martyr of Rome.
 */
const prose = (text) => text.split('\n*After')[0];

/** The sentence a match sits in, trimmed to something readable. */
function sentenceAround(text, index) {
  const start = Math.max(0, text.lastIndexOf('.', index - 1) + 1);
  const stop = text.indexOf('.', index);
  return text
    .slice(start, stop === -1 ? text.length : stop + 1)
    .replace(/\s+/g, ' ')
    .trim();
}

function candidates() {
  const known = knownPlaces();
  const names = [...known.values()].map((p) => p.name).sort((a, b) => b.length - a.length);
  const out = [];

  for (const dir of readdirSync(SAINTS, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    const file = path.join(SAINTS, dir.name, 'saint.json');
    if (!existsSync(file)) continue;
    const saint = JSON.parse(readFileSync(file, 'utf8'));
    if ((saint.locations ?? []).some((l) => typeof l.lat === 'number')) continue;

    const life = path.join(SAINTS, dir.name, saint.text?.life ?? 'life.md');
    const text = prose(existsSync(life) ? readFileSync(life, 'utf8') : '');
    const hits = [];
    const seen = new Set();
    for (const name of names) {
      // Whole words: `Hippo` inside `Hippolytus` proposed Roman Africa for a
      // martyr of Rome, which is the shape of every false positive here.
      const at = text.search(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
      if (at === -1) continue;
      const place = known.get(name.toLowerCase());
      const key = `${place.lon},${place.lat}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ name, place, sentence: sentenceAround(text, at) });
      if (hits.length === 3) break;
    }
    if (hits.length) out.push({ slug: saint.slug, name: saint.display_name, hits });
  }
  return out;
}

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const filter = args.includes('--place') ? args[args.indexOf('--place') + 1].toLowerCase() : null;

let rows = candidates();
if (filter) rows = rows.filter((r) => r.hits.some((h) => h.name.toLowerCase().includes(filter)));

console.log(`${rows.length} unlocated saints whose own life names a place this repository can already place\n`);
for (const row of rows.slice(0, limit)) {
  console.log(`${row.slug}  (${row.name})`);
  for (const hit of row.hits) {
    console.log(`   ${hit.name} ${hit.place.lon},${hit.place.lat}  [${hit.place.from}]`);
    console.log(`     "${hit.sentence.slice(0, 160)}"`);
  }
  console.log('');
}
if (rows.length > limit) console.log(`… and ${rows.length - limit} more`);
