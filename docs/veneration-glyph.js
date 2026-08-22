/**
 * veneration-glyph.js
 *
 * Reference implementation of the veneration mark described in
 * saints-build-plan.md §9. Two views over the same attestation data:
 *
 *   renderBadge()  — §9.1, Phase 1. One cell per communion. Ships first.
 *   renderDetail() — §9.2, Phase 3+. One cell per rite × communion.
 *                    Deferred; do not build before the badge is live.
 *   mountMorph()   — the Phase 3+ interaction that opens a badge into
 *                    its detail view in place. Optional polish on top
 *                    of renderDetail(); never required for Phase 1.
 *
 * COLOUR CONTRACT — READ BEFORE WIRING TO THE SITE THEME
 * ────────────────────────────────────────────────────────
 * This file contains no colour values. Every fill is a CSS custom
 * property, read at render time from whatever scope the SVG is
 * mounted into. The site defines these once, in its theme stylesheet,
 * and every glyph on the site — badge or detail, light or dark mode —
 * follows automatically:
 *
 *   --glyph-attested        required. Fill for a venerated cell.
 *   --glyph-ink              required. Base colour for refused and
 *                             undocumented cells (usually the body
 *                             text colour — refusal and silence are
 *                             both "no accent colour", distinguished
 *                             from each other by opacity, see below).
 *   --glyph-refused-opacity  optional. Default 0.11 if unset.
 *   --glyph-undoc-opacity    optional. Default 0.18 if unset.
 *
 * Do not hardcode a hex value anywhere in this file or in the CSS
 * that accompanies it. If the site later changes its accent colour,
 * or ships a dark theme, the glyph must not need a code change —
 * only a custom-property change.
 *
 * Refusal and attestation are distinguished by VALUE, not only by
 * colour, and undocumented cells are distinguished by SIZE as well
 * as by opacity — this is deliberate (see build plan §2, §9.1) and
 * must survive a greyscale render and a colour-blind simulation.
 * Do not "fix" this by making refused cells a second accent colour.
 */

/* ── geometry constants — layout, not theme; not CSS variables ──── */
const PITCH = 16;          // px per grid cell at 1x

/* CELLS ARE CIRCLES, NOT SQUARES. This was tried both ways during
 * design (see the design thread's dots-vs-mass-squares comparison)
 * and circles is the shape that shipped. Do not substitute rects,
 * rounded rects, or any other shape — if a value below seems like
 * it should be a square's side length, it isn't; it's a radius. */
const RADIUS       = 0.31 * PITCH;   // attested / refused circle radius
const UNDOC_RADIUS  = 0.11 * PITCH;   // undocumented mark's radius —
                                       // deliberately much smaller,
                                       // not just lower-opacity

const V = 'venerated', N = 'not-venerated', U = 'undocumented';

/* ── the fixed communion axis, in badge column order ─────────────
   `optional: true` means: only render this column if the church
   registry has an enabled church with this communion. Currently
   only the Assyrian Church of the East is optional. Do not hardcode
   "4 columns" anywhere that consumes this — read its length.      */
export const COMMUNIONS = [
  { id: 'catholic',            label: 'Catholic' },
  { id: 'eastern-orthodox',    label: 'Eastern Orthodox' },
  { id: 'oriental-orthodox',   label: 'Oriental Orthodox' },
  { id: 'church-of-the-east',  label: 'Church of the East', optional: true },
];

/* the fixed rite axis, in detail-view column order. Latin is always
   column 0; the rest follow west-to-east liturgical family.       */
export const RITES = [
  { id: 'latin',        label: 'Latin' },
  { id: 'byzantine',    label: 'Byzantine' },
  { id: 'alexandrian',  label: 'Alexandrian' },
  { id: 'geez',         label: "Ge'ez" },
  { id: 'armenian',     label: 'Armenian' },
  { id: 'west-syriac',  label: 'West Syriac' },
  { id: 'east-syriac',  label: 'East Syriac' },
];

/**
 * Roll-up rule (build plan §9.1): a communion cell in the badge
 * represents every enabled church in that communion. It is
 * attested if ANY of them is attested; refused only if none is
 * attested but at least one is refused; otherwise undocumented.
 * This function is the single source of truth for that rule — do
 * not reimplement it inline anywhere else.
 */
export function rollup(states) {
  if (states.includes(V)) return V;
  if (states.includes(N)) return N;
  return U;
}

/* ── SVG primitive — CIRCLE, every colour reference a CSS var lookup.
 * cx/cy are the cell's centre point, not a corner — callers pass
 * PITCH/2-offset coordinates, same as any other centred circle. */
