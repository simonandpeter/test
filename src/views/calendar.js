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

import { toIsoDate } from '../lib/feasts.js';
import { gregorianToJdn } from '../lib/jdn.js';

import { addDaysIso, parseIso, todayIso, weekOf } from '../lib/calendar-page.js';
import { observePrefetch } from '../lib/detail.js';
import * as store from '../lib/store.js';
import { currentChurch, subscribeChurch } from '../lib/church.js';
import { escapeHtml as esc } from '../lib/markdown.js';

import { onGrainDrag } from '../ui/grain-drag.js';
import { makeGrain } from '../ui/grain.js';
import { beginSwap, landSwap, restore, setAside } from '../ui/swap.js';
import { wireSaveButtons } from '../ui/save.js';
import { mountShelves } from '../ui/shelf.js';

import { greatFeast, liturgicalDay } from '../lib/liturgy.js';
import { formatDate, translateReason } from '../lib/i18n.js';
import { recordedDay } from '../data/days.js';
/* The page's own state, and the one file allowed to write it — see
   views/daily/state.js for why it is a singleton and why it moved. */
import { state, open as openState, close as closeState } from './daily/state.js';
import { reducedMotion } from './daily/motion.js';
import { buildRail, growMonthBody, markRail, measure, monthCursor, moveMonth, paintMonth, paintMonthInto, revealSelected, stepCursor, stepMonth, toggleMonth, wireDayKeys, wireDaySwipe, wireRail } from './daily/picker.js';
import { countFor } from './daily/entries.js';
import { headingFmt, monthFmt, utc, weekdayFmt } from './daily/format.js';
import { paintDay } from './daily/panel.js';
import { fullCalButton, wireFullCal } from './daily/fullcal.js';

import { gradeForDay, gradeFromNote } from '../lib/fast-grade.js';
import { cycleName } from '../ui/cycle-name.js';

import { STRINGS, fill } from '../ui/strings.js';

export const title = () => STRINGS.calendar.title;

const BASE = import.meta.env.BASE_URL;


/* One icon button stood beside this until 2026-08-26 — a crosshair that
   jumped the rail back to today (author: "remove the old button and stretch
   the monthly toggle to take up the extra space"). It is withdrawn now that
   today carries its own mark at both grains (below, "the two marks a date can
   carry"): a reader who has stepped away from today can see it rather than
   needing a button to return to it. What is left is stroked in currentColor
   and carries its name on the button's aria-label, so it introduces no colour
   and depends on nothing but the label to be understood. */
const ICON_MONTH = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
  stroke-width="1.6" aria-hidden="true" focusable="false">
  <rect x="3.25" y="5" width="17.5" height="15.75" rx="2.5"/>
  <path d="M3.25 9.75h17.5"/>
  <path d="M8 2.75v4M16 2.75v4" stroke-linecap="round"/>
