import { formatSubtext } from '../../lib/calendar-page.js';
import { observePrefetch, prefetch } from '../../lib/detail.js';
import { saintName } from '../../lib/honorific.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { loopScroll, loopSlice, windowImages } from '../../ui/loop-scroll.js';
import * as store from '../../lib/store.js';
import { STRINGS } from '../../ui/strings.js';
import { state } from './state.js';

/* The site's base path, declared per file as every other view does. */
const BASE = import.meta.env.BASE_URL;

/*
 * **The carousel drew from a sample of 48 until 2026-08-28**, on the reasoning
 * that a track carrying all 742 plus its clone buffer is ~800 nodes and 742
 * pictures the reader will never reach. The author reversed it — "It should be
 * able to show all of them" — and the cost half of that reasoning had already
 * been paid down by `windowImages`, which holds only the bitmaps near the
 * viewport, and by the width/height attributes that keep an empty box the size
 * of a full one. What is left is nodes, which are cheap, rather than decoded
 * images, which are not.
 */

/**
 * How far either side of the track a picture is held (author, 2026-08-28:
 * "increasing the loading distance off screen for mobile").
 *
 * A phone's cards are 150 px against a desk's 240, so a flat margin buys a
 * phone *fewer* cards of warning than a desk while being the surface where a
 * picture arriving late is most obvious. Roughly seven cards ahead on a phone
 * and three at a desk; the desk's number is unchanged, because that is the
 * surface the author called laggy and more held bitmaps is the wrong direction
 * there.
 */
const imageMargin = () => (stacking() ? 1100 : 700);

/** Copies either side of the run. Wide enough that a hard fling cannot outrun
 *  the buffer before the correction is allowed to land (see ui/loop-scroll). */
const CAROUSEL_BUFFER = 12;

/**
 * The Index's two faces, and the toggle between them.
 *
 * The carousel and the search grid are one page in two modes, not two pages,
 * and the machinery here is what keeps that true: the mode is a stored
 * setting, the toggle names the *other* face, and switching reads the track's
 * position before it hides it. That last is a real ordering dependency and not
 * incidental — `switchMode` takes the carousel's scrollLeft while the element
 * is still laid out, because a hidden element measures zero.
 *
 * The row's own mechanics are `ui/loop-scroll.js`, which is already a module
 * and wants no splitting; this owns which face is showing and what it costs to
 * change.
 */

/**
 * Which of the page's two faces is showing (author, 2026-08-27).
 *
 * Carousel is the page as it opens: the heading, its toggle, the search field,
 * and a drifting row of saints under it. Advanced search is everything else the
 * Index has always been. The parts are the same DOM either way — the mode is a
 * class on the view, so nothing is rebuilt to change face and the reader's
 * filters survive a trip through the carousel and back.
 */
export function applyMode() {
  const { el, mode } = state;
  const carousel = mode === 'carousel';
  /*
   * **Read the row's offset before anything is hidden.** A `display: none`
   * element reports `scrollLeft` 0 and ignores writes — the pitfall
   * `ui/loop-scroll.js` opens by warning about, walked into three lines later
   * by hiding the carousel and *then* asking where it was. The answer was
   * always 0, so coming back always reopened at the start.
   */
  if (!carousel && state.loop) {
    state.carouselAt = el.querySelector('[data-carousel-track]').scrollLeft;
  }
  el.classList.toggle('is-carousel', carousel);
  el.classList.toggle('is-search', !carousel);
  el.querySelector('[data-carousel]').hidden = !carousel;
  el.querySelector('[data-grid]').hidden = carousel;

  // The button names the mode it goes to, not the one it is in.
  paintModeLabel(carousel ? STRINGS.saints.modeToSearch : STRINGS.saints.modeToCarousel);

  if (carousel) paintCarousel();
  else {
    // The offset was taken above, while the row could still answer.
    state.loop?.destroy();
    state.loop = null;
    state.carouselPrefetch?.();
    state.carouselPrefetch = null;
    state.carouselWindow?.();
    state.carouselWindow = null;
    state.carouselKey = null;
  }
}

/**
 * The toggle's word, crossed over rather than snapped (author, 2026-08-27).
 *
 * The span fades out, the word is swapped while nothing can be read, and it
 * fades back — so the button's box never changes under the pointer. A second
 * press inside the fade overtakes the first: `pending` is what the label is on
 * its way to, so the comparison is against where it is *going*, not where it
 * is, which is the bug the Daily nav label had to be taught (main.js).
 */
let modeFade = null;
let modePending = null;

function paintModeLabel(word) {
  const label = state?.el.querySelector('[data-mode-label]');
  if (!label) return;
  if ((modePending ?? label.textContent) === word) return;
  clearTimeout(modeFade);
  // Removed, not shortened: reduced motion gets the word.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    modePending = null;
    label.textContent = word;
    return;
  }
  modePending = word;
  label.classList.add('is-fading');
  modeFade = setTimeout(() => {
    modePending = null;
    label.textContent = word;
    label.classList.remove('is-fading');
  }, 140);
}

