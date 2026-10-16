/**
 * Emit `place-dated.mjs see --epithet`'s rows as the batch table, so forty-five
 * slugs are not retyped. `kind` follows the office the sentence used: a bishop
 * has a see, a deacon has not, and `ministry` is what the schema calls the
 * second.
 *
 *   node scratchpad/see-rows.mjs
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { PLACES } from '../src/data/places.js';
import { lifeBounds } from '../src/lib/map-track.js';

const SAINTS = path.join(process.cwd(), 'saints');
const TOWNS = new Map();
for (const place of PLACES) {
  if (place.zoom < 20) continue;
  for (const name of [place.name, ...(place.also ?? [])]) TOWNS.set(name, place);
}

const SEE = 'bishop|archbishop|metropolitan|patriarch';
const MINISTRY = 'presbyter|deacon|abbot|hegumen';
const prose = (text) => text.split('\n*After')[0];

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
  let hit = null;
  for (const [form, place] of TOWNS) {
    const safe = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`\\b${safe}\\b`).test(text)) continue;
    named.add(place.name);
    if (hit) continue;
    if (new RegExp(`(?:${SEE})\\s+(?:of|at|in)\\s+${safe}\\b`, 'i').test(text)) hit = { place, form, kind: 'see' };
    else if (new RegExp(`(?:${MINISTRY})\\s+(?:of|at|in)\\s+${safe}\\b`, 'i').test(text)) hit = { place, form, kind: 'ministry' };
  }
  if (named.size !== 1 || !hit) continue;
  const name = `${saint.slug} ${saint.display_name}`.toLowerCase();
  if (!name.includes(hit.place.name.toLowerCase()) && !name.includes(hit.form.toLowerCase())) continue;
  console.log(`    ('${saint.slug}', '${hit.kind}', '${hit.place.name}'),`);
}
