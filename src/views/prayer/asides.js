import { formatLifespan } from '../../lib/calendar-page.js';
import { currentChurch } from '../../lib/church.js';
import { CHURCHES_BY_ID } from '../../data/churches.js';
import { loadDetail } from '../../lib/detail.js';
import { cardCrop } from '../../lib/hero-crop.js';
import { saintName } from '../../lib/honorific.js';
import { formatDate } from '../../lib/i18n.js';
import { escapeHtml as esc, firstParagraphText } from '../../lib/markdown.js';
import { relatedFor, sameDayFor } from '../../lib/prayer-order.js';
import { STRINGS, fill } from '../../ui/strings.js';
import { state } from './state.js';

const BASE = import.meta.env.BASE_URL;

/**
 * The two ways out of one saint and into the next: who the corpus records them
 * with, and who is kept on the same day.
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
 * **Past 1024 px only.** Below it the columns keep the drawing and the press
 * they shipped with — the review, the mockup and the author's instruction are
 * all the desk — so the phone's rows are untouched, including the row the
 * hymnal does not hold. `STRUCTURE.md` §6 carries the phone's half as open.
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
 */
function door(card, reachable, desk) {
  if (reachable) return { tag: 'button', attrs: ` type="button" data-go="${esc(card.slug)}"`, dim: false };
  if (desk && state?.router) {
    return { tag: 'a', attrs: ` href="${esc(state.router.href(`/saints/${card.slug}`))}"`, dim: true };
  }
  return { tag: 'button', attrs: ' type="button" disabled', dim: true };
}

/**
 * One row in the names face: the name, and the line under it.
 *
 * Every row says which saint it names whether or not it can be pressed, so a
 * test can ask the first question about a row that answers no to the second.
 */
function row(card, sub, open, plate) {
  const name = esc(saintName(card));
  return `<li><${open.tag} class="hy-link${open.dim ? ' is-dim' : ''}" data-slug="${esc(card.slug)}"${
    open.attrs
  }>${plate ? plateFor(card) : ''}<span class="hy-who">${name}<span class="hy-when utility">${esc(
    sub,
  )}</span></span></${open.tag}></li>`;
}

/**
 * The picture face of a row **below 1024 px**, which is the face this page
 * shipped with and keeps: an empty mat rather than a row shorter than its
 * neighbours. The desk's picture face is the tile below, and the phone's is
 * this — the mockup is a desktop drawing and the standing rule is that a
 * component shared with the phone only moves to where the mockup puts it.
 *
 * A 3:2 box whatever the icon's own proportions, filled and positioned by
 * `lib/hero-crop.js`'s focus so a face stays in the frame. The narrow
 * derivative (`cardSm`, 228 px) is the one asked for, because this column is
 * never wider than `--hy-side-w`.
 */
function plateFor(card) {
  const image = card.image;
  if (!image) return `<span class="hy-plate is-blank" aria-hidden="true"></span>`;
  const { focus } = cardCrop(image);
  return `<span class="hy-plate" style="--hy-focus:${focus}">
    <img src="${BASE + (image.cardSm ?? image.src)}" alt="" loading="lazy" decoding="async" />
  </span>`;
}

/**
 * One row in the picture face: **the Daily page's own tile**
 * (`../mockup-review/REVIEW.md` finding 9 — the mockup's comment,
 * "the saints beside are the Daily page's own tiles, the same elements"). A
 * 3:2 plate, the name, the day or the dates under it, and three lines of the
 * life.
 *
 * `calendar.css` draws it, off the seam stage G left: the boxes are named
 * `.reg-thumb` / `.reg-pic` / `.reg-name` / `.reg-sub` / `.reg-life` and the
 * tile is a bare `.day-tile` and **not** a `.reg-card`, whose base rules are
 * the 40 px register row this face replaces. That sheet is on the entry
 * bundle, so this costs the route nothing to reach — and the two lists are the
 * same drawing as the shelf rather than a copy of it.
 *
 * **No picture, no box.** The blank mat is emitted as the shelf emits it, and
 * the shared rule is what takes it out of the column — which is finding 16's
 * dark blocks: a 174x116 box of `--mount` under every one of the saints these
 * columns name who has no icon, which is most of them.
 */
