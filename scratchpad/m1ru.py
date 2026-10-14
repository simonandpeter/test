# -*- coding: utf-8 -*-
"""Reach a saint's Commons category through the Russian Wikipedia.

usage: python scratchpad/m1ru.py <slug> [<slug> ...]

`wbsearchentities` matches a label by PREFIX, so «Иоанн Суздальский» misses an
entity Wikidata labels «Иоанн (епископ Суздальский)» and the saint comes back
as 'no Wikidata hit' when he has an article and a category. This goes the long
way instead: full-text search on ru.wikipedia for the folder's own Russian
form, read each hit's `wikibase_item`, then that item's P373 and P18. The hit's
article title is printed so a namesake is visible rather than hidden.
"""
import io, json, os, sys, time, urllib.error, urllib.parse, urllib.request

RU = 'https://ru.wikipedia.org/w/api.php'
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


def sizes(titles):
    out = {}
    # 25 titles at a time answered 414 URI Too Long on
    # theodore-companion-of-terentius, whose hits are Russian titles that
    # percent-encode to ~200 bytes each, and the crash took the rest of that
    # invocation's saints with it. Chunk by encoded length, not by count.
    chunks, cur, n = [], [], 0
    for t in titles[:50]:
        cost = len(urllib.parse.quote(t)) + 3
        if cur and (n + cost > 1800 or len(cur) >= 25):
            chunks.append(cur)
            cur, n = [], 0
        cur.append(t)
        n += cost
    if cur:
        chunks.append(cur)
    for chunk in chunks:
        d = api(COMMONS, {'action': 'query', 'titles': '|'.join(chunk),
                          'prop': 'imageinfo', 'iiprop': 'size'})
        for p in d.get('query', {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            out[p.get('title')] = (ii.get('width') or 0, ii.get('height') or 0)
        time.sleep(1)
    return out


for slug in sys.argv[1:]:
    f = json.load(io.open(os.path.join('saints', slug, 'saint.json'),
                          encoding='utf-8'))
    disp = f.get('display_name') or ''
    forms = [n['form'] for n in f.get('names', [])
             if n.get('lang') in ('ru', 'sr') and len(n['form'].split()) > 1]
    print('\n########## %s  (%s)' % (slug, disp))
    if not forms:
        forms = [n['form'] for n in f.get('names', []) if n.get('lang') == 'ru']
    arts = []
    for form in forms[:2]:
        d = api(RU, {'action': 'query', 'list': 'search', 'srsearch': form,
                     'srlimit': 4})
        for r in d.get('query', {}).get('search', []):
            if r['title'] not in arts:
                arts.append(r['title'])
        time.sleep(1)
    if not arts:
        print('  no ru.wikipedia article for %s' % forms)
        continue
    d = api(RU, {'action': 'query', 'titles': '|'.join(arts[:8]),
                 'prop': 'pageprops'})
    qids = {}
    for p in d.get('query', {}).get('pages', {}).values():
        q = (p.get('pageprops') or {}).get('wikibase_item')
        if q:
            qids[q] = p['title']
    time.sleep(1)
    if not qids:
        print('  articles %s carry no wikibase_item' % arts[:4])
        continue
    d = api(WD, {'action': 'wbgetentities', 'ids': '|'.join(list(qids)[:12]),
                 'props': 'claims'})
    time.sleep(1)
    cats, files = [], []
    for qid, e in d.get('entities', {}).items():
        cl = e.get('claims', {})
        cat = next((c['mainsnak']['datavalue']['value']
                    for c in cl.get('P373', []) if c.get('mainsnak', {}).get('datavalue')), None)
        img = next((c['mainsnak']['datavalue']['value']
                    for c in cl.get('P18', []) if c.get('mainsnak', {}).get('datavalue')), None)
        if cat or img:
            print('  %-9s %-44s cat=%s img=%s' % (qid, qids.get(qid, '')[:44],
                                                  cat, img))
        if cat:
            cats.append('Category:' + cat)
        if img:
            files.append('File:' + img)
    if files:
        sz = sizes(files)
        for ff in files:
            w, h = sz.get(ff, (0, 0))
            print('     P18 %5s x %-5s %s' % (w, h, ff))
    for c in list(dict.fromkeys(cats))[:4]:
        d = api(COMMONS, {'action': 'query', 'list': 'categorymembers',
                          'cmtitle': c, 'cmtype': 'file|subcat', 'cmlimit': 200})
        time.sleep(1)
        rows = d.get('query', {}).get('categorymembers', [])
        ms = [r['title'] for r in rows if r['title'].lower().endswith(IMG)]
        subs = [r['title'][9:] for r in rows if r['title'].startswith('Category:')]
        if subs:
            print('  == %s subcats: %s' % (c, '; '.join(subs[:10])))
        if not ms:
            print('  == %s : no image files' % c)
            continue
        sz = sizes(ms)
        ms.sort(key=lambda m: -sz.get(m, (0, 0))[0])
        print('  == %s (%d files, widest first)' % (c, len(ms)))
        for m in ms[:10]:
            w, h = sz.get(m, (0, 0))
            print('       %5s x %-5s  %s' % (w, h, m))
    time.sleep(2)
