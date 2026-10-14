# -*- coding: utf-8 -*-
"""TODO 17's measurement: which READ_FOLDS keys no live collision can reach.

`READ_FOLDS` in `scripts/corpus-gate.mjs` is keyed by form plus the sorted slug
list on one line, and lookup is exact. So when a collision widens — a third
saint arrives under a name two already shared — the old narrower key stops
matching anything and the row goes unread, printing `?`. That is the safe
direction: a stale key cannot pass a wider row. But the readings in those keys
are somebody's work, so the pass is not a `grep -v`.

Live keys come from the gate's own printed rows rather than a second
implementation of the folder, because a second folder that agreed by
coincidence would be worse than no check at all.

Three outputs, and the split is what the item asks for:
  - keys a live row reaches (nothing to do)
  - dead keys whose slug set is a SUBSET of a live key of the same form: the
    collision widened, and the reading belongs to the live row
  - dead keys matching no live form at all: a folder was renamed or merged away

Usage: node scripts/corpus-gate.mjs > gate.txt && python scratchpad/fold-audit.py gate.txt
"""
import io
import json
import re
import sys

GATE = sys.argv[1] if len(sys.argv) > 1 else 'gate.txt'
SRC = 'scripts/corpus-gate.mjs'

row = re.compile(u'^  [?·] "(.+?)" — (.+)$', re.M)
text = io.open(GATE, encoding='utf-8').read()
live = {}
for key, slugs in row.findall(text):
    live[key + ' ' + ' '.join(sorted(s.strip() for s in slugs.split(',')))] = (
        key,
        frozenset(s.strip() for s in slugs.split(',')),
    )
print('live collision rows : %d' % len(live))

src = io.open(SRC, encoding='utf-8', newline='').read()
start = src.index('const READ_FOLDS = {')
# The object's keys are the only single-quoted strings at two-space indent that
# end in a colon on their own line; the values are long prose on the next line.
keyline = re.compile(r"^  '(.+)':$", re.M)
block = src[start:src.index('\n};', start)]
keys = keyline.findall(block)
print('READ_FOLDS keys     : %d' % len(keys))

# Split a foldKey into its form and its slugs. The form may be several words and
# a slug may be a single word with no hyphen, so the split is taken at the first
# token that names a folder on disk — the slug list is what the gate joined.
import os

folders = set(os.listdir('saints'))


def parts(key):
    toks = key.split(' ')
    for n, tok in enumerate(toks):
        if tok in folders:
            return ' '.join(toks[:n]), frozenset(toks[n:])
    return ' '.join(toks[:-1]), frozenset(toks[-1:])


by_form = {}
for lk, (form, slugs) in live.items():
    by_form.setdefault(form, []).append((lk, slugs))

reached, subset, orphan = [], [], []
for k in keys:
    if k in live:
        reached.append(k)
        continue
    form, slugs = parts(k)
    wider = [lk for lk, ls in by_form.get(form, []) if slugs < ls]
    if wider:
        subset.append((k, wider[0]))
    else:
        orphan.append(k)

print('  reached by a row  : %d' % len(reached))
print('  DEAD, subset of a live key : %d' % len(subset))
print('  DEAD, no live form at all  : %d' % len(orphan))

io.open('.tmp/fold-subset.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(subset, ensure_ascii=False, indent=1)
)
io.open('.tmp/fold-orphan.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(orphan, ensure_ascii=False, indent=1)
)
for k, w in subset[:3]:
    print('  SUB   %s\n     ->  %s' % (k[:90], w[:90]))
for k in orphan[:5]:
    print('  ORPH  %s' % k[:100])
