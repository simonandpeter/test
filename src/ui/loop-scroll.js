/**
 * An endless horizontal track, and the drift that carries it.
 *
 * This is the cross-church build's carousel brought forward (its own source is
 * in `Agios Website Ex/Backup/260820_01`), keeping the four things that build
 * learned the hard way and dropping the parts that were only there for a
 * ten-saint corpus.
 *
 * **What is kept, and why each one is load-bearing:**
 *
 * 1. **Native scrolling, never `touch-action: none`.** The track is an ordinary
 *    overflow scroller, so Chromium can put it on its own composited layer. The
 *    old build measured the difference: taking the gesture over in JS forces
 *    `scrollLeft` writes onto the main thread, and that is where the visible
 *    jitter came from.
 * 2. **A clone buffer, and corrections by a whole period.** The track renders
 *    `buffer` copies before the real run and `buffer` after it. When the
 *    position leaves the middle, it is moved by exactly `bodySpan` — one full
 *    period — which lands on identical content, so the correction cannot be
 *    seen. This is why the seam never shows.
 * 3. **Geometry read from real offsets, not multiplied out from one card.**
 *    Cards are sized from their own icon, so there is no single stride that
 *    describes the row. `measure()` reads the offsets that are actually there,
 *    which stays exact whatever the individual widths are.
 * 4. **Never write `scrollLeft` while a touch or its momentum is live.** On
 *    Android that does not merely fail to stick — it desyncs the browser's own
 *    touch tracking for the element and the track stops answering gestures
 *    altogether. Corrections wait for the gesture to finish.
 *
 * **What is dropped:** the old wheel tween. It existed to give a ten-item row
 * its own easing; a native scroller with `scroll-behavior: smooth` does the
 * same job here without a second position to keep in step, and one authority
 * over `scrollLeft` is one fewer thing to desync.
 *
 * **What is new:** the drift runs *continuously* rather than after five idle
 * seconds, because here it is the mode's whole reason for being, and it stands
 * down while a reader is touching, hovering, or tabbed into the track.
 */

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The rendered run for a track: `buffer` copies, the real items, `buffer` more.
 * Indices wrap, so the copies are literal repeats of the run itself and the
 * rendered row really is periodic.
 */
export function loopSlice(list, buffer) {
  const n = list.length;
  if (!n) return [];
  const out = [];
  for (let i = -buffer; i < n + buffer; i++) out.push(list[((i % n) + n) % n]);
  return out;
}

/**
 * A run long enough to be worth looping.
 *
 * With very few items the period is so short against an ordinary scroll speed
 * that the track wraps almost every frame, which reads as juddering in place
 * even though the arithmetic is right. Repeating the run to a floor fixes it
 * without inventing any data — the same saints, come round sooner.
 */
export function loopSafe(list, min = 10) {
  const n = list.length;
  if (!n || n >= min) return list.slice();
  const out = [];
  for (let r = 0; r < Math.ceil(min / n); r++) out.push(...list);
  return out;
}

/**
 * Wires an already-populated track for endless scrolling.
 *
 * `track` holds `loopSlice(items, buffer)` children in order. `count` is the
 * length of the real run — the period, in items.
 *
 * Returns `{ measure, destroy, pause, resume }`. Call `measure()` whenever the
 * children change size or the track goes from hidden to shown: a hidden
 * element reports `scrollLeft` 0 and ignores writes, which silently throws the
 * position away.
 */
