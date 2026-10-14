# -*- coding: utf-8 -*-
"""TODO 17: delete the READ_FOLDS keys no live collision can ever reach.

Run from the repo root, after:
    node scripts/corpus-gate.mjs > gate.txt
    python scratchpad/fold-audit.py gate.txt

Two classes, and only these two, because both are safe by construction:

  - **43 orphans.** No live row has their *form* at all, so the folders they
    named have been renamed or merged away. Nothing can ever look them up.
  - **1,095 superseded.** Their slug set is a strict subset of a live key of
    the same form, AND that wider key is already read. The collision widened,
    whoever widened it carried the reading forward into the wider entry at the
    time, and the narrower one has been dead weight since.

**252 more are deliberately NOT touched.** Their wider row is UNREAD, so the
narrower reading is the only reading those folders have — but writing it under
the wider key would claim the member that widened the fold had been read, and
it has not. That is a reading somebody owes, not an edit a script may make.

The check that makes this believable: **the gate's printed collision block must
come out byte-identical.** Every row's marker and every `read:` line must be
exactly what it was, because a key nothing looks up cannot change what anything
prints. If one byte moves, the deletion was wrong:

    node scripts/corpus-gate.mjs > after.txt && diff gate.txt after.txt

Dry unless --write.
"""
import io
import json
import re
import sys

SRC = 'scripts/corpus-gate.mjs'
write = '--write' in sys.argv

doomed = set(json.load(io.open('.tmp/fold-orphan.json', encoding='utf-8')))
doomed |= set(json.load(io.open('.tmp/fold-superseded.json', encoding='utf-8')))
print('keys to delete: %d' % len(doomed))

src = io.open(SRC, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in src else '\n'
start = src.index('const READ_FOLDS = {')
end = src.index(nl + '};', start)
head, block, tail = src[:start], src[start:end], src[end:]

lines = block.split(nl)
keyline = re.compile(r"^  '(.+)':$")
out, i, removed, kept = [lines[0]], 1, [], 0
while i < len(lines):
    m = keyline.match(lines[i])
    if not m:
        out.append(lines[i])
        i += 1
        continue
    j = i + 1
    while j < len(lines) and not keyline.match(lines[j]):
        j += 1
    if m.group(1) in doomed:
        removed.append(m.group(1))
    else:
        out.extend(lines[i:j])
        kept += 1
    i = j

print('entries kept: %d, removed: %d' % (kept, len(removed)))
missing = doomed - set(removed)
if missing:
    print('NOT FOUND in the file: %d' % len(missing))
    for k in list(missing)[:5]:
        print('   ', k[:90])

if not write:
    print('\nNothing written. --write applies it.')
    sys.exit(0)

io.open(SRC, 'w', encoding='utf-8', newline='').write(head + nl.join(out) + tail)
print('written')
