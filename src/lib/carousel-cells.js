/**
 * All Saints' carousel, dealt into columns: which saints stand together, and
 * in what order the columns run. Arithmetic over heights the caller measures,
 * with no layout in it — `views/index/modes.js` hands in `heightOf` and draws
 * what comes back. `tests/carousel-cells.test.mjs` holds it to its rules.
 */

/** The gap between two cards stacked in one cell (`--space-3`). */
export const CELL_GAP = 12;

/**
 * The shortest caption anything in the corpus can have: one line of name, no
 * subtext. The packer stops looking for a card once less than this is left.
 *
 * A constant rather than the caption height of some particular saint: the
 * question is "could *anything* still fit", and the answer is different for
 * every saint, so the floor has to be the floor.
 */
export const MIN_CAPTION = 20;

/**
 * How deep a column may go.
 *
 * **Raised from four to twelve on 2026-09-01** (author: "just fill in the gaps
 * ... and just make it a fully filled horizontally scrolling stack"). Four was
 * there to stop text-only saints packing fifteen deep and reading as a list
 * turned sideways — but four caption-tall cards are 268 px in a 520 px column,
 * which is the gap the author is looking at. The depth a column reaches is the
 * room divided by what it is filled with, and twelve is the room, not a taste.
 */
export const STACK_MAX = 12;

/**
 * How far past the next saint the packer may reach for one that fits.
 *
 * **The gap-filler** (2026-09-01). Packing strictly in order closes a column
 * the moment the next saint is too tall for what is left, which is where the
 * holes came from. Reaching forward for a saint who fits closes that hole
 * without showing anyone twice.
 *
 * Bounded, because the pool is in the reader's own order — Random by default,
 * but Alphabetical is an order a reader can *see*, and pulling a saint from
 * position 700 into the first column would be visible as disorder. Forty-eight
 * is roughly two windows of columns.
 */
export const LOOKAHEAD = 48;

/**
 * The most columns of names that may stand side by side — **the author's rule**
 * (2026-09-07: "Saints with icons are too sparse: sometimes five columns in a
 * row show names only ... make the cell packing so that at least every second
 * column contains a saint with an image"). Two, and read round the loop: the
 * row repeats, so the columns after the last picture stand beside the first
 * column of the next pass, and a reader scrolling past that seam sees one
 * stretch. The run opens on a picture, so the stretch at the seam is the run's
 * own tail and nothing more.
 */
export const MAX_NAME_RUN = 2;

/** Whether a cell is a column of names, which is drawn at `--cx-w-text`. */
export const isNameCell = (cell) => cell.every((item) => !item.image);

/**
 * The row's children, which are **cells rather than cards**: a column of one
 * or more saints.
 *
 * **Packed by height since 2026-08-28**, where it used to pair wide icons and
 * nothing else (author: "There is no double stacking on desktop carousel that
 * I can see ... the carousel does not spread all across the height of the
 * window ... For any saint profiles that lack an image, stack them more").
 *
 * Pairing wide icons was a special case of a general fact: a card shorter than
 * the row leaves the rest of its column empty. Filling the column instead
 * subsumes it — two wide icons still pair, because two of them are what fits —
 * and it is what puts the row across the window rather than in a band at the
 * top, because the space it packs into *is* the window's.
 *
 * **A cell, not a card, is what the loop counts.** `loopScroll` reads one
 * period from the offset between child `buffer` and child `buffer + count`, so
 * everything it knows is the sequence of children; two saints sharing a child
 * leaves that arithmetic untouched. A two-row grid over the track itself would
 * not, and the reason is worth keeping: a period starting mid-column packs
 * differently from one starting at a column edge, which is a drift the wrap
 * cannot correct.
 *
 * **And every column is filled, not merely started** (author, 2026-09-01:
 * "You've pretty much arranged them in a horizontal grid of columns with
 * randomised occupation. Just fill in the gaps in the same mix of randomised
 * imageless and imaged saint cards and just make it a fully filled horizontally
 * scrolling stack").
 *
 * The packer was strictly in order, so a column ended wherever the next saint
 * happened not to fit — and since 83% of the corpus is imageless and a caption
 * is 64 px, most of those holes were three or four cards' worth of room with a
 * portrait icon standing in front of them. It reaches forward now for a saint
 * who *does* fit (`LOOKAHEAD`), and only closes the column when nothing within
 * reach will go in it. What comes out is the same mix in nearly the same order,
 * with the air taken out.
 *
 * **Still each saint exactly once.** The reach marks its pick as taken and the
 * cursor walks past what has been taken, so the run is a permutation of the
 * pool rather than a resampling of it — which is the promise the author made
 * the packer keep on 2026-08-28 ("only display 1 instance of each saint").
 */
