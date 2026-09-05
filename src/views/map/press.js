import { pointInHull } from '../../lib/map-view.js';
import { map } from './state.js';

/**
 * The press on the picture — choosing a dot or a blob, letting go, the
 * hover that previews a blob on a mouse — and the `Profile ›` button that
 * is the only door off the map to a saint. `dotAt` and `blobAt` read the
 * hit-maps the paint pass writes (`map.drawnDots`, `map.drawnBlobs`).
 *
 * Cut from `views/map.js` on 2026-09-05 (cleanup plan item 5).
 */

/**
 * The press, which **chooses a saint rather than opening one** since
 * 2026-08-31. It was a door from 2026-08-30 (Amendment 77) and the reversal
 * is the author's: "if you click on a saint dot (or their name) it first
 * centres you smoothly on them and then shows their path of travel." The
 * door is the `Profile ›` button that choosing puts beside the name, so
 * nothing is unreachable — but a dot is now a thing you can look at as well
 * as leave by, which is what having a rail to show made worth doing.
 *
 * A press is still distinguished from a drag the way loop-scroll's
 * click-swallow does it — by distance, not by time — and the hit radius is
 * still a finger's rather than the dot's own 2.5 px.
 *
 * **A blob is the second thing a press can find** (2026-09-04): a dot still
 * wins where the two disagree, being the smaller and more particular target,
 * and only a press that finds neither releases.
 */
export function wirePress(canvas, choose, chooseBlob, release, refresh) {
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    const was = downAt;
    downAt = null;
    if (!was || Math.hypot(e.clientX - was.x, e.clientY - was.y) > 5) return;
    const hit = dotAt(canvas, e);
    const blob = blobAt(canvas, e);
    /*
     * A dot still inside a *closed* blob has no name on screen to have
     * aimed at (`blobSilenced`, above) — the blob it belongs to is what the
     * press actually found, the same door a press anywhere else in its
     * outline already opens. A dot with no blob, or one inside the blob
     * already open, still wins: its name is on screen, and a second press
     * on a member of an open blob is how a reader reaches that one saint.
     */
    if (hit && (!hit.blobId || hit.blobId === map.openBlobId)) choose(hit);
    else if (blob) chooseBlob(blob);
    // A press that finds nobody is the "click away" that lets go — on the
    // picture only. The timeline is not somewhere to click away *to*:
    // scrubbing the years to watch the chosen saint move is the whole
    // reason for choosing one.
    else if (hit) choose(hit);
    else release();
  });
  // The cursor says a dot or a blob is pressable before the press finds out
  // — and on a mouse, hovering a blob is the press's own effect early
  // (author, 2026-09-04: "when you hover your mouse over a blob, its the
  // same function as moving the centre of the screen over the blob").
  // `pointerType` rather than a coarse-pointer media query: this is one
  // event's own input device, not a guess from the window's width, and a
  // touch that has not lifted yet must not open a blob it is only resting on.
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons) return;
    const dot = dotAt(canvas, e);
    /*
     * **Checked whether or not a dot also answers** — a blob's own hull is
     * mostly the dots inside it, so gating this on "no dot found" the way
     * the cursor and the click below do would mean hovering the blob almost
     * never fires: the pointer is nearly always within a dot's own 12px
     * reach somewhere inside a cluster this tight. Opening the blob is a
     * coarser question than which one dot the pointer happens to be nearest.
     */
    const blob = blobAt(canvas, e);
    canvas.style.cursor = dot || blob ? 'pointer' : '';
    if (e.pointerType !== 'mouse') return;
    const next = blob?.id ?? null;
    if (next === map.hoveredBlobId) return;
    map.hoveredBlobId = next;
    refresh(true);
  });
  canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse' || map.hoveredBlobId === null) return;
    map.hoveredBlobId = null;
    refresh(true);
  });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') release();
  });
}

/**
 * The `Profile ›` button, which is the only way from the map to a saint now
 * that a press on a dot selects instead. Wired once; `paintCanvas` decides
 * where it sits and whether it is shown at all.
 */
export function wireProfile(el, router) {
  el.querySelector('[data-profile]').addEventListener('click', () => {
    if (map.selected) router.navigate(`/saints/${map.selected}`);
  });
}

/**
 * The saint under a pointer: a dot within a finger's reach, or a name.
 *
 * **The name counts as much as the dot** (author, 2026-08-31: "if you click
 * on a saint dot (or their name)"), and it is the larger target of the two —
 * 2.5 px of dot against a whole word — so where the two disagree the dot
 * still wins, being the thing the reader was aiming at.
 */
function dotAt(canvas, e) {
  const box = canvas.getBoundingClientRect();
  const x = e.clientX - box.left;
  const y = e.clientY - box.top;
  let best = null;
  let bestD = 12;
  for (const dot of map.drawnDots) {
    const d = Math.hypot(dot.x - x, dot.y - y);
    if (d < bestD) {
      bestD = d;
      best = dot;
    }
  }
  if (best) return best;
  return (
    map.drawnDots.find(
      (dot) =>
        dot.labelRect &&
        x >= dot.labelRect.x &&
        x <= dot.labelRect.x + dot.labelRect.w &&
        y >= dot.labelRect.y &&
        y <= dot.labelRect.y + dot.labelRect.h,
    ) ?? null
  );
}

/**
 * The blob under a pointer, open or closed — inside its own drawn outline,
 * or (the rare one- or two-member remainder with no hull to speak of)
 * within a dot's own reach of its centre. Reads `drawnBlobs`, the same
 * "the draw pass writes the hit-map" contract `dotAt` already keeps.
 */
function blobAt(canvas, e) {
  const box = canvas.getBoundingClientRect();
  const x = e.clientX - box.left;
  const y = e.clientY - box.top;
  for (const b of map.drawnBlobs) {
    if (b.hull ? pointInHull({ x, y }, b.hull) : Math.hypot(b.cx - x, b.cy - y) < 12) return b;
  }
  return null;
}
