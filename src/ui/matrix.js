/**
 * The rite × communion matrix (brief §9.2, the author's veneration-glyph spec
 * §1) — `renderDetail` in the reference implementation.
 *
 * The badge (badge.js) answers "which communions", in one row of four cells.
 * This answers "which church, in which rite", in a 7 × 4 lattice holding 13
 * occupied cells. It is a **decomposition of the badge, never a second
 * dataset**: roll a row of this up by the badge's own rule and you get that
 * communion's badge cell, for every possible input. `decomposesToBadge()`
 * below states that as a checkable property and a unit test asserts it across
 * the corpus, because the two views sitting side by side and disagreeing about
 * one saint would discredit both.
 *
 * Nothing here draws. Marks come from `cellMark` in badge.js and the state rule
 * from `rollupStates`, so a change to what a refusal looks like, or to what
 * counts as one, cannot land on one renderer and miss the other. No colour
 * literal appears in this file for the same reason it does not appear in that
 * one.
 *
 * A position with no church in it renders nothing at all — not an empty cell,
 * not a faint one. Fifteen of the 28 positions are unoccupied: there is no
 * Ge'ez-rite Church of the East, and drawing a mark there would invent a body
 * that does not exist.
 */

import { RITES, enabledChurches, enabledCommunions, churchesInCommunion } from '../data/churches.js';
import { cellMark, rollupStates, badgeLabel, rollup } from './badge.js';
import { STRINGS, fill } from './strings.js';

/**
 * The columns: rites some enabled church actually holds, in the registry's
 * order. Derived, never a hardcoded seven — the same reason the badge derives
 * its four columns.
 */
export function riteColumns() {
  const live = new Set(enabledChurches().flatMap((c) => c.rites));
  return RITES.filter((r) => live.has(r.id));
}

/**
 * One row per communion, one cell per occupied rite.
 *
 * A cell's state is its church's own finding, not a roll-up: that is the whole
 * point of the view. The roll-up appears only if two churches ever share a
 * (communion, rite) position — none do today — and then it is the badge's rule,
 * imported, rather than a second rule written here.
 *
 * **Eastern Catholic occupies six of these cells from one registry entry**
 * (`rites` is a list — see DESIGN.md §7 and SESSIONS.md Session 1). Every one
 * of the six carries that single entry's finding. That is a coarser claim than
 * the cell's position implies, so the cell says so in its own legend; the
 * alternative, leaving the six blank, would break the decomposition above and
 * erase the one adjacency the brief says this view exists to show.
 */
export function matrixRows(attestations = []) {
  const byChurch = new Map(attestations.map((a) => [a.church, a.status]));
  const rites = riteColumns();

  return enabledCommunions().map((communion) => {
    const churches = churchesInCommunion(communion.id);
    const cells = rites
      .map((rite, col) => {
        const here = churches.filter((c) => c.rites.includes(rite.id));
        if (!here.length) return null;
        return {
          col,
          rite,
          churches: here,
          label: here.map((c) => c.display_name).join(', '),
          coarse: here.some((c) => c.coarse),
          state: rollupStates(here.map((c) => byChurch.get(c.id))),
        };
      })
      .filter(Boolean);
    return { communion, cells };
  });
}

/** Every occupied cell, row-major — the set the text equivalent counts over. */
export const matrixCells = (attestations) => matrixRows(attestations).flatMap((r) => r.cells);

/**
 * The invariant, as a function rather than a comment: each communion's row,
 * rolled up, is that communion's badge cell. True for any input, not just for
 * this corpus — every church holds at least one rite, so no church can fall
 * out of the matrix and go missing from the roll-up.
 */
export function decomposesToBadge(attestations = []) {
  const badge = new Map(rollup(attestations).map((c) => [c.communion.id, c.state]));
  return matrixRows(attestations).every(
    ({ communion, cells }) =>
      badge.get(communion.id) ===
      rollupStates(
        cells.flatMap((c) => {
          if (c.state === 'attested') return ['venerated'];
          return c.state === 'refused' ? ['not-venerated'] : [];
        }),
      ),
  );
}

const cellTitle = (c) =>
  fill(STRINGS.matrix.cell, {
    church: c.label,
    rite: c.rite.display_name,
    state: STRINGS.badge.state[c.state],
  }) + (c.coarse ? STRINGS.matrix.coarse : '');

/**
 * `pitch` is the lattice step in px, the same parameter the badge takes, so
 * the two views draw the same circle for the same number. Width is the rite
 * columns x pitch and height the communion rows x pitch, per spec §4. Four
 * rows is what rules the matrix out of a register row: see DESIGN.md §7c.
 */
export function renderMatrix(attestations, { pitch = 9 } = {}) {
  const rows = matrixRows(attestations);
  const cols = riteColumns().length;
  const round = (n) => Math.round(n * 1000) / 1000;
  const width = cols * pitch;
  const height = rows.length * pitch;

  const shapes = rows
    .flatMap((row, r) =>
      row.cells.map((c) =>
        cellMark({
          state: c.state,
          cx: c.col * pitch + pitch / 2,
          cy: r * pitch + pitch / 2,
          pitch,
          title: cellTitle(c),
        }),
      ),
    )
    .join('');

  const label = badgeLabel(matrixCells(attestations), STRINGS.badge.unit.cells);
  return (
    `<svg class="badge glyph-matrix" role="img" aria-label="${label}" ` +
    `viewBox="0 0 ${round(width)} ${round(height)}" width="${round(width)}" height="${round(height)}" ` +
    `focusable="false">${shapes}</svg>`
  );
}
