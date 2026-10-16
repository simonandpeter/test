/**
 * The subset of `place-candidates.mjs` a batch may actually write tonight.
 *
 * Three narrowings, and each one is about a way the wider sweep is wrong
 * rather than merely noisy.
 *
 * A saint the corpus cannot date joins `tests/map-span.test.mjs`'s `UNDATED`
 * allowlist the moment it gets a coordinate, and that list is a decision with
 * a source behind it rather than a line a batch may add — so only dated lives
 * are offered.
 *
 * A life naming two cities is a reading, so only lives naming one are.
 *
 * And a city in a sentence that merely *contains* a death word is not the
 * place of death: Mount Athos is where portions of Papylus's relics are kept,
 * Saint Petersburg is where the Romanovs were reburied eighty years after
 * Yekaterinburg, and a confessor's interrogation names the district his father
 * died in. So the city has to be governed by the verb — "martyred at X",
 * "beheaded in X" — with nothing between them.
 *
 *   node scratchpad/place-dated.mjs [--limit 40]
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { PLACES } from '../src/data/places.js';
import { lifeBounds } from '../src/lib/map-track.js';

const SAINTS = path.join(process.cwd(), 'saints');
const TOWNS = new Map();
for (const place of PLACES) {
  if (place.zoom < 20) continue;
  for (const name of [place.name, ...(place.also ?? [])]) {
    TOWNS.set(name, { name: place.name, lon: place.lon, lat: place.lat, zoom: place.zoom });
  }
}

const DIED = '(?:died|beheaded|martyred|suffered|burned|crucified|drowned|executed|stoned|shot)';
const prose = (text) => text.split('\n*After')[0];

const rows = [];
for (const dir of readdirSync(SAINTS, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  const file = path.join(SAINTS, dir.name, 'saint.json');
  if (!existsSync(file)) continue;
  const saint = JSON.parse(readFileSync(file, 'utf8'));
  if ((saint.locations ?? []).some((l) => typeof l.lat === 'number')) continue;
  const { born, died } = lifeBounds(saint.dates);
  if (born === null || died === null) continue;

  const life = path.join(SAINTS, dir.name, saint.text?.life ?? 'life.md');
  if (!existsSync(life)) continue;
  const text = prose(readFileSync(life, 'utf8'));

  const named = new Set();
  let governed = null;
  for (const [form, town] of TOWNS) {
    const safe = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`\\b${safe}\\b`).test(text)) continue;
    named.add(town.name);
    const verb = new RegExp(`${DIED}\\s+(?:at|in)\\s+${safe}\\b`, 'i');
    const at = text.search(verb);
    if (at === -1 || governed) continue;
    const start = Math.max(0, text.lastIndexOf('.', at) + 1);
    const stop = text.indexOf('.', at);
    governed = {
      town,
      form,
      sentence: text.slice(start, stop === -1 ? text.length : stop + 1).replace(/\s+/g, ' ').trim(),
    };
  }
  if (named.size !== 1 || !governed) continue;
  rows.push({ slug: saint.slug, name: saint.display_name, years: `${born}-${died}`, ...governed });
}

const limit = process.argv.includes('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : Infinity;
console.log(`${rows.length} dated, unlocated saints whose life names one city and says they died in it\n`);
for (const row of rows.slice(0, limit)) {
  console.log(`${row.slug}  (${row.name}, ${row.years})`);
  console.log(`   ${row.town.name} ${row.town.lon},${row.town.lat}  zoom ${row.town.zoom}  [matched "${row.form}"]`);
  console.log(`     "${row.sentence.slice(0, 200)}"\n`);
}
