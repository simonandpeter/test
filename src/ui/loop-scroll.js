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

import { reducedMotion } from '../lib/motion.js';

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
 * How many pictures this row may have on the wire at once.
 *
 * Not a guess at the connection: a cap exists so that the two icons on screen
 * are never queued behind six the reader has not reached. Four leaves the
 * pipe busy while a picture decodes and still lets the on-screen tier take
 * every slot within one round trip of the reader arriving somewhere new.
 */
const MAX_INFLIGHT = 4;

/** The three tiers `pump` sorts by: on screen, coming, going. */
const ON_SCREEN = 0;
const AHEAD = 1;
const BEHIND = 2;

/**
 * Holds only the pictures near the viewport, lets go of the rest, and hands
 * out the ones it holds **in the order a reader meets them** (author,
 * 2026-08-27: "It is also quite slow and laggy, maybe only render whats on
 * screen and 2-3 cards just off screen as well"; 2026-09-06: "load what is on
 * screen first, prefetch the next cells in the scroll direction, don't fetch
 * every thumb at once").
 *
 * **The nodes are never removed, only their `src`.** The track's whole
 * arithmetic is read from real offsets — `measure()` below — so taking cards
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
 *
 * **What is new on 2026-09-06 is that the margin is a *queue*, not a
 * starting gun.** Handing every picture inside the band its source in one
 * observer callback puts them all on the wire at once, and the browser then
 * shares one connection between the two icons the reader is looking at and
 * the six they may never reach: measured at 360 px on throttled 4G, twelve
 * requests and 2.4 MB were in flight to paint the two icons on screen, which
 * took 2.9 s. Nothing here decides *whether* a picture is fetched — the band
 * still does that — only in what order and how many at a time.
 *
 * `direction` is asked for, not inferred: this element's `scrollLeft` is
 * wrapped by a period every so often, so its own deltas lie. `loopScroll`
 * knows which way the row is going and says so.
 */
