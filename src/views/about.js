import { STRINGS } from '../ui/strings.js';

export const title = () => STRINGS.about.title;

const P = STRINGS.about.privacy;

const list = (items) => `<ul class="plain-list">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;

/**
 * The editorial page. Until 2026-08-22 it also explained the veneration mark,
 * with every circle drawn by the glyph's own component; the mark is removed
 * from this project (DESIGN.md §2, §7) and the section went with it. What is
 * left of the editorial policy is the placeholder Session 9 replaces.
 *
 * The privacy statement below is not a placeholder (author, 2026-08-24). It is
 * short because the truth is short: the site keeps four things, all of them on
 * the reader's own device, and does nothing else. It sits under an <h2> with
 * an id so it can be linked to directly.
 */
export function render(el) {
  el.innerHTML = `
    <h1>${STRINGS.about.title}</h1>
    <p>${STRINGS.site.tagline}</p>
    <p>${STRINGS.about.placeholder}</p>

    <section class="privacy" aria-labelledby="privacy">
      <h2 id="privacy">${P.heading}</h2>
      <p>${P.lede}</p>

      <h3>${P.keepsHeading}</h3>
      ${list(P.keeps)}

      <h3>${P.notHeading}</h3>
      ${list(P.not)}

      <p>${P.clearing}</p>
      <p class="utility">${P.hosting}</p>
    </section>
  `;
}
