import { formatSubtext } from '../../lib/calendar-page.js';
import { loadDetail, prefetch } from '../../lib/detail.js';
import { saintName } from '../../lib/honorific.js';
import { escapeHtml as esc, firstParagraphText } from '../../lib/markdown.js';
import { typeNames } from '../../lib/saint-types.js';
import { columnsFor, layout, windowOf } from '../../lib/virtual-grid.js';
import { beginSwap, restore, setAside } from '../../ui/swap.js';
import { paintCarousel } from './modes.js';
import { state } from './state.js';

/* The site's base path, declared per file as every other view does. */
const BASE = import.meta.env.BASE_URL;


const GAP = 16;

/**
 * The two numbers the grid's geometry rests on, and the stylesheet's side of
 * the bargain: index.css fixes the card's padding, border, gaps and the name's
 * two-line box so that these stay true. Changing either without the other
 * crops cards.
 */
const CARD_TEXT_HEIGHT = 88;

const CARD_INSET = 18;

/**
 * A card's name box, by line count — the same collapse the rows got at
 * Amendment 56, a day later than they should have had it (author, 2026-08-28:
 * "my request to make the text / frame margins of the saint card view equal to
 * the margins in the row view was not addressed ... the extra line is printed
 * instead of being collapsed").
 *
 * A card reserved two lines for every name, so a one-line name left an empty
 * line between it and the dates and the card's frame stood that much taller
 * than a row's would have. The reasoning that made rows variable applies
 * unchanged here: `nameLines` counts the browser's own greedy wrapping with
 * canvas `measureText`, before anything is laid out, so a virtualised card can
 * know its height without being rendered.
 *
 * **Cards carry no bookmark since 2026-08-28**, so the name has the card's full
 * width less its own padding — there is no 40 px column to subtract, which is
 * what made this arithmetic simpler than the row's.
 */
const CARD_NAME_LINE = 21.25;

/**
 * The lines `CARD_TEXT_HEIGHT` was measured with. Two, and it stays two however
 * many the name below is allowed: it is the constant that turns the measured
 * block height back into "everything that is not the name", not a limit.
 */
const CARD_NAME_LINES_RESERVED = 2;

/**
 * How many lines of name a card will carry.
 *
 * **Two until 2026-09-01**, when the author asked for the opposite: "Make sure
 * all the CARD view cards, NOT row view cards, display the full name and don't
 * do any '...' at the end." Two lines cut a third of the corpus — a card's
 * column is 190 px at its narrowest against a row's whole width, so names that
 * fit a row on one line take three and four in a card.
 *
 * Six, and the number is a measurement rather than a margin. Every name the
 * site prints, at the narrowest column the grid ever lays out (190 px less the
 * card's 18 px inset): 148 take one line, 521 two, 159 three, 23 four and 3
 * five — the longest being "Righteous Theodulus, executioner converted by
 * Hermione". Six is one line of headroom over the worst name in the corpus,
 * which is what a *cap* is for here: the virtualiser has to know a card's
 * height before the card exists, so a name that overran its box would be drawn
 * over the card beneath it rather than merely ellipsised. A seventh line would
 * be clamped — that is the degradation, stated rather than discovered, and the
 * browser test pins the corpus against it so a longer name arriving later fails
 * a test instead of a reader.
 */
const CARD_NAME_LINES_MAX = 6;

/** Everything in the text block that is not the name: the gap and the dates. */
const CARD_TEXT_BASE = CARD_TEXT_HEIGHT - CARD_NAME_LINES_RESERVED * CARD_NAME_LINE;

/**
 * A row's height, by how many lines its name needs.
 *
 * **This was one constant until 2026-08-27, and the author asked why.** Names
 * stopped being cut off that afternoon, and the first answer was to give every
 * row the tallest box — a bound rather than a sample, safe, and wasteful.
 * Measured across the corpus: at 1280 *no* name wraps at all, and at 360 only
 * 258 of 734 do. Nearly every row was carrying an empty line for the ones that
 * were not. "Why not just collapse whenever there is an empty line?"
 *
 * Because a virtualised row has to know its height before it exists, and the
 * reason given for the single constant was that text height cannot be known
 * without rendering. That is wrong — `nameLines` below measures the name in
 * the row's own face with canvas `measureText`, which touches no layout — and
 * the reason is now a measurement instead: checked against the browser's real
 * wrapping over all 734 names, the count agrees **exactly**, with no error in
 * either direction. That bar is not pedantry: predicting one line for a name
 * that needs two is precisely the cropping the afternoon's instruction was
 * about.
 *
 * By line count, with index.css holding the other half of each number —
 * 18 px inset + max(48 thumbnail, lines x 21.25 + 2 + 19.575 dates):
 */
