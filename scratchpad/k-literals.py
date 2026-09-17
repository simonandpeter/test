"""Which prose literals in e2e/ and tests/ come out of a life, and does the
Stage K split cut one of them in half or move it to another paragraph."""
import importlib.util
import os
import re
import sys

spec = importlib.util.spec_from_file_location('k', os.path.join('scratchpad', 'k-split.py'))
k = importlib.util.module_from_spec(spec)
spec.loader.exec_module(k)

LIT = re.compile(r"'([^'\\\n]{20,})'|\"([^\"\\\n]{20,})\"|`([^`\\\n]{20,})`")

lits = []
for d in ('e2e', 'tests'):
    for f in sorted(os.listdir(d)):
        p = os.path.join(d, f)
        if not os.path.isfile(p):
            continue
        for n, line in enumerate(open(p, encoding='utf-8'), 1):
            if line.lstrip().startswith(('*', '//')):
                continue
            for m in LIT.finditer(line):
                s = next(g for g in m.groups() if g)
                if ' ' in s and re.search(r'[a-z] [a-z]', s):
                    lits.append((p, n, s))

paras = {}          # slug -> (old body paragraphs, new body paragraphs), collapsed
for slug in sorted(os.listdir('saints')):
    p = os.path.join('saints', slug, 'life.md')
    if not os.path.isfile(p):
        continue
    old = open(p, encoding='utf-8').read()
    new, _ = k.process(old)
    if new == old:
        continue
    split = lambda t: [' '.join(b.split()) for b in re.split(r'\n\s*\n', t) if b.strip()]
    paras[slug] = (split(old), split(new))

hits, broken = 0, []
for path, n, s in lits:
    norm = ' '.join(s.split())
    for slug, (old, new) in paras.items():
        if any(norm in b for b in old):
            hits += 1
            if not any(norm in b for b in new):
                broken.append((path, n, slug, s))
            else:
                oi = next(i for i, b in enumerate(old) if norm in b)
                ni = next(i for i, b in enumerate(new) if norm in b)
                if oi != ni:
                    print(f'MOVED  {path}:{n}  {slug}  paragraph {oi} -> {ni}  {s[:60]}')
            break
print(f'{len(lits)} prose literals, {hits} found in a life this pass rewrites')
for b in broken:
    print('CUT   ', b[0] + ':' + str(b[1]), b[2], b[3][:70])
