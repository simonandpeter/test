"""Generates a blurred low-quality JPEG placeholder next to each image in
saints/*/images/, so cards can paint something instantly before the full-res
image decodes. Run as `npm run thumbs`; the manifest build fails loudly on any
image whose placeholder is missing.

It deliberately uses the v3 PSD pipeline's exact quarter-size + blur recipe
rather than its own: the site derives each card's box from its image's pixel
dimensions, so placeholders produced at two different scales would make one
saint render several times the size of its neighbour. Keep these constants in
step with render_v3_saints.py (in the parent folder).
"""
import os
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "saints")
THUMB_SCALE = 4
THUMB_BLUR_RADIUS = 4.0
JPEG_QUALITY = 45

for folder in sorted(os.listdir(ROOT)):
    folder_path = os.path.join(ROOT, folder, "images")
    if not os.path.isdir(folder_path):
        continue
    for fname in os.listdir(folder_path):
        if not fname.lower().endswith((".png", ".jpg", ".jpeg")):
            continue
        if fname.lower().endswith("-thumb.jpg"):
            continue
        src = os.path.join(folder_path, fname)
        base, _ = os.path.splitext(fname)
        dst = os.path.join(folder_path, f"{base}-thumb.jpg")
        with Image.open(src) as im:
            im = im.convert("RGB")
            im = im.filter(ImageFilter.GaussianBlur(THUMB_BLUR_RADIUS))
            new_size = (max(1, im.width // THUMB_SCALE), max(1, im.height // THUMB_SCALE))
            im = im.resize(new_size, Image.LANCZOS)
            im.save(dst, "JPEG", quality=JPEG_QUALITY, optimize=True)
        print(f"{folder}/{fname} -> {base}-thumb.jpg ({os.path.getsize(dst)} bytes)")
