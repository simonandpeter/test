# -*- coding: utf-8 -*-
"""Writes the app's icons: public/icon-192.png and public/icon-512.png for the
PWA, and resources/ for the native shells (2026-09-05).

Run by hand; the output is committed. The drawing is the favicon's own Orthodox
cross (index.html), scaled up and set on the gesso ground, in gold - the same
mark at install size. Maskable: the cross sits inside the 80% safe zone, so a
launcher that stamps a circle or a squircle out of the square keeps the whole
figure (the manifest declares purpose "any maskable" on this basis).

Colours are the light theme's tokens: gesso #ECE5D6 (warmed 2026-09-01, from
#E5E4DD - tokens.css records why) and gold #A98237. The dark theme's gold is
not used on an icon - an install icon is one picture, and the light pair reads
on both the OS's light and dark shelves, which is what the favicon's own
media-query trick cannot do in a PNG. The splash is the one place the dark
pair *is* used, because a splash is drawn once per launch against whichever
theme the OS is in, and `@capacitor/assets` takes a dark variant for that.

**resources/ is what `npx capacitor-assets generate` reads** (docs/APP.md):

    resources/icon-only.png         1024 x 1024, the whole mark on gesso
    resources/icon-foreground.png   1024 x 1024, the cross alone, transparent
    resources/icon-background.png   1024 x 1024, plain gesso
    resources/splash.png            2732 x 2732, a small cross on gesso
    resources/splash-dark.png       2732 x 2732, the same on bole clay

Android's adaptive icon is the foreground over the background, and the
launcher masks it to a circle, a squircle or a rounded square of its own
choosing; the cross at 60% of the tile is well inside the 66/108 safe disc
Android promises to keep. iOS takes the whole mark and rounds its own corners.
"""
import os

from PIL import Image, ImageDraw

GESSO = (0xEC, 0xE5, 0xD6, 255)
GOLD = (0xA9, 0x82, 0x37, 255)
# The dark theme's pair (tokens.css `html.dark`): bole clay under burnished leaf.
BOLE = (0x1A, 0x14, 0x12, 255)
GOLD_DARK = (0xC7, 0x9A, 0x4B, 255)
CLEAR = (0, 0, 0, 0)

# The favicon's geometry, in its own 16-unit box (index.html): an upright, two
# straight crossbars, and the slanted footrest of the Russian cross.
BOX = 16.0
RECTS = [
    (7, 1, 2, 13.4),   # upright
    (5, 2.6, 6, 1.5),  # top bar
    (3, 5.6, 10, 2),   # main bar
]
FOOT = [(4, 9.8), (12, 11.4), (12, 13), (4, 11.4)]  # the slant


def draw(size, ground=GESSO, ink=GOLD, span=0.6):
    """The cross, `span` of the tile wide, centred on `ground`."""
    img = Image.new('RGBA', (size, size), ground)
    d = ImageDraw.Draw(img)
    # The safe zone: the figure spans 60% of the tile, centred, which keeps it
    # comfortably inside the 80% circle a maskable icon must survive.
    scale = size * span / BOX
    off = (size - BOX * scale) / 2
    at = lambda x, y: (off + x * scale, off + y * scale)
    for x, y, w, h in RECTS:
        d.rectangle([at(x, y), at(x + w, y + h)], fill=ink)
    d.polygon([at(x, y) for x, y in FOOT], fill=ink)
    return img


for size in (192, 512):
    draw(size).save('public/icon-%d.png' % size)
    print('wrote public/icon-%d.png' % size)

os.makedirs('resources', exist_ok=True)
draw(1024).save('resources/icon-only.png')
draw(1024, ground=CLEAR).save('resources/icon-foreground.png')
Image.new('RGBA', (1024, 1024), GESSO).save('resources/icon-background.png')
# A splash is a whole screen, so the mark is small on it: a fifth of the short
# edge, the way a printer's device sits on an otherwise empty page.
draw(2732, span=0.2).save('resources/splash.png')
draw(2732, ground=BOLE, ink=GOLD_DARK, span=0.2).save('resources/splash-dark.png')
for name in ('icon-only', 'icon-foreground', 'icon-background', 'splash', 'splash-dark'):
    print('wrote resources/%s.png' % name)
