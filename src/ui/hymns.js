/**
 * A hymn, drawn the same way wherever it appears: the Daily page's hymns for
 * the day and, since 2026-08-25, the hymns on a saint's own page (author:
 * "on each Saint Profile page, add their hymns at the bottom").
 *
 * Every hymn is the cited source's own text in the source's own language —
 * Church Slavonic from days.pravoslavie.ru, Greek from saint.gr, Romanian
 * from doxologia.ro, Serbian from pravoslavno.rs. None of them
 * is translated here and none ever will be by this build: a translated
 * troparion would be the invented content wearing vestments. The
 * `lang` on the text is what tells a screen reader which tongue to read it in.
 *
 * **An English reader is given English where there is any** (author,
 * 2026-08-26: "when you select English as the language, on any calendar, it
 * should be in English"). A hymn may carry an `english` block, and since
 * 2026-09-07 it arrives one of two ways — which is the whole of what this
 * file now has to say out loud.
 *
 * **A citation**: somebody else's published rendering of that same hymn, with
 * its own source. Hapgood's Service Book (1906) is the one the corpus cites,
 * long in the public domain, which the OCA's modern translations are not.
 *
 * **Or this site's own** (`rendered: 'site'`). the corpus's no-invention rule forbade that from
 * 2026-08-22 — no invented content — and the author reversed it for hymns
 * alone on 2026-09-07, on the ground that a reader who has chosen English and
 * meets Church Slavonic has been given nothing. The reversal is recorded in
 * git log rather than absorbed, and **it costs a line of type**: a
 * rendering made here is a different kind of claim from a text copied out of a
 * book, and the page says which it is under every hymn. Nothing else in the
 * corpus is translated, and nothing here licenses it.
 */

import { escapeHtml as esc } from '../lib/markdown.js';
import { churchName } from '../lib/church.js';
import { currentLanguage } from '../lib/i18n.js';
import { toneNumber } from '../lib/tone.js';
import { STRINGS, fill } from './strings.js';

/**
 * One hymn, with its tone, its model and its source. `withChurch` names the
 * church the hymn was read from — worth saying only where a page shows the
 * hymns of more than one, which on the Daily page it never does and on a
 * saint's page it often must: 50 of the 132 saints with hymns have them from
 * two churches or more, and two troparia with no label would read as a
 * duplication rather than as two calendars singing.
 */
export function hymnMarkup(h, { withChurch = false } = {}) {
  const H = STRINGS.calendar.hymns;
  // English if the reader is reading English and somebody has published one;
  // the source's own tongue otherwise. `lang` follows the text, always, so a
  // screen reader is never handed English in a Greek voice.
  const rendering = currentLanguage() === 'en' && h.english ? h.english : h;
  const lang = rendering === h ? h.lang : 'en';
  /*
   * **Whether the reader is being shown the original at all**, which the
   * heading has to know as well as the body does (author, 2026-09-24: "there
   * are still errors where some hymns show in other languages when English is
   * chosen"). The `english` block covers the *text* and nothing else, so with
   * English chosen the page printed an English troparion under a heading
   * quoting the source's own calendar — `Troparion · Tone 4 · Ταχὺ
   * προκατάλαβε. · Greek`. **263 of the corpus's 872 hymns carry a `model`**
   * (`scratchpad/hymn-head-language.mjs` prints the rows) and it was written
   * into the heading untouched whatever language the reader had chosen, in
   * Greek, Church Slavonic or Romanian. Three more print a `tone` the eight-
   * tone reader cannot resolve — `Ἦχος πλ.`, truncated at its source — and
   * those fell back to the Greek string for the same reason.
   *
   * So both follow the text: they are the source's own words about the
   * source's own hymn, and they are printed beside the source's own hymn.
   * Where an English rendering stands in its place the heading **says the
   * melody was not rendered** rather than quoting it in a tongue the reader
   * did not ask for — CLAUDE.md's errors rule, a failure may degrade the page
   * and never fake it. Nothing here translates an incipit: a `model` names
   * another hymn by quoting its opening words, so rendering it would be
   * inventing a citation, which is the one thing the 2026-09-07 reversal did
   * not license.
   *
   * An unreadable tone is dropped instead of admitted because a tone the page
   * could not read is not a fact the page holds — there is no eighth of the
   * Octoechos to name and no silence to explain, only a string it could not
   * parse. The melody is different: the corpus *has* it and has not rendered
   * it, and that is a gap the reader should be able to see.
   */
  const showingOriginal = rendering === h;
  /*
   * **The tone in the reader's own words** (author, 2026-09-07: the hymns
   * "say Glasul 3 (Romanian) instead of ἦχος or whatever it's supposed to
   * be"). It was printed exactly as its source wrote it, which put a Romanian
   * tone beside a Greek heading and a Greek church name, and an English
   * rendering under «глас 4» — the open item HANDOFF had twice left to the
   * author. `toneNumber` reads the eight-tone Octoechos number out of any of
   * the three notations; the pack says the word. Where it cannot be read the
   * source's own string stands, which is the one honest fallback.
   */
  const toneNo = toneNumber(h.tone);
  /*
   * Every calendar that sings it, where the page is naming calendars at all.
   * `mergeForReading` puts the others in `alsoIn`, so a hymn the Greek and the
   * Russian share reads "Greek · Russian" over one text rather than appearing
   * twice under one name each.
   */
  const churches = withChurch && h.church
    ? [h.church, ...(h.alsoIn ?? []).map((a) => a.church)].map(churchName).join(' · ')
    : null;
  const head = [
    H[h.kind] ?? h.kind,
    toneNo ? fill(STRINGS.calendar.liturgy.tone, { tone: toneNo }) : (showingOriginal ? h.tone : null),
    h.model && (showingOriginal ? h.model : H.modelNotRendered),
    churches,
  ]
    .filter(Boolean)
    .map(esc)
    .join(' · ');
  /*
   * **What is under the hymn is either a book or the text this one was made
   * from, and it is always a citation** (author, 2026-09-24: the rendering
   * "doesnt list the original thing it was translated from"). Until now a site
   * rendering printed four words and no source at all, on the argument that
   * the original was one press of the language control away. The author has
   * ruled otherwise: a translation is a claim about a particular text, and a
   * reader cannot check it against a text the page declines to name. So the
   * footer says which book published the English, or — where this site made
   * it — which published the original it was made from.
   */
  const own = rendering !== h && rendering.rendered === 'site';
  const cite = (o) =>
    o?.url
      ? `<a href="${esc(o.url)}" rel="noopener noreferrer">${esc(o.text)}</a>`
      : esc(o?.text ?? '');
  /*
   * **And every book that printed it** — or, for a rendering made here, every
   * calendar whose text it was made from. A merged hymn carries one citation
   * per tradition in the order the page names the calendars, because "cite
   * this as a Greek source, and this as a Russian source" is the whole of what
   * the merge owes the reader; `mergeForReading` records each tradition's own
   * `original` beside the book that published its English, so the two lists
   * are the same length whichever kind of claim the footer is making.
   *
   * Deduplicated on the rendered citation because one book can answer for more
   * than one tradition — a general service covers a Greek apostle and a
   * Slavonic one alike — and the merged row said so twice.
   */
  const src = [
    own ? h.source : rendering.source,
    ...(h.alsoIn ?? []).map((a) => (own ? a.original : a.source)),
  ]
    .filter(Boolean)
    .map(cite)
    .filter((c, i, all) => all.indexOf(c) === i)
    .join('; ');
  const foot = fill(own ? H.renderedFrom : H.source, { source: src });
  return `<div class="hymn"${own ? ' data-rendered="site"' : ''}>
    <h3 class="hymn-kind utility">${head}</h3>
    <p class="hymn-text" lang="${esc(lang)}">${esc(rendering.text)}</p>
    <p class="hymn-source utility">${foot}</p>
  </div>`;
}

