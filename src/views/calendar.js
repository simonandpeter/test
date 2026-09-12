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

import { addDaysIso, dayOrder, parseIso, todayIso } from '../lib/calendar-page.js';
import { currentChurch, subscribeChurch } from '../lib/church.js';
import { observePrefetch } from '../lib/detail.js';
import { onWideChange } from '../lib/viewport.js';

import { entriesFor } from './daily/entries.js';
import { dayInWords } from './daily/format.js';
import { fillDay } from './daily/lives.js';
import { adoptRows, wireOpen } from './daily/open.js';
import { hymnsMarkup, readingsMarkup } from './daily/record.js';
import { paintSidebar, sidebarMarkup, wireSidebar } from './daily/sidebar.js';
/* The page's own state, and the one file allowed to write it — see
   views/daily/state.js for why it is a singleton and why it moved. */
import { state, open as openState, close as closeState } from './daily/state.js';
import { emptyGridHTML, revealImages, tilesHTML } from './daily/tiles.js';

import { STRINGS, fill } from '../ui/strings.js';

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
   * The readings and the day's feast hymns sit at the foot of the scroller,
   * below the last tile (plan §11.2). They and the day's fasting note are
   * transcribed by hand into `data/liturgical-days.js`; the mockup's silence
   * about them is an absence of design and not a decision to drop them.
   *
   * The feast's hymns are the day's own and belong beside its readings; the
   * *saints'* hymns are not here, because each saint now sings in the two
   * columns of their own tile (`tiles.js`, filled by `lives.js`).
   */
  el.innerHTML = `<div class="today">
      ${sidebarMarkup()}
      <div class="td-scroll" data-td-scroll>
        <section class="day-grid" data-day-grid></section>
        <div class="day-foot" data-day-foot></div>
      </div>
    </div>`;

  paintSidebar(el, selected);
  state.cleanups.push(
    wireSidebar(el, { select }),
    wireOpen(el.querySelector('[data-td-scroll]')),
    wireKeys(),
    // The header's control can change the church while this page is open:
    // everything that counts entries, and every fact the column computes, is
    // asked again in the new calendar.
    subscribeChurch(() => {
      if (!state) return;
      state.calendar = currentChurch();
      paintSidebar(state.el, state.selected);
      paintDay();
    }),
    /*
     * Crossing 1024 px changes more than the column's shape: the month caption
     * stops being the full-screen calendar's opener and the reckoning becomes
     * Gregorian rather than the church's (`lib/viewport.js`). Both are things
     * the sidebar prints, so the sidebar is painted again — a stylesheet
     * cannot say either of them.
     */
    onWideChange(() => state && paintSidebar(state.el, state.selected)),
  );
  paintDay();
}

/**
 * **The keys step the day from anywhere on the page.** Left is back, right is
 * forward, matching the two marks either side of the date; both go through
 * `select`, so the URL, the announcement and the repaint are the ones a press
 * of those marks would have caused.
 *
 * Bound to the document rather than to the column, because the reader is
 * usually somewhere down among the saints when they want the next day, and a
 * handler on the column would need focus to be in a place nothing puts it.
 * That reach is also what the four guards are for:
 *
 * - a **modifier** means the press belongs to the browser (Alt+Left is Back)
 *   or to the OS, and stepping the day as well would be a second action the
 *   reader did not ask for;
 * - an **editable target** means they are typing, and All Saints' search field
 *   is one route away;
 * - an **open `<dialog>`** is the full-screen calendar, which is a month and
 *   owns its own arrows;
 * - **`defaultPrevented`** lets any control that already answers an arrow —
 *   a select, a slider, anything added later — keep it without this having to
 *   list them.
 *
 * The month grid is deliberately not in that list: its cells are ordinary
 * buttons that answer no arrow of their own, so a reader whose focus is in the
 * month still steps the day. If the grid ever takes a roving tabindex it must
 * take a guard here in the same commit, or the two will fight over the press.
 */
function wireKeys() {
  const onKey = (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const t = e.target;
    if (t instanceof HTMLElement && (t.isContentEditable || t.closest('input, textarea, select'))) return;
    if (document.querySelector('dialog[open]')) return;
    e.preventDefault();
    select(addDaysIso(state.selected, e.key === 'ArrowRight' ? 1 : -1));
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
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
  /*
   * **The strip says what it is, and says it to the only reader who cannot
   * already see it.** The sidebar heads the day; the saints beside it had no
   * name of any kind, so a screen reader arriving here was handed a run of
   * articles with nothing over them. The words are `commemorationsFor`, which
   * has been in all five packs unused since the rebuild.
   *
   * An accessible name and not a printed heading: what stood here was "Also
   * today" over the saints *besides* the hero, and this strip holds the hero
   * too — the split those words describe is not on the page any more. What
   * should be *drawn* above the day is the desktop redesign's to say, and the
   * author has not described it yet (docs/WHERE-WE-ARE.md).
   */
  grid.setAttribute('aria-label', fill(STRINGS.calendar.commemorationsFor, { date: dayInWords(selected) }));
  grid.innerHTML = entries.length
    ? tilesHTML(dayOrder(entries, selected, data.bySlug, calendar), data)
    : emptyGridHTML();
  el.querySelector('[data-day-foot]').innerHTML =
    `${readingsMarkup(selected, calendar)}${hymnsMarkup(selected, calendar)}`;

  // The grid's children are the day's rows from here on, and the first of them
  // is opened — which is `adoptRows`' own doing, not this file's.
  adoptRows(grid);
  state.dayCleanups.push(revealImages(grid), fillDay(grid, selected), observePrefetch(el));
}
