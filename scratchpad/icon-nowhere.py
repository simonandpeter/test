# -*- coding: utf-8 -*-
"""Record the four-host sweep's answer for all 50 queued saints.

Reads `scratchpad/icon-sweep.log` rather than asserting anything of its own:
for each slug it records whether the sweep reached a saint entity at all, and
whether that entity held any file. Kind `nowhere` is new — `nothing` says
Commons has nothing by four routes, and this says four hosts have nothing by
six.
"""
import io
import json
import re

LOG = 'scratchpad/icon-sweep.log'
REF = 'scratchpad/icon-refusals.json'

blocks = {}
slug = None
for line in io.open(LOG, encoding='utf-8'):
    if re.match(r'^[a-z0-9-]+\s', line) and not line.startswith(' '):
        slug = line.split()[0]
        blocks[slug] = {'entities': [], 'files': 0, 'elsewhere': 0}
    elif slug and re.match(r'^  Q\d+ via', line):
        blocks[slug]['entities'].append(line.strip())
    elif slug and re.match(r'^      (FLOOR| ) ', line):
        blocks[slug]['files'] += 1
    elif slug and re.match(r'^   (ov|eu) ', line):
        blocks[slug]['elsewhere'] += 1

ref = json.load(io.open(REF, encoding='utf-8'))
ref['_kinds']['nowhere'] = (
    'nothing on Commons, Wikidata structured data, el/ro/ru/sr/bg wikipedia, '
    'Openverse or Europeana — scratchpad/icon-sweep.py, 14 October 2026'
)
known = {r['slug'] for r in ref['refused']}

added = 0
for slug, b in sorted(blocks.items()):
    if slug in known or b['files']:
        continue
    if b['entities']:
        why = (
            'a saint entity was reached and carries no picture at all: %s'
            % '; '.join(e.split(' — ')[0].replace('  ', '') for e in b['entities'][:2])
        )
    else:
        why = 'no wikipedia article on el/ro/ru/sr/bg/en for any stored name form, so no entity and no category'
    if b['elsewhere']:
        why += '; Openverse and Europeana answer only with churches named after the saint'
    ref['refused'].append({'slug': slug, 'kind': 'nowhere', 'why': why})
    added += 1

io.open(REF, 'w', encoding='utf-8', newline='').write(
    json.dumps(ref, ensure_ascii=False, indent=2) + '\n'
)
print('%d slugs read, %d refusals added, %d records now' % (len(blocks), added, len(ref['refused'])))
print('with files, left for a reading:')
for slug, b in sorted(blocks.items()):
    if b['files']:
        print('  %-44s %d files, %d entities' % (slug, b['files'], len(b['entities'])))
