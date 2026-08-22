/**
 * The calendar — the habit page (brief §8.1, DESIGN.md §5b). Opens on today
 * in the reader's local date; week strip and month view to move; deep links
 * at /calendar/YYYY-MM-DD; every tradition's commemorations grouped by
 * church, in each tradition's own reckoning and style.
 *
 * Day-to-day movement inside the view updates the URL with replaceState
 * rather than router.navigate: stepping through days must not pile history
 * entries, and it lets the slot transition run instead of a full re-render.
 * Cold loads and back/forward still arrive through the router.
 */

import { buildFeastIndex, toIsoDate } from '../lib/feasts.js';
import { gregorianToJdn } from '../lib/jdn.js';
import { CHURCHES, CHURCHES_BY_ID } from '../data/churches.js';
import { formatFeast } from '../data/calendars.js';
import {
  addDaysIso,
  formatLifespan,
  parseIso,
  pickHero,
  todayIso,
  weekOf,
} from '../lib/calendar-page.js';
import { observePrefetch } from '../lib/detail.js';
import {
  currentSelection,
  filterEntries,
  hasChosen,
  isAll,
  selectAll,
  selectCommunion,
  selectionLabel,
  toggleChurch,
  toggleCommunion,
  toggleRite,
  writeSelection,
} from '../lib/tradition.js';
import { enabledCommunions } from '../data/churches.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { renderFilterPlate } from '../ui/plate.js';
import { renderBadge } from '../ui/badge.js';
import { renderMatrix } from '../ui/matrix.js';
import { onGrainDrag } from '../ui/grain-drag.js';
import { makeGrain } from '../ui/grain.js';
import { beginSwap, landSwap, restore, setAside } from '../ui/swap.js';
import { renderSaveButton, wireSaveButtons } from '../ui/save.js';
import { mountShelves } from '../ui/shelf.js';
import { STRINGS, fill } from '../ui/strings.js';

export const title = STRINGS.calendar.title;

const BASE = import.meta.env.BASE_URL;

const dayFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});
const weekdayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });
// Abbreviated (author, 2026-08-21): the name sits in the gutter beside the
// grid, and a full "September" reached across into the dates.
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const utc = (iso) => {
  const d = parseIso(iso);
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
};

/* Two icon buttons stand in for the old text ones. Both are stroked in
   currentColor and carry their name on the button's aria-label, so neither
   introduces a colour and neither depends on the icon being understood. */
const ICON_TODAY = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
  stroke-width="1.6" aria-hidden="true" focusable="false">
  <circle cx="12" cy="12" r="5.5"/>
  <circle cx="12" cy="12" r="1.75" fill="currentColor" stroke="none"/>
  <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" stroke-linecap="round"/>
</svg>`;

const ICON_MONTH = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
  stroke-width="1.6" aria-hidden="true" focusable="false">
  <rect x="3.25" y="5" width="17.5" height="15.75" rx="2.5"/>
  <path d="M3.25 9.75h17.5"/>
  <path d="M8 2.75v4M16 2.75v4" stroke-linecap="round"/>
</svg>`;

/** Matches --dur-month in tokens.css; the fade is long on purpose. */
const MONTH_FADE = 420;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let state = null;

/**
 * Listeners that outlive a single paint — the shelves' store subscription and
 * whatever the current day panel wired up. The router calls destroy() before
 * the next view renders.
 */
export function destroy() {
  state?.cleanups.forEach((fn) => fn?.());
  clearTimeout(state?.sizeTimer);
  if (state) state.cleanups = [];
  state = null;
}

const indexCache = new Map();
function indexFor(year, data) {
  if (!indexCache.has(year)) {
    indexCache.set(year, buildFeastIndex(data.saints, year, CHURCHES_BY_ID));
  }
  return indexCache.get(year);
}

/**
 * The day's commemorations, narrowed to the traditions the reader keeps
 * (author, 2026-08-21). Everything downstream reads through here — the hero,
 * the register, the density dots under every date at both grains — so a
 * tradition turned off is off everywhere on the page rather than in the one
 * place someone remembered to filter. The selection itself is read from
 * lib/tradition.js each time, never cached here: the moment a second view
 * respects it, a copy held in this view's state would be the one that drifts.
 */
