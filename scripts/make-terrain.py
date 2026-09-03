# -*- coding: utf-8 -*-
"""Writes the map's terrain layer, for views/map.js: a whole-world wash
(`src/data/terrain-green.webp`, `terrain-relief.webp`) plus a grid of
higher-resolution tiles (`src/data/terrain-tiles/`, indexed by
`src/data/terrain-tiles.js`) that map.js fetches on demand past `DETAIL_AT`.

Run by hand, not by the build; the output is committed, the same rule
`make-land.mjs`/`make-water.mjs` follow for the coastline and water beside it.
Natural Earth is public domain, fetched from its own CDN (`naciscdn.org`) -
there is no npm package for raster relief the way `world-atlas` carries land,
so this is Python (Pillow + numpy, already the corpus's own image tooling)
rather than a second `.mjs` growing a zip/TIFF-reading dependency this repo
does not otherwise need.

Two source rasters, both the 50m tier:
  - SR_50M   - shaded relief alone, grayscale.
  - HYP_50M_SR_W - the same relief with a hypsometric (elevation) colour tint,
    green at low elevation and tan/brown at high - which is what "desert" and
    "forest" mean here. It is elevation-based coloring, not a vegetation
    survey; the corpus does not have one, and this is what a map's shading
    has meant for a century.

Neither ships as-is: the map is drawn in a flat Mercator (`lib/mercator.js`,
MAX_LAT 83, matched below by hand since a Python script cannot import it),
and Natural Earth's rasters are plain equirectangular (their own .prj is a
bare geographic CRS). Dropped in unprojected, the coastline the two are meant
to sit under is wrong by hundreds of pixels at high latitude - Canada and
Scandinavia visibly so - so this reprojects to the same fractional space
`project(lon, lat)` returns before anything is written.

The output is two separate grayscale images, not one picture: `terrain-green.webp`
is a green<->sand index (0 sand, 255 green, from the colour raster's own hue -
see `greenness` below), `terrain-relief.webp` is the relief raster's own
luminance. Two files rather than one RGB-packed one on purpose - lossy WebP's
chroma subsampling halves the resolution of whatever rides in the colour
channels, which is fine for a photograph and not for two independent data
channels being asked to survive at full precision. Grayscale WebP has no
chroma to subsample. `map.js` turns the pair into ink at a shade and alpha it
computes itself, so the palette lives in one place (`tokens.css`) and this
file never needs regenerating when it is retuned - only when the projection's
own MAX_LAT changes.

A lossless encoding of this data (PNG, or lossless WebP) runs 2-3 MB: real
elevation data is noisy at the pixel level in a way land and water's own
coastlines are not, and nothing here needs that noise preserved exactly - it
is a soft, indicative wash under the coastline, not a scientific layer. Lossy
WebP at a modest width is what makes that trade honestly rather than by
accident.

**Why a whole-world image is not enough, and a tile grid is.** A single
raster light enough to ship covers 360 degrees in a couple of thousand
pixels - a few pixels per degree - so zooming in on one saint's own town asks
it to hold detail it never had. The source data itself carries far more
(30 px/degree at this 50m tier, the same density `land.js`/`water.js` already
draw the coastline at); the problem was always distribution, not the data.
So this also cuts the *native*-resolution raster into a grid of tiles
(`TILE_COLS` x `TILE_ROWS`, each a lon/lat cell) and writes an index of their
bounds rather than a bigger single image. `map.js` fetches only the tiles a
reader's own view actually overlaps, past `DETAIL_AT` - the same "a reader
who never opens the map never pays for it" reasoning `ensureFine` already
applies to the fine coastline, one level further in. Every tile is still cut
to `MAX_LAT`, same as the world wash: nothing this corpus ever locates a
saint past 83 degrees, and a tile up there would be pure ocean or ice.

**A third tier, for the ground this corpus actually stands on** (2026-09-04):
the 10m tier - `SR_HR`/`HYP_HR_SR_OB_DR`, 60 px/degree, twice the 50m tier's
own density - regenerated for whichever of the 72 cells fall within 1000 km
of a saint's own recorded location (`data/manifest.json`, built first -
`npm run build:manifest` - since this script has no reason to carry a second
reader of the corpus). China, India, the continental US and Australia are
excluded from *triggering* a tile even where a located saint sits inside
them - not because their ground matters less, but because the 10m tier is
four times the pixels of the 50m one for the same cell, and a handful of
saints scattered across those countries' own scale would ask for tiles an
order of magnitude larger than the rest of the grid combined for very little
of this corpus to show there. In practice nothing in the corpus falls inside
any of the four today, so the exclusion is a ceiling on the file this script
writes as the corpus grows, not a live cut. `terrain-tiles.js` marks each
qualifying cell `hr: true`; `map.js` only asks for the pair a cell's own
entry says exists, so the absence never costs a failed request.

    python scripts/make-terrain.py [--width 2048] [--quality 78] [--tile-quality 80] [--skip-hr]
"""
import argparse
import io
import math
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

