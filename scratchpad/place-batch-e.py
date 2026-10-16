# -*- coding: utf-8 -*-
"""Four rows off the relics and founded routes, which are nearly exhausted.

Seven rows between them, and three were refused for the same reason the
`death` route's refusals were: the sentence is about somebody else.

* `julian-companion-of-caesarius` — the relics at Rome are **Caesarius's**,
  named in Julian's life because they died together.
* `cyprian-nelidov` — the relics carried to Moscow are a prince's, in a
  sentence about what hymns the day page prints.
* `rostislav-of-kyiv` — the monastery at Kyiv is the one **his father**
  founded, and a grand prince's seat is not a `ministry` in any case.

Usage: python scratchpad/place-batch-e.py [--write]
"""
import io
import json
import os
import sys

WRITE = '--write' in sys.argv

CITIES = {
    'rome': ('Rome', 'Rome, Italy', 41.8931, 12.4828, 15),
    'cp': ('Constantinople', 'Istanbul, Turkey', 41.0082, 28.9784, 20),
    'kyiv': ('Kyiv', 'Kyiv, Ukraine', 50.4501, 30.5234, 15),
}

BATCH = [
    ('anthousa-12-april', 'ministry', 'cp'),
    ('caesarius-companion-of-julian', 'relics', 'rome'),
    ('paulinus-of-nola', 'relics', 'rome'),
    ('theodora-of-sihla', 'relics', 'kyiv'),
]

for slug, kind, city in BATCH:
    path = os.path.join('saints', slug, 'saint.json')
    raw = io.open(path, encoding='utf-8', newline='').read()
    if '"locations"' in raw:
        print('SKIP  %-34s already has locations' % slug)
        continue
    historical, modern, lat, lon, km = CITIES[city]
    block = json.dumps(
        [{'kind': kind, 'historical_name': historical, 'modern_name': modern,
          'lat': lat, 'lon': lon, 'uncertainty_km': km}],
        ensure_ascii=False, indent=2,
    )
    block = '\n'.join(('  ' + line) if line else line for line in block.split('\n'))
    anchor = '\n  "text":'
    assert anchor in raw, slug
    out = raw.replace(anchor, '\n  "locations": ' + block.lstrip() + ',' + anchor, 1)
    print('%-34s %-9s %-16s %s,%s  ±%d' % (slug, kind, historical, lat, lon, km))
    if WRITE:
        io.open(path, 'w', encoding='utf-8', newline='').write(out)

print('\n%d rows, %s' % (len(BATCH), 'written' if WRITE else 'dry run'))
