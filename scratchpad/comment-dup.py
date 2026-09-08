# -*- coding: utf-8 -*-
"""Is the history in the code already written down in SESSIONS.md?

The case for moving narrative comments out rests on it being a *move* rather
than a deletion. This checks that empirically: for each comment block that
reads as history, take its most distinctive phrases and ask whether SESSIONS.md
(or HANDOFF/DESIGN/CLAUDE) already says them.

A block counts as covered when a third or more of its distinctive phrases are
found. Crude, and deliberately strict about what a phrase is: five or more
consecutive words, lowercased, punctuation stripped.
"""
import glob
import io
import re

SKIP = ('locales', 'terrain-tiles', 'land.js', 'water.js', 'liturgical-days.js', 'wordmark.js')
HISTORY = re.compile(
    r'\b(20\d\d-\d\d-\d\d|used to|it was\b|reversed|reversal|backed out|before this|'
    r'measured|first cut|second cut|tried (first|and|it)|was wrong|the old |amendment|'
    r'which cost|found live|regression|it hid|earlier version|previously|no longer)\b', re.I)

docs = ' '.join(io.open(f, encoding='utf-8', errors='replace').read()
                for f in ('SESSIONS.md', 'HANDOFF.md', 'CLAUDE.md', 'DESIGN.md'))
norm = lambda s: re.sub(r'[^a-z0-9 ]+', ' ', s.lower())
docs_n = re.sub(r'\s+', ' ', norm(docs))

covered = lines_covered = blocks = lines = 0
for path in glob.glob('src/**/*.js', recursive=True) + glob.glob('src/**/*.css', recursive=True):
    if any(s in path for s in SKIP):
        continue
    src = io.open(path, encoding='utf-8', errors='replace').read()
    for m in re.finditer(r'/\*.*?\*/', src, re.S):
        text = m.group(0)
        n = len(text.splitlines())
        if n < 4 or not HISTORY.search(text):
            continue
        blocks += 1
        lines += n
        words = re.sub(r'\s+', ' ', norm(re.sub(r'[*/]', ' ', text))).split()
        grams = [' '.join(words[i:i + 5]) for i in range(0, max(1, len(words) - 5), 7)]
        if not grams:
            continue
        hit = sum(1 for g in grams if g in docs_n)
        if hit / len(grams) >= 0.33:
            covered += 1
            lines_covered += n

print('history blocks of 4+ lines: %d  (%d lines)' % (blocks, lines))
print('already said in the docs  : %d  (%d lines, %.0f%%)'
      % (covered, lines_covered, 100.0 * lines_covered / lines if lines else 0))
