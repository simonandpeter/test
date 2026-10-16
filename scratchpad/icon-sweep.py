# -*- coding: utf-8 -*-
"""Search several CC hosts for one saint's picture, and report candidates only.

usage: python scratchpad/icon-sweep.py <slug>...
       python scratchpad/icon-sweep.py --queue scratchpad/icon-queue.txt [--from N] [--count N]

TODO 5 closed the Commons seam after four waves whose per-batch rate fell to
zero, and its reading of why is the premise here: of the saints left, most store
**no Russian name**, and routes 1 and 3 of that programme needed one — route 3
searched ru.wikipedia only. The queue that remains is Cretan, Cypriot, Athonite
and Romanian local saints and Ottoman-era neomartyrs, and they store Greek and
Romanian forms. So the first two routes below are that same route 3 pointed at
the wikipedia whose language the saint's own name is in.

Routes, cheapest first, each named in the output so a hit can be checked:

  wp/<lang>   full-text search on el/ro/ru/sr/bg/en.wikipedia for a stored name
              form, then the article's `wikibase_item`, then P18 and P373.
              `wbsearchentities` matches a label by PREFIX, which is why the
              search goes through an article rather than straight at Wikidata.
  sdc         Commons structured data: `haswbstatement:P180=<qid>` in namespace
              6 finds files that DEPICT the entity whatever they are titled or
              categorised under. Nothing in the four waves used it.
  cat         members of the P373 Commons category.
  openverse   api.openverse.org, which aggregates Flickr, Smithsonian, museum
              and Commons collections. Filtered to cc0, by, by-sa and pdm:
              **nd forbids the crop `make_thumbs.py` performs and nc is the
              author's call, so neither is requested here.**
  europeana   api.europeana.eu with its published demo key, reusability=open.

This writes nothing and downloads no pixels. Licences printed here are what the
host's API says; the fetcher reads the licence again off the authoritative host
before any file lands, because a sourcer can be wrong about a licence in a way
nobody would catch later (`scratchpad/geticon.py`'s own rule).
"""
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
OV_LICENCES = 'cc0,by,by-sa,pdm'
WIKIS = ('el', 'ro', 'ru', 'sr', 'bg', 'en')
# Commons serves the unscaled original below ~1250px and 429s it hard, so a
# candidate is reported with its native width and the fetcher asks for 1200.
FLOOR = 450


# A caller working through a queue sets this to `time.monotonic() + seconds`
# before each row and clears it after. Without it one saint can hold a whole
# slice: on 16 October a single row sat in these ladders for 31 minutes while
# 80 others waited behind it, because nothing in a ladder knows how long the
# row has already spent.
DEADLINE = None


class OutOfTime(RuntimeError):
    """The row's own budget ran out mid-ladder; the sweep itself is fine."""


def _left():
    return None if DEADLINE is None else DEADLINE - time.monotonic()


def get(url, timeout=40, tries=(0, 5, 15, 45)):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for wait in tries:
        left = _left()
        if left is not None and left <= wait:
            raise OutOfTime('row budget spent before a %ds wait: %s' % (wait, url))
        if wait:
            time.sleep(wait)
        try:
            return urllib.request.urlopen(req, timeout=min(timeout, left) if left else timeout).read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503):
                raise
    raise RuntimeError('host kept throttling: ' + url)


def jget(url):
    return json.loads(get(url))


def api(host, params):
    return jget('https://%s/w/api.php?%s' % (host, urllib.parse.urlencode(params)))


def forms(slug):
    """Stored name forms, longest first, with the display name last.

    Longest first because «Таврион Амфипольский (Македонский)» finds the right
    article where «Ταυρίων» finds a Greek noun, and the display name is last
    because it is this corpus's own English coinage rather than anyone's name.
    """
    d = json.load(io.open(os.path.join('saints', slug, 'saint.json'), encoding='utf-8'))
    out = []
    for n in d.get('names') or []:
        f = (n.get('form') or '').strip()
        if f:
            out.append((n.get('lang') or '', f))
    out.sort(key=lambda p: -len(p[1]))
    out.append(('en', d.get('display_name') or slug.replace('-', ' ')))
    return out, d


def paren_free(form):
    """«Иоанн (епископ Суздальский)» also searched as «Иоанн Суздальский»."""
    bare = re.sub(r'\s*\([^)]*\)\s*', ' ', form).strip()
    return bare if bare and bare != form else None


