import { STRINGS } from '../ui/strings.js';

export const title = STRINGS.about.title;

/**
 * The editorial page. Until 2026-08-22 it also explained the veneration mark,
 * with every circle drawn by the glyph's own component; the mark is removed
 * from this project (DESIGN.md §2, §7) and the section went with it. What is
 * left is the placeholder Session 9 replaces with the policy itself.
 */
export function render(el) {
  el.innerHTML = `
    <h1>${STRINGS.about.title}</h1>
    <p>${STRINGS.site.tagline}</p>
    <p>${STRINGS.about.placeholder}</p>
  `;
}
