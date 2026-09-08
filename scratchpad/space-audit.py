# -*- coding: utf-8 -*-
"""Every raw px value in the component sheets, by property and by value.

The point is to find out how much of the 412 is actually *spacing on the
scale* -- padding, margin, gap at 4/8/12/16/24/32/48/64 -- as against widths,
offsets and one-off geometry that no scale would ever govern. A sweep that
treats those as the same thing turns arbitrary numbers into arbitrary tokens.
"""
import collections
import glob
import io
import re

SCALE = {4: '--space-1', 8: '--space-2', 12: '--space-3', 16: '--space-4',
         24: '--space-6', 32: '--space-8', 48: '--space-12', 64: '--space-16'}
SPACING_PROPS = ('padding', 'margin', 'gap', 'inset', 'top', 'right', 'bottom', 'left')

by_prop = collections.Counter()
by_value = collections.Counter()
on_scale = collections.Counter()
off_scale = collections.Counter()
total = 0

for path in sorted(glob.glob('src/styles/*.css')):
    if path.endswith('tokens.css'):
        continue
    src = io.open(path, encoding='utf-8').read()
    src = re.sub(r'/\*.*?\*/', lambda m: ' ' * len(m.group(0)), src, flags=re.S)
    for line in src.split('\n'):
        m = re.match(r'\s*([-a-z]+)\s*:\s*([^;]+);', line)
        if not m:
            continue
        prop, value = m.group(1), m.group(2)
        for num in re.findall(r'(?<![\w.-])(\d+(?:\.\d+)?)px', value):
            total += 1
            by_prop[prop] += 1
            by_value[float(num)] += 1
            spacing = any(prop.startswith(p) for p in SPACING_PROPS)
            if spacing:
                (on_scale if float(num) in SCALE else off_scale)[float(num)] += 1

print('%d raw px values in the component sheets\n' % total)
print('--- by property (top 15) ---')
for prop, n in by_prop.most_common(15):
    print('  %-22s %d' % (prop, n))
print('\n--- spacing properties only ---')
print('  on the 4/8/12/16/24/32/48/64 scale : %d' % sum(on_scale.values()))
print('  off it                             : %d' % sum(off_scale.values()))
print('\n  on-scale values:  ' + ', '.join('%gpx x%d' % (v, n) for v, n in sorted(on_scale.items())))
print('  off-scale values: ' + ', '.join('%gpx x%d' % (v, n) for v, n in sorted(off_scale.items())[:24]))
print('\n--- most common values overall ---')
for v, n in by_value.most_common(14):
    print('  %-8g %d%s' % (v, n, '   (on scale)' if v in SCALE else ''))