/**
 * Deals `pool`, in the reader's order, into columns that each fill `space`.
 *
 * Each column's *kind* is decided before it is filled: a **picture column** is
 * seeded with a saint who has an icon and drawn at `cardWidth`; a **name
 * column** takes only saints who have none and is drawn at `textWidth`. A
 * saint with a picture is never put in a name column — a picture drawn at the
 * narrow width beside the same picture at the full one reads as a mistake.
 *
 * **The icons are paced by the names they have to carry, not by columns.**
 * Every icon opens a *group*: its picture column and the name columns after it.
 * The names still to deal, over the icons still to place, is the share each
 * group is owed, and a group closes — the next column reaches for a picture —
 * once another column of names would overshoot that share by more than it
 * would fall short. The share is recounted at every column from saints, which
 * are exact, so a group that ran long is paid back by the ones after it and
 * the last icon is left with a group of ordinary size. Pacing by columns instead
 * — an estimate of how many are still to come — ran every group slightly short
 * at a desk, where the corpus's ratio sits close to what one picture column and
 * one name column hold, and the icons ran out before the saints did: the
 * leftover stood at the end of the run as three and more columns of names.
 *
 * **Where the rule stops being possible.** A group may hold at most its
 * picture column and `MAX_NAME_RUN` columns of names, so with `p` names beside
 * an icon and `q` names in a name column, one icon carries at most `p + 2q`.
 * Past that many saints without an icon for every one with, no dealing keeps
 * the rule; both numbers are set by the window's height and the captions, so
 * the ceiling is a property of the window, not of the corpus. Past it the
 * floor gives way to the share: the groups grow evenly, three columns of names
 * and then four, rather than the rule holding for most of the run and the
 * whole deficit landing at its end. The corpus's own ratio is
 * `node -e "const m=require('./data/manifest.json');const i=m.filter(s=>s.image).length;console.log((m.length-i)/i)"`
 * after `npm run build:manifest`.
 */
