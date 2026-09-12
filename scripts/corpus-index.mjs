/**
 * The corpus as three indexes: by folder, by feast day, and by name form.
 *
 * Split out of the three scripts that need it — `day-coverage.mjs`,
 * `day-candidates.mjs` and `corpus-gate.mjs` — for the reason
 * `scripts/life-links.mjs` was split out of `related-from-links.mjs`: a rule
 * with two implementations is a rule that drifts, and the copy that drifts is
 * the one that lets a duplicate through.
 *
 * **The feast index is the one that matters.** This was found the
 * expensive way: matching a candidate against the corpus *by name* found none
 * of the eight saints the corpus already held for that day and invented pairs
 * instead — «Святитель Иоанн, архиепископ Новгородский» matched a new martyr
 * of 1937 because both begin with Иоанн. Asking instead which folders already
 * keep a feast on that menologion day found all eight. Three of them would
 * have been caught by a slug collision; five would have entered the corpus as
 * silent duplicates.
 *
 * So: **dedupe on the feast date, never on the name.** `nameKeys` exists for
 * the second pass only — a weaker check that reports a *suspicion* about
 * transliteration, never a decision.
 *
 * Everything here reads the saints' own folders and never `data/manifest.json`,
 * because `/data/` is gitignored and `npm test` runs on CI before the manifest
 * is built.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { toJdn, fromJdn } from '../src/lib/jdn.js';
import { CHURCHES, CHURCHES_BY_ID } from '../src/data/churches.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SAINTS_DIR = path.join(ROOT, 'saints');

export const CHURCH_IDS = CHURCHES.filter((c) => c.enabled !== false).map((c) => c.id);

/** Every folder that has a `saint.json`, parsed, with its `life.md` beside it. */
export function readCorpus(saintsDir = SAINTS_DIR) {
  const out = [];
  for (const entry of fs.readdirSync(saintsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(saintsDir, entry.name);
    const file = path.join(dir, 'saint.json');
    if (!fs.existsSync(file)) continue;
    const lifeFile = path.join(dir, 'life.md');
    out.push({
      slug: entry.name,
      dir,
      saint: JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')),
      life: fs.existsSync(lifeFile) ? fs.readFileSync(lifeFile, 'utf8') : null,
    });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/* ---- the calendars ------------------------------------------------------- */

/**
 * The civil (Gregorian) date a church's fixed feast falls on in a given year.
 *
 * This is the trap the whole project is built around and the one an expanding
 * agent will hit on its first day. The Russian and Serbian churches keep the
 * Julian calendar, so a feast recorded as 11 September lands on civil
 * 24 September; the Greek and Romanian keep the Revised Julian, whose fixed
 * feasts *are* Gregorian dates until 2800. A feast copied from one calendar's
 * page into the other calendar's field moves a saint thirteen days and nothing
 * in the build will say so.
 */
export function civilDate(calendar, month, day, year) {
  const { year: y, month: m, day: d } = fromJdn('gregorian', toJdn(calendar, year, month, day));
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** The (month, day) a church's own calendar calls a given civil date. */
export function churchDate(calendar, iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const back = fromJdn(calendar, toJdn('gregorian', y, m, d));
  return { year: back.year, month: back.month, day: back.day };
}

export const calendarOf = (church) => CHURCHES_BY_ID[church]?.default_calendar ?? 'julian';

/**
 * `church|month-day` → the folders keeping a fixed feast there, in that
 * church's own reckoning. A paschal feast has no fixed day and is indexed
 * under `church|paschal+N` instead, so the two can never collide.
 */
export function feastIndex(corpus) {
  const index = new Map();
  for (const { slug, saint } of corpus) {
    for (const att of saint.attestations ?? []) {
      if (att.status !== 'venerated' || !att.feast) continue;
      const key =
        att.feast.calendar === 'paschal'
          ? `${att.church}|paschal${att.feast.offset >= 0 ? '+' : ''}${att.feast.offset}`
          : `${att.church}|${String(att.feast.month).padStart(2, '0')}-${String(att.feast.day).padStart(2, '0')}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(slug);
    }
  }
  return index;
}

/** Which folders that church already keeps on that *civil* day. */
export function onCivilDay(index, church, iso) {
  const { month, day } = churchDate(calendarOf(church), iso);
  return index.get(`${church}|${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`) ?? [];
}

/**
 * Which folders **any** church keeps on that menologion (month, day), whatever
 * calendar it reckons in — the key actually used, and the one a
 * civil-day scan misses.
 *
 * Worked example, found writing this: the Russian calendar's 18 September
 * (civil 1 October) prints «Прп. Евмения, еп. Гортинского». The corpus already
 * holds `eumenius-of-gortyna`, on the Greek and Romanian 18 September, which is
 * civil **18 September** — a fortnight away. A civil-day scan reports the
 * Russian day as empty and the folder is written again under a variant
 * spelling. The menologion scan finds him at once, and the right action is an
 * *upgrade*: a Russian row on the folder that exists, not a second folder.
 *
 * Both scans matter and neither replaces the other. The civil one answers
 * "what will the Daily page show on this date"; this one answers "does this
 * person already have a folder".
 */
export function onMenologionDay(index, month, day) {
  const suffix = `|${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const out = new Set();
  for (const [key, slugs] of index) {
    if (key.endsWith(suffix)) for (const slug of slugs) out.add(slug);
  }
  return [...out].sort();
}

/* ---- names, for the weaker second pass ----------------------------------- */

/**
 * The forms a saint answers to, folded hard enough to catch a variant
 * transliteration and no harder.
 *
 * Diacritics off, case folded, the Greek final sigma normalised, punctuation
 * and the ordinary joining words dropped, then the remaining words sorted — so
 * "Chariton the Confessor" and "Chariton, Confessor" fold together, and so do
 * «Феодора Александрийская» and «Феодора, Александрийская». It will *not*
 * fold Theodore to Theodoros; nothing that folds those can also keep Sozon of
 * Cyprus apart from Sozon of Pompeiopolis, who are two men the Greek keeps on
 * one day.
 *
 * That is why this is a suspicion and not a test. The decision is the feast
 * index above.
 */
const JOINERS = /^(the|of|and|de|la|el|il|ho|o|and|his|her|with|in|at|st|saint|sf|sv)$/;

export function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ς/g, 'σ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !JOINERS.test(w))
    .join(' ');
}

export function nameKeys(saint) {
  const keys = new Set();
  const add = (v) => {
    const k = fold(v).split(' ').sort().join(' ');
    if (k.length >= 4) keys.add(k);
  };
  add(saint.display_name);
  for (const n of saint.names ?? []) add(n.form);
  return keys;
}

/** `slugify`, kept identical to `new-saint.mjs`'s so a slug is one function. */
export function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
