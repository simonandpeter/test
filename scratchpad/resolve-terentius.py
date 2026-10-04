# -*- coding: utf-8 -*-
"""Resolve the Terentius company's merge: both calendars' name forms are kept.

The Russian 28 October batch and the Serbian Julian 10 April batch read the
same four men — Terentius, Africanus, Maximus, Pompeius — from two calendars,
and each added its own `names` entry and its own paragraph. Nothing either side
wrote contradicts the other, so every conflict here is resolved by keeping both.

Where the two forms are the *same string* — «Африкан» is spelt alike in Russian
and Serbian — git kept the shared `"form"` line and conflicted only on `lang`
and `note`, so the object has to be split in two rather than concatenated.
"""
import io, json, re, subprocess, sys

MARK_A, MARK_B = '<<<<<<< HEAD\n', '=======\n'

def halves(s):
    a = s.index(MARK_A)
    b = s.index(MARK_B, a)
    c = s.index('>>>>>>> ', b)
    end = s.index('\n', c) + 1
    return a, s[a + len(MARK_A):b], s[b + len(MARK_B):c], end

for path in sys.argv[1:]:
    s = io.open(path, encoding='utf-8', newline='').read()
    a, ours, theirs, end = halves(s)
    if path.endswith('.json'):
        # The shared `"form":` line sits above the conflict; each half needs its
        # own copy of it, so the split is made at the object's own boundary.
        head = s[:a]
        obj_start = head.rindex('    {\n')
        shared = head[obj_start + len('    {\n'):]
        merged = ('    {\n' + shared + ours.rstrip('\n') + '\n    },\n'
                  + '    {\n' + shared + theirs.rstrip('\n') + '\n')
        s = head[:obj_start] + merged + s[end:]
        json.loads(s)
    else:
        # Two paragraphs, each true, in the order the calendars were read.
        s = s[:a] + ours.rstrip('\n') + '\n\n' + theirs.rstrip('\n') + '\n' + s[end:]
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    print('resolved', path)
