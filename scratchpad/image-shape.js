/**
 * The shape of a saint's icon: the five paths the markup needs, the three
 * `srcset` widths, and the aspect ratio — all of it derived from the two
 * numbers the manifest actually stores.
 *
 * **Why this module exists.** The manifest carried all eleven fields per
 * iconed saint, which measured 65 bytes gzipped per declaration against a hard
 * 400 KB budget that the Lighthouse FCP floor is measured on. Ten of the
 * eleven are a pure function of `w`, `h` and the file's name, so storing them
 * was paying for arithmetic. Reduced to `{ w, h }` the same 320 declarations
 * cost 13 bytes each — 15.6 KB back today, and a fifth of the marginal cost
 * for every icon the image programme adds.
 *
 * `scripts/build-manifest.mjs` imports the same functions, so the arithmetic
 * that writes the files' names and the arithmetic that reads them are one
 * copy. `src/lib/manifest.js` calls `hydrateImage` and hands every view the
 * object it has always been handed.
 */

/** Card thumbnails are the blurred placeholders make_thumbs.py writes. */
export const thumbFor = (file) => file.replace(/\.(jpe?g|png)$/i, '') + '-thumb.jpg';

/**
 * The sharp, card-sized derivative make_thumbs.py writes beside the thumb
 * (2026-09-06). A carousel card is 150-300 CSS px and was being handed the
 * original: a median of 283 kB and up to 1.04 MB to draw a picture the width
 * of a thumbnail. The thumb itself is blurred by design and cannot stand in.
 */
export const cardFor = (file) => file.replace(/\.(jpe?g|png)$/i, '') + '-card.jpg';

/**
 * The same picture at half that again (2026-09-12). `-card.jpg` is sized for
 * the widest card at two device pixels; a phone drawing a 150 CSS px card at
 * one was being handed all of it — 525 kB of pictures for a screenful showing
 * two, measured on the production build at 360 px
 * (`scripts/screenful-bytes.mjs`). Both are named in the markup's `srcset`
 * with the card's own width as `sizes`, so the browser chooses and the build
 * does not have to guess which reader it is talking to.
 */
export const cardSmFor = (file) => file.replace(/\.(jpe?g|png)$/i, '') + '-card-sm.jpg';

/**
 * The picture the saint page and the Daily hero paint (2026-10-01). Those two
 * were being handed `src`, the original as fetched: a median of 283 kB at 939
 * px to draw a figure 328 CSS px wide, which on a 1.6 Mbps link completes 2.0
 * s after the 560 card does and 5.1 s after it at the largest icon in the
 * corpus. `HERO_W_PX` in make_thumbs.py has the cap and why it is on the
 * width.
 */
export const heroFor = (file) => file.replace(/\.(jpe?g|png)$/i, '') + '-hero.jpg';

/**
 * The two caps make_thumbs.py writes the card derivatives at, on the *longer*
 * edge. Repeated here rather than read, because the script is Python and this
 * is the only arithmetic that needs them; `tests/build.test.mjs` holds the
 * pair to the pixels the files actually have, so a change to one without the
 * other fails rather than mis-declaring a `srcset`.
 */
export const CARD_MAX_PX = 560;
export const CARD_SM_MAX_PX = 280;

/** The hero cap, which is on the width — make_thumbs.py's `HERO_W_PX`. */
export const HERO_W_PX = 1000;

/** The width a derivative capped at `longest` on its long edge really has. */
export const derivedWidth = (width, height, longest) =>
  Math.max(1, Math.round(width * Math.min(1, longest / Math.max(width, height))));

/**
 * The conventional path of a saint's icon inside its own folder: all 320
 * iconed folders in the corpus use exactly this, so the manifest records a
 * path only for the ones that do not. It is the whole relative path and not
 * just the stem, so a `.png`, a second stem or a folder other than `images/`
 * all survive with one field rather than three.
 */
export const DEFAULT_FILE = 'images/icon.jpg';

/**
 * Rebuilds the full image object from what the manifest stores.
 *
 * The result is byte-identical to the object the manifest used to carry, field
 * order included, because ~30 call sites across `src/` read its fields by name
 * and `tests/build.test.mjs` pins the whole shape.
 *
 * @param {string} slug the saint's folder name, which is the path the
 *   derivatives live under
 * @param {{ w: number, h: number, f?: string }} stored the manifest's record:
 *   the original's pixel dimensions, plus `f` — its path inside the folder —
 *   when that is not `DEFAULT_FILE`
 * @returns {object} `{ src, lqip, card, cardSm, cardW, cardSmW, hero, heroW,
 *   w, h, aspect }` — five paths relative to the app's base, the three
 *   `srcset` widths, and the original's shape
 */
export function hydrateImage(slug, stored) {
  const { w, h, f } = stored;
  const file = f ?? DEFAULT_FILE;
  const base = `saints/${slug}/`;
  return {
    src: base + file,
    lqip: base + thumbFor(file),
    card: base + cardFor(file),
    cardSm: base + cardSmFor(file),
    cardW: derivedWidth(w, h, CARD_MAX_PX),
    cardSmW: derivedWidth(w, h, CARD_SM_MAX_PX),
    hero: base + heroFor(file),
    heroW: Math.min(w, HERO_W_PX),
    w,
    h,
    aspect: Math.round((w / h) * 10000) / 10000,
  };
}
