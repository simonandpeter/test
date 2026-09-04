import test from 'node:test';
import assert from 'node:assert/strict';

import { clusterDots, dailyRank, layoutBlobLabels, layoutLabels } from '../src/lib/map-labels.js';

/*
 * The map's label layout, held to the thing it was built to fix: a dot with
 * no room to its right used to go unnamed, which in any cluster meant the
 * leftmost dot won and everyone else was silently dropped. Every assertion
 * here is about a name *surviving* — the count placed, the line drawn back
 * to its own dot, or the box staying inside the picture.
 *
 * A fixed-width measurer, so these are facts about the layout rather than
 * about whichever font the machine running them happens to have.
 */
const measure = (name) => name.length * 7;

const W = 800;
const H = 600;

test('a lone dot takes the space beside it and needs no line', () => {
  const dots = [{ x: 100, y: 100, name: 'Anthony' }];
  const [label] = layoutLabels(dots, measure, W, H);
  assert.equal(label.leader, null, 'a label touching its own dot needs no leader');
  assert.ok(label.x > 100, 'the label sits to the right of the dot');
});

test('a dot hard against the right edge is named there anyway, running off the picture rather than falling back to its left', () => {
  /*
   * Author, 2026-09-04: "make sure all the text on the map always displays
   * to the right side of a dot." Author, 2026-09-05, the next round: "the
   * text doesnt have to stay on screen, it just prints to the right of the
   * dot and it can go off to the right side of the screen and undraws when
   * the dot is fully off the screen" — fitting inside the picture stopped
   * being a reason on its own to fall back to a leader line, the same "the
   * canvas clips the rest" reasoning a stacked column's own last row already
   * relied on.
   */
  const dots = [{ x: W - 4, y: 100, name: 'Constantinople' }];
  const [label] = layoutLabels(dots, measure, W, H);
  assert.ok(label, 'the name was dropped instead of printing off the edge');
  assert.equal(label.leader, null, 'a dot with nothing blocking it needs no leader, on or off screen');
  assert.ok(label.rect.x > W - 4, 'the label does not sit to the right of the dot');
  assert.ok(label.rect.x + label.rect.w > W, 'the label was pulled back onto the picture instead of running off it');
});

test('every dot in a tight cluster is named, not just the first', () => {
  /*
   * The defect this whole module exists for. Five dots close enough that
   * only one can take the space beside it; the rest must be stacked with
   * leader lines rather than going unnamed.
   */
  const dots = [
    { x: 400, y: 300, name: 'Adrian of Nicomedia' },
    { x: 406, y: 306, name: 'Anicetas of Nicomedia' },
    { x: 398, y: 312, name: 'Photius of Nicomedia' },
    { x: 410, y: 296, name: 'Paul of Thebes' },
    { x: 394, y: 302, name: 'Thecla of Gaza' },
  ];
  const out = layoutLabels(dots, measure, W, H);
  assert.equal(out.length, dots.length, 'some name in the cluster went undrawn');
  // And nothing overlaps anything else.
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i].rect;
      const b = out[j].rect;
      const hit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!hit, `labels ${i} and ${j} overlap`);
    }
  }
});

test('a stacked label carries a line back to its own dot', () => {
  const dots = [
    { x: 400, y: 300, name: 'Adrian' },
    { x: 404, y: 304, name: 'Anicetas' },
    { x: 396, y: 308, name: 'Photius' },
  ];
  const out = layoutLabels(dots, measure, W, H);
  const stacked = out.filter((l) => l.leader);
  assert.ok(stacked.length >= 1, 'a crowded cluster should stack at least one label');
  for (const label of stacked) {
    assert.equal(label.leader.x1, label.dot.x, 'the line does not start at its dot');
    assert.equal(label.leader.y1, label.dot.y, 'the line does not start at its dot');
    // And it ends at the near edge of its own text box, not through it.
    const nearEdge = label.leader.x2;
    assert.ok(
      nearEdge === label.rect.x || nearEdge === label.rect.x + label.rect.w,
      'the line should stop at an edge of the box it points at',
    );
  }
});

