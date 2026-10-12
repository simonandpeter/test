# -*- coding: utf-8 -*-
"""Build the Julian 14 December drafts: 2 new folders, 4 upgrades."""
import io, json

URL = 'https://days.pravoslavie.ru/Days/20261214.html'
LIFE = 'https://days.pravoslavie.ru/Life/life3117.htm'
READ = '13 October 2026'
SRC = 'Православный церковный календарь, Сретенский монастырь (days.pravoslavie.ru), 14 декабря ст. ст. — '
CLOSE = ('*After the Православный церковный календарь of the Сретенский monastery for 14 декабря '
         'ст. ст. — [the day](%s) and [the life](%s); read %s.*' % (URL, LIFE, READ))
CLOSE_DAY = ('*After the Православный церковный календарь of the Сретенский monastery for 14 '
             'декабря ст. ст. — [the day](%s); read %s.*' % (URL, READ))
CLAUSE = ('; and the Православный церковный календарь of the Сретенский monastery for 14 декабря '
          'ст. ст. — [the day](%s) and [the life](%s), read %s' % (URL, LIFE, READ))
CLAUSE_DAY = ('; and the Православный церковный календарь of the Сретенский monastery for 14 '
              'декабря ст. ст. — [the day](%s), read %s' % (URL, READ))

NOTCHECKED = [
    {"church": "romanian", "status": "undocumented",
     "note": "Not checked: doxologia.ro for the corresponding civil day, 27 decembrie (%s)." % READ},
    {"church": "greek", "status": "undocumented",
     "note": "Not checked: saint.gr for the corresponding civil day, 27 Δεκεμβρίου (%s)." % READ},
    {"church": "serbian", "status": "undocumented",
     "note": "Not checked: the Ohrid Prologue at pravoslavno.rs for 27 December 2026 (%s)." % READ},
]

L2 = 'Мчч. Филимона , Аполлония , Ариана и Феотиха (286-251).'
L3 = 'Сщмч. Николая пресвитера (1937).'
L1 = 'Мчч. Фирса , Левкия и Каллиника (249-251).'

BACKWARDS = ('THE LINE’S OWN YEARS ARE BACKWARDS AND ARE NOT USED AS A RANGE: it closes '
             '«(286-251)», a later year before an earlier one, which cannot be an interval. The '
             'reading behind it gives two dates instead and they are what is recorded — «Мученики '
             'Филимон и Аполлоний скончались 16 марта 286 г., а мученики Ариан и Феотих – 4 '
             'марта 287 года». The defect is the source’s own, as `docs/CORPUS.md` §3 says '
             'such readings are.')

# ----------------------------------------------------------------- new folders
theotichus = {
    "slug": "theotichus-of-antinoe",
    "display_name": "Theotichus of Antinoë",
    "types": ["martyr"],
    "names": [{"form": "Феотих Антинойский", "lang": "ru",
               "note": "The calendar’s own name page for him is «Феотих Антинойский, мч.»; the "
                       "rank is stripped and the city kept. The day line declines the bare "
                       "forename, «Феотиха». `fk.mjs` on the stored string returns NONE."}],
    "dates": {"death": {"earliest": 287, "latest": 287, "display": "287", "basis": "attested",
                        "note": "The reading at /Life/life3117.htm: «мученики Ариан и Феотих – "
                                "4 марта 287 года». " + BACKWARDS}},
    "attestations": [{
        "church": "russian", "status": "venerated",
        "feast": {"day": 14, "month": 12, "calendar": "julian"},
        "source": {"text": SRC + '«%s»' % L2, "url": URL, "year": 2026},
        "note": "The day’s second entry, a company of four of whom the corpus already held "
                "three. He is the fourth and he is new: `grep -ril 'Феотих\\|Theotich'` over every "
                "`saint.json` returns nothing. The reading behind the line places him exactly — "
                "«Среди телохранителей старшим был мученик Феотих», the senior of the bodyguards "
                "Arianus was baptised with — so he is a person and not a heading, and `martyr` is "
                "the line’s own «Мчч.». NO OFFICE IS WRITTEN: the reading makes him the "
                "senior of a governor’s bodyguard, which is not a church office and is not a "
                "word the locale packs read; it is said in the life instead. "
                "**AN OPEN QUESTION IS LEFT AND NOT DECIDED.** The corpus holds "
                "`evhie-14-december`, a bare Romanian line — doxologia’s «Sfântul Mucenic "
                "Evhie» for 14 decembrie with no life, no year, no place and no companions — and "
                "the four bodyguards of this reading are the four protectors the Greek calendar "
                "counts on the same day, so that folder could in principle be one of them. "
                "Nothing read links the two: «Evhie» is no transliteration of «Феотих» and neither "
                "page names the other. This folder is written because the name is absent from the "
                "corpus, and the question is named in the day’s report rather than settled "
                "here.",
    }] + NOTCHECKED,
    "related": ["arianus-of-the-thebaid", "philemon-the-flute-player", "apollonius-the-reader"],
    "text": {"life": "life.md"},
}