def wiki_entities(slug):
    """(qid, how) for every Wikidata entity a wikipedia search reaches."""
    found = {}
    names, _ = forms(slug)
    for lang, form in names:
        hosts = [lang] if lang in WIKIS else []
        if 'en' not in hosts:
            hosts.append('en')
        queries = [form]
        bare = paren_free(form)
        if bare:
            queries.append(bare)
        for host in hosts:
            for q in queries:
                try:
                    r = api('%s.wikipedia.org' % host, {
                        'action': 'query', 'format': 'json', 'list': 'search',
                        'srsearch': q, 'srlimit': 3, 'srnamespace': 0,
                    })
                except Exception as exc:
                    print('    ! wp/%s %s: %s' % (host, q[:30], exc))
                    continue
                titles = [h['title'] for h in r.get('query', {}).get('search', [])]
                if not titles:
                    continue
                p = api('%s.wikipedia.org' % host, {
                    'action': 'query', 'format': 'json', 'prop': 'pageprops',
                    'titles': '|'.join(titles),
                })
                for page in p.get('query', {}).get('pages', {}).values():
                    qid = (page.get('pageprops') or {}).get('wikibase_item')
                    if qid and qid not in found:
                        found[qid] = 'wp/%s "%s"' % (host, page['title'])
    return found


def entity_media(qid):
    """P18 images and the P373 Commons category of one entity, plus its label."""
    d = jget('https://www.wikidata.org/wiki/Special:EntityData/%s.json' % qid)
    ent = d['entities'][qid]
    label = (ent.get('labels', {}).get('en') or ent.get('labels', {}).get('el')
             or ent.get('labels', {}).get('ru') or {}).get('value', '')
    desc = (ent.get('descriptions', {}).get('en') or {}).get('value', '')
    claims = ent.get('claims', {})

    def vals(pid):
        out = []
        for c in claims.get(pid, []):
            v = (c.get('mainsnak') or {}).get('datavalue', {}).get('value')
            if isinstance(v, str):
                out.append(v)
        return out

    def qids(pid):
        out = []
        for c in claims.get(pid, []):
            v = (c.get('mainsnak') or {}).get('datavalue', {}).get('value')
            if isinstance(v, dict) and v.get('id'):
                out.append(v['id'])
        return out

    return {
        'label': label, 'desc': desc, 'p18': vals('P18'), 'p373': vals('P373'),
        'human': 'Q5' in qids('P31'), 'canonised': bool(claims.get('P411')),
        'types': qids('P31'),
    }


# A wikipedia search for a forename returns the famous holder of it, and for a
# Greek saint's name the ordinary Greek noun: «Ταυρίων» reached cattle, a suburb
# of Athens and a football club, each with a well-stocked Commons category. So
# an entity is read before its pictures are, and this is the reading.
SAINTY = re.compile(
    r'saint|martyr|monk|nun|hermit|ascetic|bishop|abbot|abbess|patriarch|'
    r'hieromartyr|neomartyr|confessor|archbishop|presbyter|deacon|'
    r'άγι|αγί|όσι|οσί|μάρτυ|sfânt|cuvios|mucenic|свят|мученик|преподобн|'
    r'светит|светог|мучени',
    re.I,
)


def sainty(ent):
    """Why this entity is or is not a person this corpus could be looking at.

    Returns None when it passes. `canonised` is P411 (canonization status),
    which settles it on its own; otherwise a human whose label or description
    says saint, martyr or a rank in any of the five languages.
    """
    if not ent['human']:
        return 'not a person (P31 %s)' % (','.join(ent['types'][:3]) or 'unset')
    if ent['canonised'] or SAINTY.search(ent['label'] + ' ' + ent['desc']):
        return None
    return 'a person, but nothing says saint: "%s"' % (ent['desc'] or ent['label'])[:50]


def commons_files(titles):
    """Native width and licence for each File: title, from Commons imageinfo."""
    out = []
    for i in range(0, len(titles), 20):
        batch = titles[i:i + 20]
        r = api('commons.wikimedia.org', {
            'action': 'query', 'format': 'json', 'titles': '|'.join(batch),
            'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata',
            'iiextmetadatafilter': 'LicenseShortName|Artist',
        })
        for page in r.get('query', {}).get('pages', {}).values():
            ii = (page.get('imageinfo') or [{}])[0]
            meta = ii.get('extmetadata') or {}
            lic = (meta.get('LicenseShortName') or {}).get('value', '?')
            out.append({
                'title': page.get('title', '?'), 'w': ii.get('width') or 0,
                'h': ii.get('height') or 0, 'lic': re.sub(r'<[^>]+>', '', lic),
            })
    return out


def sdc(qid):
    r = api('commons.wikimedia.org', {
        'action': 'query', 'format': 'json', 'list': 'search', 'srnamespace': 6,
        'srsearch': 'haswbstatement:P180=%s' % qid, 'srlimit': 12,
    })
    return [h['title'] for h in r.get('query', {}).get('search', [])]