export function loopScroll(track, count, { buffer = 12, speed = 26 } = {}) {
  let headSpan = 0; // where the first real item starts
  let bodySpan = 0; // one full period, first real item to the copy after the run
  let lowerBound = 0; // one item in from the true leading edge

  let started = false;
  let touchActive = false;
  let touchSettle = 0;
  let paused = false;
  let hovered = false;
  let focused = false;
  let raf = null;
  let pos = null;
  let currentSpeed = 0;
  let last = performance.now();

  function measure() {
    const first = track.children[buffer];
    const afterBody = track.children[buffer + count];
    const edge = track.children[1];
    const next = first && afterBody ? afterBody.offsetLeft - first.offsetLeft : 0;
    // A resize changes every card's width. Rescaling the live position by the
    // same ratio keeps it valid instead of drifting further from the content
    // with each resize until the wrap arithmetic no longer lands on a copy.
    if (bodySpan && next && bodySpan !== next) {
      track.scrollLeft = track.scrollLeft * (next / bodySpan);
      if (pos !== null) pos *= next / bodySpan;
    }
    bodySpan = next;
    headSpan = first ? first.offsetLeft : 0;
    lowerBound = edge ? edge.offsetLeft : 0;
    // Open on the first *real* item rather than at the DOM's true edge, which
    // is `buffer` copies back. Only before the reader has touched it: after
    // that, where the track sits is their business.
    if (!started && headSpan) {
      started = true;
      track.scrollLeft = headSpan;
      pos = headSpan;
    }
  }

  /** Brings the position back into the middle. Returns the delta applied. */
  function wrap() {
    if (bodySpan <= 0 || touchActive || performance.now() < touchSettle) return 0;
    const upper = headSpan + bodySpan;
    const at = track.scrollLeft;
    let delta = 0;
    if (at < lowerBound) delta = Math.ceil((lowerBound - at) / bodySpan) * bodySpan;
    else if (at > upper) delta = -Math.ceil((at - upper) / bodySpan) * bodySpan;
    if (delta) track.scrollLeft = at + delta;
    return delta;
  }

  const onScroll = () => {
    // The reader's own scrolling is the authority on where the track is; the
    // drift picks up from wherever they left it.
    if (pos !== null && !raf) pos = track.scrollLeft;
    wrap();
  };
  const onTouchStart = () => {
    touchActive = true;
    currentSpeed = 0;
    pos = null;
  };
  const onTouchEnd = () => {
    touchActive = false;
    // Momentum outlives the finger. Corrections stay off until it has run its
    // course, which the clone buffer is sized to survive.
    touchSettle = performance.now() + 700;
  };
  const onEnter = () => {
    hovered = true;
    currentSpeed = 0;
    pos = null;
  };
  const onLeave = () => {
    hovered = false;
  };
  const onFocusIn = () => {
    focused = true;
    pos = null;
  };
  const onFocusOut = () => {
    focused = false;
  };

  track.addEventListener('scroll', onScroll, { passive: true });
  track.addEventListener('touchstart', onTouchStart, { passive: true });
  track.addEventListener('touchend', onTouchEnd, { passive: true });
  track.addEventListener('touchcancel', onTouchEnd, { passive: true });
  track.addEventListener('pointerenter', onEnter);
  track.addEventListener('pointerleave', onLeave);
  track.addEventListener('focusin', onFocusIn);
  track.addEventListener('focusout', onFocusOut);

  const still = () => paused || hovered || focused || touchActive || performance.now() < touchSettle;

  function frame(now) {
    const dt = Math.min(now - last, 50);
    last = now;
    raf = requestAnimationFrame(frame);

    // The cheap questions first: `clientWidth` forces a layout, and there is no
    // reason to pay for one on a frame that was never going to move anyway —
    // which under reduced motion is every frame.
    //
    // The width is still asked, second: an unrendered track cannot scroll. It
    // reads back 0 and ignores writes, so drifting against one throws away the
    // position it will be restored to the moment it is shown again.
    if (still() || reducedMotion() || !track.clientWidth) {
      currentSpeed = 0;
      pos = null;
      return;
    }
    if (pos === null) pos = track.scrollLeft;
    // Eased up to cruising speed rather than snapped to it, on the same shape
    // the old build used for its wheel decay, run the other way.
    currentSpeed += (speed - currentSpeed) * 0.06;
    pos += currentSpeed * (dt / 1000);
    track.scrollLeft = pos;
    // Corrected in the same frame, synchronously, rather than through the
    // async scroll event — which would race the next nudge.
    pos += wrap();
  }

  measure();
  raf = requestAnimationFrame(frame);

  const onResize = () => measure();
  window.addEventListener('resize', onResize);

  return {
    measure,
    pause() {
      paused = true;
      currentSpeed = 0;
      pos = null;
    },
    resume() {
      paused = false;
      last = performance.now();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      window.removeEventListener('resize', onResize);
      track.removeEventListener('scroll', onScroll);
      track.removeEventListener('touchstart', onTouchStart);
      track.removeEventListener('touchend', onTouchEnd);
      track.removeEventListener('touchcancel', onTouchEnd);
      track.removeEventListener('pointerenter', onEnter);
      track.removeEventListener('pointerleave', onLeave);
      track.removeEventListener('focusin', onFocusIn);
      track.removeEventListener('focusout', onFocusOut);
    },
  };
}
