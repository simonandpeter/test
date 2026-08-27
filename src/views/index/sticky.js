import { layout } from '../../lib/virtual-grid.js';
import { state } from './state.js';

/**
 * The search field that follows the reader down.
 *
 * It sticks under the chrome once the controls have scrolled past, so a reader
 * deep in the grid can type without going back up for the box. `chromeHeight`
 * is read rather than written down because the header's own height changes
 * with the language and the viewport.
 */

/**
 * The search field follows the reader down the register (author, 2026-08-27:
 * "otherwise you need to go all the way back to the top to search for
 * anything"), and the filters ride with it — folded away while scrolling, let
 * down when the reader puts the cursor in the field, folded again the moment
 * they move on.
 *
 * **Stuck is observed, not calculated.** A zero-height sentinel sits above the
 * block; when it leaves the top of the viewport the block has taken over. A
 * scroll threshold would have to know the height of everything above it, which
 * changes with the language, the width and the count line.
 */
export function wireSticky() {
  const { el } = state;
  const bar = el.querySelector('[data-index-sticky]');
  const sentinel = el.querySelector('[data-sticky-sentinel]');
  const query = el.querySelector('[data-query]');
  if (!bar || !sentinel || !query) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      const stuck = !entry.isIntersecting;
      bar.classList.toggle('is-stuck', stuck);
      // Coming unstuck ends the question: the filters are simply on the page
      // again, and leaving the flag on would fold them away at the top.
      if (!stuck) bar.classList.remove('is-filters-open');
    },
    // The sentinel is judged against the line the bar sticks to, not the top
    // of the window, or the bar would be called stuck a header's height early.
    { rootMargin: `-${chromeHeight()}px 0px 0px 0px`, threshold: 0 },
  );
  observer.observe(sentinel);

  let openedY = 0;
  const open = () => {
    if (!bar.classList.contains('is-stuck')) return;
    openedY = window.scrollY;
    bar.classList.add('is-filters-open');
  };
  // Focus rather than click alone: a reader who tabs to the field wants the
  // filters as much as one who presses it.
  query.addEventListener('focus', open);
  query.addEventListener('click', open);

  const close = () => {
    if (!bar.classList.contains('is-filters-open')) return;
    bar.classList.remove('is-filters-open');
    query.blur();
  };

  /*
   * **The reader's own input closes it, not the scroll event.**
   *
   * Letting the filters down grows the sticky block by their own height, and
   * the browser answers that by moving the page to keep the visible content
   * still — measured here as an overshoot of 33 px and a settle back over
   * about 150 ms. Every version of "close when the page scrolls" was fooled by
   * that: a stopwatch grace period only moved the race, and a distance test
   * closed on the overshoot. A wheel or a finger is unambiguous — layout
   * shifts do not produce input events.
   *
   * The scroll listener stays as the fallback for the one way of scrolling
   * that sends no input event to this page: dragging the scrollbar. Its
   * threshold is well past the settling nudge.
   */
  const onScroll = () => {
    if (Math.abs(window.scrollY - openedY) > 120) close();
  };
  window.addEventListener('wheel', close, { passive: true });
  window.addEventListener('touchmove', close, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  state.cleanups.push(() => {
    observer.disconnect();
    query.removeEventListener('focus', open);
    query.removeEventListener('click', open);
    window.removeEventListener('wheel', close);
    window.removeEventListener('touchmove', close);
    window.removeEventListener('scroll', onScroll);
  });
}

/** What main.js published, as a number. */
function chromeHeight() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--chrome-h');
  return Number.parseFloat(raw) || 0;
}
