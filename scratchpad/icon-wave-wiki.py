# -*- coding: utf-8 -*-
"""List the Commons files used on a Wikipedia article.

usage: python scratchpad/icon-wave-wiki.py <lang> "Article title" ["Another" ...]

A language Wikipedia's own article on a saint is the shortest route to the one
Commons file of him that a Commons title search cannot find, Cyrillic and Greek
titles tokenising badly there.
"""
import json, sys, time, urllib.error, urllib.parse, urllib.request

UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
lang = sys.argv[1]
API = 'https://%s.wikipedia.org/w/api.php' % lang


def api(params):
    url = API + '?' + urllib.parse.urlencode(dict(params, format='json'))
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for wait in (0, 10, 30):
        if wait:
            time.sleep(wait)
        try:
            return json.loads(urllib.request.urlopen(req, timeout=60).read())
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
    raise RuntimeError('429')


for title in sys.argv[2:]:
    d = api({'action': 'query', 'titles': title, 'prop': 'images', 'imlimit': 'max',
             'redirects': 1})
    pages = d.get('query', {}).get('pages', {})
    for p in pages.values():
        print('\n##### %s' % p.get('title'))
        if 'missing' in p:
            print('  (no such article)')
            continue
        for im in p.get('images', []):
            n = im['title']
            if n.lower().endswith(('.svg', '.ogg')):
                continue
            print('  ' + n)
    time.sleep(1)
