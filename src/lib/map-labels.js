/**
 * Where each dot's name goes, and whether it needs a line drawn back to the
 * dot it belongs to.
 *
 * Pure arithmetic and no canvas, like `lib/map-view.js` beside it: laying out
 * labels is exactly the kind of thing that looks right in one screenshot and
 * is wrong in the next, so it is separated from the drawing and pinned in
 * `tests/map-labels.test.mjs` rather than checked by eye.
 *
 * **The problem this replaces** (author, 2026-08-31): "Some names are still
 * not displaying ... especially when a dot is to the left of others giving no
 * space for the text." The old pass put every label 6 px to the right of its
 * dot, kept it if that rectangle hit nothing already placed, and *dropped it
 * outright* otherwise — so in any cluster the leftmost dot won and everyone
 * to its right went unnamed, and near the right edge nobody was named at all.
 * Dropping is now the last resort rather than the first answer:
 *
 *   1. **Beside the dot**, right then left, if either side is clear. This is
 *      what a lone dot in open space still gets, and it needs no line.
 *   2. **Stacked with a leader line.** Every dot in a cluster is offered a
 *      row in a column beside that cluster, ordered by the dots' own y so
 *      the lines cross as little as they can, with a line from each dot to
 *      its row. The column goes on whichever side has more room, so a
 *      cluster near the right edge stacks to its left.
 *   3. **Dropped**, only if even the stack cannot place it.
 */

/** How far from the dot a label sits when it sits beside it. */
const GAP = 6;
/** A label's box is its text plus this much padding, and this tall. */
const PAD = 4;
const LINE_H = 16;
/** Dots within this many px of each other are one cluster. */
const CLUSTER_PX = 34;
/** How far out from the cluster's own edge a stacked column starts. */
const STACK_GAP = 18;
/** Rows in a stacked column are this far apart, centre to centre. Larger
 *  than `LINE_H`, so consecutive rows cannot touch. */
const STACK_STEP = 18;

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Whether any part of a box is inside the picture — the box only has to be
 *  *partly* on screen to be worth drawing, since the canvas clips the rest
 *  (2026-08-31: a name is not hidden because its far end ran off the edge). */
const onScreen = (r, w, h) => r.x + r.w > 0 && r.x < w && r.y + r.h > 0 && r.y < h;

/**
 * Single-linkage clusters over the dots: anything within `CLUSTER_PX` of any
 * member joins that member's group. Single-linkage rather than a grid bucket
 * so a diagonal chain of three dots is one cluster and not two — which is
 * exactly the shape a line of monasteries along a coast makes.
 */
export function clusterDots(dots, radius = CLUSTER_PX) {
  const groups = [];
  const seen = new Set();
  for (const dot of dots) {
    if (seen.has(dot)) continue;
    const group = [dot];
    seen.add(dot);
    // Grows as it goes: a dot pulled in can itself pull in its own neighbours.
    for (let i = 0; i < group.length; i++) {
      for (const other of dots) {
        if (seen.has(other)) continue;
        if (Math.hypot(group[i].x - other.x, group[i].y - other.y) <= radius) {
          group.push(other);
          seen.add(other);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

/**
 * Lays out every dot's label.
 *
 * `dots` need `{ x, y, name }`; `measure(name)` returns the text's width in
 * px, which is the one thing only a canvas can answer and so is passed in
 * rather than reached for. `w`/`h` are the picture's size.
 *
 * Returns one entry per label actually placed: `{ dot, x, y, rect, leader }`,
 * where `x`/`y` is where to draw the text (left-aligned, vertically centred)
 * and `leader` is `null` or `{ x1, y1, x2, y2 }` — the line from the dot to
 * its label. Nothing here draws; the caller does.
 */
export function layoutLabels(dots, measure, w, h) {
  const placed = [];
  const out = [];

  const boxFor = (dot, textW, side) => ({
    x: side === 'right' ? dot.x + GAP : dot.x - GAP - (textW + PAD),
    y: dot.y - LINE_H / 2,
    w: textW + PAD,
    h: LINE_H,
  });

  const take = (dot, rect, leader) => {
    placed.push(rect);
    out.push({ dot, x: rect.x + PAD / 2, y: dot.y, rect, leader });
  };

  for (const group of clusterDots(dots)) {
    const widths = new Map(group.map((d) => [d, measure(d.name)]));

    /*
     * **A lone dot is placed beside itself; a cluster is stacked whole.**
     *
     * The tempting version tries a side placement for every dot first and
     * stacks only the leftovers — and it is wrong, which a test caught
     * rather than a screenshot. In a cluster of five the first dot took the
     * space to its right and the second took the space to its *left*, and
     * that left-hand label then sat exactly where the stacked column for
     * the remaining three needed to go, so two of the five were dropped
     * after all. Deciding per cluster instead of per dot is also what the
     * instruction actually asks for — "identify clusters of saints and then
     * stack them" — and it reads better: five names in a tidy column with
     * five lines, rather than two names flung to opposite sides with three
     * stacked between them.
     */
    let toStack = group;
    if (group.length === 1) {
      const dot = group[0];
      const textW = widths.get(dot);
      const right = boxFor(dot, textW, 'right');
      const left = boxFor(dot, textW, 'left');
      if (onScreen(right, w, h) && !placed.some((r) => overlaps(right, r))) {
        take(dot, right, null);
        continue;
      }
      if (onScreen(left, w, h) && !placed.some((r) => overlaps(left, r))) {
        take(dot, left, null);
        continue;
      }
      // Neither side is free: fall through and let it take a leader line
      // rather than going unnamed. If the dot itself is off the picture the
      // stacked box will be too, and it is dropped there instead.
    }

    /*
     * A column beside the cluster, one row per dot, each with a line back to
     * the dot it names. The column goes on whichever side has more room, so
     * a cluster against the right edge stacks leftward rather than off it.
     */
    const cy = group.reduce((s, d) => s + d.y, 0) / group.length;
    const minX = Math.min(...group.map((d) => d.x));
    const maxX = Math.max(...group.map((d) => d.x));
    const toRight = w - maxX >= minX;
    // The column's own inner edge — where every leader line ends, whatever
    // its label's width, so the lines land in a row rather than a ragged
    // fan. Left-hand labels are right-aligned to it for the same reason.
    const edge = toRight ? maxX + STACK_GAP : minX - STACK_GAP;

    // Ordered by the dots' own y, so the leader lines run roughly parallel
    // instead of crossing each other on the way out to the column.
    const rows = [...toStack].sort((a, b) => a.y - b.y);
    const top = cy - ((rows.length - 1) * STACK_STEP) / 2;

    rows.forEach((dot, i) => {
      const textW = widths.get(dot);
      const y = top + i * STACK_STEP;
      const boxW = textW + PAD;
      const rect = { x: toRight ? edge : edge - boxW, y: y - LINE_H / 2, w: boxW, h: LINE_H };
      if (!onScreen(rect, w, h)) return;
      if (placed.some((r) => overlaps(rect, r))) return;
      placed.push(rect);
      out.push({
        dot,
        x: rect.x + PAD / 2,
        y,
        rect,
        // The line stops at the column's inner edge, not at the text itself,
        // so it reads as pointing *at* the name rather than striking it.
        leader: { x1: dot.x, y1: dot.y, x2: edge, y2: y },
      });
    });
  }

  return out;
}
