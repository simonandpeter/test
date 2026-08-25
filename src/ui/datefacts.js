/**
 * When and where, as a register rather than a drawing.
 *
 * This replaces the date-interval bars (author, 2026-08-21). The bars drew
 * each interval at the softness its width earned, through the uncertainty
 * curve; what a reader actually needed from them on this page was the years,
 * and the years were already printed beside them. DESIGN.md §6b keeps the
 * curve — the map halo and the timeline are its remaining consumers — and §6b
 * records that the bars are withdrawn rather than that the curve is.
 *
 * Dates and locations share one axis, `kind`, so they render as one list: born
 * when and where on one line, died when and where on another. A kind with only
 * one of the two still gets its row, because "we know where he died and not
 * when" is a finding and a blank is what it looks like.
 *
 * The place *names* are not in the manifest — only coordinates are — so the
 * rows are built from the card, which knows how many there will be, and the
 * names are filled in when the saint's own file arrives. The box is therefore
 * the right size before the text exists, which is what the no-layout-shift
 * rule asks for.
 */

import { isUndated, makeInterval } from '../lib/dates.js';
import { formatInterval } from '../lib/calendar-page.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { STRINGS } from './strings.js';

/** Kinds in the order a life runs, not the order a file happens to list them. */
const ORDER = ['birth', 'floruit', 'death', 'ministry', 'see', 'relics'];

/**
 * One row per kind that either a date or a location speaks to. Locations are
 * taken by kind, and a kind with more than one — two sets of relics, say —
 * keeps them all rather than picking one.
 */
export function factRows(dates, locations = []) {
  const rows = [];
  for (const kind of ORDER) {
    const iv = makeInterval(dates?.[kind]);
    const dated = !isUndated(iv);
    const places = (locations ?? []).filter((l) => l.kind === kind);
    if (!dated && !places.length) continue;
    if (!places.length) {
      rows.push({ kind, date: formatInterval(iv), place: null });
      continue;
    }
    // The date belongs to the kind, so it prints once and the first place
    // carries it; a second place of the same kind is another line, not a
    // second claim about the year.
    places.forEach((place, i) => {
      rows.push({ kind, date: i === 0 && dated ? formatInterval(iv) : null, place });
    });
  }
  return rows;
}

/** The place as a reader would say it: what it was called, then where it is now. */
export function formatPlace(place) {
  if (!place) return '';
  const historical = place.historical_name ?? '';
  const modern = place.modern_name ?? '';
  if (historical && modern && historical !== modern) return `${historical} - ${modern}`;
  return historical || modern || STRINGS.saint.placeUnnamed;
}

/**
 * The shell's version: every row at its final height, with the place names
 * standing as skeletons until the saint's file arrives. The card carries each
 * location's `kind` but not its name, which is exactly enough to reserve the
 * box.
 */
/**
 * The kinds `formatLifespan` already prints under the saint's name. A register
 * whose whole content is one of these and nothing else says nothing the header
 * did not say two lines above it.
 */
const IN_THE_LIFESPAN = new Set(['birth', 'floruit', 'death']);

export function renderDateFacts(dates, locations) {
  const rows = factRows(dates, locations);
  if (!rows.length) {
    return `<p class="date-facts-undated utility">${STRINGS.dates.undatedNote}</p>`;
  }

  /*
   * One row, no place, and a year the header has already given: nothing is
   * printed (author, 2026-08-26: "On the saint page, 'Died · 105 AD' as a lone
   * table row looks empty").
   *
   * It looked empty because it *was* empty — a two-column register drawn across
   * the page to carry a single cell whose content is the phrase "Reposed 105
   * AD" from the subtitle, rewritten. Titus is the shape of it: no birth, no
   * places, one year, known twice.
   *
   * Only that exact case. A row with a place is a second fact and keeps its
   * register; two rows are a life with a shape and keep theirs; a lone
   * *ministry*, *see* or *relics* date is something the lifespan line never
   * carried and keeps its row. And an undated saint still gets the note above,
   * because "no date is recorded" is a finding this site prints on purpose.
   */
  if (rows.length === 1 && !rows[0].place && IN_THE_LIFESPAN.has(rows[0].kind)) return '';

  const items = rows
    .map(
      ({ kind, date, place }, i) => `<div class="fact-row">
      <span class="fact-kind utility">${esc(STRINGS.saint.kinds[kind] ?? kind)}</span>
      <span class="fact-body">
        ${date ? `<span class="fact-date">${esc(date)}</span>` : ''}
        ${place ? `<span class="fact-place utility" data-place="${i}"><span class="skeleton"></span></span>` : ''}
      </span>
    </div>`,
    )
    .join('');

  return `<div class="date-facts" role="group" aria-label="${esc(STRINGS.saint.factsLabel)}">${items}</div>`;
}

/**
 * The place names, once the saint's own file has them. Matched by position
 * against the same `factRows` the shell drew, so a row can only ever be filled
 * with the place it was reserved for.
 */
export function fillPlaces(root, dates, locations) {
  const rows = factRows(dates, locations);
  for (const [i, row] of rows.entries()) {
    const cell = root.querySelector(`[data-place="${i}"]`);
    if (!cell || !row.place) continue;
    const note = row.place.note ? `<span class="fact-note">${esc(row.place.note)}</span>` : '';
    cell.innerHTML = `${esc(formatPlace(row.place))}${note}`;
  }
}
