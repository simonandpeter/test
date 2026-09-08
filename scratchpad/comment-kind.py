# -*- coding: utf-8 -*-
"""What the comments in `src/` are *about*, so the question of what to cut can
be argued from a number instead of a feeling.

A comment block is counted as **history** when it narrates the project rather
than the code: a dated entry, a reversal, an attempt that was measured and
dropped, a "used to". It is counted as **constraint** otherwise — what a reader
has to know now to not break the thing in front of them.

The split is crude on purpose and errs toward *constraint*: a block is only
history if it says so in its own words.
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

blocks = []
for path in glob.glob('src/**/*.js', recursive=True) + glob.glob('src/**/*.css', recursive=True):
    if any(s in path for s in SKIP):
        continue
    src = io.open(path, encoding='utf-8', errors='replace').read()
    for m in re.finditer(r'/\*.*?\*/', src, re.S):
        text = m.group(0)
        blocks.append((path, len(text.splitlines()), bool(HISTORY.search(text))))
    for m in re.finditer(r'(?:^[ \t]*//.*\n)+', src, re.M):
        text = m.group(0)
        blocks.append((path, len(text.rstrip().splitlines()), bool(HISTORY.search(text))))

total = sum(n for _, n, _ in blocks)
hist = sum(n for _, n, h in blocks if h)
print('%d comment blocks, %d lines' % (len(blocks), total))
print('  history / narrative : %5d lines (%.0f%%)' % (hist, 100.0 * hist / total))
print('  constraint          : %5d lines (%.0f%%)' % (total - hist, 100.0 * (total - hist) / total))
print('\nbiggest single blocks that read as history:')
for path, n, h in sorted(blocks, key=lambda b: -b[1])[:12]:
    if h:
        print('   %3d lines  %s' % (n, path))