/**
 * One card of the drifting row: the picture, and the name under it.
 *
 * Sized from its height rather than its width, so a card is as wide as its own
 * icon is — which is why `ui/loop-scroll` measures real offsets instead of
 * multiplying out a stride.
 */
function carouselCard(item, router, { cardWidth = 150, space = 0 } = {}) {
  // The picture is shown whole (author, 2026-08-27: "dont crop the images, but
  // fix their width to what they currently are"). The column stays 150 px so
  // the row keeps its rhythm; the height is whatever that width makes it, and
  // an icon that is taller than it is wide is simply a taller card. The
  // blurred placeholder is dropped with the crop — it was a background sized
  // to *cover* the box, which is the cropping this removes.
  // `data-src`, not `src`: `windowImages` hands the source over as the card
  // comes near and takes it back when it goes away, so the row holds only the
  // pictures around it rather than all 72 at once. The `width` and `height`
  // attributes are what make that free — they give the box an aspect ratio, so
  // it is exactly as tall with no picture in it as with one, and nothing
  // reflows either way. `loading="lazy"` is gone with them: the source is not
  // in the document until we put it there, which is a stricter promise than
  // the browser's own.
  /*
   * **The ceiling is the packer's own budget, written onto the card**
   * (2026-09-01). It used to be four rules in index.css keyed on the column's
   * depth, each handing every picture in the column an equal share of the room
   * — which is only right when the pictures are the same height. A 250 px icon
   * sharing a column with an 80 px one was cut to 190 to make the shares equal,
   * and the 60 px it gave up became a hole: the packer had already proved both
   * fitted. This is the number the packer used when it decided to put this card
   * in this column, so what is drawn is what was budgeted, and the depth cap
   * needs no rule per depth now that columns go twelve deep.
   */
  const cap = item.image ? Math.round(pictureHeight(item, cardWidth, space || Infinity)) : 0;
  const media = item.image
    ? `<span class="cx-media"${space ? ` style="--cx-cap:${cap}px"` : ''}>
        <img data-src="${BASE + item.image.src}" alt=""
          width="${item.image.w}" height="${item.image.h}" decoding="async" />
      </span>`
    : '';
  // The office and the dates, the same line the Index cards carry (author,
  // 2026-08-27).
  const sub = esc(formatSubtext(item));
  /*
   * **No blank box where there is no picture** (author, 2026-08-28: "For any
   * saint profiles that lack an image ... have them just as text, no blank
   * square"). The Index's *rows* keep an empty slot on purpose, so their
   * pictures stay in one column; a drifting row has no column to keep, and an
   * empty frame there is the promise of a picture that is not coming.
   *
   * It reads `item.image`, so a saint who gains one later is drawn with it
   * without anything here being told: there is no list of who has a picture.
   */
  return `<a class="cx-card${item.image ? '' : ' is-text'}" href="${router.href(`/saints/${item.slug}`)}" data-prefetch="${esc(item.slug)}">
      ${media}
      <span class="cx-name">${esc(saintName(item))}</span>
      ${sub ? `<span class="cx-sub utility">${sub}</span>` : ''}
    </a>`;
}

/** A picture wider than it is tall, by enough to be worth pairing. */
const isWide = (item) => (item.image?.aspect ?? 1) > 1.2;

/**
 * The room the row has: from the top of the track to the bottom of the window.
 *
 * Published to CSS as `--cx-space` so the card size can follow it (author,
 * 2026-08-28: "they only take up the top half of the window, spread them across
 * the available window, depending on resize bring them closer together / remove
 * double stacks"). A fixed band left the row sitting in the top third of a tall
 * desktop window with nothing under it.
 */
/**
 * Everything under the row that still has to fit inside the window.
 *
 * **Measured, not a constant, since 2026-09-01** (author: "The carousel mode in
 * All Saints should not have a scroll bar at all on the highest window size
 * possible on any screen. The images should instead scale/stack appropriately").
 *
 * It was a flat 24, which was the track's own padding and nothing else — so the
 * page's bottom padding, `--space-16`, was room the row believed it had. The
 * row ended 33 px above the fold and 64 px of padding then hung below it, and
 * the page scrolled by the difference at every window size the site meets. A
 * scrollbar on a page whose whole content is one row that fits.
 *
 * Reading it rather than adding another number is what keeps it true: the
 * padding is `main.chrome`'s and the route's stylesheet is free to change it,
 * and this asks the browser what it actually is.
 */
