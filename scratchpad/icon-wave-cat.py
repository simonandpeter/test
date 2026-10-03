# -*- coding: utf-8 -*-
"""List every file title in a Commons category, paging to the end.

usage: python scratchpad/icon-wave-cat.py "Category name" [substring]

Titles only, so a large category costs little to read; the substring filters.
"""
import json, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'


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
    raise RuntimeError('429')


cat = sys.argv[1]
needle = sys.argv[2].lower() if len(sys.argv) > 2 else None
cont, titles = None, []
while True:
    p = {'action': 'query', 'list': 'categorymembers', 'cmtitle': 'Category:' + cat,
         'cmtype': 'file|subcat', 'cmlimit': 'max'}
    if cont:
        p['cmcontinue'] = cont
    d = api(p)
    titles += [m['title'] for m in d.get('query', {}).get('categorymembers', [])]
    cont = d.get('continue', {}).get('cmcontinue')
    if not cont:
        break
    time.sleep(1)

shown = [t for t in titles if not needle or needle in t.lower()]
print('%d in category, %d shown' % (len(titles), len(shown)))
for t in shown:
    print('  ' + t)
