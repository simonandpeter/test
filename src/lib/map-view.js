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

/**
 * The picture 240 was measured against. A ceiling in *scale* is only a claim
 * about what the reader can resolve if you also say how wide the glass is.
 */
export const REFERENCE_W = 1280;

/**
 * How far a picture `w` px wide may zoom (author, 2026-09-01: "match zoom
 * capabilities on mobile to what we now have on desktop, because we cant see
 * the individual dots on mobile").
 *
 * **The ceiling is about resolving power, not about scale.** What 240 buys is
 * a constellation of stacked saints about fourteen pixels across
 * (`SPREAD_DEG`) — and that arithmetic has the picture's width in it, so the
 * same 240 on a 360 px phone buys four pixels and the crowd stays a smudge.
 * So the ceiling is 240 scaled by how much narrower the glass is than the
 * desk it was measured on.
 *
 * **That brings a phone into the same order, not to the same number**, and
 * the difference is `coverFractions`: the world covers the box, so on a tall
 * narrow window the horizontal axis is cropped and a degree is worth more
 * pixels than the width alone predicts. Measured at the Kyiv Caves, where two
 * saints share a coordinate exactly: 28 px apart at the ceiling on a 1280x780
 * desk and 56 on a 360x780 phone. Overshooting is the safe direction — the
 * complaint this answers was that the phone could not separate them at all —
 * and folding the frame into this would make the ceiling depend on the
 * window's shape as well as its width, which is a harder number to reason
 * about for a gain nobody asked for.
 *
 * Never below the desktop ceiling, and capped at four times it: a very narrow
 * window would otherwise ask for a zoom where the coastline is a coarse
 * polygon and nothing but the ring is legible anyway.
 */