function footUnder(track) {
  const own = getComputedStyle(track);
  const padding = (parseFloat(own.paddingTop) || 0) + (parseFloat(own.paddingBottom) || 0);
  const main = track.closest('main');
  const below = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
  /*
   * And four pixels the row does not claim.
   *
   * The room is measured from where the track's top *is* when the measurement
   * is taken, and on a phone recovering from a resize the controls above it can
   * still settle by a pixel or two afterwards — which the row has already been
   * packed against, so the page ends up scrollable by exactly that much. Four
   * pixels of cushion cost nothing (they sit inside the page's own 64 px of
   * bottom padding, alongside the up-to-39 the flooring already gives up) and
   * they make it impossible for the row to be the thing that puts a scrollbar
   * on the page.
   */
  return padding + below + 4;
}

export function publishCarouselSpace() {
  const track = state?.el?.querySelector('[data-carousel-track]');
  const carousel = state?.el?.querySelector('.carousel');
  if (!track || !carousel) return 0;
  const top = track.getBoundingClientRect().top;
  const space = Math.max(200, Math.round(window.innerHeight - top - footUnder(track)));
  carousel.style.setProperty('--cx-space', `${space}px`);
  return space;
}

/** What was last published, so `stacking()` costs no layout of its own. */
let carouselSpace = 0;

/**
 * Two rows' worth of room: a stacked cell is two pictures and two captions, and
 * below this it reads as two cramped bands rather than one generous one.
 */
const STACK_SPACE = 460;

/**
 * Whether cells pair their wide icons.
 *
 * **Height, not width, since 2026-08-28.** It was `not (min-width: 700px)` —
 * phones only — which is why the author saw no stacking at a desk at all. What
 * a stack actually needs is vertical room, and that is the thing a desktop
 * window has plenty of and a short one does not: "depending on resize bring
 * them closer together / remove double stacks". A phone still always stacks,
 * because its 150 px cards leave room for two whatever the window does.
 */
const stacking = () =>
  !window.matchMedia('(min-width: 700px)').matches || carouselSpace >= STACK_SPACE;

/**
 * The row's children, which are **cells rather than cards** (author,
 * 2026-08-28: "On mobile, make the carousel a bit more organic and double
 * stack any saint images and texts that are wide aspect ratio, and arrange
 * them a bit more spread out vertically, not all lined up at the bottom").
 *
 * A wide icon in a column sized for a tall one leaves half the column empty,
 * and a row of them reads as a band of letterboxes. Two of them in the space of
 * one tall card is the same column width doing twice the work.
 *
 * **A cell, not a card, is what the loop counts.** `loopScroll` works out one
 * period from the offset between child `buffer` and child `buffer + count`, so
 * everything it knows about the row is the sequence of its children — and if
 * two saints share a child, the arithmetic is untouched. That is the whole
 * reason for the wrapper: a two-row grid over the track itself would pack each
 * period from wherever the last one ended, and a period that starts mid-column
 * packs differently from one that starts at a column edge, which is a drift the
 * wrap cannot correct. This way nothing about the loop changes at all.
 *
 * Pairs are adjacent wide saints only, so a wide icon next to a tall one keeps
 * its own column rather than being scaled to make a pair that is not there.
 */
/**
 * `--cx-w` in pixels.
 *
 * **A custom property does not compute.** `getPropertyValue('--cx-w')` hands
 * back the literal `clamp(150px, …, 300px)` the stylesheet wrote, and
 * `parseFloat` of that is **150** — the first number in the string. Every
 * column was then packed against half the real card width, so one that should
 * have held two imaged saints held four and the row ran a third of a window
 * past the fold.
 *
 * A probe with `width: var(--cx-w)` makes the browser resolve it, which is the
 * only way to read a clamp correctly from script. One offscreen element and one
 * layout read, once per paint.
 */
function resolveCardWidth(carouselEl) {
  if (!carouselEl) return 150;
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:var(--cx-w)';
  carouselEl.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width || 150;
}

/**
 * A caption's own height: the name, the subtext line and the gaps around them.
 *
 * Generous on purpose. A one-line name is nearer 46, but names wrap at this
 * column width often enough that packing to the shorter figure overflowed the
 * window and cut the last caption off. Over-estimating leaves a column slightly
 * short of the fold; under-estimating puts it past it, and only one of those is
 * visible to a reader. Since 2026-09-01 the slack an over-estimate leaves is
 * handed to the column's gaps rather than left as a hole at its foot
 * (`align-content: space-between`, index.css), so being generous costs an airier
 * column instead of a short one — which is what makes the number below safe to
 * choose against the *worst* caption rather than the common one.
 *
 * **It is two numbers, because the wrap is a function of the column's width.**
 * A flat 64 was measured at a desk, where a 300 px column holds nearly every
 * name on one line (46 typical, 59 at the worst). A phone's 150 px column wraps
 * the same names to two and three lines — 94 at the worst — so the same 64
 * under-budgeted the one surface with no room to spare, and the deepest column
 * on a phone ran past the fold.
 *
 * **The narrow figure was written as 72, not the 94 measured above it**
 * (2026-09-02): a single-image column at a short desktop window — 1024x560
 * resolves a 166 px column, narrow enough for this branch though the window
 * is nobody's phone — rendered up to 24 px taller than its own budget under
 * the runner's fallback face, which is the 94-72 the comment already named.
 * The single card in such a column has no gap to hand the difference to, so
 * `align-items: stretch` on the track carried the overflow into every column
 * in the row and put a scrollbar under a page whose whole content still fit
 * the corpus's more common widths.
 */
