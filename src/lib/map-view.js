/**
 * Where the map is looking: a scale, and a centre in the projection's own
 * fractional coordinates. Pure arithmetic and no DOM, like `lib/mercator.js`
 * beneath it — the projection says where a place *is*, this says which part of
 * that the reader is being shown.
 *
 * Kept apart from the view for the usual reason: panning that walks the world
 * off the edge of its own box, and zooming that drifts away from the point
 * being zoomed at, are both bugs you can state as arithmetic and neither is
 * pleasant to chase through a canvas.
 */

/**
 * How much of the world is visible along each axis at scale 1, in a box of
 * `w` by `h`, for a projection whose natural width-over-height is `aspect`.
 *
 * **The map covers its box rather than fitting inside it**, which is the whole
 * reason this function exists. The stage is the browser window now (author,
 * 2026-08-29) and a window is whatever shape the reader made it, so the
 * projection's own 1.12 will not match it. *Fitting* would letterbox — at
 * 1280x860 that is 313 px of dead ground down the sides, and on a phone the map
 * would occupy less than half the window it was asked to fill. So the world is
 * drawn large enough to cover, and the axis with the surplus is cropped.
 *
 * One of the two returned fractions is therefore always exactly 1: the world
 * fits that axis, and the other is the one you can pan along even at scale 1.
 */
export function coverFractions(w, h, aspect) {
  const base = Math.max(w, h * aspect);
  return { fx: w / base, fy: (h * aspect) / base };
}

/** The whole world in a box of the projection's own shape: nothing cropped. */
export const WHOLE = { fx: 1, fy: 1 };

/** 1 is the world covering the box, and there is no zooming out past it. */
export const MIN_SCALE = 1;

/**
 * 60, raised from 24 (2026-08-31, "make it so you can zoom even further").
 * 24 was the coastline's own ceiling — `land.js`/`water.js`'s 50m tier still
 * rounds to a tenth of a degree (~11 km, `make-land.mjs`'s own `PRECISION`),
 * and past 24 that rounding was the binding limit rather than a coarse
 * polygon being visibly faceted underneath it. This second raise is not
 * backed by finer coastline data the same way — the land is honestly a
 * coarser shape at 60 than at 24, §6b's own objection — but the reason to
 * zoom this far is reading two saints' names apart, not the coastline, and
 * `declutter`'s spread is in screen pixels: it separates by exactly as much
 * regardless of scale, so the only way to make two close names easier to
 * read apart *is* to zoom past what the land can back. Upgrading the
 * coastline itself past 50m (the 10m tier roughly doubles it again, ~250 kB
 * gzipped on top of the current ~211) is deferred rather than bundled into
 * this — a further weight-for-precision trade of its own, worth its own
 * answer rather than riding in on a request that was really about labels.
 */
export const MAX_SCALE = 60;

export const HOME = { scale: MIN_SCALE, cx: 0.5, cy: 0.5 };

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * A centre that keeps the world covering the box.
 *
 * At scale s the box shows `fx/s` of the world across and `fy/s` of it down, so
 * the centre can travel no nearer an edge than half of that. Where an axis
 * shows the whole world — `f` of 1 at scale 1 — the range collapses to exactly
 * 0.5 and there is nowhere to go, which is what stops a drag from sliding the
 * Atlantic off the side. On the cropped axis there is somewhere to go from the
 * very first frame, which is the point of covering.
 */
export function clampCentre(cx, cy, scale, frame = WHOLE) {
  const hx = frame.fx / (2 * scale);
  const hy = frame.fy / (2 * scale);
  return { cx: clamp(cx, hx, 1 - hx), cy: clamp(cy, hy, 1 - hy) };
}

/** A view, normalised: scale inside its bounds and the centre inside the box. */
export const clampView = ({ scale, cx, cy }, frame = WHOLE) => {
  const s = clamp(scale, MIN_SCALE, MAX_SCALE);
  return { scale: s, ...clampCentre(cx, cy, s, frame) };
};

/**
 * Where a projected point lands in the box, as a fraction of it. Multiply by
 * width and height to draw. Outside 0..1 means off-screen, which is ordinary
 * once zoomed — and ordinary at rest too on whichever axis is cropped.
 */
export const toScreen = ({ scale, cx, cy }, px, py, frame = WHOLE) => ({
  x: ((px - cx) * scale) / frame.fx + 0.5,
  y: ((py - cy) * scale) / frame.fy + 0.5,
});