const ROW_HEIGHTS = [66, 83, 104];

/**
 * Three lines is where this stops, in the stylesheet's clamp and here, and the
 * two must agree or the box and the text part company. Nothing in the corpus
 * reaches it — the five longest at 360 are exactly three, "Venerable Martyr
 * Macarius the New, disciple of Patriarch Niphon" among them — so a fourth
 * would be clamped and ellipsised as every name used to be. That is the
 * degradation, stated rather than discovered.
 */
const ROW_NAME_LINES_MAX = 3;

/**
 * What the row takes off the column before the name gets its line: the card's
 * own padding and border, the 48 px thumbnail, and the gap between them.
 * Measured at 360, 700 and 1280 — flat 78 at all three, which it must be, or
 * the arithmetic above is width-dependent in a way nothing else here is.
 */
const ROW_TEXT_INSET = CARD_INSET + 48 + 12;

const ROW_GAP = 8;

/**
 * Detailed (author, 2026-08-22) adds the rite × communion matrix in place of
 * the badge and a short description under the dates, and both are sized so
 * the box is still known before render: the matrix fits the 42 px name line a
 * card already reserves, and the description is a fixed count of utility lines
 * (13.5 px at 1.45 = 19.575 each), clamped — three on a card, two on a row.
 * Card: 88 + 2 gap + 58.725 = 148.7.
 *
 * The row's numbers run by line count for the same reason the plain row's do,
 * and from the same measurement: 18 inset + lines x 21.25 + 2 + 19.575 dates +
 * 2 + 39.15 description. index.css fixes the other half of each number.
 */
const DETAILED_CARD_TEXT_HEIGHT = 149;

const DETAILED_ROW_HEIGHTS = [102, 124, 145];

/**
 * The face the rows are actually drawn in, as a canvas pen.
 *
 * **A canvas, not the document.** `measureText` resolves a string against a
 * font and returns its width; it reads no element, forces no reflow, and the
 * whole corpus comes to well under a millisecond. The virtualiser's rule is
 * that no *card* is rendered to find out how tall it is, and this keeps it —
 * nothing is laid out, and the answer is exact rather than estimated.
 *
 * The face is read from a probe wearing the row's own classes rather than
 * written down, because what decides where a name breaks is whatever the
 * browser resolved: Literata if it arrived, Iowan Old Style or Georgia if it
 * did not, something else again for a script none of them cover. One probe per
 * layout pass, not one per saint. It hangs off the grid rather than off a row,
 * because rows are recycled out of the DOM and a detached element measures
 * nothing — which is a mistake this was written on the far side of.
 */
function pen(el) {
  const probe = document.createElement('span');
  probe.className = 'index-card panel is-row';
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;top:0;left:0';
  probe.innerHTML = '<span class="row-body"><span class="name-line"><span class="index-name"></span></span></span>';
  el.appendChild(probe);
  const cs = getComputedStyle(probe.querySelector('.index-name'));
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  probe.remove();
  pen.ctx ??= document.createElement('canvas').getContext('2d');
  pen.ctx.font = font;
  return { ctx: pen.ctx, font };
}

/**
 * How many lines a name will take on a line of `avail` pixels.
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
function nameLines(text, avail, ctx, max = ROW_NAME_LINES_MAX) {
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
  // The cap is the caller's, because a row and a card allow different numbers
  // of lines and the same greedy count serves both.
  return Math.min(lines, max);
}

/**
 * The opening of each life, derived once from the fetched text and kept across
 * re-renders — the same card is mounted and unmounted on every scroll frame
 * and must not refetch to say the same sentence again.
 */
const ledes = new Map();

/**
 * Where the cards go, and what is in the document.
 *
 * The last two thirds of `update()`: the layout arithmetic for both
 * arrangements, the reconcile that animates a filtered-out card away before
 * removing it, and the window of the corpus that is mounted at any moment.
 *
 * The grid is virtualised *and* absolutely positioned, so the mounted set is
 * not the corpus and DOM order is not screen order. Anything asserting order
 * has to sort by geometry; CLAUDE.md keeps that as the first of its traps.
 */
/**
 * A row's height, per saint: the short box, or the tall one if its name needs
 * a second line.
 *
 * Built per layout pass rather than per row, so the probe is read once and the
 * pen is set once; the returned function is then pure arithmetic over a width
 * already known. The face it measured in is recorded on the function, which is
 * what `wireGrid` compares against when the fonts finish loading.
 */
