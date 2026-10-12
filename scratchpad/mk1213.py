# -*- coding: utf-8 -*-
"""Build .tmp/ru-drafts/12-13.json -- the ten new martyrs of the Julian 13 December."""
import io, json

DAY = 13
MONTH = 12
URL = 'https://days.pravoslavie.ru/Days/20261213.html'
READ = '13 October 2026'
SRC_RU = 'Православный церковный календарь, Сретенский монастырь (days.pravoslavie.ru), 13 декабря ст. ст. — '
CLOSE = ('*After the Православный церковный календарь of the Сретенский monastery for '
         '13 декабря ст. ст. — [the day](%s); read %s.*' % (URL, READ))
CLOSE_LIFE = ('*After the Православный церковный календарь of the Сретенский monastery for '
              '13 декабря ст. ст. — [the day](%s) and '
              '[the life](https://days.pravoslavie.ru/Life/life4790.htm); read %s.*' % (URL, READ))

NOTCHECKED = [
    {"church": "romanian", "status": "undocumented",
     "note": "Not checked: doxologia.ro for the corresponding civil day, 26 decembrie (%s)." % READ},
    {"church": "greek", "status": "undocumented",
     "note": "Not checked: saint.gr for the corresponding civil day, 26 Δεκεμβρίου (%s)." % READ},
    {"church": "serbian", "status": "undocumented",
     "note": "Not checked: the Ohrid Prologue at pravoslavno.rs for 26 December 2026 (%s)." % READ},
]

HYMNNOTE = ('The day page carries troparia and kontakia for five of the memories it heads, '
            'and none under his name.')


def att(line, note):
    return [{"church": "russian", "status": "venerated",
             "feast": {"day": DAY, "month": MONTH, "calendar": "julian"},
             "source": {"text": SRC_RU + '«%s»' % line, "url": URL, "year": 2026},
             "note": note}] + NOTCHECKED


def saint(slug, display, types, office, form, year, line, note, life,
          related=None, dates_note=None, birth=None):
    s = {
        "slug": slug,
        "display_name": display,
        "types": types,
    }
    if office:
        s["office"] = office
    s["names"] = [{"form": form, "lang": "ru",
                   "note": "The calendar's own name page for him, which day-candidates.mjs prints as "
                           "`name: %s`; the grade and the rank are stripped and the surname kept, the day "
                           "line itself declining the bare forename only. `fk.mjs` on the stored string "
                           "returns %s." % (NAMEPAGE[slug], FK[slug])}]
    d = {}
    if birth:
        d["birth"] = birth
    d["death"] = {"earliest": year, "latest": year, "display": str(year),
                  "basis": "attested",
                  "note": dates_note or ("The year the day line closes with, «(%d)», which is the whole "
                                         "of what the source gives; no year of birth anywhere." % year)}
    s["dates"] = d
    s["attestations"] = att(line, note)
    if related:
        s["related"] = related
    s["text"] = {"life": "life.md"}
    return {"saint": s, "life": life}


NAMEPAGE = {
    'alexander-yuzefovich': 'Александр (Юзефович), иерей, сщмч.',
    'john-menkov': 'Иоанн (Меньков), мч.',
    'vladimir-lozina-lozinsky': 'Владимир (Лозина-Лозинский), протоиерей, сщмч.',
    'alexander-pospelov': 'Александр (Поспелов), протоиерей, сщмч.',
    'james-gusev': 'Иаков (Гусев), иерей, сщмч.',
    'alexis-rozhdestvensky': 'Алексий (Рождественский), протоиерей, сщмч.',
    'gregory-faddeev': 'Григорий (Фаддеев), иерей, сщмч.',
    'nicholas-amassiysky': 'Николай (Амассийский), иерей, сщмч.',
    'emilian-kireev': 'Емилиан (Киреев), иерей, сщмч.',
    'basil-pokrovsky-13-december': 'Василий (Покровский), иерей, сщмч.',
}
FK = {k: 'NONE' for k in NAMEPAGE}
FK['basil-pokrovsky-13-december'] = (
    'basil-pokrovsky, a different man — a presbyter of 1937 whom this calendar keeps on 3 ноября '
    'ст. ст. The two share the stored form exactly and the fold is deliberate; it is recorded in '
    'the gate')