export function maxScaleFor(w) {
  if (!w || w <= 0) return MAX_SCALE;
  return clamp((MAX_SCALE * REFERENCE_W) / w, MAX_SCALE, MAX_SCALE * 4);
}

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
export const clampView = ({ scale, cx, cy }, frame = WHOLE, max = MAX_SCALE) => {
  const s = clamp(scale, MIN_SCALE, max);
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
export function zoomAbout(view, factor, ax = 0.5, ay = 0.5, frame = WHOLE, max = MAX_SCALE) {
  const scale = clamp(view.scale * factor, MIN_SCALE, max);
  const { px, py } = toWorld(view, ax, ay, frame);
  return clampView(
    { scale, cx: px - ((ax - 0.5) * frame.fx) / scale, cy: py - ((ay - 0.5) * frame.fy) / scale },
    frame,
    max,
  );
}

/**
 * Pan by a drag measured in fractions of the box. A drag of the full width at
 * scale 1 would be the whole visible span; at scale 4 it is a quarter of it,
 * which is what dividing by the scale buys — the land keeps pace with the
 * finger at every zoom instead of racing it.
 */
/*
 * **`max` matters even though a pan never changes `scale`** (2026-09-02).
 * `clampView` re-clamps the scale it is handed, and its own default is the
 * desktop ceiling — so a pan on a narrower window, where `maxScaleFor` had
 * legitimately allowed a scale past `MAX_SCALE`, silently dragged the reader
 * back to 240x on the next pointer move. Desktop never saw it: its own
 * ceiling *is* `MAX_SCALE`, so clamping against the wrong default was a
 * no-op there. Every caller now needs its own `ceilingOf(canvas)`, the same
 * one `zoomAbout` already takes.
 */
export const panBy = (view, dxFraction, dyFraction, frame = WHOLE, max = MAX_SCALE) =>
  clampView(
    {
      ...view,
      cx: view.cx - (dxFraction * frame.fx) / view.scale,
      cy: view.cy - (dyFraction * frame.fy) / view.scale,
    },
    frame,
    max,
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
 * A seeded, deterministic 32-bit generator — mulberry32 — so a group's own
 * scatter is a pure function of its coordinate and holds still across every
 * repaint rather than reshuffling under the reader's own drag. Seeded from an
 * FNV-1a hash of the group's key, the same hashing shape `shuffleKey`
 * (`lib/index-filters.js`) already uses for the Index's own shuffle, kept
 * local rather than imported — this file is pure and dependency-free on
 * purpose, and the two features share nothing else.
 */
function scatterRand(key) {
  let h = 0x811c9dc5;
  const text = `map-scatter:${key}`;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A crowd at one coordinate settles into an organic cluster rather than a
 * wheel (author, 2026-09-04: "make the dot scatter according to this logic",
 * a standalone mockup comparing four candidates against the shipped rings —
 * `scatter-mockup/index.html`, not part of the app — at the Nicomedia
 * martyrs' own count. Random start, min-separation relaxation was the one
 * chosen; twenty-four points seeded at random inside a disc, then pushed
 * apart in place wherever a pair is closer than `radiusDeg` — the same
 * spacing the ring version's own neighbours never closed either — repeated
 * until the crowd stops overlapping itself. `discR` still grows with
 * `sqrt(n)`, which is the ring layout's own reason twenty-four martyrs sit
 * inside a cluster three rings wide rather than a wheel three times as wide;
 * only the packing inside that disc changed, from a machined lattice to
 * something that reads as a real crowd standing in a place rather than a
 * diagram of one.
 *
 * Exported despite being `spreadShared`'s own detail, the way `mergeDots` and
 * `fitBounds` already are: it is where the packing itself is worth pinning —
 * `spreadShared` only adds the squash correction on top, and testing that
 * composition needs the raw, unsquashed points this returns.
 */
export function relaxLayout(n, radiusDeg, key) {
  const rand = scatterRand(key);
  const minSep = radiusDeg;
  const discR = radiusDeg * Math.max(0.8, Math.sqrt(n) * 0.45);
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = rand() * 2 * Math.PI;
    const r = Math.sqrt(rand()) * discR;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  // Sixty passes: measured against 1000 random groups of 24 (this file's own
  // ceiling in the corpus today), the closest pair never settled under
  // `radiusDeg` and the outer edge never overran twice `discR`'s own start.
  for (let pass = 0; pass < 60; pass += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        const d = Math.hypot(dx, dy) || 0.0001;
        if (d >= minSep) continue;
        const push = (minSep - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        pts[i].x -= ux * push;
        pts[i].y -= uy * push;
        pts[j].x += ux * push;
        pts[j].y += uy * push;
      }
    }
  }
  return pts;
}

/**
 * Spreads saints recorded at one identical coordinate into a tight cluster
 * about it, in lon/lat rather than in pixels — see `SPREAD_DEG` for why the
 * unit is the point.
 *
 * Grouping is on the exact coordinate, so this touches only the saints no zoom
 * could ever separate on its own; two saints a kilometre apart are left alone,
 * the map already telling them apart the moment it can.
 *
 * **The cluster is drawn round on the picture, not on the globe.** Mercator
 * stretches latitude by `1/cos(lat)`, so an offset of equal degrees would draw
 * taller than it is wide at Kyiv and taller still at Solovki; multiplying the
 * latitude offset by `cos(lat)` is what makes the crowd read true where the
 * reader is looking at it. `relaxLayout` works in an idealised, unsquashed
 * unit — the same one the mockup calls px — for exactly this reason: doing the
 * physics in a space where a circle is a circle, and correcting for the
 * picture only once, at the end.
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
  for (const [key, group] of groups) {
    if (group.length === 1) continue;
    const { lon, lat } = group[0];
    // Radians, and never at a pole: `cos` of 90° is 0 and would collapse the
    // cluster into a horizontal line.
    const squash = Math.max(0.15, Math.cos((lat * Math.PI) / 180));
    const pts = relaxLayout(group.length, radiusDeg, key);
    for (let i = 0; i < group.length; i += 1) {
      moved.set(group[i], { lon: lon + pts[i].x, lat: lat + pts[i].y * squash });
    }
  }
  return points.map((p) => {
    const at = moved.get(p);
    return at ? { ...p, lon: at.lon, lat: at.lat } : p;
  });
}

/**
 * A shared coordinate this crowded stops being one picture's worth of names
 * (author, 2026-09-04: "only do this blob function wherever there are more
 * than 8 saints, at which point you will have 2 blobs — no point in having a
 * single blob, the function of the blob is for large clusters"). Below this
 * a group is left exactly as `mergeDots` and the label layout already treat
 * it; only a coordinate over the line is ever partitioned into blobs at all,
 * so Constantinople's five and the Caves' two never do.
 */
export const BLOB_MAX = 8;

/**
 * Partitions a crowd of points into groups of at most `maxPer`, without
 * moving a single one of them — capacity-constrained k-means. Plain k-means
 * can leave a cluster over capacity wherever the geometry is lopsided (a
 * corner of the scatter with nine natural neighbours and an eight-seat
 * limit), so assignment is nearest-centroid-with-a-free-seat: every
 * (point, centroid) pair is sorted by distance once a pass, and a point takes
 * the nearest centroid that still has room. A handful of Lloyd passes —
 * recompute each centroid as its members' own mean, reassign — settles the
 * groups into something compact and roughly even.
 *
 * Seeded like `relaxLayout`'s own scatter, so the same crowd partitions the
 * same way on every call: `views/map.js` calls this once a paint, on
 * whichever coordinates currently have more than `BLOB_MAX` visible members,
 * and a partition that reshuffled itself from one frame to the next would
 * read as the crowd rearranging under the reader mid-drag.
 *
 * `points` is any array carrying `{x, y}` — lon/lat, screen px, or the
 * `relaxLayout` offsets themselves all work, since capacity-constrained
 * k-means is invariant to a uniform scale and translation and every one of
 * those is one. Returns arrays of *indices* into `points`, one per group,
 * groups with no members omitted.
 */
export function capacitatedGroups(points, maxPer, seed) {
  const k = Math.max(1, Math.ceil(points.length / maxPer));
  if (k === 1) return [points.map((_, i) => i)];
  const rand = scatterRand(seed);
  const pool = points.map((_, i) => i);
  let centroids = [];
  for (let i = 0; i < k; i += 1) {
    const j = Math.floor(rand() * pool.length);
    centroids.push({ x: points[pool[j]].x, y: points[pool[j]].y });
    pool.splice(j, 1);
  }
  let assignment = new Array(points.length).fill(-1);
  for (let iter = 0; iter < 8; iter += 1) {
    const pairs = [];
    for (let i = 0; i < points.length; i += 1) {
      for (let c = 0; c < k; c += 1) {
        pairs.push({ i, c, d: Math.hypot(points[i].x - centroids[c].x, points[i].y - centroids[c].y) });
      }
    }
    pairs.sort((a, b) => a.d - b.d);
    assignment.fill(-1);
    const counts = new Array(k).fill(0);
    for (const { i, c } of pairs) {
      if (assignment[i] !== -1 || counts[c] >= maxPer) continue;
      assignment[i] = c;
      counts[c] += 1;
    }
    const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, n: 0 }));
    for (let i = 0; i < points.length; i += 1) {
      const s = sums[assignment[i]];
      s.x += points[i].x;
      s.y += points[i].y;
      s.n += 1;
    }
    centroids = sums.map((s, c) => (s.n ? { x: s.x / s.n, y: s.y / s.n } : centroids[c]));
  }
  const groups = Array.from({ length: k }, () => []);
  assignment.forEach((c, i) => groups[c].push(i));
  return groups.filter((g) => g.length);
}

