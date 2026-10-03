#!/usr/bin/env python
"""Add the one office this batch brought to the four locale packs.

Each pack keys an office by its English string, so a new one goes into all
four or `locale-coverage.mjs` reads a fallback. The anchor is the line the new
key sorts after; `newline=''` on both the read and the write keeps CLAUDE.md's
Windows line-ending trap out of it.
"""
import io

ADDS = {
    'ru': "    'Bishop of Hankou': 'Епископ Ханькоуский',\n",
    'ro': "    'Bishop of Hankou': 'Episcop de Hankou',\n",
    'el': "    'Bishop of Hankou': 'Επίσκοπος Χανκόου',\n",
    'sr': "    'Bishop of Hankou': 'Епископ ханкоуски',\n",
}
ANCHOR = "    'Bishop of Great Perm': "

for lang, line in ADDS.items():
    path = 'src/ui/locales/%s.js' % lang
    s = io.open(path, encoding='utf-8', newline='').read()
    if line in s:
        print('already there: %s' % lang)
        continue
    i = s.index(ANCHOR)
    j = s.index('\n', i) + 1
    io.open(path, 'w', encoding='utf-8', newline='').write(s[:j] + line + s[j:])
    print('added: %s' % lang)
