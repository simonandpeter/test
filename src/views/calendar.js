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
  formatSubtext,
  parseIso,
  pickHero,
  todayIso,
  weekOf,
} from '../lib/calendar-page.js';
import { loadDetail, observePrefetch } from '../lib/detail.js';
import { churchName, currentChurch, entriesInChurch, subscribeChurch } from '../lib/church.js';
import { escapeHtml as esc, firstParagraphText } from '../lib/markdown.js';
import { saintName } from '../lib/honorific.js';
import { onGrainDrag } from '../ui/grain-drag.js';
import { makeGrain } from '../ui/grain.js';
import { beginSwap, landSwap, restore, setAside } from '../ui/swap.js';
import { renderBookmark, wireSaveButtons } from '../ui/save.js';
import { mountShelves } from '../ui/shelf.js';
import { hymnMarkup } from '../ui/hymns.js';
import { liturgicalDay } from '../lib/liturgy.js';
import { currentLanguage, formatDate, languageTag, translateReason } from '../lib/i18n.js';
import { recordedDay } from '../data/liturgical-days.js';
import { nameDays } from '../lib/name-days.js';
import { gradeForDay, gradeFromNote } from '../lib/fast-grade.js';
import { cycleName } from '../ui/cycle-name.js';
import { bibleUrl, refInLanguage } from '../lib/bible.js';
import { STRINGS, fill } from '../ui/strings.js';

export const title = () => STRINGS.calendar.title;

const BASE = import.meta.env.BASE_URL;

