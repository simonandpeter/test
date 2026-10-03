import { addDaysIso, dateIn, daysInMonthOf, isoOfDate, todayIso, weekOf } from '../../lib/calendar-page.js';
import { reckoningInForce } from '../../lib/church.js';
import { gradeForDay } from '../../lib/fast-grade.js';
import { toJdn } from '../../lib/jdn.js';
import { liturgicalDay } from '../../lib/liturgy.js';
import { onGrainDrag, SETTLE } from '../../ui/grain-drag.js';
import { fill, STRINGS } from '../../ui/strings.js';
import { countFor, dayRecordFor } from './entries.js';
import { monthLongFmt, reckonedHeading, utc, weekdayFmt } from './format.js';
import { reducedMotion, DUR } from '../../lib/motion.js';
import { state } from './state.js';

/**
 * **The calendar the picker counts its days in** (author, 2026-09-02).
 *
 * `reckoningInForce()` since 2026-09-05, the church's own default once
 * "Follow my church" is what is in force — not merely the reckoning the
 * reader has explicitly chosen, `calendarFor`'s own reason for existing
 * apart from the plain stored value (`lib/church.js`). Gregorian, whether a
 * reader's actual choice or a church's own default, is the identity here —
 * and so is the Revised Julian, the Gregorian's own arithmetic until 2800
 * (lib/jdn.js) — so every call below is unconditional rather than branching
 * on whether a shift is in force.
 */
const gridCalendar = () => reckoningInForce();

/** A day's own number in the calendar the picker is counting in. */
const dayNumeral = (iso) => dateIn(gridCalendar(), iso).day;

/**
 * A day's whole name for a screen reader, in the calendar the picker is
 * counting in — so the button a reader hears and the numeral they see are one
 * date rather than two thirteen days apart.
 */
const dayLabel = (iso) => reckonedHeading(iso, gridCalendar());

/** Matches --dur-month in tokens.css; the fade is long on purpose. */
const MONTH_FADE = DUR.travel;

/**
 * The date picker: one month grid, at every width.
 *
 * It was two grains - a week rail on a phone, the month on a desk, swapped by
 * a button - until 2026-10-03, when the author asked for one look at both ("I
 * want the same calendar look between mobile and desktop now"). The rail, the
 * toggle, the peeked columns the two shared and the blank cells before the
 * first of the month are all gone; what is left is the grid, filled to its own
 * corners, and the two steps that move it.
 *
 * **It calls `state.select` rather than importing `select`.** The page's
 * navigation funnel stays in views/calendar.js - it repaints the panel, the
 * liturgy line and the grid together - so an import here would run backwards
 * and make a cycle. The state object is already the view's context; the
 * function that changes the day belongs on it.
 */

/**
 * **The grid is a spinner** (author, 2026-10-03: "from Oct to Sep is an arrow
 * or swipe up above the Oct 2026 print, and conversely an arrow down
 * underneath it").
 *
 * The step *up* is the month *before*, so the month before arrives from below
 * and the strip rolls upward - which is what a number spinner's digits do, and
 * the only arrangement in which the arrow above the heading and a swipe up
 * mean the same thing and the grid still follows the finger. Every geometric
 * direction handed to the grain is therefore the negative of the month delta:
 * here in `moveMonth`, and in the sides, the settle and the flick
 * views/calendar.js gives `makeGrain`.
 */
export const SPIN = -1;

/**
 * Two facts about a day, and only two (author, 2026-08-26: dots "for fast and
 * feast days would let someone plan the week at a glance").
 *
 * This is *not* the return of the density dots the author removed on
 * 2026-08-25 - one dot per commemoration, capped at five, which said only
 * "this day is busy". These say something a reader plans around, and each is
 * a fact with a source behind it:
 *
 *   fast   lib/liturgy.js, reckoned in this church's own calendar, and worn by
 *          the numeral itself. A fast-free day gets none, which is what makes
 *          a run of them legible at a glance.
 *   feast  the day's own record carrying hymns for this church. That is the
 *          rank cross the calendar itself printed: the harvest ships hymns
 *          only for its top-rank days, so the mark is the source's judgement
 *          rather than ours. Days outside the recorded span carry none, and
 *          an absent mark is not a claim that the day is ordinary.
 *
 * Both are named in the cell's accessible label, because a diamond is nothing
 * to a screen reader and colour is nothing to a reader who cannot see it.
 */