/** The world point currently under a spot in the box (both fractions). */
export const toWorld = ({ scale, cx, cy }, ax, ay, frame = WHOLE) => ({
  px: cx + ((ax - 0.5) * frame.fx) / scale,
  py: cy + ((ay - 0.5) * frame.fy) / scale,
});

/**
 * Zoom by `factor` about a fixed point in the box — the pointer, a pinch's
 * midpoint, or the centre for a button.
 *
 * **The anchor stays put**, which is the whole difference between zooming at
 * something and zooming and then hunting for it again. Take the world point
 * under the anchor, change the scale, and choose the centre that puts that same
 * world point back under the same anchor.
 *
 * The clamp is applied after, so a zoom that would push the centre past an edge
 * slides rather than refusing; near a corner the anchor drifts, and it has to,
 * because the alternative is showing the reader the void outside the map.
 */
export function zoomAbout(view, factor, ax = 0.5, ay = 0.5, frame = WHOLE) {
  const scale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
  const { px, py } = toWorld(view, ax, ay, frame);
  return clampView(
    { scale, cx: px - ((ax - 0.5) * frame.fx) / scale, cy: py - ((ay - 0.5) * frame.fy) / scale },
    frame,
  );
}

/**
 * Pan by a drag measured in fractions of the box. A drag of the full width at
 * scale 1 would be the whole visible span; at scale 4 it is a quarter of it,
 * which is what dividing by the scale buys — the land keeps pace with the
 * finger at every zoom instead of racing it.
 */
export const panBy = (view, dxFraction, dyFraction, frame = WHOLE) =>
  clampView(
    {
      ...view,
      cx: view.cx - (dxFraction * frame.fx) / view.scale,
      cy: view.cy - (dyFraction * frame.fy) / view.scale,
    },
    frame,
  );

/**
 * Spreads points that would draw on top of each other into a small ring
 * around their shared spot, so two saints who share a place — John the
 * Long-Suffering and Moses the Hungarian both die at the Caves in Kyiv, to
 * the same rounded coordinate — still each get their own dot and label
 * instead of one covering the other at any zoom. Deferred alongside
 * clustering while the corpus carried sixteen points (`views/map.js`'s own
 * header); the exact-duplicate case is not that deferral — no amount of
 * zooming ever separates two points at the same coordinate, so it is a
 * correctness gap rather than a density question, and 851 saints already
 * carry more than one such pair.
 *
 * `points` is any array of `{x, y, ...}` in the same px space the canvas
 * draws in. Grouping is a grid bucket keyed on `radiusPx` by default, not a
 * true nearest-neighbour search: cheap, and exact-duplicate coordinates —
 * the only case this exists to fix — always land in the same bucket
 * regardless of where the grid falls, since they are the same point. A pair
 * merely close but not identical can occasionally miss each other across a
 * bucket edge; at this corpus's density that is a rare cosmetic miss, not
 * the bug being fixed.
 *
 * `keyOf`, if given, replaces that default with the caller's own grouping
 * key — map.js passes each point's own lon/lat rather than its *current*
 * x/y (2026-08-31, fixing a real bug the deeper `MAX_SCALE` this unlocked
 * finally made reachable). `x`/`y` move with every pan and zoom, so the
 * default key is only ever a snapshot of *this frame's* proximity: two
 * points close enough to bucket together at rest can drift past
 * `radiusPx` apart as the reader zooms in, and the instant they do, the
 * jittered one snaps to its true position — a discontinuity that, wheel-
 * zoomed at exactly that jittered pixel, reads as the anchor and the dot
 * pulling apart and the dot vanishing off the edge a few scroll notches
 * later. A key drawn from the *source* coordinate is stable at every zoom:
 * two saints at the same place are the same place forever, so the group
 * they land in — and the constant-pixel offset drawn from it — never
 * changes underneath the reader.
 */
export function declutter(points, radiusPx = 9, keyOf) {
  const bucketKey = keyOf ?? ((p) => `${Math.round(p.x / radiusPx)},${Math.round(p.y / radiusPx)}`);
  const buckets = new Map();
  for (const p of points) {
    const key = bucketKey(p);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }
  const out = [];
  for (const group of buckets.values()) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const cx = group.reduce((s, p) => s + p.x, 0) / group.length;
    const cy = group.reduce((s, p) => s + p.y, 0) / group.length;
    // Grows with the group so a stack of five does not draw its own dots
    // back on top of each other at the ring's own radius.
    const r = radiusPx * (1 + group.length / 5);
    group.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
      out.push({ ...p, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    });
  }
  return out;
}
