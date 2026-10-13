#!/usr/bin/env node
/**
 * Years a folder has already cited and never recorded.
 *
 * A calendar line is quoted into an attestation's source text whole, so it
 * carries that church's year with it — «Прп. Луки Елладского (ок. 946)» — and
 * the folder's `dates` is written from whichever source the batch happened to
 * read first. The two then disagree in silence: the citation is on the page,
 * the date is not, and nothing fails. Seven of seven folders upgraded on the
 * Julian 7 and 8 February batches had exactly this, which is why this exists.
 *
 * It proposes and never writes, like the rest of the audit family. A row is a
 * question for a reader: the cited year may be the better reading, the worse
 * one, or a different event from the one the date records — a translation of
 * relics rather than a death. Only the reader can say.
 *
 *     node scripts/date-citation-audit.mjs [church …] [--all]
 *
 * By default only folders that carry a `dates` object are reported, because a
 * folder with none is `heroless.mjs`'s list rather than this one; `--all` adds
 * them, which is the list to work from when writing dates where there are none.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18, XIX: 19, XX: 20 };

/** `до Р.Х.`, `î.Hr.`, `π.Χ.`, `BC` — the era marker that flips the sign. */
const BC = /до\s*Р\.?\s*Х|î\.?\s*Hr|π\.?\s*Χ|\bB\.?C\.?\b|пре\s*Хр/i;

/**
 * Every year or century a quoted line offers, as closed intervals.
 *
 * Only parenthesised runs are read. A calendar line puts its date in brackets
 * and its prose outside them, so this is the difference between a year the
 * source asserts and a number that happens to be in a sentence — a street
 * number, a psalm, a count of martyrs.
 */
function offered(text) {
  const out = [];
  for (const m of text.matchAll(/[(（]([^()（）]{1,80})[)）]/g)) {
    const inner = m[1];
    const sign = BC.test(inner) ? -1 : 1;
    /*
     * Three digits at least, which is what separates a year from a day of the
     * month: the Serbian citations carry «29. јануар ст. ст.» and the Russian
     * «7 февраля ст. ст.» inside the same brackets a year would sit in. The
     * cost is a first-century year given as a bare number, and those are given
     * as centuries in all four calendars.
     */
    const years = [...inner.matchAll(/\b(\d{3,4})\b/g)].map((y) => Number(y[1]));
    if (years.length) {
      // A range inside one bracket — «(257 - 331)» — is one claim, not two.
      const lo = Math.min(...years) * sign;
      const hi = Math.max(...years) * sign;
      out.push({ lo: Math.min(lo, hi), hi: Math.max(lo, hi), said: inner.trim() });
      continue;
    }
    const roman = inner.match(/^\s*([IVX]+)\s*(?:в\.?|век|century|secol)?\s*$/i);
    if (roman && ROMAN[roman[1].toUpperCase()]) {
      const c = ROMAN[roman[1].toUpperCase()];
      out.push({ lo: sign * (sign > 0 ? (c - 1) * 100 + 1 : c * 100), hi: sign * (sign > 0 ? c * 100 : (c - 1) * 100 + 1), said: inner.trim(), century: true });
    }
  }
  return out;
}

/** Every interval the folder actually records, as closed intervals. */
function recorded(saint) {
  const out = [];
  for (const [which, d] of Object.entries(saint.dates ?? {})) {
    if (typeof d?.earliest === 'number' && typeof d?.latest === 'number') {
      out.push({ which, lo: Math.min(d.earliest, d.latest), hi: Math.max(d.earliest, d.latest) });
    }
  }
  return out;
}

const churches = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const all = process.argv.includes('--all');

const rows = [];
let folders = 0;
let cited = 0;

