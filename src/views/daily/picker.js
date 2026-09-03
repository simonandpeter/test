import { addDaysIso, dateIn, daysInMonthOf, isoOfDate, parseIso, todayIso, weekOf } from '../../lib/calendar-page.js';
import { storedReckoning } from '../../lib/church.js';
import { gradeForDay } from '../../lib/fast-grade.js';
import { toJdn } from '../../lib/jdn.js';
import { liturgicalDay } from '../../lib/liturgy.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { onGrainDrag, SETTLE } from '../../ui/grain-drag.js';
import { fill, STRINGS } from '../../ui/strings.js';
import { beginSwap, landSwap, restore, setAside } from '../../ui/swap.js';
import { countFor, dayRecordFor } from './entries.js';
import { dayFmt, monthFmt, monthLongFmt, reckonedHeading, utc, weekdayFmt } from './format.js';
import { reducedMotion } from './motion.js';
import { state } from './state.js';

/**
 * **The calendar the picker counts its days in** (author, 2026-09-02).
 *
 * Gregorian until the reader chooses a reckoning, and the Revised Julian is
 * the Gregorian's own arithmetic until 2800 (lib/jdn.js) — so this is the
 * identity for every reader who has not asked and for one of the two who
 * have, and every call below can be unconditional rather than branching on
 * whether a shift is in force.
 *
 * It is the *chosen* reckoning rather than `calendarFor`: a reader who has
 * not touched the control is reading the civil calendar the URL is in, which
 * is what DESIGN.md's grid rule says and what every day of this page said
 * before the control existed.
 */
const gridCalendar = () => storedReckoning() ?? 'gregorian';

/** A day's own number in the calendar the picker is counting in. */
const dayNumeral = (iso) => dateIn(gridCalendar(), iso).day;

/**
 * A day's whole name for a screen reader, in the calendar the picker is
 * counting in — so the button a reader hears and the numeral they see are one
 * date rather than two thirteen days apart.
 */
const dayLabel = (iso) => {
  const chosen = storedReckoning();
  return chosen ? reckonedHeading(iso, chosen) : dayFmt(utc(iso));
};

/** Matches --dur-month in tokens.css; the fade is long on purpose. */
const MONTH_FADE = 420;

/**
 * The date picker, at both of its grains.
 *
 * The rail and the month are one module because they are one control:
 * DESIGN.md says the month is the week grown taller, and the code means it —
 * the month paints through `buildRail`, settles through the same easing, and
 * steps with the same cursor arithmetic. An earlier plan had them as two
 * modules, which was wrong and would have produced a web of cross-imports for
 * no gain.
 *
 * **It calls `state.select` rather than importing `select`.** The page's
 * navigation funnel stays in views/calendar.js — it repaints the panel, the
 * liturgy line and the rail together — so an import here would run backwards
 * and make a cycle. The state object is already the view's context; the
 * function that changes the day belongs on it. Two call sites use it, and
 * views/calendar.js is where it is assigned.
 */

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

/**
 * How much time a coast frame may spend, or `null` for a frame that should be
 * skipped. Exported because it is the whole of a defect that took a fortnight
 * of red CI runs to find, and it is pure.
 *
 * `requestAnimationFrame` hands the callback **the frame's start time**, which
 * on a loaded machine can predate the pointerup that scheduled it. Seeding the
 * clock from `performance.now()` at the release therefore produced a *negative*
 * first `dt`, and `scrollLeft = before + v * dt` wrote the rail backwards —
 * measured on CI, and reproduced here under a 120x CPU throttle at -28.7 to
 * -47.6 ms on six releases out of six.
 *
 * `null` for the first frame (nothing has elapsed that anyone can measure) and
 * for any frame whose timestamp does not advance. Clamped at 64 ms so a tab
 * that was backgrounded does not spend a second of momentum in one step.
 */
export function coastDelta(last, now, cap = 64) {
  if (last === null || !(now > last)) return null;
  return Math.min(now - last, cap);
}

/* Handing over at 0.15 px/ms rather than at nearly zero: the exponential's
   tail is a crawl the eye reads as jank, and the settle's own glide is a
   better ending — it is still moving when the snap takes the wheel. */
const COAST_STOP = 0.15;