/**
 * A card's text height, per saint. Built once per layout pass like
 * `rowHeights`: the pen is read once and the column worked out once, and the
 * returned function is arithmetic over a width already known.
 */
function cardHeights(grid) {
  const { ctx, font } = pen(grid);
  const cols = columnsFor(grid.clientWidth, { gap: GAP });
  const columnWidth = Math.max(1, (grid.clientWidth - GAP * (cols - 1)) / cols);
  const line = columnWidth - CARD_INSET;
  const base = state.detailed
    ? DETAILED_CARD_TEXT_HEIGHT - CARD_NAME_LINES_RESERVED * CARD_NAME_LINE
    : CARD_TEXT_BASE;
  state.rowFont = font;
  return (item) => base + nameLines(saintName(item), line, ctx, CARD_NAME_LINES_MAX) * CARD_NAME_LINE;
}

function rowHeights(grid) {
  const { ctx, font } = pen(grid);
  const line = grid.clientWidth - ROW_TEXT_INSET;
  const heights = state.detailed ? DETAILED_ROW_HEIGHTS : ROW_HEIGHTS;
  state.rowFont = font;
  return (item) => heights[nameLines(saintName(item), line, ctx) - 1];
}

export function paintGrid(matched, { animate }) {
  const { el } = state;
  const grid = el.querySelector('[data-grid]');
  const inner = el.querySelector('[data-grid-inner]');
  const rows = state.layout === 'rows';
  // What this layout was computed from, so the container observer below can
  // tell a real move from its own first, informational, callback.
  state.laidOutWidth = grid.clientWidth;
  const result = rows
    ? layout(matched, {
        width: grid.clientWidth,
        gap: ROW_GAP,
        columns: 1,
        textHeight: rowHeights(grid),
        // A row has no picture in its box — the thumbnail is a fixed 48 px
        // square beside the text — so nothing about its height comes from the
        // image. What varies is the name, and `rowHeights` answers that.
        aspectOf: () => null,
      })
    : layout(matched, {
        width: grid.clientWidth,
        gap: GAP,
        textHeight: cardHeights(grid),
        mediaInset: CARD_INSET,
        // The manifest keeps a card's pixel dimensions on its image, and a
        // saint may have no image at all.
        aspectOf: (card) => card.image?.aspect ?? null,
      });
  state.positions = result.positions;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const keep = new Set(result.positions.map((p) => p.slug));
  const leaving = [...state.rendered.keys()].filter((slug) => !keep.has(slug));

  // Fading is the reason the removal is deferred: a filtered-out saint should
  // leave visibly. Reduced motion removes them now — disabled means removed,
  // never shortened. The fade is one flight in swap.js's registry, so a second
  // filter change lands the first batch rather than leaving two removals
  // racing, and each fading card is marked aside — a card on its way out must
  // not hold the tab order or a click (Amendment 17's corollary).
  if (animate && !reduced && leaving.length) {
    for (const slug of leaving) {
      const node = state.rendered.get(slug);
      node.classList.add('leaving');
      setAside(node);
    }
    beginSwap(inner, () => {
      for (const slug of leaving) {
        // Still fading, and not a card that a second filter change brought
        // back in the meantime — paintWindow restores those when it does.
        const node = state?.rendered.get(slug);
        if (!node?.classList.contains('leaving')) continue;
        node.remove();
        state.rendered.delete(slug);
      }
      if (state) paintWindow();
    }).settle(200);
  } else {
    for (const slug of leaving) {
      state.rendered.get(slug).remove();
      state.rendered.delete(slug);
    }
  }

  inner.style.height = `${result.height}px`;
  paintWindow();
  // The carousel draws from the same filtered set, so it follows a search or a
  // filter change like the grid does. It is a no-op when the pool has not moved.
  if (state.mode === 'carousel') paintCarousel();
}


