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
export function nameLines(text, avail, ctx, max = Infinity) {
  if (!(avail > 0)) return 1;
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
  // three. Uncapped by default: a caller with no ceiling should not have to
  // name one.
  return Math.min(lines, max);
}
