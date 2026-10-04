# -*- coding: utf-8 -*-
"""Two offices the Julian 7 November batches could not set, composed from the
packs' own rows rather than from me.

`Metropolitan of Kazan and Sviyazhsk` is `Archbishop of Kazan and Sviyazhsk`
with the first word taken from `Metropolitan of Kazan`, in every pack.
`Steward of the Kyiv Caves` is `Steward of the monastery of Medikion`'s first
word with the `of the Kyiv Caves` phrase each pack already uses. Nothing here is
a word this corpus did not already print.
"""
import io, json

TR = {
  'Metropolitan of Kazan and Sviyazhsk': {
    'ru': 'Митрополит Казанский и Свияжский',
    'el': 'Μητροπολίτης Καζάν και Σβιάζσκ',
    'ro': 'Mitropolit de Kazan și Sviajsk',
    'sr': 'Митрополит казански и свијажски',
  },
  'Steward of the Kyiv Caves': {
    'ru': 'Эконом Киево-Печерский',
    'el': 'Οικονόμος των Σπηλαίων του Κιέβου',
    'ro': 'Econom de la Peșterile Kievului',
    'sr': 'Економ кијевопечерски',
  },
}
AFTER = {
  'Metropolitan of Kazan and Sviyazhsk': "'Metropolitan of Kazan':",
  'Steward of the Kyiv Caves': "'Steward of the monastery of Medikion':",
}

for lang in ('ru', 'el', 'ro', 'sr'):
    p = 'src/ui/locales/%s.js' % lang
    s = io.open(p, encoding='utf-8', newline='').read()
    for key, words in TR.items():
        if "    '%s':" % key in s:
            continue
        anchor = '    %s' % AFTER[key]
        i = s.index(anchor)
        j = s.index('\n', i) + 1
        s = s[:j] + "    '%s': '%s',\n" % (key, words[lang]) + s[j:]
    io.open(p, 'w', encoding='utf-8', newline='').write(s)

OFFICES = {
  'cyril-of-kazan': 'Metropolitan of Kazan and Sviyazhsk',
  'luke-of-the-cave': 'Steward of the Kyiv Caves',
}
for slug, office in OFFICES.items():
    p = 'saints/%s/saint.json' % slug
    s = io.open(p, encoding='utf-8', newline='').read()
    j = json.loads(s)
    if j.get('office') == office:
        continue
    if j.get('office'):
        s = s.replace(json.dumps(j['office'], ensure_ascii=False),
                      json.dumps(office, ensure_ascii=False), 1)
    else:
        i = s.index('"display_name"')
        s = s[:i - 2] + '  "office": %s,\n' % json.dumps(office, ensure_ascii=False) + s[i - 2:]
    json.loads(s)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