BASE = 'https://naciscdn.org/naturalearth/50m/raster'
RELIEF_ZIP = f'{BASE}/SR_50M.zip'
COLOUR_ZIP = f'{BASE}/HYP_50M_SR_W.zip'

BASE_HR = 'https://naciscdn.org/naturalearth/10m/raster'
RELIEF_ZIP_HR = f'{BASE_HR}/SR_HR.zip'
COLOUR_ZIP_HR = f'{BASE_HR}/HYP_HR_SR_OB_DR.zip'
HR_PX_PER_DEG = 60  # the 10m tier's own native density - twice the 50m tier's

# Excludes a *saint's own location* from triggering an HR tile, not a tile
# whose box merely overlaps one of these - see the module docstring.
EXCLUDE_BOXES = {
    'usa': (-125, -66, 24, 49),
    'china': (73, 135, 18, 53),
    'india': (68, 97, 8, 37),
    'australia': (113, 154, -44, -10),
}

# A rough sphere is plenty at 1000 km: the corpus's own coordinates already
# carry `uncertainty_km` of 50 or more, and this is a build-time cell
# selection, not a distance printed to a reader.
EARTH_RADIUS_KM = 6371

# lib/mercator.js's own MAX_LAT - kept in sync by hand, checked by eye against
# the coastline in the mockup rather than by a test, since this script only
# runs when someone reaches for it and a drift would be visibly wrong the
# next time it runs, not silently wrong forever.
MAX_LAT = 83

# The hues Natural Earth's hypsometric tint actually uses at this corpus's own
# geography (sampled from real pixels - Greek hillside, Anatolian plateau,
# Negev desert - while building this), not textbook "green" and "brown".
GREEN_HUE = 155 / 360
SAND_HUE = 30 / 360


def merc_y(lat_deg):
    return math.log(math.tan(math.pi / 4 + math.radians(lat_deg) / 2))


TOP = merc_y(MAX_LAT)
BOTTOM = merc_y(-MAX_LAT)
ASPECT = 360 / ((TOP - BOTTOM) * (180 / math.pi))


def fetch_tif(url, member_suffix):
    print(f'fetching {url}')
    with urllib.request.urlopen(url) as resp:
        data = resp.read()
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        name = next(n for n in z.namelist() if n.endswith(member_suffix))
        return Image.open(io.BytesIO(z.read(name))).copy()


def rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    maxc = np.max(rgb, axis=-1)
    minc = np.min(rgb, axis=-1)
    delta = maxc - minc
    s = np.where(maxc == 0, 0, delta / np.where(maxc == 0, 1, maxc))
    rc = np.where(delta == 0, 0, (maxc - r) / np.where(delta == 0, 1, delta))
    gc = np.where(delta == 0, 0, (maxc - g) / np.where(delta == 0, 1, delta))
    bc = np.where(delta == 0, 0, (maxc - b) / np.where(delta == 0, 1, delta))
    h = np.select([maxc == r, maxc == g, maxc == b], [bc - gc, 2.0 + rc - bc, 4.0 + gc - rc], default=0.0)
    h = (h / 6.0) % 1.0
    return np.where(delta == 0, 0, h), s, maxc