const captionH = (cardWidth) => (cardWidth <= 200 ? 94 : 64);

/** The gap between two cards stacked in one cell (`--space-3`). */
const CELL_GAP = 12;

/**
 * How deep a column may go.
 *
 * **Raised from four to twelve on 2026-09-01** (author: "just fill in the gaps
 * ... and just make it a fully filled horizontally scrolling stack"). Four was
 * there to stop text-only saints packing fifteen deep and reading as a list
 * turned sideways — but four caption-tall cards are 268 px in a 520 px column,
 * which is the gap the author is looking at. The depth a column reaches is the
 * room divided by what it is filled with, and twelve is the room, not a taste:
 * a 520 px column of nothing but captions is eight deep, and the cap only ever
 * bites on a window taller than any real one.
 */
const STACK_MAX = 12;

/**
 * How far past the next saint the packer may reach for one that fits.
 *
 * **The gap-filler** (2026-09-01). Packing strictly in order closes a column
 * the moment the next saint is too tall for what is left, which is where the
 * holes came from: a column with 180 px spare and a portrait icon next in line
 * ended 180 px short even though four captions would have filled it. Reaching
 * forward for a saint who fits closes that hole without showing anyone twice.
 *
 * Bounded, because the pool is in the reader's own order — Random by default,
 * but Alphabetical is an order a reader can *see*, and pulling a saint from
 * position 700 into the first column would be visible as disorder. Forty-eight
 * is roughly two windows of columns: near enough that the run still reads as
 * the order it was given.
 */
const LOOKAHEAD = 48;

/**
 * What a card will stand, before anything is rendered.
 *
 * The picture is shown whole at `--cx-w`, so its height is the width over its
 * own aspect; a saint with no picture is a caption and nothing else.
 *
 * **Bounded by the room** (2026-09-01): a 555x1707 scan is 923 px at a 300 px
 * column, which is taller than any window the row is drawn in, and the picture
 * is scaled to fit when it is drawn. Budgeting the unscaled height made the
 * packer believe a column was full when it held one card and a third of a
 * window of air — the largest gap on the page, from the tallest saint.
 */
function cardHeight(item, cardWidth, space = Infinity) {
  if (!item.image) return captionH(cardWidth);
  return pictureHeight(item, cardWidth, space) + captionH(cardWidth);
}

/** The height that picture will actually be drawn at, in this much room. */
function pictureHeight(item, cardWidth, space = Infinity) {
  const aspect = item.image.aspect || 1;
  return Math.min(cardWidth / aspect, Math.max(0, space - captionH(cardWidth)));
}

/**
 * The row's children, which are **cells rather than cards**: a column of one
 * or more saints.
 *
 * **Packed by height since 2026-08-28**, where it used to pair wide icons and
 * nothing else (author: "There is no double stacking on desktop carousel that
 * I can see ... the carousel does not spread all across the height of the
 * window ... For any saint profiles that lack an image, stack them more").
 *
 * Pairing wide icons was a special case of a general fact: a card shorter than
 * the row leaves the rest of its column empty. Filling the column instead
 * subsumes it — two wide icons still pair, because two of them are what fits —
 * and it is what puts the row across the window rather than in a band at the
 * top, because the space it packs into *is* the window's.
 *
 * **A cell, not a card, is what the loop counts.** `loopScroll` reads one
 * period from the offset between child `buffer` and child `buffer + count`, so
 * everything it knows is the sequence of children; two saints sharing a child
 * leaves that arithmetic untouched. A two-row grid over the track itself would
 * not, and the reason is worth keeping: a period starting mid-column packs
 * differently from one starting at a column edge, which is a drift the wrap
 * cannot correct.
 *
 * **And every column is filled, not merely started** (author, 2026-09-01:
 * "You've pretty much arranged them in a horizontal grid of columns with
 * randomised occupation. Just fill in the gaps in the same mix of randomised
 * imageless and imaged saint cards and just make it a fully filled horizontally
 * scrolling stack").
 *
 * The packer was strictly in order, so a column ended wherever the next saint
 * happened not to fit — and since 83% of the corpus is imageless and a caption
 * is 64 px, most of those holes were three or four cards' worth of room with a
 * portrait icon standing in front of them. It reaches forward now for a saint
 * who *does* fit (`LOOKAHEAD`), and only closes the column when nothing within
 * reach will go in it. What comes out is the same mix in nearly the same order,
 * with the air taken out.
 *
 * **Still each saint exactly once.** The reach marks its pick as taken and the
 * cursor walks past what has been taken, so the run is a permutation of the
 * pool rather than a resampling of it — which is the promise the author made
 * the packer keep on 2026-08-28 ("only display 1 instance of each saint").
 */