THEO_LIFE = (
    'The Православный церковный календарь of the Сретенский monastery names him last of four '
    'martyrs of Antinoë in Egypt on 14 декабря — «Мчч. Филимона, Аполлония, Ариана и Феотиха» — and '
    'the reading behind the line tells how he came into their company. It was not as a Christian. '
    'He was one of the bodyguards of the governor who had been persecuting them, and the reading '
    'calls him the senior of those men.\n\n'
    'The governor was [Arianus of the Thebaid](/saints/arianus-of-the-thebaid), who had '
    '[Apollonius the Reader](/saints/apollonius-the-reader) and '
    '[Philemon the Flute-Player](/saints/philemon-the-flute-player) put to death and was then '
    'healed of a wounded eye by dust taken from Philemon’s grave. He repented, confessed '
    'Christ, and was baptised with his whole household and with his bodyguard; and those men, the '
    'reading says, went willingly to the torments for the love of Christ and were put to death.\n\n'
    'The calendar gives him no life of his own and nothing else about him: not where he was born, '
    'not how he died, not a word he said. The reading dates his death and Arianus’s to 4 '
    'March 287, a year after the two they had killed. The day page carries one kontakion, and it '
    'is for the martyrs of the other company the day heads, not for his.\n\n' + CLOSE)
theotichus_e = {"saint": theotichus, "life": THEO_LIFE}

nikolai = {
    "slug": "nicholas-kovalev",
    "display_name": "Nicholas (Kovalev)",
    "types": ["hieromartyr", "new-martyr", "presbyter"],
    "office": "Priest",
    "names": [{"form": "Николай (Ковалев)", "lang": "ru",
               "note": "The calendar’s own name page for him is «Николай (Ковалев), иерей, "
                       "сщмч.»; the grade and the rank are stripped and the surname kept, the day "
                       "line itself giving only «Николая пресвитера». `fk.mjs` on the stored string "
                       "returns NONE."}],
    "dates": {"death": {"earliest": 1937, "latest": 1937, "display": "1937", "basis": "attested",
                        "note": "The year the day line closes with, «(1937)», which is the whole of "
                                "what the source gives; no year of birth anywhere."}},
    "attestations": [{
        "church": "russian", "status": "venerated",
        "feast": {"day": 14, "month": 12, "calendar": "julian"},
        "source": {"text": SRC + '«%s»' % L3, "url": URL, "year": 2026},
        "note": "The day’s third and last entry, and THE LINE AND THE NAME PAGE ARE ALL THERE "
                "IS: no life page stands behind it. The line says «пресвитера» and the name page "
                "«иерей», priest, which agree, so `presbyter` and the office `Priest` are both the "
                "source’s own words. `new-martyr` is written as this corpus writes it for this "
                "calendar’s twentieth-century «сщмч.» entries, and THE 26 ЯНВАРЯ SYNAXIS PAGE "
                "WAS NOT OPENED. No folder held him: a Cyrillic grep for «Ковалев» over every "
                "`saint.json` returns only `andrew-kovalev`, a different forename. The day page "
                "prints one kontakion and it is not under his name.",
    }] + NOTCHECKED,
    "text": {"life": "life.md"},
}
NIK_LIFE = (
    'The Православный церковный календарь of the Сретенский monastery names him among the '
    'hieromartyrs on 14 декабря and gives no life. Its line is «Сщмч. Николая пресвитера (1937).» — '
    'the hieromartyr Nicholas the presbyter, 1937 — and the calendar’s own name page adds the '
    'surname the line leaves out: «Николай (Ковалев), иерей, сщмч.»\n\n'
    'That is the whole of the record. He was a priest; he died in 1937, in the years the Russian '
    'church counts its new martyrs; and the calendar keeps him on this day alone, his line joined '
    'to no one else’s. The day page carries one kontakion, for the martyrs of a company three '
    'centuries older than he, and nothing under his name. Nothing else is written here, because '
    'nothing else was read.\n\n' + CLOSE_DAY)

