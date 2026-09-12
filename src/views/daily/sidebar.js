/**
 * The Daily page's standing sidebar (2026-09-12, Step 3 of the rebuild plan).
 *
 * **The day stands still and the saints pass under it.** The column is over
 * the strip rather than the first cell of it, so the facts about the day never
 * leave the reader while the day's saints scroll behind them. Everything it
 * prints is *computed* — there is not a hard-coded month name, cycle word or
 * feast name anywhere in this file. The mockup carried an English `CYCLE`
 * table and a bundled `liturgy.js`; both are build artefacts of the modules
 * imported below and neither is copied.
 *
 * The markup is built once and repainted by writing into named slots rather
 * than by rewriting `innerHTML`. That is not an optimisation: the month
 * caption is the full-screen calendar's opener and the caption on the
 * `.cal-cap` line is the reckoning control, and both carry listeners that a
 * wholesale repaint would silently drop on the first day step.
 */

import { CALENDAR_LABELS } from '../../data/calendars.js';
import { addDaysIso, dateIn, daysInMonthOf, isoOfDate, todayIso, weekOf } from '../../lib/calendar-page.js';
import {
  RECKONINGS,
  chooseReckoning,
  churchName,
  currentChurch,
  reckoningInForce,
  storedReckoning,
} from '../../lib/church.js';
import { gradeForDay } from '../../lib/fast-grade.js';
import { currentLanguage, formatDate, languageTag, translateReason } from '../../lib/i18n.js';
import { greatFeast, liturgicalDay } from '../../lib/liturgy.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { nameDays } from '../../lib/name-days.js';
import { isWide } from '../../lib/viewport.js';
import { cycleName } from '../../ui/cycle-name.js';
import { STRINGS, fill } from '../../ui/strings.js';
import { allEntriesFor, dayRecordFor } from './entries.js';
import { dayInWords, utc } from './format.js';
import { wireFullCal } from './fullcal.js';
import { state } from './state.js';

/** The one church everything on this page is counted in. */
const church = () => state?.calendar ?? currentChurch();

/**
 * The day's own word.
 *
 * Three days a reader can name without counting, and the weekday's own name
 * for anything further out — a page three weeks back is a Thursday, not a
 * "yesterday". The words are the pack's; the weekday is `Intl`'s, so it is
 * «Sâmbătă» and Σάββατο as readily as Saturday.
 */
export function relativeDayWord(iso) {
  const C = STRINGS.calendar;
  const now = todayIso();
  if (iso === now) return C.today;
  if (iso === addDaysIso(now, -1)) return C.yesterday;
  if (iso === addDaysIso(now, 1)) return C.tomorrow;
  return formatDate({ weekday: 'long', timeZone: 'UTC' }, utc(iso));
}

/**
 * The same civil day, counted the old way.
 *
 * `dateIn` is the site's own pivot — `fromJdn('julian', toJdn(...))` under one
 * name, unit-tested — and never a subtraction of thirteen done by hand. The
 * three numbers it gives back are handed to `Intl` as though they were
 * Gregorian, which is exactly right: nothing is read off them but the day and
 * the month, and those are the ones the reader is being shown.
 */
function otherReckoningWords(iso) {
  /*
   * **The other calendar, whichever one the reader is not already being given.**
   * The headline is printed in `reckoningInForce()`, so on an Old Calendar
   * church it already says 30 August; naming the Julian day underneath it then
   * prints the same date twice and tells the reader nothing. What is missing
   * there is the civil date, and what is missing everywhere else is the Julian
   * one. Revised Julian asks for the Julian day, not the civil one, because for
   * every date this site shows it agrees with the civil calendar anyway.
   */
  const other = reckoningInForce() === 'julian' ? 'gregorian' : 'julian';
  const d = dateIn(other, iso);
  const asIf = new Date(Date.UTC(d.year, d.month - 1, d.day));
  const date = formatDate({ day: 'numeric', month: 'long', timeZone: 'UTC' }, asIf);
  return fill(other === 'julian' ? STRINGS.calendar.byJulian : STRINGS.calendar.byCivil, { date });
}

/**
 * Which colour a day's fast is drawn in — the **grade**, not the kind.
 *
 * The two disagree on thirteen recorded Russian days: the calendar printed
 * «разрешается рыба», so `gradeForDay` reads fish while `kind` stays a plain
 * `fast`, and colouring by kind paints those days in the rubric of a strict
 * fast beside their own words saying fish is allowed (`views/calendar.js`,
 * 2026-08-26 evening; `picker.js`'s `fastTone` is the same two-step). The plan
 * §2 names three classes and this gives all three; what it does not do is
 * reintroduce a colour that contradicts the text beside it.
 */
