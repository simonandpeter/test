/**
 * The one uncertainty curve (DESIGN.md §6b, Addendum C4). Softness is a
 * continuous function of one number — interval width in years for date bars,
 * uncertainty_km for map halos, interval widths again for timeline dissolves —
 * and it is this function in all three places. Never a lookup table, and never
 * fed an editorial enum: basis and historicity modulate treatment, not
 * geometry.
 *
 * The three constants live in tokens.css as custom properties so they can be
 * nudged alongside the palette; this module reads them once and falls back to
 * the same values if it runs before the stylesheet (or off-DOM, as the canvas
 * map will).
 */

const DEFAULTS = { min: 0.75, max: 24, gamma: 0.55 };

let constants = null;

function readConstants() {
  if (constants) return constants;
  constants = { ...DEFAULTS };
  if (typeof document !== 'undefined') {
    const style = getComputedStyle(document.documentElement);
    for (const [key, prop] of [
      ['min', '--uncertainty-min'],
      ['max', '--uncertainty-max'],
      ['gamma', '--uncertainty-gamma'],
    ]) {
      const v = parseFloat(style.getPropertyValue(prop));
      if (Number.isFinite(v)) constants[key] = v;
    }
  }
  return constants;
}

/**
 * Softness in px at base scale for a parameter p (years or km). Applications
 * may scale the result linearly (map zoom) but never reshape the curve. An
 * unknown parameter (null — an open interval) gets maximum softness: no bound
 * means maximally unsure, drawn maximally soft, never sharp by accident.
 */
export function softness(p) {
  const { min, max, gamma } = readConstants();
  if (p === null || p === undefined || Number.isNaN(p)) return max;
  return Math.min(max, Math.max(min, min * Math.pow(Math.max(p, 1), gamma)));
}