test('a cluster against the right edge still stacks off its own right, clamped to stay on screen', () => {
  const dots = [
    { x: W - 20, y: 300, name: 'Adrian of Nicomedia' },
    { x: W - 16, y: 306, name: 'Anicetas of Nicomedia' },
    { x: W - 24, y: 312, name: 'Photius of Nicomedia' },
  ];
  const out = layoutLabels(dots, measure, W, H);
  assert.ok(out.length >= 2, 'names against the right edge were dropped');
  for (const label of out) {
    assert.ok(label.rect.x >= 0 && label.rect.x + label.rect.w <= W, 'a label ran off the picture');
    assert.ok(label.leader, 'a cluster this tight should stack, not sit bare beside a dot');
  }
});

test('a label half off the edge is still drawn, since the canvas clips the rest', () => {
  /*
   * Author, 2026-08-31: "dont hide names if the end of their strings exits
   * the visible area. If any part of the string is displayed, make sure its
   * visible until string is fully off screen."
   */
  const dots = [{ x: W - 30, y: 100, name: 'A very long name indeed that runs off' }];
  const out = layoutLabels(dots, measure, W, H);
  assert.equal(out.length, 1, 'a name overrunning the edge was dropped outright');
});

test('a dot fully off the picture is not named at all', () => {
  const dots = [{ x: -500, y: 100, name: 'Somewhere else' }];
  assert.equal(layoutLabels(dots, measure, W, H).length, 0);
});

test('with leaders off, a crowded cluster falls back to sides-or-nothing', () => {
  /*
   * Author, 2026-08-31: "implement the leader line system only after 29x
   * zoom." Below that threshold `views/map.js` passes `leaders: false` and
   * this must behave exactly as the pass that shipped before the columns
   * did — some names beside their dots, the rest dropped, and *no lines*,
   * because at low zoom nearly every dot clusters with another and thirty
   * leader lines across the Mediterranean read worse than thirty missing
   * names.
   */
  const dots = [
    { x: 400, y: 300, name: 'Adrian of Nicomedia' },
    { x: 406, y: 306, name: 'Anicetas of Nicomedia' },
    { x: 398, y: 312, name: 'Photius of Nicomedia' },
    { x: 410, y: 296, name: 'Paul of Thebes' },
    { x: 394, y: 302, name: 'Thecla of Gaza' },
  ];
  const out = layoutLabels(dots, measure, W, H, false);
  assert.ok(out.length < dots.length, 'nothing was dropped, so the crowding was not real');
  assert.ok(out.length > 0, 'every name was dropped, which is worse than the columns');
  for (const label of out) assert.equal(label.leader, null, 'a leader line was drawn with leaders off');
});

test('with leaders off a lone dot is still named, exactly as before', () => {
  const out = layoutLabels([{ x: 100, y: 100, name: 'Anthony' }], measure, W, H, false);
  assert.equal(out.length, 1);
  assert.equal(out[0].leader, null);
});

test('clustering is single-linkage, so a diagonal chain is one group', () => {
  // Each 20px from the next: no pair is far apart, but the ends are 60 apart.
  const chain = [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 40, y: 0 },
    { x: 60, y: 0 },
  ];
  assert.equal(clusterDots(chain, 34).length, 1, 'the chain broke into separate groups');
  // And genuinely distant dots stay separate.
  assert.equal(clusterDots([{ x: 0, y: 0 }, { x: 500, y: 500 }], 34).length, 2);
});

test('a column is held inside the picture rather than running off its right edge', () => {
  /*
   * Author, 2026-08-31: on a phone at full zoom, "two of the 5 saints
   * located around constantinople" could not be read. One of the two was a
   * name whose column ran past the right edge and was clipped mid-word — a
   * 375 px picture and a 200 px name leave no room beside a cluster sitting
   * near the middle of it.
   */
  const w = 375;
  const dots = [
    { x: 187, y: 283, name: 'Alexander of Constantinople' },
    { x: 204, y: 295, name: 'Athanasius of Vysotsk' },
    { x: 198, y: 316, name: 'Gennadius of Constantinople' },
    { x: 177, y: 316, name: 'Natalia of Nicomedia' },
    { x: 170, y: 295, name: 'Niphon of Constantinople' },
  ];
  const out = layoutLabels(dots, measure, w, H);
  assert.equal(out.length, dots.length, 'a name in the cluster went undrawn');
  for (const label of out) {
    assert.ok(label.rect.x >= 0, `${label.dot.name} starts off the left edge`);
    assert.ok(label.rect.x + label.rect.w <= w, `${label.dot.name} runs off the right edge`);
  }
});

