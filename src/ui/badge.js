/**
 * The veneration badge (DESIGN.md §7) — the signature element, and the only
 * place gold appears in the product.
 *
 * A square-cell lattice, one cell per enabled communion, generated from the
 * registry: exactly as many cells as communions currently enabled, reserved
 * cells hidden rather than drawn empty, and a partial row keeps its cells on
 * lattice positions, left-aligned. Position encodes identity — a communion's
 * cell never moves between saints — and colour never carries information
 * alone: the three states differ by shape (filled block / hollow outline /
 * faint centred dot), which survives greyscale and worse.
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

/**
 * Rolls per-church attestations up to communion level. A communion is
 * attested if any church in it is attested; refused if none is attested and
 * at least one is positively refused; undocumented otherwise. (Churches the
 * manifest omits are undocumented by construction — only findings travel.)
 */
export function rollup(attestations = []) {
  const byChurch = new Map(attestations.map((a) => [a.church, a.status]));
  return enabledCommunions().map((communion) => {
    const churches = churchesInCommunion(communion.id);
    const statuses = churches.map((c) => byChurch.get(c.id));
    const attested = statuses.filter((s) => s === 'venerated').length;
    const refused = statuses.filter((s) => s === 'not-venerated').length;
    const state = attested > 0 ? 'attested' : refused > 0 ? 'refused' : 'undocumented';
    return { communion, state, attested, refused, total: churches.length };
  });
}

/** The text equivalent every badge carries. */
export function badgeLabel(cells) {
  const name = (c) => c.communion.display_name;
  const attested = cells.filter((c) => c.state === 'attested');
  const refused = cells.filter((c) => c.state === 'refused');
  const undocumented = cells.filter((c) => c.state === 'undocumented');

  const parts = [];
  parts.push(
    attested.length
      ? fill(STRINGS.badge.venerated, {
          n: attested.length,
          total: cells.length,
          names: attested.map(name).join(', '),
        })
      : fill(STRINGS.badge.veneratedNone, { total: cells.length }),
  );
  if (refused.length) {
    parts.push(fill(STRINGS.badge.refused, { names: refused.map(name).join(', ') }));
  }
  if (undocumented.length) {
    parts.push(fill(STRINGS.badge.undocumented, { n: undocumented.length }));
  }
  return parts.join(' ');
}

const cellTitle = (c) =>
  `${c.communion.display_name}: ${STRINGS.badge.state[c.state]}`;

/**
 * The full lattice, for cards, the hero and detail pages. `cell` is the cell
 * size in px; `cols` caps the row length (default: one row). Geometry per
 * DESIGN.md §7: 10% inter-cell inset, hollow stroke 12% of cell, dot diameter
 * 22% of cell.
 */
export function renderBadge(attestations, { cell = 14, cols = Infinity } = {}) {
  const cells = rollup(attestations);
  const gap = cell * 0.1;
  const pitch = cell + gap;
  const perRow = Math.min(cells.length, cols === Infinity ? cells.length : cols);
  const rows = Math.ceil(cells.length / perRow);
  const width = perRow * pitch - gap;
  const height = rows * pitch - gap;
  const sw = cell * 0.12;
  const shapes = cells
    .map((c, i) => {
      const x = (i % perRow) * pitch;
      const y = Math.floor(i / perRow) * pitch;
      const title = `<title>${cellTitle(c)}</title>`;
      if (c.state === 'attested') {
        return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="var(--gold)">${title}</rect>`;
      }
      if (c.state === 'refused') {
        const o = sw / 2;
        return `<rect x="${x + o}" y="${y + o}" width="${cell - sw}" height="${cell - sw}" fill="none" stroke="var(--ink-soft)" stroke-width="${sw}">${title}</rect>`;
      }
      return `<circle cx="${x + cell / 2}" cy="${y + cell / 2}" r="${cell * 0.11}" fill="var(--badge-undocumented)">${title}</circle>`;
    })
    .join('');

  return `<svg class="badge" role="img" aria-label="${badgeLabel(cells)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" focusable="false">${shapes}</svg>`;
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
          ? `<rect x="${x}" y="${height - fillH}" width="${w}" height="${fillH}" fill="var(--gold)"/>`
          : '') +
        `</g>`
      );
    })
    .join('');
  const width = cells.length * pitch - gap;
  return `<svg class="badge badge-vessels" role="img" aria-label="${badgeLabel(cells)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" focusable="false">${shapes}</svg>`;
}
