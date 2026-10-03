# -*- coding: utf-8 -*-
"""Sweep Commons for every slug named on stdin, using that folder's own name forms.

usage: node scripts/heroless.mjs greek romanian | python scratchpad/icon-wave-sweep.py

Proposes, never writes. It prints only hits that look like a picture of a saint
— the description or a category saying icon, fresco, mosaic, εικόνα, икона —
because a bare town photograph is the noise this sweep exists to drop. Every
row printed still needs reading: the title is what the wrong-saint failure mode
rides in on.
"""
import io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
LOOKS_LIKE = ('icon', 'ikon', 'fresco', 'fresk', 'mosaic', 'saint', 'orthodox',
              'εικόν', 'άγι', 'икон',
              'sfânt', 'sfant', 'menolog', 'miniature')


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


slugs = []
for line in sys.stdin:
    line = line.strip()
    if not line or ':' in line:
        continue
    s = line.split()[0]
    if os.path.isdir(os.path.join('saints', s)) and s not in slugs:
        slugs.append(s)

for slug in slugs:
    d = json.load(io.open(os.path.join('saints', slug, 'saint.json'), encoding='utf-8'))
    forms = []
    for n in d.get('names', []):
        f = n.get('form', '').strip()
        if f and f not in forms:
            forms.append(f)
    rows = []
    for f in forms[:3]:
        try:
            r = api({'action': 'query', 'list': 'search',
                     'srsearch': f + ' filetype:bitmap', 'srnamespace': 6, 'srlimit': 8})
        except Exception as e:
            print('%-42s !! %s' % (slug, e))
            continue
        hits = [h['title'] for h in r.get('query', {}).get('search', [])]
        if not hits:
            time.sleep(0.5)
            continue
        time.sleep(0.5)
        r2 = api({'action': 'query', 'titles': '|'.join(hits),
                  'prop': 'imageinfo|categories', 'iiprop': 'extmetadata|size',
                  'cllimit': 'max'})
        for p in r2.get('query', {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            m = ii.get('extmetadata', {})
            desc = plain(m.get('ImageDescription', {}).get('value'))
            cats = ' '.join(c['title'] for c in p.get('categories', []))
            hay = (p['title'] + ' ' + desc + ' ' + cats).lower()
            if not any(k in hay for k in LOOKS_LIKE):
                continue
            rows.append((p['title'], plain(m.get('LicenseShortName', {}).get('value')),
                         desc[:160]))
        time.sleep(0.5)
    if rows:
        print('\n=== %s' % slug)
        seen = set()
        for t, lic, desc in rows:
            if t in seen:
                continue
            seen.add(t)
            print('   %s  [%s]' % (t, lic))
            if desc:
                print('      %s' % desc)
        sys.stdout.flush()