io.open('.tmp/ru-drafts/12-14.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps({"batch": "ru-12-14", "read_on": READ,
                "saints": [theotichus_e, {"saint": nikolai, "life": NIK_LIFE}]},
               ensure_ascii=False, indent=2) + '\n')

# ----------------------------------------------------------------- upgrades
def row(line, note):
    return {"church": "russian", "status": "venerated",
            "feast": {"day": 14, "month": 12, "calendar": "julian", "note": note},
            "source": {"text": SRC + '«%s»' % line, "url": URL, "year": 2026}}


NOT_READ = ('The reading this calendar links behind the entry WAS opened, and what it adds beyond '
            'the folder’s own sources is recorded in the life. ')

COMPANY_PARA = (
    'The Russian calendar keeps the four of Antinoë together on 14 декабря ст. ст., the same '
    'menologion day as the other calendars here, and its line is «Мчч. Филимона, Аполлония, Ариана '
    'и Феотиха (286-251).» The years in it run backwards and are not an interval; the reading '
    'behind the line gives two dates instead, 16 March 286 for Philemon and Apollonius and 4 March '
    '287 for Arianus and the senior of his bodyguards, and those are what this folder now records.\n\n'
    'The reading also supplies the fourth man of the line, whom this corpus did not hold: '
    '[Theotichus of Antinoë](/saints/theotichus-of-antinoe), the senior of the bodyguards baptised '
    'with the governor and put to death with him. The day page carries one kontakion only, and it '
    'belongs to the other company the day heads.')

D286 = {"death": {"earliest": 286, "latest": 286, "display": "286", "basis": "attested",
                  "note": "The reading at /Life/life3117.htm: «Мученики Филимон и Аполлоний "
                          "скончались 16 марта 286 г.» " + BACKWARDS}}
D287 = {"death": {"earliest": 287, "latest": 287, "display": "287", "basis": "attested",
                  "note": "The reading at /Life/life3117.htm: «мученики Ариан и Феотих – 4 "
                          "марта 287 года». " + BACKWARDS}}

COMPANY_NOTE = (
    'The same menologion day this folder’s other rows already carry, so there is no second '
    'day and none is noted. The line names four and the corpus held three, so this day is three '
    'rows and one arrival; the fourth, `theotichus-of-antinoe`, is written in the same batch and '
    'related both ways. ' + NOT_READ +
    'A DATE IS WRITTEN WHERE THE FOLDER HAD NONE and it is the reading’s, not the line’s: '
    + BACKWARDS +
    ' The day page’s one kontakion names Thyrsus and Leucius and is not written here.')

ups = []
for slug, form, dates in [
        ('philemon-the-flute-player', 'Филимон Антинойский', D286),
        ('apollonius-the-reader', 'Аполлоний Антинойский', D286),
        ('arianus-of-the-thebaid', 'Ариан Антинойский', D287)]:
    ups.append({
        "slug": slug, "church": "russian",
        "row": row(L2, COMPANY_NOTE),
        "names": [{"form": form, "lang": "ru",
                   "note": "The calendar’s own name page for him is «%s, мч.»; the rank is "
                           "stripped and the city kept. The day line declines the bare forename. "
                           "`fk.mjs` on the stored string returns NONE." % form}],
        "dates": dates,
        "related_add": ["theotichus-of-antinoe"],
        "life_para": COMPANY_PARA,
        "source_clause": CLAUSE})