/**
 * Two marks under a date, and only two (author, 2026-08-26: "Dots on the week
 * strip for fast and feast days would let someone plan the week at a glance").
 *
 * This is *not* the return of the density dots the author removed on
 * 2026-08-25 — one dot per commemoration, capped at five, which said only
 * "this day is busy". These say something a reader plans around, and each is
 * a fact with a source behind it:
 *
 *   fast   lib/liturgy.js, reckoned in this church's own calendar. The colour
 *          is the same three tokens the chip uses. A fast-free day gets none,
 *          which is what makes a run of them legible at a glance.
 *   feast  the day's own record carrying hymns for this church. That is the
 *          rank cross the calendar itself printed: the harvest ships hymns
 *          only for its top-rank days, so the mark is the source's judgement
 *          rather than ours. Days outside the recorded span carry none, and
 *          an absent mark is not a claim that the day is ordinary.
 *
 * Both are named in the button's accessible label, because a dot is nothing
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

const dayMarks = (iso) => {
  const tone = fastTone(iso);
  const feast = Boolean(dayRecordFor(iso, state.calendar)?.hymns?.length);
  const marks = [];
  const words = [];
  const D = STRINGS.calendar.marks;
  if (tone) {
    marks.push(`<span class="day-mark mark-${esc(tone)}"></span>`);
    words.push(tone === 'fish' ? D.fish : D.fast);
  }
  if (feast) {
    marks.push('<span class="day-mark mark-feast"></span>');
    words.push(D.feast);
  }
  return {
    html: marks.length ? `<span class="day-marks" aria-hidden="true">${marks.join('')}</span>` : '',
    label: words.length ? ` - ${words.join(', ')}` : '',
  };
};

const dayButton = (iso) => {
  const n = countFor(iso, state.data);
  const density = n ? ` - ${fill(STRINGS.calendar.densityLabel, { count: n })}` : '';
  const marks = dayMarks(iso);
  return `<button type="button" data-iso="${iso}" tabindex="-1"
    aria-label="${dayLabel(iso)}${density}${marks.label}">
    <span class="day-name">${weekdayFmt(utc(iso))}</span>
    <span class="day-num">${dayNumeral(iso)}</span>
    ${marks.html}
  </button>`;
};

/** Every day in the rail, anchored on `iso`. Density is read here, so this is
 *  also how the rail is repainted when the church changes under it. */
export function buildRail(iso) {
  const strip = state.el.querySelector('.week-strip');
  state.railAnchor = iso;
  const days = [];
  for (let i = -RAIL_RADIUS; i <= RAIL_RADIUS; i += 1) days.push(addDaysIso(iso, i));
  strip.innerHTML = days.map(dayButton).join('');
  markRail();
}

