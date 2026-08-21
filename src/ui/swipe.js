/**
 * Horizontal swipe, for the calendar's week strip and month grid.
 *
 * Touch and pen only. A mouse drag across a date grid is a text selection or a
 * misfire, not a gesture, and stealing it would break selecting a date range
 * by eye — the pointer types are told apart rather than guessed at from
 * timings.
 *
 * The element needs `touch-action: pan-y` so the browser keeps sending pointer
 * events for a horizontal drag while still scrolling the page vertically.
 *
 * A swipe that ends on a button would otherwise also click it — a flick across
 * the week landing on Thursday would change the week and then select a day in
 * it. The next click after a recognised swipe is swallowed at the capture
 * phase, once.
 */

const THRESHOLD = 45;

export function onSwipe(el, { left, right }) {
  let start = null;

  const down = (e) => {
    start = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
  };

  const cancel = () => {
    start = null;
  };

  const up = (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    // Far enough, and more across than down: a diagonal belongs to the scroll.
    if (Math.abs(dx) < THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;

    el.addEventListener('click', swallow, { capture: true, once: true });
    // Nothing to swallow if the finger lifted off empty space, so the listener
    // cannot be left armed for the reader's next real click.
    setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);

    (dx < 0 ? left : right)?.();
  };

  const swallow = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('pointerleave', cancel);

  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
    el.removeEventListener('pointerleave', cancel);
    el.removeEventListener('click', swallow, { capture: true });
  };
}