const allEntriesFor = (iso, data) => indexFor(parseIso(iso).year, data).get(iso) ?? [];
const entriesFor = (iso, data) => filterEntries(allEntriesFor(iso, data), currentSelection());
const countFor = (iso, data) => entriesFor(iso, data).length;

export function render(el, { data, params, router }) {
  destroy();
  const selected = params.date && parseIso(params.date) ? params.date : todayIso();
  state = {
    el, data, router, selected,
    monthCursor: null, monthOpen: false,
    filterOpen: false,
    cleanups: [], dayCleanups: [],
    sizeTimer: null,
    weekGrain: null, monthGrain: null,
  };

  el.innerHTML = `
    <div class="cal">
      ${askMarkup()}
      <div class="cal-controls">
        <div class="cal-jump">
          <button type="button" data-today aria-label="${STRINGS.calendar.goToday}">${ICON_TODAY}</button>
          <button type="button" data-month aria-expanded="false"
            aria-label="${STRINGS.calendar.monthView}">${ICON_MONTH}</button>
        </div>
        <div class="cal-span">
          <div class="cal-week">
            <div class="grain-track">
              <div class="week-row">
                <button type="button" class="peek peek-prev" data-step="-7"
                  aria-label="${STRINGS.calendar.prevWeek}"></button>
                <div class="week-strip" role="group" aria-label="${STRINGS.calendar.weekLabel}"></div>
                <button type="button" class="peek peek-next" data-step="7"
                  aria-label="${STRINGS.calendar.nextWeek}"></button>
              </div>
            </div>
          </div>
          <div class="cal-month" hidden>
            <span class="month-name"></span>
            <div class="month-days-line" aria-hidden="true">
              <span class="peek-gap"></span>
              <div class="month-days"></div>
              <span class="peek-gap"></span>
            </div>
            <div class="month-body">
              <div class="grain-track">
                <div class="month-row">
                  <button type="button" class="peek peek-prev" data-mstep="-1"
                    aria-label="${STRINGS.calendar.prevMonth}"></button>
                  <div class="month-grid"></div>
                  <button type="button" class="peek peek-next" data-mstep="1"
                    aria-label="${STRINGS.calendar.nextMonth}"></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="cal-filter utility">
        <button type="button" class="filter-open" data-filter-open aria-expanded="false"
          aria-controls="cal-filter-panel"></button>
        <div class="filter-panel panel" id="cal-filter-panel" hidden>
          <h2 class="filter-heading">${STRINGS.filter.heading}</h2>
          <p class="filter-lede">${STRINGS.filter.lede}</p>
          <div data-plate></div>
          <p class="filter-note">${STRINGS.filter.coarse}</p>
          <div class="filter-actions">
            <button type="button" data-filter-reset>${STRINGS.filter.reset}</button>
            <button type="button" data-filter-close>${STRINGS.filter.close}</button>
          </div>
        </div>
      </div>
      <h1 class="cal-date"></h1>
      <div class="slot-viewport"><div class="day-panel"></div></div>
      <div class="shelves" data-shelves></div>
    </div>`;

  // The chevrons move a week; a day is chosen by clicking it in the strip.
  // Arrow keys inside the strip stay on a day, because that is the only way a
  // keyboard reaches one without tabbing across the whole week.
  el.querySelector('[data-step="-7"]').addEventListener('click', () => step(-7));
  el.querySelector('[data-step="7"]').addEventListener('click', () => step(7));
  el.querySelector('[data-today]').addEventListener('click', () => select(todayIso()));
  el.querySelector('[data-month]').addEventListener('click', toggleMonth);
  el.querySelector('[data-mstep="-1"]').addEventListener('click', () => stepMonth(-1));
  el.querySelector('[data-mstep="1"]').addEventListener('click', () => stepMonth(1));

  el.querySelector('[data-ask]')?.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-ask-choice]');
    if (!button) return;
    const choice = button.dataset.askChoice;
    answerAsk(choice === 'all' ? selectAll() : selectCommunion(choice));
  });

  el.querySelector('[data-filter-open]').addEventListener('click', toggleFilter);
  el.querySelector('[data-filter-close]').addEventListener('click', toggleFilter);
  el.querySelector('[data-filter-reset]').addEventListener('click', () => choose(selectAll()));
  el.querySelector('[data-plate]').addEventListener('click', (e) => {
    const button = e.target.closest('button[data-church], button[data-communion], button[data-rite]');
    if (!button) return;
    const { church, communion, rite } = button.dataset;
    if (church) choose(toggleChurch(currentSelection(), church));
    else if (communion) choose(toggleCommunion(currentSelection(), communion));
    else choose(toggleRite(currentSelection(), rite));
  });

  // Both grains sit on a track and both take a hold-and-slide, in the same
  // direction: dragging left is forward in time. The week's viewport is the
  // whole row; the month's is the body under the day-name line, because those
  // names are the one thing that must not travel.
  state.weekGrain = makeGrain({
    viewport: el.querySelector('.cal-week'),
    row: el.querySelector('.week-row'),
    paint: (row, offset, opts) => paintWeekInto(row, addDaysIso(state.selected, 7 * offset), opts),
    settle: (offset) => select(addDaysIso(state.selected, 7 * offset), { travelled: true }),
    flick: (dir) => step(7 * dir),
  });
  state.monthGrain = makeGrain({
    viewport: el.querySelector('.month-body'),
    row: el.querySelector('.month-row'),
    paint: (row, offset, opts) => paintMonthInto(row, stepCursor(monthCursor(), offset), opts),
    settle: (offset) => moveMonth(offset, { travelled: true }),
    flick: (dir) => stepMonth(dir),
    // A six-row month dragged in beside a five-row one would be cut off at the
    // bottom for the length of the drag, so the body takes the tallest of the
    // three and holds it until the reader lets go.
    onSides: (rows) => {
      const body = el.querySelector('.month-body');
      const tallest = Math.max(...rows.map((r) => r.getBoundingClientRect().height));
      const now = measure(body);
      if (tallest > now) growMonthBody(body, now, tallest, { release: false });
    },
  });
  state.cleanups.push(
    () => state.weekGrain?.land(),
    () => state.monthGrain?.land(),
    () => landSwap(el.querySelector('.slot-viewport')),
    () => landSwap(el.querySelector('.cal-span')),
    onGrainDrag(el.querySelector('.cal-week'), state.weekGrain.handlers),
    onGrainDrag(el.querySelector('.cal-month'), state.monthGrain.handlers),
  );
  el.querySelector('.week-strip').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  paintChrome();
  paintDay(el.querySelector('.day-panel'));
  wireDay(el.querySelector('.day-panel'));
  state.cleanups.push(mountShelves(el.querySelector('[data-shelves]'), { data, router }));
}