/** The two marks that move without the rail being rebuilt. */
export function markRail() {
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
export function revealSelected({ week = false } = {}) {
  const strip = state.el?.querySelector('.week-strip');
  const button = dayAt(state.selected);
  if (!strip || !button) return;
  /*
   * A hidden rail has no geometry, and asking it for some is worse than
   * useless: `offsetLeft` and `clientWidth` are 0 while the month is showing,
   * so every branch below computes a scroll from zeroes and the rail is left
   * wherever the arithmetic put it — which is the bug the author reported on
   * 2026-08-26 ("When I scroll away in the monthly display, select a date
   * there, and go back to the weekly display, the weekly display should open
   * in the new location, not the old"). The reveal is *deferred* rather than
   * skipped: toggleMonth does it as the week comes back, by which time the
   * rail has a width again.
   */
  if (state.monthOpen) return;
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
export function wireRail(strip) {
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
    /*
     * **The clock starts on the first frame, not here** (2026-08-28). This read
     * `performance.now()` at the release and took the first frame's `dt` from
     * it — but a `requestAnimationFrame` callback's timestamp is *the frame's
     * start*, and on a loaded machine the frame can have started before the
     * pointerup that scheduled the callback was processed. `dt` then comes out
     * **negative**, and `before + v * dt` writes the rail *backwards*.
     *
     * Measured on CI, which reproduced it about one run in three, and then
     * deterministically here under a 120x CPU throttle: first frames of -47.6,
     * -37, -28.9, -34.2, -28.7 and -36.1 ms, dragging the rail 77 to 108 px the
     * wrong way. The frame after that has a `dt` of 0 or a fraction, the write
     * lands on the same pixel, and the wall check below used to fire — so the
     * coast aborted against a wall that was not there and the reader got a
     * flick that jumped backwards and stopped dead.
     *
     * Seeding from the first frame makes every `dt` a difference between two
     * frame timestamps, which is monotonic. It costs one frame of stillness at
     * the start of a coast, which is not perceptible and is the honest price:
     * the rail cannot know how much time a frame it never saw took.
     */
    coast = { v: velocity, last: null, raf: 0 };
    const step = (now) => {
      if (!coast) return;
      const dt = coastDelta(coast.last, now);
      if (dt === null) {
        coast.last = coast.last === null ? now : coast.last;
        coast.raf = requestAnimationFrame(step);
        return;
      }
      coast.last = now;
      const before = strip.scrollLeft;
      const wanted = coast.v * dt;
      strip.scrollLeft = before + wanted;
      coast.v *= Math.exp(-dt / FRICTION_TAU);
      /*
       * A wall is the element **refusing** to move, not us asking it to move a
       * fraction of a pixel. The old predicate could not tell the two apart,
       * and a short frame after a slow one was enough to end a coast in the
       * middle of the rail.
       */
      const atWall = Math.abs(wanted) >= 1 && strip.scrollLeft === before;
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
    if (!button || !strip.contains(button)) return;
    state.select(button.dataset.iso);
    /*
     * A day pressed with a pointer does not keep the focus (author,
     * 2026-08-25: "a selection highlight remains over the day where you
     * started moving from … also occurs when you use the arrow keys to go
     * down or up the page"). A clicked button *is* focused, silently — no
     * ring, because the press was a pointer's — and the browser paints the
     * ring on it the moment the reader touches any key, arrow keys included,
     * so the day they left kept a ring while the day they moved to wore the
     * selection. The day buttons are tabindex="-1" and the rail is the tab
     * stop, so this focus was never anyone's way in; a keyboard activation
     * (detail 0) is left alone regardless.
     */
    if (e.detail > 0) button.blur();
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
    from.style.transition = `transform var(--dur-slot) var(--ease)`;
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
export function toggleMonth() {
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
    showWeekOfSelected();
    return;
  }
  week.hidden = false;
  // Before the fade, not after: the rail has its width the instant it is
  // un-hidden, and scrolling it while it is still transparent means the week
  // is already in the right place when the reader can first see it. Doing it
  // at the end of the swap would show the old week arriving and then jumping.
  showWeekOfSelected();
  week.classList.add('is-out');
  growMonthBody(body, measure(body), 0);
  requestAnimationFrame(() => week.classList.remove('is-out'));
  beginSwap(span, () => {
    month.hidden = true;
    body.style.height = '';
  }).settle(MONTH_FADE);
}

/**
 * The week the selected day sits in, brought back under the reader as the
 * month closes (author, 2026-08-26: "When I scroll away in the monthly
 * display, select a date there, and go back to the weekly display, the weekly
 * display should open in the new location, not the old as it currently does").
 *
 * Picking a date in the month leaves the month open — that decision stands,
 * and it is why the rail is never scrolled at the moment of the pick — so
 * this is the one place where the rail catches up with where the reader went.
 * Two things had to happen for it to work at all: the rail has to be visible,
 * which is why the caller un-hides the week first; and it has to *hold* the
 * day, which a rail anchored 60 days away no longer does once the reader has
 * paged through a few months. `buildRail` re-anchors, and it is cheap — 121
 * buttons, the same cost as any settle.
 *
 * `week: true`, not the ordinary minimal reveal: coming back from the month
 * is an arrival, and an arrival shows the whole week the day sits in rather
 * than that day pinned to an edge. It is the same choice a deep link makes.
 *
 * Called only from the closing branch of toggleMonth, which has already
 * flipped `state.monthOpen` to false — so revealSelected's hidden-rail guard
 * is open by the time this runs.
 */
function showWeekOfSelected() {
  if (!dayAt(state.selected)) buildRail(state.selected);
  revealSelected({ week: true });
}

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

  // The name prints in the gutter beside the grid rather than above it, so it
  // costs the row no height (author, 2026-08-21).
  /*
   * The whole name past the breakpoint, where the header has its own row, and
   * the abbreviation below it, where the name still shares the gutter with the
   * grid (author, 2026-09-02: "display the full month name").
   */
  const wide = window.matchMedia('(min-width: 1024px)').matches;
  /*
   * `first` is a *civil* day, and the name printed is still the right one when
   * the grid is counting in another calendar: the first of a Julian month
   * falls thirteen days later on the civil one, and thirteen days after a
   * first is the fourteenth of the same civil month. Any offset under 28 days
   * keeps that true — the two calendars are 13 apart now and 14 from 2100 -
   * so the month's own name and year come out of `Intl` in the reader's
   * language rather than out of a table this file would have to keep.
   */
  el.querySelector('.month-name').textContent = (wide ? monthLongFmt : monthFmt)(utc(first));

  // They say nothing a date's own label does not — the button below each of
  // them reads "Friday, 30 January 2026" in full.
  el.querySelector('.month-days').innerHTML = weekOf(first)
    .map((iso) => `<span class="month-day-name">${weekdayFmt(utc(iso))}</span>`)
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
export function paintMonthInto(row, cursor, { live }) {
  const { selected } = state;
  const cal = gridCalendar();
  const lead = toJdn(cal, cursor.year, cursor.month, 1) % 7; // JDN 0 was a Monday

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<span></span>');
  const days = daysInMonthOf(cal, cursor);
  for (let day = 1; day <= days; day++) {
    const iso = isoOfDate(cal, { year: cursor.year, month: cursor.month, day });
    const current = iso === selected ? ' aria-current="date"' : '';
    /*
     * The month's numerals take the fast's own colour (author, 2026-08-26
     * evening: "in monthly view, make the text colour of each day match the
     * fasting dot colour for that day"), from the same `fastTone` the rail's
     * dot reads, so the two grains cannot say different things about one day.
     *
     * **And it is named, not only coloured.** A dot is nothing to a screen
     * reader and a hue is nothing to a reader who cannot separate these two,
     * so the word goes into the button's accessible name exactly as the
     * rail's has since the dots arrived — this is DESIGN.md §2's "the words
     * still say which" applied to the one grain that had no words.
     */
    const tone = fastTone(iso);
    const D = STRINGS.calendar.marks;
    const toneLabel = tone ? ` - ${tone === 'fish' ? D.fish : D.fast}` : '';
    const classes = [iso === todayIso() ? 'is-today' : '', tone ? `fast-${tone}` : ''].filter(Boolean);
    const cls = classes.length ? ` class="${classes.join(' ')}"` : '';
    cells.push(`<button type="button" data-iso="${iso}"${current}${cls}
      aria-label="${dayLabel(iso)}${toneLabel}"><span class="day-num">${day}</span></button>`);
  }
  row.querySelector('.month-grid').innerHTML = cells.join('');

  for (const [sel, c, weekday] of [
    ['.peek-prev', stepCursor(cursor, -1), 6],
    ['.peek-next', stepCursor(cursor, 1), 0],
  ]) {
    const column = monthColumn(c, weekday)
      .map((day) => `<span class="peek-cell">${day}</span>`)
      .join('');
    row.querySelector(sel).innerHTML = `<span class="peek-col" aria-hidden="true">${column}</span>`;
  }

  if (!live) return;
  // Picking a date does not close the month: only the toggle does.
  for (const b of row.querySelectorAll('.month-grid [data-iso]')) {
    b.addEventListener('click', () => state.select(b.dataset.iso));
  }
}

/**
 * A month moves sideways like the week does, and takes its height with it: a
 * five-row month arriving where a six-row one was would otherwise shunt the
 * whole page up between two frames. `travelled` is a drag, which has already
 * made the trip by hand.
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
  if (!travelled) state.monthGrain.travel(n > 0 ? 1 : -1);
  if (after !== before) growMonthBody(body, before, after);
}

export const stepMonth = (n) => moveMonth(n);

/** The days of one month that fall on one weekday, 0 = Monday. JDN 0 was a Monday. */
function monthColumn(cursor, weekday) {
  const days = [];
  const cal = gridCalendar();
  const n = daysInMonthOf(cal, cursor);
  for (let day = 1; day <= n; day++) {
    if (toJdn(cal, cursor.year, cursor.month, day) % 7 === weekday) days.push(day);
  }
  return days;
}

export const stepCursor = (c, n) => ({
  year: c.year + Math.floor((c.month + n - 1) / 12),
  month: ((c.month + n - 1 + 12) % 12) + 1,
});

const step = (n) => state.select(addDaysIso(state.selected, n));
