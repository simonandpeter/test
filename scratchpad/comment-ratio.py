# -*- coding: utf-8 -*-
"""How the comment share of `src/` has moved over the project's life.

`python scratchpad/comment-ratio.py` — reads a handful of commits straight out
of git, so it needs no checkout and disturbs no working tree.

Generated data and the locale packs are excluded: `liturgical-days.js`,
`land.js`, `water.js`, the terrain tiles and `ui/locales/*` are written by
scripts or are pure tables, and counting them would move the number without
telling anyone anything about the code a change has to be made in.
"""
import re
import subprocess

SKIP = ('locales/', 'terrain-tiles/', 'land.js', 'water.js', 'liturgical-days.js', 'wordmark.js')


def sh(*args):
    return subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace').stdout


def ratio(rev):
    files = [f for f in sh('git', 'ls-tree', '-r', '--name-only', rev, 'src').splitlines()
             if f.endswith(('.js', '.css')) and not any(s in f for s in SKIP)]
    total = comment = 0
    for f in files:
        src = sh('git', 'show', '%s:%s' % (rev, f))
        if not src:
            continue
        block = sum(len(m.group(0).splitlines()) for m in re.finditer(r'/\*.*?\*/', src, re.S))
        line = sum(1 for l in src.splitlines() if l.strip().startswith('//'))
        total += len(src.splitlines())
        comment += block + line
    return len(files), total, comment


revs = sh('git', 'log', '--format=%h %ad %s', '--date=short', '--reverse').splitlines()
picks = [revs[i] for i in range(0, len(revs), max(1, len(revs) // 11))] + [revs[-1]]
print('%-9s %-11s %6s %7s %7s   %s' % ('commit', 'date', 'files', 'lines', 'comment', 'subject'))
for entry in picks:
    h, date, subject = entry.split(' ', 2)
    n, total, comment = ratio(h)
    if not total:
        continue
    print('%-9s %-11s %6d %7d %6.0f%%   %s' % (h, date, n, total, 100.0 * comment / total, subject[:44]))
