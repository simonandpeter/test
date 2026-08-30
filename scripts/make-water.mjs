/**
 * Writes `src/data/water.js` — the world's major lakes and rivers, alongside
 * the coastline `make-land.mjs` already writes.
 *
 * Unlike `make-land.mjs` this has no npm package to read from: `world-atlas`
 * ships land and country polygons only. Natural Earth's rivers and lakes are
 * public domain the same as its coastline, so this fetches them straight from
 * its own GitHub mirror. Run by hand, and only when you have a connection —
 * the output is committed, so a normal `npm ci` + build never needs the
 * network for this.
 *
 *     node scripts/make-water.mjs [--quality=110m|50m] [--precision=1]
 */
import { writeFile, mkdir } from 'node:fs/promises';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const QUALITY = arg('quality', '50m');
// Same rounding as make-land.mjs, and for the same reason: a tenth of a
// degree is ~11 km, finer than the map can draw, and matching it here keeps
// coastline and water reading as one consistent level of detail rather than
// water looking crisper than the land it sits on.
const PRECISION = Number(arg('precision', 1));

const BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson`;

async function fetchGeoJSON(name) {
  const res = await fetch(`${BASE}/${name}`);
  if (!res.ok) throw new Error(`fetching ${name}: ${res.status}`);
  return res.json();
}

const round = (n) => Number(n.toFixed(PRECISION));

// Identical to make-land.mjs's cut — a flat map has an edge the globe does
// not, and a line or ring that crosses it needs splitting at the frame rather
// than drawn as a single stroke clean across the picture.
function splitAtAntimeridian(line) {
  const pieces = [];
  let piece = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const [prevLon, prevLat] = line[i - 1];
    const [lon, lat] = line[i];
    if (Math.abs(lon - prevLon) > 180) {
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

function roundLine(line) {
  const out = [];
  for (const [lon, lat] of line) {
    const p = [round(lon), round(lat)];
    const last = out[out.length - 1];
    if (last && last[0] === p[0] && last[1] === p[1]) continue;
    out.push(p);
  }
  return out;
}

/** Polygons (lakes) as flat rings, exactly LAND's own shape — filled, closed. */
function ringsOf(features) {
  const rings = [];
  for (const f of features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) {
      for (const ring of poly) {
        for (const piece of splitAtAntimeridian(roundLine(ring))) {
          if (piece.length >= 4) rings.push(piece.flat());
        }
      }
    }
  }
  return rings;
}

/** LineStrings (rivers) as flat open paths — stroked, never closed. */
function linesOf(features) {
  const lines = [];
  for (const f of features) {
    const paths = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const path of paths) {
      for (const piece of splitAtAntimeridian(roundLine(path))) {
        if (piece.length >= 2) lines.push(piece.flat());
      }
    }
  }
  return lines;
}

const lakesGeo = await fetchGeoJSON(`ne_${QUALITY}_lakes.geojson`);
const riversGeo = await fetchGeoJSON(`ne_${QUALITY}_rivers_lake_centerlines.geojson`);

const LAKES = ringsOf(lakesGeo.features);
const RIVERS = linesOf(riversGeo.features);

const body = `/**
 * The world's major lakes and rivers, for views/map.js. **Generated — do not
 * edit by hand:** \`node scripts/make-water.mjs\`.
 *
 * Natural Earth ${QUALITY} lakes and rivers, public domain, fetched from its own
 * GitHub mirror (no npm package carries this the way \`world-atlas\` carries
 * land). Coordinates are rounded to ${PRECISION} decimal place${PRECISION === 1 ? '' : 's'}
 * (~11 km), the same as \`land.js\`, and flattened to [lon, lat, lon, lat, …]
 * per ring or line.
 *
 * \`LAKES\` are closed rings, filled the way land is. \`RIVERS\` are open paths,
 * stroked rather than filled.
 *
 * Imported dynamically alongside \`land.js\` so it lands in the map's own
 * chunk and never on the boot path.
 */
export const LAKES = ${JSON.stringify(LAKES)};
export const RIVERS = ${JSON.stringify(RIVERS)};
`;

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../src/data/water.js', import.meta.url), body);

const points = (arr) => arr.reduce((n, r) => n + r.length / 2, 0);
const { gzipSync } = await import('node:zlib');
console.log(
  `water-${QUALITY}, ${PRECISION}dp: ${LAKES.length} lake rings (${points(LAKES)} pts), ` +
    `${RIVERS.length} river lines (${points(RIVERS)} pts), ` +
    `${(body.length / 1024).toFixed(1)} kB raw, ${(gzipSync(body).length / 1024).toFixed(1)} kB gzipped`,
);