/**
 * Per-paint wiring for the day panel. The panel is replaced wholesale on every
 * day change, so its listeners are torn down and remade rather than delegated:
 * the Save button has to re-read the store for the new day's hero anyway.
 */
function wireDay(panel) {
  state.dayCleanups.forEach((fn) => fn?.());
  state.dayCleanups = [wireSaveButtons(panel), observePrefetch(panel)];
}

const step = (n) => select(addDaysIso(state.selected, n));

function select(iso, { travelled = false } = {}) {
  if (iso === state.selected) return;
  const forward = iso > state.selected;
  // The strip travels when the week under it actually changes — a peeked edge,
  // a flick, an arrow key off the end, the jump to today — and not when a day
  // is picked inside the week already showing, where there is nowhere to
  // travel to. The gesture is not what decides it; the movement is. A drag has
  // already made the trip by hand, and does not make it twice.
  const moved = weekOf(iso)[0] !== weekOf(state.selected)[0];
  state.selected = iso;
  state.monthCursor = null;
  history.replaceState(null, '', state.router.href(iso === todayIso() ? '/' : `/calendar/${iso}`));
  paintChrome();
  if (moved && !travelled) state.weekGrain.travel(forward ? 1 : -1);
  slotSwap(forward);
}

/* ---- the day roll ------------------------------------------------------- */

/**
 * The day panel rolls in the direction of travel; chrome stays put. Landing
 * whatever roll is still in flight comes first (Amendment 9, via swap.js):
 * without it a second click inside the roll found the *leaving* panel and
 * appended beside the entering one, and the orphan outlived every navigation
 * after it.
 */
