# -*- coding: utf-8 -*-
"""One office key the Julian 26 October batch needs.

`athanasius-of-medikion` is a new folder, so `draft-saint.mjs` can set his
`office` — but the four packs have to be able to read it or
`tests/i18n.test.mjs` names him. The words follow the packs' own existing
«Steward of the monastery of Christ the Saviour of Bathys Ryax» row, which is
the only other steward in the corpus, and the monastery's name follows the
packs' «Nicetas of Medikion» spellings.
"""
import io

KEY = 'Steward of the monastery of Medikion'
TR = {
    'ru': 'Эконом Мидикийского монастыря',
    'el': 'Οικονόμος της μονής Μηδικίου',
    'ro': 'Econom al mănăstirii Medikion',
    'sr': 'Економ Мидикијског манастира',
}
ANCHOR = "    'Steward of the monastery of Christ the Saviour of Bathys Ryax':"

for lang, words in TR.items():
    p = 'src/ui/locales/%s.js' % lang
    s = io.open(p, encoding='utf-8', newline='').read()
    if "    '%s':" % KEY in s:
        print('already there:', lang)
        continue
    # after the Bathys Ryax row: 'Christ' sorts before 'Medikion'.
    j = s.index('\n', s.index(ANCHOR)) + 1
    s = s[:j] + "    '%s': '%s',\n" % (KEY, words) + s[j:]
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('wrote', p)
