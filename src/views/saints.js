/**
 * All Saints — Index mode (brief §8.2). The conventional view: a vertical
 * virtualised grid where all the sorting and filtering live. River mode is
 * Session 6 and is deliberately absent rather than stubbed; when it lands, the
 * mode toggle goes above these controls and nothing here changes.
 *
 * Three things here are not incidental:
 *
 * - **Every card's height is known before it is rendered**, from the aspect
 *   ratio in the manifest, so the virtualiser never measures (Addendum C2).
 * - **Filtered-out saints fade rather than vanish**, over the standard 200 ms,
 *   because a corpus that flickers reads as a search engine and this is a
 *   register. Under reduced motion they are simply gone — removed, not faster.
 *
 * And one thing added on 2026-08-22 (Addendum H1–H3): the grid remembers where
 * the reader left it, shows more of each saint when asked (*Detailed*), and
 * carries the Save bookmark on every card.
 */

import { escapeHtml as esc } from '../lib/markdown.js';
import { EMPTY_FILTERS, facetsOf } from '../lib/index-filters.js';
import { subscribeChurch } from '../lib/church.js';
import { STRINGS } from '../ui/strings.js';
import * as store from '../lib/store.js';
import { state, open as openState, close as closeState } from './index/state.js';
import { LAYOUTS, controls, seeded, syncCalendarFacet, wireControls } from './index/controls.js';
import { loadSearch, monthsBySlugFor } from './index/search.js';
import { applySnapshot, snapshot } from './index/place.js';
import { matching } from './index/filter.js';
import { paintGrid, paintWindow, wireGrid } from './index/grid.js';
import { wireSticky } from './index/sticky.js';
import { applyMode, paintCarousel } from './index/modes.js';
import { paintSummary } from './index/count.js';

export const title = () => STRINGS.saints.title;

const MODES = ['carousel', 'search'];


/**
 * Where the reader was, kept across a trip into a saint's page (author,
 * 2026-08-22): the × on that page and the browser's own back both return here
 * and find the grid as it was left — filters, search, sort, which facets were
 * open, and the scroll position. Layout and Detailed are settings and come
 * back by themselves. Module-level, so it lives as long as the page does; the
 * nav link still opens the Index fresh, because it does not ask.
 */
let remembered = null;


export function destroy() {
  if (state) remembered = snapshot(state);
  state?.cleanups.forEach((fn) => fn?.());
  closeState();
}

export function render(el, { data, router, nav }) {
  destroy();

  const cards = data.saints;
  const settings = store.getSettings();
  openState({
    el,
    data,
    router,
    cards,
    filters: seeded({ ...EMPTY_FILTERS }),
    facets: facetsOf(cards),
    monthsBySlug: monthsBySlugFor(cards),
    search: null,
    rendered: new Map(),
    positions: [],
    shownCards: [],
    shown: 0,
    // Which layout the reader last chose, remembered across visits: a view
    // control that forgets is one the reader has to set every time. Detailed
    // is remembered the same way.
    layout: LAYOUTS.includes(settings.indexLayout) ? settings.indexLayout : 'cards',
    // The page opens on the carousel (author, 2026-08-27), and remembers a
    // reader who has moved off it — the same bargain Layout and Detailed make.
    mode: MODES.includes(settings.indexMode) ? settings.indexMode : 'carousel',
    detailed: settings.indexDetailed === true,
    loop: null,
    finePointer: window.matchMedia('(pointer: fine)').matches,
    named: null,
    cleanups: [],
  });

  /*
   * The heading carries the mode toggle beside it (author, 2026-08-27: "a
   * button toggle to the right of 'All Saints'"). The button names where it
   * goes, not where it is, so its own label is the answer to "what happens if
   * I press this".
   */
  el.innerHTML = `
    <div class="index-head">
      <h1>${STRINGS.saints.title}</h1>
      <button type="button" class="mode-toggle utility" data-mode-toggle
        ><span class="mode-label" data-mode-label></span></button>
    </div>
    ${controls(state)}
    <p class="result-count sr-only" data-count-row></p>
    <p class="set-aside utility" data-set-aside></p>
    <div class="carousel" data-carousel hidden>
      <div class="carousel-track" data-carousel-track
        tabindex="0" role="region" aria-label="${esc(STRINGS.saints.carouselLabel)}"></div>
    </div>
    <div class="grid" data-grid><div class="grid-inner" data-grid-inner></div></div>
    <div data-tray></div>
    <p class="index-empty" data-empty hidden>${STRINGS.saints.noneMatch}</p>`;

  /*
   * **The Calendar facet opens on the calendar the header keeps** (author,
   * 2026-08-27: "have it default to whatever the site calendar settings are,
   * ticking that box. If you tick others, but then you change the calendar
   * again, the filters reset to just the site calendar").
   *
   * This makes the facet the Index's *only* church narrowing, where the page
   * used to narrow to the reader's church before the filters ran and then
   * offer the facet on top of what was left. That arrangement could not do
   * what the author asks: ticking a second calendar inside a set already cut
   * to the first gives the *intersection*, so "tick others" would have shown
   * fewer saints rather than more. The predicate is unchanged — `keptBy` and
   * the facet's own test are the same line of code — so the opening set is
   * exactly what it was.
   */
  // The label starts filled rather than faded in: there is no previous word to
  // cross over from on the page's first paint.
  el.querySelector('[data-mode-label]').textContent =
    state.mode === 'carousel' ? STRINGS.saints.modeToSearch : STRINGS.saints.modeToCarousel;
  syncCalendarFacet();
  wireControls({ onChange: update });
  wireSticky();
  wireGrid({ onChange: update });
  // The header's control can change the church while the grid is open, and
  // when it does the facet goes back to just the new one.
  state.cleanups.push(
    subscribeChurch(() => {
      if (!state) return;
      syncCalendarFacet();
      update({ animate: true });
    }),
  );

  // Back where the reader was, if that is what this navigation is — the saint
  // page's × says so, and so does a history traversal. The grid's height has
  // to exist before the scroll can, which is why the restore straddles update.
  const restoring = (nav?.restore || nav?.pop) && remembered ? remembered : null;
  if (restoring) applySnapshot(restoring);
  update({ animate: false });
  applyMode();
  if (restoring) {
    window.scrollTo(0, restoring.scrollY);
    paintWindow();
  }
  loadSearch(cards, { onChange: update });
}


/* ---- the grid ------------------------------------------------------------ */

/**
 * One pass over the page: what matches, what that says, and where it goes.
 *
 * This was 121 lines and two responsibilities joined by a single value. The
 * data crosses one way — `matching()` works out `matched`, and everything
 * after reports or places it. `animate` is an input to *both* halves rather
 * than a product of the first, which is worth saying so nobody re-derives it
 * and thinks they have found a second thread between them.
 *
 * `matching()` is pure and returns its answer; the assignment to
 * `state.shownCards` is here, in the composition, because a function that both
 * returns a value and writes it to shared state is testable in name only.
 */
function update({ animate }) {
  const found = matching(state);
  state.shownCards = found.matched;
  paintSummary(found, { animate });
  paintGrid(found.matched, { animate });
  // The carousel draws from the same filtered set, so it follows a search or a
  // filter change like the grid does. It is a no-op when the pool has not moved.
  if (state.mode === 'carousel') paintCarousel();
}
