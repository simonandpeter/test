import { currentSelection, venerates } from '../lib/tradition.js';
import { STRINGS, fill } from '../ui/strings.js';

export const title = STRINGS.map.title;

/**
 * A placeholder until Session 7, but one that already reads the reader's
 * traditions (author, 2026-08-22): the globe will plot what the Index lists,
 * and the count here says so now.
 */
export function render(el, { data }) {
  const selection = currentSelection();
  const mine = data.saints.filter((s) => venerates(s, selection));
  const located = mine.filter((s) => s.locations.length > 0).length;
  const setAside = data.saints.length - mine.length;
  el.innerHTML = `
    <h1>${STRINGS.map.title}</h1>
    <p>${fill(STRINGS.map.placeholder, { located, count: mine.length })}${
      setAside ? ` ${fill(STRINGS.map.setAside, { count: setAside })}` : ''
    }</p>
  `;
}
