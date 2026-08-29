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

/** 1 is the whole world, and there is no zooming out past it: the box is sized
 *  to the world exactly, so anything below 1 is empty margin. */
export const MIN_SCALE = 1;

/**
 * 12 puts roughly Cyprus across the width of a phone. Past that the 110m
 * coastline is visibly a polygon — it is rounded to a tenth of a degree, about
 * 11 km — and a map that keeps zooming into detail it does not have is lying
 * about its own precision, which is the one thing §6b will not have.
 */
export const MAX_SCALE = 12;

export const HOME = { scale: MIN_SCALE, cx: 0.5, cy: 0.5 };

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * A centre that keeps the world filling the box.
 *
 * At scale s the box shows `1/s` of the world, so the centre can travel no
 * nearer an edge than half of that. At s = 1 the range collapses to exactly
 * 0.5 — the whole world, and nowhere to go — which is what stops a drag on an
 * unzoomed map from sliding the Atlantic off the side.
 */
export function clampCentre(cx, cy, scale) {
  const half = 0.5 / scale;
  return { cx: clamp(cx, half, 1 - half), cy: clamp(cy, half, 1 - half) };
}

/** A view, normalised: scale inside its bounds and the centre inside the box. */
export const clampView = ({ scale, cx, cy }) => {
  const s = clamp(scale, MIN_SCALE, MAX_SCALE);
  return { scale: s, ...clampCentre(cx, cy, s) };
};

/**
 * Where a projected point lands in the box, as a fraction of it. Multiply by
 * width and height to draw. Outside 0..1 means off-screen, which is ordinary
 * once zoomed and is the caller's business, not this function's.
 */
export const toScreen = ({ scale, cx, cy }, px, py) => ({
  x: (px - cx) * scale + 0.5,
  y: (py - cy) * scale + 0.5,
});

/** The world point currently under a spot in the box (both fractions). */
export const toWorld = ({ scale, cx, cy }, ax, ay) => ({
  px: cx + (ax - 0.5) / scale,
  py: cy + (ay - 0.5) / scale,
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
export function zoomAbout(view, factor, ax = 0.5, ay = 0.5) {
  const scale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
  const { px, py } = toWorld(view, ax, ay);
  return clampView({ scale, cx: px - (ax - 0.5) / scale, cy: py - (ay - 0.5) / scale });
}

/**
 * Pan by a drag measured in fractions of the box. A drag of the full width at
 * scale 1 would be the whole world; at scale 4 it is a quarter of it, which is
 * what dividing by the scale buys — the land keeps pace with the finger at
 * every zoom instead of racing it.
 */
export const panBy = (view, dxFraction, dyFraction) =>
  clampView({ ...view, cx: view.cx - dxFraction / view.scale, cy: view.cy - dyFraction / view.scale });
