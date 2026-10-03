"""Backs the three 2026-10-03 Prayer changes out, or puts them back.

`python scratchpad/backout.py out` / `... back`. Three independent halves, so
each new test can be watched to fail for its own reason:
  * the opening index  -> `at: 0`
  * the drawn heading  -> `sr-only` again
  * Advanced off       -> the fold never painted
"""
import io
import sys

MODE = sys.argv[1]


def edit(path, pairs):
    with io.open(path, encoding='utf-8', newline='') as f:
        s = f.read()
    for a, b in pairs:
        src, dst = (a, b) if MODE == 'out' else (b, a)
        assert src in s, (path, src[:60])
        s = s.replace(src, dst)
    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(s)


edit('src/views/prayer.js', [
    ("""    at: openingAt(all, {""", """    at: 0 && openingAt(all, {"""),
    ("""      <div class="index-head">
        <h1>${esc(P.title)}</h1>""",
     """      <div class="index-head">
        <h1 class="sr-only">${esc(P.title)}</h1>"""),
])

edit('src/views/prayer/find.js', [
    ("""  toggle?.addEventListener('click', onToggle);""",
     """  void onToggle;"""),
    ("""  paintAdvanced(el);
  syncFace(el);""", """  syncFace(el);"""),
])
print('ok', MODE)