/**
 * Which of the fast's three colours a day wears — `fast`, `fish`, or null for
 * a day that is not a fast — and **the one place that decision is made**.
 *
 * It answers off the *grade* rather than off liturgy.js's `kind`, which is
 * the correction of 2026-08-26 evening. The two disagreed on thirteen Russian
 * days of the 144 recorded: days.pravoslavie.ru printed «разрешается рыба»,
 * so `gradeForDay` read fish while `kind` stayed a plain `fast`, and the day
 * was painted in the rubric of a strict fast while its own chip read "Oil,
 * Wine and Fish Allowed". `kind` is still the liturgical fact and still what
 * `data-fast` carries; this is the fact about what the day *allows*, which is
 * what a colour on this site has always been marking.
 *
 * Three callers, and they must not drift apart: the rail's dot, the chip
 * under the date, and — since the author asked for it on 2026-08-26 evening
 * ("in monthly view, make the text colour of each day match the fasting dot
 * colour for that day") — the month's own numerals.
 */
const fastTone = (iso) => {
  const f = liturgicalDay(iso, state.calendar).fasting;
  if (f.kind !== 'fast' && f.kind !== 'fish') return null;
  const grade = gradeForDay(f, dayRecordFor(iso, state.calendar)?.fastingNote);
  return grade === 'fish' ? 'fish' : 'fast';
};

/**
 * A day either way from anywhere on the page (author, 2026-08-24): the arrow
 * keys, and A and D beside them for a hand that is not on the arrows. S went
 * back a day from 2026-08-24 until the author removed it the next day —
 * "it should only be the 'A' key" — which leaves the pair a hand on WASD
 * expects. They were bound to the week strip alone until Amendment 35, which
 * meant they worked only once a reader had tabbed into it.
 *
 * Not while the reader is typing. A key that steps the day out from under
 * someone halfway through a search term is worse than no shortcut, so
 * anything with a text cursor in it — input, textarea, contenteditable — and
 * anything a select is handling keeps its keys. A modifier means the key
 * belongs to the browser: ctrl+D is a bookmark and must stay one.
 */
