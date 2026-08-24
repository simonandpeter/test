import { STRINGS } from '../ui/strings.js';

export const title = () => STRINGS.about.title;

const P = STRINGS.about.privacy;

/*
 * Contact goes to the repository's issue tracker (author, 2026-08-25), which
 * is the "built-in affordance" that keeps a reader's message in the project
 * rather than in anyone's inbox: no address is printed, no form is posted
 * anywhere, and a static site needs no server to receive it. The label is
 * prefilled so an issue arrives already sorted.
 */
const ISSUES = 'https://github.com/simonandpeter/test/issues/new?labels=contact';

const C = STRINGS.contact;

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

    <section class="contact" aria-labelledby="contact">
      <h2 id="contact">${C.heading}</h2>
      <p>${C.lede}</p>
      <p><a href="${ISSUES}" rel="noopener noreferrer">${C.open}</a></p>
      <p class="utility">${C.note}</p>
    </section>
  `;
}
