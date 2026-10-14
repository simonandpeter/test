# -*- coding: utf-8 -*-
"""Of the 25 slugs whose sweep reached pictures, which reached a DIFFERENT man?

The sainty gate in `icon-sweep.py` removes cattle and footballers. It does not
remove Athanasius of Alexandria when the folder wants Athanasius of Attaleia,
and that substitution is this task's known failure mode (`b6dc41ab`).

The discriminator used here is the epithet, which is the only thing the two
have that differs: a folder called "<Name> of <Place>" against an entity whose
label or description names a different place is a namesake, and the refusal
says which entity it was so the next reader can check rather than retrace.

A folder with no epithet — `papias`, `plesius`, `kale` — gets no verdict from
this and stays in the queue for a reading.

Prints; writes only with --write.
"""
import io
import json
import re
import sys

LOG = 'scratchpad/icon-sweep.log'
REF = 'scratchpad/icon-refusals.json'
write = '--write' in sys.argv

# "of Attaleia", "of the Caves", "companion of Andrew", "the Egyptian"
EPITHET = re.compile(r'\bof (?:the )?([A-Z][a-z]+)|\bthe ([A-Z][a-z]+)')

blocks, slug = {}, None
for line in io.open(LOG, encoding='utf-8'):
    if re.match(r'^[a-z0-9-]+\s', line) and not line.startswith(' '):
        slug = line.split()[0]
        blocks[slug] = {'display': line.strip().split('  ', 1)[-1], 'ents': [], 'files': 0}
    elif slug and re.match(r'^  Q\d+ via', line):
        qid = line.strip().split()[0]
        rest = line.strip().split(' — ', 1)[-1]
        blocks[slug]['ents'].append((qid, rest))
    elif slug and re.match(r'^      (FLOOR| ) ', line):
        blocks[slug]['files'] += 1


def places(text):
    return {m.group(1) or m.group(2) for m in EPITHET.finditer(text)}


ref = json.load(io.open(REF, encoding='utf-8'))
known = {r['slug'] for r in ref['refused']}
verdicts, undecided = [], []

for slug, b in sorted(blocks.items()):
    if slug in known or not b['files']:
        continue
    mine = places(b['display'])
    if not mine:
        undecided.append((slug, b, 'the folder states no epithet to compare'))
        continue
    clashes = []
    for qid, rest in b['ents']:
        theirs = places(rest)
        if theirs and not (theirs & mine):
            clashes.append('%s is %s' % (qid, rest.split(' (')[0]))
    if len(clashes) == len(b['ents']) and clashes:
        verdicts.append((slug, b, '; '.join(clashes[:3])))
    else:
        undecided.append((slug, b, 'at least one entity shares the epithet'))

print('NAMESAKE — every entity reached names a different place (%d)' % len(verdicts))
for slug, b, why in verdicts:
    print('  %-40s %-28s %s' % (slug, b['display'][:28], why[:90]))
print('\nSTILL A READING (%d)' % len(undecided))
for slug, b, why in undecided:
    print('  %-40s %d files — %s' % (slug, b['files'], why))

if write:
    for slug, b, why in verdicts:
        ref['refused'].append({
            'slug': slug, 'kind': 'namesake',
            'why': 'the sweep reached pictures of a different man of the name: ' + why,
        })
    io.open(REF, 'w', encoding='utf-8', newline='').write(
        json.dumps(ref, ensure_ascii=False, indent=2) + '\n'
    )
    print('\nwritten: %d records now' % len(ref['refused']))
