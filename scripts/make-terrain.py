# -*- coding: utf-8 -*-
"""Writes src/data/terrain.png - the map's terrain layer, for views/map.js.

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

    python scripts/make-terrain.py [--width 2048] [--quality 78]
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


def reproject_to_mercator(src_array, out_w, out_h, is_rgb):
    """Resample an equirectangular (plain lat/lon) raster into the same
    fractional Mercator space `project(lon, lat)` returns - the map's canvas
    then only ever has to scale and translate this, never reproject it."""
    sh, sw = src_array.shape[:2]
    oy = np.arange(out_h)
    yy = oy / out_h
    y = TOP - yy * (TOP - BOTTOM)
    lat = np.degrees(2 * np.arctan(np.exp(y)) - np.pi / 2)
    sy = np.clip(np.round((90 - lat) * (sh / 180)).astype(np.int64), 0, sh - 1)

    ox = np.arange(out_w)
    lon = ox / out_w * 360 - 180
    sx = np.clip(np.round((lon + 180) * (sw / 360)).astype(np.int64), 0, sw - 1)

    if is_rgb:
        return src_array[sy[:, None], sx[None, :], :]
    return src_array[sy[:, None], sx[None, :]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--width', type=int, default=2048)
    ap.add_argument('--quality', type=int, default=78)
    args = ap.parse_args()
    out_w = args.width
    out_h = round(out_w / ASPECT)

    relief_img = fetch_tif(RELIEF_ZIP, '.tif')
    colour_img = fetch_tif(COLOUR_ZIP, '.tif')

    relief = reproject_to_mercator(np.array(relief_img.convert('L')), out_w, out_h, is_rgb=False)
    colour = reproject_to_mercator(np.array(colour_img.convert('RGB')), out_w, out_h, is_rgb=True)
    green = greenness_of(colour)

    green_img = Image.fromarray(np.clip(green * 255, 0, 255).astype(np.uint8), 'L')
    relief_img_out = Image.fromarray(relief.astype(np.uint8), 'L')

    data_dir = Path(__file__).resolve().parent.parent / 'src' / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    green_path = data_dir / 'terrain-green.webp'
    relief_path = data_dir / 'terrain-relief.webp'
    green_img.save(green_path, 'WEBP', quality=args.quality, method=6)
    relief_img_out.save(relief_path, 'WEBP', quality=args.quality, method=6)

    for path in (green_path, relief_path):
        print(f'{path.name}: {out_w}x{out_h}, {path.stat().st_size / 1024:.1f} kB')


if __name__ == '__main__':
    main()
