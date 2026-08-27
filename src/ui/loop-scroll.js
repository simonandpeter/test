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
 * **What came back on 2026-08-27:** the wheel, asked for so that a card which
 * has gone past can be fetched back ("allow a bit of horizontal scrolling on
 * desktop with the mouse wheel ... so if something goes off screen that caught
 * your interest you can go back. But limit the scroll speed so the images load
 * well"). It is expressed as *velocity* rather than as the old build's second
 * position eased toward: a notch adds to `wheelVel`, which is clamped to
 * `wheelMax` px/s and decays. That clamp is the whole point — it is what a
 * spun wheel cannot exceed, so the window of loaded images ahead of the row
 * (see `windowImages`) always has time to fill. One authority over
 * `scrollLeft` is kept: the wheel moves `pos`, the same variable the drift
 * moves, and `wrap()` corrects both.
 *
 * **What is new:** the drift runs *continuously* rather than after five idle
 * seconds, because here it is the mode's whole reason for being, and it stands
 * down while a reader is touching the track or tabbed into it.
 *
 * **It does not stand down for the pointer** (author, 2026-08-27: "when
 * hovering over a saint, the carousel stops, but it should keep going"). A
 * mouse resting anywhere over a full-bleed row is the ordinary state of a
 * desktop reader — the cursor has to be somewhere — so pausing on hover meant
 * the row was stopped most of the time it was being looked at.
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
 * Holds only the pictures near the viewport, and lets go of the rest (author,
 * 2026-08-27: "It is also quite slow and laggy, maybe only render whats on
 * screen and 2-3 cards just off screen as well").
 *
 * **The nodes are never removed, only their `src`.** The track's whole
 * arithmetic is read from real offsets — `measure()` above — so taking cards
 * out of the DOM would move every offset after them and the wrap would stop
 * landing on identical content. What is expensive here is not the empty
 * `<a>`: it is a decoded bitmap per card held live while the row is composited
 * every frame, and that is what this releases.
 *
 * Releasing a `src` is layout-safe *only because* every `<img>` carries its
 * `width` and `height` attributes: the UA style sheet turns those into an
 * `aspect-ratio`, so the box keeps its exact size with no picture in it. Drop
 * the attributes and this silently becomes a reflow on every scroll.
 *
 * `margin` is in pixels either side of the track's own box. It should be a
 * few cards wide — the request was two or three — and it works with the
 * wheel's speed clamp: a bounded speed turns a fixed distance into a
 * guaranteed decode time, which is why neither number is meaningful alone.
 */
export function windowImages(track, { margin = 700 } = {}) {
  if (typeof IntersectionObserver !== 'function') {
    // No observer is not a reason to show an empty row: hand every picture its
    // source at once and behave exactly as the build did before this existed.
    for (const img of track.querySelectorAll('img[data-src]')) img.src = img.dataset.src;
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const img = e.target.querySelector('img[data-src]');
        if (!img) continue;
        if (e.isIntersecting) {
          if (img.getAttribute('src') !== img.dataset.src) img.src = img.dataset.src;
        } else if (img.hasAttribute('src')) {
          img.removeAttribute('src');
        }
      }
    },
    { root: track, rootMargin: `0px ${margin}px` },
  );
  for (const card of track.children) io.observe(card);
  return () => io.disconnect();
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
export function loopScroll(
  track,
  count,
  { buffer = 12, speed = 26, startAt = null, wheelMax = 900, wheelGain = 1.4, wheelDecay = 0.94 } = {},
) {
  let headSpan = 0; // where the first real item starts
  let bodySpan = 0; // one full period, first real item to the copy after the run
  let lowerBound = 0; // one item in from the true leading edge

  let started = false;
  let touchActive = false;
  let touchSettle = 0;
  let paused = false;
  let focused = false;
  let raf = null;
  let pos = null;
  let lastWritten = -1;
  let currentSpeed = 0;
  let wheelVel = 0;
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
      lastWritten = track.scrollLeft;
      if (pos !== null) pos *= next / bodySpan;
    }
    bodySpan = next;
    headSpan = first ? first.offsetLeft : 0;
    lowerBound = edge ? edge.offsetLeft : 0;
    // Open on the first *real* item rather than at the DOM's true edge, which
    // is `buffer` copies back — or, where the caller remembers one, on the
    // offset the row was left at. Only before the reader has touched it: after
    // that, where the track sits is their business.
    if (!started && headSpan) {
      started = true;
      const at = startAt ?? headSpan;
      track.scrollLeft = at;
      lastWritten = track.scrollLeft;
      pos = track.scrollLeft;
      wrap();
      pos = track.scrollLeft;
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
    if (delta) {
      track.scrollLeft = at + delta;
      lastWritten = track.scrollLeft;
    }
    return delta;
  }

  const onScroll = () => {
    /*
     * **Whose scroll was that?** The drift writes `scrollLeft` every frame, and
     * every one of those writes comes back through here. The test used to be
     * `!raf` — "no frame is scheduled, so it cannot have been us" — which is
     * never true while the drift is running, so the answer was always *ours*
     * and a scroll from anybody else was silently discarded: the next frame
     * wrote the drift's own stale `pos` straight back over it. That undid a
     * reader's drag and threw away the offset the carousel was asked to
     * reopen at.
     *
     * The honest test is the position itself. Anything that is not what the
     * drift last wrote came from somewhere else — a finger, a wheel, a caller
     * — and that is the authority.
     */
    if (Math.abs(track.scrollLeft - lastWritten) > 1) pos = track.scrollLeft;
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
  /*
   * A notch of the wheel is a push, not a destination. `wheelVel` is clamped
   * to `wheelMax` px/s however hard the wheel is spun, which is what keeps a
   * flick from outrunning the images: `windowImages` loads a fixed distance
   * ahead of the row, and a capped speed is what turns that distance into a
   * guaranteed amount of *time* for a picture to decode.
   *
   * The dominant axis wins, so a trackpad's sideways swipe reads as naturally
   * as a mouse's only wheel. `preventDefault` is why the listener cannot be
   * passive — and it is the trade this makes: over the row the wheel drives
   * the row, so a reader scrolling the *page* has to be off it. The row is a
   * band rather than a screenful, and the page moves anywhere above or below.
   *
   * **`wheelDecay` is a distance, not a feel.** At 0.86 a notch spent itself in
   * about a tenth of a second and a hard spin bought 64 px — a quarter of one
   * desktop card, which is not "going back" to anything. 0.94 is a ~270 ms
   * tail, so one notch travels about a third of a card and a reader who keeps
   * spinning holds the clamp for as long as they spin. The cap still decides
   * how *fast*; this decides how far a hand's worth of it carries.
   */
  const onWheel = (e) => {
    if (reducedMotion()) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!delta) return;
    e.preventDefault();
    if (pos === null) pos = track.scrollLeft;
    wheelVel = Math.max(-wheelMax, Math.min(wheelMax, wheelVel + delta * wheelGain));
    // The drift is eased back up from wherever the wheel leaves the row, not
    // snapped, so letting go of the wheel does not read as a second push.
    currentSpeed = 0;
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
  track.addEventListener('wheel', onWheel, { passive: false });
  track.addEventListener('focusin', onFocusIn);
  track.addEventListener('focusout', onFocusOut);

  const still = () => paused || focused || touchActive || performance.now() < touchSettle;

  function frame(now) {
    const dt = Math.min(now - last, 50);
    last = now;
    raf = requestAnimationFrame(frame);

    /*
     * **Until the row has real geometry, keep asking for it.** `measure()` runs
     * once from the constructor, and if the track is not laid out at that
     * moment every offset reads 0 — so `bodySpan` is 0, `wrap()` returns
     * early, and `started` never latches: the row drifts from wherever it
     * happens to be, with no period to correct against, until it runs off the
     * true end of the clone buffer.
     *
     * This was survivable only by accident before 2026-08-27. Each `<img>`
     * carried a `load` listener that re-measured, so the first picture to
     * arrive repaired the geometry. Then the pictures stopped loading on their
     * own (`windowImages` hands out sources now) and the accident stopped
     * happening — the row opened at 62 px instead of the first real item, with
     * no wrap at all. The repair belongs here, where the failure is, and not
     * in whatever else the caller happens to be doing.
     *
     * It costs a forced layout per frame only while the answer is still 0.
     */
    if (!started || !bodySpan) measure();

    // The cheap questions first: `clientWidth` forces a layout, and there is no
    // reason to pay for one on a frame that was never going to move anyway —
    // which under reduced motion is every frame.
    //
    // The width is still asked, second: an unrendered track cannot scroll. It
    // reads back 0 and ignores writes, so drifting against one throws away the
    // position it will be restored to the moment it is shown again.
    if (still() || reducedMotion() || !track.clientWidth) {
      currentSpeed = 0;
      wheelVel = 0;
      pos = null;
      return;
    }
    if (pos === null) pos = track.scrollLeft;
    // Eased up to cruising speed rather than snapped to it, on the same shape
    // the old build used for its wheel decay, run the other way.
    currentSpeed += (speed - currentSpeed) * 0.06;
    /*
     * The wheel's own velocity, decaying toward nothing, added to the drift's.
     * Added rather than substituted: a small nudge forward should read as the
     * row briefly hurrying, and a push *backwards* strong enough to beat the
     * drift carries the row back — which is the whole request. When it has
     * decayed away the drift is simply what is left, with no handover to see.
     */
    if (wheelVel) {
      wheelVel *= wheelDecay ** (dt / 16.67);
      if (Math.abs(wheelVel) < 1) wheelVel = 0;
    }
    pos += (currentSpeed + wheelVel) * (dt / 1000);
    track.scrollLeft = pos;
    lastWritten = track.scrollLeft;
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
      wheelVel = 0;
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
      track.removeEventListener('wheel', onWheel);
      track.removeEventListener('focusin', onFocusIn);
      track.removeEventListener('focusout', onFocusOut);
    },
  };
}
