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
 * How far the carousel had drifted, for the same reason the scroll position is
 * kept (author, 2026-08-27: "When exiting a saint card from the carousel, make
 * sure you return to where you came from, just like you do when you leave
 * advanced search and come back to the carousel").
 *
 * **Read from the track while it can still answer.** A `display: none` element
 * reports `scrollLeft` 0 and ignores writes — the pitfall ui/loop-scroll.js
 * opens by warning about, and which cost the mode switch its offset once
 * already. Nothing is hidden yet when `destroy` runs, so on the carousel the
 * element is the truth. In search mode the row is already hidden and the truth
 * is `state.carouselAt`, which `switchMode` took on the way out for exactly
 * this reason.
 */
const carouselOffset = (state) => {
  const track = state.el.querySelector('[data-carousel-track]');
  return state.mode === 'carousel' && track ? track.scrollLeft : (state.carouselAt ?? null);
};

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
    carouselAt: carouselOffset(state),
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

  /*
   * The row's offset goes back before `paintCarousel` builds it, because that
   * is where it is read: the loop is handed `startAt` at construction and
   * writing `scrollLeft` afterwards would fight its own first correction.
   *
   * It survives that trip only because `state.carouselKey` is undefined on a
   * fresh render — `paintCarousel` drops a remembered offset when the *pool*
   * has changed under it, and no pool has been painted yet. The filters this
   * function has just put back are what make that safe rather than lucky: the
   * same filters mean the same run of saints, so the offset lands on the saint
   * it was taken from.
   */
  state.carouselAt = snap.carouselAt ?? null;
  /*
   * **And written straight in if the row is already built** (2026-08-28).
   * The paragraph above is true when the render happens after this — which it
   * does behind a view transition, and does *not* under `prefers-reduced-
   * motion`, where the transition is skipped and `paintCarousel` has already
   * run by the time the snapshot comes back. The offset was then set too late
   * to be handed to the loop as `startAt`, and the row opened at its own head:
   * a reader with reduced motion lost their place on every trip through a
   * saint. It went unseen while the head was a few hundred pixels in; the row
   * carrying the whole corpus put it 3,760 px away and the test said so.
   *
   * Writing `scrollLeft` is safe rather than a fight with the loop's first
   * correction: `onScroll` treats anything that is not what the drift last
   * wrote as the authority, which is exactly what this is.
   */
  if (state.loop && state.carouselAt !== null) {
    const track = el.querySelector('[data-carousel-track]');
    if (track && track.clientWidth > 0) track.scrollLeft = state.carouselAt;
  }

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
  el.querySelector('[data-clear]').hidden = !readerHasFiltered(f, state.facets?.churches);
}
