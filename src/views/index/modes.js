import { formatSubtext } from '../../lib/calendar-page.js';
import { observePrefetch, prefetch } from '../../lib/detail.js';
import { saintName } from '../../lib/honorific.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { loopSafe, loopScroll, loopSlice, windowImages } from '../../ui/loop-scroll.js';
import * as store from '../../lib/store.js';
import { STRINGS } from '../../ui/strings.js';
import { state } from './state.js';

/* The site's base path, declared per file as every other view does. */
const BASE = import.meta.env.BASE_URL;

/**
 * How many saints the carousel draws from (author, 2026-08-27: "implement it
 * intelligently to work efficiently and smartly").
 *
 * The old build's carousel held its whole corpus because that corpus was ten
 * saints. This one is 742, and a track carrying every one of them plus the
 * clone buffer either side is ~800 nodes and 742 images the reader will never
 * reach — a drifting row is a way of *meeting* saints, not a register of them,
 * and the register is one press away in the other mode. So the track takes a
 * sample, drawn through the same seeded shuffle the Random order uses, which
 * makes it stable for a visit and different on the next one.
 */
const CAROUSEL_POOL = 48;
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

  const pool = state.shownCards
    .slice()
    .sort((a, b) => (a.image ? 0 : 1) - (b.image ? 0 : 1))
    .slice(0, CAROUSEL_POOL);
  const run = loopSafe(pool);
  const key = run.map((c) => c.slug).join(',');
  if (key === state.carouselKey) return;
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
    return;
  }

  track.innerHTML = loopSlice(run, CAROUSEL_BUFFER)
    .map((item) => carouselCard(item, router))
    .join('');
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
  state.carouselWindow = windowImages(track);
  // One observer at a time. The track is rebuilt whenever the pool changes, and
  // pushing a fresh cleanup onto the pile each time would leave every previous
  // observer watching nodes that are no longer in the document.
  state.carouselPrefetch?.();
  state.carouselPrefetch = observePrefetch(track);
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
export function switchMode(next) {
  if (!state || state.mode === next) return;
  const { el } = state;
  state.mode = next;
  store.setSetting('indexMode', next);

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
