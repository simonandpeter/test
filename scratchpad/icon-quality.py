# -*- coding: utf-8 -*-
"""TODO 15's missing half: rank the icons the corpus already holds.

The item asks for "a worklist ordered by how much a reader would gain, not an
alphabetical sweep", and nothing had produced one. This measures every
`saints/*/images/icon.jpg` on the three axes the item names and prints the
worst first.

What is measured, and why each one is a thing a reader sees:

  - **tones** — distinct quantised luminance levels over a sample. A line
    engraving thresholded to pure black and white has two or three; a
    manuscript miniature has dozens. This is the axis Dionysius the Areopagite
    failed on, which is the case the author raised.
  - **colour** — mean saturation. A greyscale scan reads as a photocopy beside
    a gold-ground miniature even when its tones are plentiful.
  - **width** against `HERO_W_PX` (1000). `make_thumbs.py` never upscales, so
    anything narrower paints at its native width inside the hero's slot. The
    Menaion Reader plates are the standing case: roughly 1:3 strips at 560-670
    px, presence rather than quality.
  - **aspect** — reported, and then largely discounted. `lib/hero-crop.js`
    exists for exactly this: `MIN_HERO_RATIO` is 1:1.6 and a taller image is
    cropped favouring the TOP edge, by the author's instruction of 2026-09-01.
    On a full-length standing figure that is the face, so a 1:3 plate is what
    the crop rule was written for rather than a defect it reveals. That is
    reasoned from the rule, NOT measured on a page.

**So the finding this produced is that width is the live axis and tone is not.**
Bichrome is zero: the thresholded 1-bit engraving the item was written about —
Dionysius the Areopagite's — has no remaining instance in the corpus. What there
is instead is a Menaion Reader plate series that is honestly greyscale, which
the author accepted 18 more of, and narrow.

The score is a sum of those four deficits, each normalised to 0..1, so it is a
ranking and not a measurement of anything in the world. **Every row is a
question**: a bichrome engraving may be the only free image of that saint, which
is what the item's own Commons half is for. `scripts/date-citation-audit.mjs`
and the rest of this repo's audits say the same of their rows.

Usage: python scratchpad/icon-quality.py [top-n]
"""
import glob
import io
import json
import os
import sys

from PIL import Image

HERO_W = 1000
HERO_ASPECT = 1.0  # the hero slot is near square; a 1:3 strip is the failure
top = int(sys.argv[1]) if len(sys.argv) > 1 else 40

manifest = {}
if os.path.exists('data/manifest.json'):
    for card in json.load(io.open('data/manifest.json', encoding='utf-8')):
        manifest[card['slug']] = card.get('display_name', card['slug'])

rows = []
for path in sorted(glob.glob('saints/*/images/icon.jpg')):
    slug = os.path.basename(os.path.dirname(os.path.dirname(path)))
    try:
        im = Image.open(path)
        w, h = im.size
        small = im.convert('RGB').resize((64, 64))
    except Exception as exc:  # a truncated or unreadable file is itself a finding
        rows.append((9.0, slug, 0, 0, 0, 0.0, 'UNREADABLE: %s' % exc))
        continue

    px = list(small.getdata())
    # Luminance levels, quantised to 16 buckets: a thresholded engraving
    # occupies two of them and a miniature most.
    lum = {int((0.299 * r + 0.587 * g + 0.114 * b)) >> 4 for r, g, b in px}
    tones = len(lum)
    # Saturation without colorsys per pixel: (max-min)/max is the HSV S.
    sat = 0.0
    for r, g, b in px:
        hi, lo = max(r, g, b), min(r, g, b)
        if hi:
            sat += (hi - lo) / hi
    sat /= len(px)

    aspect = w / h if h else 0
    d_tones = max(0.0, (8 - tones) / 8.0)
    d_colour = max(0.0, (0.25 - sat) / 0.25)
    d_width = max(0.0, (HERO_W - w) / HERO_W)
    d_aspect = min(1.0, abs(aspect - HERO_ASPECT))
    score = d_tones + d_colour + d_width + d_aspect
    rows.append((score, slug, w, h, tones, sat, ''))

rows.sort(reverse=True)
print('%d icons measured. Worst %d by reader gain:\n' % (len(rows), min(top, len(rows))))
print('%-6s %-44s %10s %6s %6s  %s' % ('score', 'slug', 'size', 'tones', 'sat', 'name'))
for score, slug, w, h, tones, sat, note in rows[:top]:
    print(
        '%-6.2f %-44s %5dx%-4d %6d %6.3f  %s%s'
        % (score, slug[:44], w, h, tones, sat, manifest.get(slug, '')[:28], note)
    )

bichrome = [r for r in rows if r[4] <= 3]
grey = [r for r in rows if r[5] < 0.06]
narrow = [r for r in rows if r[2] < 700]
strip = [r for r in rows if r[3] and (r[2] / r[3]) < 0.5]
print('\nbichrome (3 tones or fewer) : %d' % len(bichrome))
print('near-greyscale (sat < 0.06) : %d' % len(grey))
print('narrower than 700px         : %d' % len(narrow))
print('a strip, under 1:2          : %d' % len(strip))
print('\nEvery row is a question: the worst image may be the only free one of that saint.')
