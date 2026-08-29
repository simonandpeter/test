# -*- coding: utf-8 -*-
"""Writes public/icon-192.png and public/icon-512.png - the PWA's icons.

Run by hand; the output is committed. The drawing is the favicon's own Orthodox
cross (index.html), scaled up and set on the gesso ground, in gold - the same
mark at install size. Maskable: the cross sits inside the 80% safe zone, so a
launcher that stamps a circle or a squircle out of the square keeps the whole
figure (the manifest declares purpose "any maskable" on this basis).

Colours are the light theme's tokens: gesso #E5E4DD, gold #A98237. The dark
theme's gold is not used - an install icon is one picture, and the light pair
reads on both the OS's light and dark shelves, which is what the favicon's own
media-query trick cannot do in a PNG.
"""
from PIL import Image, ImageDraw

GESSO = (0xE5, 0xE4, 0xDD, 255)
GOLD = (0xA9, 0x82, 0x37, 255)

# The favicon's geometry, in its own 16-unit box (index.html): an upright, two
# straight crossbars, and the slanted footrest of the Russian cross.
BOX = 16.0
RECTS = [
    (7, 1, 2, 13.4),   # upright
    (5, 2.6, 6, 1.5),  # top bar
    (3, 5.6, 10, 2),   # main bar
]
FOOT = [(4, 9.8), (12, 11.4), (12, 13), (4, 11.4)]  # the slant


def draw(size):
    img = Image.new('RGBA', (size, size), GESSO)
    d = ImageDraw.Draw(img)
    # The safe zone: the figure spans 60% of the tile, centred, which keeps it
    # comfortably inside the 80% circle a maskable icon must survive.
    scale = size * 0.6 / BOX
    off = (size - BOX * scale) / 2
    at = lambda x, y: (off + x * scale, off + y * scale)
    for x, y, w, h in RECTS:
        d.rectangle([at(x, y), at(x + w, y + h)], fill=GOLD)
    d.polygon([at(x, y) for x, y in FOOT], fill=GOLD)
    return img


for size in (192, 512):
    draw(size).save('public/icon-%d.png' % size)
    print('wrote public/icon-%d.png' % size)
