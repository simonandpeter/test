# -*- coding: utf-8 -*-
"""Measure a candidate Commons file before anything is written.

usage: python scratchpad/cb-try.py <probe.json>
  probe.json: [{"slug": "...", "file": "File:...jpg"}, ...]

Downloads the same `/thumb/` URL geticon.py would take (1200px, or one pixel
under the native width when Commons would hand back the unscaled original) into
the scratchpad, and reports the width Commons served and the mean HSV
saturation over a 64x64 sample -- grey-queue.py's own measure, so the >= 0.12
colour test is made on the pixels that would land.
"""
import io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from PIL import Image

# `-I` implies `-E`, so PYTHONIOENCODING is ignored and a Cyrillic file title in a
# log line raises UnicodeEncodeError mid-row. The stream is set here instead.
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
TMP = os.path.join('scratchpad', 'cb-probe')
os.makedirs(TMP, exist_ok=True)


def get(url, timeout=90):
    if 'upload.wikimedia.org' in url:
        url = url.split('?', 1)[0]
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for wait in (0, 10, 30, 60, 120):
        if wait:
            time.sleep(wait)
        try:
            return urllib.request.urlopen(req, timeout=timeout).read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503):
                raise
    raise RuntimeError('429 ladder exhausted')


def ii(title, width):
    d = json.loads(get(API + '?' + urllib.parse.urlencode({
        'action': 'query', 'titles': title, 'prop': 'imageinfo', 'format': 'json',
        'iiprop': 'url|extmetadata|size', 'iiurlwidth': width})))
    p = list(d['query']['pages'].values())[0]
    if 'missing' in p or 'imageinfo' not in p:
        return None
    return p['imageinfo'][0]


def sat_of(path):
    im = Image.open(path).convert('RGB').resize((64, 64))
    s = 0.0
    px = list(im.getdata())
    for r, g, b in px:
        hi, lo = max(r, g, b), min(r, g, b)
        if hi:
            s += (hi - lo) / hi
    return s / len(px)


for d in json.load(io.open(sys.argv[1], encoding='utf-8')):
    slug, title = d['slug'], d['file']
    try:
        info = ii(title, 1200)
        if info is None:
            print('%-38s MISSING %s' % (slug, title))
            continue
        native = info.get('width') or 0
        if '/thumb/' not in (info.get('thumburl') or '') and native > 1:
            time.sleep(2)
            again = ii(title, native - 1)
            if again and '/thumb/' in (again.get('thumburl') or ''):
                info = dict(info, thumburl=again['thumburl'],
                            thumbwidth=again.get('thumbwidth'))
        url = info.get('thumburl') or info['url']
        lic = ((info.get('extmetadata') or {}).get('LicenseShortName') or {}).get('value', '?')
        lic = re.sub(r'<[^>]+>', '', lic)
        blob = get(url)
        p = os.path.join(TMP, re.sub(r'[^A-Za-z0-9_.-]', '_', slug + '__' + title)[-120:])
        io.open(p, 'wb').write(blob)
        im = Image.open(p)
        served = im.size[0]
        print('%-38s %5dx%-5d native %5d sat %.4f  %-20s %s' % (
            slug, served, im.size[1], native, sat_of(p), lic[:20], title[:60]))
    except Exception as exc:
        print('%-38s ERROR %s  %s' % (slug, str(exc)[:50], title[:50]))
    time.sleep(2)