export function wireGrid({ onChange }) {
  /* The page's one update pass, handed over at wiring time. It is captured by
     a ResizeObserver below that outlives this call, which is fine for a
     closure and is the reason it is a parameter rather than a lookup. */
  const update = onChange;
  const { el } = state;
  const grid = el.querySelector('[data-grid]');
  let frame = null;

  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      paintWindow();
    });
  };
  // Column width changes with the window even when the column *count* does
  // not, and every card's box is computed from that width — so a resize is a
  // relayout, not a repaint. Coalesced to one per frame.
  let resizeFrame = null;
  const onResize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      update({ animate: false });
    });
  };

  // The page scrolls, not a box inside it: an inner scroller would trap the
  // wheel and give the reader two scrollbars to think about.
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  // The column can move without the window moving: Literata arriving inside
  // font-display: optional's window widens the 72ch column from 580 to 678 px
  // after the grid has counted its columns, and a cold load at 1280 was laying
  // two columns into a three-column width (Amendment 26). An observer on the
  // grid's own box catches that; its first callback reports the size already
  // laid out and is ignored by the comparison. The relayout runs *inside* the
  // callback, not behind a frame like the window path: resize observers are
  // delivered at the rendering update the change itself caused, which is the
  // moment meant for layout work — and a headless browser produces no further
  // frame on an idle page, so a relayout queued behind requestAnimationFrame
  // there waits for damage that may never come (the suite saw it six runs in
  // eight). Synchronous is deterministic in both.
  const observer =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          if (state && grid.clientWidth !== state.laidOutWidth) update({ animate: false });
        })
      : null;
  observer?.observe(grid);

  /*
   * **The face decides where a name wraps, and it can arrive late.**
   * `font-display: optional` settles Literata within the first moments of a
   * load, which is usually before the grid first lays out and sometimes after.
   * At a wide width the observer above already catches it, because the arriving
   * face widens the 72ch column and the grid's box changes with it; on a phone
   * the column is the viewport, nothing moves, and a row laid out in Georgia's
   * metrics would keep them. One relayout when the fonts settle, and only if
   * the face this actually measured in has changed.
   */
  document.fonts?.ready.then(() => {
    if (!state || state.layout !== 'rows') return;
    const { font } = pen(grid);
    if (font !== state.rowFont) update({ animate: false });
  });

  // A card's shared-element name is set at the moment of the click and not
  // before: naming sixty visible cards would make the browser capture sixty
  // pairs to animate two of them.
  const onClick = (e) => {
    const link = e.target.closest('[data-prefetch]');
    if (!link) return;
    const card = link.closest('.index-card');
    if (state.named) for (const node of state.named) node.style.viewTransitionName = '';
    const image = card.querySelector('.index-media img');
    const name = card.querySelector('.index-name');
    const slug = link.dataset.prefetch;
    if (image) image.style.viewTransitionName = `s-${slug}-image`;
    if (name) name.style.viewTransitionName = `s-${slug}-name`;
    state.named = [image, name].filter(Boolean);
  };
  grid.addEventListener('click', onClick);

  // Cards enter and leave the DOM on every scroll frame, so hover prefetching
  // is delegated to the container rather than bound per card. The coarse
  // pointer case has no hover at all and is handled where cards are created:
  // entering the window *is* the signal there.
  const onHover = (e) => {
    const link = e.target.closest('[data-prefetch]');
    if (link) prefetch(link.dataset.prefetch);
  };
  if (state.finePointer) el.addEventListener('pointerover', onHover);

  state.cleanups.push(() => {
    if (frame) cancelAnimationFrame(frame);
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    observer?.disconnect();
    grid.removeEventListener('click', onClick);
    el.removeEventListener('pointerover', onHover);
  });
}

export function paintWindow() {
  if (!state) return;
  const inner = state.el.querySelector('[data-grid-inner]');
  const top = -inner.getBoundingClientRect().top;
  const visible = windowOf(state.positions, top, window.innerHeight);
  const wanted = new Set(visible.map((p) => p.slug));

  for (const [slug, node] of state.rendered) {
    if (!wanted.has(slug) && !node.classList.contains('leaving')) {
      node.remove();
      state.rendered.delete(slug);
    }
  }

  let mounted = false;
  for (const position of visible) {
    let node = state.rendered.get(position.slug);
    if (!node) {
      const rows = state.layout === 'rows';
      node = document.createElement('div');
      node.className = `index-card panel${rows ? ' is-row' : ''}${state.detailed ? ' is-detailed' : ''}`;
      node.innerHTML = card(position, state.router, { rows, detailed: state.detailed });
      inner.appendChild(node);
      state.rendered.set(position.slug, node);
      mounted = true;
      if (!state.finePointer) prefetch(position.slug);
      if (state.detailed) fillDescription(node, position);
    }
    if (node.classList.contains('leaving')) {
      // Brought back mid-fade by a second filter change: current again, so the
      // aside marks come off with the class.
      node.classList.remove('leaving');
      restore(node);
    }
    node.style.width = `${position.w}px`;
    node.style.height = `${position.h}px`;
    node.style.transform = `translate(${position.x}px, ${position.y}px)`;
  }
}

