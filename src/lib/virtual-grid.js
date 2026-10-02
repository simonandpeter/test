/**
 * Layout maths for the Index grid. Pure functions over item sizes, so the
 * awkward part — where every card is, and which ones are worth having in the
 * DOM — can be tested without a browser.
 *
 * **No measurement pass.** The manifest carries every image's aspect ratio
 * (Addendum C1), so an exact height is known for every card before any of them
 * exists, and the virtualiser is fed those heights directly (Addendum C2).
 * Measuring instead would mean rendering everything once to find out how tall
 * it is, which is the thing virtualisation exists to avoid.
 *
 * Cards therefore vary in height, and the columns are packed shortest-first.
 * That is fine here and not in the River, which normalises to one card box
 * because equal size is doing that mode's equality-of-standing work (§8.2).
 */

const MIN_COLUMN = 190;

export function columnsFor(width, { min = MIN_COLUMN, gap = 16, max = 4 } = {}) {
  if (!(width > 0)) return 1;
  return Math.max(1, Math.min(max, Math.floor((width + gap) / (min + gap))));
}

/**
 * Absolute positions for every card, shortest-column-first.
 *
 * `textHeight` is the fixed part of a card below the image — name, badge,
 * dates, and the card's own padding and border. For a card it is a number, and
 * fixed on purpose: the stylesheet clamps the name to a known count of line
 * boxes (metrics.css derives those from the font's own tables), so it stays
 * true when a Coptic or Syriac fallback face substitutes in. A card with no
 * image is that block and nothing else.
 *
 * **It may also be a function of the item**, which is how the row list stopped
 * paying for its worst case on every row (2026-08-27). A row has no image to
 * take a height from, so its box is text and only text: one line of name or
 * two. The caller answers that per saint — views/index/grid.js measures the
 * name against the line it has, before anything is rendered — and this stays
 * what it was, arithmetic over sizes it is handed. Nothing here measures.
 *
 * `mediaInset` is what the card's padding and border take off the column
 * before the image gets its width. Without it the image is sized to a box
 * wider than the one it is in, and every card overflows by a few pixels —
 * which, with the card's height fixed by this same function, crops the image
 * instead of growing the card.
 *
 * **It lays out a prefix, and resumes.** `take` caps how many items this call
 * places; pass the previous result back as `resume` and the next call carries
 * on from where it stopped, appending to its positions. Omit both and it
 * places everything, which is what it always did. The packing is resumable
 * because the only state it carries between items is `bottoms`, so a resumed
 * run gives position-for-position the same answer as one pass — the test holds
 * it to that. `resume.positions` is never mutated.
 *
 * `width`, `columns` and the height functions must be the same across a
 * resumed run; a changed column count is a different layout, not a longer one,
 * and the caller starts again rather than resuming.
 *
 * @param take how many items to place in this call; `Infinity` for all of them
 * @param resume a previous result of this function over the same `items`
 * @returns `{columns, columnWidth, positions, height, bottoms, laid, complete}`
 *   — `laid` how many items are placed so far, `complete` whether that is all
 *   of them, `height` the height of what is placed (so it grows as the run
 *   does), and `bottoms` the packing state `resume` needs.
 */
export function layout(
  items,
  {
    width,
    gap = 16,
    columns,
    textHeight = 96,
    mediaInset = 0,
    aspectOf = (item) => item.aspect,
    take = Infinity,
    resume = null,
  } = {},
) {
  const cols = columns ?? columnsFor(width, { gap });
  const columnWidth = Math.max(1, (width - gap * (cols - 1)) / cols);
  const textOf = typeof textHeight === 'function' ? textHeight : () => textHeight;
  const bottoms = resume ? resume.bottoms.slice() : new Array(cols).fill(0);
  const positions = resume ? resume.positions.slice() : [];
  const from = resume ? resume.laid : 0;
  const until = Math.min(items.length, from + Math.max(0, take));

  for (let i = from; i < until; i++) {
    const item = items[i];
    let target = 0;
    for (let c = 1; c < cols; c++) if (bottoms[c] < bottoms[target] - 0.5) target = c;

    const aspect = aspectOf(item);
    const media = aspect ? (columnWidth - mediaInset) / aspect : 0;
    /*
     * **Rounded up, not to the nearest** (2026-09-02). The card's height is
     * fixed by this function and its picture is drawn from a fractional
     * `aspect-ratio`, so a media box of 315.72 px inside a card reserved for
     * 315 is one pixel of the name's line clipped — `scrollHeight` rounds up
     * where `Math.round` had rounded down, and the card crops its own block.
     *
     * It was luck rather than arithmetic that this held before: the aspects
     * happened to land on the kind side of .5. Ceiling costs at most a pixel
     * of air under a card and cannot clip one, and only one of those two is
     * visible to a reader.
     */
    const height = Math.ceil(media + textOf(item));
    positions.push({
      ...item,
      x: target * (columnWidth + gap),
      y: bottoms[target],
      w: columnWidth,
      h: height,
    });
    bottoms[target] += height + gap;
  }

  return {
    columns: cols,
    columnWidth,
    positions,
    // Trailing gap trimmed: the last row should not push the page down by one.
    height: Math.max(0, Math.max(...bottoms, 0) - gap),
    bottoms,
    laid: until,
    complete: until >= items.length,
  };
}

/**
 * The cards worth having in the DOM: those intersecting the viewport, plus an
 * overscan band so a fast scroll meets cards that are already there rather
 * than blank space that fills in behind it.
 */
export function windowOf(positions, top, viewportHeight, overscan = 400) {
  const from = top - overscan;
  const to = top + viewportHeight + overscan;
  return positions.filter((p) => p.y < to && p.y + p.h > from);
}