</svg>`;



/**
 * Listeners that outlive a single paint — the shelves' store subscription, the
 * selection subscription, and whatever the current day panel wired up. The
 * router calls destroy() before the next view renders.
 */
export function destroy() {
  state?.cleanups.forEach((fn) => fn?.());
  clearTimeout(state?.sizeTimer);
  if (state) state.cleanups = [];
  closeState();
}


export function render(el, { data, params, router }) {
  destroy();
  const selected = params.date && parseIso(params.date) ? params.date : todayIso();
  // A deep link into a day that is not today arrives already scrolled away
  // from it, so the button has to be told on the way in as well as on a step.
  queueMicrotask(() => announceDay(selected));
  openState({
    el, data, router, selected,
    /* The picker calls this rather than importing it — views/daily/picker.js
       says why. It is the page's one funnel for changing the day. */
    select,
    calendar: currentChurch(),
    monthCursor: null, monthOpen: false,
    cleanups: [], dayCleanups: [],
    sizeTimer: null,
    monthGrain: null, railAnchor: null,
    /* Cards or list under *Also commemorated* (author, 2026-09-01), read from
       the reader's last answer. views/daily/panel.js writes it onto the list as
       a class, which is why nothing here has to repaint when it changes. */
    registerView: store.getSettings().registerLayout === 'list' ? 'list' : 'cards',
  });

  el.innerHTML = `
    <div class="cal">
      <div class="cal-controls">
          <div class="cal-jump">
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
            <!--
              Under the weekly display, in the author's own placement
              (2026-09-01). Inside the span rather than after it, and the span
              is a grid whose first row holds the week and the month stacked on
              one another — so a third child lands in a second row, under
              whichever of the two is showing, and moves down when the month
              unfurls. Outside the span it would be a third flex item of the
              controls row, and a full-width one there makes the row *wrap*:
              the week strip goes to its own line and the whole picker's
              geometry moves, which four of this page's tests caught at once.
            -->
            ${fullCalButton()}
          </div>
      </div>
      <!--
        **Two columns that are two boxes, not one box in two halves** (author,
        2026-09-01: only the right column moves when the month opens, the two
        scroll independently, and Continue reading belongs to the left).

        Each of those needs the columns to be separate subtrees: a single day
        panel spanning both could only ever move as one, scroll as one, and
        take the month's growth as one. So the day is painted into two panels,
        each in its own roll viewport, and slotSwap steps both together.

        The picker sits between them in the document rather than inside the
        right column, which is what lets the grid put it in the right column's
        first row while the left column spans both — the month then grows the
        row it is in and pushes only what is under it. On a phone the whole
        thing is one flex column and the order property puts the four back in
        reading order, which is why the wrappers dissolve there.
      -->
      <div class="cal-main" data-col="main">
        <!--
          **The date and the two steps beside it** (author, 2026-09-01: "add
          some &lt;Yesterday and Tomorrow&gt; Buttons to the right of today's date
          print in large font, right justified to the margin between left and
          right columns"). Desktop only — a phone already steps the day by
          swiping the panel and by the rail above it, and two more targets on a
          360 px line would crowd the date out of it.

          The wrapper exists so the gold rule under the date can still run the
          column's full measure: it used to hang off the heading itself, which
          is now only as wide as its own words. Everything the rule cared about
          — that there is a liturgy line under it and that the line is not
          empty — is asked of the wrapper instead, and the sibling it asks
          about is unchanged.
        -->
        <div class="cal-head">
          <h1 class="cal-date"></h1>
          <nav class="day-step" aria-label="${STRINGS.calendar.weekLabel}">
            <button type="button" data-dstep="-1" aria-label="${STRINGS.calendar.prevDay}">
              <span aria-hidden="true">‹</span>${STRINGS.calendar.yesterday}</button>
            <button type="button" data-dstep="1" aria-label="${STRINGS.calendar.nextDay}">
              ${STRINGS.calendar.tomorrow}<span aria-hidden="true">›</span></button>
          </nav>
        </div>
        <p class="cal-liturgy utility" data-liturgy></p>
        <div class="slot-viewport" data-slot="main"><div class="day-panel day-main"></div></div>
        <div class="shelves" data-shelves></div>
      </div>
      <div class="cal-side" data-col="side">
        <div class="slot-viewport" data-slot="side"><div class="day-panel day-side"></div></div>
      </div>
    </div>`;

  el.querySelector('[data-month]').addEventListener('click', toggleMonth);
  // Through `select`, like every other way of changing the day, so the two
  // panels roll and the rail follows rather than the page being repainted
  // underneath the reader.
  el.querySelectorAll('[data-dstep]').forEach((b) => {
    b.addEventListener('click', () => select(addDaysIso(state.selected, Number(b.dataset.dstep))));
  });

  /*
   * Cards or list under *Also commemorated* (author, 2026-09-01).
   *
   * **Delegated on the view, not bound to the buttons**, because the buttons
   * are inside the day panel and the panel is rebuilt every time the reader
   * steps a day — a listener on the button itself would be alive for exactly
   * one day and then silently gone. This one outlives every repaint, and the
   * only thing it touches is a class and a pair of aria-pressed attributes:
   * both faces are the same markup (views/daily/panel.js says why), so there is
   * nothing to re-render.
   */
  const onRegisterView = (e) => {
    const button = e.target.closest?.('[data-reg-view]');
    if (!button || !el.contains(button)) return;
    const next = button.dataset.regView;
    if (next === state.registerView) return;
    state.registerView = next;
    store.setSetting('registerLayout', next);
    paintRegisterView();
  };
  el.addEventListener('click', onRegisterView);
  state.cleanups.push(() => el.removeEventListener('click', onRegisterView));
  el.querySelector('[data-mstep="-1"]').addEventListener('click', () => stepMonth(-1));
  el.querySelector('[data-mstep="1"]').addEventListener('click', () => stepMonth(1));

  // The header's control can change the church while this page is open: the
  // question goes once it has been answered, and everything that counts
  // entries repaints in the new calendar.
  state.cleanups.push(
    subscribeChurch(() => {
      if (!state) return;
      paintGate();
      // Every date's own count is the chosen church's — it is read into the
      // day button's accessible name — so the rail is rebuilt, not just
      // re-marked, carrying its anchor and then re-revealing the selected day
      // so the reader's place holds. (It drew dots under each date until the
      // author removed them, 2026-08-25 evening; the count survives them.)
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
    () => el.querySelectorAll('.slot-viewport').forEach((v) => landSwap(v)),
    () => landSwap(el.querySelector('.cal-span')),
    onGrainDrag(el.querySelector('.cal-month'), state.monthGrain.handlers),
    wireRail(el.querySelector('.week-strip')),
    wireDayKeys(),
    wireDaySwipe(el),
    wireFastBubble(el),
    wireFullCal(el),
  );

  paintGate();
  buildRail(selected);
  paintChrome();
  // The whole week the day sits in, not the day pinned to an edge: a reader
  // arriving by deep link gets the same first picture the old strip gave.
  revealSelected({ week: true });
  paintDay(panelsIn(el));
  wireDay(panelsIn(el));
  state.cleanups.push(mountShelves(el.querySelector('[data-shelves]'), { data, router }));
}

/**
 * Per-paint wiring for the day panel. The panel is replaced wholesale on every
 * day change, so its listeners are torn down and remade rather than delegated:
 * the Save button has to re-read the store for the new day's hero anyway.
 */
function wireDay({ main, side }) {
  state.dayCleanups.forEach((fn) => fn?.());
  // Both halves, because either can carry a saint: the Save button and the
  // hero live in the left, the register's own prefetch links in the left and
  // the name days in the right.
  state.dayCleanups = [wireSaveButtons(main), observePrefetch(main), observePrefetch(side)];
}

/** The day's two panels, which are painted and rolled as a pair. */
const panelsIn = (el) => ({
  main: el.querySelector('[data-slot="main"] .day-panel'),
  side: el.querySelector('[data-slot="side"] .day-panel'),
});


/**
 * The Daily page says which day it is on, so the header's own Daily button can
 * become Today while the reader is looking at another day (author,
 * 2026-08-26 evening). An event rather than an import: main.js owns the nav
 * and this view owns the day, and neither should have to hold the other.
 *
 * Every change of day goes through `select`, which is also where the URL is
 * written — so this is the one place that needs to say so.
 */
const announceDay = (iso) =>
  document.dispatchEvent(new CustomEvent('gos:day', { detail: { iso, today: iso === todayIso() } }));

/**
 * `swipeDx`, present only when a touch swipe triggered this change
 * (`wireDaySwipe`, picker.js), is the live drag's last offset in px — 0 for
 * a flick, which never had one. Its only job is telling `slotSwap` which
 * roll to run; everything else about a swiped day and a clicked or
 * keyboard-stepped one is identical.
 */
/**
 * Puts the reader's answer onto whichever register lists are in the document.
 *
 * Both panels are asked, not just the visible one: a day change rolls a new
 * panel in beside the old one, and a list built during the roll would otherwise
 * arrive in the other face and change under the reader as the roll landed.
 * `paintDay` writes the same class on a cold paint; this is the live change.
 */
function paintRegisterView() {
  const view = state.registerView === 'list' ? 'list' : 'cards';
  for (const list of state.el.querySelectorAll('[data-register]')) {
    list.classList.toggle('is-cards', view === 'cards');
    list.classList.toggle('is-list', view === 'list');
  }
  for (const button of state.el.querySelectorAll('[data-reg-view]')) {
    button.setAttribute('aria-pressed', String(button.dataset.regView === view));
  }
}

function select(iso, swipeDx) {
  if (iso === state.selected) return;
  const forward = iso > state.selected;
  state.selected = iso;
  state.monthCursor = null;
  history.replaceState(null, '', state.router.href(iso === todayIso() ? '/' : `/calendar/${iso}`));
  announceDay(iso);
  paintChrome();
  // The rail does not travel — it is scrolled, and only as far as it has to be
  // (author, 2026-08-24). A day picked inside the days already showing moves
  // nothing at all; a day stepped off the end brings itself into view by one
  // column, not by a week, because the rail has no weeks in it to step by.
  revealSelected();
  slotSwap(forward, swipeDx);
}

/* ---- the day roll ------------------------------------------------------- */

/**
 * The day panel rolls in the direction of travel; chrome stays put. Landing
 * whatever roll is still in flight comes first (Amendment 9, via swap.js):
 * without it a second click inside the roll found the *leaving* panel and
 * appended beside the entering one, and the orphan outlived every navigation
 * after it.
 *
 * **The roll is vertical by default and sideways for a swipe** (2026-08-31):
 * `swipeDx` undefined picks the original fade (`slot-out`/`slot-in`,
 * translateY); a number — including 0, a flick — picks `.swipe`'s sideways
 * pair instead, and is written into `--drag-x` so the leaving panel
 * continues from wherever the live drag actually left it (`wireDaySwipe`
 * already moved it there by direct `transform`) rather than restarting from
 * centre. A swipe already told the reader which way the day moved; the
 * picture answers on the same axis instead of a different one.
 */
function slotSwap(forward, swipeDx) {
  /*
   * **Two viewports, stepped together** (2026-09-01). The day is painted into
   * a panel per column so that the columns can scroll and grow independently,
   * and the roll follows: each side gets its own leaving and entering panel,
   * both animate on the same classes and the same 300 ms, and the day is
   * painted once into the pair rather than twice into one.
   */
  const sides = ['main', 'side'].map((which) => {
    const viewport = state.el.querySelector(`[data-slot="${which}"]`);
    landSwap(viewport);
    const old = viewport.querySelector('.day-panel');
    const next = document.createElement('div');
    next.className = `day-panel day-${which}`;
    return { which, viewport, old, next };
  });
  paintDay({ main: sides[0].next, side: sides[1].next });

  // Both panels are in the document at once during the roll, and a
  // view-transition-name may appear only once: a reader clicking through to a
  // saint mid-roll would otherwise hit a duplicate and lose the transition.
  for (const { old } of sides) {
    for (const named of old.querySelectorAll('[style*="view-transition-name"]')) {
      named.style.viewTransitionName = 'none';
    }
  }

  if (reducedMotion()) {
    for (const { old, next } of sides) {
      old.style.transform = '';
      old.replaceWith(next);
    }
    wireDay({ main: sides[0].next, side: sides[1].next });
    return;
  }
  for (const { viewport, old, next } of sides) {
    viewport.classList.toggle('backward', !forward);
    viewport.classList.toggle('swipe', swipeDx !== undefined);
    if (swipeDx !== undefined) old.style.setProperty('--drag-x', `${swipeDx}px`);
    old.classList.add('slot-leaving');
    setAside(old);
    next.classList.add('slot-entering');
    viewport.appendChild(next);
  }
  wireDay({ main: sides[0].next, side: sides[1].next });
  for (const { viewport, old, next } of sides) {
    beginSwap(viewport, () => {
      old.remove();
      next.classList.remove('slot-entering');
      viewport.classList.remove('swipe');
    }).settle(300);
  }
}

/**
 * The day's content changed under it — the calendar or the selection, not the
 * date — so the panel repaints in place. The movement decides, not the gesture
 * (DESIGN.md §5b): a filter press has not travelled anywhere, and rolling it
 * read as a step forward in time that never happened.
 */
function repaintDay() {
  state.el.querySelectorAll('.slot-viewport').forEach((v) => landSwap(v));
  const panels = panelsIn(state.el);
  paintDay(panels);
  wireDay(panels);
}

function paintChrome() {
  const { el, selected } = state;
  markRail();
  el.querySelector('.cal-date').textContent = headingFmt(utc(selected));
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
  /*
   * Any open bubble belongs to the button this repaint is about to replace,
   * and it is about *this* day's fast — so it goes with the line. Found by
   * its own test: a scroll that settled the rail repainted the line under an
   * open bubble, and the next press on the control opened a second one
   * instead of closing the first, because the bubble's owner was a node no
   * longer on the page.
   */
  closeFastBubble();
  if (!calendar) { box.innerHTML = ''; return; }
  const L = STRINGS.calendar.liturgy;
  const day = liturgicalDay(selected, calendar);
  const f = day.fasting;
  // The reason is an English string from the data or from lib/liturgy.js;
  // the locale packs translate the recurring ones and pass the rest through
  // (Amendment 36). The cycle line was the other half of that seam and is
  // closed as of 2026-08-26; the fast reasons are what remains of it.
  const reason = f.reason ? translateReason(f.reason) : f.reason;
  /*
   * Which fast, and — where the church's own calendar printed one — which
   * grade of it (author, 2026-08-25 evening: "the fasting text should say
   * which type of fast is required"). The grade is read off that printed
   * note, never computed: lib/fast-grade.js argues the boundary and
   * lib/liturgy.js still refuses to rule. A fast-free day takes no grade,
   * because there is no allowance to name.
   */
  const M = STRINGS.calendar.fastModal;
  const isFast = f.kind === 'fast' || f.kind === 'fish';
  const grade = isFast ? gradeForDay(f, recordedDay(selected, calendar)?.fastingNote) : null;
  const gradeName = grade ? M.grades[grade] : null;
  /*
   * **The chip is the type and nothing else** (author, 2026-08-26 evening:
   * "Don't mention the event for fasting in the fasting label, e.g. the
   * Beheading of the Forerunner, or Dormition"). It said "{grade} - {reason}"
   * for one build; the occasion has a chip of its own now, just below, so the
   * fast answers one question — what may I eat — in as few words as it can.
   *
   * Every fast day has a grade since earlier the same evening, so `gradeName`
   * is set whenever `isFast` is, and a day that is not a fast says so.
   */
  const fastText = gradeName ?? L.free;
  // The fast is a control (author, 2026-08-25): it opens a bubble saying what
  // this day allows and nothing else. A button rather than a span, so it is
  // reachable by keyboard and announced as something that does a thing.
  //
  // **A chip since 2026-08-26** (author: "Fasting is the number-one daily
  // question and it's currently the quietest element … Make it a chip at the
  // top of the day — coloured with your fast-strict/fish/free tokens — and
  // print the allowance inline on fast days"). The change is one of weight,
  // not of claim: the same words, the same three colours, the same grade read
  // off the same printed note. What moves is that the fast now leads the line
  // instead of trailing two facts nobody came for, and that the allowance is
  // printed rather than kept behind the (i).
  /*
   * The chip's colour follows the **grade**, not the kind (author, 2026-08-26
   * evening: "I dont see any blue labels in the Romanian calendar as i do in
   * the Russian calendar"). The two disagreed on thirteen Russian days of the
   * 144 recorded: days.pravoslavie.ru printed «разрешается рыба», so the words
   * read "Oil, Wine and Fish Allowed" while `kind` stayed `fast` and painted
   * them in the rubric of a strict day. A chip whose colour contradicts its
   * own text is worse than an uncoloured one. `data-fast` still carries the
   * liturgical kind, which is a different fact and is what the older tests
   * mean by it.
   */
  const tone = isFast ? (grade === 'fish' ? 'fish' : 'fast') : 'fast-free';
  const fastHtml =
    `<button type="button" class="fast fast-chip fast-${esc(tone)}" data-fast="${esc(f.kind)}" data-fast-open ` +
    `data-grade="${esc(grade ?? '')}" aria-expanded="false" ` +
    `aria-haspopup="dialog" title="${esc(M.hint)}">${esc(fastText)}` +
    `<span class="fast-info" aria-hidden="true">i</span>` +
    `<span class="sr-only"> - ${esc(M.open)}</span></button>`;
  /*
   * The allowance was printed inline beside the chip from 2026-08-26 morning
   * — "Make a chip at the top of the day … and print the allowance inline on
   * fast days" — and is **withdrawn the same evening** (author: "Remove the
   * explanation of the fasting under the bubble tag"). It is not lost: the
   * chip is a control and the bubble it opens is that sentence's home, which
   * is where it lived before the morning and is what the (i) has always
   * promised. What the line keeps is the answer; what the bubble keeps is the
   * explanation.
   */
  /*
   * The occasion the fast belongs to, in a chip of its own (author, same
   * evening: "Mention The Beheading of the Forerunner in a second separate
   * bubble tag like the feast tag but different colour"). The reason string is
   * lib/liturgy.js's and the packs translate the recurring ones through their
   * `reasons` map, exactly as it did when it trailed the fast's own label.
   *
   * The weekday is the one reason that never earns a chip: on an ordinary
   * Wednesday the reason *is* the weekday, printed in full in the heading
   * above, and `reasonKind` marks it so this does not have to match strings.
   *
   * **Rubric, and rubric is the right claim rather than a spare colour.**
   * DESIGN.md §2 gives it to liturgical time and the reader's place, and
   * "the Dormition Fast", "Great Lent", "the Beheading of the Forerunner" are
   * liturgical time exactly. Gold would have said this was a finding about
   * veneration, which is the feast chip's business beside it. The words are
   * ink either way: dark-mode rubric is 4.20:1 and under AA, a defect this
   * chip must not spread.
   */
  const namedFeast = Boolean(day.feast && STRINGS.calendar.feasts.names[day.feast]);
  const occasionSaidBetter = f.reasonKind === 'weekday' || (f.reasonKind === 'greatFeast' && namedFeast);
  const occasionHtml =
    reason && !occasionSaidBetter
      ? `<span class="occasion-chip" data-occasion>${esc(reason)}</span>`
      : '';
  /*
   * And whether the day is a Great Feast, named (author, 2026-08-26: "Add a
   * label if its a Feast Day as well with the name of the Feast").
   * lib/liturgy.js answers it from the same table its own fish rule reads, in
   * the church's own calendar; the words come from the reader's pack.
   *
   * A span, not a button: unlike the fast it opens nothing, because there is
   * nothing further the site can say about the feast that the day's own hymns
   * and register below do not already say better.
   *
   * It is gold, and gold is spent here for the reason Amendment 46 spent it
   * on the rail's feast marker — a feast is a finding about the day, not a
   * control. Gold carries the *edge and the tint*, never the words: --gold on
   * gesso is 2.78:1, well under AA, which is the same trap the peek fade and
   * the cycle line's opacity both fell into. The text is ink at 13.1:1.
   *
   * Worth knowing, because the two marks are sourced differently: the gold
   * dot on the week rail means "this day's record carries hymns for this
   * church", which is a looser and broader finding than this chip's "the day
   * is one of the Twelve". A day can wear the dot and no chip, and neither is
   * a defect in the other.
   */
  const F = STRINGS.calendar.feasts;
  const feastName = day.feast ? F.names[day.feast] : null;
  const feastHtml = feastName
    ? `<span class="feast-chip" data-feast="${esc(day.feast)}">${esc(fill(F.line, { label: F.label, name: feastName }))}</span>`
    : '';
  // The cycle line follows the language too (author, 2026-08-26): lib/liturgy.js
  // hands out which day of the cycle it is, ui/cycle-name.js gives it words.
  const plain = [cycleName(day.cycle, selected), day.tone ? fill(L.tone, { tone: day.tone }) : null]
    .filter(Boolean)
    .map(esc);
  // Newline-separated so the three read as three when the line is taken as
  // text — a screen reader, a browser test — rather than running the chip's
  // last word into the allowance's first. The flex row collapses it to a gap.
  box.innerHTML = [fastHtml, occasionHtml, feastHtml, plain.length ? `<span class="cal-cycle">${plain.join(' · ')}</span>` : '']
    .filter(Boolean)
    .join('\n');
}


/* A note saying the hymns keep the church's own tongue stood under the Hymns
   heading from Amendment 37 (2026-08-24) until the author removed it the next
   morning. The decision it announced is unchanged — every hymn is the cited
   source's own text and no translation is recorded — it is simply no longer
   said on the page. The HYMN_LANG map the note read went with it: each hymn
   already carries its own `lang` from the data, which is where the attribute
   on the printed text comes from. */


/**
 * One delegated listener for the fast control, on the view root: the liturgy
 * line is repainted on every day change, so a listener bound to the button
 * itself would have to be remade each time and would leak the one before it.
 * A second press on the same control closes what the first opened.
 */
function wireFastBubble(root) {
  const onClick = (e) => {
    const button = e.target.closest('[data-fast-open]');
    if (!button || !root.contains(button)) return;
    if (bubble?.owner === button) closeFastBubble();
    else openFastBubble(button);
  };
  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('click', onClick);
    closeFastBubble();
  };
}

/* The one bubble that can be open, and everything it has to undo. */
let bubble = null;

/**
 * What this day allows, when the reader asks (author, 2026-08-25 evening: "the
 * fasting pop-up should be a bubble, the background doesn't go white as it
 * currently does, it's just a bobble that smoothly pops into view and out of
 * view when scrolling or clicking elsewhere").
 *
 * It was a `<dialog>` opened with `showModal()` for one day, which is why the
 * page went white behind it: a modal dialog paints a backdrop and takes the
 * whole screen's attention for what is a footnote to one word. A bubble is
 * the honest shape — it points at the word it explains, the page stays lit
 * and readable behind it, and any of the ordinary ways of moving on close it.
 *
 * What it says is argued in ui/strings.js: this day's own allowance and
 * nothing else, in the reader's language, with the calendar's own note quoted
 * under it where one was printed. Not a glossary of the other three grades.
 */
function openFastBubble(button) {
  closeFastBubble();
  const M = STRINGS.calendar.fastModal;
  const rec = recordedDay(state.selected, state.calendar);
  const note = rec?.fastingNote;
  const grade = button.dataset.grade || null;
  const kind = button.dataset.fast;
  /*
   * Whether the grade was read *out of* this note, which since the evening of
   * 2026-08-26 is a different question from whether there is a grade at all:
   * an ungraded fast day now defaults to Strict Fasting, and a note reading
   * only «Post» or «Νηστεία» would otherwise start being quoted under a label
   * it adds nothing to — the exact thing DESIGN.md §5b had this condition
   * stop doing.
   */
  const gradeIsQuoted = Boolean(gradeFromNote(note));
  const allows = grade ? M.allows[grade] : kind === 'fast-free' ? M.free : M.allows.strict;
  const src = rec?.source?.url
    ? `<a href="${esc(rec.source.url)}" rel="noopener noreferrer">${esc(rec.source.text)}</a>`
    : esc(rec?.source?.text ?? '');

  const el = document.createElement('div');
  el.className = 'fast-bubble';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', M.open);
  el.tabIndex = -1;
  /*
   * The quotation earns its place by saying something the line above does not
   * (author, 2026-08-26: on the Beheading, "remove the italic 'Post' above
   * the hyperlink from doxologia.ro, just keep the hyperlink"). A note that
   * reads only «Post», «Νηστεία» or «Пост (означен у календару)» says "this
   * is a fast" to a reader who has just been told that in their own language,
   * in larger type. So the note is printed when a grade was read *out of it*
   * — which is exactly when it carries more than the label — and the citation
   * stands either way, because the day's record came from that page whether
   * or not its words are worth repeating.
   *
   * **What the citation says changes with it** (2026-08-27). "As printed by
   * saint.gr" is a label on a quotation, and on a day with no quotation it was
   * putting our reading in their mouth: saint.gr printed «Νηστεία», and the
   * word *Strict* above it is this site's default for an ungraded fast, not
   * theirs. So the un-quoted case cites the page as the source of the day's
   * record, which is what it is.
   */
  el.innerHTML =
    `<p class="fast-allows">${esc(allows)}</p>` +
    (note && gradeIsQuoted
      ? `<p class="fast-note" lang="${esc(languageOfNote(state.calendar))}">${esc(note)}</p>`
      : '') +
    (note && src
      ? `<p class="fast-source utility">${fill(gradeIsQuoted ? M.sourceNote : M.sourceDay, { source: src })}</p>`
      : '');
  document.body.appendChild(el);

  place(el, button);
  button.setAttribute('aria-expanded', 'true');

  /*
   * Anything that moves the reader on closes it: a press outside, Escape, a
   * scroll, a resize. The scroll listener is captured, so a scroll inside any
   * pane counts, and all four are passive — none of them prevents the thing
   * the reader was actually doing.
   */
  const away = (e) => {
    if (!el.contains(e.target) && !button.contains(e.target)) closeFastBubble();
  };
  const key = (e) => {
    if (e.key === 'Escape') {
      closeFastBubble();
      button.focus();
    }
  };
  /*
   * A scroll that has actually moved something, not merely a scroll *event*.
   * The page can be mid-settle when the bubble opens — a control brought into
   * view by the browser, a smooth scroll finishing — and a queued event from
   * a scroll that has already ended would shut the bubble in the same frame
   * it appeared. Found by the dismissal test, which pressed the control right
   * after a wheel and got nothing.
   */
  /*
   * **Whatever scrolled, not the window** (2026-09-01). The Daily page's two
   * columns carry their own scrolling now and the page itself is fixed to the
   * glass, so a bubble watching `scrollY` alone stayed open through any
   * amount of reading. Taken in the capture phase from `document`, which is
   * where a scroll event on an element can be heard — they do not bubble.
   */
  const at = { x: scrollX, y: scrollY, top: 0 };
  const gone = (e) => {
    const target = e?.target;
    const inner = target && target !== document && target !== document.documentElement ? target.scrollTop : null;
    if (inner !== null) {
      if (Math.abs(inner - at.top) > 4) closeFastBubble();
      at.top = inner;
      return;
    }
    if (Math.abs(scrollY - at.y) > 4 || Math.abs(scrollX - at.x) > 4) closeFastBubble();
  };
  document.addEventListener('pointerdown', away, true);
  document.addEventListener('keydown', key);
  document.addEventListener('scroll', gone, { capture: true, passive: true });
  const onResize = () => closeFastBubble();
  window.addEventListener('resize', onResize, { passive: true });

  bubble = {
    el,
    owner: button,
    teardown: () => {
      document.removeEventListener('pointerdown', away, true);
      document.removeEventListener('keydown', key);
      document.removeEventListener('scroll', gone, { capture: true });
      window.removeEventListener('resize', onResize);
    },
  };

  // The pop: one frame at rest, then the class that runs the transition. Under
  // reduced motion the class is on from the first paint and the CSS gives it
  // no transition to run — the movement is *removed*, not shortened (DESIGN.md
  // §6). Focus follows so Escape and a screen reader both land on it.
  if (reducedMotion()) el.classList.add('is-in');
  else requestAnimationFrame(() => el.classList.add('is-in'));
  el.focus({ preventScroll: true });
}

/** Under the control, pointing at it, and never off the side of the page. */
function place(el, button) {
  const b = button.getBoundingClientRect();
  const width = el.getBoundingClientRect().width;
  const inset = 12;
  const wanted = b.left + b.width / 2 - width / 2;
  const left = Math.max(inset, Math.min(wanted, document.documentElement.clientWidth - width - inset));
  el.style.left = `${Math.round(left + scrollX)}px`;
  el.style.top = `${Math.round(b.bottom + scrollY + 8)}px`;
  // Where the arrow — and the transform the bubble grows from — sit: over the
  // control, wherever the clamp above had to put the box.
  el.style.setProperty('--arrow-x', `${Math.round(b.left + b.width / 2 - left)}px`);
}

function closeFastBubble() {
  if (!bubble) return;
  const { el, owner, teardown } = bubble;
  bubble = null;
  teardown();
  owner.setAttribute('aria-expanded', 'false');
  if (reducedMotion()) {
    el.remove();
    return;
  }
  el.classList.remove('is-in');
  // transitionend is the truth; the timer is the guarantee that a bubble
  // whose transition never fires — an interrupted paint, a hidden tab — is
  // still taken off the page rather than left invisible over the day.
  const off = () => el.remove();
  el.addEventListener('transitionend', off, { once: true });
  setTimeout(off, 400);
}

/* The tongue the church's own calendar prints its fasting note in — the note
   is quoted, not translated, so it is tagged for a screen reader. */
const languageOfNote = (churchId) =>
  ({ russian: 'ru', greek: 'el', romanian: 'ro', serbian: 'sr' })[churchId] ?? 'en';


/* The dots that stood under every date at both grains — one per
   commemoration, capped at five — were removed by the author on 2026-08-25
   ("remove the dots under each date in the calendar"). The count they drew is
   still read, once, into the day button's accessible name below: `countFor`
   is the same call, and a reader who cannot glance at the register still
   learns a day's weight before opening it. */


/* ---- the calendar the page reads --------------------------------------- */

/**
 * From 2026-08-21 to 2026-08-26 this file held a *gate*: a panel above the
 * strip asking which church the reader kept, with the week, the date and the
 * day hidden until it was answered, and from 2026-08-25 evening a second block
 * beside it offering the language. Both are gone at the author's instruction —
 * "Replace the language and calendar pop-ups on first opening with a fade-in
 * glowing tool tip with an arrow pointing to each of the two buttons" — and
 * what replaces them is `ui/coachmark.js`, mounted once at boot against the two
 * header controls.
 *
 * The gate's argument was that a calendar with no church chosen is the site
 * choosing one silently. That is answered rather than abandoned: the guess is
 * `defaultChurch()` in lib/church.js, made from the reader's own browser
 * language and never written to settings, the header names the church on every
 * page, and a mark under that control says so on a first visit. `hasChosen()`
 * is untouched and still means "the reader has answered", which is what the
 * coachmarks, the Index's set-aside count and next visit's marks all read.
 *
 * What is left here is the one line that used to be a paint: the view reads
 * the church, and the body is always shown.
 */
function paintGate() {
  state.calendar = currentChurch();
}

/* ---- the day panel: hero + register ----------------------------------- */