def category(cat):
    title = cat if cat.lower().startswith('category:') else 'Category:' + cat
    r = api('commons.wikimedia.org', {
        'action': 'query', 'format': 'json', 'list': 'categorymembers',
        'cmtitle': title, 'cmtype': 'file', 'cmlimit': 20,
    })
    return [m['title'] for m in r.get('query', {}).get('categorymembers', [])]


def openverse(q):
    url = 'https://api.openverse.org/v1/images/?' + urllib.parse.urlencode({
        'q': q, 'license': OV_LICENCES, 'page_size': 6,
    })
    try:
        r = jget(url)
    except Exception as exc:
        return [{'err': str(exc)}]
    out = []
    for h in r.get('results', []):
        out.append({
            'title': (h.get('title') or '')[:60], 'lic': h.get('license', '?'),
            'w': h.get('width') or 0, 'h': h.get('height') or 0,
            'url': h.get('url'), 'page': h.get('foreign_landing_url'),
            'by': (h.get('creator') or '')[:30], 'src': h.get('source'),
        })
    return out


def europeana(q):
    url = 'https://api.europeana.eu/record/v2/search.json?' + urllib.parse.urlencode({
        'wskey': 'api2demo', 'query': q, 'rows': 6, 'media': 'true',
        'reusability': 'open', 'qf': 'TYPE:IMAGE',
    })
    try:
        r = jget(url)
    except Exception as exc:
        return [{'err': str(exc)}]
    out = []
    for h in r.get('items', []):
        out.append({
            'title': '; '.join(h.get('title') or [])[:60],
            'lic': '; '.join(h.get('rights') or [])[:60],
            'url': (h.get('edmIsShownBy') or [None])[0],
            'page': h.get('guid'), 'src': '; '.join(h.get('dataProvider') or [])[:30],
        })
    return out


def sweep(slug):
    print('=' * 72)
    names, folder = forms(slug)
    print('%s  %s' % (slug, folder.get('display_name', '')))
    print('  forms: ' + ' | '.join('%s:%s' % (l, f) for l, f in names[:4]))

    ents = wiki_entities(slug)
    seen_files = set()
    if not ents:
        print('  no wikipedia article on el/ro/ru/sr/bg/en for any stored form')
    for qid, how in list(ents.items())[:8]:
        ent = entity_media(qid)
        why_not = sainty(ent)
        if why_not:
            print('  - %s via %s — SKIPPED: %s' % (qid, how, why_not))
            continue
        print('  %s via %s — %s (%s)' % (qid, how, ent['label'], ent['desc'][:60]))
        p18, p373 = ent['p18'], ent['p373']
        titles = ['File:' + f for f in p18] + [t for t in sdc(qid)]
        for cat in p373[:2]:
            titles += category(cat)
        titles = [t for t in titles if t not in seen_files]
        seen_files.update(titles)
        for f in commons_files(titles[:24]):
            mark = 'FLOOR' if f['w'] < FLOOR else '     '
            print('      %s %5dx%-5d %-22s %s' % (mark, f['w'], f['h'], f['lic'][:22], f['title']))

    for lang, form in names[:2]:
        for h in openverse(form):
            if 'err' in h:
                print('    ! openverse: %s' % h['err'])
                break
            if not SAINTY.search(h['title']):
                continue
            mark = 'FLOOR' if h['w'] and h['w'] < FLOOR else '     '
            print('   ov %s %5sx%-5s %-10s %-14s %s' % (
                mark, h['w'], h['h'], h['lic'], (h['src'] or '')[:14], h['title']))
            print('        %s' % h['page'])
        for h in europeana(form):
            if 'err' in h:
                print('    ! europeana: %s' % h['err'])
                break
            if not SAINTY.search(h['title']):
                continue
            print('   eu %-24s %-20s %s' % (h['lic'][:24], h['src'], h['title']))
            print('        %s' % h['page'])


args = [a for a in sys.argv[1:] if not a.startswith('--')]
if '--queue' in sys.argv:
    path = args[0]
    slugs = [l.strip() for l in io.open(path, encoding='utf-8') if l.strip()]
    start = int(sys.argv[sys.argv.index('--from') + 1]) if '--from' in sys.argv else 0
    count = int(sys.argv[sys.argv.index('--count') + 1]) if '--count' in sys.argv else len(slugs)
    slugs = slugs[start:start + count]
else:
    slugs = args

for slug in slugs:
    try:
        sweep(slug)
    except Exception as exc:
        print('=' * 72)
        print('%s  SWEEP FAILED: %s' % (slug, exc))
