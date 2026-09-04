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

import { reducedMotion } from '../lib/motion.js';

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
 * **Both directions return their own `finish`**, and a caller that can start
 * one flight while another is in the air must call it first. This is
 * Amendment 9's rule — land whatever is still moving before the next move
 * starts — arriving here the moment there were two directions to collide:
 * `flyInto` reads `el.getBoundingClientRect()` to decide where the control is
 * *from*, and a box halfway through arriving is at neither end of its
 * journey, so the flight home sets off in the wrong direction and by the
 * wrong distance. `src/ui/swap.js` owns the same rule for the four animated
 * swaps; this is the fifth mechanism and it keeps its own token because it is
 * a pair of directions on one element rather than two copies of one thing.
 */

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
/**
 * Where the panel sits relative to the control it belongs to, and how small it
 * is when it is there. Shared by both directions so the flight out and the
 * flight home are the same journey travelled opposite ways — if these numbers
 * were computed twice they would drift the first time either was tuned.
 */
const journey = (panelRect, controlRect) => ({
  dx: controlRect.left + controlRect.width / 2 - (panelRect.left + panelRect.width / 2),
  dy: controlRect.top + controlRect.height / 2 - (panelRect.top + panelRect.height / 2),
  // Towards the control's own size, floored so the panel never collapses to a
  // point and reads as a disappearance rather than a journey.
  scale: Math.max(0.12, Math.min(controlRect.width / panelRect.width, 0.6)),
});

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

  const { dx, dy, scale } = journey(from, to);

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
  return finish;
}

/**
 * The reverse of `flyInto`, and deliberately the *same* journey run backwards
 * (author, 2026-08-26 evening: "when you click on the language or church
 * selector, please add the same animations to the popups (and the other items
 * on the page that move out of the way to accommodate the popups) as the
 * animations when you close them. the exact reverse").
 *
 * The panel grew instantly and the page below it jumped down by the panel's
 * whole height in one frame, while closing it had had a flight and a collapse
 * since 2026-08-25. So the gesture taught where the answer lived only on the
 * way home; on the way out it appeared from nowhere. Both halves are the same
 * two numbers now — `journey()` — and the same 160 ms and the same easing.
 *
 * `expand` is the in-flow band, the mirror of `collapse`: it opens from
 * nothing to the height it was measured at, so what is under the header comes
 * down with the panel rather than being displaced ahead of it.
 *
 * Reduced motion removes it whole, as §6 requires and as `flyInto` does: no
 * flight, no expansion, `done()` at once. Nothing is lost — the panel is
 * simply there, which is what it was before this existed.
 */
export function flyOutOf(el, source, done = () => {}, { expand = null } = {}) {
  if (!el || !source || reducedMotion() || typeof el.getBoundingClientRect !== 'function') {
    done();
    return;
  }
  const from = el.getBoundingClientRect();
  const to = source.getBoundingClientRect();
  if (!from.width || !to.width) {
    done();
    return;
  }

  const { dx, dy, scale } = journey(from, to);

  /*
   * The band's natural height is read *before* the flier leaves the flow,
   * because once it is `position: fixed` the band has nothing in it to be
   * tall for. This is the one ordering that matters here, and it is the same
   * reason `flyInto` reads its `held` height before pinning.
   */
  const band = expand ?? null;
  const full = band ? band.getBoundingClientRect().height : 0;

  el.style.position = 'fixed';
  el.style.left = `${from.left}px`;
  el.style.top = `${from.top}px`;
  el.style.width = `${from.width}px`;
  el.style.margin = '0';
  el.style.transformOrigin = 'center';
  el.style.transition = 'none';
  el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
  el.style.opacity = '0';
  if (band) {
    band.style.overflow = 'hidden';
    band.style.transition = 'none';
    band.style.height = '0px';
  }

  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
    el.style.transformOrigin = '';
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.width = '';
    el.style.margin = '';
    if (band) {
      band.style.overflow = '';
      band.style.height = '';
      band.style.transition = '';
    }
    done();
  };
  el.addEventListener('transitionend', finish, { once: true });
  setTimeout(finish, FLIGHT + 80);

  /*
   * A forced layout between the two values, for the reason DESIGN.md §5b
   * gives about the month unfurling: without a flush the browser coalesces
   * the start and the end into one recalculation and there is no transition
   * left to run. `flyInto` gets this free from its `requestAnimationFrame`;
   * this direction sets its start state in the same task and has to ask.
   */
  void el.offsetHeight;
  el.style.transition = `transform ${FLIGHT}ms ${EASE}, opacity ${FLIGHT}ms ease-out`;
  el.style.transform = 'translate(0, 0) scale(1)';
  el.style.opacity = '1';
  if (band) {
    band.style.transition = `height ${FLIGHT}ms ${EASE}, margin ${FLIGHT}ms ${EASE}`;
    band.style.height = `${full}px`;
  }
  return finish;
}
