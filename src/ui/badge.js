/**
 * The veneration badge (DESIGN.md §7) — the signature element, and the only
 * place gold appears in the product.
 *
 * A square-cell lattice, one cell per enabled communion, generated from the
 * registry: exactly as many cells as communions currently enabled, reserved
 * cells hidden rather than drawn empty, and a partial row keeps its cells on
 * lattice positions, left-aligned. Position encodes identity — a communion's
 * cell never moves between saints — and colour never carries information
 * alone.
 *
 * The three states, per the author's veneration-glyph spec (2026-08-21, which
 * supersedes Addendum A1's hollow refusal cell — see DESIGN.md §7):
 *
 *   attested      full cell, --glyph-attested
 *   refused       full cell, --glyph-ink at --glyph-refused-opacity
 *   undocumented  a centred square at UNDOC_FRACTION of the cell,
 *                 --glyph-ink at --glyph-undoc-opacity
 *
 * Refusal and attestation are distinguished by *value*, undocumented by
 * *size* as well as value. That is what makes the three survive a greyscale
 * render, and it is the one thing here that must never be simplified: a
 * refusal is a finding, an absence is not, and a reader has to be able to see
 * which is which without trusting a hue.
 *
 * No colour literal appears in this file. Every fill is a custom property read
 * at render time, so a repalette or a dark theme is a token change and never a
 * code change.
 *
 * The artwork lives here and only here; the cell→communion mapping comes from
 * churches.js. Swapping squares for tesserae later is a change to this file
 * and no data moves.
 *
 * Pure string-returning functions, so the whole component is unit-testable in
 * Node and renderable anywhere innerHTML works.
 */

import { enabledCommunions, churchesInCommunion } from '../data/churches.js';
import { STRINGS, fill } from './strings.js';

/* Geometry — layout, not theme, so these are constants rather than tokens.
   The gap is the "fine" setting settled during design: a shade over an eighth
   of the pitch, enough that adjacent cells never fuse into a shape that
   depends on registry adjacency rather than on meaning. */
export const GAP_RATIO = 0.9 / 8;
/** The undocumented mark, as a fraction of a full cell. */
export const UNDOC_FRACTION = 0.275;

/**
 * One cell of the lattice, drawn. The rite x communion matrix (matrix.js) is a
 * second reader of this: two renderers, one set of marks, so a change to what
 * a refusal looks like cannot land on one of them and not the other.
 *
 * `title` is the cell's own text equivalent and is inserted unescaped — every
 * caller builds it from the registry, not from saint data.
 */
export function cellMark({ state, x, y, cell, title }) {
  const round = (n) => Math.round(n * 1000) / 1000;
  const t = title ? `<title>${title}</title>` : '';
  const rect = (px, py, size, fillAttrs) =>
    `<rect data-state="${state}" x="${round(px)}" y="${round(py)}" ` +
    `width="${round(size)}" height="${round(size)}" ${fillAttrs}>${t}</rect>`;

  if (state === 'attested') return rect(x, y, cell, 'fill="var(--glyph-attested)"');
  if (state === 'refused') {
    // Same footprint as an attestation: a refusal is a finding, not an
    // absence, and it is told apart by value rather than by shape.
    return rect(x, y, cell, 'fill="var(--glyph-ink)" fill-opacity="var(--glyph-refused-opacity, 0.11)"');
  }
  const d = cell * UNDOC_FRACTION;
  const inset = (cell - d) / 2;
  return rect(x + inset, y + inset, d, 'fill="var(--glyph-ink)" fill-opacity="var(--glyph-undoc-opacity, 0.18)"');
}

/**
 * Rolls per-church attestations up to communion level. A communion is
 * attested if any church in it is attested; refused if none is attested and
 * at least one is positively refused; undocumented otherwise. (Churches the
 * manifest omits are undocumented by construction — only findings travel.)
 */
export function rollupStates(statuses) {
  if (statuses.includes('venerated')) return 'attested';
  if (statuses.includes('not-venerated')) return 'refused';
  return 'undocumented';
}

export function rollup(attestations = []) {
  const byChurch = new Map(attestations.map((a) => [a.church, a.status]));
  return enabledCommunions().map((communion) => {
    const churches = churchesInCommunion(communion.id);
    const statuses = churches.map((c) => byChurch.get(c.id));
    return {
      communion,
      label: communion.display_name,
      state: rollupStates(statuses),
      attested: statuses.filter((s) => s === 'venerated').length,
      refused: statuses.filter((s) => s === 'not-venerated').length,
      total: churches.length,
    };
  });
}