export function carouselCells(pool, { space = 0, cardWidth = 150, textWidth = cardWidth, heightOf } = {}) {
  if (!space) return pool.map((item) => [item]);
  const cells = [];
  const taken = new Array(pool.length).fill(false);
  let iconsLeft = pool.reduce((n, item) => n + (item.image ? 1 : 0), 0);
  let namesLeft = pool.length - iconsLeft;
  // Names dealt since the last icon, including those beside it in its column.
  let group = 0;
  // Columns since one held a picture. It starts at the limit so the run opens
  // on a picture, which is what keeps the seam's stretch down to the tail.
  let sinceImage = MAX_NAME_RUN;
  // How many names each kind of column has held so far — the first columns
  // guess, and every column after them knows the window and the captions.
  let nameCols = 0;
  let inNameCols = 0;
  let picCols = 0;
  let besideIcons = 0;
  let cursor = 0;

  const spend = (i) => {
    taken[i] = true;
    if (pool[i].image) iconsLeft -= 1;
    else namesLeft -= 1;
  };

  while (cursor < pool.length) {
    if (taken[cursor]) {
      cursor += 1;
      continue;
    }
    const q = nameCols ? inNameCols / nameCols : 4;
    const p = picCols ? besideIcons / picCols : 1;
    // The names the open group is owed: those still to deal and those it holds,
    // over the groups still to come including itself.
    const share = (namesLeft + group) / (iconsLeft + 1);
    // The most one icon can carry at this window without breaking the rule.
    const perIconMax = p + MAX_NAME_RUN * q;
    // Past the ceiling the rule cannot hold, and the floor stands aside so the
    // share can spread the deficit instead of piling it at the end. Not before
    // a name column has been measured, and never for the first column: the run
    // opens on a picture whatever the estimates say.
    const past = nameCols > 0 && share > perIconMax;
    const floor = sinceImage >= MAX_NAME_RUN && (cells.length === 0 || !past);
    // Closing now falls short of the share by less than another column would
    // overshoot it...
    const even = group + q / 2 >= share;
    // ...and leaves the icons after it able to carry the names after it, with
    // half a column to spare. Without this the last groups inherit whatever
    // rounding the earlier ones left, and the tail breaks the rule.
    const leaves = iconsLeft > 0 && namesLeft / iconsLeft <= perIconMax - q / 2;
    const want = iconsLeft > 0 && (floor || (even && (leaves || past)));

    /*
     * The seed, and with it the column's kind and width. **The rule reaches
     * as far as it has to; the pace does not.** Where the rule is at stake a
     * saint is pulled forward from wherever the nearest icon is — one card out
     * of the reader's order against a barren stretch of the row. Otherwise
     * `LOOKAHEAD` binds, and where nothing of the wanted kind is in reach the
     * cursor's own saint stands, whatever they are.
     */
    const reach = want && sinceImage >= MAX_NAME_RUN ? pool.length : LOOKAHEAD;
    let seed = cursor;
    let seen = 0;
    for (let i = cursor; i < pool.length && seen < reach; i += 1) {
      if (taken[i]) continue;
      seen += 1;
      if (Boolean(pool[i].image) === want) {
        seed = i;
        break;
      }
    }
    const picture = Boolean(pool[seed].image);
    const width = picture ? cardWidth : textWidth;

    /*
     * A picture column may take a second icon — two saints with wide icons
     * stacked, which reads well — only while icons are so plentiful that the
     * one left out would not have been needed: when, without it, every group
     * still closes before it needs a column of names.
     */
    const mayStack = () => picture && iconsLeft > 1 && namesLeft / (iconsLeft - 1) <= p + q / 2;

    const column = [pool[seed]];
    spend(seed);
    let used = heightOf(pool[seed], width);
    while (column.length < STACK_MAX) {
      const room = space - used - CELL_GAP;
      if (room < MIN_CAPTION) break;
      let pick = -1;
      let scanned = 0;
      const stack = mayStack();
      for (let i = cursor; i < pool.length && scanned < LOOKAHEAD; i += 1) {
        if (taken[i]) continue;
        scanned += 1;
        if (pool[i].image && !stack) continue;
        if (heightOf(pool[i], width) <= room) {
          pick = i;
          break;
        }
      }
      if (pick < 0) break;
      spend(pick);
      column.push(pool[pick]);
      used += CELL_GAP + heightOf(pool[pick], width);
    }
    cells.push(column);

    const names = column.reduce((n, item) => n + (item.image ? 0 : 1), 0);
    if (names < column.length) {
      sinceImage = 0;
      group = names;
      picCols += 1;
      besideIcons += names;
    } else {
      sinceImage += 1;
      group += names;
      nameCols += 1;
      inNameCols += names;
    }
    /*
     * The cursor is not stepped here. It is moved by the `taken` test at the
     * top of the loop, which is what lets a column seeded ahead of the cursor
     * leave the saint standing there for the next one. It terminates because
     * every column takes at least its own seed.
     */
  }
  return cells;
}
