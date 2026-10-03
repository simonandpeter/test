#!/usr/bin/env node
/**
 * Which days of the year a church has nobody on — the ship gate's own
 * question, which no other script here answers.
 *
 * `node scripts/ship-gate-days.mjs`            per church, the empty days
 * `node scripts/ship-gate-days.mjs --church russian`
 * `node scripts/ship-gate-days.mjs --thin`     also the days with 1–2
 *
 * ## Why this is not `day-coverage.mjs`
 *
 * `day-coverage.mjs` answers "what would a reader see on this civil day",
 * which is the right question when choosing a day to work and the wrong one
 * for the gate: it walks a window of civil dates, so it cannot say how many
 * days of the **year** are empty without being asked for 365 of them and then
 * having its columns counted by hand. This walks the menologion instead — each
 * church's own month and day — and counts a day as covered when some folder
 * carries a `venerated` attestation for that church with a feast on it.
 *
 * ## The one subtlety, and it is the whole reason this file exists
 *
 * **The eight Great Feasts are not in `saints/`.** `src/data/feasts-fixed.js`
 * says why — their subject is not a person who ever lived on earth — and
 * `lib/fixed-feasts.js` makes the feast lead the day over any saint of it. So
 * a count taken from `saints/` alone reports the Nativity, the Dormition, the
 * Annunciation, the Theophany, the Transfiguration, the Nativity and the Entry
 * of the Theotokos and the Synaxis of the Archangels as **empty days**, when
 * they are the best-covered days in the calendar. Measured 2026-10-04: that
 * mistake reads the Romanian calendar as 358 of 366 with eight days to fill
 * and the Greek as 364 with one, and every one of those nine is a Great Feast
 * or 29 February. Counting them as covered — which is what this script does,
 * and says in its output that it does — reads Romanian 366 of 366 and Greek
 * 365, with 29 February the only remainder.
 *
 * 29 February is real and is not fillable from a 2026 or 2027 reading: no
 * civil year in the Daily page's runway prints it. saint.gr/02/29 exists.
 *
 * Reads the folders, never `data/manifest.json`, so it runs before
 * `build:manifest` as the corpus tests do.
 */
import fs from 'node:fs';
import path from 'node:path';

import { ROOT, SAINTS_DIR, CHURCH_IDS } from './corpus-index.mjs';
import { FIXED_FEASTS } from '../src/data/feasts-fixed.js';

const args = process.argv.slice(2);
const has = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const ONLY = opt('--church', null);
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const key = (month, day) => `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/* ---- what the folders carry ---------------------------------------------- */

const kept = new Map(); // church -> Map(key -> count)
for (const slug of fs.readdirSync(SAINTS_DIR)) {
  const file = path.join(SAINTS_DIR, slug, 'saint.json');
  if (!fs.existsSync(file)) continue;
  let saint;
  try {
    saint = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    console.error(`unreadable: saints/${slug}/saint.json`);
    continue;
  }
  for (const row of saint.attestations ?? []) {
    // `venerated` is the only status that is a claim this church keeps the day;
    // `not-venerated` and `undocumented` may not carry a feast at all (schema).
    if (row.status !== 'venerated') continue;
    const feast = row.feast;
    if (!feast || !feast.day || !feast.month) continue; // a movable feast has an offset, not a day
    if (!kept.has(row.church)) kept.set(row.church, new Map());
    const index = kept.get(row.church);
    const k = key(feast.month, feast.day);
    index.set(k, (index.get(k) ?? 0) + 1);
  }
}

/* ---- what the eight records cover, per church ----------------------------- */

const feastDays = new Map(); // church -> Set(key)
for (const feast of FIXED_FEASTS) {
  for (const { church, feast: when } of feast.observance ?? []) {
    if (!when || !when.day || !when.month) continue;
    if (!feastDays.has(church)) feastDays.set(church, new Set());
    feastDays.get(church).add(key(when.month, when.day));
  }
}

/* ---- the report ----------------------------------------------------------- */

console.log(`${fs.readdirSync(SAINTS_DIR).length} folders, and ${FIXED_FEASTS.length} fixed-feast records counted as covering their own day`);

for (const church of CHURCH_IDS) {
  if (ONLY && church !== ONLY) continue;
  const index = kept.get(church) ?? new Map();
  const feasts = feastDays.get(church) ?? new Set();
  const empty = [];
  const thin = [];
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= DAYS_IN[month - 1]; day++) {
      const k = key(month, day);
      const n = index.get(k) ?? 0;
      if (n === 0 && !feasts.has(k)) empty.push([month, day]);
      else if (n > 0 && n <= 2) thin.push([month, day]);
    }
  }
  const total = DAYS_IN.reduce((a, b) => a + b, 0);
  console.log(`\n— ${church} ——————————————————————————————`);
  console.log(`  ${total - empty.length} of ${total} days carry somebody; ${empty.length} carry nobody; ${thin.length} carry one or two`);
  print('  nobody', empty);
  if (has('--thin')) print('  one or two', thin);
}

function print(label, pairs) {
  if (!pairs.length) return;
  const byMonth = new Map();
  for (const [month, day] of pairs) {
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(day);
  }
  console.log(`${label}:`);
  for (const month of [...byMonth.keys()].sort((a, b) => a - b)) {
    const days = byMonth.get(month);
    console.log(`    ${MONTHS[month - 1]} (${String(days.length).padStart(2)})  ${days.join(' ')}`);
  }
}

console.log('\nThe days above are each church\'s OWN month and day — Julian for the');
console.log('Russian and Serbian, revised Julian for the Greek and Romanian. This');
console.log('proposes nothing and writes nothing.');