/**
 * The text equivalent every glyph carries — badge and matrix both, per the
 * author's spec §5: one generator, one phrasing, or a reader using the two
 * views gets told the same finding in two voices.
 *
 * Cells carry their own `label`, so the badge names communions and the matrix
 * names churches without this function knowing which axis it is describing.
 * `unit` is the only thing that varies: four communions can be counted by
 * name, thirteen rite cells are counted bare, exactly as the spec's example
 * does. Names are deduplicated because one church can hold several cells of
 * the matrix — Eastern Catholic holds six — and saying it six times in a row
 * is noise, not detail.
 */
export function badgeLabel(cells, unit = STRINGS.badge.unit.communions) {
  const names = (list) => [...new Set(list.map((c) => c.label))].join(', ');
  const attested = cells.filter((c) => c.state === 'attested');
  const refused = cells.filter((c) => c.state === 'refused');
  const undocumented = cells.filter((c) => c.state === 'undocumented');

  const parts = [];
  parts.push(
    attested.length
      ? fill(STRINGS.badge.venerated, {
          n: attested.length,
          total: cells.length,
          unit,
          names: names(attested),
        })
      : fill(STRINGS.badge.veneratedNone, { total: cells.length, unit }),
  );
  if (refused.length) {
    parts.push(fill(STRINGS.badge.refused, { names: names(refused) }));
  }
  if (undocumented.length) {
    parts.push(fill(STRINGS.badge.undocumented, { n: undocumented.length }));
  }
  return parts.join(' ');
}

const cellTitle = (c) => `${c.label}: ${STRINGS.badge.state[c.state]}`;

/**
 * The full lattice, for cards, the hero and detail pages. `cell` is the cell
 * size in px; `cols` caps the row length (default: one row). Geometry per
 * DESIGN.md §7: 10% inter-cell inset, hollow stroke 12% of cell, dot diameter
 * 22% of cell.
 */
export function renderBadge(attestations, { cell = 14, cols = Infinity } = {}) {
  const cells = rollup(attestations);
  const gap = cell * GAP_RATIO;
  const pitch = cell + gap;
  const perRow = Math.min(cells.length, cols === Infinity ? cells.length : cols);
  const rows = Math.ceil(cells.length / perRow);
  const width = perRow * pitch - gap;
  const height = rows * pitch - gap;
  const round = (n) => Math.round(n * 1000) / 1000;

  const shapes = cells
    .map((c, i) =>
      cellMark({
        state: c.state,
        x: (i % perRow) * pitch,
        y: Math.floor(i / perRow) * pitch,
        cell,
        title: cellTitle(c),
      }),
    )
    .join('');

  return `<svg class="badge" role="img" aria-label="${badgeLabel(cells)}" viewBox="0 0 ${round(width)} ${round(height)}" width="${round(width)}" height="${round(height)}" focusable="false">${shapes}</svg>`;
}

/**
 * The family-level fallback for dense rows and (later) map points, where the
 * lattice would turn to mush below ~20 px: one vessel per communion, filled
 * from the bottom by the proportion of that communion's churches attested.
 */
export function renderVessels(attestations, { height = 12 } = {}) {
  const cells = rollup(attestations);
  const w = height * 0.62;
  const gap = w * 0.45;
  const pitch = w + gap;
  const shapes = cells
    .map((c, i) => {
      const x = i * pitch;
      const level = c.attested / c.total;
      const fillH = Math.round(height * level * 100) / 100;
      const title = `<title>${cellTitle(c)}</title>`;
      return (
        `<g>${title}` +
        `<rect x="${x + 0.5}" y="0.5" width="${w - 1}" height="${height - 1}" fill="none" stroke="var(--rule)" stroke-width="1"/>` +
        (level > 0
          ? `<rect x="${x}" y="${height - fillH}" width="${w}" height="${fillH}" fill="var(--glyph-attested)"/>`
          : '') +
        `</g>`
      );
    })
    .join('');
  const width = cells.length * pitch - gap;
  return `<svg class="badge badge-vessels" role="img" aria-label="${badgeLabel(cells)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" focusable="false">${shapes}</svg>`;
}