function slotSwap(forward) {
  const viewport = state.el.querySelector('.slot-viewport');
  landSwap(viewport);
  const old = viewport.querySelector('.day-panel');
  const next = document.createElement('div');
  next.className = 'day-panel';
  paintDay(next);

  // Both panels are in the document at once during the roll, and a
  // view-transition-name may appear only once: a reader clicking through to a
  // saint mid-roll would otherwise hit a duplicate and lose the transition.
  for (const named of old.querySelectorAll('[style*="view-transition-name"]')) {
    named.style.viewTransitionName = 'none';
  }

  if (reducedMotion()) {
    old.replaceWith(next);
    wireDay(next);
    return;
  }
  viewport.classList.toggle('backward', !forward);
  old.classList.add('slot-leaving');
  setAside(old);
  next.classList.add('slot-entering');
  viewport.appendChild(next);
  wireDay(next);
  beginSwap(viewport, () => {
    old.remove();
    next.classList.remove('slot-entering');
  }).settle(300);
}

/**
 * The day's content changed under it — the filter, not the date — so the
 * panel repaints in place. The movement decides, not the gesture (DESIGN.md
 * §5b): a filter press has not travelled anywhere, and rolling it read as a
 * step forward in time that never happened.
 */
function repaintDay() {
  const viewport = state.el.querySelector('.slot-viewport');
  landSwap(viewport);
  const panel = viewport.querySelector('.day-panel');
  paintDay(panel);
  wireDay(panel);
}

function paintChrome() {
  const { el, selected } = state;
  paintWeekInto(el.querySelector('.week-row'), selected, { live: true });
  el.querySelector('.cal-date').textContent = dayFmt.format(utc(selected));
  paintFilterLabel();
  if (state.monthOpen) paintMonth();
}

/** Density: one dot per commemoration, capped at five, legible before arrival. */
function densityDots(iso) {
  const n = countFor(iso, state.data);
  return Array.from({ length: Math.min(n, 5) }, () => '<i></i>').join('');
}

/** The days of one month that fall on one weekday, 0 = Monday. JDN 0 was a Monday. */
function monthColumn(cursor, weekday) {
  const days = [];
  for (let day = 1; day <= daysInMonth(cursor); day++) {
    if (gregorianToJdn(cursor.year, cursor.month, day) % 7 === weekday) days.push(day);
  }
  return days;
}

const daysInMonth = (cursor) => {
  let n = 28;
  while (parseIso(toIsoDate({ year: cursor.year, month: cursor.month, day: n + 1 }))) n++;
  return n;
};

const stepCursor = (c, n) => ({
  year: c.year + Math.floor((c.month + n - 1) / 12),
  month: ((c.month + n - 1 + 12) % 12) + 1,
});

/* ---- the question a first visit is asked -------------------------------- */

/**
 * Asked once, on the calendar, because the calendar is what the answer changes
 * (author, 2026-08-21). It stands in the page's flow above the strip rather
 * than over it: this is a question, not an obstacle, and a reader who ignores
 * it gets every tradition, which is the same thing "show all" would have given
 * them. It disappears the moment it is answered and the filter panel below is
 * where the answer is changed afterwards.
 *
 * `hasChosen` and "chose everything" are deliberately different states — see
 * lib/tradition.js — so answering "show all" is an answer and stops the asking.
 */
function askMarkup() {
  if (hasChosen()) return '';
  const A = STRINGS.filter.ask;
  const choices = enabledCommunions()
    .map((c) => `<button type="button" data-ask-choice="${c.id}">${esc(c.display_name)}</button>`)
    .join('');
  return `
    <div class="tradition-ask panel" data-ask>
      <h2 class="ask-heading">${A.heading}</h2>
      <p>${A.lede}</p>
      <div class="ask-choices">
        ${choices}
        <button type="button" data-ask-choice="all">${A.all}</button>
      </div>
    </div>`;
}

/**
 * The answer takes the question off the page, so focus has to go somewhere it
 * still exists: the filter button, which is both the nearest control and the
 * one that now holds what was just chosen.
 */
function answerAsk(selection) {
  state.el.querySelector('[data-ask]')?.remove();
  choose(selection);
  state.el.querySelector('[data-filter-open]').focus();
}

/* ---- the tradition filter ----------------------------------------------- */

/**
 * The panel is a disclosure and not a dialogue: it opens under its own button,
 * inside the page's flow, and the calendar stays visible and usable behind it
 * so a reader can watch the days thin out as they turn traditions off. Nothing
 * animates — there is no motion here to remove under reduced motion because
 * there was none to add.
 */