export function windowImages(track, { margin = 700, direction = () => 1, inflight = MAX_INFLIGHT } = {}) {
  /*
   * **A picture is shown once it has arrived, and not before** (author,
   * 2026-09-07: "the saint images that are loaded in the carousel fade in,
   * and those that aren't don't fade in until they are loaded ... With any
   * incoming items as well, same rule applies"). The `img` opens at opacity
   * 0 (index.css) and `is-loaded` is what lets it up; it is written on the
   * picture's own `load`, so a card scrolling in with its picture still on
   * the wire holds an empty box until the bitmap is really there, and a card
   * whose picture `release` took back below starts over the same way when the
   * band reaches it again. The row itself never waits for any of this — the
   * drift is `loopScroll`'s and starts on the first frame the track is laid
   * out, pictures or no pictures.
   */
  const arrived = (img) => img.classList.add('is-loaded');
  const onArrived = (e) => arrived(e.currentTarget);
  const handSource = (img) => {
    img.addEventListener('load', onArrived, { once: true });
    img.src = img.dataset.src;
    // A cached picture can be complete before the listener above is reached
    // by the event loop; in Chromium `load` still fires, but the class costs
    // nothing to set twice and a browser that skips the event is covered.
    if (img.complete && img.naturalWidth) arrived(img);
  };

  if (typeof IntersectionObserver !== 'function') {
    // No observer is not a reason to show an empty row: hand every picture its
    // source at once and behave exactly as the build did before this existed.
    for (const img of track.querySelectorAll('img[data-src]')) handSource(img);
    return () => {};
  }

  /** Every picture the band currently reaches, source or none. */
  const near = new Set();
  /**
   * How many sources have been handed out, written onto each picture as
   * `data-cx-seq` at the moment it is started.
   *
   * The suite's only window into the order this made — which is the whole of
   * what changed here, and is otherwise invisible once every picture has
   * arrived. It is also the answer to "what would this look like if it were
   * doing nothing": no picture would carry the attribute at all.
   */
  let handed = 0;
  /** How many of them are on the wire right now. */
  let running = 0;
  let pumping = false;
  let dead = false;

  /*
   * A picture is done with when it has painted *or* failed. Both free the
   * slot, and a missing icon must never be able to wedge the queue — which is
   * the one way a scheduler is worse than no scheduler at all.
   *
   * **`onSettle` is the listener and `settle` is not**, which cost a day: the
   * first version registered `settle` itself, so what it was handed was the
   * `Event` rather than the `<img>`, and `img.removeEventListener` threw
   * before `running` was ever decremented. Four pictures went out and the
   * queue never freed a slot again. It hid on a phone, where the row's own
   * drift carries cards out of the band and `release` calls `settle` *with an
   * image* — the queue was being unwedged from the side, by movement, sixty
   * times a minute. It showed at a desk with the drift removed, which is
   * where the suite reads the order and therefore holds the row still: 4
   * sources handed out at 300 ms and the same 4 at three seconds.
   *
   * `__cxRunning` is checked rather than assumed, because a picture released
   * before it loaded keeps its `once` listeners and may fire them later, for
   * a run that has already been accounted for.
   */
  const settle = (img) => {
    if (!img || !img.__cxRunning) return;
    img.__cxRunning = false;
    running -= 1;
    pump();
  };
  const onSettle = (e) => settle(e.currentTarget);

  const start = (img, tier) => {
    img.__cxRunning = true;
    running += 1;
    img.addEventListener('load', onSettle, { once: true });
    img.addEventListener('error', onSettle, { once: true });
    /*
     * The browser's own hint, since it is the browser that owns the socket:
     * the queue orders what *this* row asks for, and `fetchpriority` orders
     * what the connection does with the asks once they arrive.
     *
     * **Two priorities, not three, and it was measured rather than reasoned.**
     * The argument for giving the band ahead `auto` — that a reader is about
     * to want it, and a hint set at the start of a fetch is never revised —
     * is true and still loses: on a hard fling at the wheel's own 900 px/s
     * cap it took the share of on-screen icons actually painted from 32% to
     * 20%, five runs each, because a prefetch at equal priority is competing
     * for the one connection with the picture the reader is looking at *now*.
     * The tiers already decide what is asked for first; this decides who wins
     * when several are in flight, and the answer there is always the one on
     * screen.
     */
    img.fetchPriority = tier === ON_SCREEN ? 'high' : 'low';
    img.dataset.cxSeq = String((handed += 1));
    handSource(img);
  };

  const release = (img) => {
    if (!img.hasAttribute('src')) return;
    // Removing the source aborts a fetch still in flight, so the slot has to
    // come back here as well as through `settle`.
    if (img.__cxRunning) settle(img);
    img.removeEventListener('load', onArrived);
    img.classList.remove('is-loaded');
    img.removeAttribute('src');
  };

  /**
   * Hand out as many sources as there are free slots, nearest first.
   *
   * **The ordering is the whole point**, and it is three tiers: a picture on
   * screen, then one the row is travelling toward, then one behind it. Within
   * a tier, nearest to the reader's edge first. A row drifting rightward
   * therefore fills the screen, then the column about to arrive, and only
   * spends what is left on the ones going away — which are the ones a reader
   * is least likely to ask for and the ones the band will release soonest.
   */
  const pump = () => {
    if (dead || pumping) return;
    pumping = true;
    try {
      if (running >= inflight) return;
      const box = track.getBoundingClientRect();
      const heading = direction() < 0 ? -1 : 1;
      const waiting = [];
      for (const img of near) {
        if (img.hasAttribute('src') || !img.dataset.src) continue;
        const r = img.getBoundingClientRect();
        const onScreen = r.right > box.left && r.left < box.right;
        // How far past the edge the reader is travelling toward — negative
        // for anything behind them, which is what puts it in the last tier.
        const ahead = heading > 0 ? r.left - box.right : box.left - r.right;
        const tier = onScreen ? ON_SCREEN : ahead >= 0 ? AHEAD : BEHIND;
        waiting.push({ img, tier, ahead: Math.abs(ahead) });
      }
      waiting.sort((a, b) => a.tier - b.tier || a.ahead - b.ahead);
      for (const w of waiting) {
        if (running >= inflight) break;
        start(w.img, w.tier);
      }
    } finally {
      pumping = false;
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        // **Every picture in the child, not the first** (2026-08-28). A track
        // child is a *cell* since the carousel started pairing wide icons, and
        // a stacked cell holds two — `querySelector` handed a source to the top
        // one and left the one under it permanently blank.
        for (const img of e.target.querySelectorAll('img[data-src]')) {
          if (e.isIntersecting) near.add(img);
          else {
            near.delete(img);
            release(img);
          }
        }
      }
      pump();
    },
    { root: track, rootMargin: `0px ${margin}px` },
  );
  for (const card of track.children) io.observe(card);

  /*
   * The band tells us what is *near*; only the row's own movement tells us
   * what has come to the front of it. A picture queued behind three others
   * would otherwise wait for one of them to finish before its promotion to
   * "on screen" could be noticed — which is exactly the wait this exists to
   * remove. Coalesced to one frame, so a drift writing `scrollLeft` sixty
   * times a second costs one re-ordering, not sixty.
   */
  let frame = null;
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      pump();
    });
  };
  track.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    dead = true;
    if (frame) cancelAnimationFrame(frame);
    track.removeEventListener('scroll', onScroll);
    io.disconnect();
  };
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
  /*
   * **Adopted, not assumed false.** The latch used to start false always, and
   * a carousel rebuild — a late repaint whose packing key changed once fonts
   * or images settled — constructs a fresh loop around a track that may
   * *already hold the keyboard's focus*. The old loop was holding the drift
   * for that focus; the new one started drifting under a reader mid-keystroke,
   * and wrote its own remembered position over the step they had just made
   * (found 2026-08-29, wiring the arrow keys). `focusin` cannot re-fire for a
   * focus that never moved, so construction is the only place this can be
   * asked. No recent pointer means it is treated as the keyboard's, which is
   * the same rule `onFocusIn` applies.
   */
  let focused = track === document.activeElement || track.contains(document.activeElement);
  let raf = null;
  let pos = null;
  let lastWritten = -1;
  let currentSpeed = 0;
  let wheelVel = 0;
  let last = performance.now();
  /*
   * **Which way the row is going**, for `windowImages` to prefetch toward.
   *
   * It cannot read this off `scrollLeft`: `wrap()` moves that by a whole
   * period every so often, and a wrap is a jump of hundreds of pixels in
   * whichever direction the correction happens to run. So every place that
   * moves the row records its own sign here, and nothing else is inferred.
   * It starts at +1, which is the drift's own way — the direction the row
   * travels for as long as nobody touches it.
   */
  let heading = 1;
  const headed = (delta) => {
    if (delta > 0.5) heading = 1;
    else if (delta < -0.5) heading = -1;
  };
  // When a pointer last went down on the track, and how long the drift is held
  // off after an interaction that is not the keyboard's.
  let pointerAt = -Infinity;
  let holdUntil = 0;
  // A mouse drag: where it started, and how far it has gone, which is what
  // decides whether the press that ends it was a click or the end of a haul.
  let dragging = false;
  let dragFrom = 0;
  let dragLeft = 0;
  let dragMoved = 0;
  // Which pointer is hauling, and whether it has been captured yet — capture is
  // taken when a press becomes a haul rather than when it begins.
  let dragId = null;
  let captured = false;

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
    if (Math.abs(track.scrollLeft - lastWritten) > 1) {
      /*
       * A finger on a phone moves the row through here and nowhere else — the
       * track is a native scroller and this file refuses to write under a live
       * touch — so this is the only place a touch's own direction can be read.
       * A jump of about a whole period is a correction rather than a
       * traveller, and says nothing about which way anybody is going.
       */
      const delta = track.scrollLeft - (pos ?? track.scrollLeft);
      if (!bodySpan || Math.abs(delta) < bodySpan / 2) headed(delta);
      pos = track.scrollLeft;
    }
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
  /*
   * **A click must not stop the row for good** (author, 2026-08-28: "If you
   * click a second time, the auto scroll stops completely? Make sure this
   * doesnt happen, make sure it keeps scrolling afterwards no matter how many
   * times you click. It seems like the auto scroll can get reset by pressing
   * the Advanced search button and then back to the Carousel mode").
   *
   * That last observation is the diagnosis. Clicking anywhere on the track
   * focuses it — it is `tabindex="0"` — and `focused` latched until focus went
   * somewhere else, which a second click on the same row never does. The row
   * stopped for the rest of the visit, and the only thing that cleared it was
   * the mode toggle, because leaving the carousel destroys the loop and coming
   * back builds a fresh one.
   *
   * So focus is split by how it arrived. **Keyboard focus still holds the
   * row**, and must: a reader tabbing through cards cannot be chasing them
   * across the screen. **A pointer press holds it for a moment and then lets
   * go** — long enough to read what was clicked on, short enough that the row
   * always comes back on its own.
   */
  const POINTER_HOLD = 2500;

  const onFocusIn = () => {
    if (performance.now() - pointerAt < 400) {
      hold();
      return;
    }
    focused = true;
    pos = null;
  };
  const onFocusOut = () => {
    focused = false;
  };

  const hold = () => {
    holdUntil = performance.now() + POINTER_HOLD;
    currentSpeed = 0;
  };

  /*
   * **Hold and drag with the mouse** (author, 2026-08-28: "Also add a hold and
   * drag scroll function with the mouse"). A touch already has this from the
   * platform — the track is a native scroller — and a mouse has never had any
   * way to take hold of the row except the wheel.
   *
   * Touch is left to the browser: `pointerdown` records the moment for the
   * focus rule above and then stands aside, because writing `scrollLeft` under
   * a live touch is the one thing this file's header forbids outright.
   *
   * A drag that moved is not a click. The threshold is 4 px, and the click is
   * cancelled in the *capture* phase so it never reaches the card's own link —
   * otherwise every haul across the row would open whichever saint the mouse
   * happened to come down on.
   */
  const onPointerDown = (e) => {
    pointerAt = performance.now();
    dragMoved = 0;
    if (e.pointerType === 'touch' || e.button !== 0) return;
    dragging = true;
    dragFrom = e.clientX;
    dragLeft = track.scrollLeft;
    dragId = e.pointerId;
    captured = false;
    wheelVel = 0;
    currentSpeed = 0;
    track.classList.add('is-dragging');
    /*
     * **The pointer is not captured here, and that is the whole of a
     * regression** (author, 2026-08-28: "On desktop you can no longer click on
     * any card in the carousel to take you to the profile page").
     *
     * Capturing on `pointerdown` makes the track the capture target for the
     * rest of the gesture, and Chromium then dispatches the `click` at the
     * track rather than at the `<a>` under the finger. The router's delegated
     * handler looks for an anchor on the event's target, finds none, and the
     * press does nothing at all — the card is not slow to open, it never opens.
     *
     * Capture is what keeps a haul following the mouse once it leaves the
     * track's box, so it is taken at the moment a press *becomes* a haul —
     * `onPointerMove` below, past the same 4 px that already decides a haul
     * from a click. A press that never moves is never captured and reaches the
     * link the way an ordinary press does.
     */
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragFrom;
    dragMoved = Math.max(dragMoved, Math.abs(dx));
    // Past the threshold this is a haul, and a haul wants the pointer even
    // when it leaves the track. See `onPointerDown` for why not before.
    if (!captured && dragMoved > 4) {
      captured = true;
      track.setPointerCapture?.(dragId);
    }
    headed(dragLeft - dx - track.scrollLeft);
    track.scrollLeft = dragLeft - dx;
    lastWritten = track.scrollLeft;
    pos = track.scrollLeft;
    pos += wrap();
    // The row wrapped under the hand, so the anchor has to move with it or the
    // next pixel of the drag would haul the position back to where it was.
    dragLeft = track.scrollLeft + dx;
  };

  const onPointerUp = (e) => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    if (captured) {
      captured = false;
      track.releasePointerCapture?.(e.pointerId);
    }
    hold();
  };

  const onClickCapture = (e) => {
    if (dragMoved > 4) {
      e.preventDefault();
      e.stopPropagation();
    }
    dragMoved = 0;
  };

  /*
   * **The browser's own drag has to be refused, or there is no drag of ours.**
   * Every card is an `<a>` around an `<img>`, and both are natively draggable:
   * pressing one and moving starts Chromium's link-and-image drag, which takes
   * the pointer into a nested loop, hands the reader a ghost of the icon, and
   * never sends another `pointermove` here. The row simply did not follow the
   * hand, and — found the hard way — a harness driving the same gesture hangs
   * outright waiting for input that the nested loop is swallowing.
   *
   * There is nothing on this row worth dragging *out* of it, so the answer is
   * the blunt one rather than a conditional on `dragging`: a press that turns
   * into a haul and a press that was going to be a link both want the native
   * drag gone.
   */
  const onDragStart = (e) => e.preventDefault();

  track.addEventListener('scroll', onScroll, { passive: true });
  track.addEventListener('pointerdown', onPointerDown);
  track.addEventListener('pointermove', onPointerMove);
  track.addEventListener('pointerup', onPointerUp);
  track.addEventListener('pointercancel', onPointerUp);
  track.addEventListener('click', onClickCapture, true);
  track.addEventListener('dragstart', onDragStart);
  track.addEventListener('touchstart', onTouchStart, { passive: true });
  track.addEventListener('touchend', onTouchEnd, { passive: true });
  track.addEventListener('touchcancel', onTouchEnd, { passive: true });
  track.addEventListener('wheel', onWheel, { passive: false });
  track.addEventListener('focusin', onFocusIn);
  track.addEventListener('focusout', onFocusOut);

  /**
   * Two different questions, which were one until 2026-08-28.
   *
   * `frozen` is *no writes at all*: a live touch or its momentum (writing under
   * either takes the element's touch tracking away, per this file's header), a
   * paused loop, a track that is not laid out, or a hand on it.
   *
   * `drifting` is only whether the row moves *by itself*. The wheel is not the
   * drift, and the author found the difference: "if you click and then instantly
   * try to scroll, it cant scroll. You have to wait." A click focused the track,
   * the single `still()` test returned early, and the early return zeroed
   * `wheelVel` on every frame — so the wheel pushed against a variable that was
   * being wiped before it could be spent. Stopping the drift and refusing the
   * reader's own scroll are not the same thing and no longer share a test.
   */
  const frozen = () =>
    paused || touchActive || dragging || performance.now() < touchSettle || !track.clientWidth;

  const drifting = () => !focused && performance.now() >= holdUntil && !reducedMotion();

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
    if (frozen()) {
      currentSpeed = 0;
      wheelVel = 0;
      pos = null;
      return;
    }
    if (pos === null) pos = track.scrollLeft;
    // Eased up to cruising speed rather than snapped to it, on the same shape
    // the old build used for its wheel decay, run the other way. Held at a
    // stop while the reader has the row — but the wheel below is still theirs.
    if (drifting()) currentSpeed += (speed - currentSpeed) * 0.06;
    else currentSpeed = 0;
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
    const velocity = currentSpeed + wheelVel;
    // Nothing to move: a held row with a spent wheel should not be writing its
    // own position back over a reader who is dragging it or a caller who has
    // just placed it.
    if (!velocity) return;
    headed(velocity);
    pos += velocity * (dt / 1000);
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
    /** Which way the row last moved: +1 forward, -1 back. See `heading`. */
    direction: () => heading,
    /*
     * **A gesture survives the rebuild that interrupts it** (2026-08-29). A
     * late repaint - the packing key moves when fonts or pictures settle -
     * destroys this loop and constructs a successor, and a wheel spun in that
     * window died with its loop: the reader's spin simply stopped, and the
     * suite's press-and-wheel test showed it as a row that never answered.
     * `handoff()` is what the old loop knows that the new one cannot ask the
     * DOM for; modes.js carries it across. The successor adopts the velocity
     * and the hold, and the reader never learns a rebuild happened - which is
     * the standard the focus latch already set at construction.
     */
    handoff() {
      return { wheelVel, holdUntil, pointerAt };
    },
    inherit(prev) {
      if (!prev) return;
      wheelVel = Math.max(-wheelMax, Math.min(wheelMax, prev.wheelVel ?? 0));
      holdUntil = prev.holdUntil ?? 0;
      pointerAt = prev.pointerAt ?? -Infinity;
    },
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
      track.removeEventListener('pointerdown', onPointerDown);
      track.removeEventListener('pointermove', onPointerMove);
      track.removeEventListener('pointerup', onPointerUp);
      track.removeEventListener('pointercancel', onPointerUp);
      track.removeEventListener('click', onClickCapture, true);
      track.removeEventListener('dragstart', onDragStart);
      track.removeEventListener('touchstart', onTouchStart);
      track.removeEventListener('touchend', onTouchEnd);
      track.removeEventListener('touchcancel', onTouchEnd);
      track.removeEventListener('wheel', onWheel);
      track.removeEventListener('focusin', onFocusIn);
      track.removeEventListener('focusout', onFocusOut);
    },
  };
}
