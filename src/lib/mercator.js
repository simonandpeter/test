/**
 * A Mercator projection, which is the whole of the map's geometry.
 *
 * The brief's §8.3 asks for a `d3-geo` orthographic globe, canvas-rendered and
 * draggable to rotate. **Reversed by the author, 2026-08-29:** "just do a
 * simple mercator projection 2d map for now, something very light." A globe
 * needs d3-geo and a TopoJSON decoder; this needs neither, so the map ships
 * with no runtime dependency at all and the only weight is the coastline
 * itself. Recorded rather than absorbed — the globe is not refuted, it is
 * deferred, and the reasoning for it is still in §8.3.
 *
 * Pure arithmetic and no DOM, so the unit suite can hold it to known
 * landmarks rather than a browser test having to read pixels.
 */

/**
 * Mercator's y runs to infinity at the poles, so every implementation picks a
 * cutoff. 83 degrees, not the 85.051 of web mapping's square tile: the square
 * is an artefact of wanting the world to be as tall as it is wide, and nothing
 * here is tiled. 83 keeps the north Greenland and Svalbard coastlines that
 * Natural Earth actually carries, and drops the Antarctic fringe that Mercator
 * would otherwise stretch across the bottom third of the picture.
 */
export const MAX_LAT = 83;

const rad = (deg) => (deg * Math.PI) / 180;

/** The projection's own y, before any box is chosen. Unbounded by design. */
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2));

const TOP = mercY(MAX_LAT);
const BOTTOM = mercY(-MAX_LAT);

/**
 * Longitude and latitude to a fraction of the box, x and y each in 0..1 with y
 * measured downward as canvas and CSS both measure it.
 *
 * Latitude is clamped rather than dropped: a point past the cutoff is a real
 * place and belongs at the edge of the picture, not missing from it. The
 * clamping is why this returns a fraction and not a pixel — the caller owns
 * the box, and the map is drawn at several sizes.
 */
export function project(lon, lat) {
  const y = mercY(Math.min(MAX_LAT, Math.max(-MAX_LAT, lat)));
  return {
    x: (lon + 180) / 360,
    y: (TOP - y) / (TOP - BOTTOM),
  };
}

/**
 * The aspect ratio the projection wants, width over height. Not 1: the world
 * is 360 degrees wide and only 166 tall at this cutoff, and forcing a square
 * would stretch every coastline vertically. The map's CSS takes this number so
 * the box is reserved before the canvas draws — a box that resized after the
 * data arrived would be the layout shift §13 forbids.
 */
export const ASPECT = 360 / ((TOP - BOTTOM) * (180 / Math.PI));
