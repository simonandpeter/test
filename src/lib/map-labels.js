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
 *      what a lone dot in open space gets, and it needs no line.
 *   2. **Stacked with a leader line**, past `leaders` only. Every dot in a
 *      cluster is offered a row in a column beside that cluster, ordered by
 *      the dots' own y so the lines cross as little as they can, with a line
 *      from each dot to its row. The column is placed as one block: whichever
 *      side has more room first, slid up or down a row at a time until every
 *      name in it fits, and always held inside the picture.
 *   3. **Dropped**, if no placement seats the column and the row's own spot
 *      is taken.
 *
 * **Stacking is off until the reader has zoomed well in** (author,
 * 2026-08-31, on seeing it: "the name display worked better before.
 * implement the leader line system only after 29x zoom"). The reason it
 * reads worse when zoomed out is density: at low zoom nearly every dot is
 * within `CLUSTER_PX` of another, so almost the whole corpus becomes one or
 * two clusters, and a column of thirty names with thirty lines fanning back
 * across the Mediterranean is far harder to read than a handful of names
 * beside their own dots and the rest left unnamed. Past 29× a cluster is
 * genuinely a few saints in one town — Nicomedia's martyrs, the Kyiv Caves
 * pair — which is the case the column was built for and the case where
 * dropping the names is the worse answer. So the caller passes `leaders`
 * and this stays a layout decision rather than a zoom one.
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
/**
 * How far a column may be slid off its cluster's own centre, in whole rows,
 * looking for somewhere every one of its names fits. Alternating out from
 * zero so the nearest placement wins.
 *
 * Eight rows is the reach, and the number is a measurement rather than a
 * taste: on a 360 px picture two crowded clusters cannot both have a column
 * beside them — one saint's name is most of that width on its own — so the
 * only room left for the second is *above or below* the first, and clearing
 * a nine-row column takes more than the four rows this first shipped with.
 * Past eight the leader line is longer than the reading it buys, and a name
 * that far from its dot is a worse answer than the one name it saves.
 */
const SHIFTS = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7, -8, 8].map((n) => n * STACK_STEP);

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Whether any part of a box is inside the picture — the box only has to be
 *  *partly* on screen to be worth drawing, since the canvas clips the rest
 *  (2026-08-31: a name is not hidden because its far end ran off the edge). */
const onScreen = (r, w, h) => r.x + r.w > 0 && r.x < w && r.y + r.h > 0 && r.y < h;

/** Whether the whole box is inside the picture — no word of it clipped. */
const fullyOn = (r, w, h) => r.x >= 0 && r.x + r.w <= w && r.y >= 0 && r.y + r.h <= h;

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
 * `leaders` opts into the stacked columns; with it false every dot takes a
 * side placement or none, which is the behaviour that shipped before the
 * columns did.
 *
 * Returns one entry per label actually placed: `{ dot, x, y, rect, leader }`,
 * where `x`/`y` is where to draw the text (left-aligned, vertically centred)
 * and `leader` is `null` or `{ x1, y1, x2, y2 }` — the line from the dot to
 * its label. Nothing here draws; the caller does.
 */
