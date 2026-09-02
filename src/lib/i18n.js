/**
 * The site's language (author, 2026-08-24, Amendment 36): one of five, chosen
 * from the header beside the calendar control, remembered in
 * `settings.language`. English is the base; the other four are the languages
 * of the four churches' own sources — Russian, Romanian, Greek and Serbian —
 * so a reader who keeps a church can read the chrome in that church's tongue.
 *
 * What translates is the chrome: every string in ui/strings.js, and the dates
 * through `Intl` (the formatter cache below). What does not translate is the
 * corpus — 708 lives written in English after their synaxaria, names, and the
 * data files — by decision, not omission: a machine-translated life is
 * exactly the invented content Amendment 2 forbids, and the source-language
 * material a reader of that language wants (hymns, quoted calendar lines,
 * name forms) is already on the page in the original. Two seams follow from
 * that and are accepted: lib/liturgy.js composes its cycle line in English,
 * and the fast reasons are English strings in src/data/liturgical-days.js —
 * the locale packs carry a small `reasons` map for the recurring ones and
 * pass anything else through untranslated.
 *
 * The mechanism mirrors lib/church.js — one live copy, subscribe/choose —
 * because the views already know that dance. Locale packs are partial,
 * STRINGS-shaped objects merged over the English base *in place*: modules that
 * captured a branch at import time (`const C = STRINGS.church`) keep working,
 * because the branch objects are mutated, never replaced.
 */

import { STRINGS } from '../ui/strings.js';
import { readSettings, writeSetting } from './settings.js';

/**
 * The four packs, fetched rather than bundled (2026-08-27).
 *
 * They were static imports, so all four were in the entry chunk and every
 * reader downloaded 106 kB of four languages to read in one. Each is its own
 * chunk now, and a language's pack arrives when that language is wanted: at
 * boot for the one the reader keeps, from the chooser for one they are about
 * to keep, and all four together only where all four are genuinely needed,
 * which is the search index — a reader typing «игумен» finds the abbots
 * whatever the chrome is set to, and that is the one thing that cannot be
 * built from the current language alone.
 */
const LOADERS = {
  ru: () => import('../ui/locales/ru.js').then((m) => m.ru),
  ro: () => import('../ui/locales/ro.js').then((m) => m.ro),
  el: () => import('../ui/locales/el.js').then((m) => m.el),
  sr: () => import('../ui/locales/sr.js').then((m) => m.sr),
};

/**
 * `code` is what the header button shows (the author's spelling — GR and RS,
 * not el and sr); `tag` is the BCP 47 tag that <html lang>, Intl and screen
 * readers get; `name` is the language in its own tongue, which is the one
 * form every reader can find themselves in.
 */
export const LANGUAGES = [
  /* `pack` is null until that language's chunk has landed, and every reader of
     it — `applyLocale` here, `allNames` in lib/saint-types.js — already treats
     null as "English", which is what an unloaded pack should read as. */
  { id: 'en', code: 'EN', tag: 'en', name: 'English', pack: null },
  { id: 'ru', code: 'RU', tag: 'ru', name: 'Русский', pack: null },
  { id: 'ro', code: 'RO', tag: 'ro', name: 'Română', pack: null },
  { id: 'el', code: 'GR', tag: 'el', name: 'Ελληνικά', pack: null },
  { id: 'sr', code: 'RS', tag: 'sr', name: 'Српски', pack: null },
];

export const LANGUAGES_BY_ID = Object.fromEntries(LANGUAGES.map((l) => [l.id, l]));

/* ---- the English base --------------------------------------------------- */

/*
 * Snapshot before any pack is applied, so switching ru → ro does not build
 * Romanian on Russian, and switching back to English is a merge of nothing.
 * Taken at module load, when STRINGS is exactly what strings.js wrote.
 */
const clone = (value) =>
  Array.isArray(value)
    ? value.map(clone)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]))
      : value;

const BASE = clone(STRINGS);

/** Mutates `target`'s branches rather than replacing them — see the header. */
function mergeInto(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object') {
      mergeInto(target[key], value);
    } else {
      target[key] = clone(value);
    }
  }
}

/** Deletes keys the base does not have — a pack-only branch (`reasons`)
 *  would otherwise ride along into every later language. Found by the unit
 *  test that asserts English restores *exactly*, not by a reader. */
function pruneTo(target, shape) {
  for (const key of Object.keys(target)) {
    if (!(key in shape)) delete target[key];
    else if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      pruneTo(target[key], shape[key]);
    }
  }
}

function applyLocale(id) {
  pruneTo(STRINGS, BASE);
  mergeInto(STRINGS, BASE);
  const pack = LANGUAGES_BY_ID[id]?.pack;
  if (pack) mergeInto(STRINGS, pack);
  formatters.clear();
}

/* ---- fetching a pack ----------------------------------------------------- */

const inFlight = new Map();

/**
 * Loads one language's pack, once, and applies it if that language is the one
 * being read. The re-apply is what makes `chooseLanguage` safe to keep
 * synchronous: a caller that chooses a language whose pack has not landed gets
 * English for as long as the fetch takes and the right words the moment it
 * arrives, with the usual subscriber refresh behind it. Callers who would
 * rather not show that moment — the chooser is the only one — await this
 * first.
 */
