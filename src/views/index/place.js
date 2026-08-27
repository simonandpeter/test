import { EMPTY_FILTERS } from '../../lib/index-filters.js';
import { seeded, setChoice } from './controls.js';
import { readerHasFiltered } from './filter.js';
import { state } from './state.js';

/**
 * Where the reader was, so the Index can put them back.
 *
 * The saint page's × and the browser's back both ask for it, and `destroy`
 * takes the snapshot on the way out — by the time the next render begins, the
 * grid it describes is gone. The filter state is part of it as much as the
 * scroll position: coming back to a page you had narrowed and finding it wide
 * is the same loss as coming back to the top of it.
 */

/**
 * The page's state is the argument here rather than the import above, because
 * `destroy` calls this on the way out: by the next line the singleton is
 * closed, and a snapshot taken from it would be a snapshot of nothing.
 */
export function snapshot(state) {
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
export function applySnapshot(snap) {
  const { el } = state;
  const controlsEl = el.querySelector('.index-controls');
  const f = seeded({ ...EMPTY_FILTERS, ...snap.filters });
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
  setChoice(controlsEl, 'sort', f.sort ?? EMPTY_FILTERS.sort);
  for (const name of snap.openFacets ?? []) {
    const group = controlsEl.querySelector(`details.facet[data-facet="${name}"]`);
    if (group) group.open = true;
  }
  el.querySelector('[data-clear]').hidden = !readerHasFiltered(f);
}