function toggleFilter() {
  state.filterOpen = !state.filterOpen;
  const button = state.el.querySelector('[data-filter-open]');
  button.setAttribute('aria-expanded', String(state.filterOpen));
  state.el.querySelector('.filter-panel').hidden = !state.filterOpen;
  if (state.filterOpen) paintPlate();
  else button.focus();
}

/**
 * A new selection: remembered, then repainted everywhere it shows — the plate
 * itself, the button that names it, and the whole calendar under it, because
 * the density dots at both grains count the same filtered entries the day panel
 * lists.
 *
 * The plate is rebuilt wholesale, which takes the focus off whatever was just
 * pressed, so it is put back on the button holding the same dataset. A filter
 * a keyboard reader can only press once is not a filter.
 */
function choose(selection) {
  writeSelection(selection);
  const active = document.activeElement;
  const key = active?.dataset?.church
    ? `[data-church="${active.dataset.church}"]`
    : active?.dataset?.communion
      ? `[data-communion="${active.dataset.communion}"]`
      : active?.dataset?.rite
        ? `[data-rite="${active.dataset.rite}"]`
        : null;
  paintPlate();
  if (key) state.el.querySelector(`[data-plate] ${key}`)?.focus();
  paintChrome();
  repaintDay();
}

function paintPlate() {
  state.el.querySelector('[data-plate]').innerHTML = renderFilterPlate(currentSelection());
  paintFilterLabel();
}

function paintFilterLabel() {
  const button = state.el.querySelector('[data-filter-open]');
  button.textContent = selectionLabel(currentSelection());
  button.classList.toggle('is-narrowed', !isAll(currentSelection()));
}

/**
 * One week into one row: the seven days, and the two edges either side of them
 * — the Sunday behind the week and the Monday ahead of it, set on the same
 * lines as the days between and dissolving toward the margin.
 *
 * The edges replaced the chevrons (author, 2026-08-21) and they travel with
 * the week, which is why they are painted here rather than beside it: the peek
 * is the week continuing, and a row is the whole of one.
 *
 * They are still buttons. A drag is touch and pen only by design, so an edge
 * with nothing to click would strand every reader with a mouse; what went is
 * the glyph, not the affordance.
 *
 * `live` is false for the copies parked either side during a move. They are
 * `aria-hidden` and out of reach, so a listener on them would be a listener
 * nothing can reach — and the day it selected would be the wrong one anyway.
 */
function paintWeekInto(row, iso, { live }) {
  const { selected } = state;
  const today = todayIso();
  const week = weekOf(iso);

  row.querySelector('.week-strip').innerHTML = week
    .map((day) => {
      const n = countFor(day, state.data);
      const current = day === selected ? ' aria-current="date"' : '';
      const cls = day === today ? ' class="is-today"' : '';
      const density = n ? ` — ${fill(STRINGS.calendar.densityLabel, { count: n })}` : '';
      return `<button type="button" data-iso="${day}"${current}${cls}
        aria-label="${dayFmt.format(utc(day))}${density}">
        <span class="day-name">${weekdayFmt.format(utc(day))}</span>
        <span class="day-num">${parseIso(day).day}</span>
        <span class="density" aria-hidden="true">${densityDots(day)}</span>
      </button>`;
    })
    .join('');

  for (const [sel, edge] of [
    ['.peek-prev', addDaysIso(week[0], -1)],
    ['.peek-next', addDaysIso(week[6], 1)],
  ]) {
    row.querySelector(sel).innerHTML = `
      <span class="day-name" aria-hidden="true">${weekdayFmt.format(utc(edge))}</span>
      <span class="day-num" aria-hidden="true">${parseIso(edge).day}</span>`;
  }

  if (!live) return;
  for (const b of row.querySelectorAll('.week-strip [data-iso]')) {
    b.addEventListener('click', () => select(b.dataset.iso));
  }
}

/* ---- month view ------------------------------------------------------- */

/**
 * The month replaces the week rather than opening beneath it: they answer the
 * same question at two grains, and showing both at once was two date pickers
 * competing for the same click.
 *
 * The two grains share one cell, so the swap is a cross-fade in place with the
 * month's rows unfurling out of the day-name line the week already holds — the
 * day names themselves never move (author, 2026-08-21). The row is as tall as
 * whichever grain is taller, so the page below follows the growth down instead
 * of jumping the moment the button is pressed. It is deliberately slower than
 * the day roll: there is far more of it arriving.
 *
 * It only ever closes from this button — picking a date leaves it open, so a
 * reader comparing days does not have to reopen the month between each one.
 */
