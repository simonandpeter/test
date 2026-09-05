import { PLACES } from '../../data/places.js';
import { saintName } from '../../lib/honorific.js';
import { clampCentre, MIN_SCALE } from '../../lib/map-view.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { project } from '../../lib/mercator.js';
import { fill, STRINGS } from '../../ui/strings.js';
import { pointAt } from './paint.js';
import { announce, ceilingOf, frameOf, map, place, shownYear } from './state.js';

/**
 * The search box in the picture's corner: the ranking (`searchMatches`,
 * exported for its own sake — it is arithmetic over two small lists) and
 * the combobox that flies the view to a chosen row (`wireSearch`).
 *
 * Cut from `views/map.js` on 2026-09-05 (cleanup plan item 5).
 */

/* ---- the search --------------------------------------------------------- */

/** How many rows the list ever shows: enough to be worth scanning, few
 *  enough that the panel never becomes the page. */
const SEARCH_LIMIT = 8;

/**
 * Ranked matches over the two things this map can fly to — a located saint,
 * and a place from `data/places.js`.
 *
 * Prefix matches rank above contained ones, and saints above places only
 * within the same tier: a reader typing "ale" almost certainly wants
 * Alexandria before they want Alexander, and one typing "anth" wants
 * Anthony. Both corpora are small enough (69 located saints, ~70 places)
 * that a linear scan per keystroke is far below the cost of the repaint the
 * same keystroke does not even trigger — MiniSearch is on the boot path for
 * the Index and is not worth reaching for here.
 */
export function searchMatches(query, saints, places, limit = SEARCH_LIMIT) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = [];

  const consider = (label, tier, payload) => {
    const at = label.toLowerCase().indexOf(q);
    if (at < 0) return;
    scored.push({ rank: (at === 0 ? 0 : 1) * 2 + tier, at, label, ...payload });
  };

  for (const place of places) {
    // A place is findable by any of the names a reader might type for it,
    // but is always *listed* under its primary one — matching "Byzantium"
    // and then offering a row headed "Byzantium" would suggest the corpus
    // knows a place by that name, which it does not.
    consider(place.name, 0, { kind: 'place', place, label: place.name });
    for (const alias of place.also ?? []) {
      const at = alias.toLowerCase().indexOf(q);
      if (at >= 0) scored.push({ rank: (at === 0 ? 0 : 1) * 2 + 0, at, kind: 'place', place, label: place.name });
    }
  }
  for (const card of saints) consider(saintName(card), 1, { kind: 'saint', card });

  const seen = new Set();
  return scored
    .sort((a, b) => a.rank - b.rank || a.at - b.at || a.label.localeCompare(b.label))
    .filter((row) => {
      const key = `${row.kind}:${row.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/**
 * The search box: type, arrow through, Enter to fly there.
 *
 * **It moves the map rather than opening the saint** — a dot is already a
 * door (`wirePress`), and a search that navigated away would make the map
 * the thing you leave rather than the thing you look at. Choosing a saint
 * flies to where their dot currently is; choosing a place flies to the
 * place's own coordinates at the zoom `data/places.js` gives it.
 */
export function wireSearch(el, canvas, withPlace, setView) {
  const input = el.querySelector('[data-search-input]');
  const list = el.querySelector('[data-search-list]');
  let rows = [];
  let active = -1;

  const close = () => {
    list.hidden = true;
    list.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    rows = [];
    active = -1;
  };

  const mark = () => {
    for (const [i, li] of [...list.children].entries()) {
      li.classList.toggle('is-active', i === active);
      li.setAttribute('aria-selected', String(i === active));
    }
    if (active >= 0) input.setAttribute('aria-activedescendant', `map-search-row-${active}`);
    else input.removeAttribute('aria-activedescendant');
  };

  const open = () => {
    rows = searchMatches(input.value, withPlace, PLACES);
    if (!rows.length) {
      close();
      return;
    }
    const M = STRINGS.map;
    list.innerHTML = rows
      .map(
        (row, i) =>
          `<li class="map-search-row" id="map-search-row-${i}" role="option" aria-selected="false" data-row="${i}">
             <span class="map-search-name">${esc(row.kind === 'saint' ? saintName(row.card) : row.label)}</span>
             <span class="map-search-kind utility">${esc(row.kind === 'saint' ? M.searchSaints : M.searchPlaces)}</span>
           </li>`,
      )
      .join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
    mark();
  };

  /** Flies the view to a chosen row, and says so — the canvas is one opaque
   *  image to a screen reader, so a view that moved silently would be a
   *  control that appeared to do nothing. */
  const choose = (row) => {
    if (!row) return;
    const frame = frameOf(canvas);
    let lon;
    let lat;
    let scale;
    if (row.kind === 'place') {
      ({ lon, lat } = row.place);
      scale = Math.min(ceilingOf(canvas), Math.max(MIN_SCALE, row.place.zoom));
    } else {
      const at = pointAt(row.card, map.dateFrom, map.dateTo, shownYear());
      if (!at) return;
      ({ lon, lat } = at.where);
      // Close enough to read the name and its neighbours, not so close that
      // the reader has to zoom back out to learn where in the world they are.
      scale = Math.min(ceilingOf(canvas), 30);
    }
    const p = project(lon, lat);
    setView({ scale, ...clampCentre(p.x, p.y, scale, frame) });
    input.value = row.kind === 'saint' ? saintName(row.card) : row.label;
    close();
    announce(el, fill(STRINGS.map.searchFlewTo, { name: input.value }));
  };

  input.addEventListener('input', open);
  input.addEventListener('focus', () => {
    if (input.value.trim()) open();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (list.hidden) {
        open();
        return;
      }
      e.preventDefault();
      active += e.key === 'ArrowDown' ? 1 : -1;
      // Wraps both ways, and from the "nothing chosen yet" -1 an ArrowUp
      // lands on the last row rather than on nothing.
      if (active < 0) active = rows.length - 1;
      else if (active >= rows.length) active = 0;
      mark();
    } else if (e.key === 'Enter') {
      if (!list.hidden && rows.length) {
        e.preventDefault();
        choose(rows[active >= 0 ? active : 0]);
      }
    } else if (e.key === 'Escape') {
      close();
    }
  });
  list.addEventListener('mousedown', (e) => {
    // `mousedown`, not `click`: the input's own blur would close the list
    // out from under a click before it landed.
    const li = e.target.closest('[data-row]');
    if (!li) return;
    e.preventDefault();
    choose(rows[Number(li.dataset.row)]);
  });
  input.addEventListener('blur', () => {
    // After the frame, so a mousedown on a row is not raced by the blur.
    setTimeout(close, 0);
  });
}
