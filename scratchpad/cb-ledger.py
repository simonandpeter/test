# -*- coding: utf-8 -*-
"""Write scratchpad/icon-colour-swaps-b.json: every row of 86-171 this wave touched.

A swap carries the Commons title, both sizes, both measured saturations, the
licence as Commons states it (read back out of the written icon.meta.json, not
from any search result) and the identity evidence. A refusal carries what was
searched and why nothing was taken.
"""
import io, json, os

QUEUE = json.load(io.open('scratchpad/grey-queue.json', encoding='utf-8'))
CANDS = {r['slug']: r for r in json.load(io.open('scratchpad/cb-cands.json', encoding='utf-8'))}

swaps = []
for n in range(1, 9):
    p = 'scratchpad/cb-draft%d.json' % n
    if os.path.exists(p):
        swaps += json.load(io.open(p, encoding='utf-8'))
SWAP = {d['slug']: d for d in swaps}

# Refusals whose reason is a measurement or a reading, not the absence of a hit.
MEASURED = {
    'vadim-of-persia': 'Identity settled (Q2367773 Bademus, P841 9 April = the folder\'s 4-9, martyr in Persia), and his one Commons file File:Bademus.jpg, 948 px PD, measures saturation 0.0000 — it is a greyscale engraving. No other file depicts him.',
    'cyril-of-turov': 'Identity settled (Q45087 Cyril of Turaw, P841 28 April = the folder\'s 4-28). The one colour-looking candidate, File:Kirill of Turov molitvy GIM.jpg (CC0, 2869 px), measures 0.1014 — under the 0.12 floor, a near-monochrome manuscript page.',
    'tikhon-of-amathus': 'Identity settled (Q3991188 Tychon of Amathus, P841 16 June = the folder\'s 6-16). Two colour candidates and both refused: File:Николай Чудотворец и Тихон Амафунтский.jpg measures 0.0633, under the floor; the Dumbarton Oaks fresco File:Church of Panagia tou Arakos … Sts. Tychon and Nicholas, half cleaned (CC0, 0.2598) was looked at and is a half-cleaned conservation photograph, half the frame soot and a doorframe, with the saint sharing it with Nicholas — a loss against the clean plate, not a gain.',
    'gregentius-of-ethiopia': 'Identity settled (Q1545017 Gregentius of Taphar, P841 19 December = the folder\'s 12-19). File:Greek Manuscripts 541, Life of Gregentios.jpg (PD, 1149 px) measures 0.0000 — a greyscale manuscript photograph.',
    'ignatius-of-rostov': 'Identity settled (Q4197429, Commons category Ignatius of Rostov, the folder\'s 5-28). Both colour files in that category are group icons — Ростовские святители Леонтий, Исаия и Игнатий and Selected russian saints — and neither is a picture of this saint a hero slot could carry.',
    'matthias-the-apostle': 'Commons category Saint Matthias listed by hand, because the apostle\'s entity Q44020 is a biblical figure rather than a human and the sweep\'s own filter drops it. The category holds three files: a church exterior at 3492 px and two Bowyer Bible engravings at 640 and 405 px, under the folder\'s own 643. Nothing to take.',
    'acacius-the-centurion': 'Refused for ambiguity rather than for absence. Q3982149 (Agathius, P841 8 May against the folder\'s 5-7) carries a Commons category whose colour files are all the Western Ten Thousand Martyrs of Mount Ararat cycle — a different legend attached to the same name, and the b6dc41ab failure mode exactly.',
    'cosmas-of-asia': 'Refused on the discriminator. The only entity reached is Q76486, Cosmas and Damian of Arabia, whose P841 days are 26/27 September and 1 July; this folder keeps 1 November, which is the Asia Minor pair. Commons\' category does not separate the three pairs of the name, so no file there can be shown to be this saint.',
    'ananias-of-the-three-youths': 'The routes reach only the Three Youths as a group (Q1429777) and Daniel (Q171724), both on the folder\'s own 17 December. Nothing on Commons depicts Ananias/Azarias apart from the group, so no single-subject colour file exists to take.',
    'simeon-the-fool-for-christ': 'Identity settled (Q1099483 Simeon the Holy Fool, P841 21 July = the folder\'s 7-21), but the entity carries no P373 category and no P18, and the structured-data search for files depicting him returns unrelated photographs. Commons appears to hold no picture of him.',
    'theophilus-companion-of-trophimus': "Wrong-saint refusal. The only sainty entity any route reached for the stored forms is Q44187, Patriarch Kirill of Moscow, whose category is modern photographs. Nothing reached Theophilus of Lycia, the folder's own 7-21/7-23 martyr.",
    'hilary-companion-of-proclus': "Wrong-saint refusal. The routes reach Hilary of Poitiers (Q44344, 14 January) and Pope Hilarius (Q172377, 17 November); the folder keeps 12 July and the epithet Calyptus. Different men of the name, so every file their categories hold is refused.",
    'martyrius-companion-of-marcian': "Wrong-saint refusal. The pair's own entity Q24009983 (Marcianus and Martyrius) carries no category, no P18 and no depictions; the files listed belong to Q43706, John Chrysostom, whose days are 27 January and 13 September against the folder's 10-25.",
    'alexander-companion-of-antonina': "Wrong-saint refusal. The Russian form «Александр Воин» reaches Q2623788, Alexander Peresvet, the Kulikovo monk-warrior commemorated 20 September; the folder keeps 10 June with Antonina. Different man.",
}

