import { reducedMotion } from '../../lib/motion.js';
import { state } from './state.js';

/**
 * Which saint of the day is open, and how a reader changes that (plan §3).
 *
 * **Opened by hand, and only by hand** (author, 2026-09-12: "Make it so
 * scrolling DOES NOT expand it. You have to click on an entry to expand it").
 * There is one delegated click listener on the scroller and nothing else:
 * no scroll listener, no `IntersectionObserver`, no `scroll-snap`. The
 * scroll-driven fold that preceded this had two faults a reader felt — a
 * saint opened because they happened to stop there, and the page changed
 * height under them while they were reading it. A press is unambiguous, and
 * the only thing that ever moves the card is the reader.
 *
 * `rows` and `openIdx` are written onto the page's own singleton so the day
 * step and the view's teardown can see them; the module keeps its own handles
 * as well, because the listener outlives no view but must not throw if it
 * fires while `state` is between pages.
 */

let grid = null;
let scroller = null;
let rows = [];
let openIdx = -1;

const publish = () => {
  if (!state) return;
  state.rows = rows;
  state.openIdx = openIdx;
};

/**
 * **The open card is the head of the day, always** (author, 2026-09-12:
 * "Tiles do not go above the open card, they always stay at the bottom of the
 * page").
 *
 * Leaving each saint where the day put them meant opening the fifth tile left
 * four tiles standing above the card. The order is rewritten instead: the
 * open saint first, then every other saint in the day's own order — which
 * also drops the saint that *was* open back among the tiles rather than
 * leaving it stranded at the top.
 *
 * **The elements are moved, not rebuilt.** Appending a node that already has
 * a parent moves it, so one `DocumentFragment` and one `appendChild` reorders
 * the whole grid without recreating anything: no picture is fetched twice,
 * nothing loses the fade it was part-way through, and a life that has already
 * landed stays landed.
 *
 * Then the top of the list, because the card is now the first thing in the
 * day — the same place the day's first saint stands when the page opens, so
 * every saint is read in the same spot rather than wherever the tile happened
 * to have been.
 */
export function openRow(i, { bring = true } = {}) {
  if (!rows.length || !grid) return;
  const next = Math.max(0, Math.min(rows.length - 1, i));
  rows[openIdx]?.classList.remove('is-open');
  openIdx = next;
  rows[openIdx].classList.add('is-open');

  const order = document.createDocumentFragment();
  order.appendChild(rows[openIdx]);
  for (let j = 0; j < rows.length; j += 1) if (j !== openIdx) order.appendChild(rows[j]);
  grid.appendChild(order);

  publish();
  if (bring && scroller) {
    scroller.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
}

/** The live rows, in the day's own order — not the order the grid shows. */
export const currentRows = () => rows;

/** Which of them is open, or -1 before the first paint. */
export const currentOpen = () => openIdx;

/**
 * Called after every day paint: the grid's children are the day's rows, the
 * scroller goes back to the top, and the day opens on its first saint —
 * which `calendar.js` has already put first by `pickHero`, so the day leads
 * with a sung saint who has an icon.
 */
export function adoptRows(gridEl) {
  grid = gridEl;
  rows = [...gridEl.children].filter((el) => el.classList.contains('day-tile'));
  openIdx = -1;
  publish();
  if (scroller) scroller.scrollTop = 0;
  if (rows.length) openRow(0, { bring: false });
}

/**
 * The one listener. Returns its own teardown so the view can drop it.
 *
 * A click inside a card that is *already* open is left alone, which is what
 * makes the name a working link: while the tile is folded the press opens it
 * — the anchor's default is cancelled, so the name is the tile's affordance
 * and not a trapdoor to another page — and once open the anchor is the
 * reader's way through to the whole life.
 */
export function wireOpen(scrollerEl) {
  scroller = scrollerEl;
  const onClick = (e) => {
    const tile = e.target.closest('.day-tile');
    if (!tile || !rows.includes(tile)) return;
    if (tile.classList.contains('is-open')) return;
    e.preventDefault();
    openRow(rows.indexOf(tile), { bring: true });
  };
  scrollerEl.addEventListener('click', onClick);
  return () => {
    scrollerEl.removeEventListener('click', onClick);
    if (scroller === scrollerEl) scroller = null;
    grid = null;
    rows = [];
    openIdx = -1;
  };
}
