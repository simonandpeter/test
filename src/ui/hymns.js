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
 */

import { escapeHtml as esc } from '../lib/markdown.js';
import { churchName } from '../lib/church.js';
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
  const head = [
    H[h.kind] ?? h.kind,
    h.tone,
    h.model,
    withChurch && h.church ? churchName(h.church) : null,
  ]
    .filter(Boolean)
    .map(esc)
    .join(' · ');
  const src = h.source?.url
    ? `<a href="${esc(h.source.url)}" rel="noopener noreferrer">${esc(h.source.text)}</a>`
    : esc(h.source?.text ?? '');
  return `<div class="hymn">
    <h3 class="hymn-kind utility">${head}</h3>
    <p class="hymn-text" lang="${esc(h.lang)}">${esc(h.text)}</p>
    <p class="hymn-source utility">${fill(H.source, { source: src })}</p>
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
