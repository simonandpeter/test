# -*- coding: utf-8 -*-
"""A life conflicted by two calendars reading the same saint, merged so it keeps
one citation line.

Two waves reading one person from two calendars append their own paragraphs
*and* their own clause to the life's single closing citation. Concatenating the
halves leaves that line twice, the first copy stranded mid-document, which is
why this is not `-X ours` or a hand edit per file. Both sides' paragraphs are
kept in the order the calendars were read, and the two citation lines are folded
into one by taking their common prefix and both tails.

    python scratchpad/resolve-lives.py saints/<slug>/life.md ...

Both marker styles are accepted: `git merge` writes `HEAD` and the branch name,
and `git checkout -m` on the same file afterwards writes `ours` and `theirs`.
"""
import io
import re
import sys

for path in sys.argv[1:]:
    s = io.open(path, encoding='utf-8', newline='').read()
    m = re.search(r'^<<<<<<< .*\n', s, re.M)
    a, after_a = m.start(), m.end()
    b = s.index('=======\n', a)
    c = s.index('>>>>>>> ', b)
    end = s.index('\n', c) + 1
    ours = s[after_a:b].strip().split('\n\n')
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