function fastTone(iso) {
  const f = liturgicalDay(iso, church()).fasting;
  if (f.kind !== 'fast' && f.kind !== 'fish') return null;
  return gradeForDay(f, dayRecordFor(iso, church())?.fastingNote) === 'fish' ? 'fish' : 'fast';
}

const TONE_CLASS = { fast: 'is-fast', fish: 'is-fish' };

/* ---- the day's tags ----------------------------------------------------- */

/**
 * The fast, in the fast's own colour, and what it allows.
 *
 * The grade is read off the printed note wherever a church printed one and
 * defaulted only where none exists — `lib/fast-grade.js` argues that boundary
 * and `lib/liturgy.js` still refuses to rule on it.
 *
 * The occasion is appended, *except* where the fast's reason is only a Great
 * Feast's own name and the feast tag beside it has already said so — "the
 * Dormition · Great Feast - The Dormition of the Theotokos" is the author's
 * complaint of 2026-08-26 evening reappearing one tag to the right.
 */
function fastTag(iso) {
  const day = liturgicalDay(iso, church());
  const f = day.fasting;
  const tone = fastTone(iso);
  const M = STRINGS.calendar.fastModal;
  const grade = tone ? gradeForDay(f, dayRecordFor(iso, church())?.fastingNote) : null;
  const words = grade ? M.grades[grade] : STRINGS.calendar.liturgy.free;
  const namedFeast = Boolean(day.feast && STRINGS.calendar.feasts.names[day.feast]);
  const saidBetter = f.reasonKind === 'weekday' || (f.reasonKind === 'greatFeast' && namedFeast);
  const reason = f.reason && !saidBetter ? translateReason(f.reason) : null;
  const text = reason ? `${words} · ${reason}` : words;
  const cls = tone ? TONE_CLASS[tone] : 'is-free';
  return `<span class="tag ${cls}" data-fast="${esc(f.kind)}">${esc(text)}</span>`;
}

/**
 * Whether the day is one of the Twelve, named.
 *
 * A day that is not says so in a dashed outline rather than leaving a gap: a
 * row of tags that loses one changes shape from day to day, and most days are
 * not a Great Feast, which is a fact about the day worth printing.
 */
function feastTag(iso) {
  const F = STRINGS.calendar.feasts;
  const key = greatFeast(iso, church());
  const name = key ? F.names[key] : null;
  if (!name) return `<span class="tag is-none" data-feast="">${esc(STRINGS.calendar.noGreatFeast)}</span>`;
  return `<span class="tag is-feast" data-feast="${esc(key)}">${esc(fill(F.line, { label: F.label, name }))}</span>`;
}

/* ---- the month ---------------------------------------------------------- */

/**
 * The seven column heads, in the reader's own language, Monday first — which
 * is how the reckonings' own calendars are set. 2026-08-24 was a Monday, so a
 * week counted from it indexes straight off the column.
 */
const weekHeads = () =>
  Array.from({ length: 7 }, (_, i) =>
    formatDate({ weekday: 'narrow', timeZone: 'UTC' }, new Date(Date.UTC(2026, 7, 24 + i))),
  );

/**
 * The month, drawn.
 *
 * Counted in the reckoning in force, so an Old Calendar reader is shown their
 * own month and not the civil one — `daysInMonthOf` for its length and
 * `isoOfDate` for which civil day each numeral names. The fast is asked of
 * every day of it, so a numeral's colour is that day's own answer and not a
 * rule of thumb about Wednesdays and Fridays: the four fasts, the fast-free
 * weeks and the Great Feasts all land where they actually fall.
 *
 * Two marks, and they are different facts. `.is-today` is the day the page is
 * showing; `.is-now` is the day it actually is, kept quieter, so a reader who
 * has walked off into the month can still see where they came from.
 *
 * Spans, not buttons. Thirty-one tab stops for a grid that picks nothing is a
 * keyboard reader's whole month; picking a day is the full-screen calendar's
 * job, and its opener is the caption directly above this.
 */