REVIEWED = {q['slug'] for q in QUEUE[86:142]}
rows = []
for q in QUEUE[86:172]:
    slug = q['slug']
    if slug in SWAP:
        d = SWAP[slug]
        meta = json.load(io.open(os.path.join('saints', slug, 'images', 'icon.meta.json'),
                                 encoding='utf-8'))
        from PIL import Image

# `-I` implies `-E`, so PYTHONIOENCODING is ignored and a Cyrillic file title in a
# log line raises UnicodeEncodeError mid-row. The stream is set here instead.
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        im = Image.open(os.path.join('saints', slug, 'images', 'icon.jpg'))
        px = list(im.convert('RGB').resize((64, 64)).getdata())
        s = sum((max(p) - min(p)) / max(p) for p in px if max(p)) / len(px)
        rows.append({
            'slug': slug, 'kind': 'swap',
            'old': {'w': q['w'], 'h': q['h'], 'sat': q['sat']},
            'new': {'file': d['file'], 'w': im.size[0], 'h': im.size[1], 'sat': round(s, 4)},
            'licence': meta['licence'], 'source_url': meta['source_url'],
            'why': d['why'],
        })
        continue
    c = CANDS.get(slug)
    if not c:
        continue  # not reached by this wave; reported as set aside, not touched
    if slug not in MEASURED and slug not in REVIEWED:
        rows.append({'slug': slug, 'kind': 'searched-unreviewed',
                     'old': {'w': q['w'], 'h': q['h'], 'sat': q['sat']},
                     'forms': c['forms'], 'feasts': c['feasts'],
                     'why': ('Candidates collected by scratchpad/cb-search.py and left in '
                             'scratchpad/cb-cands.json for the next wave; no identity reading '
                             'was made here, so this row is neither a swap nor a refusal.')})
        continue
    if slug in MEASURED:
        why = MEASURED[slug]
    else:
        matched = [e for e in c['ents'] if not e.get('skip') and not e.get('err')]
        if matched:
            e = matched[0]
            why = ('Entity matched: %s %s (P841 %s) via %s, Commons category %s. '
                   'No file it offers is at or above the %d px icon in hand, so nothing '
                   'was downloaded or measured.' % (
                       e['qid'], e['label'] or '?', ','.join(e['feast']) or 'unset',
                       e['how'], ','.join(e['p373']) or 'none', q['w']))
        else:
            names = '; '.join('%s (%s)' % (e.get('label') or e['qid'], e.get('skip') or e.get('err', ''))
                              for e in c['ents'][:3]) or 'nothing at all'
            why = ('No entity for this saint on el/ro/ru/sr/bg/en wikipedia for any stored '
                   'name form: the searches returned only %s. Routes tried: titles from the '
                   'folder\'s own forms, wikipedia full-text then wikibase_item then P373, '
                   'structured data P180, category members.' % names)
    rows.append({'slug': slug, 'kind': 'no-colour',
                 'old': {'w': q['w'], 'h': q['h'], 'sat': q['sat']},
                 'forms': c['forms'], 'feasts': c['feasts'], 'why': why})

io.open('scratchpad/icon-colour-swaps-b.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(rows, ensure_ascii=False, indent=1) + '\n')
print('%d rows: %d swaps, %d refusals; %d of 86 searched' % (
    len(rows), sum(1 for r in rows if r['kind'] == 'swap'),
    sum(1 for r in rows if r['kind'] == 'no-colour'),
    sum(1 for q in QUEUE[86:172] if q['slug'] in CANDS)))
