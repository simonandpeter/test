/**
 * The plate: the rite × communion lattice at full width, with every position
 * named (author's diagram, 2026-08-21).
 *
 * The badge (badge.js) is four cells and the matrix (matrix.js) is thirteen at
 * 7.65 px pitch — both are marks, read at a glance beside a name. This is the
 * same lattice opened out until a reader can be told what each position *is*:
 * a dot, a hairline down to a label, and the label naming the church that holds
 * it. It appears twice, and the two are one layout with different cells:
 *
 *   `renderShapePlate`  — About's teaching view. Cells are the real marks,
 *                         drawn by `cellMark`, so the page cannot describe a
 *                         glyph the site no longer draws.
 *   `renderFilterPlate` — the calendar's tradition filter. Cells are two-state
 *                         buttons.
 *
 * **The filter's cells are deliberately not the veneration mark.** Gold appears
 * in exactly one place on this site (DESIGN.md §2) and that place is a finding
 * about a saint, not a control's state. So a selected cell is a solid disc in
 * `--ink` and an unselected one is the same disc in `--rule`: the same lattice,
 * in the register's own two values, and never the glyph's three. Every cell
 * also carries `aria-pressed`, so the state never rests on the value alone.
 *
 * **One church is one toggle, however many cells it holds.** Eastern Catholic
 * spans six rites from a single registry entry (DESIGN.md §7b), so its six
 * dots are one control and share one label — which is what the connectors are
 * for: a rail under a church's run of cells, a tick up to each dot, and the
 * name once beneath. A church with one cell gets a tick and no rail.
 *
 * A position with no church in it draws nothing at all, exactly as the matrix
 * does. Fifteen of the twenty-eight are empty; there is nothing to fill.
 */

import { enabledCommunions, churchesInCommunion } from '../data/churches.js';
import { cellMark, rollupStates } from './badge.js';
import { riteColumns } from './matrix.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { STRINGS, fill } from './strings.js';

/** The lattice step the plate draws at. Large enough to label; §7c's floor is 2 px. */
export const PLATE_PITCH = 34;

/**
 * The shared geometry, so the two plates cannot drift apart: one row per
 * communion, and inside it one *group* per church — the columns that church
 * holds, which is one for every entry in the registry except Eastern Catholic.
 *
 * Groups are contiguous today and the connector rail assumes it. If a church
 * ever holds a broken run of rites the rail would span a column it has no dot
 * in, so `contiguous` says whether that has happened rather than leaving it to
 * be noticed on screen.
 */
export function platePositions() {
  const rites = riteColumns();
  const index = new Map(rites.map((r, i) => [r.id, i]));

  const rows = enabledCommunions().map((communion) => {
    const groups = churchesInCommunion(communion.id)
      .map((church) => {
        const cols = church.rites
          .map((r) => index.get(r))
          .filter((c) => c !== undefined)
          .sort((a, b) => a - b);
        return { church, cols, first: cols[0], last: cols[cols.length - 1] };
      })
      .filter((g) => g.cols.length)
      .sort((a, b) => a.first - b.first);
    return { communion, groups };
  });

  const contiguous = rows.every(({ groups }) =>
    groups.every((g) => g.last - g.first + 1 === g.cols.length),
  );
  return { rites, rows, contiguous };
}

/** Every church that holds at least one position, in row order. */
export const plateChurches = () => platePositions().rows.flatMap((r) => r.groups.map((g) => g.church));

/* ---- the shared shell --------------------------------------------------- */

/**
 * One communion's row occupies three grid rows — dots, connectors, labels —
 * and the plate is one grid rather than four, so the columns line up across
 * communions without a fixed width anywhere. The communion's own name sits on
 * the dots row rather than centred across all three: it names the lattice, not
 * the labels hanging off it, and the author's diagram sets it level with the
 * circles.
 */
const DOTS = (i) => 2 + i * 3;
const LINKS = (i) => 3 + i * 3;
const LABELS = (i) => 4 + i * 3;

const col = (n) => n + 2; // column 1 is the communion's own name

/** A church's connectors: a tick up to each of its dots, and a rail if it has more than one. */
function connectors(group) {
  const n = group.last - group.first + 1;
  const ticks = group.cols
    .map((c) => {
      const centre = ((c - group.first + 0.5) / n) * 100;
      return `<i style="left:${Math.round(centre * 100) / 100}%"></i>`;
    })
    .join('');
  const railed = group.cols.length > 1 ? ' is-railed' : '';
  return `<span class="plate-link${railed}">${ticks}</span>`;
}

