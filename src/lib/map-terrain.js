/**
 * The map's terrain wash and its tile grid, turned from `make-terrain.py`'s
 * plain data channels into ink — kept out of `views/map.js` on purpose.
 *
 * `views/map.js` is statically imported by `main.js`, so anything living in
 * it ships in the app's own entry bundle on every route, not only `/map`.
 * `land.js`/`water.js` avoid this by being pure data, dynamically imported;
 * this is the same move for the *code* that reads the terrain data, which
 * has no reason to cost a calendar or a saint page anything. Adding this
 * module's own few hundred lines directly to map.js once cost every route's
 * first paint about 150ms on a throttled connection — the whole reason this
 * file exists rather than growing map.js further.
 */

import { toWorld } from './map-view.js';
import { project } from './mercator.js';

/**
 * A tile's URL, for one of its two channels. Built here rather than at the
 * call site in `views/map.js` on purpose: `new URL(\`...${col}-${row}...\`,
 * import.meta.url)` is a *dynamic* template literal, which Vite cannot
 * resolve to one asset at build time — so it inlines a lookup table covering
 * every file that could ever match the pattern (all 144 tiles) into whatever
 * chunk contains the call site. Kept here, that table lands in this already-
 * lazy module instead of bloating the caller's; kept in map.js, as it
 * originally was, it added ~150ms to every route's first paint by way of
 * `main.js`'s static import of the view module, measured on CI.
 */
export function tileUrl(col, row, channel) {
  return new URL(`../data/terrain-tiles/t-${col}-${row}-${channel}.webp`, import.meta.url).href;
}

/**
 * Decodes one channel of `make-terrain.py`'s output into a plain byte array —
 * grayscale WebP, so R, G and B all carry the same value and only R is kept.
 * A canvas is the decoder here (`createImageBitmap` then `drawImage` then
 * `getImageData`); there is no lighter way to ask the browser to turn image
 * bytes into pixels without one.
 */
export async function loadTerrainChannel(url) {
  const res = await fetch(url);
  const bitmap = await createImageBitmap(await res.blob());
  const off = document.createElement('canvas');
  off.width = bitmap.width;
  off.height = bitmap.height;
  const octx = off.getContext('2d');
  octx.drawImage(bitmap, 0, 0);
  const { data } = octx.getImageData(0, 0, bitmap.width, bitmap.height);
  const channel = new Uint8ClampedArray(bitmap.width * bitmap.height);
  for (let i = 0; i < channel.length; i += 1) channel[i] = data[i * 4];
  return { data: channel, w: bitmap.width, h: bitmap.height };
}

/** A `#rrggbb` token to `[r, g, b]` — `hexWithAlpha` (map.js) parses the same
 *  shape for a CSS string; this returns numbers instead, for per-pixel
 *  arithmetic. */
function hexToRgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [92, 84, 77]; // ink-soft's own light-theme value, as a floor
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/*
 * The green<->sand index (`terrain-green.webp`) and the relief raster's own
 * luminance (`terrain-relief.webp`) already carry the whole terrain read —
 * see `scripts/make-terrain.py`'s own header for what each means and why
 * they ship separately. Turning them into ink is this module's job precisely
 * so the colour itself keeps living in `tokens.css` and nowhere else: this
 * asset never needs regenerating when the palette is retuned, only when
 * `mercator.js`'s own `MAX_LAT` changes.
 *
 * Green darkens the ink, sand lightens it — **which end `green` points at
 * flips with the theme rather than being a fixed alpha the theme happens to
 * invert** (2026-09-03): ink is the *dark* token against a light ground in
 * the light theme and the *light* token against a dark ground in the dark
 * one, so one alpha curve driven by greenness read as correct in the light
 * theme and backwards in the dark one — desert came out dark, forest came
 * out light. `TERRAIN_A_LO`/`_HI` are keyed by theme so each one drives the
 * alpha from whichever quality — greenness or its opposite — actually deepens
 * the ink in that theme, and the pair is deliberately asymmetric (the dark
 * theme's own floor sits lower) rather than a mirror of the light theme's,
 * because a straight inversion overshot: forest read paler than the ground
 * one side and desert nearly blew out the other before this was tuned by eye
 * against the palette.
 */
const TERRAIN_A_LO = { light: 0.3, dark: 0.22 };
const TERRAIN_A_HI = { light: 0.62, dark: 0.62 };

