import { formatLifespan } from '../../lib/calendar-page.js';
import { currentChurch } from '../../lib/church.js';
import { CHURCHES_BY_ID } from '../../data/churches.js';
import { loadDetail } from '../../lib/detail.js';
import { saintName } from '../../lib/honorific.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { relatedFor, sameDayFor } from '../../lib/prayer-order.js';
import { STRINGS, fill } from '../../ui/strings.js';
import { state } from './state.js';

/**
 * The two ways out of one saint and into the next: who the corpus records them
 * with, and who is kept on the same day.
 *
 * **A saint the hymnal does not hold is named and left alone.** The relation is
 * a fact about the saint whether or not this page can carry the reader to it,
 * so the row is drawn dimmed and inert rather than dropped — dropping it would
 * make the corpus look smaller than it is, from a page that is a view onto one
 * corner of it.
 */

/**
 * One row. Every row says which saint it names; only a row the press can act on
 * carries `data-go`, which is what the delegated handler reads — so "who is
 * named here" and "where can this go" are two attributes and not one, and a
 * test can ask the first question about a row that answers no to the second.
 */
function link(card, reachable) {
  const name = esc(saintName(card));
  const when = esc(formatLifespan(card.dates));
  const go = reachable ? ` data-go="${esc(card.slug)}"` : ' disabled';
  return `<li><button class="hy-link" type="button" data-slug="${esc(card.slug)}"${go}>${name}<span class="hy-when utility">${when}</span></button></li>`;
}

function list(slugs, bySlug, reach) {
  const rows = slugs
    .map((slug) => bySlug?.get(slug))
    .filter(Boolean)
    .map((card) => link(card, reach.has(card.slug)));
  if (!rows.length) return `<p class="hy-line">${esc(STRINGS.prayer.none)}</p>`;
  return `<ul class="hy-links">${rows.join('')}</ul>`;
}

/**
 * Both asides for the saint in hand.
 *
 * **Drawn twice on purpose.** `mentionedIn` is on the card and is immediate;
 * `related` arrives with the saint's own folder. Calling this once at the step
 * and again when the payload lands means the column is there before the fetch
 * rather than appearing under the reader a moment later — and because
 * `relatedFor` puts the immediate half first, the second draw appends rather
 * than reorders.
 *
 * The same day needs no payload at all: `lib/prayer-order.js` resolves it out
 * of the manifest's own attestations, in the reader's church and for the year
 * the caller names.
 */
export function drawAsides(root, card, detail = null) {
  const P = STRINGS.prayer;
  const bySlug = state?.data?.bySlug;
  const reach = state?.reach ?? new Set();

  const related = root.querySelector('#hy-related');
  if (related) {
    related.innerHTML = `<h2>${esc(P.related)}</h2>${list(relatedFor(card, detail), bySlug, reach)}`;
  }

  const sameday = root.querySelector('#hy-sameday');
  if (!sameday) return;
  const day = sameDayFor(card, {
    saints: state?.data?.saints,
    churchId: currentChurch(),
    churchesById: CHURCHES_BY_ID,
    /*
     * **The year is this one, and it is written into the markup.** A feast is a
     * menologion position and the civil day it falls on depends on the church
     * and the year, so an aside that did not say which year it resolved would
     * be an answer with its question missing — and a test could only check it
     * by making the same assumption twice.
     */
    year: new Date().getFullYear(),
  });
  const over = day.total - day.slugs.length;
  sameday.innerHTML =
    `<h2>${esc(P.sameDay)}</h2>` +
    list(day.slugs, bySlug, reach) +
    (over > 0 ? `<p class="hy-line" data-hy-more>${esc(fill(P.andMore, { n: over }))}</p>` : '');
  if (day.iso) sameday.dataset.iso = day.iso;
  else delete sameday.dataset.iso;
}

/**
 * The asides' own half of the payload: `related` merged in once the folder has
 * answered. Same generation guard as the card's — an answer that arrives after
 * the reader has stepped on is about a saint who is no longer on the page.
 */
export function fillAsides(root, card, generation) {
  loadDetail(card.slug).then(
    (payload) => {
      if (!state || state.generation !== generation) return;
      drawAsides(root, card, payload?.saint);
    },
    () => {
      /* The folder did not answer; the aside keeps the half the manifest gave
         it, which is a smaller true list rather than a guessed one. */
    },
  );
}
