# -*- coding: utf-8 -*-
"""Replace an icon with a measured colour one, keeping the old file until the
new one is on disk and checked (TODO 15's rule).

usage: python scratchpad/cb-swap.py <draft.json>
  draft.json is geticon.py's own shape: [{"slug","file","why"}, ...]

The old icon.jpg and icon.meta.json are moved to scratchpad/old-colour-b/<slug>/
first, because geticon.py refuses a folder that already has an icon. The new
file is then measured exactly as grey-queue.py measures: mean HSV saturation
over a 64x64 sample. Below 0.12, or narrower than the file it replaced, the old
file is put back and the row is reported as a failure.
"""
import io, json, os, shutil, subprocess, sys
from PIL import Image

# `-I` implies `-E`, so PYTHONIOENCODING is ignored and a Cyrillic file title in a
# log line raises UnicodeEncodeError mid-row. The stream is set here instead.
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

PARK = os.path.join('scratchpad', 'old-colour-b')
MIN_SAT = 0.12


def measure(path):
    im = Image.open(path)
    w, h = im.size
    px = list(im.convert('RGB').resize((64, 64)).getdata())
    s = 0.0
    for r, g, b in px:
        hi, lo = max(r, g, b), min(r, g, b)
        if hi:
            s += (hi - lo) / hi
    return w, h, s / len(px)


drafts = json.load(io.open(sys.argv[1], encoding='utf-8'))
old = {}
for d in drafts:
    slug = d['slug']
    img = os.path.join('saints', slug, 'images')
    park = os.path.join(PARK, slug)
    os.makedirs(park, exist_ok=True)
    rec = {}
    for name in ('icon.jpg', 'icon.meta.json'):
        src = os.path.join(img, name)
        if os.path.exists(src):
            shutil.move(src, os.path.join(park, name))
            rec[name] = os.path.join(park, name)
    if 'icon.jpg' in rec:
        rec['measure'] = measure(rec['icon.jpg'])
    old[slug] = rec

r = subprocess.run([sys.executable, '-u', 'scratchpad/geticon.py', sys.argv[1], '--write'],
                   capture_output=True, text=True, encoding='utf-8', errors='replace')
print(r.stdout[-3000:])
if r.stderr.strip():
    print('STDERR', r.stderr[-1500:])

out = []
for d in drafts:
    slug = d['slug']
    new = os.path.join('saints', slug, 'images', 'icon.jpg')
    rec = old[slug]
    ow, oh, osat = rec.get('measure', (0, 0, 0))
    if not os.path.exists(new):
        for name, p in rec.items():
            if name != 'measure':
                shutil.move(p, os.path.join('saints', slug, 'images', name))
        print('RESTORED %-38s nothing fetched' % slug)
        continue
    w, h, sat = measure(new)
    bad = None
    if sat < MIN_SAT:
        bad = 'saturation %.4f under %.2f' % (sat, MIN_SAT)
    elif w < ow:
        bad = 'narrower: %d < %d' % (w, ow)
    if bad:
        os.remove(new)
        meta = os.path.join('saints', slug, 'images', 'icon.meta.json')
        if os.path.exists(meta):
            os.remove(meta)
        for name, p in rec.items():
            if name != 'measure':
                shutil.move(p, os.path.join('saints', slug, 'images', name))
        print('RESTORED %-38s %s' % (slug, bad))
        continue
    print('SWAPPED  %-38s %dx%d sat %.4f  (was %dx%d sat %.4f)' % (
        slug, w, h, sat, ow, oh, osat))
    out.append({'slug': slug, 'old': {'w': ow, 'h': oh, 'sat': round(osat, 4)},
                'new': {'w': w, 'h': h, 'sat': round(sat, 4)}, 'file': d['file'],
                'why': d['why']})
io.open('scratchpad/cb-swap-last.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(out, ensure_ascii=False, indent=1) + '\n')
