# -*- coding: utf-8 -*-
"""Print the identity fields of each slug named on the command line."""
import io, json, sys, os

KEYS = ('slug', 'name', 'names', 'titles', 'feasts', 'feast', 'dates', 'era',
        'place', 'places', 'calendars', 'summary', 'kind', 'rank')
for slug in sys.argv[1:]:
    p = os.path.join('saints', slug, 'saint.json')
    d = json.load(io.open(p, encoding='utf-8'))
    out = dict((k, d[k]) for k in KEYS if k in d)
    print('=== %s ===' % slug)
    print(json.dumps(out, ensure_ascii=False, indent=1)[:2000])
