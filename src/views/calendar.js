/**
 * The Daily page — the habit page (brief §8.1, PLAN.md).
 *
 * **This file is the frame and the funnel, and nothing else** (rebuild plan
 * §9 Step 5). It opens the page's state, emits the two boxes the day is drawn
 * in, hands each of them to the module that owns it, and funnels every change
 * of day through one `select`. What it does *not* do any more is draw: the
 * standing column is `daily/sidebar.js`, a saint is `daily/tiles.js`, which of
 * them is open is `daily/open.js`, and the parts that arrive after paint are
 * `daily/lives.js`. 1,387 lines of hero, register, week rail, month picker,
 * grain track, fast bubble and relocated chrome went with them.
 *
 * Day-to-day movement inside the view updates the URL with `replaceState`
 * rather than `router.navigate`: stepping through days must not pile history
 * entries, and the page repaints in place rather than being re-rendered under
 * the reader. Cold loads and back/forward still arrive through the router.
 */

import '../styles/daily.css';
import '../styles/daily-sidebar.css';
import '../styles/daily-tiles.css';

import { parseIso, pickHero, todayIso } from '../lib/calendar-page.js';
import { currentChurch, subscribeChurch } from '../lib/church.js';
import { observePrefetch } from '../lib/detail.js';

import { entriesFor } from './daily/entries.js';
import { fillDay } from './daily/lives.js';
import { adoptRows, wireOpen } from './daily/open.js';
import { readingsMarkup } from './daily/record.js';
import { paintSidebar, sidebarMarkup, wireSidebar } from './daily/sidebar.js';
/* The page's own state, and the one file allowed to write it — see
   views/daily/state.js for why it is a singleton and why it moved. */
import { state, open as openState, close as closeState } from './daily/state.js';
import { emptyGridHTML, revealImages, tilesHTML } from './daily/tiles.js';

import { STRINGS } from '../ui/strings.js';

export const title = () => STRINGS.calendar.title;

/**
 * Listeners that outlive a single paint — the sidebar's three controls, the
 * open-card listener, the church subscription — and, separately, the ones that
 * belong to the day currently drawn. The router calls `destroy()` before the
 * next view renders.
 */
export function destroy() {
  state?.dayCleanups.forEach((fn) => fn?.());
  state?.cleanups.forEach((fn) => fn?.());
  if (state) {
    state.dayCleanups = [];
    state.cleanups = [];
  }
  closeState();
}

/**
 * The Daily page says which day it is on, so the header's own Daily button can
 * become Today while the reader is looking at another day (author,
 * 2026-08-26 evening). An event rather than an import: main.js owns the nav
 * and this view owns the day, and neither should have to hold the other.
 *
 * Every change of day goes through `select`, which is also where the URL is
 * written — so that is the one place that needs to say so.
 */
const announceDay = (iso) =>
  document.dispatchEvent(new CustomEvent('gos:day', { detail: { iso, today: iso === todayIso() } }));

export function render(el, { data, params, router }) {
  destroy();
  const selected = params.date && parseIso(params.date) ? params.date : todayIso();
  // A deep link into a day that is not today arrives already scrolled away
  // from it, so the button has to be told on the way in as well as on a step.
  queueMicrotask(() => announceDay(selected));
  openState({
    el,
    data,
    router,
    selected,
    /* Every other module on this page calls the page's own funnel through the
       state rather than importing it — views/daily/sidebar.js and
       views/daily/fullcal.js both change the day this way. */
    select,
    calendar: currentChurch(),
    cleanups: [],
    dayCleanups: [],
    /* Written by views/daily/open.js on every paint, read by nothing here —
       declared so the shape of the page's state is readable in one place. */
    rows: [],
    openIdx: -1,
  });

  /*
   * **The day stands still and the saints pass under it** (author,
   * 2026-09-12). Two boxes: a column that is over the strip rather than the
   * first cell of it, and a scroller holding the day's saints clear of it.
   * Which is why the sidebar is first in the document as well as first on the
   * page — it is the day, and the grid is what the day has in it.
   *
   * The readings sit at the foot of the scroller, below the last tile (plan
   * §11.2). They and the day's fasting note are transcribed by hand into
   * `data/liturgical-days.js`; the mockup's silence about them is an absence
   * of design and not a decision to drop them.
   */
  el.innerHTML = `<div class="today">
      ${sidebarMarkup()}
      <div class="td-scroll" data-td-scroll>
        <div class="day-grid" data-day-grid></div>
        <div class="day-foot" data-day-foot></div>
      </div>
    </div>`;

  paintSidebar(el, selected);
  state.cleanups.push(
    wireSidebar(el, { select }),
    wireOpen(el.querySelector('[data-td-scroll]')),
    // The header's control can change the church while this page is open:
    // everything that counts entries, and every fact the column computes, is
    // asked again in the new calendar.
    subscribeChurch(() => {
      if (!state) return;
      state.calendar = currentChurch();
      paintSidebar(state.el, state.selected);
      paintDay();
    }),
  );
  paintDay();
}

/**
 * The one funnel for changing the day (author, 2026-08-24: the page moves, the
 * history does not). The column repaints in place rather than being rebuilt —
 * `paintSidebar` writes into named slots, so the controls it carries keep the
 * listeners `wireSidebar` gave them.
 */
function select(iso) {
  if (!state || iso === state.selected) return;
  state.selected = iso;
  history.replaceState(null, '', state.router.href(iso === todayIso() ? '/' : `/calendar/${iso}`));
  announceDay(iso);
  paintSidebar(state.el, iso);
  paintDay();
}

/**
 * **The day leads with the saint the church sings for** (author, 2026-08-22,
 * via `pickHero`), because `open.js` opens the grid's first tile and the first
 * tile is what the reader is given without asking. The rest follow in the
 * day's own order — the order the corpus records them in, which is the one
 * order on this page that is not a judgement about which saint matters more.
 */
function dayOrder(entries, iso) {
  const hero = pickHero(iso, entries, state.data.bySlug, state.calendar);
  return hero ? [...entries.filter((e) => e.slug === hero), ...entries.filter((e) => e.slug !== hero)] : entries;
}

/**
 * The day, drawn: every saint of it as an article that is both the tile and
 * the card, the readings under them, and the two passes that fill what the
 * manifest does not carry.
 *
 * Both late passes return a teardown and both are `dayCleanups`, not
 * `cleanups`: a reader who steps a day must not have the previous day's
 * pictures let up into the new day's grid, nor its lives written into it.
 */
function paintDay() {
  const { el, data, selected, calendar } = state;
  state.dayCleanups.forEach((fn) => fn?.());
  state.dayCleanups = [];

  const grid = el.querySelector('[data-day-grid]');
  const entries = entriesFor(selected, data);
  grid.innerHTML = entries.length ? tilesHTML(dayOrder(entries, selected), data) : emptyGridHTML();
  el.querySelector('[data-day-foot]').innerHTML = readingsMarkup(selected, calendar);

  // The grid's children are the day's rows from here on, and the first of them
  // is opened — which is `adoptRows`' own doing, not this file's.
  adoptRows(grid);
  state.dayCleanups.push(revealImages(grid), fillDay(grid, selected), observePrefetch(el));
}
