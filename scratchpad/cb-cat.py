# -*- coding: utf-8 -*-
"""List one Commons category's files with widths and licences.

usage: python scratchpad/cb-cat.py "Category:Saint Matthias" ...

For the saints cb-search.py cannot reach by its own routes -- an apostle or
prophet whose Wikidata entity is a biblical figure rather than a human, so the
sainty filter drops it -- the category is named by hand and read here.
"""
import json, re, sys, time, urllib.parse, urllib.request

# `-I` implies `-E`, so PYTHONIOENCODING is ignored and a Cyrillic file title in a
# log line raises UnicodeEncodeError mid-row. The stream is set here instead.
sys.stdout.reconfigure(encoding='utf-8', errors='replace')


UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'


def api(params):
    time.sleep(3)
    u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)
    for wait in (0, 20, 60, 150):
        if wait:
            time.sleep(wait)
        try:
            return json.loads(urllib.request.urlopen(
                urllib.request.Request(u, headers={'User-Agent': UA}), timeout=40).read())
        except Exception:
            pass
    raise RuntimeError('throttled')


for cat in sys.argv[1:]:
    print('=== ' + cat)
    r = api({'action': 'query', 'format': 'json', 'list': 'categorymembers',
             'cmtitle': cat, 'cmtype': 'file', 'cmlimit': 40})
    titles = [m['title'] for m in r.get('query', {}).get('categorymembers', [])]
    titles = [t for t in titles if re.search(r'\.(jpe?g|png|tiff?)$', t, re.I)]
    for i in range(0, len(titles), 20):
        q = api({'action': 'query', 'format': 'json', 'titles': '|'.join(titles[i:i + 20]),
                 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata',
                 'iiextmetadatafilter': 'LicenseShortName'})
        rows = []
        for p in q.get('query', {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            lic = ((ii.get('extmetadata') or {}).get('LicenseShortName') or {}).get('value', '?')
            rows.append((ii.get('width') or 0, ii.get('height') or 0,
                         re.sub(r'<[^>]+>', '', lic), p.get('title', '?')))
        for w, h, lic, t in sorted(rows, reverse=True):
            print('  %5dx%-5d %-18s %s' % (w, h, lic[:18], t))