function tile(card, sub, open) {
  const name = esc(saintName(card));
  const image = card.image;
  /*
   * The narrow derivative (`cardSm`, 228 px) over the full picture, because
   * this column is never wider than `--hy-side-w`; the lqip stands behind it
   * while it arrives, as the shelf's does. `cardCrop`'s focus is not asked
   * for: the plate face crops at 34% for every picture — "where a face sits in
   * a panel once the halo and the frame are allowed for" — and that number is
   * the sheet's, not this module's.
   */
  const media = image
    ? `<span class="reg-thumb"><span class="reg-pic" style="background-image:url('${
        BASE + image.lqip
      }')"><img src="${BASE + (image.cardSm ?? image.src)}" alt="" width="${image.w}" height="${
        image.h
      }" loading="lazy" decoding="async" /></span></span>`
    : `<span class="reg-thumb is-blank" aria-hidden="true"></span>`;
  return `<li><${open.tag} class="day-tile${open.dim ? ' is-dim' : ''}" data-slug="${esc(card.slug)}"${
    open.attrs
  }>${media}<span class="reg-name">${name}</span><span class="reg-sub utility">${esc(
    sub,
  )}</span><span class="reg-life" data-hy-life="${esc(card.slug)}" hidden></span></${open.tag}></li>`;
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
 * One list. `face` is `tile` past 1024 px in the picture face, `plate` in the
 * picture face below it, and `rows` in the names face at either width.
 */
function list(slugs, { bySlug, reach, face, desk, sub }) {
  const rows = slugs
    .map((slug) => bySlug?.get(slug))
    .filter(Boolean)
    .map((card) => {
      const open = door(card, reach.has(card.slug), desk);
      return face === 'tile' ? tile(card, sub(card), open) : row(card, sub(card), open, face === 'plate');
    });
  if (!rows.length) return `<p class="hy-line">${esc(STRINGS.prayer.none)}</p>`;
  /* `.day-grid` is the shelf's own column, from `calendar.css` and past 1024 px
     only; `.hy-links` is what makes it a list and not a stack of bullets. */
  const cls =
    face === 'tile' ? 'hy-links is-plate day-grid' : face === 'plate' ? 'hy-links is-plate' : 'hy-links';
  return `<ul class="${cls}">${rows.join('')}</ul>`;
}

/**
 * Three lines of who they were, in the tile face and at the width that draws
 * it. The same arrangement `daily/panel.js` makes for the shelf and for the
 * same reasons: the life is not in the manifest, so it arrives per saint and
 * four at a time (`lib/detail.js`'s own ceiling), and a box that never fills
 * stays `hidden` rather than standing empty.
 *
 * The generation guard is the card's: an answer that lands after the reader has
 * stepped on is about a saint who is no longer on the page. The box is checked
 * for still being in the document too, because these columns are rewritten
 * whole on every step and on every face switch.
 */
async function fillTileLives(root, generation) {
  const queue = [...root.querySelectorAll('[data-hy-life]')];
  const worker = async () => {
    while (queue.length) {
      const box = queue.shift();
      if (!state || state.generation !== generation) return;
      try {
        const payload = await loadDetail(box.dataset.hyLife);
        if (!state || state.generation !== generation || !box.isConnected) continue;
        const text = firstParagraphText(payload?.life);
        if (!text) continue;
        box.textContent = text;
        box.hidden = false;
      } catch {
        // A life that will not load leaves the tile as the manifest drew it: a
        // plate, a name and a day, which is what the tile said before this.
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
export function drawAsides(root, card) {
  const P = STRINGS.prayer;
  const bySlug = state?.data?.bySlug;
  const reach = state?.reach ?? new Set();
  /*
   * **The face is read here rather than passed in**, because every caller wants
   * the one the reader chose and none of them has an opinion about it: the
   * step, the payload landing, and the switch itself all draw the same face.
   */
  const desk = onDesk();
  const face = state?.view === 'plate' ? (desk ? 'tile' : 'plate') : 'rows';
  const detail = state?.detail ?? null;
  const generation = state?.generation ?? 0;
  const lifespan = (c) => formatLifespan(c.dates);

  const related = root.querySelector('#hy-related');
  if (related) {
    related.innerHTML = `<h2>${esc(P.related)}</h2>${list(relatedFor(card, detail), {
      bySlug,
      reach,
      face,
      desk,
      sub: lifespan,
    })}`;
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
  /* The day the list is, past 1024 px; the phone's rows keep the dates they
     have always printed. */
  const when = desk && day.iso ? dayLabel(day.iso) : null;
  sameday.innerHTML =
    `<h2>${esc(P.sameDay)}</h2>` +
    list(day.slugs, { bySlug, reach, face, desk, sub: when ? () => when : lifespan }) +
    (over > 0 ? `<p class="hy-line" data-hy-more>${esc(fill(P.andMore, { n: over }))}</p>` : '');
  if (day.iso) sameday.dataset.iso = day.iso;
  else delete sameday.dataset.iso;

  if (face === 'tile') void fillTileLives(root, generation);
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