export function ensurePack(id) {
  const entry = LANGUAGES_BY_ID[id];
  if (!entry || !LOADERS[id] || entry.pack) return Promise.resolve(entry?.pack ?? null);
  if (!inFlight.has(id)) {
    inFlight.set(
      id,
      LOADERS[id]().then(
        (pack) => {
          entry.pack = pack;
          if (current === id) {
            applyLocale(id);
            for (const fn of listeners) fn(id);
          }
          return pack;
        },
        (error) => {
          // English is a working answer, so a pack that will not load is a
          // degraded page rather than a broken one.
          console.error(`locale pack ${id} failed to load`, error);
          inFlight.delete(id);
          return null;
        },
      ),
    );
  }
  return inFlight.get(id);
}

/** All four, for the one caller that needs every language at once. */
export const ensureAllPacks = () => Promise.all(Object.keys(LOADERS).map(ensurePack));

/* ---- the one live copy -------------------------------------------------- */

let current;

export function currentLanguage() {
  if (current === undefined) {
    const stored = readSettings().language;
    current = LANGUAGES_BY_ID[stored] ? stored : 'en';
    applyLocale(current);
  }
  return current;
}

const listeners = new Set();

export function subscribeLanguage(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function chooseLanguage(id) {
  if (!LANGUAGES_BY_ID[id]) throw new Error(`Unknown language: ${id}`);
  current = id;
  applyLocale(id);
  writeSetting('language', id);
  // Guarded so the unit suite, which has no DOM, can exercise the merge.
  if (typeof document !== 'undefined') document.documentElement.lang = LANGUAGES_BY_ID[id].tag;
  for (const fn of listeners) fn(id);
  return id;
}

/**
 * Whether the reader has chosen a language, which is not the same as which
 * language they are reading: a first visit reads English and has chosen
 * nothing (lib/settings.js). The calendar's first-visit gate asks on the
 * strength of this, and stops asking on the strength of `chooseLanguage`.
 */
export const hasChosenLanguage = () => readSettings().language !== null;

/** The BCP 47 tag of the current language, for <html lang> and Intl. */
export const languageTag = () => LANGUAGES_BY_ID[currentLanguage()]?.tag ?? 'en';

/* ---- dates in the reader's language ------------------------------------- */

/*
 * The views used to hold module-level `Intl.DateTimeFormat('en-GB', …)`
 * constants; a formatter built once can never change language, so they come
 * through here instead — cached per (options, language), flushed when the
 * language changes. English keeps the en-GB day-month order the site has
 * always printed.
 */
const formatters = new Map();

export function dateFormatter(options) {
  const key = JSON.stringify(options);
  let fmt = formatters.get(key);
  if (!fmt) {
    const tag = languageTag();
    fmt = new Intl.DateTimeFormat(tag === 'en' ? 'en-GB' : tag, options);
    formatters.set(key, fmt);
  }
  return fmt;
}

/**
 * A date in the reader's language, capitalised (author, 2026-08-25: the
 * Romanian date "was all lower case and doesn't have any capital letters …
 * and for some reason aug has a full stop after it").
 *
 * Said plainly, because it is a deliberate departure: lower-case weekday and
 * month names are *correct* orthography in Romanian, Russian and Serbian, and
 * "aug." is the correct Romanian abbreviation — the dot marks the truncation.
 * The author asked for capitals and no dot, so the parts are capitalised and
 * the month's own trailing dot is dropped. Only the weekday and month parts
 * are touched: the literals are left alone, so Russian keeps its «2026 г.»,
 * whose dot belongs to a different word.
 */
export function formatDate(options, date) {
  return dateFormatter(options)
    .formatToParts(date)
    .map((part) => {
      if (part.type !== 'weekday' && part.type !== 'month') return part.value;
      const bare = part.value.replace(/\.$/, '');
      const cased = bare.charAt(0).toLocaleUpperCase(languageTag()) + bare.slice(1);
      /*
       * **English abbreviates to three letters** (author, 2026-09-02: "Do Sep,
       * not Sept").
       *
       * `en-GB` gives "Sept" for September alone — it is the one month whose
       * standard British abbreviation is four letters — and every other month
       * is already three. So this is one month's spelling rather than a rule,
       * and it is applied only to English: «Авг», Sept. and Σεπ are the other
       * packs' own abbreviations and are not this instruction's business.
       */
      if (part.type === 'month' && currentLanguage() === 'en' && options.month === 'short') {
        return cased.slice(0, 3);
      }
      return cased;
    })
    .join('');
}

/**
 * A data-borne English phrase — a fast reason from liturgical-days.js —
 * through the current pack's `reasons` map, untouched where the pack has no
 * entry (or there is no pack): a reason passed through in English is honest;
 * one invented in translation would not be.
 */
export const translateReason = (reason) =>
  (LANGUAGES_BY_ID[currentLanguage()]?.pack?.reasons ?? {})[reason] ?? reason;
