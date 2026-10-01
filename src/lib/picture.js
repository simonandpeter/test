/**
 * The `srcset` for a manifest image, from the derivatives it declares.
 *
 * Candidates are `cardSm` (280 on the long edge), `card` (560 on the long
 * edge) and `hero` (1000 on the width) — the three files make_thumbs.py
 * writes sharp. Each is named with its own pixel width, which is what a `w`
 * descriptor means, and the list is ascending.
 *
 * **Duplicate widths are dropped, keeping the smallest file at that width.**
 * No derivative is ever upscaled, so a 400 px original is 400 px in all three
 * and the browser would be handed one width three times.
 *
 * @param {object} image a manifest `card.image`, or null/undefined
 * @param {string} base the app's base path, prefixed to every candidate
 * @returns {string} the attribute value, or `''` when there is nothing to
 *   choose between — a single candidate is left to `src` alone.
 */
export function srcsetFor(image, base = '') {
  if (!image) return '';
  const seen = new Set();
  const out = [];
  for (const [file, width] of [
    [image.cardSm, image.cardSmW],
    [image.card, image.cardW],
    [image.hero, image.heroW],
  ]) {
    if (!file || !width || seen.has(width)) continue;
    seen.add(width);
    out.push(`${base + file} ${width}w`);
  }
  return out.length > 1 ? out.join(', ') : '';
}
