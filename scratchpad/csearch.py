# -*- coding: utf-8 -*-
"""Search Commons for candidate icon files, one query at a time.

usage: python csearch.py "query one" "query two" ...

It is deliberately serial and paced: geticon.py's own header records that
Commons answers 429 to a brisk caller, and the standing rule for this task is
one Commons fetcher and nothing beside it. Prints at most eight file titles per
query, with each file's size, so an obviously-wrong thumbnail-sized file can be
skipped without a second request.

It proposes. Which file is the saint is a reading, and the wrong-saint match is
this task's known failure mode.
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for wait in (0, 10, 30, 60, 120):
        if wait:
            time.sleep(wait)
        try:
            return json.loads(urllib.request.urlopen(req, timeout=60).read())
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
    raise RuntimeError('Commons kept answering 429: ' + url)


for q in sys.argv[1:]:
    params = {
        'action': 'query', 'format': 'json', 'generator': 'search',
        'gsrsearch': 'filetype:bitmap ' + q, 'gsrnamespace': '6',
        'gsrlimit': '8', 'prop': 'imageinfo', 'iiprop': 'size',
    }
    d = get(API + '?' + urllib.parse.urlencode(params))
    pages = (d.get('query') or {}).get('pages') or {}
    print('== ' + q)
    if not pages:
        print('   (nothing)')
    for p in sorted(pages.values(), key=lambda p: p.get('index', 0)):
        ii = (p.get('imageinfo') or [{}])[0]
        print('   %s  [%sx%s]' % (p['title'], ii.get('width', '?'),
                                  ii.get('height', '?')))
    sys.stdout.flush()
    time.sleep(2)