/**
 * The convex hull of a `capacitatedGroups` group, monotone chain — the
 * outline `views/map.js` traces its blob from. Fewer than three points has no
 * hull to speak of and is handed back unchanged; the caller draws those as a
 * halo around the one or two dots instead of a polygon with nothing to bound.
 */
export function convexHull(points) {
  if (points.length < 3) return points.slice();
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** A hull pushed outward from its own centroid by `pad`, so a blob has room
 *  around each dot rather than passing through their centres. */
export function inflateHull(hull, pad) {
  if (!hull.length) return hull;
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / d) * pad, y: p.y + (dy / d) * pad };
  });
}

/** Standard ray-casting point-in-polygon, for "is the screen's centre inside
 *  this blob" — `hull` under three points is never entered. */
export function pointInHull(pt, hull) {
  if (hull.length < 3) return false;
  let inside = false;
  for (let i = 0, j = hull.length - 1; i < hull.length; j = i, i += 1) {
    const xi = hull[i].x;
    const yi = hull[i].y;
    const xj = hull[j].x;
    const yj = hull[j].y;
    const crosses = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** The nearest a point comes to a hull's own boundary — the margin
 *  `views/map.js`'s centring hysteresis is measured against once the
 *  crosshair has left the hull it was inside. */
export function distToHull(pt, hull) {
  let best = Infinity;
  for (let i = 0, j = hull.length - 1; i < hull.length; j = i, i += 1) {
    const a = hull[j];
    const b = hull[i];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((pt.x - a.x) * abx + (pt.y - a.y) * aby) / len2));
    const px = a.x + abx * t;
    const py = a.y + aby * t;
    best = Math.min(best, Math.hypot(pt.x - px, pt.y - py));
  }
  return best;
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
export function fitBounds(points, frame = WHOLE, margin = 0.15, max = MAX_SCALE) {
  if (!points.length) return HOME;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const usable = Math.max(0.05, 1 - 2 * margin);
  const fit = (span, f) => (span > 0 ? (f * usable) / span : Infinity);
  const scale = clamp(Math.min(fit(maxX - minX, frame.fx), fit(maxY - minY, frame.fy)), MIN_SCALE, max);
  return clampView({ scale, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }, frame, max);
}