def ang_dist(a, b):
    d = np.abs(a - b) % 1.0
    return np.minimum(d, 1 - d)


def greenness_of(colour_rgb):
    """0 (sand) .. 1 (green), from hue alone; low-saturation pixels (snow,
    bare high rock) fall to a neutral 0.5 rather than a hue that is not
    really there to read."""
    h, s, _ = rgb_to_hsv(colour_rgb.astype(np.float32) / 255)
    dg, ds = ang_dist(h, GREEN_HUE), ang_dist(h, SAND_HUE)
    g = np.clip(ds / (dg + ds + 1e-6), 0, 1)
    sat_w = np.clip(s / 0.12, 0, 1)
    return g * sat_w + 0.5 * (1 - sat_w)


def reproject_box_to_mercator(src_array, lon0, lon1, lat0, lat1, out_w, out_h, is_rgb, area_average=False):
    """Resample one lon/lat box of an equirectangular raster into the same
    fractional Mercator space `project(lon, lat)` returns, at `out_w`x`out_h`.

    Each output *row* still goes through the real inverse-Mercator lookup, so
    content within the box is positioned correctly; the box's own pixel
    dimensions do not otherwise need to match its on-screen Mercator aspect,
    because the browser stretches to whatever rect `toScreen` computes for
    this tile's own bounds at draw time (`buildTerrainTint`/`drawImage` in
    map.js) - a tile's internal density only has to match the *source's*, not
    the projection's.

    **`area_average` is the wash's own honest fix, 2026-09-04** (author: "the
    medium res and high res are still lighter in the green" — after
    `TILE_DARKEN_BIAS`, a flat alpha nudge, had already shipped once for the
    same complaint and had not closed it). The world wash decimates the
    native raster roughly 10x (2048 px across 360 degrees against the
    source's own ~60 px/degree); nearest-neighbour at that ratio is a genuine
    point sample, one lucky-or-unlucky pixel standing in for a ten-pixel-wide
    patch, and which way it errs is noise — a constant bias shifts the
    *average* toward the tile's own reading and leaves any one place still
    wrong in whichever direction its own sample happened to fall, which is
    exactly why the bias alone did not hold up under a second look at a real
    location. A tile is not this decimated (30-60 px/degree against a ~60-120
    px/degree native source, well under 2x), so nearest-neighbour there is
    still an honest sample and this path is wash-only.
    """
    sh, sw = src_array.shape[:2]
    lat_top, lat_bot = max(lat0, lat1), min(lat0, lat1)

    if area_average:
        # A summed-area table per channel: each output pixel becomes the true
        # mean of every native pixel inside its own footprint, computed once
        # in O(source size) rather than per-output-pixel, which is what makes
        # this affordable at the wash's own resolution.
        oy_edges = np.arange(out_h + 1)
        yf0 = (TOP - merc_y(min(MAX_LAT, lat_top))) / (TOP - BOTTOM)
        yf1 = (TOP - merc_y(max(-MAX_LAT, lat_bot))) / (TOP - BOTTOM)
        yy_edges = yf0 + oy_edges / out_h * (yf1 - yf0)
        y_edges = TOP - yy_edges * (TOP - BOTTOM)
        lat_edges = np.degrees(2 * np.arctan(np.exp(y_edges)) - np.pi / 2)
        sy_edges = np.clip(np.round((90 - lat_edges) * (sh / 180)).astype(np.int64), 0, sh)
        sy0, sy1 = sy_edges[:-1], np.maximum(sy_edges[1:], sy_edges[:-1] + 1)

        ox_edges = np.arange(out_w + 1)
        lon_edges = lon0 + ox_edges / out_w * (lon1 - lon0)
        sx_edges = np.clip(np.round((lon_edges + 180) * (sw / 360)).astype(np.int64), 0, sw)
        sx0, sx1 = sx_edges[:-1], np.maximum(sx_edges[1:], sx_edges[:-1] + 1)

        y0 = np.broadcast_to(sy0[:, None], (out_h, out_w))
        y1 = np.broadcast_to(sy1[:, None], (out_h, out_w))
        x0 = np.broadcast_to(sx0[None, :], (out_h, out_w))
        x1 = np.broadcast_to(sx1[None, :], (out_h, out_w))
        count = (y1 - y0) * (x1 - x0)

        def averaged(channel):
            sat = np.zeros((sh + 1, sw + 1), dtype=np.float64)
            sat[1:, 1:] = np.cumsum(np.cumsum(channel.astype(np.float64), axis=0), axis=1)
            total = sat[y1, x1] - sat[y0, x1] - sat[y1, x0] + sat[y0, x0]
            return total / count

        if is_rgb:
            return np.stack([averaged(src_array[:, :, c]) for c in range(3)], axis=-1)
        return averaged(src_array)

    oy = np.arange(out_h)
    yf0 = (TOP - merc_y(min(MAX_LAT, lat_top))) / (TOP - BOTTOM)
    yf1 = (TOP - merc_y(max(-MAX_LAT, lat_bot))) / (TOP - BOTTOM)
    yy = yf0 + oy / out_h * (yf1 - yf0)
    y = TOP - yy * (TOP - BOTTOM)
    lat = np.degrees(2 * np.arctan(np.exp(y)) - np.pi / 2)
    sy = np.clip(np.round((90 - lat) * (sh / 180)).astype(np.int64), 0, sh - 1)

    ox = np.arange(out_w)
    lon = lon0 + ox / out_w * (lon1 - lon0)
    sx = np.clip(np.round((lon + 180) * (sw / 360)).astype(np.int64), 0, sw - 1)

    if is_rgb:
        return src_array[sy[:, None], sx[None, :], :]
    return src_array[sy[:, None], sx[None, :]]


