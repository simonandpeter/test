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
 * **The page comes with it** (author, 2026-08-26: "make the animation twice as
 * fast, and make the rest of the page go back up smoothly not just clicking
 * into place higher on the page"). These panels sit in the flow, so hiding one
 * at the end of its flight used to drop everything below it by the panel's
 * whole height in a single frame — the flight was smooth and its consequence
 * was not. The `collapse` option animates the space closed over the same
 * duration, and the flier is pinned out of flow first so the closing box
 * cannot clip it.
 *
 * Which makes reduced motion the interesting case. DESIGN.md §6: reduced
 * motion **removes**, never shortens — so there is no flight and no collapse
 * at all, and `done` runs at once. The information the flight carried is not
 * lost with it: both controls carry the whole sentence as their accessible
 * name («Русская — change which church's calendar the site shows»), which is
 * the same lesson in the channel that reader is actually using.
 */

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * How long the flight takes. 320 ms until 2026-08-26, halved at the author's
 * instruction: at this size the gesture is legible well under a fifth of a
 * second, and a teaching animation that outstays its lesson is a delay. The
 * timer is the guard against a transition that never ends — a tab hidden
 * mid-flight fires no `transitionend`.
 */
const FLIGHT = 160;

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

/**
 * Shrinks `el` towards `target` and fades it out, then calls `done`. The
 * element is left transformed: callers remove or hide it in `done`, which is
 * the only correct ending — an element left flown is invisible but still on
 * the page.
 *
 * `collapse` closes the space the panel was holding, over the same duration:
 * pass the in-flow box to collapse (the header's `.church-panel`), or the
 * string `'self'` when the flier *is* that box, in which case a placeholder
 * of its size is stood in its place and taken away at the end.
 */
export function flyInto(el, target, done = () => {}, { collapse = null } = {}) {
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

  /*
   * Out of the flow before anything moves. Fixed to the viewport rather than
   * absolute to the page, because the rect above is a viewport rect and the
   * flight is over in 160 ms — far too short for a scroll to make the
   * difference matter, and far simpler than finding an offset parent.
   */
  let box = null;
  let stand = null;
  if (collapse) {
    box = collapse === 'self' ? el.parentElement && document.createElement('div') : collapse;
    if (collapse === 'self' && box) {
      stand = box;
      stand.style.height = `${from.height}px`;
      stand.style.marginBottom = getComputedStyle(el).marginBottom;
      el.parentElement.insertBefore(stand, el);
    }
    const held = (stand ?? box)?.getBoundingClientRect().height ?? 0;
    el.style.position = 'fixed';
    el.style.left = `${from.left}px`;
    el.style.top = `${from.top}px`;
    el.style.width = `${from.width}px`;
    el.style.margin = '0';
    const shrinking = stand ?? box;
    if (shrinking) {
      shrinking.style.overflow = 'hidden';
      shrinking.style.height = `${held}px`;
      shrinking.style.transition = `height ${FLIGHT}ms ${EASE}, margin ${FLIGHT}ms ${EASE}`;
    }
  }

  el.style.transformOrigin = 'center';
  el.style.pointerEvents = 'none';
  el.style.transition = `transform ${FLIGHT}ms ${EASE}, opacity ${FLIGHT}ms ease-in`;

  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
    el.style.pointerEvents = '';
    el.style.transformOrigin = '';
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.width = '';
    el.style.margin = '';
    if (stand) stand.remove();
    else if (box) {
      box.style.overflow = '';
      box.style.height = '';
      box.style.transition = '';
    }
    done();
  };
  el.addEventListener('transitionend', finish, { once: true });
  setTimeout(finish, FLIGHT + 80);

  requestAnimationFrame(() => {
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    el.style.opacity = '0';
    const shrinking = stand ?? box;
    if (shrinking) {
      shrinking.style.height = '0px';
      shrinking.style.marginBottom = '0px';
    }
  });
}
