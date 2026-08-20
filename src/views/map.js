import { STRINGS, fill } from '../ui/strings.js';

export const title = STRINGS.map.title;

export function render(el, { data }) {
  const located = data.saints.filter((s) => s.locations.length > 0).length;
  el.innerHTML = `
    <h1>${STRINGS.map.title}</h1>
    <p>${fill(STRINGS.map.placeholder, { located, count: data.saints.length })}</p>
  `;
}
