# -*- coding: utf-8 -*-
"""How much of the browser suite has never failed on this desk.

Reads every full-run Playwright log left in %TEMP% and takes the union of the
tests that failed at least once, restricted to spec files that still exist —
`daily.spec.js` and `index.spec.js` were split up on 2026-08-27 and their old
failures would otherwise count against a suite that no longer has them.

Ad hoc, and honest about what it is: a sample of this machine, not of CI.
"""
import collections
import glob
import io
import os
import re

TEMP = os.path.join(os.environ.get('TEMP', r'C:\Users\matei\AppData\Local\Temp'))
TOTAL = 902
SEP = chr(92)

live = set(os.listdir('e2e'))
runs = []
for path in sorted(glob.glob(os.path.join(TEMP, '*.log'))):
    text = io.open(path, encoding='utf-8', errors='replace').read()
    m = re.search(r'\n\s+(\d+) passed \(', text)
    if m and int(m.group(1)) >= 400:
        runs.append((os.path.basename(path), text))

fails = collections.Counter()
for name, text in runs:
    seen = set()
    for line in text.splitlines():
        m = re.match(r'\s+\d+\) (\[[^\]]+\]) . (\S+?) . (.+?)\s*$', line)
        if not m:
            continue
        spec = re.sub(r':\d+:\d+$', '', m.group(2).replace(SEP, '/').split('/')[-1])
        if spec in live:
            seen.add('%s %s %s' % (m.group(1), spec, m.group(3)))
    for t in seen:
        fails[t] += 1

never = TOTAL - len(fails)
print('%d full runs on this desk' % len(runs))
print('%d of %d tests never failed in any of them = %.1f%%' % (never, TOTAL, 100.0 * never / TOTAL))
once = sum(1 for v in fails.values() if v == 1)
print('of the %d that did: %d failed in exactly one run, %d in two or more'
      % (len(fails), once, len(fails) - once))

by_spec = collections.Counter(t.split(' ', 2)[1] for t in fails)
print('\nwhere they land:')
for spec, n in by_spec.most_common():
    print('  %-26s %3d' % (spec, n))

print('\nfailed in three or more runs:')
for t, n in fails.most_common():
    if n >= 3:
        print('  %2d/%d  %s' % (n, len(runs), t[:92]))
