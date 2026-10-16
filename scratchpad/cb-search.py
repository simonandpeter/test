# -*- coding: utf-8 -*-
"""Colour-sweep candidate collector for rows 86-171 of grey-queue.json.

Same routes as icon-sweep.py (wp -> wikibase_item -> P18/P373, SDC P180,
category members) but machine-readable and quieter: one JSON row per saint with
the entity's own label, description and **P841 feast day** -- the discriminator
the task's failure mode needs -- beside every Commons file wide enough to be an
upgrade.

usage: python scratchpad/cb-search.py <lo> <hi> <out.json>
"""
import io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

UA = 'AgiosCorpus/1.0 (icon sourcing; contact via repository)'
WIKIS = ('el', 'ro', 'ru', 'sr', 'bg', 'en')
PAUSE = 4.0


# Set per row. The ladder below is 530 seconds deep and knows nothing about
# how long the row has already spent, which is how one saint held eighty
# behind it for half an hour on 16 October.
DEADLINE = None


def get(url, timeout=40):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for wait in (0, 20, 60, 150, 300):
        if DEADLINE is not None and DEADLINE - time.monotonic() <= wait:
            raise RuntimeError('row budget spent')
        if wait:
            time.sleep(wait)
        try:
            return urllib.request.urlopen(req, timeout=timeout).read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503):
                raise
        except Exception:
            pass
    raise RuntimeError('throttled: ' + url[:90])


def api(host, params):
    time.sleep(PAUSE)
    return json.loads(get('https://%s/w/api.php?%s' % (host, urllib.parse.urlencode(params))))


def paren_free(f):
    b = re.sub(r'\s*\([^)]*\)\s*', ' ', f).strip()
    return b if b and b != f else None


SAINTY = re.compile(
    r'saint|martyr|monk|nun|hermit|ascetic|bishop|abbot|abbess|patriarch|'
    r'hieromartyr|neomartyr|confessor|archbishop|presbyter|deacon|apostle|'
    r'prophet|άγι|αγί|όσι|οσί|μάρτυ|sfânt|cuvios|mucenic|свят|мученик|'
    r'преподобн|светит|светог|мучени|пророк', re.I)

DAYQ = {}


def day_label(qid):
    if qid in DAYQ:
        return DAYQ[qid]
    try:
        d = json.loads(get('https://www.wikidata.org/wiki/Special:EntityData/%s.json' % qid))
        ent = d['entities'][qid]
        lab = (ent.get('labels', {}).get('en') or {}).get('value', qid)
    except Exception:
        lab = qid
    DAYQ[qid] = lab
    time.sleep(PAUSE)
    return lab


def entity(qid):
    d = json.loads(get('https://www.wikidata.org/wiki/Special:EntityData/%s.json' % qid))
    time.sleep(PAUSE)
    ent = d['entities'][qid]
    L = ent.get('labels', {})
    D = ent.get('descriptions', {})
    label = (L.get('en') or L.get('el') or L.get('ru') or L.get('ro') or {}).get('value', '')
    desc = (D.get('en') or D.get('ru') or D.get('el') or {}).get('value', '')
    cl = ent.get('claims', {})

    def strs(pid):
        o = []
        for c in cl.get(pid, []):
            v = (c.get('mainsnak') or {}).get('datavalue', {}).get('value')
            if isinstance(v, str):
                o.append(v)
        return o

    def ids(pid):
        o = []
        for c in cl.get(pid, []):
            v = (c.get('mainsnak') or {}).get('datavalue', {}).get('value')
            if isinstance(v, dict) and v.get('id'):
                o.append(v['id'])
        return o

    feast = [day_label(q) for q in ids('P841')[:3]]
    alias = [a.get('value') for lg in ('en', 'ru', 'el', 'ro')
             for a in ent.get('aliases', {}).get(lg, [])][:8]
    return {'qid': qid, 'label': label, 'desc': desc, 'feast': feast,
            'p18': strs('P18'), 'p373': strs('P373'), 'alias': alias,
            'human': 'Q5' in ids('P31'), 'canon': bool(cl.get('P411')),
            'types': ids('P31')[:3]}


def sdc(qid):
    r = api('commons.wikimedia.org', {
        'action': 'query', 'format': 'json', 'list': 'search', 'srnamespace': 6,
        'srsearch': 'haswbstatement:P180=%s' % qid, 'srlimit': 15})
    return [h['title'] for h in r.get('query', {}).get('search', [])]


def catmembers(cat):
    t = cat if cat.lower().startswith('category:') else 'Category:' + cat
    r = api('commons.wikimedia.org', {
        'action': 'query', 'format': 'json', 'list': 'categorymembers',
        'cmtitle': t, 'cmtype': 'file', 'cmlimit': 30})
    return [m['title'] for m in r.get('query', {}).get('categorymembers', [])]