function monthCells(iso) {
  const cal = reckoningInForce();
  const churchId = church();
  const now = todayIso();
  const { year, month } = dateIn(cal, iso);
  const days = daysInMonthOf(cal, { year, month });
  const first = isoOfDate(cal, { year, month, day: 1 });
  // Monday-to-Sunday, from lib/calendar-page.js's own week: where the first of
  // the month sits in it is exactly how many blanks lead the grid.
  const lead = Math.max(0, weekOf(first).indexOf(first));

  const cells = weekHeads().map((h) => `<span class="cal-head" aria-hidden="true">${esc(h)}</span>`);
  for (let i = 0; i < lead; i += 1) cells.push('<span class="cal-day is-blank"></span>');

  const D = STRINGS.calendar.marks;
  for (let day = 1; day <= days; day += 1) {
    const at = isoOfDate(cal, { year, month, day });
    const tone = fastTone(at);
    const feast = Boolean(greatFeast(at, churchId));
    const cls = ['cal-day'];
    if (tone) cls.push(TONE_CLASS[tone]);
    if (feast) cls.push('is-feast');
    if (at === state?.selected) cls.push('is-today');
    else if (at === now) cls.push('is-now');
    /*
     * The colour is not the only carrier. `quality-floor.spec.js` holds the
     * week rail to "told apart by shape, not only by hue" and the month grid
     * inherits that obligation: the feast has its own underline, and the words
     * for both go into the accessible name so a reader who cannot see either
     * is told the same three things.
     */
    const said = [tone === 'fish' ? D.fish : tone === 'fast' ? D.fast : null, feast ? D.feast : null].filter(Boolean);
    const label = said.length ? `${dayInWords(at)} - ${said.join(', ')}` : dayInWords(at);
    /*
     * A button, not a span. The month is the one place on this page that can
     * reach a day that is not next door, and a painted grid that answers no
     * press is a picture of a calendar rather than a calendar. It is also the
     * only shape in which the accessible name above is worth anything: a span
     * carrying `aria-label` and no role is neither focusable nor reliably
     * announced, so the words a reader who cannot see the colours depends on
     * were being handed to an element nothing lands on.
     */
    const current = at === state?.selected ? ' aria-current="date"' : '';
    cells.push(
      `<button type="button" class="${cls.join(' ')}" data-iso="${esc(at)}" aria-label="${esc(label)}"${current}>${day}</button>`,
    );
  }
  return cells.join('');
}

/** The month's own name, in the calendar it is counted in. */
function monthWords(iso) {
  const cal = reckoningInForce();
  const { year, month } = dateIn(cal, iso);
  const asIf = new Date(Date.UTC(year, month - 1, 1));
  return formatDate({ month: 'long', year: 'numeric', timeZone: 'UTC' }, asIf);
}

/**
 * The month's name, and past 1024 px the full-screen calendar's opener.
 *
 * **Below that width there is no opener and no button** (author, 2026-09-02:
 * "Remove the 'Full Screen Calendar' button completely from mobile - this was
 * only ever supposed to be a desktop only addition"; restored here after the
 * rebuild carried it to every width). A `<p>` rather than a hidden or
 * disabled button, so the control is out of the accessibility tree as well as
 * off the screen — a press nobody can make should not be a press a screen
 * reader offers.
 *
 * Written as markup into a slot on every paint rather than styled in place,
 * because the element changes kind across the line and `paintSidebar` cannot
 * rewrite a `<button>` into a `<p>`. That is also why `wireFullCal` delegates:
 * the opener this returns is a different node every day step.
 */
function monthCaption(iso) {
  const words = monthWords(iso);
  if (!isWide()) return `<p class="cal-month is-static">${esc(words)}</p>`;
  const full = STRINGS.calendar.fullScreen;
  return `<button type="button" class="cal-month" data-fullcal aria-haspopup="dialog" title="${esc(full)}" aria-label="${esc(`${words} - ${full}`)}">${esc(words)}</button>`;
}

/* ---- the names ---------------------------------------------------------- */

/**
 * The names the day gives.
 *
 * A second reading of the day's own saints and not a new claim about the day:
 * every name here is the first word of a commemoration printed beside it.
 * `lib/name-days.js` argues the reduction and the three things it refuses.
 *
 * A name links to its saint only where exactly one of the day's saints bears
 * it; where two or more do it stands as text, because a link would be the site
 * choosing between them (`panel.js`'s rule, carried over whole).
 *
 * The separator carries its own spaces. Joined by a bare middot the list is one
 * word to a line-breaker, and «Abraham·Adrian·Agathonicus» runs out of the side
 * of the column rather than wrapping down it.
 */
function namesMarkup(iso) {
  const data = state?.data;
  if (!data) return '';
  const cards = allEntriesFor(iso, data)
    .map((e) => data.bySlug.get(e.slug))
    .filter(Boolean);
  const names = nameDays(cards, { lang: currentLanguage(), locale: languageTag() });
  const href = (slug) => state?.router?.href?.(`/saints/${slug}`) ?? `/saints/${slug}`;
  return names
    .map(({ name, slug }) =>
      slug
        ? `<a class="name-day" href="${esc(href(slug))}" data-prefetch="${esc(slug)}">${esc(name)}</a>`
        : `<span class="name-day">${esc(name)}</span>`,
    )
    .join('<span class="sep" aria-hidden="true"> · </span>');
}

