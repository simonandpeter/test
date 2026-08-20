import { STRINGS, fill } from '../ui/strings.js';

export const title = STRINGS.saints.title;

export function render(el, { data }) {
  el.innerHTML = `
    <h1>${STRINGS.saints.title}</h1>
    <p>${fill(STRINGS.saints.placeholder, { count: data.saints.length })}</p>
  `;
}
