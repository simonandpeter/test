# -*- coding: utf-8 -*-
"""Raw push events for the repo: before -> after, so a force-push or a ref that
moved and came back is visible rather than inferred from workflow runs."""
import io, json, re, sys, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
raw = io.open(r'C:\Users\matei\Documents\Agios Website Ex\update git.txt', encoding='utf-8', errors='ignore').read()
pat = re.search(r'gh[a-zA-Z0-9_]+', raw).group(0)


def api(path):
    req = urllib.request.Request('https://api.github.com/repos/simonandpeter/test' + path,
                                 headers={'Authorization': 'Bearer ' + pat,
                                          'Accept': 'application/vnd.github+json'})
    return json.load(urllib.request.urlopen(req))


for e in api('/events?per_page=100'):
    if e['type'] != 'PushEvent':
        continue
    p = e['payload']
    print('%s  %s  %s -> %s  size=%s  forced=%s  %s' % (
        e['created_at'], p.get('ref'), (p.get('before') or '')[:8],
        (p.get('head') or '')[:8], p.get('size'), p.get('forced'),
        (p.get('commits') or [{}])[-1].get('message', '').split('\n')[0][:50]))
