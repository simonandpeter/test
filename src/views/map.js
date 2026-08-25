import { chosenChurch, churchName, keptBy } from '../lib/church.js';
import { STRINGS, fill } from '../ui/strings.js';

export const title = () => STRINGS.map.title;

/**
 * A placeholder until Session 7, but one that already reads the reader's
 * church (author, 2026-08-22): the globe will plot what the Index lists, and
 * the count here says so now.
 */
export function render(el, { data }) {
  // `chosenChurch`, not `currentChurch` (2026-08-26): a *guess* from the
  // browser's language must not set part of the corpus aside here. lib/church.js
  // argues the split; the Daily page is the one page that cannot open without a
  // calendar, and it is the one page that reads the guess.
  const church = chosenChurch();
  const mine = data.saints.filter((s) => keptBy(s, church));
  const located = mine.filter((s) => s.locations.length > 0).length;
  const setAside = data.saints.length - mine.length;
  el.innerHTML = `
    <h1>${STRINGS.map.title}</h1>
    <p>${fill(STRINGS.map.placeholder, { located, count: mine.length })}${
      setAside ? ` ${fill(STRINGS.map.setAside, { count: setAside, church: churchName(church) })}` : ''
    }</p>
  `;
}
