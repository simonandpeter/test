# -*- coding: utf-8 -*-
"""The last N Actions runs with who/what triggered them, for spotting a push
that came from somewhere other than this session."""
import io, json, re, sys, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
raw = io.open(r'C:\Users\matei\Documents\Agios Website Ex\update git.txt', encoding='utf-8', errors='ignore').read()
pat = re.search(r'gh[a-zA-Z0-9_]+', raw).group(0)


def api(path):
    req = urllib.request.Request('https://api.github.com/repos/simonandpeter/test' + path,
                                 headers={'Authorization': 'Bearer ' + pat,
                                          'Accept': 'application/vnd.github+json'})
    return json.load(urllib.request.urlopen(req))


n = int(sys.argv[1]) if len(sys.argv) > 1 else 15
for r in api('/actions/runs?per_page=%d' % n)['workflow_runs']:
    print('%s  %-19s  %-9s %-8s  %s  %s' % (
        r['head_sha'][:8], r['created_at'], r['event'], r['conclusion'] or r['status'],
        (r['actor'] or {}).get('login', '?'), (r['head_commit'] or {}).get('message', '').split('\n')[0][:60]))