def reproject_to_mercator(src_array, out_w, out_h, is_rgb):
    return reproject_box_to_mercator(src_array, -180, 180, MAX_LAT, -MAX_LAT, out_w, out_h, is_rgb, area_average=True)


# The tile grid past DETAIL_AT: lon/lat cells, native-equivalent density
# (30 px per degree in both directions - the source's own, see the module
# docstring). 12x6 cells x 30 degrees each covers the full world within
# MAX_LAT; a saint's own town is never more than one cell across.
TILE_COLS = 12
TILE_ROWS = 6
NATIVE_PX_PER_DEG = 30


def tile_bounds():
    lons = np.linspace(-180, 180, TILE_COLS + 1)
    lats = np.linspace(MAX_LAT, -MAX_LAT, TILE_ROWS + 1)
    for row in range(TILE_ROWS):
        for col in range(TILE_COLS):
            yield col, row, lons[col], lons[col + 1], lats[row], lats[row + 1]


def in_box(lon, lat, box):
    lon0, lon1, lat0, lat1 = box
    return lon0 <= lon <= lon1 and lat0 <= lat <= lat1


def excluded(lon, lat):
    return any(in_box(lon, lat, b) for b in EXCLUDE_BOXES.values())


def haversine_km(lon1, lat1, lon2, lat2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def saint_points(manifest_path):
    """Every located saint's own (lon, lat), read straight from the built
    manifest - `locations`, not `primary_location` alone, since a saint born
    in one region and buried in another should trigger both."""
    import json

    data = json.loads(Path(manifest_path).read_text(encoding='utf-8'))
    points = []
    for saint in data:
        for loc in saint.get('locations') or []:
            if not excluded(loc['lon'], loc['lat']):
                points.append((loc['lon'], loc['lat']))
    return points


def tile_near_any(lon0, lon1, lat0, lat1, points, radius_km=1000):
    for plon, plat in points:
        clon = min(max(plon, min(lon0, lon1)), max(lon0, lon1))
        clat = min(max(plat, min(lat0, lat1)), max(lat0, lat1))
        if haversine_km(clon, clat, plon, plat) <= radius_km:
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--width', type=int, default=2048)
    ap.add_argument('--quality', type=int, default=78)
    ap.add_argument('--tile-quality', type=int, default=80)
    ap.add_argument('--skip-tiles', action='store_true', help='world wash only, for a quick rebuild')
    ap.add_argument('--skip-hr', action='store_true', help='50m tile grid only, skip the 10m pass')
    ap.add_argument(
        '--manifest',
        default=str(Path(__file__).resolve().parent.parent / 'data' / 'manifest.json'),
        help='built manifest to read saint locations from (npm run build:manifest first)',
    )
    args = ap.parse_args()
    out_w = args.width
    out_h = round(out_w / ASPECT)

    relief_img = fetch_tif(RELIEF_ZIP, '.tif')
    colour_img = fetch_tif(COLOUR_ZIP, '.tif')
    relief_native = np.array(relief_img.convert('L'))
    colour_native = np.array(colour_img.convert('RGB'))

    relief = reproject_to_mercator(relief_native, out_w, out_h, is_rgb=False)
    colour = reproject_to_mercator(colour_native, out_w, out_h, is_rgb=True)
    green = greenness_of(colour)

    green_img = Image.fromarray(np.clip(np.round(green * 255), 0, 255).astype(np.uint8), 'L')
    relief_img_out = Image.fromarray(np.clip(np.round(relief), 0, 255).astype(np.uint8), 'L')

    data_dir = Path(__file__).resolve().parent.parent / 'src' / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    green_path = data_dir / 'terrain-green.webp'
    relief_path = data_dir / 'terrain-relief.webp'
    green_img.save(green_path, 'WEBP', quality=args.quality, method=6)
    relief_img_out.save(relief_path, 'WEBP', quality=args.quality, method=6)

    for path in (green_path, relief_path):
        print(f'{path.name}: {out_w}x{out_h}, {path.stat().st_size / 1024:.1f} kB')

    if args.skip_tiles:
        return

    points = []
    if not args.skip_hr:
        if Path(args.manifest).exists():
            points = saint_points(args.manifest)
            print(f'{len(points)} located-saint points (excluded countries applied)')
        else:
            print(f'no manifest at {args.manifest} - run `npm run build:manifest` first; skipping the 10m pass')
            args.skip_hr = True

    qualifying = set()
    if not args.skip_hr:
        for col, row, lon0, lon1, lat0, lat1 in tile_bounds():
            if tile_near_any(lon0, lon1, lat0, lat1, points):
                qualifying.add((col, row))
        print(f'{len(qualifying)} of {TILE_COLS * TILE_ROWS} tiles within 1000 km of a located saint')

    relief_native_hr = colour_native_hr = None
    if qualifying:
        relief_img_hr = fetch_tif(RELIEF_ZIP_HR, '.tif')
        colour_img_hr = fetch_tif(COLOUR_ZIP_HR, '.tif')
        relief_native_hr = np.array(relief_img_hr.convert('L'))
        colour_native_hr = np.array(colour_img_hr.convert('RGB'))

    tiles_dir = data_dir / 'terrain-tiles'
    tiles_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    total_bytes = 0
    hr_bytes = 0
    for col, row, lon0, lon1, lat0, lat1 in tile_bounds():
        tw = max(2, round((lon1 - lon0) * NATIVE_PX_PER_DEG))
        th = max(2, round(abs(lat1 - lat0) * NATIVE_PX_PER_DEG))

        t_relief = reproject_box_to_mercator(relief_native, lon0, lon1, lat0, lat1, tw, th, is_rgb=False)
        t_colour = reproject_box_to_mercator(colour_native, lon0, lon1, lat0, lat1, tw, th, is_rgb=True)
        t_green = greenness_of(t_colour)

        g_img = Image.fromarray(np.clip(t_green * 255, 0, 255).astype(np.uint8), 'L')
        r_img = Image.fromarray(t_relief.astype(np.uint8), 'L')
        g_path = tiles_dir / f't-{col}-{row}-green.webp'
        r_path = tiles_dir / f't-{col}-{row}-relief.webp'
        g_img.save(g_path, 'WEBP', quality=args.tile_quality, method=6)
        r_img.save(r_path, 'WEBP', quality=args.tile_quality, method=6)
        total_bytes += g_path.stat().st_size + r_path.stat().st_size

        is_hr = (col, row) in qualifying
        if is_hr:
            hw = max(2, round((lon1 - lon0) * HR_PX_PER_DEG))
            hh = max(2, round(abs(lat1 - lat0) * HR_PX_PER_DEG))
            h_relief = reproject_box_to_mercator(relief_native_hr, lon0, lon1, lat0, lat1, hw, hh, is_rgb=False)
            h_colour = reproject_box_to_mercator(colour_native_hr, lon0, lon1, lat0, lat1, hw, hh, is_rgb=True)
            h_green = greenness_of(h_colour)
            hg_img = Image.fromarray(np.clip(h_green * 255, 0, 255).astype(np.uint8), 'L')
            hr_img = Image.fromarray(h_relief.astype(np.uint8), 'L')
            hg_path = tiles_dir / f't-{col}-{row}-green-hr.webp'
            hr_path = tiles_dir / f't-{col}-{row}-relief-hr.webp'
            hg_img.save(hg_path, 'WEBP', quality=args.tile_quality, method=6)
            hr_img.save(hr_path, 'WEBP', quality=args.tile_quality, method=6)
            hr_bytes += hg_path.stat().st_size + hr_path.stat().st_size

        manifest.append(
            {
                'col': col,
                'row': row,
                'lon0': round(lon0, 4),
                'lon1': round(lon1, 4),
                'lat0': round(lat0, 4),
                'lat1': round(lat1, 4),
                'hr': is_hr,
            }
        )

    import json

    body = (
        "/**\n"
        " * The terrain tile grid's own bounds - generated, do not edit by hand:\n"
        " * `python scripts/make-terrain.py`. Each entry names a lon/lat cell;\n"
        " * `map.js` projects the bounds itself (`lib/mercator.js`'s own\n"
        " * `project`) rather than reading a pre-projected fraction from here, so\n"
        " * there is one place the projection math lives. The tiles themselves are\n"
        " * `terrain-tiles/t-{col}-{row}-green.webp` and `-relief.webp` (50m tier,\n"
        " * every cell); `hr: true` cells also carry `-green-hr.webp`/`-relief-hr.webp`\n"
        " * (10m tier, within 1000km of a located saint - see the script's own header).\n"
        " */\n"
        f"export const TILE_COLS = {TILE_COLS};\n"
        f"export const TILE_ROWS = {TILE_ROWS};\n"
        f"export const TILES = {json.dumps(manifest)};\n"
    )
    (data_dir / 'terrain-tiles.js').write_text(body, encoding='utf-8')

    print(
        f'{len(manifest)} tiles ({TILE_COLS}x{TILE_ROWS}), '
        f'{total_bytes / 1024:.1f} kB total, {total_bytes / len(manifest) / 1024:.1f} kB avg/tile pair'
    )
    if qualifying:
        print(f'{len(qualifying)} tiles with an HR pair, {hr_bytes / 1024:.1f} kB total')


if __name__ == '__main__':
    main()
