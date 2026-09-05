import { clampView, coverFractions, MIN_SCALE, panBy, toWorld, zoomAbout } from '../../lib/map-view.js';
import { ASPECT } from '../../lib/mercator.js';
import { reducedMotion } from '../../lib/motion.js';
import { STRINGS } from '../../ui/strings.js';
import { flyTo } from './motion.js';
import { paintCanvas } from './paint.js';
import { announce, ceilingOf, frameOf, map } from './state.js';

/**
 * The corner controls: zoom and pan in every form the map takes them (the
 * buttons, the wheel, a drag, a pinch, the keys — `wireZoom`), and the
 * filter button with its two boxes (`wireFilters`).
 *
 * Cut from `views/map.js` on 2026-09-05 (cleanup plan item 5).
 */

/** A press of + or -, and one wheel notch's worth of the same. */
const ZOOM_STEP = 1.6;

/* ---- the filter panel (2026-09-01) -------------------------------------- */

/**
 * The filter button and the two boxes behind it.
 *
 * Both boxes hold for the visit, so the panel opens showing what the map is
 * actually doing rather than its defaults — the same standing `Movement` and
 * the timeline's range have, and for the same reason: a reader who narrows
 * the map, leaves for a saint page and comes back should find it as they
 * left it.
 *
 * The outside-press close is `pointerdown` on `document`, the same bargain
 * the timeline's year panels keep, and is registered in `cleanups` for the
 * same reason — a listener on `document` outlives the view that added it.
 */
export function wireFilters(el, refresh) {
  const button = el.querySelector('[data-filter-btn]');
  const pop = el.querySelector('[data-filter-pop]');

  const shut = () => {
    pop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  button.addEventListener('click', () => {
    const opening = pop.hidden;
    pop.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
  });

  pop.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // Focus goes back to the button that opened it, or the keyboard is
    // stranded inside a panel that has just gone.
    shut();
    button.focus();
  });

  const onDocDown = (e) => {
    if (!e.target.closest?.('.map-filter')) shut();
  };
  document.addEventListener('pointerdown', onDocDown);
  map.cleanups.push(() => document.removeEventListener('pointerdown', onDocDown));

  for (const box of el.querySelectorAll('[data-show]')) {
    const which = box.dataset.show;
    box.checked = which === 'past' ? map.showPast : map.showFuture;
    box.addEventListener('change', () => {
      if (which === 'past') map.showPast = box.checked;
      else map.showFuture = box.checked;
      refresh();
      const M = STRINGS.map;
      announce(el, box.checked ? (which === 'past' ? M.showingPast : M.showingFuture) : M.showingLiveOnly);
    });
  }
}

/**
 * Zoom and pan.
 *
 * Until 2026-08-30 the rule here was that a bare wheel must scroll the page
 * and only Ctrl could zoom, because a map in the middle of a scrolling
 * article that swallows the wheel is a trap. The author reversed it ("have
 * the mouse scroll zoom in or out smoothly without having to hold Ctrl at
 * all") in the same breath as removing everything below the map — and the
 * two instructions only work together: with no page under the stage there is
 * nothing to scroll past, so the wheel has one honest meaning left and the
 * trap the old rule guarded against cannot be built any more. Touch is the
 * map's for the same reason (`touch-action: none` in map.css); the header
 * above the stage remains the way out.
 *
 * `cards` is a getter, not the array — the timeline can narrow it after this
 * wiring runs, and a closure over a stale array would zoom an empty map
 * forever (Amendment 76's own lesson, relearned when the filter came back).
 *
 * `schedulePaint` is `render`'s own rAF-coalescing scheduler: the wheel and
 * the drag/pinch handlers below call `setThrottled` through every raw
 * pointer event, and only the last one inside a frame needs to actually
 * reach the canvas. The buttons and the keyboard call the plain `set`
 * instead — a discrete press paints straight away, both because there is
 * nothing to coalesce (it happens once) and because a test that clicks and
 * immediately reads the canvas is a real caller.
 */
