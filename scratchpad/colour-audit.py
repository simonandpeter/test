# -*- coding: utf-8 -*-
"""Raw colour values in the component sheets, separating the ones a colour
token should govern from the ones that only look like colours.

A `#000` inside a `mask-image` is not a colour decision -- a mask reads the
alpha channel and the hue is arbitrary. Counting it as an untokenised colour is
how "three raw hex values live outside tokens.css" got written down.
"""
import glob
import io
import re

NAMED = r'\b(?:red|blue|green|black|white|gray|grey|yellow|orange|purple|pink|brown|cyan|magenta)\b'
COLOUR = re.compile(r'#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\bcolor-mix\(|' + NAMED)
MASKY = ('mask', 'mask-image', '-webkit-mask-image', '--rail-fade', '--peek-fade')

real, masky = [], []
for path in sorted(glob.glob('src/styles/*.css')):
    if path.endswith('tokens.css'):
        continue
    src = io.open(path, encoding='utf-8').read()
    # Blank comments so prose that quotes a colour is not counted as one.
    src = re.sub(r'/\*.*?\*/', lambda m: ' ' * len(m.group(0)), src, flags=re.S)
    lines = src.split('\n')
    for i, line in enumerate(lines):
        # The *value* only. `white-space: nowrap` matched a named-colour
        # pattern on the property, which put seventeen phantoms in the first
        # run of this script -- the same mistake, in miniature, as the figure
        # it was written to check.
        value = line.split(':', 1)[1] if ':' in line else line
        if not COLOUR.search(value):
            continue
        m = re.match(r'\s*([-a-z]+)\s*:', line)
        prop = m.group(1) if m else ''
        # A gradient stop can be a continuation line; look back for the property.
        if not prop:
            for back in range(i - 1, max(-1, i - 6), -1):
                mb = re.match(r'\s*([-a-z]+)\s*:', lines[back])
                if mb:
                    prop = mb.group(1)
                    break
        hit = '%s:%d  %-22s %s' % (path, i + 1, prop, line.strip()[:70])
        (masky if any(k in prop for k in MASKY) else real).append(hit)

print('--- colours a token should govern ---')
for h in real:
    print('  ' + h)
print('  (none)' if not real else '')
print('--- mask and fade stops, where only alpha matters ---')
for h in masky:
    print('  ' + h)
print('\n%d real, %d masks' % (len(real), len(masky)))
