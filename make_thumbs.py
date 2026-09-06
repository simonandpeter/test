"""Generates two derivatives next to each image in saints/*/images/.

`-thumb.jpg` is the blurred low-quality placeholder a card paints instantly
before the full-res image decodes. `-card.jpg` is the picture a *card* actually
shows. Run as `npm run thumbs`; the manifest build fails loudly on any image
missing either of them.

The thumb deliberately uses the v3 PSD pipeline's exact quarter-size + blur
recipe rather than its own: the site derives each card's box from its image's
pixel dimensions, so placeholders produced at two different scales would make
one saint render several times the size of its neighbour. Keep these constants
in step with render_v3_saints.py (in the parent folder).

**The card derivative is new on 2026-09-06 and it is the carousel's whole
loading problem.** The All Saints row was fetching `icon.jpg` itself — a median
of 283 kB and a maximum of 1.04 MB, 42.3 MB across the 130 icons — to draw a
picture 150 px wide on a phone. The thumb could not stand in for it: at a
quarter scale and blurred it is visibly soft at any real card size, which is
what it is *for*. So this writes a third thing, sharp, capped at `CARD_MAX_PX`
on its long edge — enough for the widest card the row ever draws (300 CSS px)
at two device pixels each, and for a phone's 150 at three — at a quality that
holds an icon's gold. It averages ~49 kB, which is the same picture for a
sixth of the bytes.

Progressive on purpose: a card that arrives coarse and sharpens reads as
loading, where one that paints top-down reads as broken.
"""
import os
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "saints")
THUMB_SCALE = 4
THUMB_BLUR_RADIUS = 4.0
JPEG_QUALITY = 45

CARD_MAX_PX = 560
CARD_QUALITY = 74

GENERATED = ("-thumb.jpg", "-card.jpg")


def write_thumb(src, dst):
    with Image.open(src) as im:
        im = im.convert("RGB")
        im = im.filter(ImageFilter.GaussianBlur(THUMB_BLUR_RADIUS))
        size = (max(1, im.width // THUMB_SCALE), max(1, im.height // THUMB_SCALE))
        im.resize(size, Image.LANCZOS).save(dst, "JPEG", quality=JPEG_QUALITY, optimize=True)


def write_card(src, dst):
    with Image.open(src) as im:
        im = im.convert("RGB")
        # Never upscale: a small original is already its own card.
        scale = min(1.0, CARD_MAX_PX / max(im.width, im.height))
        size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
        if scale < 1.0:
            im = im.resize(size, Image.LANCZOS)
        im.save(dst, "JPEG", quality=CARD_QUALITY, optimize=True, progressive=True)


for folder in sorted(os.listdir(ROOT)):
    folder_path = os.path.join(ROOT, folder, "images")
    if not os.path.isdir(folder_path):
        continue
    for fname in sorted(os.listdir(folder_path)):
        if not fname.lower().endswith((".png", ".jpg", ".jpeg")):
            continue
        if fname.lower().endswith(GENERATED):
            continue
        src = os.path.join(folder_path, fname)
        base, _ = os.path.splitext(fname)
        for suffix, write in (("-thumb.jpg", write_thumb), ("-card.jpg", write_card)):
            dst = os.path.join(folder_path, f"{base}{suffix}")
            write(src, dst)
            print(f"{folder}/{fname} -> {base}{suffix} ({os.path.getsize(dst)} bytes)")