export function layoutLabels(dots, measure, w, h, leaders = true) {
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

  /*
   * With no leader lines there is nothing a cluster buys — every dot is
   * judged on its own two sides — so the grouping pass is skipped rather
   * than run and ignored.
   */
  const groups = leaders ? clusterDots(dots) : dots.map((d) => [d]);

  for (const group of groups) {
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
      /*
       * **A side that fits the whole name beats a side that clips it**, and
       * only then does a partly-visible name beat none. Right-then-left with
       * no such preference put a long name off the edge whenever the right
       * was merely *touched* by the picture — readable as three words and a
       * cliff, with the far side of the word simply gone, when the left had
       * room for all of it. It matters most for the chosen saint, whose
       * `Profile ›` button hangs off the end of their name (`views/map.js`).
       */
      for (const rect of [right, left]) {
        if (!fullyOn(rect, w, h) || placed.some((r) => overlaps(rect, r))) continue;
        take(dot, rect, null);
        toStack = null;
        break;
      }
      if (toStack === null) continue;
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
      if (!leaders) continue;
    }

    /*
     * A column beside the cluster, one row per dot, each with a line back to
     * the dot it names. The column goes on whichever side has more room, so
     * a cluster against the right edge stacks leftward rather than off it.
     */
    const cy = group.reduce((s, d) => s + d.y, 0) / group.length;
    const minX = Math.min(...group.map((d) => d.x));
    const maxX = Math.max(...group.map((d) => d.x));
    /*
     * Ordered by the dots' own y, so the leader lines run roughly parallel
     * instead of crossing each other on the way out to the column — and only
     * dots the reader can actually see. Holding the column inside the picture
     * (below) would otherwise name a dot that is off it, with a leader line
     * running out of the frame to a name pointing at nothing.
     */
    const rows = toStack.filter((d) => d.x >= 0 && d.x <= w && d.y >= 0 && d.y <= h).sort((a, b) => a.y - b.y);
    if (!rows.length) continue;
    // The whole column is one block this wide, so its rows share an inner
    // edge and the leader lines land in a row rather than a ragged fan.
    const colW = Math.max(...rows.map((d) => widths.get(d) + PAD));

    const build = (side, shift) => {
      const gapEdge = side === 'right' ? maxX + STACK_GAP : minX - STACK_GAP;
      /*
       * The block, held inside the picture. Before this a wide column beside
       * a cluster near an edge simply ran off it, and the names hanging over
       * the boundary were clipped mid-word — which on a 375 px phone at full
       * zoom is most of a saint's name (author, 2026-08-31: two of the five
       * saints at Constantinople could not be read at any zoom). A stacked
       * label has a line back to its own dot, so moving it is unambiguous in
       * a way moving a label that merely sits *beside* its dot would not be.
       */
      const left = side === 'right' ? Math.min(gapEdge, w - colW) : gapEdge - colW;
      const x = Math.max(0, left);
      const top = cy - ((rows.length - 1) * STACK_STEP) / 2 + shift;
      return rows.map((dot, i) => {
        const y = top + i * STACK_STEP;
        const boxW = widths.get(dot) + PAD;
        // Right-hand rows run out from the inner edge, left-hand ones back
        // to it, so every leader line in a column stops at the same x.
        const inner = side === 'right' ? x : x + colW;
        return {
          dot,
          y,
          rect: { x: side === 'right' ? x : inner - boxW, y: y - LINE_H / 2, w: boxW, h: LINE_H },
          // The line stops at the column's inner edge, not at the text
          // itself, so it reads as pointing *at* the name rather than
          // striking it.
          leader: { x1: dot.x, y1: dot.y, x2: inner, y2: y },
        };
      });
    };

    const free = (row) => onScreen(row.rect, w, h) && !placed.some((r) => overlaps(row.rect, r));

    /*
     * **The whole cluster or nothing, tried in several places first.**
     * Placing row by row and dropping whatever collided meant a column that
     * happened to reach a neighbouring cluster's column lost a name outright
     * — Natalia of Nicomedia, at Constantinople, whose row met the Nicomedia
     * column's top row by seven pixels. Sliding the column a row or two up or
     * down clears that, and a leader line means the reader still knows whose
     * name it is; so the candidates are tried in order and the first that
     * seats every row wins. Only when none does is a row dropped.
     */
    const sides = w - maxX >= minX ? ['right', 'left'] : ['left', 'right'];
    let seated = null;
    for (const shift of SHIFTS) {
      for (const side of sides) {
        const candidate = build(side, shift);
        if (candidate.every(free)) {
          seated = candidate;
          break;
        }
      }
      if (seated) break;
    }

    for (const row of seated ?? build(sides[0], 0)) {
      if (!seated && !free(row)) continue;
      placed.push(row.rect);
      out.push({ dot: row.dot, x: row.rect.x + PAD / 2, y: row.y, rect: row.rect, leader: row.leader });
    }
  }

  return out;
}
