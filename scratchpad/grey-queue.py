# -*- coding: utf-8 -*-
"""The greyscale icons, as a queue a colour sweep can work through.

`icon-quality.py` ranks every icon on four axes and prints the worst; this asks
one question of the same pixels — **is this picture in colour** — and writes out
what a sourcer needs to replace the ones that are not: the saint's own stored
name forms, the current file's size, and its saturation, so a candidate can be
held to being both coloured and no smaller.

Saturation is HSV's S averaged over a 64x64 sample. The 0.06 floor is
`icon-quality.py`'s own and it separates cleanly here: the Menaion Reader
plates read 0.00-0.03, a gold-ground miniature 0.25-0.45.

Usage: python scratchpad/grey-queue.py  (writes scratchpad/grey-queue.json)
"""
import glob
import io
import json
import os

from PIL import Image

GREY = 0.06

manifest = {}
if os.path.exists('data/manifest.json'):
    for card in json.load(io.open('data/manifest.json', encoding='utf-8')):
        manifest[card['slug']] = card

rows = []
total = 0
for path in sorted(glob.glob('saints/*/images/icon.jpg')):
    slug = os.path.basename(os.path.dirname(os.path.dirname(path)))
    total += 1
    try:
        im = Image.open(path)
        w, h = im.size
        px = list(im.convert('RGB').resize((64, 64)).getdata())
    except Exception as exc:
        rows.append({'slug': slug, 'error': str(exc)})
        continue
    sat = 0.0
    for r, g, b in px:
        hi, lo = max(r, g, b), min(r, g, b)
        if hi:
            sat += (hi - lo) / hi
    sat /= len(px)
    if sat >= GREY:
        continue
    folder = {}
    f = os.path.join('saints', slug, 'saint.json')
    if os.path.exists(f):
        folder = json.load(io.open(f, encoding='utf-8'))
    rows.append({
        'slug': slug,
        'display_name': folder.get('display_name') or manifest.get(slug, {}).get('display_name', ''),
        'names': [{'form': n.get('form'), 'lang': n.get('lang')} for n in (folder.get('names') or [])],
        'feasts': [
            {'church': a.get('church'), 'month': (a.get('feast') or {}).get('month'),
             'day': (a.get('feast') or {}).get('day')}
            for a in (folder.get('attestations') or [])
            if a.get('status') == 'venerated' and a.get('feast')
        ],
        'w': w, 'h': h, 'sat': round(sat, 4),
    })

rows.sort(key=lambda r: (r.get('sat', 9), r.get('w', 0)))
io.open('scratchpad/grey-queue.json', 'w', encoding='utf-8', newline='').write(
    json.dumps(rows, ensure_ascii=False, indent=1) + '\n'
)
print('%d icons, %d of them under saturation %.2f' % (total, len(rows), GREY))
print('%-44s %10s %6s  %s' % ('slug', 'size', 'sat', 'name'))
for r in rows[:12]:
    print('%-44s %5dx%-4d %6.3f  %s' % (r['slug'], r['w'], r['h'], r['sat'], r['display_name'][:30]))
print('… written to scratchpad/grey-queue.json')
