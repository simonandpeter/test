# -*- coding: utf-8 -*-
"""The tail of a run's job log, filtered.

`ci.py` names the step that failed; `ci-flaky.py` pulls the suite's own
headings out. Neither shows what a *non-Playwright* step actually printed --
the Lighthouse quality floor, `locale-coverage`, the build itself -- and on
2026-09-10 a red run on that step could only be read by opening the log in a
browser.

    python scratchpad/ci-log.py <sha> [pattern] [tail-lines]

`pattern` is a case-insensitive regex; with one, every matching line is
printed with three lines of context. Without one, the last `tail-lines`
(default 120) of every job are printed.
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

sha = sys.argv[1]
needle = re.compile(sys.argv[2], re.I) if len(sys.argv) > 2 else None
tail = int(sys.argv[3]) if len(sys.argv) > 3 else 120


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
        return ''
    except urllib.error.URLError:
        return ''
    return ''


for run in api('/actions/runs?per_page=10')['workflow_runs']:
    if not run['head_sha'].startswith(sha):
        continue
    print('%s  %s  %s' % (run['head_sha'][:8], run['conclusion'] or run['status'], run['html_url']))
    for job in api('/actions/runs/%d/jobs' % run['id'])['jobs']:
        lines = [re.sub(r'^\S+Z\s*', '', l).rstrip() for l in job_log(job['id']).split('\n')]
        print('--- %s (%s) : %d lines' % (job['name'], job['conclusion'], len(lines)))
        if needle:
            for i, line in enumerate(lines):
                if needle.search(line):
                    for c in lines[max(0, i - 1):i + 4]:
                        print('   ' + c[:200])
                    print('   ...')
        else:
            for line in lines[-tail:]:
                print('   ' + line[:200])
    break
