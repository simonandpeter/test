#!/usr/bin/env python
"""Print the Russian attestation row of each slug named on the command line."""
import io
import json
import sys

for slug in sys.argv[1:]:
    try:
        d = json.load(io.open('saints/%s/saint.json' % slug, encoding='utf-8'))
    except IOError:
        print('%s: NO FOLDER' % slug)
        continue
    print('== %s  (%s)' % (slug, d['display_name']))
    print('   types=%s  dates=%s' % (d.get('types'), json.dumps(d.get('dates'), ensure_ascii=False)))
    print('   names=%s' % json.dumps([n['lang'] + ':' + n['form'] for n in d.get('names', [])], ensure_ascii=False))
    for a in d['attestations']:
        if a['church'] == 'russian':
            print('   ' + json.dumps(a, ensure_ascii=False)[:1200])
