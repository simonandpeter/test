# -*- coding: utf-8 -*-
"""Sweep the language Wikipedias for every heroless slug, and print the Commons
files their articles carry.

usage: node scripts/heroless.mjs greek romanian | python scratchpad/icon-wave-wikisweep.py

The Commons sweep's opposite number, written because Commons answers 429 to any
brisk caller and the Wikipedias do not. The lever is the same one that found
germanus-of-constantinople, paraskevi-of-rome and justin-popovich by hand: a
language Wikipedia's article on a saint names the one Commons file of him that
Commons' own search, tokenising Greek and Cyrillic badly, will not surface.

Proposes, never writes, and every row still needs reading — the article found
for a name may be another saint of that name, which is this task's known
failure mode.
"""
import io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
LANGS = {'el': 'el', 'ro': 'ro', 'ru': 'ru', 'sr': 'sr', 'ka': 'ka', 'bg': 'bg'}
CHROME = ('ambox', 'commons-logo', 'wiki', 'disambig', 'question_book',
          'edit-', 'flag_of', 'symbol_', 'crystal', 'p_religion', 'folder',
          'searchtool', 'nuvola', 'gnome-', 'text_document', 'portal')


def api(lang, params):
    url = ('https://%s.wikipedia.org/w/api.php?' % lang) + urllib.parse.urlencode(
        dict(params, format='json'))
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for wait in (0, 5, 15):
        if wait:
            time.sleep(wait)
        try:
            return json.loads(urllib.request.urlopen(req, timeout=45).read())
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
        except Exception:
            return {}
    return {}


slugs = []
for line in sys.stdin:
    line = line.strip()
    if not line or ':' in line:
        continue
    s = line.split()[0]
    if os.path.isdir(os.path.join('saints', s)) and s not in slugs:
        slugs.append(s)

for slug in slugs:
    if os.path.exists(os.path.join('saints', slug, 'images', 'icon.jpg')):
        continue
    d = json.load(io.open(os.path.join('saints', slug, 'saint.json'), encoding='utf-8'))
    rows = []
    for n in d.get('names', []):
        lang = LANGS.get(n.get('lang'))
        form = (n.get('form') or '').strip()
        if not lang or not form:
            continue
        r = api(lang, {'action': 'query', 'list': 'search', 'srsearch': form,
                       'srnamespace': 0, 'srlimit': 3})
        titles = [h['title'] for h in r.get('query', {}).get('search', [])]
        time.sleep(0.3)
        if not titles:
            continue
        r2 = api(lang, {'action': 'query', 'titles': '|'.join(titles),
                        'prop': 'images', 'imlimit': 'max'})
        for p in r2.get('query', {}).get('pages', {}).values():
            files = []
            for im in p.get('images', []):
                t = im['title']
                low = t.lower()
                if low.endswith(('.svg', '.ogg', '.oga', '.webm')):
                    continue
                if any(k in low for k in CHROME):
                    continue
                files.append(t)
            if files:
                rows.append((lang, p.get('title'), files))
        time.sleep(0.3)
    if rows:
        print('\n=== %s' % slug)
        for lang, title, files in rows:
            print('  [%s] %s' % (lang, title))
            for f in files[:6]:
                print('       %s' % f)
        sys.stdout.flush()
