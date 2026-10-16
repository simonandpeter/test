# -*- coding: utf-8 -*-
"""Turn the ledger's 18 `searched-unreviewed` rows into verdicts.

The candidates were collected by `cb-search.py` and left unread. This records
the reading: who each route actually reached, against the folder's own feast
day, which is the discriminator this task's failure mode needs.

Usage: python scratchpad/cb-read-18.py [--write]
"""
import io
import json
import sys

LEDGER = 'scratchpad/icon-colour-swaps-b.json'
WRITE = '--write' in sys.argv

VERDICTS = {
    'sergius-companion-of-bacchus': (
        'swap',
        'Wikidata Q140013, Sergius and Bacchus, carries P841 7 October, which is this '
        "folder's own feast, and there is one pair of the name. File:Sergius and Bacchus "
        'icon.jpg, public domain, 1280 px of a 3663 px original at saturation 0.398 '
        'against an 872 px plate at 0.000.'),
    'theodosius-of-chernigov': (
        'swap',
        "Wikidata Q741224 is reached by this folder's own stored Russian form "
        '«Феодосий Черниговский» and is the archbishop of Chernihiv it keeps. '
        'File:Sv feodosiy ugl-1.jpg, public domain, 1280 px of 1870 at saturation 0.365 '
        'against a 919 px plate at 0.000.'),
    'damian-of-rome': (
        'ambiguous',
        'Q76486 conflates the three pairs of Cosmas and Damian — the Arabian on 17 October, '
        'the Roman on 1 July, the Asian on 1 November — and prints all three days at once, '
        'so a generic icon of the brothers cannot be shown to be the Roman pair this folder '
        'keeps. Refused on the same ground as `cosmas-of-asia`: Commons does not separate '
        'them. Measured anyway and it would have passed at 1280 px and saturation 0.611.'),
    'dalmatus-of-constantinople': (
        'namesake',
        'The routes reach Q705202, Isaac of Dalmatia, whose P841 is 30 May against this '
        "folder's 3 August. Isaac founded the Dalmatou monastery and Dalmatus succeeded "
        'him; they are two men, and `isaac-of-constantinople` already holds that icon.'),
    'theodore-boyar-of-chernigov': (
        'namesake',
        'Everything reached is Q2363350, Theodore Stratelates, P841 8 February against this '
        "folder's 20 September. The boyar martyred with Michael of Chernigov is a different "
        'man five centuries later.'),
    'athanasius-the-reader': (
        'namesake',
        'Athanasius of Alexandria (P841 2 May, 15 May, 31 January) and Athanasios III of '
        "Constantinople (21 August) against this folder's 20 and 23 June. The reader of "
        'Salamis is neither.'),
    'nicodemus-the-hagiorite': (
        'namesake',
        'The el route reaches Gregory Palamas and Saint Sava — two other Athonite teachers '
        "— and neither carries this folder's 14 July."),
    'helen-the-empress': (
        'namesake',
        'The sr route reaches Helen of Anjou, the Serbian queen, and Helena of Bulgaria. '
        'The mother of Constantine, kept on 21 May, is not among the entities any stored '
        'form reaches.'),
    'dionysius-of-ephesus': (
        'namesake',
        'The ru route reaches Patriarch Kirill of Moscow, and every file under him is a '
        'photograph of a living man.'),
    'archippus-the-apostle': (
        'no-colour',
        'Q468856 is the right apostle, but his category holds one file and it is the same '
        '«Жития Святых» plate family this folder already carries, at the same 1080 px and '
        'the same absence of colour.'),
}

NOWHERE = {
    'erastus': 'a fourth-century BC philosopher, a Swiss Calvinist and a Woody Allen film',
    'eulampius-of-nicomedia': 'a group entity carrying no picture, a Greek banker and a 1970 film',
    'timothy-husband-of-maura': 'a Russian priest, a list of bishops and a disambiguation page',
    'zenobius-of-aegae': 'a given name, a disambiguation page, a Greek sophist and a prime minister',
    'episteme-of-emesa': 'the calendar of saints itself, a Romanian bishop and a monastery',
    'glyceria-of-traianopolis': 'the date 26 May and a given name',
    'andronicus-the-apostle': 'a disambiguation page and two Palaiologan emperors',
    'carpus-of-thyatira': 'the Decian persecution, the emperor Decius, and the acts of his own martyrdom as a text',
}

by_slug = {}
ledger = json.load(io.open(LEDGER, encoding='utf-8'))
for row in ledger:
    if row.get('kind') != 'searched-unreviewed':
        continue
    by_slug[row['slug']] = row
    if row['slug'] in VERDICTS:
        kind, why = VERDICTS[row['slug']]
    elif row['slug'] in NOWHERE:
        kind, why = 'nowhere', (
            'No entity any stored form reaches is this saint, and none carries a picture: '
            + NOWHERE[row['slug']] + '. Six wikipedias, P373, P18 and Commons structured data.')
    else:
        continue
    row['kind'] = kind
    row['why'] = why
    print('%-34s %s' % (row['slug'], kind))

left = [s for s, r in by_slug.items() if r.get('kind') == 'searched-unreviewed']
print('\nstill unreviewed: %s' % (', '.join(left) or 'none'))
if WRITE:
    io.open(LEDGER, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(ledger, ensure_ascii=False, indent=1) + '\n')
    print('written')
