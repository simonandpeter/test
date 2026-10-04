# -*- coding: utf-8 -*-
"""Two offices `upgrade.py` could not set, whose strings the packs already hold.

The Julian 30 and 31 October batches left four such; these are the two that
need no new pack key. The two Caves «просфорников» are not here on purpose:
no pack row holds a word for a prosphora baker, so the Greek and Serbian would
be mine rather than the packs' own, and that is the author's to settle.
"""
import io, json

OFFICES = {'tertius': 'Bishop of Iconium', 'john-kochurov': 'Archpriest'}
for slug, office in OFFICES.items():
    p = 'saints/%s/saint.json' % slug
    s = io.open(p, encoding='utf-8', newline='').read()
    if json.loads(s).get('office'):
        print('already set:', slug); continue
    i = s.index('"display_name"')
    s = s[:i - 2] + '  "office": %s,\n' % json.dumps(office, ensure_ascii=False) + s[i - 2:]
    json.loads(s)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('wrote', slug, '->', office)
