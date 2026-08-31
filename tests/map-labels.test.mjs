import test from 'node:test';
import assert from 'node:assert/strict';

import { clusterDots, layoutLabels } from '../src/lib/map-labels.js';

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

test('a dot with no room to its right is named on its left rather than dropped', () => {
  // Hard against the right edge: the right-hand box would be off-screen.
  const dots = [{ x: W - 4, y: 100, name: 'Constantinople' }];
  const [label] = layoutLabels(dots, measure, W, H);
  assert.ok(label, 'the name was dropped instead of being placed on the left');
  assert.ok(label.rect.x < W - 4, 'the label should sit to the left of the dot');
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

test('a cluster against the right edge stacks to its left, staying on screen', () => {
  const dots = [
    { x: W - 20, y: 300, name: 'Adrian of Nicomedia' },
    { x: W - 16, y: 306, name: 'Anicetas of Nicomedia' },
    { x: W - 24, y: 312, name: 'Photius of Nicomedia' },
  ];
  const out = layoutLabels(dots, measure, W, H);
  assert.ok(out.length >= 2, 'names against the right edge were dropped');
  for (const label of out) {
    assert.ok(label.rect.x < W, 'a label was placed off the right edge');
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
