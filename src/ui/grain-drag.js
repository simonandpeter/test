/**
 * Hold-and-slide for the calendar's two grains (author, 2026-08-21). The week
 * or the month follows the finger, and lets go into the grain it is nearest.
 *
 * Touch and pen only, still. A mouse drag across a date grid is a text
 * selection or a misfire, not a gesture, and stealing it would break selecting
 * a date by eye — the pointer types are told apart rather than guessed at from
 * timings. That is also why the peeked edges stay buttons: a reader with a
 * mouse has no gesture here at all, so they need something to click.
 *
 * The element needs `touch-action: pan-y` so the browser keeps sending pointer
 * events for a horizontal drag while still scrolling the page vertically.
 *
 * Three callbacks, because the caller owns the pixels:
 *   begin()          the drag is real; paint the neighbours and stop transitioning
 *   move(dx)         live offset, every frame the pointer gives us
 *   end(dx, dragged) let go; settle to the nearest grain, or step, or return
 *
 * `dragged` is false when the pointer never moved far enough to be a drag but
 * travelled far enough to be a flick — which is what a fast swipe looks like
 * when the browser coalesces its moves, and what a synthetic pointerdown /
 * pointerup pair looks like in a test.
 */

/** Where a hold stops being a tap and starts being a drag. */
const SLOP = 8;
/**
 * Where a gesture has gone far enough to mean the next grain (author,
 * 2026-08-21). A flat distance rather than a fraction of the grain, because a
 * finger is the same size on a phone as on a tablet and the grain is not: a
 * third of the width, which is what this was, meant a 210 px haul on a wide
 * screen and snapped back from anything a reader would call a swipe.
 */
export const SETTLE = 36;

export function onGrainDrag(el, { begin, move, end }) {
  let start = null;
  let dragging = false;

  const down = (e) => {
    if (e.pointerType === 'mouse') return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragging = false;
  };

  const onMove = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!dragging) {
      if (Math.abs(dx) < SLOP) return;
      // A diagonal belongs to the scroll, and giving it up here rather than at
      // the end means the page keeps scrolling under the finger.
      if (Math.abs(dx) <= Math.abs(dy)) {
        start = null;
        return;
      }
      dragging = true;
      // Capture, so a finger that wanders off the row vertically keeps the
      // grain it is holding rather than dropping it mid-drag.
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // A synthetic pointer has nothing to capture; the drag still tracks.
      }
      begin?.();
    }
    move?.(dx);
  };

  const finish = (e, cancelled) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = cancelled ? 0 : e.clientX - start.x;
    const dy = cancelled ? 0 : e.clientY - start.y;
    const wasDragging = dragging;
    start = null;
    dragging = false;

    const flicked = !wasDragging && Math.abs(dx) >= SETTLE && Math.abs(dx) > Math.abs(dy);
    // A gesture that ends over a date would otherwise also select it — a flick
    // across the week landing on Thursday changed the week and then picked a
    // day in it. The next click is swallowed at the capture phase, once.
    if (wasDragging || flicked) {
      el.addEventListener('click', swallow, { capture: true, once: true });
      // Nothing to swallow if the finger lifted over empty space, so the
      // listener cannot be left armed for the reader's next real click.
      setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);
    }
    if (wasDragging || flicked) end?.(dx, wasDragging);
  };

  const up = (e) => finish(e, false);
  const cancel = (e) => finish(e, true);

  const swallow = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);

  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
    el.removeEventListener('click', swallow, { capture: true });
  };
}
