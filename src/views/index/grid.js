import { formatSubtext } from '../../lib/calendar-page.js';
import { loadDetail, prefetch } from '../../lib/detail.js';
import { saintName } from '../../lib/honorific.js';
import { escapeHtml as esc, firstParagraphText } from '../../lib/markdown.js';
import { typeNames } from '../../lib/saint-types.js';
import { layout, windowOf } from '../../lib/virtual-grid.js';
import { paintSaved, renderBookmark, wireSaveButtons } from '../../ui/save.js';
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
const CARD_TEXT_HEIGHT = 92;

const CARD_INSET = 18;

/**
 * Rows are a fixed box: a 48 px thumbnail, the name and its glyph beside it,
 * the dates beneath. Nothing in a row varies with the image, so its height is
 * a constant rather than a calculation — index.css holds the other half of it.
 */
const ROW_HEIGHT = 66;

const ROW_GAP = 8;

/**
 * Detailed (author, 2026-08-22) adds the rite × communion matrix in place of
 * the badge and a short description under the dates, and both are sized so
 * the box is still known before render: the matrix fits the 42 px name line a
 * card already reserves, and the description is a fixed count of utility lines
 * (13.5 px at 1.45 = 19.575 each), clamped — three on a card, two on a row.
 * Card: 92 + 6 gap + 58.725 = 156.7. Row: 18 inset + 31 name line + 2 + 19.575
 * dates + 2 + 39.15 = 111.7. index.css fixes the other half of each number.
 */
const DETAILED_CARD_TEXT_HEIGHT = 157;

const DETAILED_ROW_HEIGHT = 112;

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
        textHeight: state.detailed ? DETAILED_ROW_HEIGHT : ROW_HEIGHT,
        // A row's thumbnail is a fixed box, so no row's height depends on its
        // image and every row is the same height. Still exact, still no
        // measurement — the constant is simply the whole answer here.
        aspectOf: () => null,
      })
    : layout(matched, {
        width: grid.clientWidth,
        gap: GAP,
        textHeight: state.detailed ? DETAILED_CARD_TEXT_HEIGHT : CARD_TEXT_HEIGHT,
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

  // The bookmarks: one delegated listener for every card that will ever mount
  // here, and one subscription that repaints them all when the store changes.
  const unwireSave = wireSaveButtons(grid);

  state.cleanups.push(() => {
    if (frame) cancelAnimationFrame(frame);
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    observer?.disconnect();
    grid.removeEventListener('click', onClick);
    el.removeEventListener('pointerover', onHover);
    unwireSave();
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
  // New cards arrive with their bookmark unpainted; one read of the store
  // paints every card in the window, not one per card.
  if (mounted) paintSaved(inner);
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
  const bookmark = renderBookmark(item.slug, item.display_name);

  /*
   * A row reads name-first (author, 2026-08-27): the text starts at the card's
   * left edge and the picture stands at the trailing end, just inside the
   * bookmark. A saint with no icon keeps the slot rather than closing it up —
   * an empty 48 px on the right — so the marks stay in one column and the eye
   * running down a scrolling register meets every name at the same left edge.
   *
   * This is not the empty frame the author struck out on 2026-08-26. That one
   * stood *before* the name and pushed every title in from the margin, which
   * is the thing objected to; the instruction was "print the text all the way
   * to the left margin of the card", and moving the picture to the other end
   * is what finally does it for the 614 saints who have none.
   */
  const slot = image || '<span class="index-media is-blank" aria-hidden="true"></span>';
  return rows ? `<span class="row-body">${body}</span>${slot}${bookmark}` : `${image}${body}${bookmark}`;
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