function toggleMonth() {
  state.monthOpen = !state.monthOpen;
  const { el, monthOpen } = state;
  const month = el.querySelector('.cal-month');
  const week = el.querySelector('.cal-week');
  const body = el.querySelector('.month-body');
  const button = el.querySelector('[data-month]');
  const span = el.querySelector('.cal-span');

  button.setAttribute('aria-expanded', String(monthOpen));
  button.classList.toggle('is-on', monthOpen);
  state.weekGrain.land();
  state.monthGrain.land();
  // A fade still in flight lands rather than being abandoned mid-air, so this
  // toggle always starts from one grain showing and one at rest.
  landSwap(span);

  // The grain the reader is leaving is marked aside for the length of the
  // fade — it is painted over the same cell, and its buttons must not hold
  // the tab order or the click. `hidden` takes over once the fade lands.
  const entering = monthOpen ? month : week;
  const leaving = monthOpen ? week : month;
  setAside(leaving);
  restore(entering);

  // Reduced motion removes the fade, so there is nothing to wait for: waiting
  // anyway would be a delay with no animation behind it.
  const reduced = reducedMotion();

  if (monthOpen) {
    paintMonth();
    month.hidden = false;
    if (reduced) {
      week.hidden = true;
      month.classList.add('is-open');
      return;
    }
    // The week stays in the layout, fading, until the month has finished
    // arriving: hiding it first would drop the row to nothing for a frame.
    growMonthBody(body, 0, measure(body));
    // One frame at opacity 0 in the layout, so the transition has a start.
    requestAnimationFrame(() => {
      month.classList.add('is-open');
      week.classList.add('is-out');
    });
    beginSwap(span, () => {
      week.hidden = true;
      week.classList.remove('is-out');
    }).settle(MONTH_FADE);
    return;
  }

  month.classList.remove('is-open');
  if (reduced) {
    month.hidden = true;
    week.hidden = false;
    return;
  }
  week.hidden = false;
  week.classList.add('is-out');
  growMonthBody(body, measure(body), 0);
  requestAnimationFrame(() => week.classList.remove('is-out'));
  beginSwap(span, () => {
    month.hidden = true;
    body.style.height = '';
  }).settle(MONTH_FADE);
}

const measure = (el) => el.getBoundingClientRect().height;

/**
 * The dates' own height, in pixels, for the length of a change to it — the
 * rows unfurling from the day-name line, folding back into it, or a five-row
 * month stepping to a six-row one. There is no transition from a number to
 * `auto`, so the end value is set explicitly and released once it has arrived;
 * the clip that makes the growth read as unfurling goes on and comes off with
 * it, so a date's focus ring is never cropped at rest.
 */
function growMonthBody(body, from, to, { release = true } = {}) {
  clearTimeout(state.sizeTimer);
  state.sizeTimer = null;
  if (reducedMotion()) {
    body.style.height = release ? '' : `${to}px`;
    body.classList.remove('is-growing');
    return;
  }
  body.classList.add('is-growing');
  body.style.height = `${from}px`;
  // Flushed deliberately: without a layout between the two values the browser
  // coalesces them into one style recalculation and there is no transition to
  // run — the rows would appear at their final height in a single frame.
  void body.offsetHeight;
  body.style.height = `${to}px`;
  state.sizeTimer = setTimeout(() => {
    // Left at 0 when the month is closing; the toggle hides it on the same
    // tick. Held, rather than released, while a drag is still in the reader's
    // hand: letting it fall back to the month underneath mid-drag would clip
    // the taller one being dragged in.
    if (to > 0 && release) body.style.height = '';
    body.classList.remove('is-growing');
    state.sizeTimer = null;
  }, MONTH_FADE);
}

/** The month the grid is showing, defaulting to the selected day's own. */
function monthCursor() {
  if (!state.monthCursor) {
    const d = parseIso(state.selected);
    state.monthCursor = { year: d.year, month: d.month };
  }
  return state.monthCursor;
}

