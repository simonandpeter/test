/**
 * All Saints — Index mode (brief §8.2). The conventional view: a vertical
 * virtualised grid where all the sorting and filtering live. River mode is
 * Session 6 and is deliberately absent rather than stubbed; when it lands, the
 * mode toggle goes above these controls and nothing here changes.
 *
 * Three things here are not incidental:
 *
 * - **Every card's height is known before it is rendered**, from the aspect
 *   ratio in the manifest, so the virtualiser never measures (Addendum C2).
 * - **Filtered-out saints fade rather than vanish**, over the standard 200 ms,
 *   because a corpus that flickers reads as a search engine and this is a
 *   register. Under reduced motion they are simply gone — removed, not faster.
 * - **Breadth of veneration sorts only when asked.** It is offered, never
 *   defaulted to: ordering the corpus by how many communions venerate someone
 *   would read as a ranking of importance.
 *
 * And one thing added on 2026-08-22 (Addendum H1–H3): the grid remembers where
 * the reader left it, shows more of each saint when asked (*Detailed*), and
 * carries the Save bookmark on every card.
 */

import { CHURCHES_BY_ID, enabledChurches, enabledCommunions } from '../data/churches.js';
import { REGIONS_BY_ID } from '../lib/regions.js';
import { buildFeastIndex } from '../lib/feasts.js';
import { formatLifespan, parseIso } from '../lib/calendar-page.js';
import { escapeHtml as esc, firstParagraphText } from '../lib/markdown.js';
import { loadDetail, prefetch } from '../lib/detail.js';
import * as store from '../lib/store.js';
import {
  EMPTY_FILTERS,
  applyFilters,
  facetsOf,
  hasActiveFilters,
} from '../lib/index-filters.js';
import { layout, windowOf } from '../lib/virtual-grid.js';
import { beginSwap, restore, setAside } from '../ui/swap.js';
import { renderBadge } from '../ui/badge.js';
import { matrixRows, renderMatrix } from '../ui/matrix.js';
import { paintSaved, renderBookmark, wireSaveButtons } from '../ui/save.js';
import { currentSelection, subscribeSelection, venerates } from '../lib/tradition.js';
import { STRINGS, fill } from '../ui/strings.js';

const BASE = import.meta.env.BASE_URL;

export const title = STRINGS.saints.title;

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
const LAYOUTS = ['cards', 'rows'];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' });
const monthLabel = (m) => monthFmt.format(new Date(Date.UTC(2001, m - 1, 1)));

let state = null;

/**
 * Where the reader was, kept across a trip into a saint's page (author,
 * 2026-08-22): the × on that page and the browser's own back both return here
 * and find the grid as it was left — filters, search, sort, which facets were
 * open, and the scroll position. Layout and Detailed are settings and come
 * back by themselves. Module-level, so it lives as long as the page does; the
 * nav link still opens the Index fresh, because it does not ask.
 */
let remembered = null;

/**
 * The opening of each life, derived once from the fetched text and kept across
 * re-renders — the same card is mounted and unmounted on every scroll frame
 * and must not refetch to say the same sentence again.
 */
const ledes = new Map();

export function destroy() {
  if (state) remembered = snapshot(state);
  state?.cleanups.forEach((fn) => fn?.());
  state = null;
}

