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
 * The element needs the `touch-action` that leaves this gesture's axis to the
 * pointer events: `pan-y` for a horizontal grain, so the browser keeps sending
 * them while still scrolling the page vertically, and `pan-x` for a vertical
 * one (`axis: 'y'`, the month since 2026-10-03), which gives the gesture the
 * axis the page would otherwise scroll on.
 *
 * Three callbacks, because the caller owns the pixels:
 *   begin()          the drag is real; paint the neighbours and stop transitioning
 *   move(d)          live offset along the axis, every frame the pointer gives us
 *   end(d, dragged)  let go; settle to the nearest grain, or step, or return
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

/*
 * `ignore` is asked of the press's own target before anything else, and it
 * exists because two callers now bind to a whole *page* rather than to one row
 * (2026-09-02: "make sure on mobile you can swipe on daily page across the
 * whole page except the weekly display"). A page contains things that own the
 * horizontal gesture themselves — the week rail is a scroller, the month is a
 * grain with its own drag — and an outer listener would otherwise start a
 * second gesture from the same finger, because a press on the rail bubbles to
 * the page as readily as one on a heading.
 */
export function onGrainDrag(el, { begin, move, end, ignore, axis = 'x' }) {
  let start = null;
  let dragging = false;
  /* The axis the gesture is on, and the one a diagonal is given up to. The
     pair is read the same way in `onMove` and in `finish`, so a drag and a
     flick cannot disagree about which direction they were. */
  const along = (dx, dy) => (axis === 'y' ? dy : dx);
  const across = (dx, dy) => (axis === 'y' ? dx : dy);

  const down = (e) => {
    if (e.pointerType === 'mouse') return;
    if (ignore?.(e.target)) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragging = false;
  };

  const onMove = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!dragging) {
      if (Math.abs(along(dx, dy)) < SLOP) return;
      // A diagonal belongs to the scroll, and giving it up here rather than at
      // the end means the page keeps scrolling under the finger.
      if (Math.abs(along(dx, dy)) <= Math.abs(across(dx, dy))) {
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
    move?.(along(dx, dy));
  };

  const finish = (e, cancelled) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = cancelled ? 0 : e.clientX - start.x;
    const dy = cancelled ? 0 : e.clientY - start.y;
    const wasDragging = dragging;
    start = null;
    dragging = false;

    const flicked =
      !wasDragging &&
      Math.abs(along(dx, dy)) >= SETTLE &&
      Math.abs(along(dx, dy)) > Math.abs(across(dx, dy));
    // A gesture that ends over a date would otherwise also select it — a flick
    // across the week landing on Thursday changed the week and then picked a
    // day in it. The next click is swallowed at the capture phase, once.
    if (wasDragging || flicked) {
      el.addEventListener('click', swallow, { capture: true, once: true });
      // Nothing to swallow if the finger lifted over empty space, so the
      // listener cannot be left armed for the reader's next real click.
      setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);
    }
    if (wasDragging || flicked) end?.(along(dx, dy), wasDragging);
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