/**
 * A card and a row are the same three things — image, name with its glyph,
 * dates — in two arrangements, plus the bookmark. In cards the box comes from
 * the image's aspect ratio; in rows the thumbnail is square and the box is a
 * constant, so an imageless saint still gets an empty one and the column of
 * names stays a column. Detailed swaps the badge for the matrix and adds the
 * description box, held by skeleton bars until the life arrives.
 */
export function card(item, router, { rows = false, detailed = false } = {}) {
  const image = item.image
    ? `<span class="index-media" style="background-image:url('${BASE + item.image.lqip}')${
        rows ? '' : `;aspect-ratio:${item.image.aspect}`
      }">
        <img src="${BASE + item.image.src}" alt="" width="${item.image.w}" height="${item.image.h}"
          loading="lazy" decoding="async" />
      </span>`
    : '';

  const description = detailed
    ? `<span class="index-desc utility" data-desc>
        <span class="desc-skel" aria-hidden="true"><span class="skeleton"></span><span class="skeleton"></span></span>
      </span>`
    : '';

  // The link wraps the name only, and its ::after covers the whole card, so
  // the image is clickable without a second link that has no accessible name
  // of its own. The bookmark sits above that ::after, so pressing it saves
  // rather than opens. (The veneration glyph stood beside the name in this
  // line until 2026-08-22 — DESIGN.md §2.)
  const body = `<span class="name-line">
      <a class="index-name" href="${router.href(`/saints/${item.slug}`)}" data-prefetch="${esc(item.slug)}">${esc(saintName(item))}</a>
    </span>
    <span class="index-dates utility">${esc(formatSubtext(item))}</span>
    ${description}`;

  /*
   * A row reads name-first (author, 2026-08-27): the text starts at the card's
   * left edge and the picture stands at the trailing end. A saint with no icon
   * keeps the slot rather than closing it up — an empty 48 px on the right — so
   * the pictures stay in one column and the eye running down a scrolling
   * register meets every name at the same left edge.
   *
   * This is not the empty frame the author struck out on 2026-08-26. That one
   * stood *before* the name and pushed every title in from the margin, which
   * is the thing objected to; the instruction was "print the text all the way
   * to the left margin of the card", and moving the picture to the other end
   * is what finally does it for the 614 saints who have none.
   *
   * **A row carries no bookmark** (author, 2026-08-27: "on all row cards,
   * remove the bookmark entirely, and just have the image square to the right
   * side, giving more space for the text … From my own experience a 'watch
   * later' style bookmarking system is never actually revisited"). The mark
   * stays on the card shapes and on the saint's own page, which is where the
   * author sent anyone who wants it. What the row buys with the 44 px is the
   * next instruction in the same breath: names print whole.
   */
  /*
   * **And a card carries none either** (author, 2026-08-28: "Remove the
   * bookmark from the normal Cards in the All Saints view"). The row lost its
   * mark the day before and the card kept it; both are gone now, and with the
   * mark goes the footprint the name and the dates were reserving for it — the
   * 40 px inset an imageless card used to keep clear, and the two-line name
   * box's own gap. The Index does not offer Save any more, in either shape.
   * The saint's own page does, which is where the author sent it.
   */
  const slot = image || '<span class="index-media is-blank" aria-hidden="true"></span>';
  return rows ? `<span class="row-body">${body}</span>${slot}` : `${image}${body}`;
}

/**
 * The description is the opening paragraph of the saint's own life, fetched
 * through the same second layer the detail page uses (brief §7) and derived
 * once per saint. It is not in the manifest on purpose — Addendum H1 has the
 * budget arithmetic. A saint with no life, or a fetch that fails, shows what
 * the manifest does say: the types.
 */
async function fillDescription(node, item) {
  const box = node.querySelector('[data-desc]');
  if (!box) return;
  // The types, named rather than slugged (2026-08-25 evening). It used to
  // capitalise the joined run's first letter only, which made "Martyr,
  // hieromartyr" out of two words that are equally names.
  const fallback = () => typeNames(item.types);
  let text = ledes.get(item.slug);
  if (text === undefined) {
    try {
      const payload = await loadDetail(item.slug);
      text = firstParagraphText(payload.life) || fallback();
      ledes.set(item.slug, text);
    } catch {
      text = fallback();
    }
  }
  if (!box.isConnected) return;
  box.textContent = text;
}
