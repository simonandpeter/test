import { escapeHtml as esc } from '../lib/markdown.js';
import { stepOrder } from '../lib/prayer-order.js';
import { SETTLE, onGrainDrag } from '../ui/grain-drag.js';
import { STRINGS } from '../ui/strings.js';
import { showCard, stepBy } from './prayer/card.js';
import { drawAsides } from './prayer/asides.js';
import { findMarkup, revealSlug, wireFind } from './prayer/find.js';
import { close, open, state } from './prayer/state.js';

/*
 * **This view's stylesheet, off the first paint's path.** `src/main.js`
 * concatenates every sheet it imports into one render-blocking bundle that
 * every route waits for, and this one is read by a single route — so it
 * follows `map.css` out of that list and is dynamic-imported here instead.
 * Dynamic because that is the only kind of import Rollup splits: a static one
 * from a module the entry already pulls in lands back in the same chunk.
 * A bare statement rather than an awaited one, so the fetch starts with the
 * boot and nothing waits on it.
 */
import('../styles/prayer.css');

export const title = () => STRINGS.prayer.title;

/**
 * Prayer — the hymns the corpus holds, one saint at a time.
 *
 * The centre is the saint in hand: the icon, and what is sung for them. Down
 * either side are the two ways out of that saint and into the next — who the
 * corpus records them with, and who is kept on the same day.
 *
 * **The document order is the phone's reading order**, which is why the centre
 * column is written first and the two asides after it: below 1024 px the grid
 * dissolves and the source order is what is read, and two lists of other people
 * announced ahead of the saint they hang off would be the wrong page. On the
 * desk `prayer.css` puts `#hy-related` back into the first column by hand — the
 * same trade the Daily page makes for `.cal-bubble`.
 *
 * The heading is `sr-only`: `main.js` moves focus to a route's `h1` on every
 * navigation, so one has to exist, and the page's own name is already in the
 * masthead and the tab.
 */

/** The box the two arrows are delegated on, and the handler, between renders. */
let root = null;
let onPress = null;
/** `ui/grain-drag.js`'s own teardown for the page-turning swipe. */
let unswipe = null;

export function render(el, { data, router } = {}) {
  const P = STRINGS.prayer;
  /* Opened before the markup is written, so `findMarkup` can read which face
     the page is in rather than a second copy of the default.

     The router is kept for the one href these columns write: a saint the
     hymnal does not hold opens their own page (stage I, `prayer/asides.js`). */
  open({ data, router, all: stepOrder(data?.saints ?? []) });
  el.innerHTML = `
    <div class="hymnal">
      <h1 class="sr-only">${esc(P.title)}</h1>
      ${findMarkup()}
      <div class="hy-body">
        <div class="hy-view" id="hy-view">
          <button class="hy-arrow is-prev" type="button" id="hy-prev" aria-label="${esc(P.prev)}">‹</button>
          <div class="hy-hold" id="hy-hold"></div>
          <button class="hy-arrow is-next" type="button" id="hy-next" aria-label="${esc(P.next)}">›</button>
        </div>
        <aside class="hy-side" id="hy-related"></aside>
        <aside class="hy-side" id="hy-sameday"></aside>
      </div>
    </div>
  `;

  showCard(el);
  /*
   * The switch redraws the asides and nothing else. Passed in rather than
   * imported inside `find.js` because `asides.js` is the card's collaborator
   * and a straight import there would close a cycle — the one place this view's
   * three modules would have needed to know about each other in both
   * directions.
   */
  wireFind(el, {
    redrawAsides: () => {
      const card = state?.order[state.at];
      if (card) drawAsides(el, card);
    },
  });

  /*
   * One listener for the arrows and both asides. The arrows are never rebuilt —
   * only their `disabled` changes — and the asides are rebuilt on every step,
   * which is exactly the case delegation exists for: nothing has to be rebound
   * when a column is rewritten.
   */
  onPress = (e) => {
    const arrow = e.target.closest?.('#hy-prev, #hy-next');
    if (arrow) {
      if (!arrow.disabled) stepBy(el, arrow.id === 'hy-next' ? 1 : -1);
      return;
    }
    /* Both faces, named rather than reduced to `[data-go]` alone: the row and
       the tile are two elements and the attribute is what says the press can
       act. A name the hymnal does not hold carries an `href` and no `data-go`,
       so it falls through this to the browser and opens the saint's own page. */
    const go = e.target.closest?.('.hy-link[data-go], .day-tile[data-go]');
    // Through `find.js`, because a name the current query excludes is still a
    // saint this page holds: the search widens to let the reader reach them.
    if (go) revealSlug(el, go.dataset.go);
  };
  root = el.querySelector('.hy-body');
  root?.addEventListener('click', onPress);

  /*
   * **The page turns by being swiped, which is the phone's only way to turn
   * it**: the two arrows are placed inside the middle column and that column is
   * not a box below 1024 px, so `prayer.css` does not draw them there. The Daily
   * page answers the same question the same way and with the same primitive.
   *
   * **Nothing follows the finger.** Daily's panels roll under the drag because
   * rolling is what a day change looks like there; a saint change here is a
   * fade, and a card dragged sideways and then faded would be two page-turns
   * for one gesture. So the gesture decides and the fade performs.
   *
   * Bound at both widths rather than gated on one, because `onGrainDrag`
   * answers touch and pen and refuses a mouse: a desk without a touchscreen
   * never reaches this, and a desk with one has no reason to be refused.
   *
   * The find row is excluded — a finger dragging through the field is selecting
   * text in it, and a gesture that turned the page from there would take the
   * query with it.
   */
  unswipe = onGrainDrag(el, {
    ignore: (target) => !!target.closest?.('.hy-find'),
    end(dx) {
      if (Math.abs(dx) >= SETTLE) stepBy(el, dx < 0 ? 1 : -1);
    },
  });
}

export function destroy() {
  root?.removeEventListener('click', onPress);
  unswipe?.();
  unswipe = null;
  root = null;
  onPress = null;
  close();
}
