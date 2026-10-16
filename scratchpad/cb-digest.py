# -*- coding: utf-8 -*-
"""Print cb-search.py's candidates compactly, best upgrade first.

usage: python scratchpad/cb-digest.py [from] [to] [candidates.json]

Only files at least as wide as the icon in hand are shown, because a narrower
one cannot be an upgrade (make_thumbs.py never upscales).
"""
import io, json, sys

rows = json.load(io.open((sys.argv[3] if len(sys.argv) > 3 else 'scratchpad/cb-cands.json'), encoding='utf-8'))
lo = int(sys.argv[1]) if len(sys.argv) > 1 else 0
hi = int(sys.argv[2]) if len(sys.argv) > 2 else len(rows)
for r in rows[lo:hi]:
    c = r['cur']
    print('--- %s | %s | now %dx%d sat %.3f | feasts %s' % (
        r['slug'], r['display_name'], c['w'], c['h'], c['sat'], ','.join(r['feasts'])))
    print('    forms: ' + ' | '.join(r['forms']))
    for e in r['ents']:
        if e.get('err'):
            print('    %s ERR %s' % (e['qid'], e['err']))
            continue
        print('    %s %s | %s | feast %s | cat %s | %s%s' % (
            e['qid'], e['label'], e['desc'][:70], ','.join(e['feast']) or '-',
            ','.join(e['p373']) or '-', e['how'],
            '  SKIP: %s' % e['skip'] if e.get('skip') else ''))
    wide = [f for f in r['cands'] if f['w'] >= max(c['w'], 450)]
    for f in wide[:10]:
        print('      %5dx%-5d %-18s %s' % (f['w'], f['h'], f['lic'][:18], f['title'][5:][:70]))
    if not wide:
        print('      (no candidate at or above %d px of %d listed)%s' % (
            c['w'], len(r['cands']), ' err=%s' % r['err'] if r['err'] else ''))