ups.append({
    "slug": "callinicus-of-caesarea", "church": "russian",
    "row": row(L1,
               'The same menologion day this folder’s other rows already carry, so there is no '
               'second day and none is noted. **THE OTHER TWO MEN OF THIS LINE WERE WITHHELD AND '
               'NOT UPGRADED, AND THE REASON IS NOT ABOUT THEM BUT ABOUT A RULING.** '
               '`thyrsus-of-caesarea` and `leucius-of-caesarea` already hold venerated russian rows '
               'on 14 августа ст. ст. — the calendar’s «Мчч. Фирса, Левкия, Короната и дружины '
               'их (249-251)» — and a saint who already holds such a row on another day is governed '
               'by an author question BRIEF-RUSSIAN §4 and BRIEF.md §4 answer differently, so '
               'nothing was written for either. This folder’s own russian row was '
               '`undocumented`, its 17 августа companion being Coronatus and not him, so there is '
               'no such question here. THE READINGS THIS ENTRY LINKS WERE NOT OPENED: this '
               'folder’s life is already written out of its other sources. The day page’s '
               'one kontakion is written here — see the hymn’s own note.'),
    "names": [{"form": "Каллиник Кесарийский (Вифинский)", "lang": "ru",
               "note": "The calendar’s own name page for him is «Каллиник Кесарийский "
                       "(Вифинский), мч.»; the rank is stripped and both forms of the place kept, "
                       "the parentheses being the page’s own. The day line declines the bare "
                       "forename, «Каллиника». `fk.mjs` on the stored string returns NONE."}],
    "hymns_add": [{
        "church": "russian", "kind": "kontakion", "lang": "cu", "tone": "глас 2",
        "text": "Благочестия веры поборницы,/ злочестиваго мучителя оплевавше,/ обличисте "
                "зверообразное его кровопролитие/ и победисте того яростное противление,/ Христовою "
                "помощию укрепляеми, Фирсе и Левкие,// с пострадавшими о нас молитеся.",
        "source": {"text": SRC + '«Кондак мучеников», глас 2. THE TEXT NAMES TWO OTHER MEN AND NOT '
                           'HIM, and it is written here on purpose. It addresses «Фирсе и Левкие, с '
                           'пострадавшими» — Thyrsus and Leucius, with those who suffered with them '
                           '— and the day line that carries it names him third of exactly that '
                           'company, as his own `related` rows to both men already do. It is the '
                           'company’s kontakion and not another saint’s proper, which is '
                           'the test `BRIEF.md` §4 sets. It is NOT written on the folders of the '
                           'two men it names, because both already hold a venerated russian row on '
                           '17 августа ст. ст. and were withheld under the ruling named in this '
                           'row’s note.',
                   "url": URL, "year": 2026},
        "english": {"text": "O champions of the faith of piety, who spat upon the impious torturer, "
                            "ye laid bare his beast-like shedding of blood and overcame his furious "
                            "resistance, being strengthened by the help of Christ. O Thyrsus and "
                            "Leucius, with those who suffered alongside you, pray for us.",
                    "rendered": "site"},
    }],
    "life_para":
        'The Russian calendar keeps him on 14 декабря ст. ст., the same menologion day as the other '
        'calendars here, and its line is «Мчч. Фирса, Левкия и Каллиника (249-251).» — the martyrs '
        'Thyrsus, Leucius and Callinicus, with the years this folder’s companions already '
        'carry. Its own name page gives him both forms of his city at once, «Каллиник Кесарийский '
        '(Вифинский)», of Caesarea and of Bithynia.\n\n'
        'The day page carries one kontakion, addressed to the first two of the three and to those '
        'who suffered with them, and it is written here as the company’s own. The readings '
        'this calendar links behind the entry were not opened; the life above is written out of the '
        'other sources.',
    "source_clause": CLAUSE_DAY})

io.open('.tmp/ru-drafts/up-12-14.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(ups, ensure_ascii=False, indent=2) + '\n')
print('2 new,', len(ups), 'upgrades')