export function carouselCells(pool, { space = 0, cardWidth = 150 } = {}) {
  if (!space) return pool.map((item) => [item]);
  const cells = [];
  const taken = new Array(pool.length).fill(false);
  const heightOf = (item) => cardHeight(item, cardWidth, space);
  let cursor = 0;
  while (cursor < pool.length) {
    if (taken[cursor]) {
      cursor += 1;
      continue;
    }
    const column = [pool[cursor]];
    taken[cursor] = true;
    let used = heightOf(pool[cursor]);
    while (column.length < STACK_MAX) {
      // What is left under the last card, once the gap above it is paid for.
      const room = space - used - CELL_GAP;
      // Nothing is shorter than a caption, so there is no point looking.
      if (room < captionH(cardWidth)) break;
      let pick = -1;
      let seen = 0;
      for (let i = cursor + 1; i < pool.length && seen < LOOKAHEAD; i += 1) {
        if (taken[i]) continue;
        seen += 1;
        if (heightOf(pool[i]) <= room) {
          pick = i;
          break;
        }
      }
      if (pick < 0) break;
      taken[pick] = true;
      column.push(pool[pick]);
      used += CELL_GAP + heightOf(pool[pick]);
    }
    cells.push(column);
    cursor += 1;
  }
  return cells;
}


/**
 * Fills the track from what the filters have left, and wires it once.
 *
 * **Saints with an icon come first.** A carousel is a way of meeting people by
 * looking at them, and 614 of the 742 have no picture — a sample taken flat
 * would be mostly empty tiles. The imageless are not excluded, they are simply
 * last, and the mode that shows the corpus as it really is sits behind one
 * press of the toggle.
 *
 * The track is rebuilt only when the pool itself changes. Typing in the search
 * field runs `update` on every keystroke, and tearing down 72 nodes and a
 * scroll loop for a set that has not moved is the kind of work that shows up
 * as a stutter in the drift.
 */
