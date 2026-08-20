/**
 * Date bars — the first consumer of the uncertainty curve (DESIGN.md §6b).
 *
 * Every date in this project is an interval, and the bar is the interval: its
 * length is the years it spans and its edges are as soft as that span is wide,
 * through `softness()` and nothing else. A precise date draws as a sharp mark;
 * two centuries of doubt draw as a visible dissolve. The midpoint is never
 * drawn as a point, because the midpoint of a 200-year span is not a fact
 * about anyone.
 *
 * `basis` and `historicity` never touch the geometry (Addendum B2). A
 * legendary figure with a firmly transmitted year draws sharp: we are sure of
 * the number and unsure of the story, and the bar speaks only to the number.
 * The story is the register's business, in words.
 *
 * Bars are positioned in percentages and softened in pixels, so the drawing is
 * correct at any container width without rescaling the curve — softness is a
 * physical quantity on the page, not a fraction of a viewport.
 */

import { isUndated, isUnbounded, makeInterval, width as intervalWidth } from '../lib/dates.js';
import { softness } from '../lib/uncertainty.js';
import { formatInterval } from '../lib/calendar-page.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { STRINGS, fill } from './strings.js';

const KINDS = ['birth', 'floruit', 'death'];

/** A year as a reader would say it: 356, or 44 BC. Year 0 is 1 BC. */
export const formatYear = (y) => (y > 0 ? String(Math.round(y)) : `${1 - Math.round(y)} BC`);

/**
 * The window the bars are drawn in: the saint's own span, padded — not a
 * shared millennium. On a common axis every interval in this corpus would be a
 * sliver, and the comparison a shared axis buys belongs to the Phase 3
 * timeline, which has the width for it.
 */
export function domainOf(dates) {
  const bounds = [];
  for (const kind of KINDS) {
    const iv = makeInterval(dates?.[kind]);
    if (iv.earliest !== null) bounds.push(iv.earliest);
    if (iv.latest !== null) bounds.push(iv.latest);
  }
  if (!bounds.length) return null;
  const lo = Math.min(...bounds);
  const hi = Math.max(...bounds);
  const pad = Math.max(8, (hi - lo) * 0.12);
  return { from: lo - pad, to: hi + pad };
}

/** Where a year sits in the window, as a percentage of its length. */
export const positionIn = (domain, year) =>
  ((year - domain.from) / (domain.to - domain.from)) * 100;

/**
 * The geometry of one interval, as percentages plus a softness in pixels.
 * Separated from the markup because this is the part worth testing: it is
 * where the curve meets the data.
 */
export function barGeometry(iv, domain) {
  const open = isUnbounded(iv);
  const start = iv.earliest === null ? -8 : positionIn(domain, iv.earliest);
  const end = iv.latest === null ? 108 : positionIn(domain, iv.latest);
  return {
    left: start,
    // A precise date is an interval of zero width; the stylesheet's min-width
    // is what keeps it visible, as a mark that reads "exactly here" rather
    // than as a span.
    width: Math.max(end - start, 0),
    // An open bound is a missing coordinate, not a wide interval: the curve's
    // clamp for an unknown parameter is 24 px, which on an 8 px bar would
    // erase the bound we *do* have at the other end. So the open end dissolves
    // over extent instead — the same "maximally unsure" reading, expressed the
    // only way that leaves the known end legible.
    blur: open ? softness(1) : softness(intervalWidth(iv)),
    openStart: iv.earliest === null,
    openEnd: iv.latest === null,
  };
}

/**
 * One row per dated interval, plus the years the window spans.
 */
export function renderDateBars(dates) {
  const domain = domainOf(dates);
  const rows = KINDS.map((kind) => ({ kind, iv: makeInterval(dates?.[kind]) })).filter(
    (r) => !isUndated(r.iv),
  );
  if (!domain || !rows.length) {
    return `<p class="date-bars-undated utility">${STRINGS.dates.undatedNote}</p>`;
  }

  const label = rows
    .map(({ kind, iv }) =>
      fill(STRINGS.dates.barLabel, {
        kind: STRINGS.dates.kinds[kind],
        value: formatInterval(iv),
        span: isUnbounded(iv)
          ? STRINGS.dates.spanOpen
          : intervalWidth(iv) === 0
            ? STRINGS.dates.spanExact
            : fill(STRINGS.dates.spanYears, { n: intervalWidth(iv) }),
      }),
    )
    .join(' ');

  const bars = rows
    .map(({ kind, iv }) => {
      const g = barGeometry(iv, domain);
      const open = g.openStart ? ' open-start' : g.openEnd ? ' open-end' : '';
      return `<div class="date-row">
        <span class="date-kind utility">${esc(STRINGS.dates.kinds[kind])}</span>
        <span class="date-track"><i class="date-bar${open}"
          style="left:${g.left.toFixed(2)}%;width:${g.width.toFixed(2)}%;filter:blur(${g.blur.toFixed(2)}px)"></i></span>
        <span class="date-value utility">${esc(formatInterval(iv))}</span>
      </div>`;
    })
    .join('');

  return `<figure class="date-bars" role="group" aria-label="${esc(label)}">
    ${bars}
    <figcaption class="date-scale utility" aria-hidden="true">
      <span>${formatYear(domain.from)}</span><span>${formatYear(domain.to)}</span>
    </figcaption>
  </figure>`;
}
