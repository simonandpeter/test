#!/usr/bin/env python
"""Add one office key to all four locale packs, in sort order.

`python scratchpad/add-office.py <anchor-key> <ru> <ro> <el> <sr>`

The anchor is the existing key the new one sorts immediately after, so the
packs stay in the order they are read in. `newline=''` on both ends keeps
CLAUDE.md's Windows line-ending trap out of it.
"""
import io
import sys

key = sys.argv[1]
anchor = sys.argv[2]
values = dict(zip(('ru', 'ro', 'el', 'sr'), sys.argv[3:7]))

for lang, value in values.items():
    path = 'src/ui/locales/%s.js' % lang
    s = io.open(path, encoding='utf-8', newline='').read()
    line = "    '%s': '%s',\n" % (key, value)
    if line in s:
        print('already there: %s' % lang)
        continue
    a = "    '%s': " % anchor
    i = s.index(a)
    j = s.index('\n', i) + 1
    io.open(path, 'w', encoding='utf-8', newline='').write(s[:j] + line + s[j:])
    print('added: %s %s' % (lang, value))
