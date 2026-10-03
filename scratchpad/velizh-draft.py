#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Build the draft file for the second half of the Russian 8 October.

The eleven names on that day's second company line share one printed line, one
pair of commemorations and — for ten of the eleven — one and the same absence
of any life at all. Writing eleven JSON objects by hand would be eleven
chances to mistype the shared half; the particulars that differ are the table
below, and every one of them was read off that saint's own index page.

This is not a generator in `draft-saint.mjs`'s forbidden sense: it composes no
fact. The name form, the office, the rank abbreviation, the types and the
sentences are typed here, one row per person.

`python scratchpad/velizh-draft.py > .tmp/ru-drafts/2026-10-21-b.json`
"""
import io
import json
import sys

DAY_URL = 'https://days.pravoslavie.ru/Days/20261008.html'
DAY_TEXT = (
    'days.pravoslavie.ru, 8 октября ст. ст. — «Сщмчч. Ионы , еп. Велижского, '
    'прмч. Серафима , сщмчч. Петра , Василия , Павла , Петра , Владимира '
    'пресвитеров, мчч. Виктора , Иоанна , Николая и мц. Елисаветы (1937).»'
)
ICON_NOTE = (
    'No rank is read onto him. His line is in the day\'s third paragraph, which '
    'carries no icon; the day\'s one icon is the plain service, «Cовершается '
    'служба, не отмеченная в Типиконе никаким знаком», and it stands two '
    'paragraphs above, before Pelagia of 457.'
)
SYNAXIS_NOTE = (
    'His name page lists one other day, «26 января (Новомуч.)», the synaxis of '
    'the new martyrs and confessors of Russia. One row per church is the '
    'schema, so the January day is recorded here and he does not render on it.'
)
AZBYKA = (
    'The long lives of the twentieth-century Russian saints are on azbyka.ru, '
    'which answered 403 to this desk\'s fetcher on 4 October 2026 even with a '
    'browser user-agent, so the line stands as the line.'
)

# slug, display, office, types, ru form, index heading, name id, sex,
# the gloss of the rank abbreviation, the saint's own sentences
ROWS = [
    (
        'seraphim-shchelokov', 'Seraphim (Shchelokov)', 'Archimandrite',
        ['venerable-martyr', 'new-martyr'], 'Серафим (Щелоков)',
        'Серафим (Щелоков), архимандрит, прмч.', 13818, 'male',
        'He is the one «прмч.» of the line, a venerable-martyr: a monastic '
        'killed for the faith rather than a priest of the parishes.',
        'The day line sets him alone between the bishop and the five priests, '
        'and his index entry adds the office the line leaves out: '
        'archimandrite. Nothing else is printed — no year of birth, no house, '
        'no charge, no place of death.',
    ),
    (
        'peter-ozeretskovsky', 'Peter (Ozeretskovsky)', 'Priest',
        ['hieromartyr', 'new-martyr', 'presbyter'], 'Петр (Озерецковский)',
        'Петр (Озерецковский), иерей, сщмч.', 9773, 'male',
        '«Сщмч.» marks a hieromartyr, a priest killed for the faith, and '
        '«иерей» on his index page is the simple priesthood.',
        'He is the first of the five the day line gathers under one word, '
        '«пресвитеров», and the second of the two Ozeretskovskys on it. The '
        'calendar says nothing about how the two were related, or whether '
        'they were, and nothing is inferred here.',
    ),
    (
        'basil-ozeretskovsky', 'Basil (Ozeretskovsky)', 'Priest',
        ['hieromartyr', 'new-martyr', 'presbyter'], 'Василий (Озерецковский)',
        'Василий (Озерецковский), иерей, сщмч.', 9503, 'male',
        '«Сщмч.» marks a hieromartyr, a priest killed for the faith, and '
        '«иерей» on his index page is the simple priesthood.',
        'He stands on the day line immediately after '
        '[Peter (Ozeretskovsky)](/saints/peter-ozeretskovsky), with whom he '
        'shares a surname, a rank, an office and both of his days. The '
        'calendar does not say whether the two were kin, and nothing is '
        'inferred from the surname.',
    ),
    (
        'paul-preobrazhensky', 'Paul (Preobrazhensky)', 'Archpriest',
        ['hieromartyr', 'new-martyr', 'presbyter'], 'Павел (Преображенский)',
        'Павел (Преображенский), протоиерей, сщмч.', 9386, 'male',
        '«Сщмч.» marks a hieromartyr, a priest killed for the faith.',
        'The day line calls him one of the «пресвитеров» and his index entry '
        'raises that to «протоиерей», archpriest, which is the one thing the '
        'two pages add up to between them.',
    ),
    (
        'peter-nikotin', 'Peter (Nikotin)', 'Archpriest',
        ['hieromartyr', 'new-martyr', 'presbyter'], 'Петр (Никотин)',
        'Петр (Никотин), протоиерей, сщмч.', 13816, 'male',
        '«Сщмч.» marks a hieromartyr, a priest killed for the faith.',
        'He is the second Peter of the line, and the surname is what keeps the '
        'two apart: his index entry heads him «Петр (Никотин), протоиерей», an '
        'archpriest, where the other Peter is an «иерей» named Ozeretskovsky.',
    ),
    (
        'vladimir-speransky', 'Vladimir (Speransky)', 'Priest',
        ['hieromartyr', 'new-martyr', 'presbyter'], 'Владимир (Сперанский)',
        'Владимир (Сперанский), иерей, сщмч.', 13817, 'male',
        '«Сщмч.» marks a hieromartyr, a priest killed for the faith, and '
        '«иерей» on his index page is the simple priesthood.',
        'He is the last of the five priests the day line gathers under the one '
        'word «пресвитеров», and after him the line turns to the lay people.',
    ),
    (
        'victor-frolov', 'Victor (Frolov)', None,
        ['martyr', 'new-martyr'], 'Виктор (Фролов)',
        'Виктор (Фролов), мч.', 13819, 'male',
        '«Мч.» marks a martyr who held no orders — a layman killed for the '
        'faith.',
        'He is the first of the three laymen the day line names after the '
        'priests, and his index entry gives him no office at all, which for '
        'this calendar is itself the statement that he held none.',
    ),
    (
        'john-rybin-8-october', 'John (Rybin) (8 October)', None,
        ['martyr', 'new-martyr'], 'Иоанн (Рыбин)',
        'Иоанн (Рыбин), мч.', 13820, 'male',
        '«Мч.» marks a martyr who held no orders — a layman killed for the '
        'faith.',
        'The corpus already holds a [John (Rybin)](/saints/john-rybin), and he '
        'is not this man. That one is the site\'s name page 9635, «Иоанн '
        '(Рыбин), иерей, сщмч.», a priest kept on the Russian 6 October; this '
        'one is page 13820, «Иоанн (Рыбин), мч.», a layman kept two days '
        'later. Two index entries, two ranks, two days, one surname — and the '
        'day in brackets is in the display name because the two names are '
        'otherwise the same.',
    ),
    (
        'nicholas-kuzmin', 'Nicholas (Kuzmin)', None,
        ['martyr', 'new-martyr'], 'Николай (Кузьмин)',
        'Николай (Кузьмин), мч.', 13821, 'male',
        '«Мч.» marks a martyr who held no orders — a layman killed for the '
        'faith.',
        'He is the last of the three laymen on the line, and after him it '
        'names one woman. His index entry gives a surname and no office.',
    ),
    (
        'elizabeth-kuranova', 'Elizabeth (Kuranova)', None,
        ['martyr', 'new-martyr'], 'Елисавета (Куранова)',
        'Елисавета (Куранова), мц.', 13822, 'female',
        '«Мц.» marks a woman martyr who held no office — the feminine of the '
        '«мч.» the three men before her carry.',
        'She closes the line, and she is the only woman on it. Her index entry '
        'gives the surname and nothing else; the forename is the older '
        'Slavonic spelling, «Елисавета» rather than «Елизавета».',
    ),
]

COMPANY = [
    'jonah-lazarev', 'seraphim-shchelokov', 'peter-ozeretskovsky',
    'basil-ozeretskovsky', 'paul-preobrazhensky', 'peter-nikotin',
    'vladimir-speransky', 'victor-frolov', 'john-rybin-8-october',
    'nicholas-kuzmin', 'elizabeth-kuranova',
]

EXTRA_RELATED = {'john-rybin-8-october': {'john-rybin'}}

saints = []
for slug, display, office, types, form, heading, nid, sex, gloss, own in ROWS:
    her = sex == 'female'
    pron = 'her' if her else 'him'
    saint = {
        'slug': slug,
        'display_name': display,
        'sex': sex,
        'types': types,
        'names': [{
            'form': form,
            'lang': 'ru',
            'note': 'The heading of days.pravoslavie.ru\'s name page %d, «%s», with the office and the rank word left off.' % (nid, heading),
        }],
        'dates': {
            'death': {
                'earliest': 1937,
                'latest': 1937,
                'display': '1937',
                'basis': 'traditional',
                'note': 'The year the calendar\'s day line prints at the end of the company it names him in: «… и мц. Елисаветы (1937)».' if not her else 'The year the calendar\'s day line prints at the end of the company it names her in: «… и мц. Елисаветы (1937)».',
            },
        },
        'attestations': [
            {
                'church': 'russian',
                'status': 'venerated',
                'feast': {
                    'day': 8,
                    'month': 10,
                    'calendar': 'julian',
                    'note': SYNAXIS_NOTE.replace(' he ', ' she ') if her else SYNAXIS_NOTE,
                },
                'source': {
                    'text': DAY_TEXT,
                    'url': DAY_URL,
                    'year': 2026,
                    'note': ICON_NOTE.replace('onto him', 'onto her').replace('His line', 'Her line') if her else ICON_NOTE,
                },
                'note': 'The line names eleven people and the site carries a life for one of them, the bishop. For this one it prints the forename, the surname, the rank abbreviation and, on the index page, the office — and nothing more.',
            },
            {
                'church': 'romanian',
                'status': 'undocumented',
                'note': 'Not checked: doxologia.ro\'s own 21 octombrie was not read (2026-10-04); the Romanian calendar does not generally keep the Russian new martyrs of the Soviet period.',
            },
            {
                'church': 'greek',
                'status': 'undocumented',
                'note': 'Not checked: saint.gr/10/21 was not read (2026-10-04).',
            },
            {
                'church': 'serbian',
                'status': 'undocumented',
                'note': 'Not checked: pravoslavno.rs\'s Prologue page for civil 21 October 2026 was not read (2026-10-04).',
            },
        ],
        # Every name a life links needs a `related` row of its own, and the one
        # link outside the company is the priest of the same surname two days
        # earlier, whom this folder exists to be told apart from.
        'related': sorted(set(s for s in COMPANY if s != slug) | EXTRA_RELATED.get(slug, set())),
        'text': {'life': 'life.md'},
    }
    if office:
        saint['office'] = office

    opening = (
        'The Russian calendar\'s 8 October names a company of eleven on one '
        'line: «Сщмчч. Ионы , еп. Велижского, прмч. Серафима , сщмчч. Петра , '
        'Василия , Павла , Петра , Владимира пресвитеров, мчч. Виктора , '
        'Иоанна , Николая и мц. Елисаветы (1937)». %s is in it, and the site\'s '
        'index of names gives the surname: «%s». %s'
        % (display.split(' (')[0], heading, gloss)
    )
    closing = (
        'The site carries a life for one of the eleven, the bishop '
        '[Jonah (Lazarev)](/saints/jonah-lazarev), and for the other ten it '
        'carries none. %s index entry keeps %s here and on 26 January with the '
        'whole company of the new martyrs and confessors of Russia, and the '
        'year 1937 at the end of the line is the only date on either page. %s'
        % ('Her' if her else 'His', pron, AZBYKA)
    )
    source_line = (
        '*After the Russian church calendar\'s [8 October](%s) and [its index '
        'entry for %s](https://days.pravoslavie.ru/name/%d.html); read '
        '4 October 2026.*' % (DAY_URL, 'her' if her else 'him', nid)
    )
    saints.append({'saint': saint, 'life': '\n\n'.join([opening, own, closing, source_line])})

# The bishop, who has a life, and Barlaam, who stands in his own sentence after
# both companies, are typed out whole in this file rather than filled from the
# table. They go in the same draft because `draft-saint.mjs` writes one batch
# record per run and overwrites it, so a batch that wants one `--undo` and one
# commit has to be one file.
EXTRA = '.tmp/ru-drafts/2026-10-21-b-extra.json'
saints.extend(json.load(io.open(EXTRA, encoding='utf-8')))

out = {'batch': 'ru-2026-10-21-b', 'read_on': '4 October 2026', 'saints': saints}
sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=2))
