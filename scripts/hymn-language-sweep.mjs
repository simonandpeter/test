#!/usr/bin/env node
/**
 * What tongue a hymn is actually shown in, on every date, in every calendar,
 * for every language the site can be read in.
 *
 *   node scripts/hymn-language-sweep.mjs [--lang en] [--church greek]
 *                                        [--year 2026] [--limit N]
 *
 * **The reader's complaint this exists for** (author, 2026-09-17): hymns still
 * rendered in another tongue with English chosen, seen on Saturday 13 September
 * in the Greek and Romanian calendars. A spot check on one day could not have
 * told him which of two things it was, and neither could a count: the saints'
 * own hymns all carried an `english`, and the *day records'* feast hymns —
 * `data/liturgical-days.js`, which never passed through `hymn-english.mjs`,
 * since that tool walks `saints/` — carried one on ten of two hundred and
 * eleven. Both sets reach the same `ui/hymns.js`, whose English branch simply
 * had nothing to choose.
 *
 * So this sweeps the whole calendar rather than a day, and prints the rows.
 * A hymn is counted **shown in the reader's language** when the text the page
 * would print is in it: the `english` block for an English reader, and for the
 * other four the source's own tongue where that tongue is theirs. **Church
 * Slavonic is not Russian and not Serbian** (author's ruling, 2026-09-17), so a
 * Slavonic original counts as a fallback for both, and the `fallback` column is
 * the size of Series M.
 */
import fs from 'node:fs';

import { CHURCHES_BY_ID, enabledChurches } from '../src/data/churches.js';
import { buildFeastIndex } from '../src/lib/feasts.js';
import { LANGUAGES } from '../src/lib/i18n.js';
import { LITURGICAL_DAYS } from '../src/data/liturgical-days.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const ONLY_LANG = opt('--lang', null);
const ONLY_CHURCH = opt('--church', null);
const LIMIT = Number(opt('--limit', 40));

const LANGS = LANGUAGES.map((l) => l.id).filter((id) => !ONLY_LANG || id === ONLY_LANG);
const CHURCHES = enabledChurches().map((c) => c.id).filter((id) => !ONLY_CHURCH || id === ONLY_CHURCH);

/* `/data/` is gitignored and is built after this could ever run, so the corpus
 * is read from the saints' own folders (CLAUDE.md, "Corpus"). */
const saints = [];
for (const dir of fs.readdirSync('saints')) {
  const path = `saints/${dir}/saint.json`;
  if (!fs.existsSync(path)) continue;
  saints.push(JSON.parse(fs.readFileSync(path, 'utf8')));
}

/*
 * `ui/hymns.js`'s choice, with nothing else in it: English where the reader
 * reads English and a rendering exists, the source's own tongue otherwise.
 * Kept here rather than imported because that module reaches for `document`
 * through the strings, and this has to run under plain node.
 */
const shownIn = (hymn, lang) => (lang === 'en' && hymn.english ? 'en' : hymn.lang);

const YEARS = [...new Set(Object.keys(LITURGICAL_DAYS).map((iso) => Number(iso.slice(0, 4))))];
if (opt('--year', null)) YEARS.splice(0, YEARS.length, Number(opt('--year')));
const index = new Map();
for (const year of YEARS) {
  for (const [iso, entries] of buildFeastIndex(saints, year, CHURCHES_BY_ID)) index.set(iso, entries);
}
const bySlug = new Map(saints.map((s) => [s.slug, s]));

/*
 * Every date either half of the build can put a hymn on: a day the records
 * were read for, and a day a saint in the corpus is commemorated. Sweeping the
 * dates rather than the two hymn tables is the point — it is the reader's
 * question ("what do I meet on this day, in this calendar, in my language?")
 * and it is the one a count of the tables cannot answer.
 */
const dates = [...new Set([...Object.keys(LITURGICAL_DAYS), ...index.keys()])].sort();

const rows = [];
const tally = {};
for (const iso of dates) {
  for (const church of CHURCHES) {
    /* What the Daily page draws: the day's own feast hymns, then the hymns of
     * the saints that calendar keeps on it. `record.js` and `hymns.js` both
     * filter on the church, so this does too. */
    const feast = (LITURGICAL_DAYS[iso]?.[church]?.hymns ?? []).filter((h) => h.church === church);
    const kept = (index.get(iso) ?? []).filter((e) => e.church === church);
    const own = kept.flatMap((e) => (bySlug.get(e.slug)?.hymns ?? []).filter((h) => h.church === church)
      .map((h) => ({ h, slug: e.slug })));
    const all = [...feast.map((h) => ({ h, slug: null })), ...own];
    if (!all.length) continue;
    for (const lang of LANGS) {
      const key = `${lang} · ${church}`;
      tally[key] ??= { shown: 0, fallback: 0 };
      for (const { h, slug } of all) {
        const got = shownIn(h, lang);
        if (got === lang) { tally[key].shown++; continue; }
        tally[key].fallback++;
        rows.push({ iso, church, lang, got, kind: h.kind, where: slug ?? 'day record', text: h.text.slice(0, 44) });
      }
    }
  }
}

console.log(`${dates.length} dates × ${CHURCHES.length} calendars × ${LANGS.length} languages\n`);
console.log('language · calendar        shown  fallback');
for (const [key, t] of Object.entries(tally)) {
  console.log(`${key.padEnd(24)} ${String(t.shown).padStart(6)} ${String(t.fallback).padStart(9)}`);
}

const byLang = {};
for (const r of rows) byLang[r.lang] = (byLang[r.lang] ?? 0) + 1;
console.log('\nfallbacks by language:', JSON.stringify(byLang));

/* The rows themselves, never only the count (CLAUDE.md): an instrument that
 * prints a total cannot be caught matching the wrong thing. */
console.log(`\nfirst ${Math.min(LIMIT, rows.length)} of ${rows.length} fallbacks:`);
for (const r of rows.slice(0, LIMIT)) {
  console.log(`${r.iso} ${r.church.padEnd(9)} ${r.lang} shown in ${r.got}  ${r.kind.padEnd(10)} ${r.where.padEnd(28)} ${r.text}`);
}
process.exitCode = 0;