export function wireDayKeys() {
  const typing = (node) =>
    node instanceof HTMLElement &&
    (node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName));

  const onKey = (e) => {
    if (!state || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (typing(e.target) || typing(document.activeElement)) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const dir =
      key === 'ArrowLeft' || key === 'a' ? -1
      : key === 'ArrowRight' || key === 'd' ? 1
      : 0;
    if (!dir) return;
    e.preventDefault();
    step(dir);
  };

  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

/**
 * The same day-either-way as the arrow keys, for a thumb instead of a hand on
 * the keyboard (2026-08-31): swipe the day panel left for tomorrow, right for
 * yesterday. `onGrainDrag` is the week and month's own gesture primitive —
 * touch and pen only, a horizontal drag told apart from a vertical scroll by
 * its own SLOP, so this reuses that rather than re-deciding "was this a
 * swipe" a third time.
 *
 * Unlike the week or month, there is no neighbour parked beside the panel to
 * drag into view — a day's content is a whole hero and register, not a cheap
 * cell, and pre-rendering yesterday's and tomorrow's on the chance of a swipe
 * would be real work paid on every visit for a gesture most visits never
 * make. So `move` follows the finger with a plain `transform` on the live
 * panel alone — direct manipulation, not an animation, the same standing
 * grain.js gives its own drag — and only past `SETTLE` does an actual day
 * change happen, at which point `select`'s own roll (`slotSwap`,
 * calendar.js) takes over and continues sliding from exactly where the
 * finger let go rather than snapping back to centre first.
 *
 * `end` still re-checks `SETTLE` even though `onGrainDrag` already gates on
 * it for a flick — a slow drag that wandered past the 8px slop but let go
 * after only a few pixels counts as `dragged` there and must spring back
 * rather than step a real day on a false start.
 */
export function wireDaySwipe(el) {
  let panel = null;
  const springBack = (from) => {
    if (reducedMotion()) {
      from.style.transition = '';
      from.style.transform = '';
      return;
    }
    from.style.transition = `transform var(--dur-settle) var(--ease)`;
    requestAnimationFrame(() => {
      from.style.transform = 'translateX(0)';
    });
    const clear = () => {
      from.style.transition = '';
      from.style.transform = '';
    };
    from.addEventListener('transitionend', clear, { once: true });
  };

  /*
   * The finger goes on the day's own panel, and since 2026-09-01 there are
   * two of them — one per column. The drag is still taken on the left, which
   * is the hero and the register and so is most of the day on a phone, but
   * *both* panels follow it: they roll together on release, and a swipe that
   * moved only one of them would tear the page in half for the length of the
   * gesture.
   */
  /*
   * **The whole page takes the swipe, not just the day panel** (author,
   * 2026-09-02: "make sure on mobile you can swipe on daily page across the
   * whole page except the weekly display, e.g. subheadings included").
   *
   * It was bound to the left panel — the hero and the register, which is most
   * of a phone's screen but not all of it: a finger starting on *Also
   * commemorated*, on the readings, on the name days, or on the empty ground
   * below a short day found nothing to take the gesture. Bound to the view, it
   * is the page that turns, which is what a page-turn should be.
   *
   * The picker keeps its own gestures: `.cal-controls` holds the week rail —
   * a horizontal scroller — and the month, which has a grain drag of its own,
   * and both would otherwise be driving two gestures from one finger. That is
   * the "except the weekly display" half, and it is stated as a box rather
   * than as a class list so the month goes with it.
   *
   * **`[data-shelves]` joined the exclusion 2026-09-04** (author: "probably
   * because of the swipe left right ... functionality ... the swipe to
   * remove on the continue reading section isnt working"). Continue-reading
   * rows carry their own horizontal drag (`wireSwipe`, `ui/shelf.js`), and
   * the shelf sits inside this same page-level `el` — a swipe starting on a
   * row was a day-turn's finger before it was ever the row's, the same
   * one-gesture-two-listeners problem `.cal-controls` already exists to
   * avoid. Excluded as the whole shelf container, not just `.shelf-row`, so
   * a reader's finger landing between rows still reaches the row gesture's
   * own SLOP rather than the day-turn's, and cannot start a day change from
   * inside the shelf at all.
   */
  return onGrainDrag(el, {
    ignore: (target) => !!target.closest?.('.cal-controls') || !!target.closest?.('[data-shelves]'),
    begin() {
      panel = [...el.querySelectorAll('.slot-viewport .day-panel')];
      for (const p of panel) p.style.transition = 'none';
    },
    move(dx) {
      for (const p of panel ?? []) p.style.transform = `translateX(${dx}px)`;
    },
    end(dx) {
      const dragged = panel;
      panel = null;
      if (Math.abs(dx) < SETTLE) {
        for (const p of dragged ?? []) springBack(p);
        return;
      }
      for (const p of dragged ?? []) p.style.transition = '';
      state.select(addDaysIso(state.selected, dx < 0 ? 1 : -1), dragged?.length ? dx : 0);
    },
  });
}

/* ---- the month --------------------------------------------------------- */

export const measure = (el) => el.getBoundingClientRect().height;

/**
 * The dates' own height, in pixels, for the length of a change to it — the
 * rows unfurling from the day-name line, folding back into it, or a five-row
 * month stepping to a six-row one. There is no transition from a number to
 * `auto`, so the end value is set explicitly and released once it has arrived;
 * the clip that makes the growth read as unfurling goes on and comes off with
 * it, so a date's focus ring is never cropped at rest.
 */
export function growMonthBody(body, from, to, { release = true } = {}) {
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
export function monthCursor() {
  if (!state.monthCursor) {
    // The month the selected day falls in *by the calendar being counted in*:
    // a Julian reader's 20 August and a civil 2 September are one day in two
    // different months, and the grid is the one the heading names.
    const d = dateIn(gridCalendar(), state.selected);
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
export function paintMonth() {
  const { el } = state;
  const cursor = monthCursor();
  const first = isoOfDate(gridCalendar(), { year: cursor.year, month: cursor.month, day: 1 });

  /*
   * **The whole name, at every width** (author, 2026-09-02: "display the full
   * month name"; carried to the phone 2026-10-03 with the rest of the desk's
   * reading). It was abbreviated below 1024 px while the name shared a gutter
   * with the grid and had 32 px of it; the head is its own stack now and the
   * name has the column to itself.
   */
  /*
   * `first` is a *civil* day, and the name printed is still the right one when
   * the grid is counting in another calendar: the first of a Julian month
   * falls thirteen days later on the civil one, and thirteen days after a
   * first is the fourteenth of the same civil month. Any offset under 28 days
   * keeps that true — the two calendars are 13 apart now and 14 from 2100 -
   * so the month's own name and year come out of `Intl` in the reader's
   * language rather than out of a table this file would have to keep.
   */
  el.querySelector('.month-name').textContent = monthLongFmt(utc(first));

  // They say nothing a date's own label does not — the button below each of
  // them reads "Friday, 30 January 2026" in full.
  el.querySelector('.month-days').innerHTML = weekOf(first)
    .map((iso) => `<span class="month-day-name">${weekdayFmt(utc(iso))}</span>`)
    .join('');

  paintMonthInto(el.querySelector('.month-row'), cursor, { live: true });
}

/**
 * A day the calendar itself marks as a feast: its own record, carrying hymns -
 * **and not a Sunday** (author, 2026-10-03). Every Sunday carries resurrection
 * hymns, so a mark drawn on hymns alone lands on all of them and stops telling
 * the reader anything about the day.
 */
const hasFeast = (iso) =>
  utc(iso).getUTCDay() !== 0 && Boolean(dayRecordFor(iso, state.calendar)?.hymns?.length);

/*
 * A 5 px diamond by `clip-path`, never a rotated square - `.month-feast`'s own
 * reasoning in calendar.css: a 5 px square turned 45 degrees measures 7.07 px
 * corner to corner and would push the row it sits in. The shape is drawn in
 * the stylesheet; this is only where it goes.
 */
const FEAST_MARK = '<i class="month-feast" aria-hidden="true"></i>';

/**
 * A day either side of the month: numbered, one step back in ink, and **out of
 * reach** - `aria-hidden`, a span rather than a button, so it is neither
 * focusable nor clickable.
 *
 * **It carries no fast tone and no feast mark, and that is not the plan's
 * first answer.** The cells were drawn "numbered and marked", tinted 38%
 * toward the field, on the reasoning that `aria-hidden` keeps the tint out of
 * axe's reach. **Measured, it does not**: axe 4.13's colour-contrast rule
 * matches on `isVisibleOnScreen`, not on whether a screen reader can see the
 * node, so the five tinted numerals raised 128 violations across four
 * `quality-floor` runs at 1.71-2.61:1 - and `npm run test:lighthouse` gates CI
 * on accessibility 100 besides, where a spec-level exclusion could not reach.
 *
 * So they take the treatment the peeked columns they replaced already had, for
 * the reason that was written beside those: text a sighted reader might try to
 * read has to clear 4.5:1 wherever it is legible at all. `--ink-soft` is
 * 5.92:1 on gesso and 5.53:1 on the field, and a numeral in it against a
 * neighbour in `--ink` is a step back a reader can see. What is given up is
 * the fast hue out there - which the peeked columns never carried either -
 * and it buys the distinction back: **a coloured numeral is this month's**.
 */
const outCell = (day) => `<span class="month-out" aria-hidden="true"><span class="day-num">${
  day
}</span></span>`;

/**
 * One month into one row: the grid, with the days either side of it filling
 * the grid's own corners - the end of the month before in front of the first,
 * the beginning of the month after behind the last, on the grid's own rows, so
 * they read as the grid continuing rather than as holes in it. They travel
 * with their grain, which is why the row holds all of them.
 *
 * **At every width since 2026-10-03** (author: "the days outside of the month
 * filling the gaps at half colour strength or opacity or whatever it currently
 * uses"). They were the desk's alone from 2026-09-10, where they bought the
 * column its width by replacing two peeked columns standing outside the seven;
 * a phone kept blank leads and the peeks. The peeks went with the rail and the
 * blanks with them, and `.month-out`'s own treatment - one step back in ink,
 * which is what "whatever it currently uses" is - came across unchanged.
 */
export function paintMonthInto(row, cursor, { live }) {
  const { selected } = state;
  const cal = gridCalendar();
  const lead = toJdn(cal, cursor.year, cursor.month, 1) % 7; // JDN 0 was a Monday

  const cells = [];
  const before = stepCursor(cursor, -1);
  const last = daysInMonthOf(cal, before);
  for (let i = lead; i > 0; i--) cells.push(outCell(last - i + 1));
  const days = daysInMonthOf(cal, cursor);
  for (let day = 1; day <= days; day++) {
    const iso = isoOfDate(cal, { year: cursor.year, month: cursor.month, day });
    const current = iso === selected ? ' aria-current="date"' : '';
    /*
     * The month's numerals take the fast's own colour (author, 2026-08-26
     * evening: "in monthly view, make the text colour of each day match the
     * fasting dot colour for that day"), from the same `fastTone` the chip
     * under the date reads, so the two cannot say different things about one
     * day.
     *
     * **And it is named, not only coloured.** A hue is nothing to a reader who
     * cannot separate these two, so the word goes into the button's accessible
     * name - STRUCTURE.md's "the words still say which".
     */
    const tone = fastTone(iso);
    const D = STRINGS.calendar.marks;
    const toneLabel = tone ? ` - ${tone === 'fish' ? D.fish : D.fast}` : '';
    /*
     * **The day's weight, in words, on the cell itself.** The density dots
     * that once stood under every date were removed on 2026-08-25 ("remove
     * the dots under each date in the calendar") and what survived them was
     * the *count*, in the day's accessible name: a reader who cannot glance at
     * the register has no other way to learn that a day carries twelve
     * commemorations and the one beside it one. It rode the week rail's
     * buttons until 2026-10-03 and rides the month's cells now, which is
     * fewer of them.
     */
    const n = countFor(iso, state.data);
    const density = n ? ` - ${fill(STRINGS.calendar.densityLabel, { count: n })}` : '';
    /*
     * **The feast mark** (2026-09-10), from the day's own record holding hymns
     * for this church. It is named in the button's accessible label beside the
     * fast, because a diamond is nothing to a screen reader; `--feast` is what
     * makes it legible to everyone else, at 3:1 rather than `--gold`'s 2.62
     * (tokens.css).
     */
    const feast = hasFeast(iso);
    const feastLabel = feast ? ` - ${D.feast}` : '';
    const classes = [iso === todayIso() ? 'is-today' : '', tone ? `fast-${tone}` : ''].filter(Boolean);
    const cls = classes.length ? ` class="${classes.join(' ')}"` : '';
    cells.push(`<button type="button" data-iso="${iso}"${current}${cls}
      aria-label="${dayLabel(iso)}${density}${toneLabel}${feastLabel}"><span class="day-num">${day}</span>${
      feast ? FEAST_MARK : ''
    }</button>`);
  }
  // Only the last row's remainder, so the month never grows a row it did not
  // have: a month ending on a Sunday adds nothing at all.
  const trail = (7 - ((lead + days) % 7)) % 7;
  for (let day = 1; day <= trail; day++) cells.push(outCell(day));
  row.querySelector('.month-grid').innerHTML = cells.join('');

  if (!live) return;
  for (const b of row.querySelectorAll('.month-grid [data-iso]')) {
    b.addEventListener('click', () => state.select(b.dataset.iso));
  }
}

/**
 * A month moves up or down and takes its height with it: a five-row month
 * arriving where a six-row one was would otherwise shunt the whole page up
 * between two frames. `travelled` is a drag, which has already made the trip
 * by hand.
 *
 * The direction handed to the grain is `SPIN`'s and not `n`'s: the month
 * before arrives from below.
 */
export function moveMonth(n, { travelled = false } = {}) {
  if (!state.monthCursor) return;
  const body = state.el.querySelector('.month-body');
  /*
   * **Land whatever is still growing before measuring what is leaving**
   * (author, 2026-08-26 evening: "Sometimes, when scrolling across months of
   * equal height … the content below still slides up and down … Remove this
   * slide up and down bug").
   *
   * `before` was read here while a previous grow still had a pixel height
   * pinned and its transition still running, so it came back an *interpolated*
   * value — and two five-row months, whose settled heights are identical to
   * the pixel, would then animate from that stale number to the real one and
   * shunt the page below. Reproduced by stepping at 250 ms: Aug→Jul→Jun→May
   * animated at every step, each one pinning the same 119.969px, where at
   * 700 ms only the Aug→Jul step (six rows to five) did.
   *
   * So the release moves above the measurement: the month leaving is measured
   * at its own settled height, and equal months compare equal and do not move.
   * The cost is that a step taken mid-grow snaps the last few pixels instead
   * of easing them, which is Amendment 9's rule — land what is in flight
   * before the next move starts — paying its usual small price.
   */
  clearTimeout(state.sizeTimer);
  state.sizeTimer = null;
  body.classList.remove('is-growing');
  body.style.height = '';
  const before = measure(body);
  state.monthCursor = stepCursor(state.monthCursor, n);
  paintMonth();
  const after = measure(body);
  if (!travelled) state.monthGrain.travel(SPIN * (n > 0 ? 1 : -1));
  if (after !== before) growMonthBody(body, before, after);
}

export const stepMonth = (n) => moveMonth(n);

export const stepCursor = (c, n) => ({
  year: c.year + Math.floor((c.month + n - 1) / 12),
  month: ((c.month + n - 1 + 12) % 12) + 1,
});

const step = (n) => state.select(addDaysIso(state.selected, n));