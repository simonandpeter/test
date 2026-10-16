# -*- coding: utf-8 -*-
"""Twenty more placements, read off `place-dated.mjs`'s birth and death routes.

Four of the twenty-four the shortlists offered are not here:

* `perpetua-of-carthage` — "a great basilica was **raised** at Carthage" is a
  building going up, not a child. `raised` has been taken out of the birth
  verbs for it.
* `timothy-disciple-of-babylas` — it is Babylas who was born at Antioch; the
  sentence is in Timothy's life because Babylas is his master.
* `platonida-of-arges` — her son Theodosie died at Constantinople.
* `theodulus-of-caesarea-17-february` — Caesarea in **Palestine**, where the
  gazetteer's bare `Caesarea` is the Cappadocian one.

Gurias and Samonas take `death` rather than the `birth` route that found them:
"brought up in Edessa" is where they grew, and their own life says they were
seized in Edessa, carried out of the city by night and beheaded, with their
tomb in it.

Usage: python scratchpad/place-batch-c.py [--write]
"""
import io
import json
import os
import sys

WRITE = '--write' in sys.argv

CITIES = {
    'rome': ('Rome', 'Rome, Italy', 41.8931, 12.4828, 15),
    'cp': ('Constantinople', 'Istanbul, Turkey', 41.0082, 28.9784, 20),
    'nicomedia': ('Nicomedia', 'İzmit, Turkey', 40.7654, 29.9408, 15),
    'nicaea': ('Nicaea', 'İznik, Turkey', 40.43, 29.72, 15),
    'edessa': ('Edessa', 'Şanlıurfa, Turkey', 37.1591, 38.7969, 15),
    'moscow': ('Moscow', 'Moscow, Russia', 55.752, 37.6175, 15),
    'alexandria': ('Alexandria', 'Alexandria, Egypt', 31.2, 29.92, 15),
    'tbilisi': ('Tbilisi', 'Tbilisi, Georgia', 41.72, 44.79, 15),
    # An island, as the source gives it: "born in Cyprus around 250".
    'cyprus': ('Cyprus', 'Cyprus', 35.1, 33.4, 150),
}

BATCH = [
    ('anthimus-of-nicomedia', 'birth', 'nicomedia'),
    ('arsenios-the-wonderworker', 'birth', 'moscow'),
    ('arsenius-of-komel', 'birth', 'moscow'),
    ('boris-bogolepov', 'birth', 'moscow'),
    ('cecilia-of-rome', 'birth', 'rome'),
    ('cyril-of-belozersk', 'birth', 'moscow'),
    ('gabriel-urgebadze', 'birth', 'tbilisi'),
    ('gurias-of-edessa', 'death', 'edessa'),
    ('isaac-of-armenia', 'birth', 'cp'),
    ('john-the-faster-patriarch-of-constantinople', 'birth', 'cp'),
    ('john-yanushev', 'birth', 'moscow'),
    ('juliana-of-lazarevo', 'birth', 'moscow'),
    ('leucius-of-vruntisiopolis', 'birth', 'alexandria'),
    ('macarius-of-pelecete', 'birth', 'cp'),
    ('neophytus-of-nicaea', 'birth', 'nicaea'),
    ('paul-of-obnora', 'birth', 'moscow'),
    ('pausilypus-of-heraclea', 'birth', 'rome'),
    ('philonides-of-kourion', 'birth', 'cyprus'),
    ('samonas-of-edessa', 'death', 'edessa'),
    ('vladimir-presbyter-martyr-1937', 'birth', 'moscow'),
]

for slug, kind, city in BATCH:
    path = os.path.join('saints', slug, 'saint.json')
    raw = io.open(path, encoding='utf-8', newline='').read()
    if '"locations"' in raw:
        print('SKIP  %-46s already has locations' % slug)
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
    print('%-46s %-6s %-16s %s,%s  ±%d' % (slug, kind, historical, lat, lon, km))
    if WRITE:
        io.open(path, 'w', encoding='utf-8', newline='').write(out)

print('\n%d rows, %s' % (len(BATCH), 'written' if WRITE else 'dry run'))
