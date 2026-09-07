# -*- coding: utf-8 -*-
"""The latest Actions run for a commit, read through the REST API (no gh here)."""
import io, json, os, re, sys, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
raw = io.open(r'C:\Users\matei\Documents\Agios Website Ex\update git.txt', encoding='utf-8', errors='ignore').read()
pat = re.search(r'gh[a-zA-Z0-9_]+', raw).group(0)
sha = sys.argv[1] if len(sys.argv) > 1 else None


def api(path):
    req = urllib.request.Request('https://api.github.com/repos/simonandpeter/test' + path,
                                 headers={'Authorization': 'Bearer ' + pat,
                                          'Accept': 'application/vnd.github+json'})
    return json.load(urllib.request.urlopen(req))


runs = api('/actions/runs?per_page=5')['workflow_runs']
for r in runs:
    if sha and not r['head_sha'].startswith(sha):
        continue
    print(r['head_sha'][:8], r['status'], r['conclusion'], r['html_url'])
    jobs = api('/actions/runs/%d/jobs' % r['id'])['jobs']
    for j in jobs:
        print('   ', j['name'], j['status'], j['conclusion'])
        for s in j['steps'] or []:
            if s['conclusion'] not in (None, 'success', 'skipped'):
                print('      !!', s['name'], s['conclusion'])
    break
