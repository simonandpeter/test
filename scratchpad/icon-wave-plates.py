# -*- coding: utf-8 -*-
"""List the Zhitiya Svyatykh (1903-1911) plates for a given VVDD prefix.

usage: python scratchpad/icon-wave-plates.py 0516 0519 ...

The series is numbered VVDDn with volume 01 = September, so a plate number
carries the saint's day outright — which is the lever a Cyrillic title search
does not give, Commons' search tokenising those titles badly.
"""
import json, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
STEM = 'Жития Святых (1903-1911) - икона '


def api(params):
    params = dict(params, format='json')
    url = API + '?' + urllib.parse.urlencode(params)
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


for vvdd in sys.argv[1:]:
    d = api({'action': 'query', 'list': 'allimages', 'aiprefix': STEM + vvdd,
             'ailimit': 50, 'aiprop': 'url'})
    rows = d.get('query', {}).get('allimages', [])
    print('\n##### %s  (%d)' % (vvdd, len(rows)))
    for r in rows:
        print('  %s' % r['title'])
    time.sleep(1)
