/**
 * A hymn, drawn the same way wherever it appears: the Daily page's hymns for
 * the day and, since 2026-08-25, the hymns on a saint's own page (author:
 * "on each Saint Profile page, add their hymns at the bottom").
 *
 * Every hymn is the cited source's own text in the source's own language —
 * Church Slavonic from days.pravoslavie.ru, Greek from saint.gr, Romanian
 * from doxologia.ro, Serbian from pravoslavno.rs (Amendment 28). None of them
 * is translated here and none ever will be by this build: a translated
 * troparion would be Amendment 2's invented content wearing vestments. The
 * `lang` on the text is what tells a screen reader which tongue to read it in.
 *
 * **An English reader is given English where there is any** (author,
 * 2026-08-26: "when you select English as the language, on any calendar, it
 * should be in English"). A hymn may carry an `english` block, and since
 * 2026-09-07 it arrives one of two ways — which is the whole of what this
 * file now has to say out loud.
 *
 * **A citation**: somebody else's published rendering of that same hymn, with
 * its own source. Orloff's General Menaion (1899) and Hapgood's Service Book
 * (1906) are the two, both long in the public domain, which the OCA's modern
 * translations are not.
 *
 * **Or this site's own** (`rendered: 'site'`). Amendment 2 forbade that from
 * 2026-08-22 — no invented content — and the author reversed it for hymns
 * alone on 2026-09-07, on the ground that a reader who has chosen English and
 * meets Church Slavonic has been given nothing. The reversal is recorded in
 * SESSIONS.md rather than absorbed, and **it costs a line of type**: a
 * rendering made here is a different kind of claim from a text copied out of a
 * book, and the page says which it is under every hymn. Nothing else in the
 * corpus is translated, and nothing here licenses it.
 */

import { escapeHtml as esc } from '../lib/markdown.js';
import { churchName } from '../lib/church.js';
import { currentLanguage } from '../lib/i18n.js';
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
  const head = [
    H[h.kind] ?? h.kind,
    h.tone,
    h.model,
    withChurch && h.church ? churchName(h.church) : null,
  ]
    .filter(Boolean)
    .map(esc)
    .join(' · ');
  /*
   * **What is under the hymn is either a source or an admission.** A site
   * rendering has no citation to give — there is no book — so printing
   * "Text from" with an empty name would read as a gap rather than as the
   * different thing it is. Four words, and no naming of the tongue it came
   * from: the heading already says whose hymn it is where more than one
   * church's are shown, the text carries its own `lang`, and the original is
   * one press of the language control away on the same page. A second string
   * per locale pack to say what the page already says is four packs of work
   * for nothing.
   */
  const own = rendering !== h && rendering.rendered === 'site';
  const src = rendering.source?.url
    ? `<a href="${esc(rendering.source.url)}" rel="noopener noreferrer">${esc(rendering.source.text)}</a>`
    : esc(rendering.source?.text ?? '');
  const foot = own
    ? esc(H.renderedHere)
    : fill(H.source, { source: src });
  return `<div class="hymn"${own ? ' data-rendered="site"' : ''}>
    <h3 class="hymn-kind utility">${head}</h3>
    <p class="hymn-text" lang="${esc(lang)}">${esc(rendering.text)}</p>
    <p class="hymn-source utility">${foot}</p>
  </div>`;
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
  const all = hymns ?? [];
  if (!all.length) return '';
  const ordered = [...all].sort((a, b) => (b.church === church) - (a.church === church));
  const spans = new Set(all.map((h) => h.church)).size > 1;
  return `<section class="saint-hymns" data-saint-hymns>
    <h2 class="register-heading">${STRINGS.calendar.hymns.heading}</h2>
    ${ordered.map((h) => hymnMarkup(h, { withChurch: spans })).join('')}
  </section>`;
}
