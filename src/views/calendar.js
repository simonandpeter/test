/**
 * The calendar — the habit page (brief §8.1, DESIGN.md §5b). Opens on today
 * in the reader's local date; week strip and month view to move; deep links
 * at /calendar/YYYY-MM-DD; one church's calendar at a time (author,
 * 2026-08-22): the church the reader keeps, chosen once and changed from the header.
 *
 * Day-to-day movement inside the view updates the URL with replaceState
 * rather than router.navigate: stepping through days must not pile history
 * entries, and it lets the slot transition run instead of a full re-render.
 * Cold loads and back/forward still arrive through the router.
 */

import { buildFeastIndex, toIsoDate } from '../lib/feasts.js';
import { gregorianToJdn } from '../lib/jdn.js';
import { CHURCHES_BY_ID } from '../data/churches.js';
import {
  addDaysIso,
  formatLifespan,
  parseIso,
  pickHero,
  todayIso,
  weekOf,
} from '../lib/calendar-page.js';
import { loadDetail, observePrefetch } from '../lib/detail.js';
import { churchName, currentChurch, entriesInChurch, hasChosen, subscribeChurch } from '../lib/church.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { withHonorific } from '../lib/honorific.js';
import { onGrainDrag } from '../ui/grain-drag.js';
import { makeGrain } from '../ui/grain.js';
import { beginSwap, landSwap, restore, setAside } from '../ui/swap.js';
import { renderBookmark, wireSaveButtons } from '../ui/save.js';
import { mountShelves } from '../ui/shelf.js';
import { renderChooser, wireChooser } from '../ui/church-chooser.js';
import { liturgicalDay } from '../lib/liturgy.js';
import { dateFormatter, languageTag, translateReason } from '../lib/i18n.js';
import { bibleGatewayUrl, recordedDay } from '../data/liturgical-days.js';
import { STRINGS, fill } from '../ui/strings.js';

export const title = () => STRINGS.calendar.title;

const BASE = import.meta.env.BASE_URL;