export function paintCarousel() {
  const { el, router } = state;
  const track = el.querySelector('[data-carousel-track]');
  carouselSpace = publishCarouselSpace();
  /*
   * One listener for the view's life: the card size follows the window's height
   * now, and so does whether cells stack at all. `paintCarousel` is a no-op
   * when its key has not moved, so a resize that only changes the size repaints
   * nothing and a resize that crosses the stacking threshold rebuilds once.
   */
  if (state && !state.carouselResize) {
    let frame = null;
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        if (!state) return;
        carouselSpace = publishCarouselSpace();
        if (state.mode === 'carousel') paintCarousel();
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    /*
     * **And once more when the face arrives** (2026-09-01 evening, after CI).
     *
     * The packing is arithmetic over a caption's height, and a caption set in
     * the fallback face is not the height it will be in Literata. On a warm
     * cache the font is there before the first paint and this never fires
     * usefully; on a cold or loaded one the row is packed against the fallback,
     * the real face lands a moment later, every caption grows, and the columns
     * overflow the room they were packed for — which put fifteen pixels of
     * scroll on a page whose whole content is a row that fits, on the runner
     * and nowhere else.
     *
     * `fonts.ready` resolves once and is already settled by the time this runs
     * in the common case, so the cost is one microtask and one no-op repaint —
     * `paintCarousel` returns early when the packing has not changed.
     */
    document.fonts?.ready?.then(onResize);
    state.carouselResize = () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
    state.cleanups.push(() => state.carouselResize?.());
  }

  /*
   * **The whole matched set, in the reader's own order** (author, 2026-08-28:
   * "the carousel does not cycle through all saints just a limited number and
   * then it cycles back to the start of that pool? It should be able to show
   * all of them").
   *
   * **This reverses a recorded decision** — HANDOFF's "the carousel is a
   * sample, not the corpus … do not 'fix' it by rendering all 742" — and the
   * reasoning it reversed is worth keeping, because it was about cost rather
   * than taste: a cell per saint is a cell the loop has to measure past and an
   * element the observer has to watch. What makes it affordable is the two
   * mechanisms built since: `windowImages` holds only the pictures near the
   * viewport, and every `<img>` carries width/height so an empty box is exactly
   * as tall as a full one. The DOM grows; the decoded bitmaps do not.
   *
   * The imaged-first sort went with the slice. It existed to make a 48-card
   * *sample* look like the good half of the corpus; over the whole set it would
   * front-load 130 pictures and leave a long tail of text, which is a worse row
   * than the reader's own order — Random by default, so pictures fall through
   * it evenly.
   */
  const pool = state.shownCards.slice();
  /*
   * The room a column has, and the width a card will be — both read once here
   * and handed to the packer, which is then arithmetic with no layout in it.
   */
  /*
   * **Nothing is decided before the row can be measured** (2026-08-28). The
   * packing depends on the card's width and the window's room, and both are
   * nonsense while the track is unlaid — so `paintCarousel` used to run once
   * against zeroes and again against the real geometry, produce two different
   * runs, and treat the second as a *changed pool*: which drops the remembered
   * offset, and a reader coming back from a saint lost their place. The second
   * paint arrives on its own from the resize observer and from `update`.
   */
  if (!track || track.clientWidth === 0) return;
  const carouselEl = el.querySelector('.carousel');
  const cardWidth = resolveCardWidth(carouselEl);
  /*
   * **Quantised, so the packing is stable across paints.** The run is the
   * carousel's identity — the key that decides whether the remembered offset
   * survives — and packing against a raw pixel height made it depend on the
   * exact moment the space was published. A first paint whose track had not
   * settled produced a run one card different from the one the reader left, the
   * key changed, and the offset was dropped: the row reopened at its start
   * instead of where they were. Rounding to 40 px absorbs that without being
   * coarse enough for a reader to see.
   */
  /*
   * `carouselSpace` is already the row's own content box — everything under it
   * that has to fit was taken off in `footUnder` — so the only thing left to do
   * here is the rounding, and the second subtraction that used to stand here
   * was the track's padding counted twice.
   *
   * **Down, not to the nearest.** Rounding to the nearest could round *up*, and
   * a row packed against eleven pixels more room than it has is a row eleven
   * pixels past the fold — which at 1440x620 was exactly what put the scrollbar
   * back. Flooring is as stable across paints as rounding is, which is the only
   * property the quantisation was ever for, and it can never claim room that is
   * not there. What it costs is up to 39 px left unused at the foot, and those
   * sit inside the page's own bottom padding where nothing shows them.
   */
  const space = Math.floor(Math.max(0, carouselSpace) / 40) * 40;
  /*
   * **Each saint once** (author, 2026-08-28: "When you search for a saint in
   * the carousel, only display 1 instance of each saint, not multiple as it
   * currently happens to complete the carousel").
   *
   * `loopSafe` repeated a short run to a floor of ten so the period was long
   * enough not to judder — honest about the data but not about the reading: a
   * search matching two saints showed each of them five times. A run that does
   * not fill the track does not loop at all now; see `fits` below.
   */
  /*
   * **The number the columns are packed against, told to the stylesheet.**
   * `--cx-space` is the room from the top of the track to the bottom of the
   * window; what the packer works to is that less the track's own padding and
   * rounded down to 40 px (see `space` above). Giving the cells a floor of
   * `--cx-space` gave them a floor taller than anything had been packed for,
   * and a column holding one saint — which has no gaps to hand the difference
   * to — stood that much short of its own foot.
   *
   * **Written here, not in `buildCarousel`, and the difference is a bug that
   * was there for an evening** (2026-09-01). The build is skipped when the
   * packing has not changed, and a resize can change the *room* without
   * changing the packing — a phone turning a hundred pixels shorter still packs
   * the same columns. The floor then kept the old window's number, the cells
   * stayed that much too tall, and the page scrolled by the difference. This
   * runs on every paint, before the early return, because it is a fact about
   * the room rather than about the run.
   */
  el.querySelector('.carousel')?.style.setProperty('--cx-fill', `${space}px`);

  const run = carouselCells(pool, { space, cardWidth });
  // The width the row was built for is part of what the row *is*: a phone and
  // a desk pair the wide icons differently, so crossing 700 px has to rebuild
  // rather than keep a set of cells that were grouped for the other one.
  // The run itself is the key: a resize that changes how the columns pack
  // changes the run, and one that does not leaves it alone. It no longer needs
  // the width band spelled out separately — the packing is what that stood for.
  const key = run.map((cell) => cell.map((c) => c.slug).join('+')).join(',');
  if (key === state.carouselKey) return;

  /*
   * **The row fades out and the new one fades in** (author, 2026-08-28: "When
   * searching for saints in the carousel, fade out and fade in when loading the
   * new displays"). Without it a search replaced the whole track between two
   * frames, which reads as a flicker rather than a change.
   *
   * The rebuild is deferred behind the fade, which is the only way to have an
   * *out* at all — so this function now returns before the track has changed.
   * Two consequences, both handled here rather than left to callers: a second
   * keystroke inside the fade supersedes the first (the timer is cancelled and
   * the later key wins), and reduced motion skips the whole arrangement and
   * rebuilds in place, because a wait with no animation behind it is the same
   * defect wearing a different hat (DESIGN.md §6).
   */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const first = state.carouselKey === null || state.carouselKey === undefined;
  if (!reduced && !first && track.children.length) {
    clearTimeout(state.carouselFade);
    track.classList.add('is-swapping');
    state.carouselFade = setTimeout(() => {
      if (!state) return;
      // The key is set by the rebuild, so clearing it here is what lets the
      // deferred call past the early return above.
      state.carouselKey = null;
      buildCarousel(key, run, cardWidth, space);
    }, CX_FADE);
    state.cleanups.push(() => clearTimeout(state.carouselFade));
    return;
  }
  buildCarousel(key, run, cardWidth, space);
}