L1920 = 'Сщмч. Александра пресвитера и мч. Иоанна (1920).'
L1937 = 'Сщмчч. Владимира , Александра , Иакова , Алексия , Григория пресвитеров (1937).'
L1938 = 'Сщмч. Николая пресвитера (1938).'
L1941 = 'Сщмчч. Емилиана , Василия пресвитеров (1941).'

NOTE_COMMON = (
    '`new-martyr` is written as this corpus writes it for this calendar’s twentieth-century '
    '«сщмч.» and «мч.» entries, and THE 26 ЯНВАРЯ SYNAXIS PAGE WAS NOT OPENED. %s'
)

saints = []

# --- 1920 pair -------------------------------------------------------------
saints.append(saint(
    'alexander-yuzefovich', 'Alexander (Yuzefovich)',
    ['hieromartyr', 'new-martyr', 'presbyter'], 'Priest',
    'Александр (Юзефович)', 1920, L1920,
    'The day’s eighth entry, and THE LINE AND THE NAME PAGE ARE ALL THERE IS: no life page '
    'stands behind it. The line says «пресвитера» and the name page «иерей», priest, which agree, '
    'so `presbyter` and the office `Priest` are both the source’s own words. ' +
    (NOTE_COMMON % ('No folder held him: `ls -d saints/*yuzefovich*` is empty and a Cyrillic grep '
                    'for «Юзефович» over every `saint.json` returns nothing. ' + HYMNNOTE)),
    'The Православный церковный календарь of the Сретенский monastery names him among the '
    'hieromartyrs on 13 декабря and gives no life. Its line is «Сщмч. Александра пресвитера и мч. '
    'Иоанна (1920).» — the hieromartyr Alexander the presbyter and the martyr John, 1920 — and the '
    'calendar’s own name page adds the surname the line leaves out: «Александр (Юзефович), '
    'иерей, сщмч.»\n\n'
    'That is the whole of the record. He was a priest; he died in 1920; and the calendar keeps him '
    'on this day beside [John (Menkov)](/saints/john-menkov), the layman its line joins to him. ' +
    HYMNNOTE + ' Nothing else is written here, because nothing else was read.\n\n' + CLOSE,
    related=['john-menkov']))

saints.append(saint(
    'john-menkov', 'John (Menkov)',
    ['martyr', 'new-martyr'], None,
    'Иоанн (Меньков)', 1920, L1920,
    'The day’s eighth entry, and THE LINE AND THE NAME PAGE ARE ALL THERE IS: no life page '
    'stands behind it. The line calls him «мч.», a martyr, and gives him no rank in the clergy, so '
    'no `office` is written and none was guessed. ' +
    (NOTE_COMMON % ('No folder held him: `ls -d saints/*menkov*` is empty and a Cyrillic grep for '
                    '«Меньков» over every `saint.json` returns nothing. ' + HYMNNOTE)),
    'The Православный церковный календарь of the Сретенский monastery names him among the martyrs '
    'on 13 декабря and gives no life. Its line is «Сщмч. Александра пресвитера и мч. Иоанна '
    '(1920).» — the hieromartyr Alexander the presbyter and the martyr John, 1920 — and the '
    'calendar’s own name page adds the surname the line leaves out: «Иоанн (Меньков), мч.»\n\n'
    'That is the whole of the record. The calendar gives him no rank in the clergy, which is why '
    'this folder carries none; he died in 1920; and it keeps him on this day beside '
    '[Alexander (Yuzefovich)](/saints/alexander-yuzefovich), the presbyter its line joins to him. ' +
    HYMNNOTE + ' Nothing else is written here, because nothing else was read.\n\n' + CLOSE,
    related=['alexander-yuzefovich']))

