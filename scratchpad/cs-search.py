# -*- coding: utf-8 -*-
"""Colour-replacement search for the grey queue: candidates, measured.

usage: python scratchpad/cs-search.py <from> <count>

Reads scratchpad/grey-queue.json, takes rows [from:from+count], and for each
runs icon-sweep.py's own routes (wikipedia -> wikibase_item -> P18/P373,
Commons structured data P180, the P373 category's members). A candidate file
survives only if Commons states a PD/CC licence, its native width is at least
the width of the icon now held, and -- measured on the downloaded pixels the
way grey-queue.py measures -- its mean HSV saturation is at least 0.12.

Nothing is written into saints/. The output is scratchpad/cs-candidates.json,
one row per queue entry, carrying the entity's label, description and article
intro so a human can check identity (the feast day and the epithet) before any
swap. One request at a time; another agent is on the same API.
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

from PIL import Image

# -I implies -E, so PYTHONIOENCODING is ignored and a Cyrillic file title in a
# log line raised UnicodeEncodeError mid-row, which the row's own try/except
# then recorded as a search failure. The stream is set here instead.
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

_argv = sys.argv
sys.argv = ['icon-sweep.py']
sys.path.insert(0, os.path.join(os.getcwd(), 'scratchpad'))
import importlib
import importlib.util
spec = importlib.util.spec_from_file_location('iconsweep', 'scratchpad/icon-sweep.py')
iconsweep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(iconsweep)
sys.argv = _argv

UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
OK_LICENCE = ('public domain', 'pd', 'cc0', 'cc by', 'cc-by', 'cc by-sa', 'cc-by-sa')
SAT_MIN = 0.12
CACHE = os.path.join(os.environ.get('TEMP', '.'), 'cs-cand')
os.makedirs(CACHE, exist_ok=True)

START = int(_argv[1])
COUNT = int(_argv[2])
OUT = 'scratchpad/cs-candidates.json'


def log(msg):
    sys.stdout.write(msg + '\n')
    sys.stdout.flush()


def get(url, timeout=60, tries=(0, 10, 30, 60, 120)):
    if 'upload.wikimedia.org' in url:
        url = url.split('?', 1)[0]
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for wait in tries:
        if wait:
            time.sleep(wait)
        try:
            return urllib.request.urlopen(req, timeout=timeout).read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503):
                raise
    raise RuntimeError('throttled: ' + url)


def thumburl(title, width=1200):
    d = json.loads(get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({
        'action': 'query', 'titles': title, 'prop': 'imageinfo', 'format': 'json',
        'iiprop': 'url|size|extmetadata', 'iiurlwidth': width,
        'iiextmetadatafilter': 'LicenseShortName|ImageDescription',
    })))
    page = list(d['query']['pages'].values())[0]
    if 'missing' in page or 'imageinfo' not in page:
        return None
    ii = page['imageinfo'][0]
    native = ii.get('width') or 0
    if '/thumb/' not in (ii.get('thumburl') or '') and native > 1:
        time.sleep(2)
        d2 = json.loads(get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({
            'action': 'query', 'titles': title, 'prop': 'imageinfo', 'format': 'json',
            'iiprop': 'url|size', 'iiurlwidth': native - 1,
        })))
        p2 = list(d2['query']['pages'].values())[0]
        i2 = (p2.get('imageinfo') or [{}])[0]
        if '/thumb/' in (i2.get('thumburl') or ''):
            ii = dict(ii, thumburl=i2['thumburl'], thumbwidth=i2.get('thumbwidth'))
    meta = ii.get('extmetadata') or {}
    def val(k):
        v = (meta.get(k) or {}).get('value')
        return re.sub(r'<[^>]+>', ' ', v).strip() if v else None
    return {
        'url': ii.get('thumburl') or ii['url'],
        'native': native, 'height': ii.get('height') or 0,
        'width': min(w for w in (ii.get('thumbwidth'), native) if w),
        'lic': val('LicenseShortName'), 'desc': (val('ImageDescription') or '')[:300],
    }


def saturation(path):
    im = Image.open(path)
    w, h = im.size
    px = list(im.convert('RGB').resize((64, 64)).getdata())
    s = 0.0
    for r, g, b in px:
        hi, lo = max(r, g, b), min(r, g, b)
        if hi:
            s += (hi - lo) / hi
    return round(s / len(px), 4), w, h


def intro(host, title):
    try:
        d = iconsweep.api('%s.wikipedia.org' % host, {
            'action': 'query', 'format': 'json', 'prop': 'extracts',
            'exintro': 1, 'explaintext': 1, 'titles': title,
        })
        page = list(d['query']['pages'].values())[0]
        return re.sub(r'\s+', ' ', page.get('extract') or '')[:600]
    except Exception as exc:
        return '! %s' % exc


def entities_light(slug):
    """A cheaper `wiki_entities`: three forms, each on its own wiki, then en.

    icon-sweep.py's version searches every stored form on its own wiki AND on
    en, two requests each, which is ~20 requests for a saint carrying five
    forms. These queue rows are mostly plate-series saints with articles
    everywhere, so the first forms answer; the rest is paid for nothing.
    """
    names, folder = iconsweep.forms(slug)
    found = {}
    tries = [(l, f) for l, f in names if l in iconsweep.WIKIS][:3]
    tries.append(('en', names[-1][1]))
    for lang, form in tries:
        queries = [form]
        bare = iconsweep.paren_free(form)
        if bare:
            queries.append(bare)
        for q in queries:
            try:
                r = iconsweep.api('%s.wikipedia.org' % lang, {
                    'action': 'query', 'format': 'json', 'list': 'search',
                    'srsearch': q, 'srlimit': 2, 'srnamespace': 0,
                })
            except Exception as exc:
                log('    ! wp/%s %s: %s' % (lang, q[:24], exc))
                continue
            titles = [h['title'] for h in r.get('query', {}).get('search', [])]
            if not titles:
                continue
            p = iconsweep.api('%s.wikipedia.org' % lang, {
                'action': 'query', 'format': 'json', 'prop': 'pageprops',
                'titles': '|'.join(titles),
            })
            for page in p.get('query', {}).get('pages', {}).values():
                qid = (page.get('pageprops') or {}).get('wikibase_item')
                if qid and qid not in found:
                    found[qid] = 'wp/%s "%s"' % (lang, page['title'])
            if len(found) >= 3:
                return found
    return found


PICTURE = re.compile(r'icon|ikon|икон|fresco|mosaic|miniat|'
                     r'menolog|εικ|panel|tempera', re.I)


def consider(row):
    slug = row['slug']
    need_w = row['w']
    out = {'slug': slug, 'display_name': row.get('display_name', ''),
           'old': {'w': row['w'], 'h': row['h'], 'sat': row['sat']},
           'feasts': row.get('feasts', []), 'names': row.get('names', []),
           'entities': [], 'candidates': [], 'notes': []}
    try:
        ents = entities_light(slug)
    except Exception as exc:
        out['notes'].append('wiki_entities failed: %s' % exc)
        ents = {}
    if not ents:
        out['notes'].append('no wikipedia article on el/ro/ru/sr/bg/en for any stored form')
    seen = set()
    tried = 0
    for qid, how in list(ents.items())[:6]:
        try:
            ent = iconsweep.entity_media(qid)
        except Exception as exc:
            out['notes'].append('%s entity read failed: %s' % (qid, exc))
            continue
        why_not = iconsweep.sainty(ent)
        e = {'qid': qid, 'how': how, 'label': ent['label'], 'desc': ent['desc'],
             'skipped': why_not}
        m = re.search(r'wp/(\w+) "(.+)"$', how)
        if m and not why_not:
            e['intro'] = intro(m.group(1), m.group(2))
        out['entities'].append(e)
        if why_not:
            continue
        titles = ['File:' + f for f in ent['p18']]
        try:
            titles += iconsweep.sdc(qid)
        except Exception as exc:
            out['notes'].append('sdc failed: %s' % exc)
        for cat in ent['p373'][:2]:
            try:
                titles += iconsweep.category(cat)
            except Exception as exc:
                out['notes'].append('cat %s failed: %s' % (cat, exc))
        titles = [t for t in titles if t not in seen]
        seen.update(titles)
        try:
            files = iconsweep.commons_files(titles[:24])
        except Exception as exc:
            out['notes'].append('imageinfo failed: %s' % exc)
            continue
        ok = [f for f in files
              if f['w'] >= need_w and any(k in (f['lic'] or '').lower() for k in OK_LICENCE)]
        ok.sort(key=lambda f: (0 if PICTURE.search(f['title']) else 1, -f['w']))
        out['notes'].append('%s: %d files, %d pass size+licence' % (qid, len(files), len(ok)))
        for f in ok:
            if tried >= 6:
                out['notes'].append('download budget spent')
                break
            tried += 1
            try:
                info = thumburl(f['title'])
            except Exception as exc:
                out['notes'].append('%s thumb failed: %s' % (f['title'][:40], exc))
                continue
            if not info:
                continue
            path = os.path.join(CACHE, re.sub(r'[^A-Za-z0-9._-]', '_', f['title'])[:120] + '.jpg')
            try:
                blob = get(info['url'], timeout=120)
            except Exception as exc:
                out['notes'].append('%s fetch failed: %s' % (f['title'][:40], exc))
                continue
            io.open(path, 'wb').write(blob)
            try:
                sat, gw, gh = saturation(path)
            except Exception as exc:
                out['notes'].append('%s unreadable: %s' % (f['title'][:40], exc))
                continue
            cand = {'title': f['title'], 'native_w': f['w'], 'native_h': f['h'],
                    'lic': f['lic'], 'sat': sat, 'got_w': gw, 'got_h': gh,
                    'qid': qid, 'desc': info['desc'], 'path': path,
                    'pass': bool(sat >= SAT_MIN and gw >= need_w)}
            out['candidates'].append(cand)
            log('    %s %5dx%-5d sat %.3f %s %s' % (
                'OK ' if cand['pass'] else '   ', gw, gh, sat, f['lic'][:18], f['title'][:50]))
            time.sleep(1.5)
            if cand['pass'] and len([c for c in out['candidates'] if c['pass']]) >= 3:
                break
        if len([c for c in out['candidates'] if c['pass']]) >= 3:
            break
    return out


# Seconds a single saint may hold the queue. TODO 5's "set it aside and come
# back" was an instruction to the operator and so was not obeyed: on 16 October
# `apollinaria` sat in six download ladders for 31 minutes and the 80 rows
# behind it were never reached. 240 is six of the longest ladder's waits.
#
# Each route has its own try/except, so once the budget is gone the remaining
# routes record it as their failure and the row finishes in milliseconds
# instead of aborting the run; the `OutOfTime` branch below catches the ones
# raised outside a route, which is every download.
BUDGET = int(next((a.split('=')[1] for a in _argv if a.startswith('--budget=')), 240))

rows = json.load(io.open('scratchpad/grey-queue.json', encoding='utf-8'))[START:START + COUNT]
results = []
if os.path.exists(OUT):
    results = json.load(io.open(OUT, encoding='utf-8'))
# A row whose notes carry a crash is not done: the first run of this script
# logged with a cp1252 stdout and died on a Cyrillic file title mid-row, and
# `--redo` is how those rows are searched again without re-searching the rest.
BAD = ('charmap', 'FAILED')
if '--redo' in _argv:
    keep = [r for r in results
            if not any(any(b in n for b in BAD) for n in r.get('notes', []))]
    log('redo: %d of %d rows dropped for a crash note' % (len(results) - len(keep), len(results)))
    results = keep
done = {r['slug'] for r in results}
for i, row in enumerate(rows):
    if row['slug'] in done:
        continue
    log('=' * 60)
    log('[%d/%d] %s  %dx%d sat %.3f  %s' % (
        i + 1, len(rows), row['slug'], row['w'], row['h'], row['sat'],
        row.get('display_name', '')))
    iconsweep.DEADLINE = time.monotonic() + BUDGET
    try:
        r = consider(row)
    except iconsweep.OutOfTime as exc:
        r = {'slug': row['slug'], 'display_name': row.get('display_name', ''),
             'old': {'w': row['w'], 'h': row['h'], 'sat': row['sat']},
             'feasts': row.get('feasts', []), 'names': row.get('names', []),
             'entities': [], 'candidates': [],
             'notes': ['SET ASIDE after %ds: %s' % (BUDGET, exc)]}
        log('  SET ASIDE after %ds: %s' % (BUDGET, exc))
    except Exception as exc:
        r = {'slug': row['slug'], 'display_name': row.get('display_name', ''),
             'old': {'w': row['w'], 'h': row['h'], 'sat': row['sat']},
             'feasts': row.get('feasts', []), 'names': row.get('names', []),
             'entities': [], 'candidates': [], 'notes': ['FAILED: %s' % exc]}
        log('  FAILED: %s' % exc)
    results.append(r)
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(results, ensure_ascii=False, indent=1) + '\n')
    time.sleep(1)
log('done: %d rows' % len(results))