/* ---- the markup --------------------------------------------------------- */

/**
 * The sidebar's skeleton: every slot `paintSidebar` writes into, and the three
 * controls that must outlive a repaint.
 *
 * The month caption is a slot rather than a control: past 1024 px
 * `monthCaption` fills it with the full-screen calendar's opener (§11.4 —
 * `fullcal.js` is not deleted, and this is the one line of wiring that keeps
 * it reachable once the week rail is gone), and below that width with the
 * month's name and nothing else. The `.cal-cap` line carries the reckoning
 * control for the same reason the author gave for its place: the caption
 * naming the reckoning is exactly where a reader would press to change it —
 * and it too is the desktop's, hidden by `daily-sidebar.css` below the line
 * where `lib/church.js` has already fixed the answer to Gregorian.
 */
export const sidebarMarkup = () => `<aside class="day-side" data-day-side>
  <div class="day-head">
    <p class="td-label" data-day-word></p>
    <button class="day-step is-back" type="button" data-step="-1">‹</button>
    <button class="day-step" type="button" data-step="1">›</button>
  </div>
  <h2 class="day-date" data-day-date></h2>
  <p class="day-old" data-day-old></p>
  <p class="day-cycle" data-day-cycle></p>
  <div class="day-tags" data-day-tags></div>
  <div class="cal-month-slot" data-cal-month></div>
  <!-- No role="grid": a grid owes a screen reader rows and gridcells, and
       thirty spans with none is a worse promise than no promise. Each day
       carries the whole date and its marks in its own accessible name. -->
  <div class="cal" data-cal></div>
  <p class="cal-cap">
    <span class="reckoning" data-reckoning>
      <button type="button" class="reckoning-btn utility" data-reckoning-btn aria-expanded="false" aria-haspopup="true"></button>
      <span class="reckoning-pop" data-reckoning-pop hidden></span>
    </span>
    <span class="cal-cap-sep" aria-hidden="true"> · </span>
    <span data-cal-church></span>
  </p>
  <div class="day-names">
    <p class="td-label" data-names-heading></p>
    <div class="td-flow"><p class="names" data-names></p></div>
  </div>
</aside>`;

/** The `.day-side` element inside `root`, or `root` when it is that element. */
const sideOf = (root) => (root?.matches?.('[data-day-side]') ? root : root?.querySelector('[data-day-side]'));

/**
 * Every fact the sidebar prints, for one day.
 *
 * Builds the skeleton on first call if the caller has not already placed it,
 * so the module is usable both ways: `calendar.js` puts `sidebarMarkup()` in
 * its own template, and anything else can hand this an empty box.
 */
export function paintSidebar(root, iso) {
  if (root && !sideOf(root)) root.insertAdjacentHTML('afterbegin', sidebarMarkup());
  const side = sideOf(root);
  if (!side || !iso) return;

  const day = liturgicalDay(iso, church());
  const L = STRINGS.calendar.liturgy;
  const set = (sel, text) => {
    const el = side.querySelector(sel);
    if (el) el.textContent = text;
  };
  const html = (sel, markup) => {
    const el = side.querySelector(sel);
    if (el) el.innerHTML = markup;
  };

  set('[data-day-word]', relativeDayWord(iso));
  // The date the page is read by, in the reckoning in force — `dayInWords` is
  // `reckonedPlain(iso, reckoningInForce())`, so an Old Calendar reader is
  // given 30 August where a civil one is given 12 September.
  set('[data-day-date]', dayInWords(iso));
  set('[data-day-old]', otherReckoningWords(iso));
  // Where the day stands in the year the fixed calendar knows nothing about,
  // and the tone of the week it falls in. Both from lib/liturgy.js; the words
  // from ui/cycle-name.js and the pack, never composed here.
  set(
    '[data-day-cycle]',
    [cycleName(day.cycle, iso), day.tone ? fill(L.tone, { tone: day.tone }) : null].filter(Boolean).join(' · '),
  );
  html('[data-day-tags]', fastTag(iso) + feastTag(iso));

  html('[data-cal-month]', monthCaption(iso));
  html('[data-cal]', monthCells(iso));
  set('[data-cal-church]', churchName(church()));

  const steps = [
    ['[data-step="-1"]', STRINGS.calendar.prevDay],
    ['[data-step="1"]', STRINGS.calendar.nextDay],
  ];
  for (const [sel, label] of steps) side.querySelector(sel)?.setAttribute('aria-label', label);

  /*
   * "Today's name days" only on the day that is actually today (author,
   * 2026-08-26). This page reaches months either side, so the word would be
   * false on every day but one.
   */
  const N = STRINGS.calendar.nameDays;
  set('[data-names-heading]', iso === todayIso() ? N.headingToday : N.heading);
  html('[data-names]', namesMarkup(iso));
  // Nothing below 1024 px: the control is hidden there and the reckoning is
  // fixed, so painting it would put a word in the DOM that names a choice the
  // reader does not have.
  if (isWide()) paintReckoning(side);
}