export function wireZoom(el, canvas, cards, schedulePaint) {
  const level = el.querySelector('[data-zoom-level]');
  const applyChrome = () => {
    /*
     * There is somewhere to go whenever an axis is cropped, which on a window
     * wider than the projection is true at 1.0x — the poles are off the top and
     * bottom and no amount of zooming *in* would bring them back, so a reader
     * who could not pan at rest could never see them at all.
     */
    canvas.classList.toggle('is-pannable', canPan(canvas));
    // A number, not a bar: "2.8x" is a fact a screen reader can read out, and
    // `aria-live` means a press on + says what it did rather than only looking
    // like it did something.
    level.textContent = `${map.view.scale.toFixed(1)}×`;
    el.querySelector('[data-zoom="out"]').disabled = map.view.scale <= MIN_SCALE;
    el.querySelector('[data-zoom="in"]').disabled = map.view.scale >= ceilingOf(canvas) - 0.01;
  };

  const set = (next) => {
    // Every other flight on the map — a button, a key, choosing a saint or a
    // blob, the search's own flight — lands here (`render` hands this back
    // out as `applyView`), so this is the one choke point that catches all
    // of them: a drag still trailing its own target must not keep pulling
    // `view` toward it once a different flight has taken over the picture.
    panTarget = null;
    map.view = next;
    applyChrome();
    paintCanvas(canvas, cards());
  };

  const setThrottled = (next) => {
    map.view = next;
    applyChrome();
    schedulePaint(cards());
  };

  for (const button of el.querySelectorAll('[data-zoom]')) {
    button.addEventListener('click', () => {
      const how = button.dataset.zoom;
      const target =
        how === 'home' ? map.homeView : zoomAbout(map.view, how === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP, 0.5, 0.5, frameOf(canvas), ceilingOf(canvas));
      /*
       * A discrete step eases rather than jumping (2026-09-04) — the same
       * flight the wheel and a pinch already give for free by being
       * continuous gestures; a button or a key is not, so it borrows `flyTo`.
       * The ceiling is passed explicitly: `flyTo`'s own default is the
       * desktop `MAX_SCALE`, and a narrower window's real ceiling
       * (`maxScaleFor`) is higher — left to the default, every eased zoom
       * step silently capped at 240x on a phone, which is not what
       * `ceilingOf` was for.
       */
      flyTo(target, frameOf(canvas), set, () => {}, ceilingOf(canvas));
      // A disabled button drops focus to the body, which strands the keyboard
      // at the top of the document. Hand it to the map, which is the thing the
      // reader was working.
      if (button.disabled) canvas.focus();
    });
  }

  /*
   * **The wheel trails a target scale, not a target view** (2026-09-04,
   * author: keep "smooth/slightly lazy zooming", but "make it stop wobbling
   * left right up down when zooming" — the first version eased `scale` and
   * `cx`/`cy` toward their own targets *independently*, and that was the
   * bug: `zoomAbout` holds a point still under the pointer by coupling
   * `cx`/`cy` to `scale` through a `1/scale` term, a curve rather than a
   * line, so two straight-line eases toward the same endpoints do not
   * retrace it — the anchor visibly drifted off the pointer mid-transition.
   *
   * The fix keeps exactly one quantity on a straight line — `scale`, the
   * only one that was ever asked to lag — and re-derives `cx`/`cy` from it
   * every frame via `zoomAbout`'s own formula, anchored to the world point
   * that was under the pointer *when the gesture started* (`wheelAnchor`).
   * That point never moves in world-space, so recomputing its screen
   * position for whatever the eased scale currently is holds it exactly
   * under the pointer at every step, the whole way — the coupling `zoomAbout`
   * itself relies on, finally kept rather than approximated.
   */
  let wheelAnchor = null;
  let wheelRaf = null;
  const WHEEL_EASE = 0.3;
  const anchoredView = (scale, anchor) =>
    clampView(
      {
        scale,
        cx: anchor.px - ((anchor.ax - 0.5) * anchor.frame.fx) / scale,
        cy: anchor.py - ((anchor.ay - 0.5) * anchor.frame.fy) / scale,
      },
      anchor.frame,
      anchor.ceiling,
    );
  const stepWheelEase = () => {
    if (!wheelAnchor) {
      wheelRaf = null;
      return;
    }
    const dScale = wheelAnchor.targetScale - map.view.scale;
    if (Math.abs(dScale) < 0.001) {
      setThrottled(anchoredView(wheelAnchor.targetScale, wheelAnchor));
      wheelAnchor = null;
      wheelRaf = null;
      return;
    }
    setThrottled(anchoredView(map.view.scale + dScale * WHEEL_EASE, wheelAnchor));
    wheelRaf = requestAnimationFrame(stepWheelEase);
  };

  canvas.addEventListener(
    'wheel',
    (e) => {
      /*
       * No modifier gate (author, 2026-08-30) - the wheel *is* the zoom.
       * `exp(-deltaY * 0.002)` makes it smooth by construction: every unit of
       * wheel travel multiplies the scale by the same factor, so a slow roll
       * creeps and a spin sweeps, continuously, with no notch steps.
       */
      e.preventDefault();
      const box = canvas.getBoundingClientRect();
      const frame = coverFractions(box.width, box.height, ASPECT);
      const ceiling = ceilingOf(canvas);
      const ax = (e.clientX - box.left) / box.width;
      const ay = (e.clientY - box.top) / box.height;
      // Chained from the target still in flight, not the drawn view, so a
      // fast spin keeps compounding it smoothly rather than each notch
      // re-multiplying a scale the picture has not caught up to yet.
      const baseScale = wheelAnchor ? wheelAnchor.targetScale : map.view.scale;
      const targetScale = Math.min(ceiling, Math.max(MIN_SCALE, baseScale * Math.exp(-e.deltaY * 0.002)));
      // The world point under the pointer *right now*, on the picture as
      // actually drawn — re-anchoring every notch to wherever the cursor
      // currently is, exactly as a direct zoom always did.
      const { px, py } = toWorld(map.view, ax, ay, frame);
      const anchor = { px, py, ax, ay, frame, ceiling, targetScale };
      // Reduced motion removes the trailing, not just shortens it — the
      // wheel lands exactly where it always has, one notch at a time.
      if (reducedMotion()) {
        setThrottled(anchoredView(targetScale, anchor));
        wheelAnchor = null;
        return;
      }
      wheelAnchor = anchor;
      if (!wheelRaf) wheelRaf = requestAnimationFrame(stepWheelEase);
    },
    // Not passive: this one calls preventDefault, and Chrome ignores it on a
    // passive listener while warning about it in a console nobody is reading.
    { passive: false },
  );

  /*
   * One pointer drags, two pinch. Held in a Map rather than as two variables
   * because a finger that leaves and returns mid-gesture is ordinary, and
   * `pointerId` is the only thing that tells them apart.
   */
  const active = new Map();
  let pinch = 0;
  let pinchMid = null;

  /*
   * **A mouse drag trails its own target rather than tracking 1:1**
   * (2026-09-04, author: "a tiny bit of drag" — the request the wheel's own
   * trailing above answered for the wrong gesture). Translation is safe to
   * ease independently of anything else the way a zoom's scale and centre
   * are not: `panBy` only ever shifts `cx`/`cy`, nothing else depends on
   * where they land mid-frame, so chasing a target here carries none of the
   * wobble risk retired above. Touch keeps tracking the finger exactly —
   * `pointerType`, not a coarse-pointer guess, since a lag between a finger
   * and the land under it reads as the map fighting the reader rather than
   * as a desktop nicety.
   */
  let panTarget = null;
  let panRaf = null;
  const PAN_EASE = 0.4;
  const stepPanEase = () => {
    if (!panTarget) {
      panRaf = null;
      return;
    }
    const dCx = panTarget.cx - map.view.cx;
    const dCy = panTarget.cy - map.view.cy;
    if (Math.abs(dCx) < 0.00002 && Math.abs(dCy) < 0.00002) {
      setThrottled({ ...map.view, cx: panTarget.cx, cy: panTarget.cy });
      panTarget = null;
      panRaf = null;
      return;
    }
    setThrottled({ ...map.view, cx: map.view.cx + dCx * PAN_EASE, cy: map.view.cy + dCy * PAN_EASE });
    panRaf = requestAnimationFrame(stepPanEase);
  };

  canvas.addEventListener('pointerdown', (e) => {
    /*
     * **A fresh press takes the view back from a drag still trailing its own
     * target** — the same independence the wheel and a pan already keep from
     * each other, now between one drag and the next: releasing early and
     * pressing again before the trail has caught up must not have the new
     * drag's own motion computed from a target the reader never asked to
     * keep chasing.
     */
    panTarget = null;
    if (!canPan(canvas)) return;
    canvas.setPointerCapture(e.pointerId);
    active.set(e.pointerId, e);
    if (active.size === 2) {
      pinch = spread(active);
      pinchMid = midpoint(active);
    }
  });

  /*
   * **Pan and zoom together, not one or the other** (2026-09-05, author: "is
   * there a way to do both scroll and zoom on mobile at the same time,
   * measuring the distance between fingers as zoom and average movement as
   * scroll?" — precisely the two quantities two fingers already carry).
   * `spread` (the distance between them) drove the zoom alone before;
   * `midpoint` was already read every frame but only ever as the zoom's own
   * anchor, which is blind to the pair *translating* together — `zoomAbout`
   * re-derives its anchor from the current view on every call, so a pinch
   * with no change in spread at all (factor 1) left the picture exactly
   * where it was, however far the two fingers had walked together.
   * `pinchMid` is the previous frame's own midpoint; the pan moves the land
   * by exactly how far that midpoint travelled, in screen pixels, the same
   * `panBy` a single finger already uses — and the zoom after it, anchored
   * at the *current* midpoint against the *panned* view, so the two compose
   * rather than one undoing the other's own anchor.
   *
   * **Read once a frame, not once a finger.** Two fingers moving together is
   * still two separate pointers, each with its own `pointermove`, and
   * computing `spread`/`midpoint` inside the handler itself means the first
   * of the pair to arrive is read against the *other* finger's still-stale
   * position — a real, if usually tiny, wrong distance and midpoint for
   * that one frame, self-correcting the moment the second pointer's own
   * event lands a moment later. Ordinarily too small to see; found live
   * only because it can still push the scale briefly past the window's own
   * ceiling and get clamped there, so the very next frame's correction
   * multiplies from the clamped value instead of the true one and the pair
   * never quite lands back where two fingers held the same distance apart
   * should — no zoom at all. `pinchFrame` defers the read itself to a
   * `requestAnimationFrame`, not merely the apply: by the time it fires,
   * both pointers dispatched from the same touch have already updated
   * `active`, so `spread`/`midpoint` are read once, whole, per frame.
   */
  let pinchFrame = null;
  const flushPinch = () => {
    pinchFrame = null;
    if (active.size < 2) return;
    const box = canvas.getBoundingClientRect();
    const now = spread(active);
    const mid = midpoint(active);
    let next = map.view;
    if (pinchMid) {
      next = panBy(next, (mid.x - pinchMid.x) / box.width, (mid.y - pinchMid.y) / box.height, coverFractions(box.width, box.height, ASPECT), ceilingOf(canvas));
    }
    if (pinch > 0 && now > 0) {
      next = zoomAbout(next, now / pinch, (mid.x - box.left) / box.width, (mid.y - box.top) / box.height, coverFractions(box.width, box.height, ASPECT), ceilingOf(canvas));
    }
    setThrottled(next);
    pinch = now;
    pinchMid = mid;
  };

  canvas.addEventListener('pointermove', (e) => {
    if (!active.has(e.pointerId)) return;
    const previous = active.get(e.pointerId);
    active.set(e.pointerId, e);

    if (active.size >= 2) {
      if (!pinchFrame) pinchFrame = requestAnimationFrame(flushPinch);
      return;
    }

    const box = canvas.getBoundingClientRect();
    if (!canPan(canvas)) return;
    /*
     * Both axes, at every scale. The old vertical-drop for a thumb at rest
     * existed to honour `touch-action: pan-y` - the browser owned vertical
     * for the page's scroll - and went with the page it protected
     * (2026-08-30): touch is `none` now, every move reaches here, and an axis
     * with nowhere to go is already refused by the clamp arithmetic rather
     * than by this handler guessing.
     */
    const target = panBy(
      panTarget ?? map.view,
      (e.clientX - previous.clientX) / box.width,
      (e.clientY - previous.clientY) / box.height,
      coverFractions(box.width, box.height, ASPECT),
      ceilingOf(canvas),
    );
    if (e.pointerType !== 'mouse' || reducedMotion()) {
      setThrottled(target);
      return;
    }
    panTarget = target;
    if (!panRaf) panRaf = requestAnimationFrame(stepPanEase);
  });

  /*
   * **The trail keeps running past release, on purpose** (2026-09-04,
   * author: "make sure the 'lazy' scroll has a tiny bit of momentum when
   * you let go, not just snap where you let go because its at odds with the
   * lazy scroll thing in general"). It briefly snapped straight to
   * `panTarget` on release instead, to answer a test that read `data-dots`
   * the instant a drag ended and expected the ease to already be done — the
   * wrong side got fixed. `release` here only lets go of the *pointer*
   * (`active`/`pinch`); `panTarget` and `stepPanEase` are untouched, so the
   * last couple of eased frames still land after the finger has lifted,
   * which is the small coast a lazy drag reads as one thing rather than a
   * lag that vanishes the moment it would matter.
   */
  const release = (e) => {
    active.delete(e.pointerId);
    if (active.size < 2) {
      pinch = 0;
      pinchMid = null;
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /*
   * The keyboard, which is not a courtesy either: §13 wants every interactive
   * element reachable, and a map that only answers to a dragged pointer is not.
   * A step is a tenth of the box, so ten presses cross it at any zoom.
   */
  canvas.addEventListener('keydown', (e) => {
    const pan = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
    if (pan) {
      if (!canPan(canvas)) return;
      e.preventDefault();
      set(panBy(map.view, -pan[0], -pan[1], frameOf(canvas), ceilingOf(canvas)));
      return;
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      flyTo(zoomAbout(map.view, ZOOM_STEP, 0.5, 0.5, frameOf(canvas), ceilingOf(canvas)), frameOf(canvas), set, () => {}, ceilingOf(canvas));
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      flyTo(zoomAbout(map.view, 1 / ZOOM_STEP, 0.5, 0.5, frameOf(canvas), ceilingOf(canvas)), frameOf(canvas), set, () => {}, ceilingOf(canvas));
    } else if (e.key === 'Home' || e.key === '0') {
      e.preventDefault();
      flyTo(map.homeView, frameOf(canvas), set, () => {}, ceilingOf(canvas));
    }
  });

  applyChrome();
  paintCanvas(canvas, cards());

  // Handed to the search, so flying to a place moves the chrome as well as
  // the picture — see `render`.
  return set;
}

/** Whether the map has anywhere to move: zoomed in, or cropped by its window. */
function canPan(canvas) {
  if (map.view.scale > MIN_SCALE) return true;
  const frame = frameOf(canvas);
  return frame.fx < 1 || frame.fy < 1;
}

/** The distance between the first two live pointers, for a pinch. */
function spread(active) {
  const [a, b] = [...active.values()];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** The point a pinch is happening about. */
function midpoint(active) {
  const [a, b] = [...active.values()];
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}
