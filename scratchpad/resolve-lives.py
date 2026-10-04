# -*- coding: utf-8 -*-
"""The Terentius company's four lives, merged so each keeps one citation line.

Two batches read the same four men from two calendars on their two days, and
each appended its own paragraphs *and* its own clause to the life's single
closing citation. Concatenating the halves left that line twice, once in the
middle of the document, which is why this is not `-X ours` or a hand edit per
file: the fix is structural. Both sides' paragraphs are kept in the order the
calendars were read, and the two citation lines are folded into one by taking
their common prefix and both tails.
"""
import io, sys

for path in sys.argv[1:]:
    s = io.open(path, encoding='utf-8', newline='').read()
    a = s.index('<<<<<<< ours\n')
    b = s.index('=======\n', a)
    c = s.index('>>>>>>> theirs', b)
    end = s.index('\n', c) + 1
    ours = s[a + len('<<<<<<< ours\n'):b].strip().split('\n\n')
    theirs = s[b + len('=======\n'):c].strip().split('\n\n')
    foot_o, foot_t = ours[-1], theirs[-1]
    i = 0
    while i < min(len(foot_o), len(foot_t)) and foot_o[i] == foot_t[i]:
        i += 1
    common, tail_o, tail_t = foot_o[:i], foot_o[i:], foot_t[i:]
    assert common.endswith('; and the '), common[-20:]
    assert tail_o.endswith('.*') and tail_t.endswith('.*')
    foot = common + tail_o[:-2] + '; and the ' + tail_t
    body = ours[:-1] + theirs[:-1]
    s = s[:a] + '\n\n'.join(body + [foot]) + '\n' + s[end:]
    assert '<<<<<<<' not in s and s.count('*After doxologia') == 1
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    print('resolved', path)
