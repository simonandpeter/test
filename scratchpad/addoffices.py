# -*- coding: utf-8 -*-
"""Three office keys the Julian 24 and 25 October batches could not set.

`upgrade.py` has no `office` key, so these three were left empty with the
calendar's own word in the life. Written here once for the wave rather than
invented per folder, with the words taken from the four packs' own existing
«Reader of Emesa» and «Eparch of the city of Thessalonica» rows.
"""
import io, json, sys

TR = {
  'Governor of the city of Nagran': {
    'ru': 'Градоправитель города Неграна',
    'el': 'Άρχοντας της πόλεως Νεγράν',
    'ro': 'Guvernator al cetății Negran',
    'sr': 'Градоначелник града Неграна',
  },
  'Reader': {'ru': 'Чтец', 'el': 'Αναγνώστης', 'ro': 'Citeț', 'sr': 'Читац'},
  'Subdeacon': {'ru': 'Иподиакон', 'el': 'Υποδιάκονος', 'ro': 'Ipodiacon', 'sr': 'Иподијакон'},
}
AFTER = {
  'Governor of the city of Nagran': "'Grand Prince of Moscow':",
  'Reader': None,
  'Subdeacon': "'Stylite':",
}
BEFORE = {'Reader': "'Reader of Emesa':"}

for lang in ('ru', 'el', 'ro', 'sr'):
    p = 'src/ui/locales/%s.js' % lang
    s = io.open(p, encoding='utf-8', newline='').read()
    for key, words in TR.items():
        if "    '%s':" % key in s:
            print('already there:', lang, key); continue
        line = "    '%s': '%s',\n" % (key, words[lang])
        if BEFORE.get(key):
            anchor = "    %s" % BEFORE[key]
            i = s.index(anchor)
            s = s[:i] + line + s[i:]
        else:
            anchor = "    %s" % AFTER[key]
            i = s.index(anchor)
            j = s.index('\n', i) + 1
            s = s[:j] + line + s[j:]
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('wrote', p)

OFFICES = {
  'aretas-of-nagran': 'Governor of the city of Nagran',
  'marcian-companion-of-martyrius': 'Reader',
  'martyrius-companion-of-marcian': 'Subdeacon',
}
for slug, office in OFFICES.items():
    p = 'saints/%s/saint.json' % slug
    s = io.open(p, encoding='utf-8', newline='').read()
    j = json.loads(s)
    if j.get('office'):
        print('office already set:', slug, j['office']); continue
    # Written by hand into the text rather than re-serialised, so the file's
    # own key order and formatting survive.
    anchor = '"display_name"'
    i = s.index(anchor)
    line = '  "office": %s,\n' % json.dumps(office, ensure_ascii=False)
    s = s[:i - 2] + line + s[i - 2:]
    json.loads(s)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('wrote', p, '->', office)
