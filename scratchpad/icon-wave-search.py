# -*- coding: utf-8 -*-
"""Search Commons for candidate files, printing title, licence, categories and description.

usage: python scratchpad/icon-wave-search.py "query" ["query" ...]

Search only. It writes nothing and fetches no bytes; geticon.py remains the
only writer. The point is to read Commons' *description and categories*, not
its title: the title is what the wrong-saint failure mode rides in on.
"""
import io, json, re, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'


def get(url, timeout=60):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for wait in (0, 10, 30, 60):
        if wait:
            time.sleep(wait)
        try:
            return urllib.request.urlopen(req, timeout=timeout).read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
    raise RuntimeError('429: ' + url)


def api(params):
    params = dict(params, format='json')
    return json.loads(get(API + '?' + urllib.parse.urlencode(params)))


def plain(v):
    if not v:
        return ''
    v = re.sub(r'<[^>]+>', ' ', v)
    return re.sub(r'\s+', ' ', v).strip()


for q in sys.argv[1:]:
    print('\n########## %s' % q)
    if q.startswith('cat:'):
        # A category listing beats a title search: it is Commons' own grouping,
        # which is the evidence a note is allowed to cite.
        d = api({'action': 'query', 'list': 'categorymembers',
                 'cmtitle': 'Category:' + q[4:], 'cmtype': 'file', 'cmlimit': 30})
        hits = [h['title'] for h in d.get('query', {}).get('categorymembers', [])]
    else:
        # Without `filetype:bitmap` a Greek or Romanian query returns nothing but
        # scanned books: Commons' full text includes every page of every PDF.
        d = api({'action': 'query', 'list': 'search',
                 'srsearch': q + ' filetype:bitmap',
                 'srnamespace': 6, 'srlimit': 12})
        hits = [h['title'] for h in d.get('query', {}).get('search', [])]
    if not hits:
        print('  (no hits)')
        continue
    time.sleep(1)
    d2 = api({'action': 'query', 'titles': '|'.join(hits), 'prop': 'imageinfo|categories',
              'iiprop': 'url|extmetadata|size', 'cllimit': 'max'})
    pages = d2.get('query', {}).get('pages', {})
    order = {t: i for i, t in enumerate(hits)}
    for p in sorted(pages.values(), key=lambda p: order.get(p['title'], 99)):
        ii = (p.get('imageinfo') or [{}])[0]
        meta = ii.get('extmetadata', {})
        lic = plain(meta.get('LicenseShortName', {}).get('value'))
        art = plain(meta.get('Artist', {}).get('value'))
        desc = plain(meta.get('ImageDescription', {}).get('value'))[:500]
        cats = [c['title'].replace('Category:', '') for c in p.get('categories', [])]
        cats = [c for c in cats if not c.startswith(('CC-', 'PD-', 'Files ', 'Media ',
                                                     'Self-published', 'Images ',
                                                     'Uploaded ', 'Pages ', 'License '))]
        print('\n- %s' % p['title'])
        print('  licence: %s | artist: %s | %sx%s'
              % (lic, art[:60], ii.get('width'), ii.get('height')))
        if desc:
            print('  desc: %s' % desc)
        if cats:
            print('  cats: %s' % '; '.join(cats[:10]))
    time.sleep(1)