/**
 * The month's chrome — the name in the gutter and the row of day names — and
 * then the grid itself. The day names sit outside the track and never travel:
 * they are the same seven whichever month is under them, and they are what the
 * week strip holds in exactly the same place, which is what makes toggling
 * grain read as rows arriving (Amendment 15).
 */
function paintMonth() {
  const { el } = state;
  const cursor = monthCursor();
  const first = toIsoDate({ year: cursor.year, month: cursor.month, day: 1 });

  // The name prints in the gutter beside the grid rather than above it, so it
  // costs the row no height (author, 2026-08-21).
  el.querySelector('.month-name').textContent = monthFmt.format(utc(first));

  // They say nothing a date's own label does not — the button below each of
  // them reads "Friday, 30 January 2026" in full.
  el.querySelector('.month-days').innerHTML = weekOf(first)
    .map((iso) => `<span class="month-day-name">${weekdayFmt.format(utc(iso))}</span>`)
    .join('');

  paintMonthInto(el.querySelector('.month-row'), cursor, { live: true });
}

/**
 * One month into one row: the grid, and the column of days that runs off each
 * side of it — the previous month's Sundays behind, the next month's Mondays
 * ahead, on the grid's own rows, so they read as the grid continuing rather
 * than as decoration beside it. Like the week's edges they travel with their
 * grain (author, 2026-08-21), which is why the row holds all three.
 */
function paintMonthInto(row, cursor, { live }) {
  const { selected } = state;
  const lead = gregorianToJdn(cursor.year, cursor.month, 1) % 7; // JDN 0 was a Monday

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<span></span>');
  for (let day = 1; day <= daysInMonth(cursor); day++) {
    const iso = toIsoDate({ year: cursor.year, month: cursor.month, day });
    const current = iso === selected ? ' aria-current="date"' : '';
    cells.push(`<button type="button" data-iso="${iso}"${current}
      aria-label="${dayFmt.format(utc(iso))}">${day}<span class="density"
      aria-hidden="true">${densityDots(iso)}</span></button>`);
  }
  row.querySelector('.month-grid').innerHTML = cells.join('');

  for (const [sel, c, weekday] of [
    ['.peek-prev', stepCursor(cursor, -1), 6],
    ['.peek-next', stepCursor(cursor, 1), 0],
  ]) {
    const column = monthColumn(c, weekday)
      .map((day) => {
        const iso = toIsoDate({ year: c.year, month: c.month, day });
        return `<span class="peek-cell">${day}<span class="density">${densityDots(iso)}</span></span>`;
      })
      .join('');
    row.querySelector(sel).innerHTML = `<span class="peek-col" aria-hidden="true">${column}</span>`;
  }

  if (!live) return;
  // Picking a date does not close the month: only the toggle does.
  for (const b of row.querySelectorAll('.month-grid [data-iso]')) {
    b.addEventListener('click', () => select(b.dataset.iso));
  }
}

/**
 * A month moves sideways like the week does, and takes its height with it: a
 * five-row month arriving where a six-row one was would otherwise shunt the
 * whole page up between two frames. `travelled` is a drag, which has already
 * made the trip by hand.
 */
function moveMonth(n, { travelled = false } = {}) {
  if (!state.monthCursor) return;
  const body = state.el.querySelector('.month-body');
  const before = measure(body);
  state.monthCursor = stepCursor(state.monthCursor, n);
  paintMonth();

  // Whatever a grow still in flight had pinned, so the new month is measured at
  // its own height rather than at the height it was on its way to.
  clearTimeout(state.sizeTimer);
  state.sizeTimer = null;
  body.classList.remove('is-growing');
  body.style.height = '';
  const after = measure(body);
  if (!travelled) state.monthGrain.travel(n > 0 ? 1 : -1);
  if (after !== before) growMonthBody(body, before, after);
}

const stepMonth = (n) => moveMonth(n);

/* ---- the day panel: hero + register ----------------------------------- */

/**
 * Three different silences, and a reader is owed the difference between them.
 * The corpus having nothing for a day is a statement about our sourcing; a day
 * whose commemorations the reader has filtered away is not, and printing the
 * sourcing notice over it would be a claim about our sourcing that is untrue.
 * Prose in ink in every case, never a banner.
 */
function emptyDayNote(iso) {
  if (currentSelection().size === 0) return STRINGS.filter.empty;
  const hidden = allEntriesFor(iso, state.data).length;
  if (hidden === 0) return STRINGS.calendar.emptyDay;
  return hidden === 1
    ? STRINGS.filter.filteredAwayOne
    : fill(STRINGS.filter.filteredAwayMany, { count: hidden });
}