/*
 * What a note says that is a number and not a date. Raw, a note channel
 * reported 13,224 rows against 18,142 cited years, which is a report nobody
 * can read — and almost all of it was this:
 *
 * - **the reading stamp.** Every note in this corpus ends by saying when the
 *   page was read, and that is always this year.
 * - **page and manuscript references.** `life1346`, `name/1623`, `id1571`,
 *   «folio 217», «page 199», «Paris Codex 1621» — a saint known only from one
 *   manuscript has its shelf-mark in the note and no date at all, which is the
 *   trap that cost a reader 46 of 64 candidates.
 * - **the source URL**, which carries the page's own id.
 * - **an ordinal year of a life**, «in the 110th year of his life», which is a
 *   span and not a date.
 *
 * Stripped rather than scored, because a number in one of these shapes is
 * never a date and a reader who has to skip it will stop reading the report.
 */
const scrub = (note) =>
  note
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\b(?:read|citit|прочитано)[^.;]*/gi, '')
    .replace(/\b(?:life|id)\s*\d+/gi, '')
    .replace(/\bname\/\d+/gi, '')
    .replace(/\b(?:folio|fol\.?|page|p\.|pp\.|col\.|line)\s*\d+/gi, '')
    .replace(/\bCodex\s+\S*\s*\d+/gi, '')
    .replace(/\b\d+(?:st|nd|rd|th)\s+year\b/gi, '')
    .replace(/\b20\d\d\b/g, '');

for (const entry of readdirSync(path.join(ROOT, 'saints'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(ROOT, 'saints', entry.name, 'saint.json');
  if (!existsSync(file)) continue;
  const saint = JSON.parse(readFileSync(file, 'utf8'));
  folders += 1;
  const has = recorded(saint);
  if (!has.length && !all) continue;

  for (const a of saint.attestations ?? []) {
    if (churches.length && !churches.includes(a.church)) continue;
    /*
     * **The note as well as the source, since 2026-10-14.** This read
     * `source.text` alone, which is where a batch quotes the calendar's own
     * line — and a reader who read a year out of a *second* page writes it
     * into the row's `note` instead. 64 folders held a year or a century in a
     * note and nowhere else, and not one of them could appear in this report;
     * 18 of them were datable from it. A citation is a citation wherever on
     * the row it was written down.
     *
     * The two are kept apart in the output because they are not equally
     * strong: `source.text` is a quotation and a note is a reader's prose, so
     * a note's number is as likely to be a folio, a page or a count as a date
     * — 46 of those 64 were exactly that.
     */
    for (const [where, text] of [['source', a.source?.text ?? ''], ['note', scrub(a.note ?? '')]]) {
    if (!text) continue;
    for (const o of offered(text)) {
      cited += 1;
      /*
       * A year has to be contained — a date that already spans it has taken
       * the reading, from this source or from another that agrees. A *century*
       * only has to overlap: «XIX» against a death of 1794-1806 is the same
       * claim stated coarsely, and demanding containment would report every
       * folder whose date is better than its citation.
       */
      const held = o.century
        ? has.some((h) => o.lo <= h.hi && o.hi >= h.lo)
        : has.some((h) => o.lo >= h.lo && o.hi <= h.hi);
      if (held) continue;
      rows.push({
        slug: entry.name,
        church: a.church,
        where,
        said: o.said,
        range: o.lo === o.hi ? String(o.lo) : `${o.lo}-${o.hi}`,
        dates: has.length ? has.map((h) => `${h.which} ${h.lo === h.hi ? h.lo : `${h.lo}-${h.hi}`}`).join(', ') : 'none',
      });
    }
    }
  }
}

rows.sort((a, b) => (a.dates === 'none') - (b.dates === 'none') || a.slug.localeCompare(b.slug));
for (const r of rows) {
  console.log(`${r.slug}  [${r.church}/${r.where}]  cited «${r.said}» = ${r.range}  against ${r.dates}`);
}
console.log(`\n${rows.length} of ${cited} cited years are outside the folder's own dates, over ${folders} folders.`);
console.log('Every row is a question, not a correction: the cited year may be the worse reading, or a different event.');
