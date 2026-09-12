/**
 * The one width the site changes its mind at, and the only place it is written.
 *
 * **1024 px is the Daily page's boundary** — two columns above it,
 * `display: contents` below (PLAN.md §4) — and it is also where three controls
 * the author called "desktop only" stop existing: the full-screen calendar's
 * opener (2026-09-02, "this was only ever supposed to be a desktop only
 * addition"), the reckoning chooser (2026-09-02, "have the ability only on
 * desktop to click on this"), and with the chooser the choice itself
 * (`lib/church.js`'s `calendarFor`).
 *
 * It is not the site's only breakpoint — `main.js` turns the nav into a strip
 * at 760 and All Saints picks its opening face at 700 — and those are theirs.
 * What is here is the one number two unrelated modules would otherwise each
 * have written down, which is how a breakpoint drifts.
 *
 * **No `matchMedia` means wide**, and that default is load-bearing: the unit
 * tests run in bare node and expect a church's own reckoning, not a phone's.
 */
export const WIDE = '(min-width: 1024px)';

export const isWide = () => typeof matchMedia !== 'function' || matchMedia(WIDE).matches;

/**
 * Calls `fn` when the window crosses 1024 px in either direction, and returns
 * a teardown.
 *
 * A repaint rather than a stylesheet, because what changes across this line is
 * not only how the column is drawn: the month caption stops being a button and
 * the reckoning stops being the church's, and neither of those is something
 * CSS can say. A reader who drags a window narrow — or turns a tablet — gets
 * the page the new width is owed rather than the one the last day-step drew.
 *
 * No-ops without `matchMedia`, so a caller need not guard.
 */
export function onWideChange(fn) {
  if (typeof matchMedia !== 'function') return () => {};
  const mq = matchMedia(WIDE);
  const on = () => fn(mq.matches);
  mq.addEventListener('change', on);
  return () => mq.removeEventListener('change', on);
}
