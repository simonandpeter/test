/**
 * The Save control, in one place because it appears in two (the calendar's
 * hero and the saint's own page) and the two must never disagree: saving from
 * the hero and then opening the saint has to show a saved button, without a
 * reload. That is what subscribing to the store buys, and it is the reason
 * this is a component rather than two handlers.
 *
 * A toggle, not a dialogue: `aria-pressed` carries the state, the label says
 * which state it is in, and nothing about it is red or gold — Save is chrome,
 * and chrome stays quiet (DESIGN.md §2).
 */

import * as store from '../lib/store.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { STRINGS } from './strings.js';

export const renderSaveButton = (slug) =>
  `<button type="button" class="save-button" data-save="${esc(slug)}" aria-pressed="false">${STRINGS.saint.save}</button>`;

/** Wires every Save button inside `root`. Returns a teardown. */
export function wireSaveButtons(root) {
  const buttons = [...root.querySelectorAll('[data-save]')];
  if (!buttons.length) return () => {};

  const paint = async () => {
    for (const button of buttons) {
      const saved = await store.isSaved(button.dataset.save);
      if (!button.isConnected) continue;
      button.setAttribute('aria-pressed', String(saved));
      button.textContent = saved ? STRINGS.saint.saved : STRINGS.saint.save;
      button.classList.toggle('is-saved', saved);
    }
  };

  const onClick = (e) => {
    const button = e.target.closest('[data-save]');
    if (button) store.toggleSaved(button.dataset.save);
  };

  root.addEventListener('click', onClick);
  const unsubscribe = store.subscribe((what) => {
    if (what === 'saved') paint();
  });
  paint();

  return () => {
    root.removeEventListener('click', onClick);
    unsubscribe();
  };
}
