import { formatLifespan } from '../../lib/calendar-page.js';
import { currentChurch } from '../../lib/church.js';
import { CHURCHES_BY_ID } from '../../data/churches.js';
import { loadDetail } from '../../lib/detail.js';
import { cardCrop } from '../../lib/hero-crop.js';
import { saintName } from '../../lib/honorific.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { relatedFor, sameDayFor } from '../../lib/prayer-order.js';
import { STRINGS, fill } from '../../ui/strings.js';
import { state } from './state.js';

const BASE = import.meta.env.BASE_URL;

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
function link(card, reachable, plate) {
  const name = esc(saintName(card));
  const when = esc(formatLifespan(card.dates));
  const go = reachable ? ` data-go="${esc(card.slug)}"` : ' disabled';
  return `<li><button class="hy-link" type="button" data-slug="${esc(card.slug)}"${go}>${
    plate ? plateFor(card) : ''
  }<span class="hy-who">${name}<span class="hy-when utility">${when}</span></span></button></li>`;
}

/**
 * The picture face of a row.
 *
 * **A plate of the saint above their name**, in the shape the rest of the site
 * gives a small icon: a 3:2 box whatever the icon's own proportions, filled and
 * positioned by `lib/hero-crop.js`'s focus so a face stays in the frame. The
 * narrow derivative (`cardSm`, 228 px) is the one asked for, because this
 * column is never wider than `--hy-side-w`.
 *
 * **A saint with no icon keeps their plate** — an empty mat rather than a row
 * that is shorter than its neighbours. Sixty-four of the hymnal's own 142 have
 * no picture and far more of the saints these columns *name* have none, so a
 * face that collapsed for them would be a face with holes in it, and a reader
 * would read the holes as something meant.
 */
function plateFor(card) {
  const image = card.image;
  if (!image) return `<span class="hy-plate is-blank" aria-hidden="true"></span>`;
  const { focus } = cardCrop(image);
  return `<span class="hy-plate" style="--hy-focus:${focus}">
    <img src="${BASE + (image.cardSm ?? image.src)}" alt="" loading="lazy" decoding="async" />
  </span>`;
}

function list(slugs, bySlug, reach, plate) {
  const rows = slugs
    .map((slug) => bySlug?.get(slug))
    .filter(Boolean)
    .map((card) => link(card, reach.has(card.slug), plate));
  if (!rows.length) return `<p class="hy-line">${esc(STRINGS.prayer.none)}</p>`;
  return `<ul class="hy-links${plate ? ' is-plate' : ''}">${rows.join('')}</ul>`;
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
export function drawAsides(root, card) {
  const P = STRINGS.prayer;
  const bySlug = state?.data?.bySlug;
  const reach = state?.reach ?? new Set();
  /*
   * **The face is read here rather than passed in**, because every caller wants
   * the one the reader chose and none of them has an opinion about it: the
   * step, the payload landing, and the switch itself all draw the same face.
   */
  const plate = state?.view === 'plate';
  const detail = state?.detail ?? null;

  const related = root.querySelector('#hy-related');
  if (related) {
    related.innerHTML = `<h2>${esc(P.related)}</h2>${list(relatedFor(card, detail), bySlug, reach, plate)}`;
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
    list(day.slugs, bySlug, reach, plate) +
    (over > 0 ? `<p class="hy-line" data-hy-more>${esc(fill(P.andMore, { n: over }))}</p>` : '');
  if (day.iso) sameday.dataset.iso = day.iso;
  else delete sameday.dataset.iso;
}

/**
 * Both asides, drawn when the saint's own folder has answered — **or when it
 * has failed to**, which is the same moment for this page's purposes and is why
 * both branches draw.
 *
 * `related` lives in that payload and `mentionedIn` is already on the card, so
 * waiting costs only the half that was immediate and buys a page that does not
 * move under the reader (`card.js` has the measurement). A folder that never
 * answers leaves the columns holding the manifest's half alone — a smaller true
 * list rather than a guessed one, and never an empty column where a relation
 * exists.
 *
 * Same generation guard as the card's: an answer that arrives after the reader
 * has stepped on is about a saint who is no longer on the page.
 */
export function fillAsides(root, card, generation) {
  const draw = (detail) => {
    if (!state || state.generation !== generation) return;
    /* The one writer of `state.detail`: it is the aside's half of the payload
       and it is kept so that a redraw which is not a step — the reader
       switching the two columns' face — does not lose the half that arrived
       with the fetch. */
    state.detail = detail;
    drawAsides(root, card);
  };
  loadDetail(card.slug).then(
    (payload) => draw(payload?.saint ?? null),
    () => draw(null),
  );
}

/**
 * Empties both columns, which is what a query matching nobody leaves behind.
 * The headings go with the lists: a heading over nothing is a promise the page
 * is not keeping, and the count line has already said what happened.
 */
export function clearAsides(root) {
  for (const id of ['#hy-related', '#hy-sameday']) {
    const aside = root.querySelector(id);
    if (aside) aside.innerHTML = '';
  }
}
