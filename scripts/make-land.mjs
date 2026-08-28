/**
 * Writes `src/data/land.js` — the world's coastline, as coarse as the map can
 * bear and no coarser.
 *
 * Run by hand, not by the build: the output is committed, because the map must
 * not depend on `world-atlas` and `topojson-client` being installable on
 * whatever machine builds the site in five years. Both are devDependencies and
 * neither reaches the bundle.
 *
 *     node scripts/make-land.mjs [--quality=110m|50m] [--precision=1]
 *
 * **Natural Earth is public domain** (no rights reserved), which is the reason
 * it is the one bundled here rather than anything prettier.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { feature } from 'topojson-client';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const QUALITY = arg('quality', '110m');
// One decimal place is about 11 km at the equator, which is finer than a 360 px
// world map can draw: at that width a whole degree of longitude is a single
// pixel. Two would double the file for detail no reader can see.
const PRECISION = Number(arg('precision', 1));

const topo = JSON.parse(await readFile(new URL(`../node_modules/world-atlas/land-${QUALITY}.json`, import.meta.url), 'utf8'));
const land = feature(topo, topo.objects.land);

const round = (n) => Number(n.toFixed(PRECISION));

/**
 * Cut a ring where it crosses the antimeridian, into one piece per side.
 *
 * **This is not a nicety.** A flat map has an edge where the globe does not, so
 * a ring that walks from 178°E to 179°W is one short step in the world and the
 * entire width of the picture on the page — and a filled path draws it as such.
 * Left in, it put three horizontal bars across the finished map: Chukotka at 65
 * and 71 north, Fiji at 17 south, each a coastline stepping over the edge.
 *
 * The cut lands on the edge itself, at the latitude the segment actually
 * crosses it, so the two pieces meet the frame instead of stopping short of it.
 */
function splitAtAntimeridian(ring) {
  const pieces = [];
  let piece = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const [prevLon, prevLat] = ring[i - 1];
    const [lon, lat] = ring[i];
    if (Math.abs(lon - prevLon) > 180) {
      // Which edge this segment leaves by, then the same point in one
      // unbroken frame of longitude so the crossing can be interpolated.
      const side = prevLon > 0 ? 1 : -1;
      const unwrapped = lon + side * 360;
      const t = (side * 180 - prevLon) / (unwrapped - prevLon);
      const edgeLat = prevLat + (lat - prevLat) * t;
      piece.push([side * 180, edgeLat]);
      pieces.push(piece);
      piece = [[-side * 180, edgeLat], [lon, lat]];
    } else {
      piece.push([lon, lat]);
    }
  }
  pieces.push(piece);
  return pieces;
}

/*
 * Rings, not GeoJSON. The map draws filled outlines and asks nothing else of
 * this data — no properties, no feature identity, no holes-versus-shells
 * distinction beyond what `fill` already does with a single path. So it ships
 * as a flat array of coordinate rings and the renderer stays a loop.
 *
 * Consecutive duplicate points are dropped: rounding to a tenth of a degree
 * collapses a lot of Norway into the same point twice, and a repeated vertex
 * costs bytes and draws nothing.
 */
const rings = [];
let cuts = 0;
for (const f of land.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    for (const ring of poly) {
      const out = [];
      for (const [lon, lat] of ring) {
        const p = [round(lon), round(lat)];
        const last = out[out.length - 1];
        if (last && last[0] === p[0] && last[1] === p[1]) continue;
        out.push(p);
      }
      const pieces = splitAtAntimeridian(out);
      cuts += pieces.length - 1;
      // A ring needs three distinct points to enclose anything. Below that it
      // is an islet the rounding has already erased.
      for (const piece of pieces) if (piece.length >= 4) rings.push(piece.flat());
    }
  }
}

const body = `/**
 * The world's coastline, for views/map.js. **Generated — do not edit by hand:**
 * \`node scripts/make-land.mjs\`.
 *
 * Natural Earth ${QUALITY} land, public domain, via the \`world-atlas\` package.
 * Coordinates are rounded to ${PRECISION} decimal place${PRECISION === 1 ? '' : 's'}
 * (~11 km) and flattened to [lon, lat, lon, lat, …] per ring — a world map a few
 * hundred pixels wide cannot draw finer, and the flat form halves the JSON
 * punctuation, which is most of what gzip is asked to carry here.
 *
 * Imported dynamically so it lands in its own chunk and never on the boot path.
 */
export const LAND = ${JSON.stringify(rings)};
`;

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../src/data/land.js', import.meta.url), body);

const points = rings.reduce((n, r) => n + r.length / 2, 0);
const { gzipSync } = await import('node:zlib');
console.log(
  `land-${QUALITY}, ${PRECISION}dp: ${rings.length} rings (${cuts} antimeridian cuts), ${points} points, ` +
    `${(body.length / 1024).toFixed(1)} kB raw, ${(gzipSync(body).length / 1024).toFixed(1)} kB gzipped`,
);