test('a column slides clear of a neighbouring column rather than losing a row', () => {
  /*
   * The other half of the same report. The Nicomedia four are laid out
   * first and stack leftward; the Constantinople five then want the same
   * ground, and placing them row by row dropped whichever row met the
   * neighbour — Natalia's, by seven pixels. The column is one block now,
   * slid up or down until every row in it fits.
   */
  const w = 375;
  const dots = [
    { x: 320, y: 357, name: 'Adrian of Nicomedia' },
    { x: 336, y: 373, name: 'Anicetas of Nicomedia' },
    { x: 320, y: 390, name: 'Photius of Nicomedia' },
    { x: 304, y: 373, name: 'The Twenty-three Martyrs' },
    { x: 187, y: 283, name: 'Alexander of Constantinople' },
    { x: 204, y: 295, name: 'Athanasius of Vysotsk' },
    { x: 198, y: 316, name: 'Gennadius of Constantinople' },
    { x: 177, y: 316, name: 'Natalia of Nicomedia' },
    { x: 170, y: 295, name: 'Niphon of Constantinople' },
  ];
  const out = layoutLabels(dots, measure, w, H);
  assert.equal(out.length, dots.length, 'two crowded clusters cost a name between them');
  const named = new Set(out.map((l) => l.dot.name));
  assert.ok(named.has('Natalia of Nicomedia'), 'the row that met the neighbouring column was dropped');
});

/*
 * `obstacles` — every dot on the picture, named or not (author, 2026-09-04:
 * "never overlaps another dot"). A label has to clear these the same way it
 * clears an already-placed label, whether it is judged alone or as a row in
 * a stacked column.
 */

test('a lone dot does not name itself over a different dot standing where its box would go', () => {
  const dots = [{ x: 100, y: 100, name: 'Anthony' }];
  // Sitting exactly where the right-hand box would otherwise land — the
  // layout should shift to a leader-line row that clears it instead, the
  // same fallback a dot with no room beside it at all already takes.
  const obstacles = [{ x: 130, y: 100, r: 8 }];
  const [label] = layoutLabels(dots, measure, W, H, true, obstacles);
  assert.ok(label, 'the name went undrawn rather than finding a clear shift');
  const o = obstacles[0];
  const hit = label.rect.x < o.x + o.r && o.x - o.r < label.rect.x + label.rect.w && label.rect.y < o.y + o.r && o.y - o.r < label.rect.y + label.rect.h;
  assert.ok(!hit, 'the label was drawn over the obstacle instead of shifting clear of it');
});

test('a stacked row skips a shift that would land on a dot it is not naming', () => {
  const dots = [
    { x: 400, y: 300, name: 'Adrian' },
    { x: 404, y: 304, name: 'Anicetas' },
  ];
  // Blocks the shift-0 column outright; the layout must find another shift
  // (or drop the row) rather than drawing through it.
  const obstacles = [{ x: 430, y: 300, r: 8 }];
  const out = layoutLabels(dots, measure, W, H, true, obstacles);
  for (const label of out) {
    assert.ok(
      !(label.rect.x < 430 + 8 && 430 - 8 < label.rect.x + label.rect.w && label.rect.y < 300 + 8 && 300 - 8 < label.rect.y + label.rect.h),
      'a label was drawn on top of an obstacle dot',
    );
  }
});

test('an obstacle does not block the dot it belongs to', () => {
  // The dot's own entry, passed back as its own obstacle — a label always
  // sits close to its own dot, so excluding it is what makes that legal.
  const dots = [{ x: 100, y: 100, name: 'Anthony' }];
  const out = layoutLabels(dots, measure, W, H, true, dots);
  assert.equal(out.length, 1, 'a dot was treated as its own obstacle');
});

/*
 * `layoutBlobLabels` — a closed blob's own "+N", which belongs to the whole
 * group rather than to any one dot inside it (2026-09-04). Always on a
 * leader line back to the blob's own centre, and cleared against every name
 * and dot already on the picture the same way a stacked row is.
 */

