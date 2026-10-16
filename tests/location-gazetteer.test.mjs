/**
 * A coordinate written the wrong way round still validates.
 *
 * `schema/saint.schema.json` bounds `lat` at ±90 and `lon` at ±180, so Rome
 * entered as `lat: 12.4828, lon: 41.8931` passes every check the corpus has
 * and puts a pope in Albania. Four batches on 15–16 October wrote 112 rows by
 * hand out of `src/data/places.js`, each one a pair of numbers typed in the
 * opposite order to the one the gazetteer prints them in, which is the shape
 * of mistake nothing here could have caught.
 *
 * The gazetteer is the reference. Where a row names a place it already holds,
 * two things are asserted and neither needs a tolerance anyone has to tune:
 * the row is nearer that place than its own transposition is, which no
 * swapped pair can be, and a town-sized entry is within 250 km, which is wide
 * enough for two readings of where a city stood and narrow enough to catch a
 * coordinate taken from the wrong one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PLACES } from '../src/data/places.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAINTS = path.join(ROOT, 'saints');

const GAZETTEER = new Map();
for (const place of PLACES) {
  for (const name of [place.name, ...(place.also ?? [])]) GAZETTEER.set(name.toLowerCase(), place);
}

/** Great-circle kilometres. */
function apart(aLat, aLon, bLat, bLon) {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const rows = [];
for (const slug of await readdir(SAINTS)) {
  const file = path.join(SAINTS, slug, 'saint.json');
  const raw = await readFile(file, 'utf8').catch(() => null);
  if (!raw) continue;
  for (const loc of JSON.parse(raw).locations ?? []) {
    if (typeof loc.lat !== 'number') continue;
    // "Kadıköy, Istanbul, Turkey" names its town first; the rest is the tail.
    const names = [loc.historical_name, loc.modern_name?.split(',')[0]].filter(Boolean);
    const place = names.map((n) => GAZETTEER.get(n.trim().toLowerCase())).find(Boolean);
    if (place) rows.push({ slug, loc, place });
  }
}

test('the corpus has placed saints the gazetteer can check', () => {
  assert.ok(rows.length > 100, `only ${rows.length} rows match a gazetteer entry`);
});

test('no coordinate is its own transposition', () => {
  for (const { slug, loc, place } of rows) {
    const right = apart(loc.lat, loc.lon, place.lat, place.lon);
    const flipped = apart(loc.lon, loc.lat, place.lat, place.lon);
    assert.ok(
      right < flipped,
      `${slug}: ${loc.lat},${loc.lon} is ${Math.round(right)} km from ${place.name} and ${Math.round(flipped)} km the other way round`
    );
  }
});

test('a town-sized entry is where the gazetteer says the town is', () => {
  for (const { slug, loc, place } of rows) {
    if (place.zoom < 20) continue;
    const km = apart(loc.lat, loc.lon, place.lat, place.lon);
    assert.ok(km < 250, `${slug}: ${loc.historical_name ?? loc.modern_name} is ${Math.round(km)} km from the gazetteer's ${place.name}`);
  }
});
