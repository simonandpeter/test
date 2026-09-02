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
import {
  LAYOUTS,
  adoptSeed,
  controls,
  defaultLayout,
  seeded,
  setChoice,
  syncCalendarFacet,
  wireControls,
} from './index/controls.js';
import { loadSearch, monthsBySlugFor } from './index/search.js';
import { applySnapshot, keep, snapshot } from './index/place.js';
import { matching, readerHasFiltered } from './index/filter.js';
import { paintGrid, paintWindow, wireGrid } from './index/grid.js';
import { wireSticky } from './index/sticky.js';
import { applyMode, paintCarousel, sessionMode } from './index/modes.js';
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
  // `keep` is what makes this readable from the saint page, which shows the
  // same set beside the life (views/index/place.js).
  if (state) remembered = keep(snapshot(state));
  state?.cleanups.forEach((fn) => fn?.());
  closeState();
}

export function render(el, { data, router, nav }) {
  destroy();

  const cards = data.saints;
  const settings = store.getSettings();
  /*
   * **A shared link's order is the order it opens on** (Session 6's third
   * survivor, 2026-08-29). The random sort is a pure function of a seed
   * (`shuffleKey`), so the seed *is* the shuffle — carrying it in the URL is
   * what makes a dealt row a thing one reader can hand to another. Read before
   * the filters are seeded, and adopted as the visit's own so leaving and
   * coming back keeps it; `reflectSeed` below writes the other direction.
   *
   * The router never produces a query string, so this can only be an arrival —
   * a paste, a bookmark, a message — which is exactly the case it is for.
   */
  const sharedSeed = new URLSearchParams(location.search).get('seed');
  adoptSeed(sharedSeed);
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
    // is remembered the same way. Failing a stored choice the screen decides —
    // cards on a desktop, rows on a phone (author, 2026-08-27).
    layout: LAYOUTS.includes(settings.indexLayout) ? settings.indexLayout : defaultLayout(),
    // The page opens on the carousel (author, 2026-08-27), and remembers a
    // reader who has moved off it — the same bargain Layout and Detailed make.
    /*
     * **The carousel on every fresh load** (author, 2026-08-28). `sessionMode`
     * is what the reader pressed during this visit and dies with the document;
     * `settings.indexMode` is no longer written by the toggle and survives only
     * as the way a test asks for the other face without pressing anything.
     */
    mode: sessionMode() ?? (MODES.includes(settings.indexMode) ? settings.indexMode : 'carousel'),
    detailed: settings.indexDetailed === true,
    loop: null,
    finePointer: window.matchMedia('(pointer: fine)').matches,
    /*
     * Whether the address bar should carry the seed. **Only when the reader
     * made this hand theirs** — they arrived on a shared link, or pressed
     * Shuffle — and never on a plain visit, because a URL that always carried
     * the seed would make every reload repeat the hand, and "a fresh visit
     * deals a new hand" is a recorded author decision (2026-08-24: "each time
     * you open the site you get exposed to more saints") with a test pinning
     * it. The deep link *reads* unconditionally; it is only the writing that
     * asks for a reason.
     */
    seedShared: Boolean(sharedSeed),
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
      <!-- Session 6's second survivor: a new hand for the row, on the face
           that has no sort control to ask twice from. Hidden on the search
           face by CSS - the die and the sort chips already own chance there. -->
      <button type="button" class="shuffle-btn utility" data-shuffle>${esc(STRINGS.saints.shuffle)}</button>
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
  wireShuffle();
  wireCarouselKeys();
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
  /*
   * **And the row keeps its place on an ordinary return too** (author,
   * 2026-09-02: "when you click away from the All Saints page while on
   * Carousel to any other page, lets say About page, then back to All Saints,
   * the Carousel starts at the beginning location again. Make sure it
   * remembers the location as it does when switching back from Advanced
   * search, so that if you spot a saint as you switch pages you can switch
   * back and see it where it was").
   *
   * The offset alone, not the whole snapshot: a full restore puts the filters,
   * the open facets and the page's scroll back, and that is what the saint
   * page's × means and what a history traversal means. Pressing *About* and
   * then *All Saints* is a fresh visit to the page — the reader did not ask
   * for their search back — but the row they were looking at is the one thing
   * they can be halfway through reading, and the seed is per visit, so the
   * run is the same run.
   *
   * **Only when nothing was filtered**, which is what makes that last clause
   * true rather than hopeful: a filtered pool is a different set of saints in
   * a different order, and an offset taken against it would land on somebody
   * else. `paintCarousel` would not catch it — a fresh render has no
   * `carouselKey` to compare against, which is the same reason `applySnapshot`
   * can hand its own offset over safely.
   *
   * `readerHasFiltered` and not `hasActiveFilters`: the Calendar facet opens
   * with all four ticked (`syncCalendarFacet`), so the plain question "are any
   * filters set" is true on a page nobody has touched — which is the
   * distinction that helper exists to draw, and skipping it made this restore
   * never fire once.
   */
  else if (remembered && !readerHasFiltered(remembered.filters)) {
    state.carouselAt = remembered.carouselAt ?? null;
  }
  update({ animate: false });
  applyMode();
  if (restoring) {
    window.scrollTo(0, restoring.scrollY);
    paintWindow();
  }
  loadSearch(cards, { onChange: update });
  reflectSeed();
}

