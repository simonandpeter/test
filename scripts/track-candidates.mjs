#!/usr/bin/env node
/**
 * Which saints' lives read as a journey the map could draw.
 *
 * `node scripts/track-candidates.mjs [--min N] [--slug X] [--limit N]`
 *
 * **Proposes; the reading is the work**, the same standing as
 * `place-candidates.mjs` and `related-from-links.mjs`. A `track` (schema:
 * `waypoint`) is an ordered, dated list of stays, and every one of its years
 * is a claim a source has to make — so nothing here writes a folder. What it
 * does is what a person cannot do across 862 lives in an evening: read each
 * one for the places the repository can already put a coordinate on, in the
 * order the life names them, with whatever year stands nearest each, and
 * rank the lives by how much of a journey that amounts to.
 *
 * The gazetteer is everything already on the map, and nothing invented for
 * this: `data/places.js` (with its `also` forms), `data/historical-labels.js`,
 * every saint's own `locations` (historical and modern names, both), and the
 * places on the two tracks that exist. A life naming a place none of those
 * know is a gap this script cannot see, which is worth knowing when a life
 * scores lower than it reads.
 *
 * **What a high score does not mean.** A life that names Constantinople,
 * Rome and Jerusalem in three sentences about three other people is three
 * places and no journey; a monk's life names the monastery he never left and
 * the town he was born in, which is a journey of one leg. The rows print the
 * sentence around each mention so the difference is visible without opening
 * the folder — the same reason `place-candidates.mjs` prints its quotes.
 */
import fs from 'node:fs';
import path from 'node:path';

import { PLACES } from '../src/data/places.js';
import { HISTORICAL_LABELS } from '../src/data/historical-labels.js';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const MIN = Number(opt('--min', 2));
const LIMIT = Number(opt('--limit', 40));
const ONLY = opt('--slug', null);

/* ---- the gazetteer ------------------------------------------------------- */

const gazetteer = new Map(); // name -> { lon, lat, source }
const learn = (name, lon, lat, source) => {
  const key = String(name ?? '').trim();
  // A one-word place shorter than four letters is more often a word than a
  // place ("Ur", "Nea"); and a comma means a modern address, whose first
  // part is the place and the rest is the country.
  const head = key.split(',')[0].trim();
  if (head.length < 4 || typeof lon !== 'number' || typeof lat !== 'number') return;
  if (!gazetteer.has(head)) gazetteer.set(head, { lon, lat, source });
};
for (const p of PLACES) {
  learn(p.name, p.lon, p.lat, 'places');
  for (const also of p.also ?? []) learn(also, p.lon, p.lat, 'places');
}
for (const l of HISTORICAL_LABELS) learn(l.name, l.lon, l.lat, 'atlas');

const folders = fs.readdirSync('saints').filter((d) => fs.existsSync(path.join('saints', d, 'saint.json')));
const saints = new Map();
for (const dir of folders) {
  const s = JSON.parse(fs.readFileSync(path.join('saints', dir, 'saint.json'), 'utf8'));
  saints.set(dir, s);
  for (const l of s.locations ?? []) {
    learn(l.historical_name, l.lon, l.lat, dir);
    learn(l.modern_name, l.lon, l.lat, dir);
  }
  for (const w of s.track ?? []) learn(w.place, w.lon, w.lat, `${dir} (track)`);
}

/*
 * Some names the lives use are not the names the gazetteer learnt — the
 * corpus writes "Petersburg" for Saint Petersburg, "Tsargrad" only in
 * citations, "Kiev" nowhere and "Kyiv" everywhere. Aliases added by hand as
 * the first runs turned them up; each is a name a life actually wrote.
 */
