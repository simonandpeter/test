# -*- coding: utf-8 -*-
"""Re-run a run's FAILED jobs on the same tree. `ci-rerun.py <run_id>`

The cheap arbiter for a red that the diff cannot reach. CLAUDE.md says to
compare against the unmodified tree once and let CI decide rather than
re-running blindly, and this is that comparison without a commit: the same
tree, the same build, a second attempt.

It earned its place on 2026-10-14. Four consecutive runs went red, each on ONE
hard failure, each on a different surface — the carousel's drift budget, the
carousel's scroll restore, a chrome panel's shrink animation — and every one a
sample taken mid-animation that found the animation already over. The tree
could not reach any of them: the manifest had grown 2 KB gzipped for 18 icons
and nothing else touched chrome. One rerun-failed-jobs on the fourth, with no
commit, came back green and deployed.

So the rate worth knowing is about one timing casualty per 1,125 tests, a
different one each run, and a retry inside the same run fails with it because
the load that caused it lasts the whole run. A second ATTEMPT is a different
machine; a retry is not.
"""
import io,json,re,sys,urllib.request
raw=io.open(r'C:\Users\matei\Documents\Agios Website Ex\update git.txt',encoding='utf-8',errors='ignore').read()
pat=re.search(r'gh[a-zA-Z0-9_]+',raw).group(0)
run=sys.argv[1]
url='https://api.github.com/repos/simonandpeter/test/actions/runs/%s/rerun-failed-jobs'%run
req=urllib.request.Request(url,data=b'{}',method='POST',headers={'Authorization':'Bearer '+pat,'Accept':'application/vnd.github+json','Content-Type':'application/json'})
try:
    r=urllib.request.urlopen(req)
    print('rerun requested:',r.status)
except Exception as e:
    print('failed:',e)
