/**
 * How many lines a name will take on a line of `avail` pixels.
 *
 * **Moved here from `views/index/grid.js` on 2026-09-07**, unchanged, because
 * the carousel needs the same answer: its columns pack against a caption's
 * height, and a caption's height is its name's line count. Two views asking
 * the same question of the same corpus should not be two greedy line-breakers.
 *
 * The *face* stays with each view — what decides where a name breaks is
 * whatever the browser resolved for that view's own type, so each keeps its
 * own probe and passes the context in. This is the arithmetic alone.
 *
 * The browser's own algorithm, which is greedy: take words while they fit,
 * break when the next one does not. Whitespace is the only break opportunity
 * considered — a hyphen is one too, so a hyphenated name may come out *shorter*
 * than this says, and over-counting costs a row 21 px rather than cropping it.
 * A single word wider than the line is the one case that breaks mid-word, under
 * `word-break: break-word`, and it takes as many lines as it needs.
 *
 * Verified against the real thing over all 734 names at 360 px, where the
 * distribution is 476 / 253 / 5: **no disagreement in either direction.**
 */
/**
 * Memo, because the *same* names are measured again on every repaint.
 *
 * The carousel packs the whole corpus — 862 saints, ~215 columns — and the
 * answer for one name at one width in one face never changes, so a repaint
 * after a font swap or a resize was re-running ~3,400 `measureText` calls for
 * results it already had. It profiled at 242 ms of an eight-second All Saints
 * run at 4x CPU, third in the page.
 *
 * The key is everything the answer depends on: `ctx.font` carries the face and
 * the size, and two canvases set to the same font string measure the same. The
 * cap is applied after the lookup rather than inside it, so one cached count
 * serves a row, a card and a caption alike.
 *
 * Dropped whole rather than evicted one by one past a bound: this is a pure
 * function of a fixed corpus, so the map only grows when the *face* or the
 * *width* changes, which is a resize — at which point last width's entries are
 * exactly the dead ones.
 */
const memo = new Map();
const MEMO_MAX = 4000;

export function nameLines(text, avail, ctx, max = Infinity) {
  if (!(avail > 0)) return 1;
  const key = `${ctx.font}|${avail}|${text}`;
  const seen = memo.get(key);
  if (seen !== undefined) return Math.min(seen, max);
  const lines = greedyLines(text, avail, ctx);
  if (memo.size >= MEMO_MAX) memo.clear();
  memo.set(key, lines);
  return Math.min(lines, max);
}

function greedyLines(text, avail, ctx) {
  const space = ctx.measureText(' ').width;
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    const w = ctx.measureText(word).width;
    if (w > avail) {
      // Broken mid-word; it starts a line of its own unless one is empty.
      if (used > 0) lines += 1;
      lines += Math.ceil(w / avail) - 1;
      used = w % avail;
      continue;
    }
    const next = used === 0 ? w : used + space + w;
    if (used > 0 && next > avail) {
      lines += 1;
      used = w;
    } else {
      used = next;
    }
  }
  // The cap is the caller's, because a row, a card and a carousel caption
  // allow different numbers of lines and the same greedy count serves all
  // three; it is applied by `nameLines` above, around this.
  return lines;
}