const ALIASES = {
  Petersburg: 'Saint Petersburg',
  'St Petersburg': 'Saint Petersburg',
  Leningrad: 'Saint Petersburg',
  Petrograd: 'Saint Petersburg',
  Athos: 'Mount Athos',
  'Holy Mountain': 'Mount Athos',
  Byzantium: 'Constantinople',
  'Alma-Ata': 'Almaty',
  Verny: 'Almaty',
};
for (const [alias, name] of Object.entries(ALIASES)) {
  if (gazetteer.has(name) && !gazetteer.has(alias)) gazetteer.set(alias, gazetteer.get(name));
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const names = [...gazetteer.keys()].sort((a, b) => b.length - a.length);
const pattern = new RegExp(`(?<!\\p{L})(${names.map(escape).join('|')})(?!\\p{L})`, 'gu');

/* ---- the reading --------------------------------------------------------- */

/** A year near a mention: the closest 3–4 digit number within `reach`
 *  characters that reads as one — not a page, not a distance. */
function yearNear(text, at, reach = 140) {
  const lo = Math.max(0, at - reach);
  const hi = Math.min(text.length, at + reach);
  const slice = text.slice(lo, hi);
  let best = null;
  for (const m of slice.matchAll(/(?<![\d.])(\d{3,4})(?!\d|\s*(?:km|px|m\b|%))/g)) {
    const n = Number(m[1]);
    if (n < 30 || n > 2026) continue;
    const dist = Math.abs(lo + m.index - at);
    if (!best || dist < best.dist) best = { year: n, dist };
  }
  return best?.year ?? null;
}

const sentenceAround = (text, at, len) => {
  const start = Math.max(0, text.lastIndexOf('. ', at) + 2, text.lastIndexOf('\n\n', at) + 2);
  const endDot = text.indexOf('. ', at + len);
  const end = endDot === -1 ? text.length : endDot + 1;
  return text
    .slice(start, end)
    .replace(/\s+/g, ' ')
    .trim();
};

const rows = [];
for (const [dir, saint] of saints) {
  if (ONLY && dir !== ONLY) continue;
  if (saint.track?.length) continue;
  const file = path.join('saints', dir, 'life.md');
  if (!fs.existsSync(file)) continue;
  const text = fs
    .readFileSync(file, 'utf8')
    .replace(/^#[^\n]*\n/, '')
    .replace(/\n\*After[^\n]*\*\s*$/s, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  const mentions = [];
  for (const m of text.matchAll(pattern)) {
    const name = m[1];
    const g = gazetteer.get(name);
    mentions.push({ name, at: m.index, year: yearNear(text, m.index), lon: g.lon, lat: g.lat });
  }
  if (!mentions.length) continue;

  // Distinct by coordinate rather than by name, so "Kyiv" and "Monastery of
  // the Caves, Kyiv" are one place and Constantinople/Byzantium are one.
  const distinct = new Map();
  for (const m of mentions) {
    const key = `${m.lon.toFixed(1)},${m.lat.toFixed(1)}`;
    if (!distinct.has(key)) distinct.set(key, { ...m, count: 0, years: new Set() });
    const d = distinct.get(key);
    d.count += 1;
    if (m.year) d.years.add(m.year);
  }
  if (distinct.size < MIN) continue;

  const dated = [...distinct.values()].filter((d) => d.years.size).length;
  rows.push({
    dir,
    display: saint.display_name,
    places: distinct.size,
    dated,
    located: new Set((saint.locations ?? []).map((l) => `${l.lon.toFixed(1)},${l.lat.toFixed(1)}`)).size,
    score: distinct.size * 2 + dated * 3,
    sequence: [...distinct.values()].sort((a, b) => a.at - b.at),
    quotes: mentions.slice(0, 12).map((m) => ({ name: m.name, year: m.year, q: sentenceAround(text, m.at, m.name.length) })),
  });
}

rows.sort((a, b) => b.score - a.score || b.places - a.places);

console.log(`lives read                 : ${saints.size}`);
console.log(`gazetteer names            : ${gazetteer.size}`);
console.log(`lives naming ≥${MIN} places   : ${rows.length}`);
console.log(`with ≥2 dated places       : ${rows.filter((r) => r.dated >= 2).length}\n`);

for (const r of rows.slice(0, LIMIT)) {
  const seq = r.sequence
    .map((d) => `${d.name}${d.years.size ? ` (${[...d.years].sort((a, b) => a - b).join('/')})` : ''}`)
    .join(' → ');
  console.log(`${r.dir}  [${r.places} places, ${r.dated} dated, ${r.located} already located]  ${r.display}`);
  console.log(`    ${seq}`);
  for (const q of r.quotes) {
    console.log(`      «${q.name}»${q.year ? ` ~${q.year}` : ''}: ${q.q.length > 220 ? q.q.slice(0, 217) + '…' : q.q}`);
  }
  console.log('');
}
