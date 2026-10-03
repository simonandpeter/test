# -*- coding: utf-8 -*-
"""Print Commons' own description, categories and licence for a file.

usage: python cdesc.py "File:Something.jpg" ...

geticon.py's dry run prints the licence and nothing else, so a file whose
title alone does not say which saint it is cannot be read from it. This asks
Commons the question the sourcer actually has: whose picture is this. Serial
and paced, like everything else aimed at Commons.
"""
import json
import re
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


def plain(v):
    return re.sub(r'<[^>]+>', ' ', v or '').replace('\n', ' ').strip()


for title in sys.argv[1:]:
    d = get(API + '?' + urllib.parse.urlencode({
        'action': 'query', 'format': 'json', 'titles': title,
        'prop': 'imageinfo|categories', 'cllimit': '20',
        'iiprop': 'extmetadata|size|url',
    }))
    page = list((d.get('query') or {}).get('pages', {}).values())[0]
    print('== ' + title)
    if 'missing' in page:
        print('   (missing)')
        continue
    ii = page['imageinfo'][0]
    meta = ii.get('extmetadata', {})
    for k in ('LicenseShortName', 'Artist', 'DateTimeOriginal',
              'ImageDescription', 'ObjectName'):
        v = plain(meta.get(k, {}).get('value'))
        if v:
            print('   %-18s %s' % (k, v[:400]))
    cats = [c['title'].replace('Category:', '')
            for c in page.get('categories', [])]
    print('   categories        ' + '; '.join(cats))
    sys.stdout.flush()
    time.sleep(2)