export function render(el, { data, router, nav }) {
  destroy();

  const cards = data.saints;
  const settings = store.getSettings();
  state = {
    el,
    data,
    router,
    cards,
    filters: { ...EMPTY_FILTERS },
    facets: facetsOf(cards),
    monthsBySlug: monthsBySlugFor(cards),
    search: null,
    rendered: new Map(),
    positions: [],
    shownCards: [],
    shown: 0,
    // Which layout the reader last chose, remembered across visits: a view
    // control that forgets is one the reader has to set every time. Detailed
    // is remembered the same way.
    layout: LAYOUTS.includes(settings.indexLayout) ? settings.indexLayout : 'cards',
    detailed: settings.indexDetailed === true,
    finePointer: window.matchMedia('(pointer: fine)').matches,
    named: null,
    cleanups: [],
  };

  el.innerHTML = `
    <h1>${STRINGS.saints.title}</h1>
    <p class="index-lede">${STRINGS.saints.lede}</p>
    ${controls(state)}
    <p class="result-count utility" data-count-row></p>
    <p class="set-aside utility" data-set-aside hidden></p>
    <div class="grid" data-grid><div class="grid-inner" data-grid-inner></div></div>
    <div data-tray></div>
    <p class="index-empty" data-empty hidden>${STRINGS.saints.noneMatch}</p>`;

  wireControls();
  wireGrid();
  // The header's control can change the selection while the grid is open.
  state.cleanups.push(subscribeSelection(() => state && update({ animate: true })));

  // Back where the reader was, if that is what this navigation is — the saint
  // page's × says so, and so does a history traversal. The grid's height has
  // to exist before the scroll can, which is why the restore straddles update.
  const restoring = (nav?.restore || nav?.pop) && remembered ? remembered : null;
  if (restoring) applySnapshot(restoring);
  update({ animate: false });
  if (restoring) {
    window.scrollTo(0, restoring.scrollY);
    paintWindow();
  }
  loadSearch(cards);
}

/* ---- remembering the place --------------------------------------------- */

function snapshot(state) {
  return {
    filters: { ...state.filters },
    openFacets: [...state.el.querySelectorAll('details.facet[open]')].map((d) => d.dataset.facet),
    scrollY: window.scrollY,
  };
}

/**
 * Puts a snapshot back into both the state and the controls, because
 * readFilters reads the controls: the next keystroke must start from what the
 * reader sees, not from an empty form.
 */
function applySnapshot(snap) {
  const { el } = state;
  const controlsEl = el.querySelector('.index-controls');
  const f = { ...EMPTY_FILTERS, ...snap.filters };
  state.filters = f;

  controlsEl.querySelector('[data-query]').value = f.query ?? '';
  const check = (name, values) => {
    const wanted = new Set((values ?? []).map(String));
    for (const input of controlsEl.querySelectorAll(`input[name="${name}"]`)) {
      input.checked = wanted.has(input.value);
    }
  };
  check('churches', f.churches);
  check('months', f.months);
  check('types', f.types);
  check('sexes', f.sexes);
  check('regions', f.regions);
  check('historicities', f.historicities);
  controlsEl.querySelector('[data-from]').value = f.from ?? '';
  controlsEl.querySelector('[data-to]').value = f.to ?? '';
  const mode = controlsEl.querySelector(`input[name="rangeMode"][value="${f.rangeMode}"]`);
  if (mode) mode.checked = true;
  controlsEl.querySelector('[data-breadth]').value = String(f.breadth ?? 0);
  controlsEl.querySelector('[data-sort]').value = f.sort ?? 'name';
  for (const name of snap.openFacets ?? []) {
    const group = controlsEl.querySelector(`details.facet[data-facet="${name}"]`);
    if (group) group.open = true;
  }
  el.querySelector('[data-clear]').hidden = !hasActiveFilters(f);
}

/* ---- search -------------------------------------------------------------- */

/**
 * The index is built at runtime from the manifest (brief §3), so it costs no
 * bytes on the wire beyond MiniSearch itself — and that is loaded on demand,
 * because it is a third of the bundle and the calendar, which is the page that
 * matters, never searches. A query typed before it arrives simply applies a
 * moment later.
 *
 * It reaches the display name, what a saint was, where they were, and who
 * venerates them — which is as far as the manifest goes. The other name forms
 * (Ἀντώνιος, Ⲁⲛⲧⲱⲛⲓⲟⲥ) live in each saint's own file and are therefore not
 * searchable; putting them in the manifest is a size decision, not a code one.
 */
