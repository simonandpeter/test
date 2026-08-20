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
 */

import { CHURCHES_BY_ID, enabledChurches } from '../data/churches.js';
import { REGIONS_BY_ID } from '../lib/regions.js';
import { buildFeastIndex } from '../lib/feasts.js';
import { formatLifespan, parseIso } from '../lib/calendar-page.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { prefetch } from '../lib/detail.js';
import {
  EMPTY_FILTERS,
  applyFilters,
  facetsOf,
  hasActiveFilters,
} from '../lib/index-filters.js';
import { layout, windowOf } from '../lib/virtual-grid.js';
import { renderBadge } from '../ui/badge.js';
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
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' });
const monthLabel = (m) => monthFmt.format(new Date(Date.UTC(2001, m - 1, 1)));

let state = null;

export function destroy() {
  state?.cleanups.forEach((fn) => fn?.());
  state = null;
}

export function render(el, { data, router }) {
  destroy();

  const cards = data.saints;
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
    finePointer: window.matchMedia('(pointer: fine)').matches,
    named: null,
    cleanups: [],
  };

  el.innerHTML = `
    <h1>${STRINGS.saints.title}</h1>
    <p class="index-lede">${STRINGS.saints.lede}</p>
    ${controls(state)}
    <p class="result-count utility" data-count-row></p>
    <div class="grid" data-grid><div class="grid-inner" data-grid-inner></div></div>
    <div data-tray></div>
    <p class="index-empty" data-empty hidden>${STRINGS.saints.noneMatch}</p>`;

  wireControls();
  wireGrid();
  update({ animate: false });
  loadSearch(cards);
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

function controls({ facets }) {
  const churchOptions = enabledChurches()
    .filter((c) => facets.churches.includes(c.id))
    .map((c) => ({ value: c.id, label: c.display_name }));

  return `<div class="index-controls">
    <div class="index-row">
      <label class="search-field">
        <span class="utility">${STRINGS.saints.search}</span>
        <input type="search" data-query placeholder="${STRINGS.saints.searchHint}" />
      </label>
      <button type="button" data-random>${STRINGS.saints.random}</button>
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
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </label>
        <p class="range-note utility">${STRINGS.saints.filters.breadthNote}</p>
      </details>
    </div>

    <label class="sort-field utility">${STRINGS.saints.sort.label}
      <select data-sort>
        <option value="name">${STRINGS.saints.sort.name}</option>
        <option value="earliest">${STRINGS.saints.sort.earliest}</option>
        <option value="latest">${STRINGS.saints.sort.latest}</option>
        <option value="breadth">${STRINGS.saints.sort.breadth}</option>
      </select>
    </label>
  </div>`;
}

function wireControls() {
  const { el } = state;
  const controlsEl = el.querySelector('.index-controls');

  const checked = (name) =>
    [...controlsEl.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);

  const readFilters = () => {
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

  const clear = controlsEl.querySelector('[data-clear]');
  const onClear = () => {
    for (const input of controlsEl.querySelectorAll('input[type="checkbox"]')) input.checked = false;
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

  state.cleanups.push(() => {
    if (frame) cancelAnimationFrame(frame);
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    grid.removeEventListener('click', onClick);
    el.removeEventListener('pointerover', onHover);
  });
}

function update({ animate }) {
  const { el, cards, filters, search } = state;
  const query = filters.query.trim();
  const hits = query && search ? new Set(search.search(query).map((r) => r.id)) : null;

  const { matched, undated } = applyFilters(cards, filters, {
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
  const result = layout(matched, {
    width: grid.clientWidth,
    gap: GAP,
    textHeight: CARD_TEXT_HEIGHT,
    mediaInset: CARD_INSET,
    // The manifest keeps a card's pixel dimensions on its image, and a saint
    // may have no image at all.
    aspectOf: (card) => card.image?.aspect ?? null,
  });
  state.positions = result.positions;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const keep = new Set(result.positions.map((p) => p.slug));
  const leaving = [...state.rendered.keys()].filter((slug) => !keep.has(slug));

  // Fading is the reason the removal is deferred: a filtered-out saint should
  // leave visibly. Reduced motion removes them now — disabled means removed,
  // never shortened.
  if (animate && !reduced && leaving.length) {
    for (const slug of leaving) state.rendered.get(slug).classList.add('leaving');
    setTimeout(() => {
      for (const slug of leaving) {
        // Still fading, and not a card that a second filter change brought
        // back in the meantime — paintWindow clears the class when it does.
        const node = state?.rendered.get(slug);
        if (!node?.classList.contains('leaving')) continue;
        node.remove();
        state.rendered.delete(slug);
      }
      if (state) paintWindow();
    }, 200);
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

  for (const position of visible) {
    let node = state.rendered.get(position.slug);
    if (!node) {
      node = document.createElement('div');
      node.className = 'index-card panel';
      node.innerHTML = card(position, state.router);
      inner.appendChild(node);
      state.rendered.set(position.slug, node);
      if (!state.finePointer) prefetch(position.slug);
    }
    node.classList.remove('leaving');
    node.style.width = `${position.w}px`;
    node.style.height = `${position.h}px`;
    node.style.transform = `translate(${position.x}px, ${position.y}px)`;
  }
}

function card(item, router) {
  const media = item.image
    ? `<span class="index-media" style="aspect-ratio:${item.image.aspect};background-image:url('${BASE + item.image.lqip}')">
        <img src="${BASE + item.image.src}" alt="" width="${item.image.w}" height="${item.image.h}"
          loading="lazy" decoding="async" />
      </span>`
    : '';
  // The link wraps the name only, and its ::after covers the whole card, so
  // the image is clickable without a second link that has no accessible name
  // of its own — and so the glyph can sit beside the name rather than inside
  // the link, where its label would become part of the link's.
  return `${media}
    <span class="name-line">
      <a class="index-name" href="${router.href(`/saints/${item.slug}`)}" data-prefetch="${esc(item.slug)}">${esc(item.display_name)}</a>
      ${renderBadge(item.attestations, { cell: 11 })}
    </span>
    <span class="index-dates utility">${esc(formatLifespan(item.dates))}</span>`;
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