/**
 * A fresh hand, dealt on request. The sort is put to Random through
 * `setChoice`, so the search face's own control tells the truth if the reader
 * flips over to look — a state changed behind a control is a control that
 * lies. The new seed goes through `adoptSeed` for the same reason the URL's
 * does: a shuffle the reader asked for should survive a trip to a saint's
 * page and back.
 */
function wireShuffle() {
  const { el } = state;
  el.querySelector('[data-shuffle]').addEventListener('click', () => {
    const seed = String(Date.now());
    adoptSeed(seed);
    // A hand the reader dealt is a hand worth keeping and handing on: the
    // press is what makes the seed theirs, so the press is what puts it in
    // the bar.
    state.seedShared = true;
    setChoice(el.querySelector('.index-controls'), 'sort', 'random');
    state.filters = { ...state.filters, sort: 'random', shuffleSeed: seed };
    update({ animate: true });
  });
}

/**
 * Arrow keys step the row (Session 6's first survivor). The track is already
 * `tabindex="0"` and **keyboard focus holds the drift still** (ui/loop-scroll's
 * focus rule), so the keys act on a stationary row rather than chasing one.
 * The write goes straight to `scrollLeft`; the loop's own scroll handler
 * adopts any position it did not write itself, which is the seam built for
 * exactly this.
 */
function wireCarouselKeys() {
  const { el } = state;
  const track = el.querySelector('[data-carousel-track]');
  track.setAttribute('aria-description', STRINGS.saints.carouselKeys);
  track.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    // One column per press: the cell is the row's own unit, measured off the
    // first one rather than recomputed from tokens - a probe of what is
    // actually there. 166 only if the row is somehow empty.
    const cell = track.querySelector('.cx-cell, .cx-card');
    const step = (cell?.getBoundingClientRect().width ?? 150) + 16;
    /*
     * **Instant, not smooth — and not as a motion opinion.** A smooth scrollBy
     * aims at an absolute position, and the loop's own `wrap()` teleports the
     * track a whole period whenever it nears an edge: the animation then eases
     * toward a target from the *old* frame of reference, and on a narrow
     * screen — short period, frequent wraps — a press moved the row 4 px
     * instead of a column. A direct write is applied and wrapped in the same
     * breath, which is the seam `onScroll` adopts external positions through.
     */
    track.scrollLeft += e.key === 'ArrowLeft' ? -step : step;
  });
}

/**
 * The seed, written into the address bar so it can be copied.
 *
 * `replaceState`, never `pushState`: the order is a property of the page the
 * reader is on, not a place they went, and Back should leave the site rather
 * than step through old shuffles. Stripped when the sort is not Random -
 * a seed on a name-sorted page would be a claim the URL cannot keep.
 */
function reflectSeed() {
  if (!state) return;
  const random = state.filters.sort === 'random' && state.filters.shuffleSeed;
  const next = state.seedShared && random ? `?seed=${encodeURIComponent(state.filters.shuffleSeed)}` : '';
  // Leaving Random orphans the seed twice over: strip it, and stop writing it
  // back if the reader returns to Random later - the new hand is not the one
  // the link named.
  if (!random) state.seedShared = false;
  if (location.search === next) return;
  history.replaceState(null, '', location.pathname + next);
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
  // The address bar follows the sort: a seed appears with Random and goes with
  // it, whichever control made the change.
  reflectSeed();
}
