# -*- coding: utf-8 -*-
"""Fetch one Commons icon into a saint's folder, with the licence read from Commons.

usage: python scratchpad/geticon.py <draft.json> [--write]

The draft is a list of objects, each:

    {"slug": "...", "file": "File:Something.jpg", "why": "the identity evidence"}

Everything else — the artist, the licence, the description, the 1200px URL — is
taken from Commons' own `imageinfo`, not from whoever wrote the draft. That is
the point: a sourcer can be wrong about a licence in a way nobody would catch,
so the licence is never copied from the draft, and a file whose licence Commons
does not state as public domain or a CC licence is refused here rather than
warned about later.

`why` is the sourcer's reason for believing the picture is this saint, and it is
written into the note so the next reader can check it. The wrong-saint match is
this task's known failure mode (`b6dc41ab`: an "Arsenios the Wonderworker" icon
that was Arsenios of Cappadocia).
"""
import io, json, os, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
OK_LICENCE = ('public domain', 'pd', 'cc0', 'cc by', 'cc-by', 'cc by-sa', 'cc-by-sa')

draft_path = sys.argv[1]
write = '--write' in sys.argv
drafts = json.load(io.open(draft_path, encoding='utf-8'))


def get(url, timeout=60):
    """Commons answers 429 to a brisk caller; back off rather than give up.

    The `imageinfo` URLs arrive with a `?utm_*` query that defeats the CDN's
    cache and so draws the rate limiter much sooner. The bytes are the same
    without it, so it is dropped.
    """
    if 'upload.wikimedia.org' in url:
        url = url.split('?', 1)[0]
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for wait in (0, 10, 30, 60, 120, 240):
        if wait:
            time.sleep(wait)
        try:
            return urllib.request.urlopen(req, timeout=timeout).read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
    raise RuntimeError('Commons kept answering 429: ' + url)


def api(params):
    return json.loads(get(API + '?' + urllib.parse.urlencode(params)))


def imageinfo(title, width):
    d = api({
        'action': 'query', 'titles': title, 'prop': 'imageinfo', 'format': 'json',
        'iiprop': 'url|extmetadata|size', 'iiurlwidth': width,
    })
    page = list(d['query']['pages'].values())[0]
    if 'missing' in page or 'imageinfo' not in page:
        return None
    return page['imageinfo'][0]


def info(title):
    ii = imageinfo(title, 1200)
    if ii is None:
        return None
    """**Never take the original, always a `/thumb/` URL.**

    Commons answers a thumbnail request for a file narrower than the width
    asked for by handing back the original instead, on upload.wikimedia.org.
    Those originals answer 429 to every attempt here, through the whole
    backoff ladder, where a `/thumb/` URL comes down first time — which is what
    stopped ten of the twenty icons of 2 October. So where the first answer is
    not a thumb, ask again one pixel under the file's own width, which is a
    width Commons will always render.
    """
    native = ii.get('width') or 0
    if '/thumb/' not in (ii.get('thumburl') or '') and native > 1:
        time.sleep(2)
        again = imageinfo(title, native - 1)
        if again and '/thumb/' in (again.get('thumburl') or ''):
            ii = dict(ii, thumburl=again['thumburl'], thumbwidth=again.get('thumbwidth'))
    meta = ii.get('extmetadata', {})
    def val(k):
        v = meta.get(k, {}).get('value')
        if not v:
            return None
        # Commons wraps some fields in markup; the note keeps the text only.
        return (v.replace('<br>', ' ').replace('<br/>', ' ')
                 .replace('\n', ' ').strip())
    import re
    def plain(v):
        return re.sub(r'<[^>]+>', '', v).strip() if v else None
    return {
        'thumb': ii.get('thumburl') or ii['url'],
        'descriptionurl': ii['descriptionurl'],
        'width': ii.get('thumbwidth') or ii.get('width'),
        'artist': plain(val('Artist')),
        'licence': val('LicenseShortName'),
        'description': plain(val('ImageDescription')),
    }


problems, ready = [], []
for d in drafts:
    slug, title, why = d['slug'], d['file'], d.get('why', '')
    folder = os.path.join('saints', slug)
    if not os.path.isdir(folder):
        problems.append((slug, 'no such folder'))
        continue
    if os.path.exists(os.path.join(folder, 'images', 'icon.jpg')):
        problems.append((slug, 'already has an icon'))
        continue
    if not why:
        problems.append((slug, 'no identity evidence'))
        continue
    got = info(title)
    time.sleep(2)
    if not got:
        problems.append((slug, 'Commons has no such file: %s' % title))
        continue
    lic = (got['licence'] or '').lower()
    if not any(k in lic for k in OK_LICENCE):
        problems.append((slug, 'licence Commons states is %r' % got['licence']))
        continue
    ready.append((d, got))
    print('· %-44s %s  [%s]' % (slug, title[:48], got['licence']))

for slug, why in problems:
    print('✗ %-44s %s' % (slug, why))
print('%d ready, %d problem(s).' % (len(ready), len(problems)))

if not write:
    print('\nDry run — nothing fetched. Add --write.')
    sys.exit(1 if problems else 0)

for d, got in ready:
    slug = d['slug']
    images = os.path.join('saints', slug, 'images')
    os.makedirs(images, exist_ok=True)
    blob = get(got['thumb'], timeout=120)
    io.open(os.path.join(images, 'icon.jpg'), 'wb').write(blob)
    note = ('Wikimedia Commons, “%s”%s — fetched %s at %spx. The licence is as Commons '
            'records it. Identified as this saint because: %s'
            % (d['file'].replace('File:', ''),
               '; artist as recorded there: %s' % got['artist'] if got['artist'] else '',
               time.strftime('%d %B %Y'), got['width'], d['why']))
    if got['description']:
        note += ' Commons describes it: %s' % got['description'][:400]
    meta = {
        'credit': got['artist'],
        'licence': got['licence'],
        'source_url': got['descriptionurl'],
        'note': note,
    }
    io.open(os.path.join(images, 'icon.meta.json'), 'w', encoding='utf-8', newline='\n').write(
        json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
    # The manifest reads the folder's own `images` array, not the directory, so
    # a fetched icon that is not declared there is invisible — which is how the
    # first ten were fetched and changed nothing.
    sp = os.path.join('saints', slug, 'saint.json')
    folder = json.load(io.open(sp, encoding='utf-8'))
    if not folder.get('images'):
        # Keep the file's own key order and put `images` where the schema's
        # examples do, before `related`. Rebuilding to one canonical order
        # instead rewrote whole folders for nothing: the first twenty icons
        # cost 690 deleted lines of identical content.
        # A folder whose schema already carries `"images": []` kept the empty
        # array: the loop copied the existing key and `setdefault` then found it
        # present and did nothing, so the icon was fetched and never declared.
        # `christopher` was fetched twice that way before it was noticed.
        decl = [{'file': 'images/icon.jpg', 'meta': 'images/icon.meta.json'}]
        out = {}
        for k, v in folder.items():
            if k == 'related' and 'images' not in folder:
                out['images'] = decl
            out[k] = decl if k == 'images' else v
        out.setdefault('images', decl)
        io.open(sp, 'w', encoding='utf-8', newline='\n').write(
            json.dumps(out, ensure_ascii=False, indent=2) + '\n')
    print('wrote %s (%d bytes)' % (slug, len(blob)))
    time.sleep(2)

print('\nNow: npm run thumbs && npm run build:manifest')
