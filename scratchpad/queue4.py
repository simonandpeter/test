# -*- coding: utf-8 -*-
"""Derive the unsearched queue: heroless distinct hero-saints minus refusals."""
import io, json, re, subprocess, sys, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = subprocess.check_output(
    ['node', 'scripts/heroless.mjs', 'romanian', 'greek', 'russian', 'serbian'],
    cwd=root)
out = out.decode('utf-8', 'replace')

cal = None
rows = {}
for line in out.splitlines():
    m = re.match(r'^(\w+): (\d+) of (\d+) days', line)
    if m:
        cal = m.group(1)
        print('%-10s %s of %s' % (cal, m.group(2), m.group(3)))
        continue
    m = re.match(r'^\s+([a-z0-9\-]+)\t(\S+)', line)
    if m:
        rows.setdefault(m.group(1), []).append((cal, m.group(2)))

ref = json.load(io.open(os.path.join(root, 'scratchpad', 'icon-refusals.json'),
                        encoding='utf-8'))
refused = set(r['slug'] for r in ref['refused'] if not r.get('resolved'))
resolved = set(r['slug'] for r in ref['refused'] if r.get('resolved'))

todo = sorted(s for s in rows if s not in refused)
print('distinct heroless: %d  refused: %d (resolved %d)  unsearched: %d'
      % (len(rows), len(refused & set(rows)), len(resolved), len(todo)))
io.open(os.path.join(root, 'scratchpad', 'queue4.json'), 'w', encoding='utf-8',
        newline='').write(json.dumps(
            [{'slug': s, 'days': rows[s]} for s in todo],
            ensure_ascii=False, indent=1))
for s in todo:
    print(s, rows[s][0][1])
