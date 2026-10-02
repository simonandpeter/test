import { currentChurch } from '../../lib/church.js';
import { CHURCHES_BY_ID } from '../../data/churches.js';
import { loadDetail } from '../../lib/detail.js';
import { formatDate } from '../../lib/i18n.js';
import { escapeHtml as esc, firstParagraphText } from '../../lib/markdown.js';
import { relatedFor, sameDayFor } from '../../lib/prayer-order.js';
import { STRINGS, fill } from '../../ui/strings.js';
import { card } from '../index/grid.js';
import { state } from './state.js';

/**
 * The two ways out of one saint and into the next: who the corpus records them
 * with, and who is kept on the same day.
 *
 * **One row drawing, and it is All Saints'** (author, 2026-10-02: "The
 * 'Recorded with' and 'Kept the same day' rows should have the same design as
 * the all saints entries advanced search mode row cards. Dont know why they are
 * so different. SSOT"). These columns drew their own `.hy-link` row and
 * borrowed the Daily shelf's `.day-tile` for the picture face, which was three
 * drawings of one thing; they now draw `views/index/grid.js`'s `card()`, in its
 * row shape and its card shape, and the face chip in the shell above is All
 * Saints' own View chip over the same two words.
 *
 * **Every name opens something** (the author, 2026-09-17: "in the prayer
 * section clicking on the names does nothing"; the ruling in
 * `../mockup-review/BRIEF.md`, stage I). A saint the hymnal holds
 * opens here, in place, which is what these columns are for. A saint it does
 * not hold opens their own page, because the relation is a fact about the
 * saint and a reader who presses a name has asked to read them — and 84 of the
 * 116 names the review walked did nothing at all.
 *
 * **The dim stays, and it is the door that changed.** A row the hymnal does
 * not hold is still marked as one this page cannot carry the reader through,
 * and it is now a link out rather than an inert button: two doors, two
 * elements, and the element is what says which.
 *
 * **Past 1024 px only.** Below it the columns keep the press they shipped with
 * — the review, the mockup and the author's instruction are all the desk — so
 * the phone's row the hymnal does not hold is still inert.
 * `STRUCTURE.md` §6 carries the phone's half as open.
 */

const DESK = '(min-width: 1024px)';

/** Whether this is the width the mockup was drawn at. */
const onDesk = () => (typeof window === 'undefined' ? false : !!window.matchMedia?.(DESK).matches);

/**
 * Which door a row carries, as the element that carries it.
 *
 * `data-go` is still the attribute `prayer.js` delegates on, and still says
 * only "this page can reach them" — the review's own reading, that "who is
 * named here" and "where can this go" are two questions. A row that answers no
 * to the second is an `<a>` to the saint's own page past 1024 px, and below it
 * the inert button it has always been.
 *
 * It is handed to `card()` as that function's `door`, which is the seam this
 * module needed: an All Saints row wraps the name in a link to the saint's own
 * page, and here the common case must not leave the hymnal.
 */
function door(saint, reachable, desk) {
  if (reachable) return { tag: 'button', attrs: ` type="button" data-go="${esc(saint.slug)}"`, dim: false };
  if (desk && state?.router) {
    return { tag: 'a', attrs: ` href="${esc(state.router.href(`/saints/${saint.slug}`))}"`, dim: true };
  }
  return { tag: 'button', attrs: ' type="button" disabled', dim: true };
}

/**
 * One row, which is one index card.
 *
 * The `<li>` is the card's own box — `.index-card` is what `index.css` dresses
 * and the layout classes are that sheet's, not this one's — and `data-slug` is
 * on it, so a test can ask which saint a row names whether or not it can be
 * pressed.
 *
 * `detailed` follows the face rather than being a control of its own: the card
 * shape is this page's picture face, and three lines of the life under a plate
 * is what the mockup drew there (`../mockup-review/REVIEW.md` finding 9). In
 * the row shape there is no room for it, which is the same bargain All Saints
 * strikes.
 */
function entry(saint, { rows, sub, open }) {
  return `<li class="index-card panel${rows ? ' is-row' : ''}${
    open.dim ? ' is-dim' : ''
  }" data-slug="${esc(saint.slug)}">${card(saint, state.router, {
    rows,
    detailed: !rows,
    door: () => open,
    sub,
  })}</li>`;
}

/**
 * **The day, not the lifespan, under a name kept on the same day** (finding 9:
 * the mockup's sub prints "3 September"). One value for the whole list, because
 * one day is what the list is — `sameDayFor` has already resolved it for this
 * church and this year and the caller hands it over rather than resolving it
 * twice.
 *
 * `Intl` and not a pattern of ours: the day before the month in all five
 * languages, in the case each of them puts a date in. Nothing new in the packs.
 */
const dayLabel = (iso) =>
  iso ? formatDate({ day: 'numeric', month: 'long', timeZone: 'UTC' }, new Date(`${iso}T00:00:00Z`)) : '';

