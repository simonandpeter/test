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
import { fromJdn, gregorianToJdn } from '../lib/jdn.js';
import { CHURCHES, CHURCHES_BY_ID } from '../data/churches.js';
import { formatFeast, monthName, CALENDAR_LABELS } from '../data/calendars.js';
import {
  addDaysIso,
  formatLifespan,
  parseIso,
  pickHero,
  todayIso,
  weekOf,
} from '../lib/calendar-page.js';
import { observePrefetch } from '../lib/detail.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { renderBadge } from '../ui/badge.js';
import { renderMatrix } from '../ui/matrix.js';
import { onSwipe } from '../ui/swipe.js';
import { renderSaveButton, wireSaveButtons } from '../ui/save.js';
import { mountShelves } from '../ui/shelf.js';
import { STRINGS, fill } from '../ui/strings.js';

export const title = STRINGS.calendar.title;

const BASE = import.meta.env.BASE_URL;

const dayFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});
const weekdayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

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

let state = null;

/**
 * Listeners that outlive a single paint — the shelves' store subscription and
 * whatever the current day panel wired up. The router calls destroy() before
 * the next view renders.
 */
export function destroy() {
  state?.cleanups.forEach((fn) => fn?.());
  clearTimeout(state?.rollTimer);
  clearTimeout(state?.monthTimer);
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

const entriesFor = (iso, data) => indexFor(parseIso(iso).year, data).get(iso) ?? [];
const countFor = (iso, data) => entriesFor(iso, data).length;

export function render(el, { data, params, router }) {
  destroy();
  const selected = params.date && parseIso(params.date) ? params.date : todayIso();
  state = {
    el, data, router, selected,
    monthCursor: null, monthOpen: false,
    cleanups: [], dayCleanups: [], rollTimer: null, monthTimer: null,
  };

  el.innerHTML = `
    <div class="cal">
      <div class="cal-controls">
        <div class="cal-jump">
          <button type="button" data-today aria-label="${STRINGS.calendar.goToday}">${ICON_TODAY}</button>
          <button type="button" data-month aria-expanded="false"
            aria-label="${STRINGS.calendar.monthView}">${ICON_MONTH}</button>
        </div>
        <div class="cal-span">
          <div class="cal-week">
            <button type="button" data-step="-7" aria-label="${STRINGS.calendar.prevWeek}">‹</button>
            <div class="week-strip" role="group" aria-label="${STRINGS.calendar.weekLabel}"></div>
            <button type="button" data-step="7" aria-label="${STRINGS.calendar.nextWeek}">›</button>
          </div>
          <div class="cal-month" hidden>
            <button type="button" data-mstep="-1" aria-label="${STRINGS.calendar.prevMonth}">‹</button>
            <div class="month-view"></div>
            <button type="button" data-mstep="1" aria-label="${STRINGS.calendar.nextMonth}">›</button>
          </div>
        </div>
      </div>
      <h1 class="cal-date"></h1>
      <p class="cal-reckonings utility"></p>
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

  // Same gesture, same direction, whichever grain is showing: a flick left is
  // forward in time. Bound to the containers, which survive every repaint.
  state.cleanups.push(
    onSwipe(el.querySelector('.cal-week'), { left: () => step(7), right: () => step(-7) }),
    onSwipe(el.querySelector('.cal-month'), { left: () => stepMonth(1), right: () => stepMonth(-1) }),
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

function select(iso) {
  if (iso === state.selected) return;
  const forward = iso > state.selected;
  state.selected = iso;
  state.monthCursor = null;
  history.replaceState(null, '', state.router.href(iso === todayIso() ? '/' : `/calendar/${iso}`));
  paintChrome();
  slotSwap(forward);
}

/**
 * Lands any roll still in flight, so a swap always starts from exactly one
 * panel. Without this a reader clicking two days inside the 300 ms roll got a
 * second panel appended beside the first: `querySelector('.day-panel')` finds
 * the *leaving* panel while a roll is on, so the entering one was never picked
 * up as the thing to replace and was never removed. The day then showed an
 * empty-day notice and a hero at once, and the orphan outlived every
 * subsequent navigation.
 */
function landRoll(viewport) {
  clearTimeout(state.rollTimer);
  state.rollTimer = null;
  for (const panel of viewport.querySelectorAll('.day-panel.slot-leaving')) panel.remove();
  for (const panel of viewport.querySelectorAll('.day-panel.slot-entering')) {
    panel.classList.remove('slot-entering');
  }
}

/** The day panel rolls in the direction of travel; chrome stays put. */
function slotSwap(forward) {
  const viewport = state.el.querySelector('.slot-viewport');
  landRoll(viewport);
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

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    old.replaceWith(next);
    wireDay(next);
    return;
  }
  viewport.classList.toggle('backward', !forward);
  old.classList.add('slot-leaving');
  next.classList.add('slot-entering');
  viewport.appendChild(next);
  wireDay(next);
  state.rollTimer = setTimeout(() => {
    old.remove();
    next.classList.remove('slot-entering');
    state.rollTimer = null;
  }, 300);
}

function paintChrome() {
  const { el, selected, data } = state;
  const today = todayIso();

  el.querySelector('.week-strip').innerHTML = weekOf(selected)
    .map((iso) => {
      const n = countFor(iso, data);
      const dots = Array.from({ length: Math.min(n, 5) }, () => '<i></i>').join('');
      const current = iso === selected ? ' aria-current="date"' : '';
      const cls = iso === today ? ' class="is-today"' : '';
      const density = n ? ` — ${fill(STRINGS.calendar.densityLabel, { count: n })}` : '';
      return `<button type="button" data-iso="${iso}"${current}${cls}
        aria-label="${dayFmt.format(utc(iso))}${density}">
        <span class="day-name">${weekdayFmt.format(utc(iso))}</span>
        <span class="day-num">${parseIso(iso).day}</span>
        <span class="density" aria-hidden="true">${dots}</span>
      </button>`;
    })
    .join('');
  for (const b of el.querySelectorAll('.week-strip [data-iso]')) {
    b.addEventListener('click', () => select(b.dataset.iso));
  }

  el.querySelector('.cal-date').textContent = dayFmt.format(utc(selected));

  const d = parseIso(selected);
  const jdn = gregorianToJdn(d.year, d.month, d.day);
  el.querySelector('.cal-reckonings').textContent = ['julian', 'coptic', 'ethiopian']
    .map((cal) => {
      const c = fromJdn(cal, jdn);
      const year = cal === 'julian' ? '' : ` ${c.year}`;
      return `${CALENDAR_LABELS[cal]} ${c.day} ${monthName(cal, c.month)}${year}`;
    })
    .join(' · ');

  if (state.monthOpen) paintMonth();
}

/* ---- month view ------------------------------------------------------- */

/**
 * The month replaces the week rather than opening beneath it: they answer the
 * same question at two grains, and showing both at once was two date pickers
 * competing for the same click.
 *
 * The month cross-fades in and out. A grid five rows tall appearing between
 * two frames is a jolt; the fade is deliberately slower than the day roll
 * because there is far more of it arriving. It only ever closes from this
 * button — picking a date leaves it open, so a reader comparing days does not
 * have to reopen the month between each one.
 */
function toggleMonth() {
  state.monthOpen = !state.monthOpen;
  const { el, monthOpen } = state;
  const month = el.querySelector('.cal-month');
  const week = el.querySelector('.cal-week');
  const button = el.querySelector('[data-month]');

  button.setAttribute('aria-expanded', String(monthOpen));
  button.classList.toggle('is-on', monthOpen);
  clearTimeout(state.monthTimer);

  // Reduced motion removes the fade, so there is nothing to wait for: waiting
  // anyway would be a delay with no animation behind it.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (monthOpen) {
    paintMonth();
    week.hidden = true;
    month.hidden = false;
    if (reduced) return month.classList.add('is-open');
    // One frame at opacity 0 in the layout, so the transition has a start.
    requestAnimationFrame(() => month.classList.add('is-open'));
    return;
  }

  month.classList.remove('is-open');
  if (reduced) {
    month.hidden = true;
    week.hidden = false;
    return;
  }
  state.monthTimer = setTimeout(() => {
    month.hidden = true;
    week.hidden = false;
    state.monthTimer = null;
  }, MONTH_FADE);
}

function paintMonth() {
  const { el, data, selected } = state;
  const cursor = state.monthCursor ?? (() => {
    const d = parseIso(selected);
    return { year: d.year, month: d.month };
  })();
  state.monthCursor = cursor;

  const first = toIsoDate({ year: cursor.year, month: cursor.month, day: 1 });
  const firstJdn = gregorianToJdn(cursor.year, cursor.month, 1);
  const lead = firstJdn % 7; // JDN 0 was a Monday
  const daysInMonth = (() => {
    let n = 28;
    while (parseIso(toIsoDate({ year: cursor.year, month: cursor.month, day: n + 1 }))) n++;
    return n;
  })();

  const dayNames = weekOf(first).map((iso) => weekdayFmt.format(utc(iso)));
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<span></span>');
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toIsoDate({ year: cursor.year, month: cursor.month, day });
    const n = countFor(iso, data);
    const dots = Array.from({ length: Math.min(n, 5) }, () => '<i></i>').join('');
    const current = iso === selected ? ' aria-current="date"' : '';
    cells.push(`<button type="button" data-iso="${iso}"${current}
      aria-label="${dayFmt.format(utc(iso))}">${day}<span class="density" aria-hidden="true">${dots}</span></button>`);
  }

  el.querySelector('.month-view').innerHTML = `
    <div class="month-head">
      <span class="month-name">${monthFmt.format(utc(first))}</span>
    </div>
    <div class="month-grid">
      ${dayNames.map((n) => `<span class="month-day-name utility">${n}</span>`).join('')}
      ${cells.join('')}
    </div>`;

  // Picking a date does not close the month: only the toggle does.
  for (const b of el.querySelectorAll('.month-grid [data-iso]')) {
    b.addEventListener('click', () => select(b.dataset.iso));
  }
}

function stepMonth(n) {
  const c = state.monthCursor;
  if (!c) return;
  const month = c.month + n;
  state.monthCursor = {
    year: c.year + Math.floor((month - 1) / 12),
    month: ((month - 1 + 12) % 12) + 1,
  };
  paintMonth();
}

/* ---- the day panel: hero + register ----------------------------------- */

function paintDay(panel) {
  const { data, selected } = state;
  const entries = entriesFor(selected, data);

  if (entries.length === 0) {
    panel.innerHTML = `<div class="empty-day"><p>${STRINGS.calendar.emptyDay}</p></div>`;
    return;
  }

  const heroSlug = pickHero(selected, entries, data.bySlug);
  const hero = data.bySlug.get(heroSlug);
  const heroChurches = entries.filter((e) => e.slug === heroSlug);

  const media = hero.image
    ? `<div class="hero-media" style="aspect-ratio:${hero.image.aspect};background-image:url('${BASE + hero.image.lqip}')">
        <img src="${BASE + hero.image.src}" alt="" width="${hero.image.w}" height="${hero.image.h}"
          style="view-transition-name:s-${hero.slug}-image" loading="eager" decoding="async" />
      </div>`
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
