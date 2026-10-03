#!/usr/bin/env python
"""The batch's deliberate back-out, run with nothing committed yet.

`python scratchpad/ru-backout.py out <slug> …`  copies each saint.json to
`.tmp/backout/` and sets its Russian row to `undocumented`.
`python scratchpad/ru-backout.py in`            puts the copies back.

CORPUS §8's own example restores with `git checkout`, which only works on a
folder that was already committed. Half of this batch is new folders, so the
copies are kept here instead and the back-out can be run before the commit
the way the protocol asks.
"""
import io
import json
import os
import shutil
import sys

DIR = os.path.join('.tmp', 'backout')
mode = sys.argv[1]

if mode == 'out':
    os.path.isdir(DIR) or os.makedirs(DIR)
    for slug in sys.argv[2:]:
        p = os.path.join('saints', slug, 'saint.json')
        shutil.copyfile(p, os.path.join(DIR, slug + '.json'))
        d = json.load(io.open(p, encoding='utf-8'))
        for i, r in enumerate(d['attestations']):
            if r['church'] == 'russian':
                d['attestations'][i] = {
                    'church': 'russian',
                    'status': 'undocumented',
                    'note': 'Backed out deliberately to watch the day empty.',
                }
        with io.open(p, 'w', encoding='utf-8', newline='') as f:
            f.write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
        print('backed out %s' % slug)
elif mode == 'in':
    for name in sorted(os.listdir(DIR)):
        slug = name[:-5]
        shutil.copyfile(os.path.join(DIR, name), os.path.join('saints', slug, 'saint.json'))
        print('restored %s' % slug)
    shutil.rmtree(DIR)
