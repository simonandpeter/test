"""Generates seven derivatives next to each image in saints/*/images/.

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

**And both card sizes again in WebP on 2026-09-12, which is a format and not
a fourth size.** The two caps stay exactly where they are and the same resize
feeds both encoders, so a WebP is never a different picture from the JPEG it
stands in for — only a cheaper one: 20% fewer bytes at 560 and 28% at 280, at
a *higher* PSNR against the source than the JPEG manages. `CARD_WEBP_QUALITY`
carries the measurement.

They are additions, not replacements. The JPEGs stay because they are the
fallback arm of the `<picture>` that has to name both, and because nothing
serves the WebP yet — see `CARD_WEBP_QUALITY` for the two places that have to
learn about it first.

**And the row derivative the paragraph above nominated, on the same day.** "A
48 px row is still handed 280 px of picture at DPR 1" was written as a thing
someone might want one day; it is in fact a 4.9x over-fetch on every row the
Index and the shelf draw, and the reason it read as hypothetical is that the
probe watching for exactly this cannot see it. `ROW_SHORT_PX` has the
measurement, the arithmetic, and the instrument bug.
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

# **The same two cards again in WebP (2026-09-12), and the quality is chosen
# against the JPEG rather than against a number.** Re-encoded from the
# *original* each time, not from the JPEG beside it: a WebP made out of a
# quality-74 JPEG inherits that JPEG's artefacts and then spends bytes
# preserving them, which measured 80.7% of the JPEG where encoding from the
# source measures 80.0% at a visibly better picture.
#
# 68 is where WebP is smaller *and* closer to the source than the JPEG it
# mirrors, measured over a 30-icon sample (seed 11) at this desk:
#
#   cap 560   jpeg q74  1,450,434 B  32.5 dB    webp q68  1,156,392 B  33.4 dB
#   cap 280   jpeg q74    395,242 B  32.0 dB    webp q68    284,294 B  32.7 dB
#
# — 20% and 28% fewer bytes at a higher PSNR, so there is no trade being made
# here to argue about. Above ~q74 WebP crosses over and costs *more* than the
# JPEG (q80 at cap 560 is 106% of it), which is why this is not simply set
# high; the crossover is the whole reason a number had to be measured.
#
# **These files are written but nothing serves them yet.** Wiring them needs
# `cardWebp`/`cardSmWebp` in `scripts/build-manifest.mjs` and a `<source
# type="image/webp">` in the three markup sites; until that lands they are
# inert bytes in `dist/`. `method=6` is the slowest, smallest setting — this
# script is run by hand, so encode time is not a cost anyone pays twice.
CARD_WEBP_QUALITY = 68
WEBP_METHOD = 6

# **The row derivative this file's own docstring nominated (2026-09-12), and
# its cap is on the SHORT edge.**
#
# An Index or shelf row draws a fixed 48x48 square (`index.css`, and
# `ROW_HEIGHT` counts on it) with `object-fit: cover`, and cover scales a
# picture until its *short* edge fills the box. So the short edge is the one
# that has to reach 48 x DPR, and capping the long edge — which is right for a
# card, whose box takes the picture's own shape — over-serves a narrow icon by
# exactly its aspect ratio. `pulcheria-the-empress` is 556x1721: to put 144 px
# across a row it needs a *long* edge of 446, and `-card-sm.jpg` gives it 280
# and only 90 px of useful width.
#
# 144 is 48 x 3, so the densest phone is served exactly and nothing is served
# more. Measured over all 130 icons at this desk: **7.9 kB average as JPEG and
# 5.7 kB as WebP, against the 13.5 kB `-card-sm.jpg` a row is handed today** —
# 42% and 58% off, and at the size the box actually draws rather than at 4.9x
# it.
#
# That 4.9x is not visible to `scripts/screenful-bytes.mjs`. Its OVERSIZE gate
# reads `naturalWidth`, and for an image chosen from a `srcset` with `sizes`
# the DOM divides that by the candidate's implied density before handing it
# over: a 235x280 file in a 48 px row reports itself as **48x57**, so the
# factor is 1.00 by construction on every image the gate was added to police.
# Verified by loading the same `currentSrc` into a bare `new Image()` and
# comparing. Trap 14 — the instrument is reading what the code publishes about
# itself.
ROW_SHORT_PX = 144

GENERATED = (
    "-thumb.jpg",
    "-card.jpg",
    "-card-sm.jpg",
    "-row.jpg",
    "-card.webp",
    "-card-sm.webp",
    "-row.webp",
)


def write_thumb(src, dst):
    with Image.open(src) as im:
        im = im.convert("RGB")
        im = im.filter(ImageFilter.GaussianBlur(THUMB_BLUR_RADIUS))
        size = (max(1, im.width // THUMB_SCALE), max(1, im.height // THUMB_SCALE))
        im.resize(size, Image.LANCZOS).save(dst, "JPEG", quality=JPEG_QUALITY, optimize=True)


def card_sized(src, longest):
    """The original at `longest` on its long edge — the one resize both
    formats share, so a WebP and the JPEG it stands in for can never come out
    at different pixel dimensions and make `srcset`'s `w` descriptors lie."""
    im = Image.open(src).convert("RGB")
    # Never upscale: a small original is already its own card.
    scale = min(1.0, longest / max(im.width, im.height))
    if scale < 1.0:
        size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
        im = im.resize(size, Image.LANCZOS)
    return im


def write_card_at(src, dst, longest):
    card_sized(src, longest).save(dst, "JPEG", quality=CARD_QUALITY, optimize=True, progressive=True)


def write_card_webp_at(src, dst, longest):
    card_sized(src, longest).save(dst, "WEBP", quality=CARD_WEBP_QUALITY, method=WEBP_METHOD)


def write_card(src, dst):
    write_card_at(src, dst, CARD_MAX_PX)


def write_card_sm(src, dst):
    write_card_at(src, dst, CARD_SM_MAX_PX)


def write_card_webp(src, dst):
    write_card_webp_at(src, dst, CARD_MAX_PX)


def write_card_sm_webp(src, dst):
    write_card_webp_at(src, dst, CARD_SM_MAX_PX)


def row_sized(src, shortest):
    """The original with its *short* edge at `shortest` — see `ROW_SHORT_PX`
    for why a row caps the short edge where a card caps the long one."""
    im = Image.open(src).convert("RGB")
    scale = min(1.0, shortest / min(im.width, im.height))
    if scale < 1.0:
        size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
        im = im.resize(size, Image.LANCZOS)
    return im


def write_row(src, dst):
    row_sized(src, ROW_SHORT_PX).save(dst, "JPEG", quality=CARD_QUALITY, optimize=True, progressive=True)


def write_row_webp(src, dst):
    row_sized(src, ROW_SHORT_PX).save(dst, "WEBP", quality=CARD_WEBP_QUALITY, method=WEBP_METHOD)


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
            ("-row.jpg", write_row),
            ("-card.webp", write_card_webp),
            ("-card-sm.webp", write_card_sm_webp),
            ("-row.webp", write_row_webp),
        ):
            dst = os.path.join(folder_path, f"{base}{suffix}")
            write(src, dst)
            print(f"{folder}/{fname} -> {base}{suffix} ({os.path.getsize(dst)} bytes)")