async function loadSearch(cards) {
  const { default: MiniSearch } = await import('minisearch');
  const index = new MiniSearch({
    idField: 'slug',
    fields: ['name', 'types', 'churches', 'regions'],
    searchOptions: { prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  });
  index.addAll(
    cards.map((card) => ({
      slug: card.slug,
      name: card.display_name,
      types: (card.types ?? []).join(' '),
      churches: card.attestations
        .filter((a) => a.status === 'venerated')
        .map((a) => CHURCHES_BY_ID[a.church]?.display_name ?? '')
        .join(' '),
      regions: (card.locations ?? [])
        .map((l) => REGIONS_BY_ID[l.region]?.display_name ?? '')
        .join(' '),
    })),
  );
  if (!state || state.cards !== cards) return;
  state.search = index;
  if (state.filters.query.trim()) update({ animate: true });
}

/**
 * Which Gregorian months hold each saint's feasts this year. Resolving a
 * Julian or Coptic feast to a Gregorian month is calendar work, and the feast
 * index is the one place in this codebase that does it.
 */
function monthsBySlugFor(cards) {
  const year = new Date().getFullYear();
  const months = new Map();
  for (const [iso, entries] of buildFeastIndex(cards, year, CHURCHES_BY_ID)) {
    const month = parseIso(iso).month;
    for (const entry of entries) {
      if (!months.has(entry.slug)) months.set(entry.slug, new Set());
      months.get(entry.slug).add(month);
    }
  }
  return months;
}

/* ---- controls ------------------------------------------------------------ */

const checkboxes = (name, options) =>
  options
    .map(
      ({ value, label }) => `<label class="facet-option">
        <input type="checkbox" name="${name}" value="${esc(value)}" /> ${esc(label)}
      </label>`,
    )
    .join('');

const facetGroup = (legend, name, options) =>
  options.length
    ? `<details class="facet" data-facet="${name}"><summary>${esc(legend)}</summary>
        <fieldset><legend class="sr-only">${esc(legend)}</legend>
          ${checkboxes(name, options)}
        </fieldset></details>`
    : '';

/**
 * What "breadth" is counting, spelled out. The measure is communions — four of
 * them — and that is not self-evident from a number in a select, least of all
 * for the Catholic cell, which is one communion holding seven rites.
 *
 * Built from `matrixRows`, so the roster is the glyph's own axes rather than a
 * second list that can drift from them. Rites are named only for a church that
 * spans more than one: for the rest the church name already says which column
 * it occupies, and repeating it would be noise.
 */
function breadthRoster() {
  const rows = matrixRows().map(({ communion, cells }) => {
    const byChurch = new Map();
    for (const cell of cells) {
      if (!byChurch.has(cell.label)) byChurch.set(cell.label, []);
      byChurch.get(cell.label).push(cell.rite.display_name);
    }
    const churches = [...byChurch]
      .map(([name, rites]) => (rites.length > 1 ? `${name} (${rites.join(', ')})` : name))
      .join('; ');
    return `<li><b>${esc(communion.display_name)}</b> — ${esc(churches)}</li>`;
  });
  return `<ul class="breadth-roster utility">${rows.join('')}</ul>`;
}

function controls(state) {
  const { facets } = state;
  const churchOptions = enabledChurches()
    .filter((c) => facets.churches.includes(c.id))
    .map((c) => ({ value: c.id, label: c.display_name }));

  return `<div class="index-controls">
    <div class="index-row">
      <input class="search-field" type="search" data-query
        aria-label="${STRINGS.saints.search}"
        placeholder="${STRINGS.saints.search}: ${STRINGS.saints.searchHint}" />
      <button type="button" data-clear hidden>${STRINGS.saints.clear}</button>
    </div>

    <div class="facets">
      ${facetGroup(STRINGS.saints.filters.church, 'churches', churchOptions)}
      ${facetGroup(STRINGS.saints.filters.month, 'months', MONTHS.map((m) => ({ value: String(m), label: monthLabel(m) })))}
      ${facetGroup(STRINGS.saints.filters.type, 'types', facets.types.map((t) => ({ value: t, label: t })))}
      ${facetGroup(STRINGS.saints.filters.sex, 'sexes', facets.sexes.map((s) => ({ value: s, label: STRINGS.saint.sexLabel[s] ?? s })))}
      ${facetGroup(STRINGS.saints.filters.region, 'regions', facets.regions.map((r) => ({ value: r, label: REGIONS_BY_ID[r]?.display_name ?? r })))}
      ${facetGroup(STRINGS.saints.filters.historicity, 'historicities', facets.historicities.map((h) => ({ value: h, label: h })))}

      <details class="facet" data-facet="dates"><summary>${STRINGS.saints.filters.dates}</summary>
        <div class="range">
          <label class="utility">${STRINGS.saints.filters.from}
            <input type="number" data-from inputmode="numeric" step="1" />
          </label>
          <label class="utility">${STRINGS.saints.filters.to}
            <input type="number" data-to inputmode="numeric" step="1" />
          </label>
          <fieldset class="range-mode">
            <legend class="utility">${STRINGS.saints.filters.rangeMode}</legend>
            <label><input type="radio" name="rangeMode" value="overlaps" checked /> ${STRINGS.saints.filters.overlaps}</label>
            <label><input type="radio" name="rangeMode" value="within" /> ${STRINGS.saints.filters.within}</label>
          </fieldset>
          <p class="range-note utility">${STRINGS.saints.filters.rangeNote}</p>
        </div>
      </details>

      <details class="facet" data-facet="breadth"><summary>${STRINGS.saints.filters.breadth}</summary>
        <label class="utility">${STRINGS.saints.filters.breadthLabel}
          <select data-breadth>
            <option value="0">${STRINGS.saints.filters.any}</option>
            ${enabledCommunions().map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
          </select>
        </label>
        <p class="range-note utility">${STRINGS.saints.filters.breadthNote}</p>
        <p class="range-note utility">${STRINGS.saints.filters.breadthRosterNote}</p>
        ${breadthRoster()}
      </details>
    </div>

    <div class="index-foot">
      <div class="sort-group">
        <label class="sort-field utility">${STRINGS.saints.sort.label}
          <select data-sort>
            <option value="name">${STRINGS.saints.sort.name}</option>
            <option value="earliest">${STRINGS.saints.sort.earliest}</option>
            <option value="latest">${STRINGS.saints.sort.latest}</option>
            <option value="breadth">${STRINGS.saints.sort.breadth}</option>
          </select>
        </label>
        <button type="button" data-random>${STRINGS.saints.random}</button>
      </div>

      <div class="layout-toggle utility" role="group" aria-label="${STRINGS.saints.layout.description}">
        <span aria-hidden="true">${STRINGS.saints.layout.label}</span>
        ${LAYOUTS.map(
          (id) => `<button type="button" data-layout="${id}"
            aria-pressed="${String(id === state.layout)}">${STRINGS.saints.layout[id]}</button>`,
        ).join('')}
      </div>

      <label class="detail-toggle utility">
        <input type="checkbox" data-detailed${state.detailed ? ' checked' : ''}
          aria-describedby="detailed-description" />
        ${STRINGS.saints.layout.detailed}
      </label>
      <span id="detailed-description" class="sr-only">${STRINGS.saints.layout.detailedDescription}</span>
    </div>
  </div>`;
}

function wireControls() {
  const { el } = state;
  const controlsEl = el.querySelector('.index-controls');

  const checked = (name) =>
    [...controlsEl.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);

  const readFilters = (e) => {
    // Detailed is a view control, not a filter; it has its own listener below
    // and must not run a filter pass.
    if (e?.target?.matches?.('[data-detailed]')) return;
    const from = controlsEl.querySelector('[data-from]').value;
    const to = controlsEl.querySelector('[data-to]').value;
    state.filters = {
      ...state.filters,
      query: controlsEl.querySelector('[data-query]').value,
      churches: checked('churches'),
      months: checked('months').map(Number),
      types: checked('types'),
      sexes: checked('sexes'),
      regions: checked('regions'),
      historicities: checked('historicities'),
      from: from === '' ? null : Number(from),
      to: to === '' ? null : Number(to),
      rangeMode: controlsEl.querySelector('input[name="rangeMode"]:checked').value,
      breadth: Number(controlsEl.querySelector('[data-breadth]').value),
      sort: controlsEl.querySelector('[data-sort]').value,
    };
    update({ animate: true });
  };

  // One listener for the whole panel: every control here is a plain form
  // element, and `input` fires for all of them — typing, checking, selecting —
  // so listening for `change` as well would only run every filter pass twice.
  controlsEl.addEventListener('input', readFilters);

  const random = controlsEl.querySelector('[data-random]');
  const onRandom = () => {
    // Random within what is on screen: a random saint that the reader's own
    // filters exclude would look like the filters had failed.
    const pool = state.shownCards.length ? state.shownCards : state.cards;
    if (!pool.length) return;
    const card = pool[Math.floor(Math.random() * pool.length)];
    state.router.navigate(`/saints/${card.slug}`);
  };
  random.addEventListener('click', onRandom);

  // Every card's markup and box change, so none of the rendered ones can be
  // kept: this is a re-render, not a reflow. Shared by the layout buttons and
  // the Detailed box, which change the same things.
  const rerenderAll = () => {
    for (const [slug, node] of state.rendered) {
      node.remove();
      state.rendered.delete(slug);
    }
    update({ animate: false });
  };

  const onLayout = (e) => {
    const button = e.target.closest('[data-layout]');
    if (!button || button.dataset.layout === state.layout) return;
    state.layout = button.dataset.layout;
    store.setSetting('indexLayout', state.layout);
    for (const b of controlsEl.querySelectorAll('[data-layout]')) {
      b.setAttribute('aria-pressed', String(b.dataset.layout === state.layout));
    }
    rerenderAll();
  };
  controlsEl.addEventListener('click', onLayout);

  const detailedBox = controlsEl.querySelector('[data-detailed]');
  const onDetailed = () => {
    state.detailed = detailedBox.checked;
    store.setSetting('indexDetailed', state.detailed);
    rerenderAll();
  };
  detailedBox.addEventListener('change', onDetailed);

  const clear = controlsEl.querySelector('[data-clear]');
  const onClear = () => {
    for (const input of controlsEl.querySelectorAll('input[type="checkbox"]:not([data-detailed])')) {
      input.checked = false;
    }
    controlsEl.querySelector('[data-query]').value = '';
    controlsEl.querySelector('[data-from]').value = '';
    controlsEl.querySelector('[data-to]').value = '';
    controlsEl.querySelector('[data-breadth]').value = '0';
    controlsEl.querySelector('input[name="rangeMode"][value="overlaps"]').checked = true;
    readFilters();
  };
  clear.addEventListener('click', onClear);

  state.cleanups.push(() => {
    controlsEl.removeEventListener('input', readFilters);
    controlsEl.removeEventListener('click', onLayout);
    detailedBox.removeEventListener('change', onDetailed);
    random.removeEventListener('click', onRandom);
    clear.removeEventListener('click', onClear);
  });
}

/* ---- the grid ------------------------------------------------------------ */

function wireGrid() {
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
    grid.removeEventListener('click', onClick);
    el.removeEventListener('pointerover', onHover);
    unwireSave();
  });
}

