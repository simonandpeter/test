"""Rewrite an old-style/new-style date display into the new-style date alone.

usage: python fixdual.py <batch-id> [<batch-id> ...]

days.pravoslavie.ru's life pages date a twentieth-century death as
«13 (26) февраля 1938 года», and a reader who copies that shape into a
folder's `dates.*.display` produces a label `lib/date-display.js` cannot read
in any of the four languages, so `tests/date-display.test.mjs` goes red naming
one. The new-style number in the bracket is the civil date and is what the
display takes; the source's own pair stays quoted in the note, which is where
a form nobody can render belongs.

It also refreshes the batch record's sha256 for every folder it touches, so
`draft-saint.mjs --undo` still accepts the batch afterwards.
"""
import hashlib
import json
import os
import re
import sys

PAIR = re.compile(r'^(\d{1,2}) \((\d{1,2})\) ([A-Z][a-z]+) (\d{3,4})$')
NOTE = (' The display takes the new-style date, because date-display.js '
        'cannot read the old-style/new-style pair the source prints.')

for batch in sys.argv[1:]:
    rp = os.path.join('.tmp', 'corpus-batches', batch + '.json')
    record = json.load(open(rp, encoding='utf-8'))
    touched = []
    for entry in record['folders']:
        p = os.path.join('saints', entry['slug'], 'saint.json')
        j = json.load(open(p, encoding='utf-8'))
        changed = False
        for key in ('birth', 'death'):
            d = (j.get('dates') or {}).get(key)
            if not d:
                continue
            m = PAIR.match(d.get('display', ''))
            if not m:
                continue
            d['display'] = '%s %s %s' % (m.group(2), m.group(3), m.group(4))
            d['note'] = (d.get('note', '').rstrip() + NOTE).strip()
            changed = True
        if not changed:
            continue
        open(p, 'w', encoding='utf-8', newline='').write(
            json.dumps(j, ensure_ascii=False, indent=2) + chr(10))
        entry['hash'] = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        touched.append(entry['slug'])
    if touched:
        open(rp, 'w', encoding='utf-8', newline='').write(
            json.dumps(record, ensure_ascii=False, indent=2) + chr(10))
    print(batch, 'fixed:', ' '.join(touched) or '(none)')
