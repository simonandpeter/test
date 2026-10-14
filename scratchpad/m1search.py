# -*- coding: utf-8 -*-
"""Method 1: find a saint's own Commons category, then list its image members.

usage: python scratchpad/m1search.py <slug> [<slug> ...]

Serial, one client. For each slug it tries category titles built from the
folder's own names ("Category:Saint X", "Category:Icons of Saint X", ...),
existence-checked rather than searched, and then a namespace-14 search whose
hits are kept only if the title looks like this saint rather than a modern
namesake. Members are listed widest first, with pixel size. Nothing is
fetched and nothing is written; the judgement stays with the reader.

A bare forename search returns footballers and actors, so the title filter is
the whole point: a hit is kept only when it carries "saint"/"st."/"icons of"
or one of the display name's own distinguishing words.
"""
import io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
IMG = ('.jpg', '.jpeg', '.png', '.tif', '.tiff', '.gif', '.webp')
STOP = set('of the and new martyr martyrs saint st holy venerable new'.split())
# A category about a building, a town or a book named after the saint holds
# photographs of masonry, not of him. Twenty-seven aerial views of St Stephen,
# New Brunswick came back on the first run.
JUNK = ('church', 'cathedral', 'chapel', 'monastery of', 'avenue', 'street',
        'institute', 'catechism', 'brunswick', 'rectory', 'parish', 'basilica',
        'works about', 'writings', 'expositions', 'temple', 'schools',
        'buildings', 'statues of', 'museum', 'society', 'university')
SAINTY = ('saint', 'st.', 'st ', 'icons of', 'sveti', 'svet', 'ikone',
          'sfantul', 'sfantul', 'agios', 'hagios')


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
    raise RuntimeError('429 ' + url)


def exists(titles):
    """Which of these category titles Commons actually has."""
    out = []
    for i in range(0, len(titles), 25):
        d = api({'action': 'query', 'titles': '|'.join(titles[i:i + 25]),
                 'prop': 'categoryinfo'})
        for p in d.get('query', {}).get('pages', {}).values():
            if 'missing' not in p:
                out.append(p['title'])
        time.sleep(1)
    return out


def catsearch(term):
    d = api({'action': 'query', 'list': 'search', 'srsearch': term,
             'srnamespace': 14, 'srlimit': 10})
    return [r['title'] for r in d.get('query', {}).get('search', [])]


def members(cat):
    d = api({'action': 'query', 'list': 'categorymembers', 'cmtitle': cat,
             'cmtype': 'file', 'cmlimit': 200})
    return [r['title'] for r in d.get('query', {}).get('categorymembers', [])]


def subcats(cat):
    d = api({'action': 'query', 'list': 'categorymembers', 'cmtitle': cat,
             'cmtype': 'subcat', 'cmlimit': 50})
    return [r['title'] for r in d.get('query', {}).get('categorymembers', [])]


def sizes(titles):
    out = {}
    for i in range(0, len(titles), 25):
        d = api({'action': 'query', 'titles': '|'.join(titles[i:i + 25]),
                 'prop': 'imageinfo', 'iiprop': 'size'})
        for p in d.get('query', {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            out[p.get('title')] = (ii.get('width') or 0, ii.get('height') or 0)
        time.sleep(1)
    return out


def keyword(disp):
    """The display name's distinguishing words, lowercased."""
    ws = re.findall(r"[A-Za-zЀ-ӿ']+", disp.lower())
    return [w for w in ws if w not in STOP and len(w) > 3]


for slug in sys.argv[1:]:
    sp = os.path.join('saints', slug, 'saint.json')
    f = json.load(io.open(sp, encoding='utf-8'))
    disp = f.get('display_name') or ''
    feasts = []
    for a in f.get('attestations', []):
        fe = a.get('feast') or {}
        if fe.get('day'):
            feasts.append('%s %s/%s %s' % (a.get('church'), fe['day'],
                                           fe.get('month'), fe.get('calendar')))
    forms = [n['form'] for n in f.get('names', [])]
    print('\n########## %s  (%s)' % (slug, disp))
    print('  types: %s | feasts: %s' % (', '.join(f.get('types', [])),
                                        '; '.join(sorted(set(feasts)))))
    print('  names: %s' % ' | '.join(forms))

    guesses = []
    for n in [disp] + forms:
        if not n:
            continue
        guesses += ['Category:' + n, 'Category:Saint ' + n,
                    'Category:Icons of Saint ' + n, 'Category:Icons of ' + n]
    guesses = list(dict.fromkeys(guesses))
    cats = exists(guesses)
    print('  direct: %s' % (cats or '(none)'))

    kw = keyword(disp)
    # A bare forename search returns footballers. Only search when the direct
    # titles found nothing, and then keep a hit only if it is both sainty and
    # carries one of the display name's own distinguishing words — or, where
    # the name has no distinguishing word at all, nothing is kept and the slug
    # is reported as unresolved rather than guessed at.
    if not cats:
        for q in dict.fromkeys([disp, disp + ' icon', disp + ' saint']):
            if not q:
                continue
            hits = catsearch(q)
            time.sleep(1)
            for h in hits:
                low = h.lower()
                if h in cats:
                    continue
                if any(j in low for j in JUNK):
                    continue
                if any(s in low for s in SAINTY) and any(k in low for k in kw):
                    cats.append(h)
                    print('  search %-28r kept %s' % (q, h))
        if not cats:
            print('  NO CATEGORY FOUND (kw=%s)' % kw)

    for c in list(cats)[:8]:
        for s in subcats(c):
            low = s.lower()
            if 'icon' in low and s not in cats:
                cats.append(s)
                print('  subcat of %s: %s' % (c, s))
        time.sleep(1)

    for c in cats[:8]:
        ms = [m for m in members(c) if m.lower().endswith(IMG)]
        time.sleep(1)
        if not ms:
            print('  == %s : no image files' % c)
            continue
        sz = sizes(ms[:60])
        ms.sort(key=lambda m: -sz.get(m, (0, 0))[0])
        print('  == %s (%d files, widest first)' % (c, len(ms)))
        for m in ms[:10]:
            w, h = sz.get(m, (0, 0))
            print('       %5s x %-5s  %s' % (w, h, m))
    time.sleep(2)
