# -*- coding: utf-8 -*-
"""Puts the two 16px declarations back on their own step, then proves the type
sweep changed no rendered size.

The sweep is only worth anything if it is a rename. `16px` was folded into
`--text-md` (14px) by a careless mapping, which is exactly what this check
exists to catch — it compares every rewritten `font-size` against what git says
was there before.
"""
import glob
import io
import re
import subprocess

SEP = chr(92)


def head(path):
    out = subprocess.run(['git', 'show', 'HEAD:' + path.replace(SEP, '/')],
                         capture_output=True, text=True, encoding='utf-8')
    return out.stdout


tokens = {}
for m in re.finditer(r'--(text-[\w-]+):\s*([^;]+);', io.open('src/styles/tokens.css', encoding='utf-8').read()):
    tokens['--' + m.group(1)] = m.group(2).strip()

sheets = [f for f in glob.glob('src/styles/*.css') if not f.endswith('tokens.css')]

for f in sheets:
    old = head(f).split('\n')
    new = io.open(f, encoding='utf-8').read().split('\n')
    if len(old) != len(new):
        continue
    n = 0
    for i, (a, b) in enumerate(zip(old, new)):
        if 'font-size: 16px' in a and 'var(--text-md)' in b:
            new[i] = b.replace('var(--text-md)', 'var(--text-body)')
            n += 1
    if n:
        io.open(f, 'w', encoding='utf-8', newline='\n').write('\n'.join(new))
        print('restored %d 16px in %s' % (n, f))

bad = 0
for f in sheets:
    old = head(f).split('\n')
    new = io.open(f, encoding='utf-8').read().split('\n')
    if len(old) != len(new):
        print('!! line counts differ in %s — cannot verify' % f)
        bad += 1
        continue
    for a, b in zip(old, new):
        ma = re.match(r'\s*font-size:\s*([^;]+);', a or '')
        mb = re.match(r'\s*font-size:\s*var\((--text-[\w-]+)\);', b or '')
        if ma and mb:
            was, now = ma.group(1).strip(), tokens.get(mb.group(1))
            if was != now:
                print('  CHANGED  %-24s %s -> %s (%s)' % (f, was, now, mb.group(1)))
                bad += 1
print('size mismatches: %d' % bad)