function cellCircle(cx, cy, state) {
  if (state === V)
    return `<circle cx="${cx}" cy="${cy}" r="${RADIUS}" fill="var(--glyph-attested)"/>`;
  if (state === N)
    return `<circle cx="${cx}" cy="${cy}" r="${RADIUS}" `
         + `fill="var(--glyph-ink)" fill-opacity="var(--glyph-refused-opacity, 0.11)"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="${UNDOC_RADIUS}" `
       + `fill="var(--glyph-ink)" fill-opacity="var(--glyph-undoc-opacity, 0.18)"/>`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Screen-reader text for a set of {name, state} cells. Shared by
 * both views so the phrasing is consistent site-wide.
 */
export function altText(cells) {
  const total = cells.length;
  const attested = cells.filter(c => c.state === V);
  const refused  = cells.filter(c => c.state === N).length;
  const undoc    = cells.filter(c => c.state === U).length;
  let text = attested.length
    ? `Venerated in ${attested.length} of ${total}: ${attested.map(c => c.name).join(', ')}.`
    : `No attested veneration recorded in any of the ${total}.`;
  if (refused) text += ` Not venerated in ${refused}.`;
  if (undoc)   text += ` ${undoc} undocumented.`;
  return text;
}

/**
 * renderBadge — §9.1. One cell per communion.
 *
 * @param churches  full church registry: [{id, communion, rite, enabled}]
 * @param attestation  this saint's data: { [churchId]: 'venerated'|'not-venerated'|'undocumented' }
 * @param sizePx  rendered height in px (width follows from column count)
 * @returns {markup, altText}
 */
export function renderBadge(churches, attestation, sizePx = 32) {
  const communions = COMMUNIONS.filter(c =>
    !c.optional || churches.some(ch => ch.communion === c.id && ch.enabled !== false)
  );

  const cells = communions.map(com => {
    const inCommunion = churches.filter(ch => ch.communion === com.id && ch.enabled !== false);
    const state = rollup(inCommunion.map(ch => attestation[ch.id] || U));
    return { ...com, state };
  });

  const w = communions.length * PITCH;
  const h = PITCH;
  const circles = cells
    .map((c, i) => cellCircle(i * PITCH + PITCH / 2, PITCH / 2, c.state))
    .join('');

  const alt = altText(cells.map(c => ({ name: c.label, state: c.state })));
  const markup = `<svg width="${Math.round(sizePx * w / h)}" height="${sizePx}" `
    + `viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(alt)}">${circles}</svg>`;

  return { markup, altText: alt };
}

/**
 * renderDetail — §9.2. One cell per rite × communion. Phase 3+, do
 * not build before the badge (renderBadge) is live and stable.
 *
 * @param churches  full church registry, each with {id, communion, rite}
 * @param attestation  this saint's data, keyed by church id
 * @param sizePx  rendered height in px
 */
export function renderDetail(churches, attestation, sizePx = 64) {
  const communions = COMMUNIONS.filter(c =>
    !c.optional || churches.some(ch => ch.communion === c.id && ch.enabled !== false)
  );
  const rites = RITES.filter(r =>
    churches.some(ch => ch.rite === r.id && ch.enabled !== false)
  );

  const cells = [];
  churches.forEach(ch => {
    if (ch.enabled === false) return;
    const col = rites.findIndex(r => r.id === ch.rite);
    const row = communions.findIndex(c => c.id === ch.communion);
    if (col === -1 || row === -1) return;             // rite/communion not in current axes
    cells.push({
      col, row, name: ch.display_name,
      state: attestation[ch.id] || U,
    });
  });

  const w = rites.length * PITCH;
  const h = communions.length * PITCH;
  const circles = cells
    .map(c => cellCircle(c.col * PITCH + PITCH / 2, c.row * PITCH + PITCH / 2, c.state))
    .join('');

  const alt = altText(cells);
  const markup = `<svg width="${Math.round(sizePx * w / h)}" height="${sizePx}" `
    + `viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(alt)}">${circles}</svg>`;

  return { markup, altText: alt, cells, rites, communions };
}

/**
 * mountMorph — optional Phase 3+ interaction. Mounts a badge that
 * expands into the full detail view on click/Enter, animating each
 * circle from its collapsed (communion) position to its expanded
 * (rite × communion) position. Circles belonging to a communion with
 * only one church (Eastern Orthodox, Church of the East today) do
 * not move — they are revealed in place as the frame widens. Circles
 * belonging to a communion with several churches (Catholic, Oriental
 * Orthodox) fan out from the collapsed cell's position.
 *
 * This is pure layout + CSS-transition choreography; it introduces
 * no new colours; it reads the same custom properties as the two
 * render functions above.
 *
 * @param el  container element
 * @param churches, attestation  same shape as renderDetail()
 */
export function mountMorph(el, churches, attestation) {
  const communions = COMMUNIONS.filter(c =>
    !c.optional || churches.some(ch => ch.communion === c.id && ch.enabled !== false)
  );
  const rites = RITES.filter(r =>
    churches.some(ch => ch.rite === r.id && ch.enabled !== false)
  );
  const maxCommunionSize = Math.max(
    ...communions.map(com => churches.filter(ch => ch.communion === com.id && ch.enabled !== false).length)
  );

  // collapsed position: churches within a communion pack toward
  // column 0 of a `maxCommunionSize`-wide field, one row per
  // communion — a square (or near-square) field, matching the
  // badge's aspect. All churches in a communion collapse onto the
  // SAME point (their communion's rolled-up cell) except the first,
  // which anchors it and remains visible at full size when collapsed.
  const collapsedW = maxCommunionSize * PITCH;
  const collapsedH = communions.length * PITCH;
  const expandedW  = rites.length * PITCH;
  const expandedH  = communions.length * PITCH;

  const cells = [];
  churches.forEach(ch => {
    if (ch.enabled === false) return;
    const row = communions.findIndex(c => c.id === ch.communion);
    const col = rites.findIndex(r => r.id === ch.rite);
    if (row === -1 || col === -1) return;
    const siblings = churches.filter(s => s.communion === ch.communion && s.enabled !== false);
    const anchor = siblings[0] === ch;                 // first church in the row is the anchor
    const collapsedState = anchor
      ? rollup(siblings.map(s => attestation[s.id] || U))   // §9.1 roll-up rule
      : (attestation[ch.id] || U);
    cells.push({
      id: ch.id, name: ch.display_name, row, anchor,
      state: attestation[ch.id] || U,        // true state, used once expanded
      collapsedState,                        // rolled-up state, used while collapsed
      collapsed: { col: 0, row },                       // all siblings stack on the anchor's column
      expanded:  { col, row },
    });
  });

  el.innerHTML = `<div class="glyph-frame" style="height:${collapsedH}px;width:${collapsedW}px;overflow:hidden">
    <svg viewBox="0 0 ${expandedW} ${expandedH}" style="width:${expandedW}px;height:${expandedH}px" aria-hidden="true">
      ${cells.map(c => {
        const p = c.collapsed;
        const visible = c.anchor;
        const s = c.anchor ? c.collapsedState : c.state;
        const r = visible ? (s === U ? UNDOC_RADIUS : RADIUS) : 0;
        return `<circle data-id="${c.id}"
          cx="${p.col * PITCH + PITCH / 2}" cy="${p.row * PITCH + PITCH / 2}" r="${r}"
          fill="${s === V ? 'var(--glyph-attested)' : 'var(--glyph-ink)'}"
          fill-opacity="${s === V ? 1 : s === N ? 'var(--glyph-refused-opacity, 0.11)' : (visible ? 'var(--glyph-undoc-opacity, 0.18)' : 0)}"
          style="transition:cx .62s cubic-bezier(.22,.61,.36,1),cy .62s cubic-bezier(.22,.61,.36,1),
                 r .5s cubic-bezier(.22,.61,.36,1),fill .45s ease,fill-opacity .5s ease"/>`;
      }).join('')}
    </svg>
  </div>`;

  const frame = el.querySelector('.glyph-frame');
  let expanded = false;

  el.addEventListener('click', () => {
    expanded = !expanded;
    frame.style.width = (expanded ? expandedW : collapsedW) + 'px';
    frame.style.height = (expanded ? expandedH : collapsedH) + 'px';
    cells.forEach(c => {
      const circle = frame.querySelector(`circle[data-id="${CSS.escape(c.id)}"]`);
      const p = expanded ? c.expanded : c.collapsed;
      const visible = expanded || c.anchor;
      const s = expanded ? c.state : (c.anchor ? c.collapsedState : c.state);
      circle.setAttribute('cx', p.col * PITCH + PITCH / 2);
      circle.setAttribute('cy', p.row * PITCH + PITCH / 2);
      circle.setAttribute('r', visible ? (s === U ? UNDOC_RADIUS : RADIUS) : 0);
      circle.setAttribute('fill', s === V ? 'var(--glyph-attested)' : 'var(--glyph-ink)');
      const opacity = s === V ? 1
        : s === N ? 'var(--glyph-refused-opacity, 0.11)'
        : (visible ? 'var(--glyph-undoc-opacity, 0.18)' : 0);
      circle.setAttribute('fill-opacity', opacity);
    });
  });

  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
  });
}
