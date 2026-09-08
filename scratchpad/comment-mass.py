# -*- coding: utf-8 -*-
"""Where the comment mass actually is, per file, so item 3 can be scheduled.

Prints total lines, comment lines, the share, and how much of the comment mass
sits in blocks that are *mostly* history (over half their lines carrying a
narrative cue) as against blocks with one dated aside inside a constraint.
"""
import glob
import io
import re

SKIP = ('locales', 'terrain-tiles', 'land.js', 'water.js', 'liturgical-days.js', 'wordmark.js')
HISTORY = re.compile(
    r'\b(20\d\d-\d\d-\d\d|used to|it was\b|reversed|reversal|backed out|before this|'
    r'until \w+ ?\d*,? ?20\d\d|measured|first cut|second cut|tried (first|and|it)|'
    r'was wrong|the old |amendment|which cost|found live|regression|it hid|'
    r'earlier version|previously|no longer)\b', re.I)

rows = []
tot_lines = tot_comment = tot_mostly = 0
for path in sorted(glob.glob('src/**/*.js', recursive=True) + glob.glob('src/**/*.css', recursive=True)):
    if any(s in path for s in SKIP):
        continue
    src = io.open(path, encoding='utf-8', errors='replace').read()
    lines = len(src.splitlines())
    comment = mostly = 0
    found = [m.group(0) for m in re.finditer(r'/\*.*?\*/', src, re.S)]
    found += [m.group(0).rstrip() for m in re.finditer(r'(?:^[ \t]*//.*\n)+', src, re.M)]
    for text in found:
        n = len(text.splitlines())
        hits = sum(1 for l in text.splitlines() if HISTORY.search(l))
        comment += n
        if hits > n / 2.0:
            mostly += n
    rows.append((comment, path, lines, mostly))
    tot_lines += lines
    tot_comment += comment
    tot_mostly += mostly

print('%-34s %7s %8s %6s %10s' % ('file', 'lines', 'comment', '%', 'mostly-hist'))
for comment, path, lines, mostly in sorted(rows, reverse=True)[:14]:
    print('%-34s %7d %8d %5.0f%% %10d' % (path, lines, comment, 100.0 * comment / lines, mostly))
print('-' * 70)
print('%-34s %7d %8d %5.0f%% %10d' % ('all (generated excluded)', tot_lines, tot_comment,
                                      100.0 * tot_comment / tot_lines, tot_mostly))
