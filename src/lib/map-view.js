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
 * 240 — doubled from 120 (2026-09-01, "zoom in further all over the place",
 * prompted by the crowd of saints at Constantinople), matched to a doubled
 * coastline precision rather than outrunning it as the previous doubling did.
 *
 * `land.js`/`water.js` now round to a hundredth of a degree (~1.1 km,
 * `make-land.mjs`'s own `PRECISION`, raised 2026-09-01 from a tenth), so 240
 * is the coastline's own honest ceiling at this precision — ten times finer
 * than the tenth-of-a-degree rounding that made 24 the ceiling before it, and
 * 240 is ten times 24. Past it the polygon would be visibly coarse again and
 * §6b's objection — a map that keeps zooming into detail it does not have is
 * lying about its own precision — would apply the same way it did at 120
 * under the old rounding. What still earns zooming this far, honest or not,
 * is that the reason is never really the coastline: it is prising apart two
 * saints who died in the same town, and `declutter`'s spread is a fixed
 * number of *screen* pixels, so more zoom is the only thing that turns that
 * fixed spread into readable distance. The labels' leader lines
 * (`views/map.js`) are the other half of that answer and do not need zoom at
 * all; this is for the reader who wants to see the ground as well.
 */
export const MAX_SCALE = 240;

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
 * How near two dots have to be, in screen px, before the map draws them as
 * one mark. A dot is 2.5 px, so ten is comfortably past "these two overlap"
 * and well short of "these two are separate places I can tell apart".
 */
export const MERGE_PX = 10;

/**
 * How far apart saints recorded at one identical coordinate are drawn, **in
 * degrees on the ground** (author, 2026-09-01: "now that we can zoom in
 * further, spread the dots around as coordinates on the map if they're
 * stacked. Spread them to be still pretty tightly spaced when zoomed in fully
 * to communicate proximity").
 *
 * **A ground offset is not the fan this map already threw away, and the unit
 * is the whole difference.** The fan was a fixed number of *screen* pixels,
 * so it covered more country the further out the reader went — the crowd at
 * Constantinople reaching into the Black Sea — and it never resolved, being
 * the same ring at 1× as at 240×. A ground offset does the opposite of both:
 * it is sub-pixel when the whole world is on screen, so `mergeDots` still
 * collapses the group into one honest mark, and it grows with the zoom until
 * the members separate into a tight little constellation.
 *
 * 0.0167° is about 1.8 km, chosen from the ceiling backwards: at `MAX_SCALE`
 * a 900 px-wide picture shows 1.5° across, so this is ~10 px between
 * neighbours — tight enough to read as "these are the same place" and far
 * enough apart to count them. It scales with the picture, so a 1280 px window
 * gets ~14 px and a 360 px phone ~4 px; the phone is the weak end of that and
 * is the reason this is not smaller.
 *
 * **It is still an invented position**, which is why it is this small: at
 * every zoom below the last few it is inside the dot it came from, and it
 * never claims a distance the corpus did not record.
 */
export const SPREAD_DEG = 0.0167;

/**
 * Spreads saints recorded at one identical coordinate into a tight ring about
 * it, in lon/lat rather than in pixels — see `SPREAD_DEG` for why the unit is
 * the point.
 *
 * Grouping is on the exact coordinate, so this touches only the saints no zoom
 * could ever separate on its own; two saints a kilometre apart are left alone,
 * the map already telling them apart the moment it can.
 *
 * **The ring is drawn round on the picture, not on the globe.** Mercator
 * stretches latitude by `1/cos(lat)`, so a ring of equal degrees would draw as
 * a tall ellipse at Kyiv and a taller one at Solovki; multiplying the latitude
 * offset by `cos(lat)` is what makes the constellation a circle where the
 * reader is looking at it.
 *
 * `points` is any array carrying `{ lon, lat }`. Returns a new array in the
 * same order, each point's own fields kept and its coordinates moved.
 */
export function spreadShared(points, radiusDeg = SPREAD_DEG) {
  const groups = new Map();
  for (const p of points) {
    const key = `${p.lon},${p.lat}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const moved = new Map();
  for (const group of groups.values()) {
    if (group.length === 1) continue;
    const { lon, lat } = group[0];
    // Radians, and never at a pole: `cos` of 90° is 0 and would collapse the
    // ring into a horizontal line.
    const squash = Math.max(0.15, Math.cos((lat * Math.PI) / 180));
    /*
     * Concentric rings filled from the inside out, so the radius grows as the
     * square root of the group rather than with it: twenty-four martyrs at
     * Nicomedia sit inside three rings rather than one wheel three times the
     * width. How many fit on a ring is its own circumference over the
     * spacing, so no two neighbours are ever closer than a pair would be.
     */
    let placed = 0;
    let ring = 1;
    while (placed < group.length) {
      const r = radiusDeg * ring;
      const capacity = Math.max(1, Math.floor((2 * Math.PI * r) / radiusDeg));
      const here = Math.min(capacity, group.length - placed);
      for (let i = 0; i < here; i += 1) {
        // Half a step of turn on every other ring, so the rings' own dots do
        // not line up into spokes radiating out of the middle.
        const angle = (2 * Math.PI * i) / here - Math.PI / 2 + (ring % 2 ? 0 : Math.PI / here);
        moved.set(group[placed + i], {
          lon: lon + r * Math.cos(angle),
          lat: lat + r * Math.sin(angle) * squash,
        });
      }
      placed += here;
      ring += 1;
    }
  }
  return points.map((p) => {
    const at = moved.get(p);
    return at ? { ...p, lon: at.lon, lat: at.lat } : p;
  });
}

/**
 * Collapses dots the reader could not tell apart at this zoom into one mark
 * each, **at a real coordinate**, and says how many saints stand behind it.
 *
 * **This replaces a fan, and the fan was the bug** (author, 2026-09-01: "the
 * clustering at full zoom doesn't work: the saint dots in constantinople
 * stretch out into the black sea. Make it so more dots are revealed as you
 * zoom in and are actual coordinates on the map not scaling clusters").
 * Until now, saints who shared a spot were spread into concentric rings a
 * fixed number of *screen* pixels wide — so a crowd at Constantinople was
 * drawn as a wheel of dots sitting on ground none of them ever stood on, and
 * because the spread was in pixels it covered more country the further out
 * the reader went, reaching across the Bosphorus and into the Black Sea. Every
 * one of those positions was invented. No zoom dissolved them, either: the
 * ring was the same size at 1× and at 240×, so the map never resolved into
 * the places it was drawing.
 *
 * What replaces it says less and means it. Every mark sits at a coordinate a
 * saint is actually recorded at — the representative's own — and a mark
 * standing for more than one saint carries `n`, which is what lets the
 * drawing pass say "and more here". Zooming in pushes the members apart in
 * screen space until they exceed `radiusPx` and become marks of their own, so
 * **more dots really are revealed as the reader goes in**, all the way down to
 * one mark per saint. Saints who share an *identical* coordinate — the
 * twenty-four martyrs of Nicomedia, or John the Long-Suffering and Moses the
 * Hungarian at the Caves in Kyiv — never separate, at any zoom, because they
 * are one place; they stay one mark that says how many, which is the honest
 * answer the fan was avoiding.
 *
 * `rankOf` decides which member the mark *is*: the whole array is sorted by it
 * first, so a group's representative is its best-ranked member and never an
 * artefact of the order the caller built the array in. `views/map.js` ranks
 * the chosen saint first, then one moving along a rail, then the saints the
 * Daily page leads with — so the name a collapsed crowd prints is the name
 * that page would print.
 *
 * `points` is any array of `{x, y, ...}` in the px space the canvas draws in.
 * Returns one entry per mark: the representative's own fields, plus `members`
 * (every saint behind it, representative first) and `n` (how many).
 */
export function mergeDots(points, radiusPx = MERGE_PX, rankOf = () => 0) {
  const marks = [];
  for (const p of [...points].sort((a, b) => rankOf(a) - rankOf(b))) {
    // Against the marks already taken, not against every point: a mark's
    // position is its representative's own, so this cannot drift off a real
    // coordinate however many members join it.
    const near = marks.find((m) => Math.hypot(m.x - p.x, m.y - p.y) <= radiusPx);
    if (near) near.members.push(p);
    else marks.push({ ...p, members: [p] });
  }
  for (const mark of marks) mark.n = mark.members.length;
  return marks;
}

/**
 * The view that frames a whole set of projected points — the scale at which
 * they all fit with `margin` of the box to spare on each side, centred on
 * their own middle.
 *
 * Written for "centre me over this saint's whole rail rather than over the
 * one spot they are standing on" (author, 2026-09-01), which is a question
 * about an extent and not about a point: a journey the reader cannot see the
 * ends of has not been shown to them. The bounding box's midpoint is right
 * here where `defaultView`'s mean was right there — this is framing one
 * saint's own recorded path, where every end matters, not choosing a view of
 * a corpus where one outlier must not drag the centre.
 *
 * A single point has no extent and gets `Infinity`, clamped to `MAX_SCALE`;
 * callers with an opinion about how close is too close cap it themselves.
 */
export function fitBounds(points, frame = WHOLE, margin = 0.15) {
  if (!points.length) return HOME;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const usable = Math.max(0.05, 1 - 2 * margin);
  const fit = (span, f) => (span > 0 ? (f * usable) / span : Infinity);
  const scale = clamp(Math.min(fit(maxX - minX, frame.fx), fit(maxY - minY, frame.fy)), MIN_SCALE, MAX_SCALE);
  return clampView({ scale, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }, frame);
}