// Through lib/i18n.js's cache rather than module constants (Amendment 36): a
// formatter built once can never change language.
const dayFmt = (d) => formatDate({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, d);
// The page's own date wears the abbreviated month (author, 2026-08-24:
// "display abbreviated months, e.g. Aug"); the buttons' aria-labels keep
// dayFmt's full month, because a label is spoken, not glanced at.
const headingFmt = (d) =>
  formatDate({ weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }, d);
const weekdayFmt = (d) => formatDate({ weekday: 'short', timeZone: 'UTC' }, d);
// Abbreviated (author, 2026-08-21): the name sits in the gutter beside the
// grid, and a full "September" reached across into the dates.
const monthFmt = (d) => formatDate({ month: 'short', year: 'numeric', timeZone: 'UTC' }, d);

const utc = (iso) => {
  const d = parseIso(iso);
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
};

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
  // A deep link into a day that is not today arrives already scrolled away
  // from it, so the button has to be told on the way in as well as on a step.
  queueMicrotask(() => announceDay(selected));
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
      <div class="cal-body">
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
          </div>
        </div>
        <h1 class="cal-date"></h1>
        <p class="cal-liturgy utility" data-liturgy></p>
        <div class="slot-viewport"><div class="day-panel"></div></div>
      </div>
      <div class="shelves" data-shelves></div>
    </div>`;

  el.querySelector('[data-month]').addEventListener('click', toggleMonth);
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
    () => landSwap(el.querySelector('.slot-viewport')),
    () => landSwap(el.querySelector('.cal-span')),
    onGrainDrag(el.querySelector('.cal-month'), state.monthGrain.handlers),
    wireRail(el.querySelector('.week-strip')),
    wireDayKeys(),
    wireFastBubble(el),
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

function select(iso) {
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

/**
 * The day's readings, where the chosen church's calendar has been read and
 * recorded (author, 2026-08-22): each reference a link to Bible Gateway, and
 * the page it was read from named. Nothing is printed for a day nobody has
 * recorded — an absence is not a claim.
 */
/**
 * A reading's label in the reader's language, keeping whatever the calendar
 * put in brackets after it. The data's labels are the church's own — "Epistle
 * (Прор)", "Απόστολος", "Јеванђеље" — and it is the *kind* that translates:
 * the qualifier names which commemoration the reading belongs to and is a
 * quotation, so it is passed through exactly as printed.
 */
function readingLabel(label) {
  const R = STRINGS.calendar.readings;
  const text = String(label ?? '');
  // Greedy from the first bracket to the last, because a qualifier can carry
  // brackets of its own: days.pravoslavie.ru prints «за понедельник и за
  // вторник (под зачало)», and a pattern that refuses a nested bracket finds
  // no qualifier at all and leaves the kind untranslated.
  const qualifier = text.match(/\s*(\(.*\))\s*$/)?.[1] ?? '';
  const base = qualifier ? text.slice(0, text.length - qualifier.length).trim() : text;
  const kind =
    /^(epistle|apostol|απόστολος|апостол)$/i.test(base) ? R.epistle
    : /^(gospel|evanghelie|ευαγγέλιο|јеванђеље)$/i.test(base) ? R.gospel
    : base;
  return qualifier ? `${kind} ${qualifier}` : kind;
}

function readingsMarkup(iso, churchId) {
  const rec = recordedDay(iso, churchId);
  if (!rec?.readings?.length) return '';
  const R = STRINGS.calendar.readings;
  const language = currentLanguage();
  const items = rec.readings
    .map(
      (x) =>
        `<li><span class="reading-label">${esc(readingLabel(x.label))}</span> ` +
        `<a href="${bibleUrl(x.ref, language)}" rel="noopener noreferrer">${esc(refInLanguage(x.ref, language))}</a></li>`,
    )
    .join('');
  const src = rec.source?.url ? `<a href="${esc(rec.source.url)}" rel="noopener noreferrer">${esc(rec.source.text)}</a>` : esc(rec.source?.text ?? '');
  return `<section class="day-readings" data-readings>
    <h2 class="register-heading">${R.heading}</h2>
    <ul class="readings utility">${items}</ul>
    <p class="readings-source utility">${fill(R.source, { source: src, bible: R.bible })}</p>
  </section>`;
}


/* A note saying the hymns keep the church's own tongue stood under the Hymns
   heading from Amendment 37 (2026-08-24) until the author removed it the next
   morning. The decision it announced is unchanged — every hymn is the cited
   source's own text and no translation is recorded — it is simply no longer
   said on the page. The HYMN_LANG map the note read went with it: each hymn
   already carries its own `lang` from the data, which is where the attribute
   on the printed text comes from. */

function hymnsMarkup(iso, churchId) {
  const rec = recordedDay(iso, churchId);
  const feastHymns = (rec?.hymns ?? []).filter((h) => h.church === churchId);
  return `<section class="day-hymns" data-hymns${feastHymns.length ? '' : ' hidden'}>
    <h2 class="register-heading">${STRINGS.calendar.hymns.heading}</h2>
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
   */
  el.innerHTML =
    `<p class="fast-allows">${esc(allows)}</p>` +
    (note && gradeIsQuoted
      ? `<p class="fast-note" lang="${esc(languageOfNote(state.calendar))}">${esc(note)}</p>`
      : '') +
    (note && src ? `<p class="fast-source utility">${fill(M.sourceNote, { source: src })}</p>` : '');
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
  const at = { x: scrollX, y: scrollY };
  const gone = () => {
    if (Math.abs(scrollY - at.y) > 4 || Math.abs(scrollX - at.x) > 4) closeFastBubble();
  };
  document.addEventListener('pointerdown', away, true);
  document.addEventListener('keydown', key);
  window.addEventListener('scroll', gone, { capture: true, passive: true });
  const onResize = () => closeFastBubble();
  window.addEventListener('resize', onResize, { passive: true });

  bubble = {
    el,
    owner: button,
    teardown: () => {
      document.removeEventListener('pointerdown', away, true);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', gone, { capture: true });
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

/**
 * The hero's life, opened (author, 2026-08-25). The same first paragraph the
 * Index's Detailed rows show, from the same fetched payload and the same
 * helper, so the two never disagree about where a life begins. Wide screens
 * only — the CSS hides the box below 760 px, where the hero has no spare
 * column and the life is a scroll away under the register anyway.
 */
function fillHeroLede(panel, slug, iso) {
  loadDetail(slug).then(
    (payload) => {
      if (!state || state.selected !== iso) return;
      const box = panel.querySelector('[data-hero-lede]');
      if (!box) return;
      const text = firstParagraphText(payload?.life);
      if (!text) return;
      box.textContent = text;
      box.hidden = false;
    },
    () => {},
  );
}

/* The dots that stood under every date at both grains — one per
   commemoration, capped at five — were removed by the author on 2026-08-25
   ("remove the dots under each date in the calendar"). The count they drew is
   still read, once, into the day button's accessible name below: `countFor`
   is the same call, and a reader who cannot glance at the register still
   learns a day's weight before opening it. */

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
  const grade = gradeForDay(f, recordedDay(iso, state.calendar)?.fastingNote);
  return grade === 'fish' ? 'fish' : 'fast';
};

const dayMarks = (iso) => {
  const tone = fastTone(iso);
  const feast = Boolean(recordedDay(iso, state.calendar)?.hymns?.length);
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
    aria-label="${dayFmt(utc(iso))}${density}${marks.label}">
    <span class="day-name">${weekdayFmt(utc(iso))}</span>
    <span class="day-num">${parseIso(iso).day}</span>
    ${marks.html}
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
    if (!button || !strip.contains(button)) return;
    select(button.dataset.iso);
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
function wireDayKeys() {
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
  el.querySelector('.month-name').textContent = monthFmt(utc(first));

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
function paintMonthInto(row, cursor, { live }) {
  const { selected } = state;
  const lead = gregorianToJdn(cursor.year, cursor.month, 1) % 7; // JDN 0 was a Monday

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<span></span>');
  for (let day = 1; day <= daysInMonth(cursor); day++) {
    const iso = toIsoDate({ year: cursor.year, month: cursor.month, day });
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
      aria-label="${dayFmt(utc(iso))}${toneLabel}"><span class="day-num">${day}</span></button>`);
  }
  row.querySelector('.month-grid').innerHTML = cells.join('');

  for (const [sel, c, weekday] of [
    ['.peek-prev', stepCursor(cursor, -1), 6],
    ['.peek-next', stepCursor(cursor, 1), 0],
  ]) {
    const column = monthColumn(c, weekday)
      .map((day) => {
        const iso = toIsoDate({ year: c.year, month: c.month, day });
        return `<span class="peek-cell">${day}</span>`;
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

const stepMonth = (n) => moveMonth(n);

/* ---- the day panel: hero + register ----------------------------------- */

/**
 * A commemorated saint in the Index's own row dress (author, 2026-08-24:
 * "display the saint card row layout instead of the text only"). It is the
 * third place this markup is written — views/saints.js builds it for the
 * grid, ui/shelf.js for Continue reading — and it stays written out rather
 * than shared, because each of the three carries something the others do
 * not: the grid's is virtualised and absolutely positioned, the shelf's is
 * swiped away, and this one carries the church's title for the day and the
 * shared-element name that travels into the saint's page. index.css styles
 * the card; calendar.css only places it.
 *
 * The day's face is the hero above; these are the rest of the day, and they
 * now show what they were: a picture, a lifespan, and Save where every other
 * card in the site keeps it.
 */
function registerRow(saint, title, transition) {
  const image = saint.image
    ? `<span class="index-media" style="background-image:url('${BASE + saint.image.lqip}')">
        <img src="${BASE + saint.image.src}" alt="" width="${saint.image.w}" height="${saint.image.h}"
          loading="lazy" decoding="async" />
      </span>`
    : '';
  return `<li class="index-card is-row reg-card">
    ${image}
    <span class="row-body">
      <span class="name-line">
        <a class="index-name" href="${state.router.href(`/saints/${saint.slug}`)}"
          data-prefetch="${saint.slug}"${transition}>${esc(saintName(saint))}</a>
      </span>
      ${/* No day in any of the four calendars currently puts a *titled*
             saint in the register: all 20 titled attestations in the corpus
             belong to saints who are their own day's hero, so this branch has
             no reachable trigger today and carries no browser test — said
             plainly rather than left looking covered. It is kept because
             titles are data and the corpus grows; the register is where a
             church's own title for the day belongs when one arrives. */ ''}
      ${title ? `<span class="reg-title">${esc(title)}</span>` : ''}
      <span class="index-dates utility">${esc(formatSubtext(saint))}</span>
    </span>
    ${renderBookmark(saint.slug, saint.display_name)}
  </li>`;
}

/**
 * Three silences, and a reader is owed the difference between them (redrawn
 * 2026-08-22 for one church at a time; a third added at Amendment 44). The
 * corpus having nothing for a day is a statement about our sourcing; this
 * church's calendar having nothing while another of the three does is a fact
 * about the choice made above, and says where the others are.
 *
 * The third is new because the day records now run months past the saints. A
 * day can carry its readings, its fast and a dozen hymns and still have no
 * folder for any saint of it — and the old wording called that "an empty day"
 * directly above the day's own readings, which told the reader the opposite of
 * what the page was showing. Prose in ink in every case, never a banner.
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
  // the day's own calendar is recorded even though none of its saints is a folder
  if (recordedDay(iso, state.calendar)?.readings?.length) return STRINGS.calendar.dayWithoutSaints;
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
  const media = hero.image
    ? `<div class="hero-figure">
        <a class="hero-media" href="${state.router.href(`/saints/${hero.slug}`)}"
          data-prefetch="${hero.slug}" aria-hidden="true" tabindex="-1"
          style="background-image:url('${BASE + hero.image.lqip}')">
          <img src="${BASE + hero.image.src}" alt="" width="${hero.image.w}" height="${hero.image.h}"
            style="view-transition-name:s-${hero.slug}-image" loading="eager" decoding="async" />
        </a>
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
      return registerRow(saint, title, transition);
    })
    .join('');
  const register = registerEntries.length
    ? `<h2 class="register-heading">${STRINGS.calendar.alsoToday}</h2>
       <ul class="register register-cards">${rows}</ul>`
    : '';

  panel.innerHTML = `
    <article class="hero ${hero.image ? 'has-media' : ''}">
      ${media}
      <div class="hero-body">
        <div class="name-line">
          <h2 class="hero-name" style="view-transition-name:s-${hero.slug}-name">
            <a href="${state.router.href(`/saints/${hero.slug}`)}" data-prefetch="${hero.slug}">${esc(saintName(hero))}</a>
          </h2>
          ${renderBookmark(hero.slug, hero.display_name)}
        </div>
        <p class="hero-dates utility">${esc(formatSubtext(hero))}</p>
        <!-- The opening of the life, on a wide screen only (author,
             2026-08-25: "because there is space on the left of the saint card
             under their name"). It arrives with the fetched life rather than
             from the manifest, so the box is here from the first paint and
             fills a moment later; empty until then, and empty for good where
             a saint has no life recorded, because a heading over nothing is
             the furniture DESIGN.md §5b refuses. -->
        <p class="hero-lede" data-hero-lede hidden></p>
      </div>
    </article>
    ${register}
    ${readingsMarkup(selected, state.calendar)}
    ${hymnsMarkup(selected, state.calendar)}
    ${nameDaysMarkup(entries, data)}`;
  fillSaintHymns(panel, hero.slug, selected);
  fillHeroLede(panel, hero.slug, selected);
}

const titleFor = (saint, churchId) =>
  saint.attestations.find((a) => a.church === churchId)?.titles?.join(', ') ?? '';

/**
 * Whose name day it is (author, 2026-08-26: "add name days"). Under the day's
 * saints, because it is a second reading of the same list and not a new claim
 * about the day: every name here is the first word of a commemoration already
 * printed above it. lib/name-days.js argues the reduction and the three things
 * it refuses to do.
 *
 * A name links to its saint only where exactly one of the day's saints bears
 * it; where two or more do, the name stands as text, because a link would be
 * the site choosing between them. On 20 September that is five of the day's
 * twenty-one — two Eugenes, two Macariuses, a John who is also a John — and
 * they read exactly as the linked ones do, which is the point.
 */
function nameDaysMarkup(entries, data) {
  const cards = entries.map((e) => data.bySlug.get(e.slug)).filter(Boolean);
  const names = nameDays(cards, { lang: currentLanguage(), locale: languageTag() });
  if (!names.length) return '';
  const items = names
    .map(({ name, slug }) =>
      slug
        ? `<li><a class="name-day" href="${state.router.href(`/saints/${slug}`)}" data-prefetch="${esc(slug)}">${esc(name)}</a></li>`
        : `<li><span class="name-day">${esc(name)}</span></li>`,
    )
    .join('');
  /*
   * "Today's name days" only on the day that is actually today (author,
   * 2026-08-26). The Daily page is a day browser — the rail reaches 121 days
   * either side — so the word would be false on every day but one, and the
   * rest of this panel is careful to say "this day" rather than "today" for
   * exactly that reason. The heading the author asked for stands where it is
   * true and the plain one stands everywhere else.
   */
  const N = STRINGS.calendar.nameDays;
  const heading = state.selected === todayIso() ? N.headingToday : N.heading;
  return `<section class="day-namedays" data-namedays>
    <h2 class="register-heading">${esc(heading)}</h2>
    <ul class="namedays">${items}</ul>
  </section>`;
}
