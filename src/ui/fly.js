/**
 * A panel that has been answered goes back where it came from (author,
 * 2026-08-25 evening: "have an animation showing the pop-up shrink and fade
 * into the button it comes from so people remember where to click to make
 * changes. E.g. calendar pop-up upon closing shrinks and fades off into the
 * calendar button in the top left on mobile or top right on desktop").
 *
 * It is a teaching gesture, not decoration. The site asks two questions on a
 * first visit and then hides both answers behind two small controls in the
 * header; a reader who answers and never sees where the answer went has to go
 * hunting the next time they want to change it. The flight *is* the
 * instruction, and it is over before the reader could have read a sentence
 * saying the same thing.
 *
 * Which makes reduced motion the interesting case. DESIGN.md §6: reduced
 * motion **removes**, never shortens — so there is no flight at all, and
 * `done` runs at once. The information the flight carried is not lost with
 * it: both controls carry the whole sentence as their accessible name
 * («Русская — change which church's calendar the site shows»), which is the
 * same lesson in the channel that reader is actually using.
 */

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How long the flight takes, and the guard against a transition that never
 *  ends — a tab hidden mid-flight fires no transitionend. */
const FLIGHT = 320;

/**
 * Shrinks `el` towards `target` and fades it out, then calls `done`. The
 * element is left transformed: callers remove or hide it in `done`, which is
 * the only correct ending — an element left flown is invisible but still on
 * the page.
 */
export function flyInto(el, target, done = () => {}) {
  if (!el || !target || reducedMotion() || typeof el.getBoundingClientRect !== 'function') {
    done();
    return;
  }
  const from = el.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) {
    done();
    return;
  }

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  // Towards the control's own size, floored so the panel never collapses to a
  // point and reads as a disappearance rather than a journey.
  const scale = Math.max(0.12, Math.min(to.width / from.width, 0.6));

  el.style.transformOrigin = 'center';
  el.style.pointerEvents = 'none';
  el.style.transition = `transform ${FLIGHT}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${FLIGHT}ms ease-in`;

  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
    el.style.pointerEvents = '';
    el.style.transformOrigin = '';
    done();
  };
  el.addEventListener('transitionend', finish, { once: true });
  setTimeout(finish, FLIGHT + 80);

  requestAnimationFrame(() => {
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    el.style.opacity = '0';
  });
}
