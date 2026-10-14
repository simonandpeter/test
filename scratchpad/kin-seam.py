# -*- coding: utf-8 -*-
"""The highest-yielding seam left in item 16: a kinship in the display name.

An undated folder whose DISPLAY NAME states a tie — "companion of", "brother
of", "mother of", "disciple of", "son of" — and whose `related` already holds a
folder this corpus dates. 15 of the first 21 were placeable, **71%**, which is
the best rate in item 16's table after tier A.

**`.tmp/item16-timetie.py` cannot see any of them**, and the reason is the
point: its pattern reads a tie out of a prose SENTENCE, and these folders put
the tie in the name and then spend their prose saying the page gave them nothing
— "the kinship is the whole of what it says about him, and it is why the display
name carries it". A scan over prose finds the folders whose prose has something;
this finds the folders whose prose has nothing and whose NAME has everything.

Every row is a question. Two of the first pass turned out to be a corpus defect
rather than a date:

  - `matrona-of-cyzicus`'s `related` asserts an identity the sources do not —
    this corpus's `tryphaena-of-cyzicus` is the 1st-century martyr gored by a
    bull, while the page's Tryphaena is the ascetic who died in peace beside
    Matrona. One folder is wrong, or they are two women.
  - `domninus-companion-of-philemon`'s dated `related` is a different Domninus,
    matched on the name alone.

So a tie is read before it is used, and a tie to a folder whose own date is
inferred is a chain, not evidence.

Usage: python scratchpad/kin-seam.py   (after npm run build:manifest)
"""
import io
import json
import os
import re

KIN = re.compile(
    r'\b(companion|brother|sister|mother|father|son|daughter|wife|husband|disciple|'
    r'teacher|servant|nephew|niece|uncle|aunt|cousin|kinsman)\b',
    re.I,
)

cards = json.load(io.open('data/manifest.json', encoding='utf-8'))
by_slug = {c['slug']: c for c in cards}

# `related` is NOT on the manifest card — the card carries slug, display_name,
# names, sex, types, historicity, dates, hymned, attestations, locations,
# primary_location and image, and the reverse links came off the boot path on
# 2026-10-03 to save 51 kB gzipped of first paint. So the ties are read out of
# the folders. Written down because the first version of this scan read
# `c['related']`, found nothing, and looked like an exhausted seam.
related = {}
for d in os.listdir('saints'):
    f = os.path.join('saints', d, 'saint.json')
    if os.path.exists(f):
        related[d] = json.load(io.open(f, encoding='utf-8')).get('related') or []


def undated(d):
    return all(
        (d or {}).get(k, {}).get('earliest') is None and (d or {}).get(k, {}).get('latest') is None
        for k in ('birth', 'death', 'floruit')
    )


def dated_span(c):
    for k in ('death', 'floruit', 'birth'):
        iv = (c.get('dates') or {}).get(k) or {}
        if iv.get('earliest') is not None or iv.get('latest') is not None:
            return k, iv
    return None, None


rows = []
for c in cards:
    if not undated(c.get('dates')):
        continue
    if not KIN.search(c.get('display_name') or ''):
        continue
    ties = []
    for slug in related.get(c['slug'], []):
        other = by_slug.get(slug)
        if not other or undated(other.get('dates')):
            continue
        which, iv = dated_span(other)
        ties.append((slug, which, iv.get('display') or '%s..%s' % (iv.get('earliest'), iv.get('latest')), iv.get('basis')))
    if ties:
        rows.append((c['slug'], c['display_name'], ties))

print('%d undated folders name a kinship and link a dated folder\n' % len(rows))
for slug, name, ties in sorted(rows):
    print('%-42s %s' % (slug[:42], name[:46]))
    for tslug, which, disp, basis in ties:
        print('      -> %-36s %s %s (%s)' % (tslug[:36], which, disp, basis))
print('\nEvery row is a question: read the tie before using it, and a tie to a')
print('folder whose own date is inferred is a chain rather than evidence.')