/** How long the row takes to go before the new one is built. */
const CX_FADE = 150;

/** The half of `paintCarousel` that touches the DOM, deferred behind the fade. */
function buildCarousel(key, run, cardWidth, space) {
  const { el, router } = state;
  const track = el.querySelector('[data-carousel-track]');
  if (!track) return;
  // A different set of saints is a different row, and the remembered offset
  // belonged to the old one.
  if (state.carouselKey !== null && state.carouselKey !== undefined) state.carouselAt = null;
  state.carouselKey = key;

  // What the loop being replaced knew that the DOM cannot say: a wheel still
  // spinning, a pointer hold still running. Taken here, because this is where
  // the old loop dies - by the time the successor is constructed below,
  // `state.loop` is already null.
  state.loopHandoff = state.loop?.handoff?.();
  state.loop?.destroy();
  state.loop = null;
  state.carouselWindow?.();
  state.carouselWindow = null;
  if (!run.length) {
    track.innerHTML = '';
    track.classList.remove('is-swapping');
    return;
  }

  /*
   * **The columns stand on one line** (author, 2026-09-01: "just make it a
   * fully filled horizontally scrolling stack").
   *
   * They used to be dealt one of three resting places — low, high, mid — from
   * their position in the run, which was the answer to "arrange them a bit more
   * spread out vertically, not all lined up at the bottom" (2026-08-28) at a
   * time when a column held one or two cards and had a great deal of slack to
   * be arranged inside. The packer fills the column now, so there is no slack
   * left to lift them through: what the scatter produced was the gaps the
   * author is asking to have closed. Flush top and bottom is what a filled
   * stack looks like.
   */
  const n = run.length;
  const paint = (buffer) => {
    track.innerHTML = loopSlice(run, buffer)
      .map((cell) => {
        // `data-n` is the column's depth. Nothing in the stylesheet is keyed on
        // it any more — each picture carries its own ceiling — but it is what a
        // test reads to see how deep the packer went, and it costs one word.
        return `<span class="cx-cell${cell.length > 1 ? ' is-stack' : ''}" data-n="${cell.length}">${cell
          .map((item) => carouselCard(item, router, { cardWidth, space }))
          .join('')}</span>`;
      })
      .join('');
  };

  /*
   * **A row that fits does not loop** (author, 2026-08-28: "If there are not
   * enough saints to complete the auto scroll carousel, have the scroll gently
   * stop and display left justified. The auto scroll resumes when there are
   * enough cards to reach both ends of the window size").
   *
   * Decided by measurement rather than by a card count, because the answer
   * depends on the card width, the window width and whether wide icons paired
   * — three things that move independently. So the plain run is laid out first
   * and asked whether it overflows; only then are the clone buffers built.
   * Reading `scrollWidth` forces the layout, which is the cost of asking.
   */
  // The new row comes up as the old one went down. One frame, so the browser
  // has the new children before the class comes off and there is something to
  // fade rather than a jump from nothing.
  const reveal = () => requestAnimationFrame(() => track.classList.remove('is-swapping'));

  /*
   * **Computed, not measured.** The first version laid the plain run out and
   * read `scrollWidth`, which meant painting 742 cells twice on every
   * keystroke — two full layouts of the largest thing on the page, which is
   * exactly the stutter the author reported. Every cell is one column of
   * `--cx-w` whether it holds one saint or a stacked pair, so the width is
   * arithmetic and needs no layout at all.
   *
   * **A hidden track still measures zero**, and zero fits inside zero — this
   * asked while the Index was in search mode and concluded that 742 cards
   * needed no loop, which is the same trap `switchMode` documents for
   * `scrollLeft`. `clientWidth > 0` is the guard.
   */
  const cs = getComputedStyle(track);
  const gap = parseFloat(cs.columnGap || cs.gap) || 0;
  const contentWidth = n * (cardWidth + gap) - gap;
  const fits = track.clientWidth > 0 && contentWidth <= track.clientWidth;
  if (!fits) paint(CAROUSEL_BUFFER);
  else paint(0);
  track.classList.toggle('is-static', fits);
  state.carouselStatic = fits;
  if (fits) {
    // Left-justified and still: no clones to wrap between, and no drift to
    // start. `windowImages` still runs — a short row is not necessarily a small
    // one, and its pictures should still be released when scrolled past.
    state.carouselWindow = windowImages(track, { margin: imageMargin() });
    state.carouselPrefetch?.();
    state.carouselPrefetch = observePrefetch(track);
    reveal();
    return;
  }
  // The images decide the widths, so the loop cannot measure until they have
  // laid out. It measures now for the common case — a warm cache — and again
  // when each picture arrives.
  state.loop = loopScroll(track, run.length, {
    buffer: CAROUSEL_BUFFER,
    // Only where the row is the *same* row: a search that changes the pool has
    // no offset worth keeping, and the old one would land on other saints.
    startAt: state.carouselAt ?? null,
  });
  // The predecessor's gesture, adopted - see the handoff at the destroy site.
  state.loop.inherit(state.loopHandoff);
  state.loopHandoff = null;
  /*
   * Only the pictures around the viewport are held; the rest keep their boxes
   * and give up their bitmaps.
   *
   * Nothing re-measures on a picture's arrival any more, and nothing needs to:
   * a card's width is `--cx-w` and a picture cannot change it, so the offsets
   * the loop reads are the same before any image has loaded as after. The
   * `load` listeners that used to sit here were repairing a *different* fault
   * — a `measure()` that ran before the track had been laid out — which
   * loop-scroll now repairs from its own frame, where it can see it.
   */
  state.carouselWindow = windowImages(track, { margin: imageMargin() });
  // One observer at a time. The track is rebuilt whenever the pool changes, and
  // pushing a fresh cleanup onto the pile each time would leave every previous
  // observer watching nodes that are no longer in the document.
  state.carouselPrefetch?.();
  state.carouselPrefetch = observePrefetch(track);
  reveal();
}