function shell({ rites, rows, cellFor, labelFor, sideFor, topFor, scrolls = '', extra = '' }) {
  const heads = rites
    .map((rite, i) => `<div class="plate-top" style="grid-column:${col(i)};grid-row:1">${topFor(rite)}</div>`)
    .join('');

  // Emitted church by church rather than dots-then-rails-then-names, because
  // every position is placed explicitly on the grid and so source order is free
  // to be the order a reader wants it read in: below 700 px the grid is dropped
  // and this becomes a register, where a dot has to be followed by its own name
  // rather than by the next communion's dots.
  const body = rows
    .map(({ communion, groups }, r) => {
      const side =
        `<div class="plate-side" style="grid-column:1;grid-row:${DOTS(r)}">` +
        `${sideFor(communion, groups)}</div>`;
      const parts = groups
        .map((g) => {
          const cells = g.cols
            .map(
              (c) =>
                `<div class="plate-cell" style="grid-column:${col(c)};grid-row:${DOTS(r)}">` +
                `${cellFor(g.church, rites[c], communion)}</div>`,
            )
            .join('');
          const links =
            `<div class="plate-links" aria-hidden="true" ` +
            `style="grid-column:${col(g.first)} / ${col(g.last) + 1};grid-row:${LINKS(r)}">` +
            `${connectors(g)}</div>`;
          const label =
            `<div class="plate-label" ` +
            `style="grid-column:${col(g.first)} / ${col(g.last) + 1};grid-row:${LABELS(r)}">` +
            `${labelFor(g.church)}</div>`;
          // Wrapped, and `display: contents` while the grid is a grid — so the
          // cells stay grid items placed by their own column, and the wrapper
          // is there for the width where the grid is dropped and a church has
          // to be one line: its dots, then its name.
          return `<div class="plate-group">${cells}${links}${label}</div>`;
        })
        .join('');
      return side + parts;
    })
    .join('');

  // Wrapped, because below the width the lattice needs the wrapper scrolls it
  // rather than the layout changing shape (author, 2026-08-21). A grid that
  // rearranges itself at 360 px is a second diagram to learn; this is the same
  // one, with the communion's name held at the edge so a reader always knows
  // which row they are along.
  //
  // A scrollable region has to be reachable by keyboard. The filter's is,
  // through the thirteen buttons inside it; About's holds nothing focusable at
  // all, so it takes a tab stop and a name of its own — which is what `scrolls`
  // carries. axe's scrollable-region-focusable caught the difference at 360 px
  // on About and nowhere else.
  return (
    `<div class="plate-scroll"${scrolls}>` +
    `<div class="plate" style="--plate-cols:${rites.length}">${heads}${body}${extra}</div>` +
    `</div>`
  );
}

/* ---- About: the shape, with the real marks in it ------------------------ */

/**
 * The lattice as it actually is, drawn with the marks the rest of the site
 * draws. Given a saint's attestations the cells carry that saint's findings;
 * given none, every cell is undocumented and the plate is showing its own
 * shape, which is what About's caption says it is doing.
 */
export function renderShapePlate(attestations = []) {
  const byChurch = new Map(attestations.map((a) => [a.church, a.status]));
  const { rites, rows } = platePositions();
  const pitch = PLATE_PITCH;

  const cellFor = (church, rite) => {
    const state = rollupStates([byChurch.get(church.id)]);
    const title =
      esc(fill(STRINGS.matrix.cell, {
        church: church.display_name,
        rite: rite.display_name,
        state: STRINGS.badge.state[state],
      })) + (church.coarse ? esc(STRINGS.matrix.coarse) : '');
    return (
      `<svg class="badge plate-mark" role="img" aria-label="${title}" ` +
      `viewBox="0 0 ${pitch} ${pitch}" width="${pitch}" height="${pitch}" focusable="false">` +
      `${cellMark({ state, cx: pitch / 2, cy: pitch / 2, pitch })}</svg>`
    );
  };

  return shell({
    rites,
    rows,
    cellFor,
    labelFor: (church) => esc(church.display_name),
    sideFor: (communion) => esc(communion.display_name),
    topFor: (rite) => esc(rite.abbr ?? rite.display_name),
    scrolls: ` tabindex="0" role="group" aria-label="${esc(STRINGS.about.glyph.plate)}"`,
  });
}

/* ---- the calendar: the same lattice as a filter -------------------------- */

const rowState = (groups, selected) => {
  const on = groups.filter((g) => selected.has(g.church.id)).length;
  return on === 0 ? 'off' : on === groups.length ? 'on' : 'some';
};

const riteState = (rows, riteId, selected) => {
  const holders = rows.flatMap(({ groups }) =>
    groups.filter((g) => g.church.rites.includes(riteId)),
  );
  const on = holders.filter((g) => selected.has(g.church.id)).length;
  return on === 0 ? 'off' : on === holders.length ? 'on' : 'some';
};

/**
 * The filter. Every dot is a button, every communion's name is a button for its
 * whole row, and every rite's name is a button for its whole column — which is
 * how a reader turns on "everything Byzantine" or "everything Catholic" without
 * hunting cells.
 *
 * A church that holds six cells is still one button six times over: pressing
 * any of Eastern Catholic's six presses all six, because they are one registry
 * entry and pretending otherwise would be inventing six findings out of one.
 */
export function renderFilterPlate(selected) {
  const { rites, rows } = platePositions();
  const F = STRINGS.traditions;

  const cellFor = (church, rite) => {
    const on = selected.has(church.id);
    const label = fill(F.cellLabel, { church: church.display_name, rite: rite.display_name });
    return (
      `<button type="button" class="plate-dot" data-church="${church.id}" ` +
      `aria-pressed="${String(on)}" aria-label="${esc(label)}">` +
      `<span class="plate-disc" aria-hidden="true"></span></button>`
    );
  };

  const sideFor = (communion, groups) => {
    const state = rowState(groups, selected);
    return (
      `<button type="button" class="plate-head" data-communion="${communion.id}" ` +
      `aria-pressed="${String(state === 'on')}" data-state="${state}">` +
      `${esc(communion.display_name)}</button>`
    );
  };

  const topFor = (rite) => {
    const state = riteState(rows, rite.id, selected);
    return (
      `<button type="button" class="plate-head" data-rite="${rite.id}" ` +
      `aria-pressed="${String(state === 'on')}" data-state="${state}" ` +
      `aria-label="${esc(fill(F.riteLabel, { rite: rite.display_name }))}">` +
      `${esc(rite.abbr ?? rite.display_name)}</button>`
    );
  };

  return shell({
    rites,
    rows,
    cellFor,
    sideFor,
    topFor,
    labelFor: (church) => esc(church.display_name),
  });
}