def files(titles):
    out = []
    for i in range(0, len(titles), 20):
        r = api('commons.wikimedia.org', {
            'action': 'query', 'format': 'json', 'titles': '|'.join(titles[i:i + 20]),
            'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata',
            'iiextmetadatafilter': 'LicenseShortName'})
        for p in r.get('query', {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            lic = ((ii.get('extmetadata') or {}).get('LicenseShortName') or {}).get('value', '?')
            out.append({'title': p.get('title', '?'), 'w': ii.get('width') or 0,
                        'h': ii.get('height') or 0, 'lic': re.sub(r'<[^>]+>', '', lic)})
    return out


def entities_for(row):
    """qids a wikipedia full-text search reaches, cheapest form first."""
    found = {}
    names = sorted([(n.get('lang') or '', n.get('form') or '') for n in row['names']],
                   key=lambda p: -len(p[1]))
    names.append(('en', row['display_name']))
    tried = 0
    for lang, form in names:
        if not form or tried >= 3:
            continue
        hosts = [lang] if lang in WIKIS else []
        if 'en' not in hosts:
            hosts.append('en')
        qs = [form]
        for host in hosts:
            for q in qs:
                if tried >= 3:
                    break
                tried += 1
                try:
                    r = api('%s.wikipedia.org' % host, {
                        'action': 'query', 'format': 'json', 'list': 'search',
                        'srsearch': q, 'srlimit': 3, 'srnamespace': 0})
                except Exception as exc:
                    found.setdefault('_err', str(exc)[:60])
                    continue
                titles = [h['title'] for h in r.get('query', {}).get('search', [])]
                if not titles:
                    continue
                try:
                    p = api('%s.wikipedia.org' % host, {
                        'action': 'query', 'format': 'json', 'prop': 'pageprops',
                        'titles': '|'.join(titles)})
                except Exception:
                    continue
                for page in p.get('query', {}).get('pages', {}).values():
                    qid = (page.get('pageprops') or {}).get('wikibase_item')
                    if qid and qid not in found:
                        found[qid] = 'wp/%s "%s"' % (host, page['title'])
                if len([k for k in found if k.startswith('Q')]) >= 2:
                    return found
    return found


rows = json.load(io.open('scratchpad/grey-queue.json', encoding='utf-8'))
"""
A slug list instead of a slice, because the queue is regenerated as icons are
answered and every index moves when it is: on 17 October rows 160-171 stopped
existing between one wave and the next. `--slugs <file.json>` takes the names
instead, which survive that.
"""
if '--slugs' in sys.argv:
    wanted = json.load(io.open(sys.argv[sys.argv.index('--slugs') + 1], encoding='utf-8'))
    rows = [r for r in rows if r['slug'] in set(wanted)]
    lo, hi, outp = 0, len(rows), sys.argv[1]
else:
    lo, hi, outp = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
out = []
if os.path.exists(outp):
    out = json.load(io.open(outp, encoding='utf-8'))
done = {r['slug'] for r in out}

BUDGET = int(next((a.split('=')[1] for a in sys.argv if a.startswith('--budget=')), 300))

for row in rows[lo:hi]:
    if row['slug'] in done:
        continue
    DEADLINE = time.monotonic() + BUDGET
    rec = {'slug': row['slug'], 'display_name': row['display_name'],
           'cur': {'w': row['w'], 'h': row['h'], 'sat': row['sat']},
           'feasts': sorted({'%d-%d' % (f['month'], f['day']) for f in row['feasts']
                             if f.get('month')}),
           'forms': ['%s:%s' % (n['lang'], n['form']) for n in row['names']],
           'ents': [], 'cands': [], 'err': None}
    try:
        ents = entities_for(row)
        rec['err'] = ents.pop('_err', None)
        seen = set()
        for qid, how in list(ents.items())[:4]:
            try:
                e = entity(qid)
            except Exception as exc:
                rec['ents'].append({'qid': qid, 'how': how, 'err': str(exc)[:60]})
                continue
            e['how'] = how
            why_not = None
            if not (e['human'] or 'Q20643955' in e['types'] or e['canon']):
                why_not = 'not a person (%s)' % ','.join(e['types'])
            elif not (e['canon'] or SAINTY.search(e['label'] + ' ' + e['desc'])):
                why_not = 'person, nothing says saint'
            e['skip'] = why_not
            rec['ents'].append(e)
            if why_not:
                continue
            titles = ['File:' + f for f in e['p18']]
            try:
                titles += sdc(qid)
            except Exception:
                pass
            for c in e['p373'][:2]:
                try:
                    titles += catmembers(c)
                except Exception:
                    pass
            titles = [t for t in titles if t not in seen and
                      re.search(r'\.(jpe?g|png|tiff?)$', t, re.I)]
            seen.update(titles)
            if titles:
                for f in files(titles[:40]):
                    f['qid'] = qid
                    rec['cands'].append(f)
    except Exception as exc:
        rec['err'] = str(exc)[:90]
    rec['cands'].sort(key=lambda f: -f['w'])
    out.append(rec)
    io.open(outp, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(out, ensure_ascii=False, indent=1) + '\n')
    print('%-40s %d ents %d cands %s' % (row['slug'], len(rec['ents']),
                                         len(rec['cands']), rec['err'] or ''))