/* ---- the controls ------------------------------------------------------- */

/**
 * The reckoning's own word, and the chooser under it.
 *
 * `reckoningInForce()` and not `storedReckoning()`: the church's own default
 * once that is what is governing, so a reader who has never touched the
 * control sees one reckoning throughout rather than a civil caption over a
 * Julian fast (`views/calendar.js`, 2026-09-05). The *chosen* value is what
 * the rows are pressed against, because "Follow my church" has to be able to
 * show as the current answer.
 */
function paintReckoning(side) {
  const button = side.querySelector('[data-reckoning-btn]');
  const pop = side.querySelector('[data-reckoning-pop]');
  if (!button || !pop) return;
  const inForce = reckoningInForce();
  const full = CALENDAR_LABELS[inForce] ?? inForce;
  const chosen = storedReckoning();
  button.textContent = full;
  button.setAttribute('aria-label', `${STRINGS.calendar.reckoningLabel}: ${full}`);
  pop.innerHTML = [
    { id: null, label: STRINGS.calendar.reckoningFollow },
    ...RECKONINGS.map((id) => ({ id, label: CALENDAR_LABELS[id] ?? id })),
  ]
    .map(
      (o) =>
        `<button type="button" class="reckoning-row utility" data-pick="${esc(o.id ?? '')}" aria-pressed="${String(o.id === chosen)}">${esc(o.label)}</button>`,
    )
    .join('');
}

/**
 * The three things in here that do something, wired once.
 *
 * Delegated where it can be — one listener on the column for the day steps —
 * and bound directly where the dialog demands it: `wireFullCal` takes the
 * element it finds, which is why the caption is built once and only ever has
 * its text rewritten.
 *
 * Returns a teardown, which `calendar.js` pushes onto `state.cleanups`.
 */
export function wireSidebar(root, { select } = {}) {
  const side = sideOf(root);
  if (!side) return () => {};
  const go = select ?? ((iso) => state?.select?.(iso));

  const onClick = (e) => {
    const step = e.target.closest('[data-step]');
    if (step) {
      go(addDaysIso(state.selected, Number(step.dataset.step)));
      return;
    }
    const day = e.target.closest('.cal-day[data-iso]');
    if (day) {
      go(day.dataset.iso);
      return;
    }
    const button = e.target.closest('[data-reckoning-btn]');
    const pop = side.querySelector('[data-reckoning-pop]');
    if (button && pop) {
      const open = pop.hidden;
      pop.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      return;
    }
    const row = e.target.closest('[data-pick]');
    if (row) {
      // The empty string is the follow-my-church row: an absent choice, not a
      // calendar named the empty string.
      chooseReckoning(row.dataset.pick || null);
      /*
       * Repainted here rather than left to the church subscription: that one
       * repaints the page, and this control's own word is the one thing on it
       * the page's repaint does not touch.
       */
      paintSidebar(root, state?.selected);
      closePop(side);
      side.querySelector('[data-reckoning-btn]')?.focus();
    }
  };

  const onAway = (e) => {
    if (!side.querySelector('[data-reckoning]')?.contains(e.target)) closePop(side);
  };
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    const pop = side.querySelector('[data-reckoning-pop]');
    if (pop && !pop.hidden) {
      closePop(side);
      side.querySelector('[data-reckoning-btn]')?.focus();
    }
  };

  side.addEventListener('click', onClick);
  document.addEventListener('pointerdown', onAway);
  document.addEventListener('keydown', onKey);
  const unFullCal = wireFullCal(side);

  return () => {
    side.removeEventListener('click', onClick);
    document.removeEventListener('pointerdown', onAway);
    document.removeEventListener('keydown', onKey);
    unFullCal?.();
  };
}

function closePop(side) {
  const pop = side.querySelector('[data-reckoning-pop]');
  if (!pop || pop.hidden) return;
  pop.hidden = true;
  side.querySelector('[data-reckoning-btn]')?.setAttribute('aria-expanded', 'false');
}