/**
 * The relief channel is read as a *multiplier* on the terrain alpha above,
 * not a second additive term — a shadowed slope should read as "this ground,
 * darker" rather than "this ground, plus a fixed wash", or a green valley and
 * a green ridge would end up the same ink regardless of the relief under
 * them. `RELIEF_BASELINE` is the source raster's own flat-ground value (grass
 * and bare rock both sit near it); below `RELIEF_FLOOR` is the deepest shadow
 * the 50m tier carries. The lift past baseline is damped rather than matched
 * one-for-one — a lit slope reading as strongly *less* ink than its own
 * terrain tone looked like a rendering seam, not relief, at the ridgelines.
 */
const RELIEF_BASELINE = 205;
const RELIEF_FLOOR = 52;
const RELIEF_GAIN = 0.65;
const RELIEF_LIFT_DAMP = 0.12;

/** One ink colour, alpha modulated per pixel by land-cover and relief — see
 *  the constants above. Takes a plain `{ green, relief, w, h }` channel pair
 *  rather than reading the world wash off a particular object, so the same
 *  function builds the tint for a tile too — a tile's data is the same
 *  shape, just one lon/lat cell of it (`make-terrain.py`). Rebuilt only when
 *  the theme changes (`tintFor` caches by ink colour), never per frame: a
 *  Uint8ClampedArray loop over a whole raster is real work to repeat sixty
 *  times a second and only the palette or the data can ever change what it
 *  produces. */
function buildTint(channels, inkHex, isDark) {
  const { green, relief, w, h } = channels;
  const [ir, ig, ib] = hexToRgb(inkHex);
  const aLo = isDark ? TERRAIN_A_LO.dark : TERRAIN_A_LO.light;
  const aHi = isDark ? TERRAIN_A_HI.dark : TERRAIN_A_HI.light;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i += 1) {
    const g = green[i] / 255;
    const driver = isDark ? 1 - g : g;
    let alpha = aLo + (aHi - aLo) * driver;
    const rel = relief[i];
    const relLow = Math.max(0, Math.min(1, (RELIEF_BASELINE - rel) / (RELIEF_BASELINE - RELIEF_FLOOR)));
    const relHigh = Math.max(0, Math.min(1, (rel - RELIEF_BASELINE) / (255 - RELIEF_BASELINE)));
    alpha *= 1 + RELIEF_GAIN * relLow - RELIEF_LIFT_DAMP * relHigh;
    alpha = Math.max(0.04, Math.min(0.92, alpha));
    const o = i * 4;
    out[o] = ir;
    out[o + 1] = ig;
    out[o + 2] = ib;
    out[o + 3] = Math.round(alpha * 255);
  }
  const tint = document.createElement('canvas');
  tint.width = w;
  tint.height = h;
  tint.getContext('2d').putImageData(new ImageData(out, w, h), 0, 0);
  return tint;
}

/** Cached on whatever object carries the channels (the canvas itself for the
 *  world wash, a tile's own state for a tile) — by ink colour and theme, so a
 *  paint that has not crossed a theme toggle reuses the same canvas rather
 *  than rebuilding it. */
export function tintFor(store, channels, inkHex, isDark) {
  const key = `${inkHex}|${isDark}`;
  if (store.__tintKey !== key) {
    store.__tintKey = key;
    store.__tintCanvas = buildTint(channels, inkHex, isDark);
  }
  return store.__tintCanvas;
}

/**
 * Which of a tile manifest's entries the current view overlaps, in lon/lat
 * space projected through the map's own `project` — a lon/lat cell's
 * projected corners are still an axis-aligned box (`x` depends only on
 * `lon`, `y` only on `lat`, both monotonic), so this is a plain rectangle
 * test, not a real reprojection. `view` and `frame` are passed in rather
 * than read from module state, since that state is `views/map.js`'s own.
 */
export function visibleTiles(meta, view, frame) {
  if (!meta) return [];
  const topLeft = toWorld(view, 0, 0, frame);
  const bottomRight = toWorld(view, 1, 1, frame);
  const [vx0, vx1] = [Math.min(topLeft.px, bottomRight.px), Math.max(topLeft.px, bottomRight.px)];
  const [vy0, vy1] = [Math.min(topLeft.py, bottomRight.py), Math.max(topLeft.py, bottomRight.py)];
  return meta.filter((tile) => {
    const a = project(tile.lon0, tile.lat0);
    const b = project(tile.lon1, tile.lat1);
    const [tx0, tx1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
    const [ty0, ty1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
    return tx1 >= vx0 && tx0 <= vx1 && ty1 >= vy0 && ty0 <= vy1;
  });
}