/**
 * One list. `sub` is null where the card's own line — the office and the dates
 * All Saints prints — is the right one, which is both columns except the
 * same-day one past 1024 px.
 */
function list(slugs, { bySlug, reach, rows, desk, sub }) {
  const items = slugs
    .map((slug) => bySlug?.get(slug))
    .filter(Boolean)
    .map((saint) => entry(saint, { rows, sub, open: door(saint, reach.has(saint.slug), desk) }));
  if (!items.length) return `<p class="hy-line">${esc(STRINGS.prayer.none)}</p>`;
  /* `.hy-links` is what makes it a list and not a stack of bullets; `is-plate`
     is the stack of cards, which is a column and not a grid. */
  return `<ul class="hy-links${rows ? '' : ' is-plate'}">${items.join('')}</ul>`;
}

/**
 * Three lines of who they were, in the card face and at the width that draws
 * it. The same arrangement `daily/panel.js` makes for the shelf and for the
 * same reasons: the life is not in the manifest, so it arrives per saint and
 * four at a time (`lib/detail.js`'s own ceiling).
 *
 * **`[data-desc]` and not a box of this module's own**, which is the other half
 * of sharing the drawing: the description box is the shared card's, so the
 * attribute on it is the shared card's too. What stays this module's is the
 * filling — an answer that lands after the reader has stepped on is about a
 * saint who is no longer on the page, and All Saints' own filler has no
 * generation to guard against. The box is checked for still being in the
 * document as well, because these columns are rewritten whole on every step
 * and on every face switch.
 *
 * **No fallback to the types**, where All Saints prints them: a column of
 * margins is not the place to put "Martyr" under a name whose line already
 * says it. A life that will not load leaves the row as the manifest drew it.
 */
async function fillLives(root, generation) {
  const queue = [...root.querySelectorAll('.hy-links [data-desc]')];
  const worker = async () => {
    while (queue.length) {
      const box = queue.shift();
      if (!state || state.generation !== generation) return;
      const slug = box.closest('[data-slug]')?.dataset.slug;
      try {
        const payload = await loadDetail(slug);
        if (!state || state.generation !== generation || !box.isConnected) continue;
        const text = firstParagraphText(payload?.life);
        box.textContent = text ?? '';
        box.hidden = !text;
      } catch {
        // A life that will not load leaves the row as the manifest drew it: a
        // plate, a name and a line, which is what the row said before this.
        if (box.isConnected) box.hidden = true;
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
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
 *
 * **Neither list ever names the saint in hand** — `relatedFor` seeds its seen
 * set with them and `sameDayFor` filters them out — so the mockup's `.is-on`
 * has nothing to mark here and is not emitted. The mockup does not emit it
 * either; the shelf makes the same statement as `display: none` on its picked
 * tile. Said plainly rather than shipped as a rule no test can reach.
 */
export function drawAsides(root, saint) {
  const P = STRINGS.prayer;
  const bySlug = state?.data?.bySlug;
  const reach = state?.reach ?? new Set();
  /*
   * **The face is read here rather than passed in**, because every caller wants
   * the one the reader chose and none of them has an opinion about it: the
   * step, the payload landing, and the switch itself all draw the same face.
   */
  const desk = onDesk();
  const rows = state?.layout === 'rows';
  const detail = state?.detail ?? null;
  const generation = state?.generation ?? 0;

  const related = root.querySelector('#hy-related');
  if (related) {
    related.innerHTML = `<h2>${esc(P.related)}</h2>${list(relatedFor(saint, detail), {
      bySlug,
      reach,
      rows,
      desk,
      sub: null,
    })}`;
  }

  const sameday = root.querySelector('#hy-sameday');
  if (!sameday) return;
  const day = sameDayFor(saint, {
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
  /* The day the list is, past 1024 px; the phone's rows keep the card's own
     line, which is the one every other row on the site prints. */
  const when = desk && day.iso ? dayLabel(day.iso) : null;
  sameday.innerHTML =
    `<h2>${esc(P.sameDay)}</h2>` +
    list(day.slugs, { bySlug, reach, rows, desk, sub: when ? () => when : null }) +
    (over > 0 ? `<p class="hy-line" data-hy-more>${esc(fill(P.andMore, { n: over }))}</p>` : '');
  if (day.iso) sameday.dataset.iso = day.iso;
  else delete sameday.dataset.iso;

  if (!rows) void fillLives(root, generation);
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
export function fillAsides(root, saint, generation) {
  const draw = (detail) => {
    if (!state || state.generation !== generation) return;
    /* The one writer of `state.detail`: it is the aside's half of the payload
       and it is kept so that a redraw which is not a step — the reader
       switching the two columns' face — does not lose the half that arrived
       with the fetch. */
    state.detail = detail;
    drawAsides(root, saint);
  };
  loadDetail(saint.slug).then(
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
