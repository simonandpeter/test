import { STRINGS } from '../ui/strings.js';

export const title = STRINGS.about.title;

export function render(el) {
  el.innerHTML = `
    <h1>${STRINGS.about.title}</h1>
    <p>${STRINGS.site.tagline}</p>
    <p>${STRINGS.about.placeholder}</p>
  `;
}
