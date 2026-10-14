# -*- coding: utf-8 -*-
"""Ask Wikidata for a saint's Commons category, then list it.

usage: python scratchpad/m1wd.py <slug> [<slug> ...]

Guessing category titles only finds the saints Commons happens to have titled
in English. Commons calls Arsenije I of Serbia and Nil Sorsky by names this
corpus does not store, so the title is read rather than guessed: Wikidata is
searched in Russian, Serbian, Greek and English for the folder's own name
forms, and the P373 (Commons category) claim of each hit is read off. The
label of the hit is printed so the reader can see which entity answered —
a namesake is the failure mode and an unchecked P373 would hide it.
"""
import io, json, os, sys, time, urllib.error, urllib.parse, urllib.request

WD = 'https://www.wikidata.org/w/api.php'
COMMONS = 'https://commons.wikimedia.org/w/api.php'
UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
IMG = ('.jpg', '.jpeg', '.png', '.tif', '.tiff', '.gif', '.webp')


def api(base, params):
    url = base + '?' + urllib.parse.urlencode(dict(params, format='json'))
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


def wdsearch(term, lang):
    d = api(WD, {'action': 'wbsearchentities', 'search': term,
                 'language': lang, 'uselang': lang, 'type': 'item', 'limit': 6})
    return [(r['id'], r.get('label', ''), r.get('description', ''))
            for r in d.get('search', [])]


def claims(ids):
    d = api(WD, {'action': 'wbgetentities', 'ids': '|'.join(ids),
                 'props': 'claims|labels', 'languages': 'en|ru|sr|el'})
    out = {}
    for qid, e in d.get('entities', {}).items():
        cat = None
        for c in e.get('claims', {}).get('P373', []):
            cat = c.get('mainsnak', {}).get('datavalue', {}).get('value')
        img = None
        for c in e.get('claims', {}).get('P18', []):
            img = c.get('mainsnak', {}).get('datavalue', {}).get('value')
        out[qid] = (cat, img)
    return out


def members(cat):
    d = api(COMMONS, {'action': 'query', 'list': 'categorymembers',
                      'cmtitle': cat, 'cmtype': 'file|subcat', 'cmlimit': 200})
    return d.get('query', {}).get('categorymembers', [])


def sizes(titles):
    out = {}
    for i in range(0, min(len(titles), 50), 25):
        d = api(COMMONS, {'action': 'query', 'titles': '|'.join(titles[i:i + 25]),
                          'prop': 'imageinfo', 'iiprop': 'size'})
        for p in d.get('query', {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            out[p.get('title')] = (ii.get('width') or 0, ii.get('height') or 0)
        time.sleep(1)
    return out


LANG = {'ru': 'ru', 'sr': 'sr', 'el': 'el', 'ro': 'ro'}

for slug in sys.argv[1:]:
    f = json.load(io.open(os.path.join('saints', slug, 'saint.json'),
                          encoding='utf-8'))
    disp = f.get('display_name') or ''
    feasts = sorted({'%s %s/%s' % (a.get('church'), (a.get('feast') or {}).get('day'),
                                   (a.get('feast') or {}).get('month'))
                     for a in f.get('attestations', [])
                     if (a.get('feast') or {}).get('day')})
    print('\n########## %s  (%s)' % (slug, disp))
    print('  types: %s | feasts: %s' % (', '.join(f.get('types', [])),
                                        '; '.join(feasts)))
    # A bare forename search returns the given-name item and six namesakes, so
    # only forms carrying an epithet are searched; the display name always is,
    # because this corpus writes the epithet into it.
    queries = [(disp, 'en')]
    for n in f.get('names', []):
        if len(n['form'].split()) > 1:
            queries.append((n['form'], LANG.get(n.get('lang'), 'en')))

    hits = []
    for term, lang in queries:
        if not term:
            continue
        try:
            rs = wdsearch(term, lang)
        except Exception as e:
            print('  ! wd %r: %s' % (term, e))
            continue
        for qid, label, desc in rs:
            if qid not in [h[0] for h in hits]:
                hits.append((qid, label, desc, term))
        time.sleep(1)

    if not hits:
        print('  no Wikidata hit')
        continue
    cl = claims([h[0] for h in hits[:30]])
    time.sleep(1)
    cats = []
    for qid, label, desc, term in hits:
        cat, img = cl.get(qid, (None, None))
        if not cat and not img:
            continue
        print('  %s %-34s | %-48s | via %r' % (qid, label[:34], desc[:48], term))
        if cat:
            print('        P373 Category:%s' % cat)
            cats.append('Category:' + cat)
        if img:
            print('        P18  File:%s' % img)

    for c in list(dict.fromkeys(cats))[:5]:
        rows = members(c)
        time.sleep(1)
        ms = [r['title'] for r in rows if r['title'].lower().endswith(IMG)]
        subs = [r['title'][9:] for r in rows if r['title'].startswith('Category:')]
        if subs:
            print('  == %s subcats: %s' % (c, '; '.join(subs[:14])))
        if not ms:
            print('  == %s : no image files' % c)
            continue
        sz = sizes(ms)
        ms.sort(key=lambda m: -sz.get(m, (0, 0))[0])
        print('  == %s (%d files, widest first)' % (c, len(ms)))
        for m in ms[:12]:
            w, h = sz.get(m, (0, 0))
            print('       %5s x %-5s  %s' % (w, h, m))
    time.sleep(2)
