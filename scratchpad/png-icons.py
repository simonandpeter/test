# -*- coding: utf-8 -*-
"""Which `icon.jpg` files are not JPEGs, and which of them should be.

`geticon.py` writes Commons' thumb bytes verbatim, and Commons serves a PNG
thumb for a PNG source — so a `.png` candidate lands as a PNG called
`icon.jpg`. **150 of 555 masters are PNGs**, and that is mostly fine and has
been for months: the Menaion Reader plates are line art at 25–50 KB, where a
JPEG of the same picture is larger and carries ringing along every stroke.
Everything downstream already works, because PIL sniffs the header and so does
a browser.

The ones worth changing are the colour photographs and mosaics that arrived
the same way: `zephaniah` and `obadiah` are the Florence Baptistery mosaics at
**5.0 MB each**, in a corpus whose mean master is 389 KB and whose manifest is
already past its budget.

So the rule here is the only honest one — re-encode where a JPEG is actually
smaller, and leave the file alone where it is not. Quality 90, because this is
the archival master; `make_thumbs.py` takes the derivatives a reader is served
down to 45.

Usage: python scratchpad/png-icons.py [--write]
"""
import glob
import io
import os
import sys

from PIL import Image

WRITE = '--write' in sys.argv
QUALITY = 90

rows = []
for path in sorted(glob.glob('saints/*/images/icon.jpg')):
    with Image.open(path) as im:
        if im.format == 'JPEG':
            continue
        fmt, size = im.format, im.size
        buf = io.BytesIO()
        im.convert('RGB').save(buf, 'JPEG', quality=QUALITY)
        as_jpeg = buf.getvalue()
    was = os.path.getsize(path)
    rows.append((path, fmt, size, was, as_jpeg))

worth = [r for r in rows if len(r[4]) < r[3]]
worth.sort(key=lambda r: len(r[4]) - r[3])
print('%d masters are not JPEGs; %d of them are smaller as one\n' % (len(rows), len(worth)))
print('%-40s %-5s %-12s %8s %8s' % ('slug', 'was', 'size', 'now KB', 'jpeg KB'))
for path, fmt, size, was, as_jpeg in worth[:14]:
    slug = os.path.basename(os.path.dirname(os.path.dirname(path)))
    print('%-40s %-5s %-12s %8d %8d' % (slug, fmt, '%dx%d' % size, was // 1024, len(as_jpeg) // 1024))
    if WRITE:
        io.open(path, 'wb').write(as_jpeg)

saved = sum(r[3] - len(r[4]) for r in worth)
print('\n%.1f MB saved across %d files, %s' % (saved / 1e6, len(worth), 'written' if WRITE else 'dry run'))
