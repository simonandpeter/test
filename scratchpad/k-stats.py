"""Stage K — the review's §11 counts, recomputed. Body paragraphs only."""
import os
import re
import statistics
import sys

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'saints')

counts, longest = [], []
for slug in sorted(os.listdir(ROOT)):
    p = os.path.join(ROOT, slug, 'life.md')
    if not os.path.isfile(p):
        continue
    blocks = [b.strip() for b in re.split(r'\n\s*\n', open(p, encoding='utf-8').read()) if b.strip()]
    body = [b for b in blocks[1:] if not b.startswith('*After')]
    body = [' '.join(b.split()) for b in body]
    if not body:
        continue
    counts.append(len(body))
    longest.append(max(len(b) for b in body))

n = len(counts)
hist = {k: sum(1 for c in counts if (c == k if k < 6 else c >= 6)) for k in range(1, 7)}
buckets = [('<600', lambda x: x < 600), ('600-999', lambda x: 600 <= x < 1000),
           ('1000-1499', lambda x: 1000 <= x < 1500), ('1500-2499', lambda x: 1500 <= x < 2500),
           ('2500+', lambda x: x >= 2500)]
print(f'lives {n}')
print('paragraphs ' + ' '.join(f'{k}:{v}' for k, v in hist.items()))
print('longest    ' + ' '.join(f'{name}:{sum(1 for x in longest if f(x))}' for name, f in buckets))
print(f'median longest {int(statistics.median(longest))}  max {max(longest)}')
if '--worst' in sys.argv:
    pairs = sorted(zip(longest, counts), reverse=True)[:5]
    print('worst', pairs)