function update({ animate }) {
  const { el, cards, filters, search } = state;
  const query = filters.query.trim();
  const hits = query && search ? new Set(search.search(query).map((r) => r.id)) : null;

  // The reader's traditions come first (author, 2026-08-22): a saint venerated
  // in none of the selected churches is not on the grid, and what that sets
  // aside is counted and named under the count rather than silently dropped.
  // The search and the facets apply within what remains.
  const selection = currentSelection();
  const mine = cards.filter((card) => venerates(card, selection));
  const asideNote = el.querySelector('[data-set-aside]');
  const aside = cards.length - mine.length;
  asideNote.hidden = aside === 0;
  asideNote.textContent =
    aside === 1 ? STRINGS.saints.setAsideOne : fill(STRINGS.saints.setAsideMany, { count: aside });

  const { matched, undated } = applyFilters(mine, filters, {
    monthsBySlug: state.monthsBySlug,
    matchesQuery: hits ? (slug) => hits.has(slug) : null,
  });

  state.shownCards = matched;
  el.querySelector('[data-clear]').hidden = !hasActiveFilters(filters);
  el.querySelector('[data-empty]').hidden = matched.length > 0;
  paintCount(matched.length, animate);
  paintTray(undated);

  const grid = el.querySelector('[data-grid]');
  const inner = el.querySelector('[data-grid-inner]');
  const rows = state.layout === 'rows';
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
}