test('a blob count always carries a leader line back to the blob', () => {
  const blobs = [{ id: 'a', cx: 100, cy: 100, maxX: 120, name: '+9' }];
  const [label] = layoutBlobLabels(blobs, measure, W, H);
  assert.ok(label, 'the count was dropped with the whole picture free');
  assert.ok(label.leader, 'a blob count must always have a leader line');
  assert.equal(label.leader.x1, 100);
  assert.equal(label.leader.y1, 100);
});

test('a blob count does not land on an already-placed name', () => {
  const placed = [{ x: 130, y: 92, w: 60, h: 16 }];
  const blobs = [{ id: 'a', cx: 100, cy: 100, maxX: 120, name: '+9' }];
  const [label] = layoutBlobLabels(blobs, measure, W, H, placed);
  assert.ok(label, 'the count was dropped rather than finding another row');
  const hit = label.rect.x < placed[0].x + placed[0].w && placed[0].x < label.rect.x + label.rect.w && label.rect.y < placed[0].y + placed[0].h && placed[0].y < label.rect.y + label.rect.h;
  assert.ok(!hit, 'the count overlapped a name already on the picture');
});

test('a blob count does not land on a dot obstacle', () => {
  const obstacles = [{ x: 140, y: 100, r: 8 }];
  const blobs = [{ id: 'a', cx: 100, cy: 100, maxX: 120, name: '+9' }];
  const [label] = layoutBlobLabels(blobs, measure, W, H, [], obstacles);
  assert.ok(label, 'the count was dropped rather than shifting clear of the dot');
  const o = obstacles[0];
  const hit = label.rect.x < o.x + o.r && o.x - o.r < label.rect.x + label.rect.w && label.rect.y < o.y + o.r && o.y - o.r < label.rect.y + label.rect.h;
  assert.ok(!hit, 'the count overlapped a dot it does not belong to');
});

test('a second blob count clears the first, rather than stacking on it', () => {
  const blobs = [
    { id: 'a', cx: 100, cy: 100, maxX: 120, name: '+9' },
    { id: 'b', cx: 100, cy: 104, maxX: 122, name: '+11' },
  ];
  const out = layoutBlobLabels(blobs, measure, W, H);
  assert.equal(out.length, 2, 'one blob count crowded out the other rather than sharing the picture');
  const [a, b] = out;
  const hit = a.rect.x < b.rect.x + b.rect.w && b.rect.x < a.rect.x + a.rect.w && a.rect.y < b.rect.y + b.rect.h && b.rect.y < a.rect.y + a.rect.h;
  assert.ok(!hit, 'two blob counts overlapped each other');
});

test('a blob count with nowhere clear to land is dropped rather than drawn over something', () => {
  // Walls the blob in on every side a shift could try.
  const obstacles = Array.from({ length: 40 }, (_, i) => ({ x: 130, y: 100 - 200 + i * 10, r: 8 }));
  const blobs = [{ id: 'a', cx: 100, cy: 100, maxX: 120, name: '+9' }];
  const out = layoutBlobLabels(blobs, measure, W, H, [], obstacles);
  assert.equal(out.length, 0);
});

/*
 * `dailyRank` — "favour the saints that are main saints on the daily page and
 * the also commemorated in order when deciding which name to print over the
 * others when zoomed out" (author, 2026-09-01).
 *
 * The point of pinning it is that it is a *borrowing*: `pickHero` in
 * `lib/calendar-page.js` leads a day with a saint the church sings for, then
 * one with an icon, then anybody. If that precedence is ever reordered there,
 * these should be the tests that notice the map has stopped agreeing with the
 * page it claims to be following.
 */

test('a saint some church sings for outranks one with only an icon', () => {
  assert.ok(dailyRank({ hymned: ['oca'], image: null }) < dailyRank({ hymned: [], image: {} }));
});

test('a saint with an icon outranks a saint with neither', () => {
  assert.ok(dailyRank({ image: {} }) < dailyRank({}));
});

test('an empty hymned list is not a hymned saint', () => {
  // The manifest carries `hymned: []` for most of the corpus, and reading its
  // presence rather than its length would rank the whole corpus first.
  assert.equal(dailyRank({ hymned: [] }), dailyRank({}));
});

test('a card that is missing altogether ranks last rather than throwing', () => {
  assert.equal(dailyRank(undefined), dailyRank({}));
});
