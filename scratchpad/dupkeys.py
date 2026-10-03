# -*- coding: utf-8 -*-
"""A key written twice in one JSON object: json.load keeps the last, silently."""
import io, json, os, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def pairs(items):
    seen, dups = set(), []
    for k, v in items:
        if k in seen:
            dups.append(k)
        seen.add(k)
    if dups:
        found.append(dups)
    return dict(items)


bad = 0
n = 0
for slug in sorted(os.listdir('saints')):
    p = os.path.join('saints', slug, 'saint.json')
    if not os.path.isfile(p):
        continue
    n += 1
    found = []
    try:
        json.loads(io.open(p, encoding='utf-8').read(), object_pairs_hook=pairs)
    except Exception as e:
        print('UNPARSEABLE', slug, e)
        bad += 1
        continue
    if found:
        print('DUPLICATE', slug, found)
        bad += 1
print('%d files, %d with a duplicated key or unparseable' % (n, bad))