function paintWindow() {
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
function card(item, router, { rows = false, detailed = false } = {}) {
  const image = item.image
    ? `<span class="index-media" style="background-image:url('${BASE + item.image.lqip}')${
        rows ? '' : `;aspect-ratio:${item.image.aspect}`
      }">
        <img src="${BASE + item.image.src}" alt="" width="${item.image.w}" height="${item.image.h}"
          loading="lazy" decoding="async" />
      </span>`
    : rows
      ? '<span class="index-media is-empty" aria-hidden="true"></span>'
      : '';

  const glyph = detailed
    ? renderMatrix(item.attestations, { pitch: 7.65 })
    : renderBadge(item.attestations, { pitch: 10.2 });

  const description = detailed
    ? `<span class="index-desc utility" data-desc>
        <span class="desc-skel" aria-hidden="true"><span class="skeleton"></span><span class="skeleton"></span></span>
      </span>`
    : '';

  // The link wraps the name only, and its ::after covers the whole card, so
  // the image is clickable without a second link that has no accessible name
  // of its own — and so the glyph can sit beside the name rather than inside
  // the link, where its label would become part of the link's. The bookmark
  // sits above that ::after, so pressing it saves rather than opens.
  const body = `<span class="name-line">
      <a class="index-name" href="${router.href(`/saints/${item.slug}`)}" data-prefetch="${esc(item.slug)}">${esc(item.display_name)}</a>
      ${glyph}
    </span>
    <span class="index-dates utility">${esc(formatLifespan(item.dates))}</span>
    ${description}`;
  const bookmark = renderBookmark(item.slug, item.display_name);

  return rows ? `${image}<span class="row-body">${body}</span>${bookmark}` : `${image}${body}${bookmark}`;
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
  const fallback = () => {
    const types = (item.types ?? []).join(', ');
    return types ? types.charAt(0).toUpperCase() + types.slice(1) : '';
  };
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

/* ---- count and tray ------------------------------------------------------ */

/**
 * The count animates (brief §8.2) but is announced once: a live region ticking
 * through every intermediate number would be unusable, so the tween is
 * aria-hidden and the final figure is what a screen reader is told.
 */
function paintCount(next, animate) {
  const row = state.el.querySelector('[data-count-row]');
  if (!row.firstChild) {
    row.innerHTML = `<span data-count aria-hidden="true">0</span>
      <span aria-hidden="true">${STRINGS.saints.countLabel}</span>
      <span class="sr-only" aria-live="polite" data-count-live></span>`;
  }
  const value = row.querySelector('[data-count]');
  const liveRegion = row.querySelector('[data-count-live]');
  liveRegion.textContent = fill(STRINGS.saints.countAnnounce, { count: next });

  const from = state.shown ?? 0;
  state.shown = next;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reduced || from === next) {
    value.textContent = String(next);
    return;
  }

  const started = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - started) / 200);
    value.textContent = String(Math.round(from + (next - from) * t));
    if (t < 1 && state) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * The undated tray (Addendum F). A date range cannot include or exclude a
 * saint with no bound at either end, so they are set aside and counted rather
 * than silently dropped — an honest gap, styled as one.
 */
function paintTray(undated) {
  const tray = state.el.querySelector('[data-tray]');
  if (!undated.length) {
    tray.innerHTML = '';
    return;
  }
  tray.innerHTML = `<details class="tray">
    <summary>${fill(STRINGS.saints.undatedTray, { count: undated.length })}</summary>
    <p class="utility">${STRINGS.saints.undatedNote}</p>
    <ul class="register">
      ${undated
        .map(
          (c) => `<li><a class="reg-name" href="${state.router.href(`/saints/${c.slug}`)}"
            data-prefetch="${esc(c.slug)}">${esc(c.display_name)}</a></li>`,
        )
        .join('')}
    </ul>
  </details>`;
}