// Through lib/i18n.js's cache rather than module constants (Amendment 36): a
// formatter built once can never change language.
const dayFmt = () => dateFormatter({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
// The page's own date wears the abbreviated month (author, 2026-08-24:
// "display abbreviated months, e.g. Aug"); the buttons' aria-labels keep
// dayFmt's full month, because a label is spoken, not glanced at.
const headingFmt = () =>
  dateFormatter({ weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const weekdayFmt = () => dateFormatter({ weekday: 'short', timeZone: 'UTC' });
// Abbreviated (author, 2026-08-21): the name sits in the gutter beside the
// grid, and a full "September" reached across into the dates.
const monthFmt = () => dateFormatter({ month: 'short', year: 'numeric', timeZone: 'UTC' });

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
 * Listeners that outlive a single paint — the shelves' store subscription, the
 * selection subscription, and whatever the current day panel wired up. The
 * router calls destroy() before the next view renders.
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
 * The day's commemorations in the one calendar the page shows (author,
 * 2026-08-22). Everything downstream reads through here — the hero, the
 * register, the density dots under every date at both grains — so the page
 * counts one church everywhere rather than in the one place someone
 * remembered. The church itself is re-read from lib/church.js whenever it
 * changes, never cached beyond `state.calendar`.
 */
const allEntriesFor = (iso, data) => indexFor(parseIso(iso).year, data).get(iso) ?? [];
const entriesFor = (iso, data) => entriesInChurch(allEntriesFor(iso, data), state?.calendar);
const countFor = (iso, data) => entriesFor(iso, data).length;

export function render(el, { data, params, router }) {
  destroy();
  const selected = params.date && parseIso(params.date) ? params.date : todayIso();
  state = {
    el, data, router, selected,
    calendar: currentChurch(),
    monthCursor: null, monthOpen: false,
    cleanups: [], dayCleanups: [],
    sizeTimer: null,
    monthGrain: null, railAnchor: null,
  };

  el.innerHTML = `
    <div class="cal">
      <div class="cal-gate" data-gate></div>
      <div class="cal-body" data-cal-body>
        <div class="cal-controls">
          <div class="cal-jump">
            <button type="button" data-today aria-label="${STRINGS.calendar.goToday}">${ICON_TODAY}</button>
            <button type="button" data-month aria-expanded="false"
              aria-label="${STRINGS.calendar.monthView}">${ICON_MONTH}</button>
          </div>
          <div class="cal-span">
            <div class="cal-week">
              <div class="week-strip" role="group" tabindex="0"
                aria-label="${STRINGS.calendar.weekLabel}"></div>
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
        <h1 class="cal-date"></h1>
        <p class="cal-liturgy utility" data-liturgy></p>
        <div class="slot-viewport"><div class="day-panel"></div></div>
      </div>
      <div class="shelves" data-shelves></div>
    </div>`;

  el.querySelector('[data-today]').addEventListener('click', () => select(todayIso()));
  el.querySelector('[data-month]').addEventListener('click', toggleMonth);
  el.querySelector('[data-mstep="-1"]').addEventListener('click', () => stepMonth(-1));
  el.querySelector('[data-mstep="1"]').addEventListener('click', () => stepMonth(1));

  wireAsk();

  // The header's control can change the church while this page is open: the
  // question goes once it has been answered, and everything that counts
  // entries repaints in the new calendar.
  state.cleanups.push(
    subscribeChurch(() => {
      if (!state) return;
      paintGate();
      // The density dots under every date are the chosen church's counts, so
      // the rail is rebuilt, not just re-marked — carrying its anchor and
      // then re-revealing the selected day so the reader's place holds.
      buildRail(state.railAnchor ?? state.selected);
      paintChrome();
      revealSelected();
      repaintDay();
    }),
  );

  // The month still travels a whole month at a time on a track it is thrown
  // along; the week does not travel at all any more — it scrolls (see
  // wireRail). Its viewport is the body under the day-name line, because those
  // names are the one thing that must not move.
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
    () => state.monthGrain?.land(),
    () => landSwap(el.querySelector('.slot-viewport')),
    () => landSwap(el.querySelector('.cal-span')),
    onGrainDrag(el.querySelector('.cal-month'), state.monthGrain.handlers),
    wireRail(el.querySelector('.week-strip')),
    wireDayKeys(),
  );

  paintGate();
  buildRail(selected);
  paintChrome();
  // The whole week the day sits in, not the day pinned to an edge: a reader
  // arriving by deep link gets the same first picture the old strip gave.
  revealSelected({ week: true });
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

function select(iso) {
  if (iso === state.selected) return;
  const forward = iso > state.selected;
  state.selected = iso;
  state.monthCursor = null;
  history.replaceState(null, '', state.router.href(iso === todayIso() ? '/' : `/calendar/${iso}`));
  paintChrome();
  // The rail does not travel — it is scrolled, and only as far as it has to be
  // (author, 2026-08-24). A day picked inside the days already showing moves
  // nothing at all; a day stepped off the end brings itself into view by one
  // column, not by a week, because the rail has no weeks in it to step by.
  revealSelected();
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
 * The day's content changed under it — the calendar or the selection, not the
 * date — so the panel repaints in place. The movement decides, not the gesture
 * (DESIGN.md §5b): a filter press has not travelled anywhere, and rolling it
 * read as a step forward in time that never happened.
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
  markRail();
  el.querySelector('.cal-date').textContent = headingFmt().format(utc(selected));
  paintLiturgy();
  if (state.monthOpen) paintMonth();
}

/**
 * Under the date (author, 2026-08-22): where the day stands in the paschal
 * cycle, the tone of the week, and whether it is a fast for this church — all
 * three from lib/liturgy.js, which reckons each in the church's own calendar.
 * Joined with middle dots; a fast-free day with no reason says only "No fast".
 *
 * The fast carries its kind as a class (author, 2026-08-24) so the three
 * states are told apart by colour as well as by wording — the colour is a
 * second channel, never the only one, so it survives greyscale.
 */
function paintLiturgy() {
  const { el, selected, calendar } = state;
  const box = el.querySelector('[data-liturgy]');
  if (!box) return;
  if (!calendar) { box.innerHTML = ''; return; }
  const L = STRINGS.calendar.liturgy;
  const day = liturgicalDay(selected, calendar);
  const f = day.fasting;
  // The reason is an English string from the data or from lib/liturgy.js;
  // the locale packs translate the recurring ones and pass the rest through
  // (Amendment 36). day.title stays English — the cycle line is composed by
  // lib/liturgy.js and localising its grammar is the recorded seam.
  const reason = f.reason ? translateReason(f.reason) : f.reason;
  const fastText =
    f.kind === 'fast' ? fill(L.fast, { reason })
    : f.kind === 'fish' ? fill(L.fish, { reason })
    : f.reason ? fill(L.freeBecause, { reason })
    : L.free;
  const fastHtml = `<span class="fast fast-${esc(f.kind)}" data-fast="${esc(f.kind)}">${esc(fastText)}</span>`;
  const plain = [day.title, day.tone ? fill(L.tone, { tone: day.tone }) : null].filter(Boolean).map(esc);
  box.innerHTML = [...plain, fastHtml].join(' · ');
}

/**
 * The day's readings, where the chosen church's calendar has been read and
 * recorded (author, 2026-08-22): each reference a link to Bible Gateway, and
 * the page it was read from named. Nothing is printed for a day nobody has
 * recorded — an absence is not a claim.
 */
function readingsMarkup(iso, churchId) {
  const rec = recordedDay(iso, churchId);
  if (!rec?.readings?.length) return '';
  const R = STRINGS.calendar.readings;
  const items = rec.readings
    .map((x) => `<li><span class="reading-label">${esc(x.label)}</span> <a href="${bibleGatewayUrl(x.ref)}" rel="noopener noreferrer">${esc(x.ref)}</a></li>`)
    .join('');
  const src = rec.source?.url ? `<a href="${esc(rec.source.url)}" rel="noopener noreferrer">${esc(rec.source.text)}</a>` : esc(rec.source?.text ?? '');
  return `<section class="day-readings" data-readings>
    <h2 class="register-heading">${R.heading}</h2>
    <ul class="readings utility">${items}</ul>
    <p class="readings-source utility">${fill(R.source, { source: src })}</p>
  </section>`;
}

/** One hymn, in its own language, with its tone, its model and its source. */
function hymnMarkup(h) {
  const H = STRINGS.calendar.hymns;
  const head = [H[h.kind] ?? h.kind, h.tone, h.model].filter(Boolean).map(esc).join(' · ');
  const src = h.source?.url ? `<a href="${esc(h.source.url)}" rel="noopener noreferrer">${esc(h.source.text)}</a>` : esc(h.source?.text ?? '');
  return `<div class="hymn">
    <h3 class="hymn-kind utility">${head}</h3>
    <p class="hymn-text" lang="${esc(h.lang)}">${esc(h.text)}</p>
    <p class="hymn-source utility">${fill(H.source, { source: src })}</p>
  </div>`;
}

/**
 * The hymns of the day: a feast's, recorded with the day (the Leavetaking of
 * the Dormition on the Greek 23 August), and the hero saint's, which live in
 * the saint's own folder and arrive with its detail payload — so the section
 * is painted empty and filled when the payload lands, for the day still
 * showing. Only the chosen church's hymns, in that church's language.
 */
/*
 * What each church sings in (Amendment 37): the language its cited source
 * prints the hymns in. The note below shows whenever the site's language is
 * not this one — which for the Russian church is always, because the hymns
 * are Church Slavonic and the chrome's Russian is not — so a reader on a
 * translated page is told the untranslated block is a decision, not a bug.
 */
const HYMN_LANG = { russian: 'cu', greek: 'el', romanian: 'ro', serbian: 'sr' };

const hymnsOwnNote = (churchId) =>
  languageTag() === HYMN_LANG[churchId]
    ? ''
    : `<p class="hymn-own utility">${STRINGS.calendar.hymns.own}</p>`;

function hymnsMarkup(iso, churchId) {
  const rec = recordedDay(iso, churchId);
  const feastHymns = (rec?.hymns ?? []).filter((h) => h.church === churchId);
  return `<section class="day-hymns" data-hymns${feastHymns.length ? '' : ' hidden'}>
    <h2 class="register-heading">${STRINGS.calendar.hymns.heading}</h2>
    ${hymnsOwnNote(churchId)}
    <div data-feast-hymns>${feastHymns.map(hymnMarkup).join('')}</div>
    <div data-saint-hymns></div>
  </section>`;
}

function fillSaintHymns(panel, slug, iso) {
  loadDetail(slug).then(
    (payload) => {
      if (!state || state.selected !== iso) return;
      const box = panel.querySelector('[data-saint-hymns]');
      if (!box) return;
      const hymns = (payload?.saint?.hymns ?? []).filter((h) => h.church === state.calendar);
      if (!hymns.length) return;
      box.innerHTML = hymns.map(hymnMarkup).join('');
      panel.querySelector('[data-hymns]').hidden = false;
    },
    () => {},
  );
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

/* ---- the question a first visit is asked, and the way to change it ------- */

/**
 * Asked once, on the calendar, because the calendar is what the answer changes
 * first (author, 2026-08-21; redrawn 2026-08-22 for one church of three). It
 * stands where the strip will stand: this is a question, not an obstacle, and
 * a reader who ignores it has chosen nothing and is asked again next visit.
 * One question — which calendar, by church — because the calendar follows the
 * church; the header's control is where the answer is changed afterwards, and
 * so is "change calendar" under the strip, which shows the same choices.
 */
const askMarkup = () => (hasChosen() ? '' : `<div class="church-ask panel" data-ask>${renderChooser()}</div>`);

/**
 * One wiring for both places the choices can stand — the gate above the strip
 * and the change panel under it — because it is the same chooser. Choosing
 * closes the change panel; the subscription above repaints everything else;
 * focus goes to the nearest control in the strip's chrome, since the question
 * has gone.
 */
function wireAsk() {
  const { el } = state;
  state.cleanups.push(
    wireChooser(el.querySelector('.cal'), {
      onChange: () => {
        el.querySelector('[data-today]')?.focus();
      },
    }),
  );
}

/**
 * Before the week or the month can be seen the reader has to have chosen
 * (author, 2026-08-22): the question stands where the strip would, and the
 * strip, the date and the day are hidden until there is an answer. The
 * calendar is named and changed in the header (author, 2026-08-24).
 */
function paintGate() {
  const { el } = state;
  state.calendar = currentChurch();
  const gate = el.querySelector('[data-gate]');
  const body = el.querySelector('[data-cal-body]');

  if (!state.calendar) {
    gate.innerHTML = askMarkup();
    body.hidden = true;
    return;
  }
  gate.innerHTML = '';
  body.hidden = false;
}

/* ---- the day rail ------------------------------------------------------- */

/*
 * The week strip is a rail of days that scrolls, and this replaced the week
 * grain on 2026-08-24 at the author's instruction. Four decisions of
 * DESIGN.md §5b go with it and each is marked superseded where it sits: the
 * peeked edges were buttons, the fade was a mask, the unit of travel was a
 * week, and a drag was touch and pen only.
 *
 * What the reader gets instead: one continuous run of days, snapping to
 * whichever day it comes to rest nearest — any day, not only a Monday — and
 * the days either side of the seven on screen are *real days*, printed in the
 * same ink as the rest and clickable, rather than a masked copy of one.
 *
 * The rail is finite and re-anchors itself. RADIUS days either side of an
 * anchor is 121 buttons, which is cheap; when the reader scrolls within
 * MARGIN days of an end, the rail is rebuilt around where they are and the
 * scroll offset is carried across, so nothing moves under them and the run
 * never dead-ends.
 */

const RAIL_RADIUS = 60;
const RAIL_MARGIN = 14;
/** Where a mouse hold stops being a click and starts being a drag. */
const DRAG_SLOP = 6;
/** How long after the last scroll event the rail counts as at rest. */
const SETTLED = 140;
/*
 * The weight of a released drag (author, 2026-08-24: "a bit of weight …
 * slows down to a halt … instead of snapping"). Velocity decays as
 * exp(-t/tau); 325 ms is the feel of platform kinetic scrolling. Below
 * MIN_FLICK the release had no throw in it and the rail settles as before;
 * below COAST_STOP the coast is spent and the settle takes over.
 */
const FRICTION_TAU = 325;
const MIN_FLICK = 0.25;
/* Handing over at 0.15 px/ms rather than at nearly zero: the exponential's
   tail is a crawl the eye reads as jank, and the settle's own glide is a
   better ending — it is still moving when the snap takes the wheel. */
const COAST_STOP = 0.15;

const dayButton = (iso) => {
  const n = countFor(iso, state.data);
  const density = n ? ` — ${fill(STRINGS.calendar.densityLabel, { count: n })}` : '';
  return `<button type="button" data-iso="${iso}" tabindex="-1"
    aria-label="${dayFmt().format(utc(iso))}${density}">
    <span class="day-name">${weekdayFmt().format(utc(iso))}</span>
    <span class="day-num">${parseIso(iso).day}</span>
    <span class="density" aria-hidden="true">${densityDots(iso)}</span>
  </button>`;
};

/** Every day in the rail, anchored on `iso`. Density is read here, so this is
 *  also how the rail is repainted when the church changes under it. */
function buildRail(iso) {
  const strip = state.el.querySelector('.week-strip');
  state.railAnchor = iso;
  const days = [];
  for (let i = -RAIL_RADIUS; i <= RAIL_RADIUS; i += 1) days.push(addDaysIso(iso, i));
  strip.innerHTML = days.map(dayButton).join('');
  markRail();
}

/** The two marks that move without the rail being rebuilt. */
function markRail() {
  const strip = state.el?.querySelector('.week-strip');
  if (!strip) return;
  const today = todayIso();
  for (const b of strip.querySelectorAll('[data-iso]')) {
    const iso = b.dataset.iso;
    b.classList.toggle('is-today', iso === today);
    if (iso === state.selected) b.setAttribute('aria-current', 'date');
    else b.removeAttribute('aria-current');
  }
}

const dayAt = (iso) => state.el?.querySelector(`.week-strip [data-iso="${iso}"]`);

/** The inset a snapped day sits at: the peeked column and the row's gap. */
function railPad(strip) {
  return parseFloat(getComputedStyle(strip).scrollPaddingLeft) || 0;
}

/** Where the rail would rest with `iso` at the leading edge. */
const restFor = (strip, button) => Math.max(0, button.offsetLeft - railPad(strip));

function scrollRail(strip, left, { smooth = true } = {}) {
  strip.scrollTo({ left, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
}

/** The day currently nearest the leading edge — what a rest settles onto. */
function leadingDay(strip) {
  const target = strip.scrollLeft + railPad(strip);
  let best = null;
  for (const b of strip.querySelectorAll('[data-iso]')) {
    const d = Math.abs(b.offsetLeft - target);
    if (!best || d < best.d) best = { d, button: b };
  }
  return best?.button ?? null;
}

/**
 * The selected day, brought into view by as little as possible — and on a
 * first paint, its whole week, because a reader arriving at a date should see
 * the week it sits in rather than that day pinned to the edge.
 */
function revealSelected({ week = false } = {}) {
  const strip = state.el?.querySelector('.week-strip');
  const button = dayAt(state.selected);
  if (!strip || !button) return;
  if (week) {
    const monday = dayAt(weekOf(state.selected)[0]) ?? button;
    scrollRail(strip, restFor(strip, monday), { smooth: false });
    return;
  }
  const pad = railPad(strip);
  const left = button.offsetLeft - strip.scrollLeft;
  const right = left + button.offsetWidth;
  if (left >= pad - 1 && right <= strip.clientWidth - pad + 1) return;
  // Off one end: bring it just inside that end, which is one column of travel
  // rather than a week of it.
  const rest =
    left < pad
      ? restFor(strip, button)
      : button.offsetLeft + button.offsetWidth - strip.clientWidth + pad;
  scrollRail(strip, Math.max(0, rest));
}

/**
 * Everything the rail needs to be a rail: choosing a day, a mouse drag, the
 * settle after one, and the re-anchoring that keeps it endless. Returns the
 * teardown.
 *
 * Touch and pen need none of it — the browser pans a scroll container and
 * `scroll-snap-type` lands it on a day, which is the whole of the gesture.
 * A mouse gets the same movement by hand, which is the reversal: §5b called a
 * mouse drag across a date grid a selection rather than a gesture, and the
 * author's instruction is that it is a gesture here. Text selection is not
 * lost — there is no prose in the rail, only numerals in buttons.
 */
function wireRail(strip) {
  let hold = null;
  let restTimer = null;
  let coast = null;

  /** The flick is read from the last ~80 ms of movement, not the whole drag:
   *  a long slow haul that ends with a snap of the wrist is a throw, and the
   *  average over the haul would say it was not. */
  const recordSample = (e) => {
    const now = e.timeStamp;
    hold.samples = hold.samples.filter((sample) => now - sample.t < 80);
    hold.samples.push({ t: now, x: e.clientX });
  };

  const stopCoast = () => {
    if (!coast) return;
    cancelAnimationFrame(coast.raf);
    coast = null;
    strip.classList.remove('is-coasting');
  };

  /**
   * The rail keeps the drag's momentum and spends it against friction —
   * scrollLeft integrated by hand each frame, snap suspended for the length
   * of it (the .is-coasting class) so the browser does not fight the coast —
   * and hands what is left to settle(), which is where the alignment and the
   * re-anchoring have lived since the rail was built. An edge stops it dead:
   * coasting into a wall and then sliding along it would be momentum the
   * reader never gave it.
   */
  const beginCoast = (velocity) => {
    stopCoast();
    strip.classList.add('is-coasting');
    coast = { v: velocity, last: performance.now(), raf: 0 };
    const step = (now) => {
      if (!coast) return;
      const dt = Math.min(now - coast.last, 64);
      coast.last = now;
      const before = strip.scrollLeft;
      strip.scrollLeft = before + coast.v * dt;
      coast.v *= Math.exp(-dt / FRICTION_TAU);
      const atWall = strip.scrollLeft === before && dt > 0;
      if (Math.abs(coast.v) < COAST_STOP || atWall) {
        stopCoast();
        settle();
        return;
      }
      coast.raf = requestAnimationFrame(step);
    };
    coast.raf = requestAnimationFrame(step);
  };

  const onClick = (e) => {
    const button = e.target.closest('[data-iso]');
    if (button && strip.contains(button)) select(button.dataset.iso);
  };

  const swallow = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /** Come to rest on a day, and re-anchor if the reader is near an end. */
  const settle = () => {
    const button = leadingDay(strip);
    if (!button) return;
    scrollRail(strip, restFor(strip, button));
    reanchor(button.dataset.iso);
  };

  /**
   * Rebuild around where the reader is, carrying the scroll offset across so
   * nothing moves. Both rails have identical geometry, so the same day at the
   * same offset is the same picture.
   */
  const reanchor = (iso) => {
    const buttons = [...strip.querySelectorAll('[data-iso]')];
    const at = buttons.findIndex((b) => b.dataset.iso === iso);
    if (at < 0 || (at >= RAIL_MARGIN && at < buttons.length - RAIL_MARGIN)) return;
    const offset = buttons[at].offsetLeft - strip.scrollLeft;
    buildRail(iso);
    const moved = dayAt(iso);
    if (moved) strip.scrollLeft = moved.offsetLeft - offset;
  };

  const onScroll = () => {
    // The coast writes scrollLeft every frame; its own end calls settle().
    if (hold || coast) return;
    clearTimeout(restTimer);
    restTimer = setTimeout(settle, SETTLED);
  };

  const down = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    // A hand on a coasting rail catches it, the way a hand on a spinning
    // globe does.
    stopCoast();
    hold = { x: e.clientX, from: strip.scrollLeft, id: e.pointerId, dragging: false, samples: [] };
    recordSample(e);
  };

  const move = (e) => {
    if (!hold || e.pointerId !== hold.id) return;
    recordSample(e);
    const dx = e.clientX - hold.x;
    if (!hold.dragging) {
      if (Math.abs(dx) < DRAG_SLOP) return;
      hold.dragging = true;
      // Snapping is suspended for the length of the hold: mandatory snap
      // fights a scrollLeft written every frame, and the rail stutters.
      strip.classList.add('is-dragging');
      try {
        strip.setPointerCapture(e.pointerId);
      } catch {
        // A synthetic pointer has nothing to capture; the drag still tracks.
      }
    }
    strip.scrollLeft = hold.from - dx;
    e.preventDefault();
  };

  const up = (e) => {
    if (!hold || e.pointerId !== hold.id) return;
    const dragged = hold.dragging;
    const samples = hold.samples;
    hold = null;
    if (!dragged) return;
    strip.classList.remove('is-dragging');
    // The click that ends a drag reaches a day only when setPointerCapture
    // failed (the catch above): with capture held, the browser retargets the
    // click to the strip and onClick finds no [data-iso] — verified by
    // probing, 2026-08-24. So this is the catch-path's companion, and no
    // browser test exercises it while capture works; it is kept because the
    // failure it prevents — a drag that also selects — is the one §5b's old
    // text warned about, and the cost is two lines.
    strip.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => strip.removeEventListener('click', swallow, { capture: true }), 0);
    // The release's velocity, from the sample window. The pointer moves one
    // way and the content the other, hence the sign. Reduced motion removes
    // the coast, never shortens it: a throw settles where it is.
    // Only samples still fresh at the release: the window is pruned when
    // moves arrive, so a fast drag held still and *then* released would
    // otherwise read the stale flick and throw a rail the hand had already
    // stopped. A still hold fires no moves; staleness is measured from the
    // release itself.
    const fresh = samples.filter((sample) => e.timeStamp - sample.t < 120);
    const first = fresh[0];
    const last = fresh[fresh.length - 1];
    const dt = last && first ? last.t - first.t : 0;
    const velocity = dt > 0 ? -(last.x - first.x) / dt : 0;
    if (Math.abs(velocity) >= MIN_FLICK && !reducedMotion()) beginCoast(velocity);
    else settle();
  };

  strip.addEventListener('click', onClick);
  strip.addEventListener('scroll', onScroll, { passive: true });
  strip.addEventListener('pointerdown', down);
  strip.addEventListener('pointermove', move);
  strip.addEventListener('pointerup', up);
  strip.addEventListener('pointercancel', up);

  return () => {
    stopCoast();
    clearTimeout(restTimer);
    strip.removeEventListener('click', onClick);
    strip.removeEventListener('scroll', onScroll);
    strip.removeEventListener('pointerdown', down);
    strip.removeEventListener('pointermove', move);
    strip.removeEventListener('pointerup', up);
    strip.removeEventListener('pointercancel', up);
    strip.removeEventListener('click', swallow, { capture: true });
  };
}

/**
 * A day either way from anywhere on the page (author, 2026-08-24): the arrow
 * keys, and A/S and D beside them for a hand that is not on the arrows — A
 * joined S the same day, because a hand resting on WASD expects A to be
 * "left". They were bound to the week strip alone until then, which meant
 * they worked only once a reader had tabbed into it.
 *
 * Not while the reader is typing. A key that steps the day out from under
 * someone halfway through a search term is worse than no shortcut, so
 * anything with a text cursor in it — input, textarea, contenteditable — and
 * anything a select is handling keeps its keys. A modifier means the key
 * belongs to the browser: ctrl+D is a bookmark and must stay one.
 */
function wireDayKeys() {
  const typing = (node) =>
    node instanceof HTMLElement &&
    (node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName));

  const onKey = (e) => {
    if (!state || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (typing(e.target) || typing(document.activeElement)) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const dir =
      key === 'ArrowLeft' || key === 'a' || key === 's' ? -1
      : key === 'ArrowRight' || key === 'd' ? 1
      : 0;
    if (!dir) return;
    e.preventDefault();
    step(dir);
  };

  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
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
  el.querySelector('.month-name').textContent = monthFmt().format(utc(first));

  // They say nothing a date's own label does not — the button below each of
  // them reads "Friday, 30 January 2026" in full.
  el.querySelector('.month-days').innerHTML = weekOf(first)
    .map((iso) => `<span class="month-day-name">${weekdayFmt().format(utc(iso))}</span>`)
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
      aria-label="${dayFmt().format(utc(iso))}">${day}<span class="density"
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
 * Two silences, and a reader is owed the difference between them (redrawn
 * 2026-08-22 for one church at a time). The corpus having nothing for a day is
 * a statement about our sourcing; this church's calendar having nothing while
 * another of the three does is a fact about the choice made above, and says
 * where the others are. Prose in ink in either case, never a banner.
 */
function emptyDayNote(iso) {
  const S = STRINGS.calendar.silence;
  const all = allEntriesFor(iso, state.data);
  const here = new Set(entriesInChurch(all, state.calendar).map((e) => e.slug));
  const elsewhere = new Set(all.map((e) => e.slug).filter((slug) => !here.has(slug))).size;
  const church = churchName(state.calendar);
  if (elsewhere > 0) {
    return elsewhere === 1 ? fill(S.otherChurchOne, { church }) : fill(S.otherChurchMany, { church, count: elsewhere });
  }
  return STRINGS.calendar.emptyDay;
}

function paintDay(panel) {
  const { data, selected } = state;
  const entries = entriesFor(selected, data);

  if (entries.length === 0) {
    panel.innerHTML = `<div class="empty-day"><p>${emptyDayNote(selected)}</p></div>${readingsMarkup(selected, state.calendar)}${hymnsMarkup(selected, state.calendar)}`;
    return;
  }

  const heroSlug = pickHero(selected, entries, data.bySlug, state.calendar);
  const hero = data.bySlug.get(heroSlug);

  // The image opens the saint too (author, 2026-08-21). Hidden from the
  // accessibility tree and out of the tab order on purpose: the name beside it
  // already links to the same page, and a second link with no text of its own
  // would be either an unnamed link or the same one announced twice.
  // The bookmark sits over the image's top-right corner, as it does on an
  // Index card (author, 2026-08-24). It is a sibling of the link rather than
  // inside it — a button within an anchor is not valid, and the press has to
  // save rather than open.
  const media = hero.image
    ? `<div class="hero-figure">
        <a class="hero-media" href="${state.router.href(`/saints/${hero.slug}`)}"
          data-prefetch="${hero.slug}" aria-hidden="true" tabindex="-1"
          style="background-image:url('${BASE + hero.image.lqip}')">
          <img src="${BASE + hero.image.src}" alt="" width="${hero.image.w}" height="${hero.image.h}"
            style="view-transition-name:s-${hero.slug}-image" loading="eager" decoding="async" />
        </a>
        ${renderBookmark(hero.slug, hero.display_name)}
      </div>`
    : '';

  // One calendar, one church: the register needs no church heading, and a
  // saint can appear in it only once. The shared element is the first row
  // that names them all the same, because the hero already carries its own.
  const registerEntries = entries.filter((e) => e.slug !== heroSlug);
  const named = new Set([heroSlug]);
  const rows = registerEntries
    .map((e) => {
      const saint = data.bySlug.get(e.slug);
      const title = titleFor(saint, e.church);
      const transition = named.has(saint.slug) ? '' : ` style="view-transition-name:s-${saint.slug}-name"`;
      named.add(saint.slug);
      return `<li>
        <a class="reg-name" href="${state.router.href(`/saints/${saint.slug}`)}"
          data-prefetch="${saint.slug}"${transition}>${esc(withHonorific(saint.display_name))}</a>
        ${title ? `<span class="reg-title">${esc(title)}</span>` : ''}
      </li>`;
    })
    .join('');
  const register = registerEntries.length
    ? `<h2 class="register-heading">${STRINGS.calendar.alsoToday}</h2><ul class="register">${rows}</ul>`
    : '';

  panel.innerHTML = `
    <article class="hero panel ${hero.image ? 'has-media' : ''}">
      ${media}
      <div class="hero-body">
        <div class="name-line">
          <h2 class="hero-name" style="view-transition-name:s-${hero.slug}-name">
            <a href="${state.router.href(`/saints/${hero.slug}`)}" data-prefetch="${hero.slug}">${esc(withHonorific(hero.display_name))}</a>
          </h2>
        </div>
        <p class="hero-dates utility">${esc(formatLifespan(hero.dates))}</p>
        ${hero.image ? '' : `<div class="hero-actions">${renderBookmark(hero.slug, hero.display_name)}</div>`}
      </div>
    </article>
    ${register}
    ${readingsMarkup(selected, state.calendar)}
    ${hymnsMarkup(selected, state.calendar)}`;
  fillSaintHymns(panel, hero.slug, selected);
}

const titleFor = (saint, churchId) =>
  saint.attestations.find((a) => a.church === churchId)?.titles?.join(', ') ?? '';