/**
 * **One hymn sung in two calendars is one hymn** (author, 2026-09-12: "If
 * there is a troparion in Russian and Greek, they should be the same when
 * translated to English … No double ups. If they are completely different,
 * just cite this as a Greek source, and this as a Russian source").
 *
 * A saint's apolytikion is very often the same text in Greek, Church
 * Slavonic and Romanian — the corpus holds 33 hymns that appear in more than
 * one tradition — and each tradition cites its own book for it. In their own
 * tongues those are three different things to read and all three belong on the
 * page. **In English they are one text printed three times**, which reads as
 * the site not knowing it has repeated itself.
 *
 * So the collapse happens here, at the reading, and never in the data: the
 * folder keeps every tradition's own hymn with its own citation, because that
 * is what is true and what a Greek or Russian reader is shown. What English
 * gets is one text carrying every source that published it.
 *
 * **Keyed on the rendered English, not on the tone or the saint.** Two hymns
 * that translate to the same words are the same hymn whatever their headings
 * say, and two that do not are two — which is the author's own second clause,
 * and it needs no rule of its own because different text simply does not
 * collide. Whitespace is normalised because the sources punctuate their line
 * breaks differently; nothing else is touched.
 */
export function mergeForReading(hymns, language = currentLanguage()) {
  const all = hymns ?? [];
  if (language !== 'en') return all;
  const key = (h) => (h.english?.text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  const out = [];
  const byText = new Map();
  for (const h of all) {
    const k = key(h);
    // No English yet: it cannot collide with anything, and it is shown in its
    // own tongue exactly as before.
    if (!k) {
      out.push(h);
      continue;
    }
    const seen = byText.get(k);
    if (!seen) {
      const copy = { ...h, alsoIn: [] };
      byText.set(k, copy);
      out.push(copy);
      continue;
    }
    // The second and later tradition to sing it: the text is already on the
    // page, so what this one adds is its church and its book.
    // `original` is kept beside `source` because the footer needs one or the
    // other and cannot recover it later: a rendering made here cites the text
    // it was made from, a citation cites the book that printed the English.
    seen.alsoIn.push({ church: h.church, source: h.english?.source ?? h.source, original: h.source });
  }
  return out;
}

/**
 * Every hymn the corpus has for one saint, as a section, or '' where there
 * are none — which is 576 of the 708, so the heading is never printed over an
 * empty box. The reader's own church leads, because that is the calendar the
 * whole site is read in; the others follow rather than being hidden, since a
 * saint's page is where a reader has already chosen to look at one saint
 * whole.
 */
export function saintHymnsSection(hymns, church) {
  const all = mergeForReading(hymns ?? []);
  if (!all.length) return '';
  const ordered = [...all].sort((a, b) => (b.church === church) - (a.church === church));
  // Counted after the merge and across what each row now names, so a merged
  // row still asks for its label: it is the one row that most needs it.
  const spans = new Set(all.flatMap((h) => [h.church, ...(h.alsoIn ?? []).map((a) => a.church)])).size > 1;
  return `<section class="saint-hymns" data-saint-hymns>
    <h2 class="register-heading">${STRINGS.calendar.hymns.heading}</h2>
    ${ordered.map((h) => hymnMarkup(h, { withChurch: spans })).join('')}
  </section>`;
}
