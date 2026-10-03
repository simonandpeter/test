# -*- coding: utf-8 -*-
"""The failing job's log tail, read through the REST API."""
import io, json, re, sys, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
raw = io.open(r'C:\Users\matei\Documents\Agios Website Ex\update git.txt', encoding='utf-8', errors='ignore').read()
pat = re.search(r'gh[a-zA-Z0-9_]+', raw).group(0)
run_id = sys.argv[1]
grep = sys.argv[2] if len(sys.argv) > 2 else None


class Strip(urllib.request.HTTPRedirectHandler):
    """The logs endpoint redirects to blob storage, which 401s on an
    Authorization header meant for the API."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        r = super().redirect_request(req, fp, code, msg, headers, newurl)
        if r is not None:
            r.headers.pop('Authorization', None)
            r.unredirected_hdrs.pop('Authorization', None)
        return r


OPENER = urllib.request.build_opener(Strip)


def get(url, as_json=True):
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + pat,
                                               'Accept': 'application/vnd.github+json'})
    r = OPENER.open(req)
    return json.load(r) if as_json else r.read().decode('utf-8', 'replace')


base = 'https://api.github.com/repos/simonandpeter/test'
for j in get(base + '/actions/runs/%s/jobs' % run_id)['jobs']:
    if j['conclusion'] != 'failure':
        continue
    text = get(base + '/actions/jobs/%d/logs' % j['id'], as_json=False)
    lines = text.splitlines()
    if grep:
        lines = [l for l in lines if grep.lower() in l.lower()]
    for l in lines[-120:]:
        print(l)
