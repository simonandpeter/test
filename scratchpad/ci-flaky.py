# -*- coding: utf-8 -*-
"""The `flaky` and `failed` lines of a run, with the test names under them.

`ci.py` gives the conclusion; this gives the thing the conclusion hides. A
green run with `N flaky` contains a test that failed and passed on retry, and
that only exists in the job log -- no summary endpoint carries it.

    python scratchpad/ci-flaky.py 275f850

The job-log endpoint 302s to pre-signed blob storage, which 401s if the
Authorization header follows the redirect, so the redirect is taken by hand
without it.
"""
import io
import json
import re
import sys
import urllib.error
import urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
raw = io.open(r'C:\Users\matei\Documents\Agios Website Ex\update git.txt',
              encoding='utf-8', errors='ignore').read()
pat = re.search(r'gh[a-zA-Z0-9_]+', raw).group(0)
sha = sys.argv[1] if len(sys.argv) > 1 else None


def api(path):
    req = urllib.request.Request('https://api.github.com/repos/simonandpeter/test' + path,
                                 headers={'Authorization': 'Bearer ' + pat,
                                          'Accept': 'application/vnd.github+json'})
    return json.load(urllib.request.urlopen(req))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, newurl, headers, fp)


def job_log(job_id):
    url = 'https://api.github.com/repos/simonandpeter/test/actions/jobs/%d/logs' % job_id
    try:
        urllib.request.build_opener(NoRedirect).open(
            urllib.request.Request(url, headers={'Authorization': 'Bearer ' + pat}))
    except urllib.error.HTTPError as e:
        if e.code in (301, 302, 307, 308):
            return urllib.request.urlopen(str(e.reason)).read().decode('utf-8', 'replace')
        raise
    return ''


HEADING = re.compile(r'^\s*\d+ (flaky|failed|passed)\s*(\(.*\))?$')

for run in api('/actions/runs?per_page=10')['workflow_runs']:
    if sha and not run['head_sha'].startswith(sha):
        continue
    print('%s  %s  %s' % (run['head_sha'][:8], run['conclusion'], run['html_url']))
    for job in api('/actions/runs/%d/jobs' % run['id'])['jobs']:
        lines = [re.sub(r'^\S+Z\s*', '', l).rstrip() for l in job_log(job['id']).split('\n')]
        seen = set()
        for i, line in enumerate(lines):
            if not HEADING.match(line):
                continue
            # The names sit under the heading until the next blank or heading.
            block = [line.strip()]
            for nxt in lines[i + 1:i + 8]:
                if not nxt.strip() or HEADING.match(nxt) or nxt.startswith('##'):
                    break
                block.append(nxt.strip())
            key = '\n'.join(block)
            if key in seen:
                continue
            seen.add(key)
            for b in block:
                print('   ' + b[:140])
    break
