# -*- coding: utf-8 -*-
"""Forty-four sees and ministries, read off `place-dated.mjs see --epithet`.

The `see` route is the weakest of the three, because "bishop of X" is a
sentence any life may contain about anybody: Euthymius of Tarnovo is named
beside Kyiv, John the Hairy of Rostov beside Alexandria, and Agapitus of
Synnada beside Rome, each because the life mentions another man's see. The
discriminator that makes the route usable is the folder's own name — a bishop
whose epithet is the city the sentence gives him. That cuts 129 rows to 45,
and the forty-five were read.

One of the forty-five did not survive the reading:

* `antoninus-of-rome` — "bishop of Rome" is the pope he died beside.

And one changed kind: `caecilius-of-carthage` is a **presbyter** at Carthage,
the bishop of Carthage in his sentence being Cyprian, whom he led into
Christianity. A presbyter and a deacon have no see, so the four of those take
`ministry`.

Usage: python scratchpad/place-batch-d.py [--write]
"""
import io
import json
import os
import sys

WRITE = '--write' in sys.argv

CITIES = {
    'Alexandria': ('Alexandria', 'Alexandria, Egypt', 31.2, 29.92, 15),
    'Antioch': ('Antioch', 'Antakya, Turkey', 36.2021, 36.1613, 15),
    'Athens': ('Athens', 'Athens, Greece', 37.98, 23.73, 15),
    'Canterbury': ('Canterbury', 'Canterbury, England', 51.28, 1.08, 15),
    'Carthage': ('Carthage', 'Tunis, Tunisia', 36.8528, 10.3233, 15),
    'Constantinople': ('Constantinople', 'Istanbul, Turkey', 41.0082, 28.9784, 20),
    'Crete': ('Crete', 'Crete, Greece', 35.24, 24.81, 150),
    'Cyprus': ('Cyprus', 'Cyprus', 35.1, 33.4, 150),
    'Jerusalem': ('Jerusalem', 'Jerusalem', 31.78, 35.22, 15),
    'Kyiv': ('Kyiv', 'Kyiv, Ukraine', 50.4501, 30.5234, 15),
    'Milan': ('Milan', 'Milan, Italy', 45.46, 9.19, 15),
    'Moscow': ('Moscow', 'Moscow, Russia', 55.752, 37.6175, 15),
    'Nicaea': ('Nicaea', 'İznik, Turkey', 40.43, 29.72, 15),
    'Nicomedia': ('Nicomedia', 'İzmit, Turkey', 40.7654, 29.9408, 15),
    'Novgorod': ('Novgorod', 'Velikiy Novgorod, Russia', 58.52, 31.27, 15),
    'Rome': ('Rome', 'Rome, Italy', 41.8931, 12.4828, 15),
    # He is of Petrograd because that is what the city was called in 1922.
    'Saint Petersburg': ('Petrograd', 'Saint Petersburg, Russia', 59.93, 30.34, 15),
}

BATCH = [
    ('achillas-of-alexandria', 'see', 'Alexandria'),
    ('anthony-of-novgorod', 'see', 'Novgorod'),
    ('basil-of-novgorod', 'see', 'Novgorod'),
    ('benjamin-of-petrograd', 'see', 'Saint Petersburg'),
    ('caecilius-of-carthage', 'ministry', 'Carthage'),
    ('chaeremon-disciple-of-dionysius-of-alexandria', 'ministry', 'Alexandria'),
    ('constantine-of-kyiv', 'see', 'Kyiv'),
    ('cronides-deacon-of-alexandria', 'ministry', 'Alexandria'),
    ('cyriacus-of-constantinople', 'see', 'Constantinople'),
    ('cyriacus-of-jerusalem', 'see', 'Jerusalem'),
    ('cyril-vi-of-constantinople', 'see', 'Constantinople'),
    ('dionysius-of-milan', 'see', 'Milan'),
    ('dunstan-of-canterbury', 'see', 'Canterbury'),
    ('faustus-disciple-of-dionysius-of-alexandria', 'ministry', 'Alexandria'),
    ('flavius-of-nicomedia', 'see', 'Nicomedia'),
    ('gaius-disciple-of-dionysius-of-alexandria', 'ministry', 'Alexandria'),
    ('gaius-pope-of-rome', 'see', 'Rome'),
    ('gerasimus-of-crete', 'see', 'Crete'),
    ('gerontius-of-milan', 'see', 'Milan'),
    ('innocent-of-moscow', 'see', 'Moscow'),
    ('isidore-of-antioch', 'see', 'Antioch'),
    ('job-patriarch-of-moscow', 'see', 'Moscow'),
    ('john-archbishop-of-constantinople', 'see', 'Constantinople'),
    ('john-v-patriarch-of-constantinople', 'see', 'Constantinople'),
    ('laurence-of-canterbury', 'see', 'Canterbury'),
    ('leonides-of-athens', 'see', 'Athens'),
    ('macarius-metropolitan-of-moscow', 'see', 'Moscow'),
    ('macarius-of-moscow-30-december', 'see', 'Moscow'),
    ('maximus-of-jerusalem', 'see', 'Jerusalem'),
    ('paul-the-new-patriarch-of-constantinople', 'see', 'Constantinople'),
    ('peter-bishop-of-nicaea', 'see', 'Nicaea'),
    ('philagrius-of-cyprus', 'see', 'Cyprus'),
    ('philaret-of-kyiv', 'see', 'Kyiv'),
    ('philaret-of-moscow', 'see', 'Moscow'),
    ('philip-the-first-of-moscow', 'see', 'Moscow'),
    ('philogonius-of-antioch', 'see', 'Antioch'),
    ('sabinus-of-cyprus', 'see', 'Cyprus'),
    ('senator-of-milan', 'see', 'Milan'),
    ('simon-of-moscow', 'see', 'Moscow'),
    ('sophronius-of-cyprus', 'see', 'Cyprus'),
    ('stephen-ii-of-constantinople', 'see', 'Constantinople'),
    ('telesphorus-of-rome', 'see', 'Rome'),
    ('theodore-i-of-constantinople', 'see', 'Constantinople'),
    ('thomas-ii-of-constantinople', 'see', 'Constantinople'),
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
    print('%-46s %-9s %-16s %s,%s  ±%d' % (slug, kind, historical, lat, lon, km))
    if WRITE:
        io.open(path, 'w', encoding='utf-8', newline='').write(out)

print('\n%d rows, %s' % (len(BATCH), 'written' if WRITE else 'dry run'))
