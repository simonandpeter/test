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
function carouselCard(item, router) {
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
  const media = item.image
    ? `<span class="cx-media">
        <img data-src="${BASE + item.image.src}" alt=""
          width="${item.image.w}" height="${item.image.h}" decoding="async" />
      </span>`
    : '<span class="cx-media is-blank" aria-hidden="true"></span>';
  // The office and the dates, the same line the Index cards carry (author,
  // 2026-08-27).
  const sub = esc(formatSubtext(item));
  return `<a class="cx-card" href="${router.href(`/saints/${item.slug}`)}" data-prefetch="${esc(item.slug)}">
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
const CX_FOOT = 24;

export function publishCarouselSpace() {
  const track = state?.el?.querySelector('[data-carousel-track]');
  const carousel = state?.el?.querySelector('.carousel');
  if (!track || !carousel) return 0;
  const top = track.getBoundingClientRect().top;
  const space = Math.max(200, Math.round(window.innerHeight - top - CX_FOOT));
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
export function carouselCells(pool, stacked = stacking()) {
  if (!stacked) return pool.map((item) => [item]);
  /*
   * **The wide ones are brought together rather than paired where they fall.**
   * The first build only paired neighbours, and 44 of the corpus's 128 icons
   * are wide but scattered — a shuffled pool of 48 produced *one* pair, which
   * is not "double stack any saint images that are wide aspect ratio". Pairing
   * them deliberately gets every wide icon but at most one, and the pool is
   * already ordered for the row's sake rather than the reader's (imaged first),
   * so its order is not something to protect.
   */
  const wide = pool.filter(isWide);
  const singles = pool.filter((item) => !isWide(item)).map((item) => [item]);
  const stacks = [];
  for (let i = 0; i + 1 < wide.length; i += 2) stacks.push([wide[i], wide[i + 1]]);
  // An odd wide icon keeps a column of its own rather than being stacked with
  // a tall one, which would scale one of the two to fit the other's half.
  if (wide.length % 2) singles.push([wide.at(-1)]);
  if (!stacks.length) return singles;

  // Dealt back through the row at an even step, so the stacks are spread
  // rather than arriving in a block — the same reason the lifts cycle.
  const out = [];
  const step = singles.length / stacks.length;
  let next = 0;
  for (let i = 0; i < singles.length; i += 1) {
    if (next < stacks.length && i >= Math.round(next * step)) {
      out.push(stacks[next]);
      next += 1;
    }
    out.push(singles[i]);
  }
  out.push(...stacks.slice(next));
  return out;
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
  const stacked = stacking();
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
  const run = carouselCells(pool, stacked);
  // The width the row was built for is part of what the row *is*: a phone and
  // a desk pair the wide icons differently, so crossing 700 px has to rebuild
  // rather than keep a set of cells that were grouped for the other one.
  const key = `${stacked ? 'stacked' : 'flat'}:${run.map((cell) => cell.map((c) => c.slug).join('+')).join(',')}`;
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
      buildCarousel(key, run);
    }, CX_FADE);
    state.cleanups.push(() => clearTimeout(state.carouselFade));
    return;
  }
  buildCarousel(key, run);
}

/** How long the row takes to go before the new one is built. */
const CX_FADE = 150;

/** The half of `paintCarousel` that touches the DOM, deferred behind the fade. */
function buildCarousel(key, run) {
  const { el, router } = state;
  const track = el.querySelector('[data-carousel-track]');
  if (!track) return;
  // A different set of saints is a different row, and the remembered offset
  // belonged to the old one.
  if (state.carouselKey !== null && state.carouselKey !== undefined) state.carouselAt = null;
  state.carouselKey = key;

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
   * The cells are dealt a vertical resting place from their own position in
   * the run rather than all standing on the row's floor ("arrange them a bit
   * more spread out vertically, not all lined up at the bottom"). Three
   * positions on a repeating cycle, which reads as arrangement rather than as
   * noise, and — because it is a function of the index — a card is in the same
   * place every time the row comes round to it. The alignment is inside the
   * track's own height, so it costs no room and holds at every screen size.
   */
  const lift = ['is-low', 'is-high', 'is-mid'];
  /*
   * **Keyed to the run, not to the rendered strip.** `loopSlice` puts `buffer`
   * copies either side, and a card whose clone sat at a different height from
   * itself would visibly jump every time the row came round — which is the one
   * thing the wrap exists to make invisible. This is the same index the clone
   * was copied from, so a saint has one resting place wherever they appear.
   */
  const n = run.length;
  const paint = (buffer) => {
    track.innerHTML = loopSlice(run, buffer)
      .map((cell, i) => {
        const atRun = (((i - buffer) % n) + n) % n;
        return `<span class="cx-cell${cell.length > 1 ? ' is-stack' : ''} ${lift[atRun % lift.length]}">${cell
          .map((item) => carouselCard(item, router))
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
  const cardWidth =
    parseFloat(getComputedStyle(el.querySelector('.carousel')).getPropertyValue('--cx-w')) || 150;
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
   * A second press inside the fall lands the first one first. Two falls
   * overlapping would leave the earlier `land` to run against a set of nodes
   * the later one has already taken the class off — and the mode it applies is
   * read from `state.mode`, so the *stale* timer would have the last word.
   * This is Amendment 9's rule for animated swaps, in the shape this one
   * needs: while two are in flight, exactly one is current.
   */
  state.falling?.();

  // Only what a reader can actually see falls. A card below the fold has
  // nowhere to fall from, and staggering 400 of them would run for a minute.
  /*
   * The search field is left out of the fall on purpose (author, 2026-08-27:
   * "make sure the search bar doesnt disappear when transitioning between
   * carousel and advanced search; its in the same place in both modes, should
   * stay untouched"). It is the one control the two faces share, so animating
   * it out and back in would be the page telling the reader it had gone and
   * come back when it had done neither.
   */
  const onScreen = [...el.querySelectorAll('.facets, .index-foot, .index-card, .cx-card')].filter((node) => {
    const b = node.getBoundingClientRect();
    return b.bottom > 0 && b.top < window.innerHeight && b.width > 0;
  });

  onScreen.forEach((node, i) => {
    node.style.setProperty('--fall-delay', `${Math.min(i, 12) * 26}ms`);
    node.classList.add('is-falling');
  });

  const land = () => {
    clearTimeout(timer);
    state.falling = null;
    for (const node of onScreen) {
      node.classList.remove('is-falling');
      node.style.removeProperty('--fall-delay');
    }
    applyMode();
    el.classList.add('is-arriving');
    // One frame at the arriving state before it is released, or there is no
    // change for the transition to run between.
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-arriving')));
  };

  const fall = onScreen.length ? 260 + Math.min(onScreen.length - 1, 12) * 26 : 0;
  const timer = setTimeout(land, fall);
  state.falling = land;
}