# --- 1937 five -------------------------------------------------------------
VLAD_LIFE = (
    'The Православный церковный календарь of the Сретенский monastery keeps him on 13 декабря '
    'among five presbyters of 1937, and for him alone of the five it carries a reading. He was born '
    'on 26 May 1885 at Dukhovshchina in the province of Smolensk, the son of district physicians; '
    'his mother caught typhus nursing patients in the district hospital and died in 1888, and his '
    'widowed father took the boys back to St Petersburg.\n\n'
    'He finished the gymnasium of the Imperial Philanthropic Society in 1904 and went straight to '
    'the law faculty of the university; in 1910 he entered the service of the Governing Senate, and '
    'two years later finished the archaeological institute as well. The war found him unfit for the '
    'front, and he spent it moving the wounded from the Petersburg stations to the hospitals. When '
    'the Bolsheviks closed the Senate in 1917 he took work as a statistician on the railway.\n\n'
    'The wish to be a priest ripened slowly, the reading says, under the pressure of the Russian '
    'catastrophe, and he declared it when the open persecution of the Church began. He entered the '
    'theological institute in Petrograd in 1920 and asked for ordination that November, and he '
    'served the university church of All Saints, of which he was rector by 1923.\n\n'
    'He was arrested again and again: in 1924 over the Spasskoe Brotherhood, and in February 1925 '
    'sentenced to ten years in the camps for serving memorial services with the imperial family '
    'remembered in them. He was at Solovki first, where his fellow prisoners remembered that the '
    'aristocracy of his bearing did not leave him even when he was weighing out stinking fish at '
    'the food stall; in 1928 the camp was commuted to five years of exile in Siberia.\n\n'
    'From 1934 he served at Novgorod, and in 1935 became rector of the cathedral of the Archangel '
    'Michael there. He was arrested once more in May 1936, sent for examination to the regional '
    'hospital for the insane and found sane, arrested with a group of his parishioners in November '
    '1937, and shot at Novgorod on 13 December of that year by decision of a special troika. The '
    'place of his burial, the reading ends, the Lord has left hidden. He was numbered among the new '
    'martyrs and confessors of Russia at the jubilee council of August 2000.\n\n'
    'The day page carries troparia and kontakia for five of the memories it heads, and none under '
    'his name.\n\n' + CLOSE_LIFE)

saints.append(saint(
    'vladimir-lozina-lozinsky', 'Vladimir (Lozina-Lozinsky)',
    ['hieromartyr', 'new-martyr', 'presbyter'], 'Archpriest',
    'Владимир (Лозина-Лозинский)', 1937, L1937,
    'The day’s ninth entry, a line of five presbyters of 1937, and the only one of the five '
    'with a reading behind it — `/Life/life4790.htm`, which is his alone. The line says '
    '«пресвитеров» and both the name page and the reading’s title say «протоиерей», '
    'archpriest, so the office is the source’s word and `presbyter` the line’s. The '
    'reading’s «Дни памяти» line gives three days — «26 января (Новомуч.)», the synaxis of '
    'the new martyrs, «8 июня (Петерб.)», the synaxis of the saints of St Petersburg, and «13 '
    'декабря» — of which only the last is a day of his own, and this folder renders on it. '
    'NO RELATED ROWS JOIN HIM TO THE OTHER FOUR OF THE LINE: the reading says he was shot at '
    'Novgorod by a troika of his own, and sharing a line is not a relation. ' +
    (NOTE_COMMON % ('No folder held him: a Cyrillic grep for «Лозина» over every `saint.json` '
                    'returns nothing. ' + HYMNNOTE)),
    VLAD_LIFE,
    birth={"earliest": 1885, "latest": 1885, "display": "1885", "basis": "attested",
           "note": "The reading at /Life/life4790.htm: «родился 26 мая 1885 года в городе "
                   "Духовщина Смоленской губернии»."},
    dates_note='The day line closes «(1937)» and the reading at /Life/life4790.htm dates the '
               'shooting «13 (26) декабря того же года» — the Julian day with the civil one in '
               'parentheses, the year being 1937 either way. Only the year is recorded here; the '
               'source’s own pair is quoted in this note and not in the display.'))


