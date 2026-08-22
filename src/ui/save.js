/**
 * The Save control, in one place because it appears in three — the calendar's
 * hero, the saint's own page and every Index card — and the three must never
 * disagree: saving from the hero and then opening the saint has to show a
 * saved mark, without a reload. That is what subscribing to the store buys,
 * and it is the reason this is a component rather than three handlers.
 *
 * Two renderings of one toggle. The hero keeps the text button; an Index card
 * and the saint's name line take the **bookmark** (author, 2026-08-22): a
 * frameless silhouette, outlined when not saved and filled when saved. Either
 * way `aria-pressed` carries the state, the accessible name says which state
 * it is in, and nothing about it is red or gold — Save is chrome, and chrome
 * stays quiet (DESIGN.md §2, §5).
 *
 * Painting re-queries the root each time rather than keeping a list, because
 * the Index mounts and unmounts cards on every scroll frame: a list taken at
 * wiring time is stale within a second.
 */

import * as store from '../lib/store.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { STRINGS, fill } from './strings.js';

export const renderSaveButton = (slug) =>
  `<button type="button" class="save-button" data-save="${esc(slug)}" aria-pressed="false">${STRINGS.saint.save}</button>`;

/* One shape, drawn twice: a wide gesso halo under an ink outline, so the mark
   keeps an edge on gold ground and dark ground alike (an icon is both). The
   saved state fills the upper path; base.css holds the two rules. */
const SHAPE = 'M4 2h12v19.5l-6-4.2-6 4.2z';
const BOOKMARK =
  `<svg class="bookmark-mark" viewBox="0 0 20 24" width="20" height="24" aria-hidden="true" focusable="false">` +
  `<path class="bm-halo" d="${SHAPE}"/><path class="bm-shape" d="${SHAPE}"/></svg>`;

/**
 * The bookmark carries the saint's name in its accessible name: on the Index
 * there are many on one page, and a column of identical "Save" buttons is
 * what a screen reader would otherwise be given.
 */
export const renderBookmark = (slug, name) =>
  `<button type="button" class="bookmark icon-button" data-save="${esc(slug)}" data-name="${esc(name)}" ` +
  `aria-pressed="false" aria-label="${esc(fill(STRINGS.saint.saveNamed, { name }))}">${BOOKMARK}</button>`;

/** Paints every Save control under `root` from the store. Safe to call often. */
export async function paintSaved(root) {
  const buttons = [...root.querySelectorAll('[data-save]')];
  if (!buttons.length) return;
  const saved = new Set(await store.listSaved());
  for (const button of buttons) {
    if (!button.isConnected) continue;
    const on = saved.has(button.dataset.save);
    button.setAttribute('aria-pressed', String(on));
    button.classList.toggle('is-saved', on);
    if (button.classList.contains('bookmark')) {
      const name = button.dataset.name ?? '';
      button.setAttribute(
        'aria-label',
        fill(on ? STRINGS.saint.savedNamed : STRINGS.saint.saveNamed, { name }),
      );
    } else {
      button.textContent = on ? STRINGS.saint.saved : STRINGS.saint.save;
    }
  }
}

/**
 * Wires every Save control inside `root`, including ones mounted later: the
 * click is delegated and every repaint re-queries. Returns a teardown.
 */
export function wireSaveButtons(root) {
  const onClick = (e) => {
    const button = e.target.closest('[data-save]');
    if (button && root.contains(button)) store.toggleSaved(button.dataset.save);
  };
  root.addEventListener('click', onClick);
  const unsubscribe = store.subscribe((what) => {
    if (what === 'saved') paintSaved(root);
  });
  paintSaved(root);

  return () => {
    root.removeEventListener('click', onClick);
    unsubscribe();
  };
}
