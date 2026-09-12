"""Generates three derivatives next to each image in saints/*/images/.

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

**And a second card size on 2026-09-12, because one was still the wrong one.**
`-card.jpg` is sized for the widest card the site draws at two device pixels —
which is the right file for a desk, and four times the pixels a phone needs.
Measured on the production build at 360 px, DPR 1: the carousel's first
screenful fetched 11 pictures for 525 kB to draw two, one of them a 560x373
file at 48 kB inside a 150x100 CSS box. `-card-sm.jpg` is the same picture at
`CARD_SM_MAX_PX`, and the markup names both in a `srcset` with the card's own
CSS width as `sizes`, so the browser picks rather than the build guessing.

Two sizes and not three: 280 covers a phone's 150 CSS px card at one device
pixel and its 48 px row thumbnail at any, and everything denser than that
reaches for the 560 it always had. A 48 px row is still handed 280 px of
picture at DPR 1, which is the next derivative down if one is ever wanted.
"""
import os
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "saints")
THUMB_SCALE = 4
THUMB_BLUR_RADIUS = 4.0
JPEG_QUALITY = 45

CARD_MAX_PX = 560
CARD_QUALITY = 74

CARD_SM_MAX_PX = 280

GENERATED = ("-thumb.jpg", "-card.jpg", "-card-sm.jpg")


def write_thumb(src, dst):
    with Image.open(src) as im:
        im = im.convert("RGB")
        im = im.filter(ImageFilter.GaussianBlur(THUMB_BLUR_RADIUS))
        size = (max(1, im.width // THUMB_SCALE), max(1, im.height // THUMB_SCALE))
        im.resize(size, Image.LANCZOS).save(dst, "JPEG", quality=JPEG_QUALITY, optimize=True)


def write_card_at(src, dst, longest):
    with Image.open(src) as im:
        im = im.convert("RGB")
        # Never upscale: a small original is already its own card.
        scale = min(1.0, longest / max(im.width, im.height))
        size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
        if scale < 1.0:
            im = im.resize(size, Image.LANCZOS)
        im.save(dst, "JPEG", quality=CARD_QUALITY, optimize=True, progressive=True)


def write_card(src, dst):
    write_card_at(src, dst, CARD_MAX_PX)


def write_card_sm(src, dst):
    write_card_at(src, dst, CARD_SM_MAX_PX)


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
        for suffix, write in (
            ("-thumb.jpg", write_thumb),
            ("-card.jpg", write_card),
            ("-card-sm.jpg", write_card_sm),
        ):
            dst = os.path.join(folder_path, f"{base}{suffix}")
            write(src, dst)
            print(f"{folder}/{fname} -> {base}{suffix} ({os.path.getsize(dst)} bytes)")
