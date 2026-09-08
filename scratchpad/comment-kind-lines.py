# -*- coding: utf-8 -*-
"""Second opinion on `comment-kind.py`.

That instrument flags a whole block as history when any one line in it matches
a cue, so a 40-line block that states a constraint and dates one sentence is
counted as 40 lines of history. This one classifies **line by line** and
reports both numbers, plus how much of the flagged mass is contained in the
matching sentences themselves.
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
    found = []
    for m in re.finditer(r'/\*.*?\*/', src, re.S):
        found.append(m.group(0))
    for m in re.finditer(r'(?:^[ \t]*//.*\n)+', src, re.M):
        found.append(m.group(0).rstrip())
    for text in found:
        lines = text.splitlines()
        hit = [l for l in lines if HISTORY.search(l)]
        blocks.append((path, len(lines), len(hit)))

total = sum(n for _, n, _ in blocks)
block_level = sum(n for _, n, h in blocks if h)
line_level = sum(h for _, _, h in blocks)
mixed = [(p, n, h) for p, n, h in blocks if h and h < n * 0.34]

print('%d blocks, %d comment lines' % (len(blocks), total))
print('  block-level history (any cue in the block) : %5d (%.0f%%)' % (block_level, 100.0 * block_level / total))
print('  line-level  history (the cue lines only)   : %5d (%.0f%%)' % (line_level, 100.0 * line_level / total))
print('  blocks flagged where cues are <34%% of lines: %d blocks, %d lines charged to history'
      % (len(mixed), sum(n for _, n, _ in mixed)))
