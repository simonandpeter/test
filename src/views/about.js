import { STRINGS } from '../ui/strings.js';
import { cellMark, renderBadge } from '../ui/badge.js';
import { renderMatrix } from '../ui/matrix.js';

export const title = STRINGS.about.title;

const G = STRINGS.about.glyph;

/**
 * One circle at legend size, drawn by the same `cellMark` the glyph uses. A
 * hand-drawn swatch would be a fourth place the mark is defined and the first
 * one to go stale; this cannot disagree with what is on the rest of the site.
 */
function swatch(state) {
  const pitch = 22;
  return (
    `<svg class="badge" role="img" aria-label="${STRINGS.badge.state[state]}" ` +
    `viewBox="0 0 ${pitch} ${pitch}" width="${pitch}" height="${pitch}" focusable="false">` +
    `${cellMark({ state, cx: pitch / 2, cy: pitch / 2, pitch })}</svg>`
  );
}

const legendRow = (state, text) =>
  `<li>${swatch(state)}<span>${text}</span></li>`;

/**
 * The worked example is a real saint, not a fabricated one — the split it
 * shows is the reason the grid exists. If the corpus ever loses him the
 * paragraph goes rather than being propped up with invented attestations.
 */
function worked(data) {
  const nestorius = data?.bySlug?.get('nestorius');
  if (!nestorius) return '';
  return `
    <figure class="glyph-example">
      <div class="glyph-example-marks">
        ${renderBadge(nestorius.attestations, { pitch: 22 })}
        ${renderMatrix(nestorius.attestations, { pitch: 22 })}
      </div>
      <figcaption>${G.worked}</figcaption>
    </figure>`;
}

export function render(el, { data } = {}) {
  el.innerHTML = `
    <h1>${STRINGS.about.title}</h1>
    <p>${STRINGS.site.tagline}</p>
    <p>${STRINGS.about.placeholder}</p>

    <h2>${G.heading}</h2>
    <p>${G.lede}</p>

    <p>${G.states}</p>
    <ul class="glyph-legend">
      ${legendRow('attested', G.attested)}
      ${legendRow('refused', G.refused)}
      ${legendRow('undocumented', G.undocumented)}
    </ul>

    <h3>${G.twoViews}</h3>
    <p>${G.badge}</p>
    <p>${G.matrix}</p>
    <p>${G.decomposition}</p>
    ${worked(data)}
    <p>${G.coarse}</p>
    <p class="utility glyph-hover-note">${G.hover}</p>
  `;
}
