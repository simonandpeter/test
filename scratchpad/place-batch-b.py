# -*- coding: utf-8 -*-
"""Write the twenty-four placements read out of `place-dated.mjs`'s shortlist.

Every coordinate below is one a colleague already checked: where the corpus
holds a row for the city, that row's numbers are copied rather than the
gazetteer's rounder pair, so Nicomedia is one point for all twenty-eight
saints who died there and not two a quarter of a kilometre apart.

Two rows the shortlist offered are not here, and both for the same reason the
gazetteer cannot settle:

* `platonida-of-arges` — it is her son Theodosie who died at Constantinople.
* `theodulus-of-caesarea-17-february` — Caesarea in **Palestine**, where the
  gazetteer's bare `Caesarea` is the Cappadocian one, 700 km inland.

Usage: python scratchpad/place-batch-b.py [--write]
"""
import io
import json
import os
import sys

WRITE = '--write' in sys.argv

CITIES = {
    'rome': ('Rome', 'Rome, Italy', 41.8931, 12.4828, 15),
    'cp': ('Constantinople', 'Istanbul, Turkey', 41.0082, 28.9784, 20),
    'antioch': ('Antioch', 'Antakya, Turkey', 36.2021, 36.1613, 15),
    'nicomedia': ('Nicomedia', 'İzmit, Turkey', 40.7654, 29.9408, 15),
    'edessa': ('Edessa', 'Şanlıurfa, Turkey', 37.1591, 38.7969, 15),
    'moscow': ('Moscow', 'Moscow, Russia', 55.752, 37.6175, 15),
    'caesarea-capp': ('Caesarea in Cappadocia', 'Kayseri, Turkey', 38.7205, 35.4826, 15),
    # An island, not a town: the calendar says «εν Κρήτη» and nothing narrower.
    'crete': ('Crete', 'Crete, Greece', 35.24, 24.81, 150),
}

BATCH = [
    ('abibus-the-deacon-of-edessa', 'edessa'),
    ('anna-renamed-euphemianos', 'cp'),
    ('basilla-martyr-24-december', 'rome'),
    ('dometian-of-melitene', 'cp'),
    ('emilian-the-roman', 'rome'),
    ('george-paizanos-of-mytilene', 'cp'),
    ('glycerius-of-nicomedia', 'nicomedia'),
    ('james-companion-of-emilian', 'rome'),
    ('justus-of-rome', 'rome'),
    ('macarius-of-rome', 'rome'),
    ('marianus-companion-of-emilian', 'rome'),
    ('nicholas-martyr-1918-23-august', 'moscow'),
    ('nicholas-neomartyr-12-november', 'cp'),
    ('panteleimon-of-spetses', 'crete'),
    ('philotheus-of-antioch', 'antioch'),
    ('polyeuctus-of-caesarea', 'caesarea-capp'),
    ('rufinus-of-rome', 'rome'),
    ('stamatios-of-volos', 'cp'),
    ('tarcisius-of-rome', 'rome'),
    ('ten-thousand-martyrs-of-antioch', 'antioch'),
    ('ten-virgins-of-nicomedia', 'nicomedia'),
    ('theodore-martyred-at-antioch', 'antioch'),
    ('theophilus-of-rome', 'rome'),
    ('valentine-of-rome', 'rome'),
]

for slug, city in BATCH:
    path = os.path.join('saints', slug, 'saint.json')
    raw = io.open(path, encoding='utf-8', newline='').read()
    if '"locations"' in raw:
        print('SKIP  %-40s already has locations' % slug)
        continue
    historical, modern, lat, lon, km = CITIES[city]
    block = json.dumps(
        [{'kind': 'death', 'historical_name': historical, 'modern_name': modern,
          'lat': lat, 'lon': lon, 'uncertainty_km': km}],
        ensure_ascii=False, indent=2,
    )
    block = '\n'.join(('  ' + line) if line else line for line in block.split('\n'))
    anchor = '\n  "text":'
    assert anchor in raw, slug
    out = raw.replace(anchor, '\n  "locations": ' + block.lstrip() + ',' + anchor, 1)
    print('%-40s %-24s %s,%s  ±%d' % (slug, historical, lat, lon, km))
    if WRITE:
        io.open(path, 'w', encoding='utf-8', newline='').write(out)

print('\n%d rows, %s' % (len(BATCH), 'written' if WRITE else 'dry run'))