function paintDay(panel) {
  const { data, selected } = state;
  const entries = entriesFor(selected, data);

  if (entries.length === 0) {
    panel.innerHTML = `<div class="empty-day"><p>${emptyDayNote(selected)}</p></div>`;
    return;
  }

  const heroSlug = pickHero(selected, entries, data.bySlug);
  const hero = data.bySlug.get(heroSlug);
  const heroChurches = entries.filter((e) => e.slug === heroSlug);

  // The image opens the saint too (author, 2026-08-21). Hidden from the
  // accessibility tree and out of the tab order on purpose: the name beside it
  // already links to the same page, and a second link with no text of its own
  // would be either an unnamed link or the same one announced twice.
  const media = hero.image
    ? `<a class="hero-media" href="${state.router.href(`/saints/${hero.slug}`)}"
          data-prefetch="${hero.slug}" aria-hidden="true" tabindex="-1"
          style="background-image:url('${BASE + hero.image.lqip}')">
        <img src="${BASE + hero.image.src}" alt="" width="${hero.image.w}" height="${hero.image.h}"
          style="view-transition-name:s-${hero.slug}-image" loading="eager" decoding="async" />
      </a>`
    : '';

  const feastLines = heroChurches
    .map((e) =>
      `<li>${fill(STRINGS.calendar.heroFeast, {
        church: esc(CHURCHES_BY_ID[e.church].display_name),
        feast: esc(formatFeast(e.feast)),
      })}${titleFor(hero, e.church) ? ` — <em>${esc(titleFor(hero, e.church))}</em>` : ''}</li>`,
    )
    .join('');

  const registerEntries = entries.filter((e) => e.slug !== heroSlug);
  const byChurch = new Map();
  for (const e of registerEntries) {
    if (!byChurch.has(e.church)) byChurch.set(e.church, []);
    byChurch.get(e.church).push(e);
  }

  // A saint venerated by two churches on the same day appears in both their
  // groups, and a view-transition-name may appear only once in a document, so
  // the shared element is the first row that names them.
  const named = new Set([heroSlug]);
  const register = CHURCHES.filter((c) => byChurch.has(c.id))
    .map((church) => {
      const rows = byChurch
        .get(church.id)
        .map((e) => {
          const saint = data.bySlug.get(e.slug);
          const title = titleFor(saint, church.id);
          const transition = named.has(saint.slug) ? '' : ` style="view-transition-name:s-${saint.slug}-name"`;
          named.add(saint.slug);
          return `<li>
            <a class="reg-name" href="${state.router.href(`/saints/${saint.slug}`)}"
              data-prefetch="${saint.slug}"${transition}>${esc(saint.display_name)}</a>
            ${renderBadge(saint.attestations, { pitch: 10.2 })}
            ${title ? `<span class="reg-title">${esc(title)}</span>` : ''}
            <span class="reg-feast utility">${esc(formatFeast(e.feast))}</span>
          </li>`;
        })
        .join('');
      return `<h3 class="register-heading">${esc(church.display_name)}</h3><ul class="register">${rows}</ul>`;
    })
    .join('');

  panel.innerHTML = `
    <article class="hero panel ${hero.image ? 'has-media' : ''}">
      ${media}
      <div class="hero-body">
        <div class="name-line">
          <h2 class="hero-name" style="view-transition-name:s-${hero.slug}-name">
            <a href="${state.router.href(`/saints/${hero.slug}`)}" data-prefetch="${hero.slug}">${esc(hero.display_name)}</a>
          </h2>
          ${renderMatrix(hero.attestations, { pitch: 7.65 })}
        </div>
        <p class="hero-dates utility">${esc(formatLifespan(hero.dates))}</p>
        <ul class="hero-feasts utility">${feastLines}</ul>
        <div class="hero-actions">${renderSaveButton(hero.slug)}</div>
      </div>
    </article>
    ${registerEntries.length ? `<h2 class="register-heading">${STRINGS.calendar.alsoToday}</h2>` : ''}
    ${register}`;
}

const titleFor = (saint, churchId) =>
  saint.attestations.find((a) => a.church === churchId)?.titles?.join(', ') ?? '';