def plain1937(slug, display, office, form, ordinal_word):
    return saint(
        slug, display, ['hieromartyr', 'new-martyr', 'presbyter'], office, form, 1937, L1937,
        'The day’s ninth entry, a line of five presbyters of 1937. THE LINE AND THE NAME PAGE '
        'ARE ALL THERE IS for him: the one reading the entry links, `/Life/life4790.htm`, is the '
        'life of Vladimir (Lozina-Lozinsky) alone and says nothing of the other four. The line says '
        '«пресвитеров» and the name page «%s», which is the office written here. NO RELATED ROWS '
        'JOIN HIM TO THE OTHER FOUR: the one reading behind the line has its own man shot alone at '
        'Novgorod, and sharing a line is not a relation. ' % NAMEPAGE[slug].split(', ')[1] +
        (NOTE_COMMON % ('No folder held him: a Cyrillic grep for the surname over every '
                        '`saint.json` returns only other men of that name with other forenames. ' +
                        HYMNNOTE)),
        'The Православный церковный календарь of the Сретенский monastery names him among five '
        'presbyters on 13 декабря and gives no life for him. Its line is «Сщмчч. Владимира, '
        'Александра, Иакова, Алексия, Григория пресвитеров (1937).» — five hieromartyr presbyters, '
        '1937 — and the calendar’s own name page adds the surname the line leaves out: '
        '«%s»\n\n'
        'That is the whole of the record for him. The one reading the entry links belongs to the '
        'first of the five and says nothing of the rest, so nothing of it is borrowed here. He was '
        'a priest; he died in 1937, in the years the Russian church counts its new martyrs. ' %
        NAMEPAGE[slug] + HYMNNOTE + ' Nothing else is written here, because nothing else was '
        'read.\n\n' + CLOSE,
        dates_note='The year the day line closes with, «(1937)», which is the whole of what the '
                   'source gives for him; the reading behind the line is another man’s.')


saints.append(plain1937('alexander-pospelov', 'Alexander (Pospelov)', 'Archpriest',
                        'Александр (Поспелов)', 'second'))
saints.append(plain1937('james-gusev', 'James (Gusev)', 'Priest', 'Иаков (Гусев)', 'third'))
saints.append(plain1937('alexis-rozhdestvensky', 'Alexis (Rozhdestvensky)', 'Archpriest',
                        'Алексий (Рождественский)', 'fourth'))
saints.append(plain1937('gregory-faddeev', 'Gregory (Faddeev)', 'Priest',
                        'Григорий (Фаддеев)', 'fifth'))

# --- 1938 ------------------------------------------------------------------
saints.append(saint(
    'nicholas-amassiysky', 'Nicholas (Amassiysky)',
    ['hieromartyr', 'new-martyr', 'presbyter'], 'Priest',
    'Николай (Амассийский)', 1938, L1938,
    'The day’s tenth entry, and THE LINE AND THE NAME PAGE ARE ALL THERE IS: no life page '
    'stands behind it. The line says «пресвитера» and the name page «иерей», priest, which agree. ' +
    (NOTE_COMMON % ('No folder held him: a Cyrillic grep for «Амассийский» over every `saint.json` '
                    'returns nothing. ' + HYMNNOTE)),
    'The Православный церковный календарь of the Сретенский monastery names him among the '
    'hieromartyrs on 13 декабря and gives no life. Its line is «Сщмч. Николая пресвитера (1938).» '
    '— the hieromartyr Nicholas the presbyter, 1938 — and the calendar’s own name page adds '
    'the surname the line leaves out: «Николай (Амассийский), иерей, сщмч.»\n\n'
    'That is the whole of the record. He was a priest; he died in 1938, in the years the Russian '
    'church counts its new martyrs; and the calendar keeps him on this day alone, his line joined '
    'to no one else’s. ' + HYMNNOTE + ' Nothing else is written here, because nothing else '
    'was read.\n\n' + CLOSE))

