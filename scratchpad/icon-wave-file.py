# -*- coding: utf-8 -*-
"""Print everything Commons records about named files: licence, artist, description,
categories, and the file page's own wikitext.

usage: python scratchpad/icon-wave-file.py "File:One.jpg" ["File:Two.jpg" ...]

The wikitext matters because the ObjectName and the Russian description often
carry the feast day, which is the only thing that separates two saints of one
name in one monastery.
"""
import json, re, sys, time, urllib.error, urllib.parse, urllib.request

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


def plain(v):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', v or '')).strip()


for title in sys.argv[1:]:
    d = api({'action': 'query', 'titles': title, 'prop': 'imageinfo|categories|revisions',
             'iiprop': 'url|extmetadata|size', 'cllimit': 'max',
             'rvprop': 'content', 'rvslots': 'main'})
    page = list(d['query']['pages'].values())[0]
    print('\n########## %s' % page['title'])
    if 'missing' in page:
        print('  MISSING')
        continue
    ii = (page.get('imageinfo') or [{}])[0]
    m = ii.get('extmetadata', {})
    print('  %sx%s  licence: %s  (%s)' % (ii.get('width'), ii.get('height'),
          plain(m.get('LicenseShortName', {}).get('value')),
          plain(m.get('UsageTerms', {}).get('value'))))
    print('  artist: %s' % plain(m.get('Artist', {}).get('value')))
    print('  objectname: %s' % plain(m.get('ObjectName', {}).get('value')))
    print('  desc: %s' % plain(m.get('ImageDescription', {}).get('value'))[:700])
    print('  cats: %s' % '; '.join(c['title'].replace('Category:', '')
                                   for c in page.get('categories', [])))
    rev = page.get('revisions', [{}])[0]
    txt = rev.get('slots', {}).get('main', {}).get('*', '') or rev.get('*', '')
    print('  --- wikitext ---')
    print('\n'.join('  ' + l for l in txt.splitlines() if l.strip())[:2000])
    time.sleep(1)