/**
 * The change of face (author, 2026-08-27: "a falling away animation on the
 * filters and cards visible on screen, followed by a fade-in of the new mode").
 *
 * Two beats, and the second does not start until the first is over: what is on
 * screen drops and fades, staggered so it reads as a fall rather than a blink,
 * and then the mode it left behind comes up.
 *
 * Reduced motion gets the swap with no fall and no fade — removed, not
 * shortened (DESIGN.md §6).
 */
/**
 * The mode for the rest of this document's life, and no longer than that.
 *
 * Module scope rather than the store: leaving the Index for the Daily page and
 * coming back re-mounts the view, so `state.mode` alone would reset on every
 * visit within one session — but a reload gets a fresh module and therefore the
 * carousel, which is exactly the line the author drew.
 */
let chosenMode = null;

export const sessionMode = () => chosenMode;

export function switchMode(next) {
  if (!state || state.mode === next) return;
  const { el } = state;
  state.mode = next;
  chosenMode = next;
  /*
   * **The mode is not remembered across loads** (author, 2026-08-28: "have it
   * default to Carousel mode on first open, and if the site is refreshed or
   * opened again in a different tab, have it still default to Carousel mode.
   * It only doesnt default while you are still on the site without
   * refreshing").
   *
   * So the toggle holds for the visit and no longer for the reader: `state.mode`
   * carries it between pages within one document, and a reload starts at the
   * carousel again. The setting is still *read* on open (views/saints.js), which
   * is deliberate rather than vestigial — it is how a test asks for the other
   * face without pressing anything, and it means a future "remember my choice"
   * needs this line back rather than a new mechanism.
   */

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    applyMode();
    return;
  }

  /*
   * A second press inside the fade lands the first one first. Two fades
   * overlapping would leave the earlier `land` to run against a page the later
   * one has already moved on — and the mode it applies is read from
   * `state.mode`, so the *stale* timer would have the last word. This is
   * Amendment 9's rule for animated swaps, in the shape this one needs: while
   * two are in flight, exactly one is current.
   */
  state.falling?.();

  /*
   * **One fade over the whole face, not one per card** (author, 2026-09-02:
   * "make both animations a simple fade in fade out ... Remove this animation
   * completely from BOTH MOBILE AND DESKTOP FOR THIS ITEM").
   *
   * What stood here walked every card a reader could see, wrote a staggered
   * `--fall-delay` onto each, and waited out the longest of them — up to 572 ms
   * before the new face even began to arrive. The class goes on the view now
   * and index.css does the rest, so nothing is measured, nothing is written per
   * node, and the change of face costs one transition in each direction.
   *
   * The search field is still deliberately untouched by it — index.css says
   * where that line is drawn and why.
   */
  el.classList.add('is-leaving');

  const land = () => {
    clearTimeout(timer);
    state.falling = null;
    el.classList.remove('is-leaving');
    applyMode();
    el.classList.add('is-arriving');
    // One frame at the arriving state before it is released, or there is no
    // change for the transition to run between.
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-arriving')));
  };

  // The fade's own length, which is `--dur-slot` in index.css. The two are one
  // decision and drift apart the moment either is edited alone.
  const timer = setTimeout(land, CX_MODE_FADE);
  state.falling = land;
}

/** How long a face takes to go, matching `--dur-slot` in index.css. */
const CX_MODE_FADE = 260;
