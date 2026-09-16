import { escapeHtml as esc } from '../lib/markdown.js';
import { stepOrder } from '../lib/prayer-order.js';
import { STRINGS } from '../ui/strings.js';
import { showCard, stepBy } from './prayer/card.js';
import { close, open } from './prayer/state.js';

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

export function render(el, { data } = {}) {
  const P = STRINGS.prayer;
  el.innerHTML = `
    <div class="hymnal">
      <h1 class="sr-only">${esc(P.title)}</h1>
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

  open({ order: stepOrder(data?.saints ?? []) });
  showCard(el);

  /*
   * One listener on the pair rather than one each: the two buttons are never
   * rebuilt — only their `disabled` changes — so a delegated handler on their
   * shared parent costs one binding and has nothing to keep in step.
   */
  onPress = (e) => {
    const button = e.target.closest?.('#hy-prev, #hy-next');
    if (!button || button.disabled) return;
    stepBy(el, button.id === 'hy-next' ? 1 : -1);
  };
  root = el.querySelector('#hy-view');
  root?.addEventListener('click', onPress);
}

export function destroy() {
  root?.removeEventListener('click', onPress);
  root = null;
  onPress = null;
  close();
}
