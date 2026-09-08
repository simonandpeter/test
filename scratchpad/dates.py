# -*- coding: utf-8 -*-
"""Adds the date vocabulary and the `eras` branch to each locale pack.

Ad hoc; run once and its output is the packs, which are the source of truth
from then on (see `offices.py` beside it for the same arrangement).
"""
import io, re, sys

DATES = {
 'ru': {
  'century': '{r} в.',
  'centuryEarly': 'начало {r} в.',
  'centuryLate': 'конец {r} в.',
  'centuryMid': 'середина {r} в.',
  'centuryRange': '{ra}–{rb} вв.',
  'yearRange': '{a}–{b}',
  'decade': '{y}-е гг.',
  'circa': 'ок. {when}',
  'bc': '{when} до Р. Х.',
  'probably': 'вероятно, {when}',
  'or': ' или ',
 },
 'ro': {
  'century': 'sec. al {r}-lea',
  'centuryEarly': 'începutul sec. al {r}-lea',
  'centuryLate': 'sfârșitul sec. al {r}-lea',
  'centuryMid': 'mijlocul sec. al {r}-lea',
  'centuryRange': 'sec. al {ra}-lea – al {rb}-lea',
  'yearRange': '{a}–{b}',
  'decade': 'anii {y}',
  'circa': 'cca. {when}',
  'bc': '{when} î.Hr.',
  'probably': 'probabil {when}',
  'or': ' sau ',
 },
 'el': {
  'century': '{n}ος αι.',
  'centuryEarly': 'αρχές {n}ου αι.',
  'centuryLate': 'τέλη {n}ου αι.',
  'centuryMid': 'μέσα {n}ου αι.',
  'centuryRange': '{a}ος–{b}ος αι.',
  'yearRange': '{a}–{b}',
  'decade': 'δεκαετία {y}',
  'circa': 'περ. {when}',
  'bc': '{when} π.Χ.',
  'probably': 'πιθανώς {when}',
  'or': ' ή ',
 },
 'sr': {
  'century': '{r} в.',
  'centuryEarly': 'почетак {r} в.',
  'centuryLate': 'крај {r} в.',
  'centuryMid': 'средина {r} в.',
  'centuryRange': '{ra}–{rb} в.',
  'yearRange': '{a}–{b}',
  'decade': '{y}-е',
  'circa': 'око {when}',
  'bc': '{when} пре Хр.',
  'probably': 'вероватно {when}',
  'or': ' или ',
 },
}

ERAS = {
 'under Alexander Severus':   ['при Александре Севере', 'sub Alexandru Sever', 'επί Αλεξάνδρου Σεβήρου', 'за Александра Севера'],
 'under Antoninus Pius':      ['при Антонине Пии', 'sub Antoninus Pius', 'επί Αντωνίνου Πίου', 'за Антонина Пија'],
 'under Aurelian':            ['при Аврелиане', 'sub Aurelian', 'επί Αυρηλιανού', 'за Аурелијана'],
 'under Claudius':            ['при Клавдии', 'sub Claudius', 'επί Κλαυδίου', 'за Клаудија'],
 'under Constantine the Great': ['при Константине Великом', 'sub Constantin cel Mare', 'επί Μεγάλου Κωνσταντίνου', 'за Константина Великог'],
 'under Diocletian':          ['при Диоклетиане', 'sub Dioclețian', 'επί Διοκλητιανού', 'за Диоклецијана'],
 'under Galerius':            ['при Галерии', 'sub Galerius', 'επί Γαλερίου', 'за Галерија'],
 'under Hadrian':             ['при Адриане', 'sub Hadrian', 'επί Αδριανού', 'за Хадријана'],
 'under Hadrian or Antoninus': ['при Адриане или Антонине', 'sub Hadrian sau Antoninus', 'επί Αδριανού ή Αντωνίνου', 'за Хадријана или Антонина'],
 'under Julian the Apostate': ['при Юлиане Отступнике', 'sub Iulian Apostatul', 'επί Ιουλιανού του Παραβάτη', 'за Јулијана Отпадника'],
 'under King Milutin':        ['при короле Милутине', 'sub regele Milutin', 'επί του βασιλιά Μιλούτιν', 'за краља Милутина'],
 'under Licinius':            ['при Лицинии', 'sub Liciniu', 'επί Λικινίου', 'за Ликинија'],
 'under Maximian':            ['при Максимиане', 'sub Maximian', 'επί Μαξιμιανού', 'за Максимијана'],
 'under Nicholas Mystikos':   ['при Николае Мистике', 'sub Nicolae Misticul', 'επί Νικολάου Μυστικού', 'за Николу Мистика'],
 'under Prince Lazar':        ['при князе Лазаре', 'sub cneazul Lazăr', 'επί του πρίγκιπα Λαζάρου', 'за кнеза Лазара'],
 'under Zeno':                ['при Зеноне', 'sub Zenon', 'επί Ζήνωνος', 'за Зенона'],
 'at the Council in Trullo':  ['на Трулльском соборе', 'la Sinodul Trulan', 'στην Πενθέκτη Σύνοδο', 'на Трулском сабору'],
 'at the Council of Ephesus': ['на Ефесском соборе', 'la Sinodul din Efes', 'στη Σύνοδο της Εφέσου', 'на Ефеском сабору'],
 'around the end of the first millennium': ['около конца первого тысячелетия', 'pe la sfârșitul primului mileniu', 'περί τα τέλη της πρώτης χιλιετίας', 'око краја првог миленијума'],
}

NOTE = """  /*
   * The names a date is placed by where no year is (author, 2026-09-08, with
   * the lifespans). A reign or a council is a proper noun in a construction
   * this language declines — «при Диоклетиане», not «при Диоклетиан» — so it
   * is one whole phrase here rather than a preposition and a name composed by
   * `lib/date-display.js`, which reads everything else in a display string
   * structurally. Pack-only, like `reasons` and `offices`, and for the same
   * reason: the key is the English the corpus recorded.
   */
  eras: {
"""


def js(s):
    bs, q = chr(92), chr(39)
    return q + s.replace(bs, bs + bs).replace(q, bs + q) + q


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    for i, lang in enumerate(['ru', 'ro', 'el', 'sr']):
        p = 'src/ui/locales/%s.js' % lang
        s = io.open(p, encoding='utf-8').read()
        assert "eras: {" not in s, lang
        # the date vocabulary, straight after `after:`
        anchor = re.search(r"^(    after: .*\n)", s, re.M)
        rows = ''.join('    %s: %s,\n' % (js(k) if k == 'or' else k, js(v))
                       for k, v in DATES[lang].items())
        s = s[:anchor.end()] + rows + s[anchor.end():]
        # the eras branch, at the end beside `offices`
        tail = s.rstrip()
        body = tail[: tail.rfind('};')]
        eras = ''.join('    %s: %s,\n' % (js(k), js(v[i])) for k, v in ERAS.items())
        s = body + NOTE + eras + '  },\n};\n'
        io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
        print(lang, 'ok')


main()
