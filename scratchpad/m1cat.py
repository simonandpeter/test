# -*- coding: utf-8 -*-
"""List named Commons categories' image members, widest first.

usage: python scratchpad/m1cat.py "Category:X" "Category:Y" ...

For the saints whose Commons category is under a name the corpus does not
store — Lazarus the Four-days-dead is "Lazarus of Bethany" there — the alias
is supplied by hand and checked here.
"""
import json, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
IMG = ('.jpg', '.jpeg', '.png', '.tif', '.tiff', '.gif', '.webp')


def api(params):
    url = API + '?' + urllib.parse.urlencode(dict(params, format='json'))
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for wait in (0, 10, 30, 60):
        if wait:
            time.sleep(wait)
        try:
            return json.loads(urllib.request.urlopen(req, timeout=60).read())
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
    raise RuntimeError('429 ' + url)


files = [a for a in sys.argv[1:] if a.startswith('File:')]
if files:
    d = api({'action': 'query', 'titles': '|'.join(files), 'prop': 'imageinfo',
             'iiprop': 'size|extmetadata'})
    for p in d.get('query', {}).get('pages', {}).values():
        ii = (p.get('imageinfo') or [{}])[0]
        lic = ii.get('extmetadata', {}).get('LicenseShortName', {}).get('value')
        print('   %5s x %-5s  %-20s %s' % (ii.get('width'), ii.get('height'),
                                           lic, p.get('title')))
    time.sleep(1)

for cat in [a for a in sys.argv[1:] if a.startswith('Category:')]:
    d = api({'action': 'query', 'list': 'categorymembers', 'cmtitle': cat,
             'cmtype': 'file|subcat', 'cmlimit': 200})
    rows = d.get('query', {}).get('categorymembers', [])
    if not rows and 'query' not in d:
        print('\n== %s : no such category' % cat)
        continue
    subs = [r['title'] for r in rows if r['title'].startswith('Category:')]
    ms = [r['title'] for r in rows if r['title'].lower().endswith(IMG)]
    print('\n== %s (%d files)' % (cat, len(ms)))
    if subs:
        print('   subcats: %s' % '; '.join(s[9:] for s in subs[:20]))
    sz = {}
    for i in range(0, min(len(ms), 60), 25):
        q = api({'action': 'query', 'titles': '|'.join(ms[i:i + 25]),
                 'prop': 'imageinfo', 'iiprop': 'size'})
        for p in q.get('query', {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            sz[p.get('title')] = (ii.get('width') or 0, ii.get('height') or 0)
        time.sleep(1)
    ms.sort(key=lambda m: -sz.get(m, (0, 0))[0])
    for m in ms[:14]:
        w, h = sz.get(m, (0, 0))
        print('   %5s x %-5s  %s' % (w, h, m))
    time.sleep(1)