# --- 1941 pair -------------------------------------------------------------
saints.append(saint(
    'emilian-kireev', 'Emilian (Kireev)',
    ['hieromartyr', 'new-martyr', 'presbyter'], 'Priest',
    'Емилиан (Киреев)', 1941, L1941,
    'The day’s eleventh and last entry, and THE LINE AND THE NAME PAGE ARE ALL THERE IS: no '
    'life page stands behind it. The line says «пресвитеров» and the name page «иерей», priest, '
    'which agree. ' +
    (NOTE_COMMON % ('No folder held him: a Cyrillic grep for «Киреев» over every `saint.json` '
                    'returns nothing. ' + HYMNNOTE)),
    'The Православный церковный календарь of the Сретенский monastery names him among the '
    'hieromartyrs on 13 декабря and gives no life. Its line is «Сщмчч. Емилиана, Василия '
    'пресвитеров (1941).» — the hieromartyr presbyters Emilian and Basil, 1941 — and the '
    'calendar’s own name page adds the surname the line leaves out: «Емилиан (Киреев), иерей, '
    'сщмч.»\n\n'
    'That is the whole of the record. He was a priest; he died in 1941; and the calendar keeps him '
    'on this day beside [Basil (Pokrovsky, 13 December)](/saints/basil-pokrovsky-13-december), '
    'the other presbyter of his line. ' + HYMNNOTE + ' Nothing else is written here, because '
    'nothing else was read.\n\n' + CLOSE,
    related=['basil-pokrovsky-13-december']))

saints.append(saint(
    'basil-pokrovsky-13-december', 'Basil (Pokrovsky, 13 December)',
    ['hieromartyr', 'new-martyr', 'presbyter'], 'Priest',
    'Василий (Покровский)', 1941, L1941,
    'The day’s eleventh and last entry, and THE LINE AND THE NAME PAGE ARE ALL THERE IS: no '
    'life page stands behind it. The line says «пресвитеров» and the name page «иерей», priest, '
    'which agree. HE IS NOT `basil-pokrovsky`, WHICH ALREADY EXISTS: that folder is a presbyter of '
    '1937 whom this same calendar keeps on 3 ноября ст. ст., and this one is a presbyter of 1941 '
    'kept on 13 декабря. The two death years and the two days are the source’s own and they '
    'differ; the stored `ru` form is the same string for both, because the calendar gives each the '
    'same forename and the same surname and no epithet to either, and that fold is recorded in '
    '`corpus-gate.mjs` rather than evaded by a form nobody printed. The slug and the display name '
    'carry the day for the same reason, as `nicholas-pokrovsky-27-november` already does. ' +
    (NOTE_COMMON % HYMNNOTE),
    'The Православный церковный календарь of the Сретенский monastery names him among the '
    'hieromartyrs on 13 декабря and gives no life. Its line is «Сщмчч. Емилиана, Василия '
    'пресвитеров (1941).» — the hieromartyr presbyters Emilian and Basil, 1941 — and the '
    'calendar’s own name page adds the surname the line leaves out: «Василий (Покровский), '
    'иерей, сщмч.»\n\n'
    'That is the whole of the record. He was a priest; he died in 1941; and the calendar keeps him '
    'on this day beside [Emilian (Kireev)](/saints/emilian-kireev), the other presbyter of his '
    'line. The same calendar keeps another priest of the same name and the same surname on 3 '
    'ноября ст. ст., who died in 1937 and is a different man; this folder carries the day in its '
    'name so that the two are not confused. ' + HYMNNOTE + ' Nothing else is written here, because '
    'nothing else was read.\n\n' + CLOSE,
    related=['emilian-kireev']))

out = {"batch": "ru-12-13", "read_on": READ, "saints": saints}
io.open('.tmp/ru-drafts/12-13.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print('wrote', len(saints))
