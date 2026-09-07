# -*- coding: utf-8 -*-
"""Emits the `offices` branch for each locale pack. Ad hoc; already applied.

The corpus records an office and an attestation's titles as English phrases —
`Bishop of Nicomedia`, `Archpriest of Zaraysk`, `the Great` — and until
2026-09-08 the saint page, the Daily card and the Index row printed them
straight, in every language. This composed the 158 the corpus then held, from a
rank table and a place table, so a phrase was translated once wherever it
occurred.

**The packs are the source of truth, not this file.** It has been run once and
its output pasted in; a later hand-correction to a pack (Romanian `Novice` was
one, within the hour) is the truth and this file is not. Kept because the next
sitting that adds a see rather than a whole office will want the tables rather
than a fresh reading of ninety-six place names — `node scripts/locale-coverage.mjs`
is what says which are missing. Anything it emits still needs reading before it
goes in: a rank and a place composed by machine is a guess about grammar, which
is why the whole phrase and not the recipe is what a pack holds.
"""
import io, json, re, sys, collections

LANGS = ['ru', 'ro', 'el', 'sr']

# The office noun, in four languages. Masculine where the language declines,
# which every one of these is except Princess, Nun and Queen — and of those
# only Queen ever takes a place (Georgia, handled as a genitive below, which
# is gender-blind in all four).
RANK = {
    'Abbot':                ['Игумен', 'Egumen', 'Ηγούμενος', 'Игуман'],
    'Apologist':            ['Апологет', 'Apologet', 'Απολογητής', 'Апологета'],
    'Apostle':              ['Апостол', 'Apostol', 'Απόστολος', 'Апостол'],
    'Archbishop':           ['Архиепископ', 'Arhiepiscop', 'Αρχιεπίσκοπος', 'Архиепископ'],
    'Archdeacon':           ['Архидиакон', 'Arhidiacon', 'Αρχιδιάκονος', 'Архиђакон'],
    'Archimandrite':        ['Архимандрит', 'Arhimandrit', 'Αρχιμανδρίτης', 'Архимандрит'],
    'Archpriest':           ['Протоиерей', 'Protoiereu', 'Πρωτοπρεσβύτερος', 'Протојереј'],
    'Bishop':               ['Епископ', 'Episcop', 'Επίσκοπος', 'Епископ'],
    'Deacon':               ['Диакон', 'Diacon', 'Διάκονος', 'Ђакон'],
    'Elder':                ['Старец', 'Stareț', 'Γέροντας', 'Старац'],
    'Emperor':              ['Император', 'Împărat', 'Αυτοκράτορας', 'Цар'],
    'Fool for Christ':      ['Юродивый', 'Nebun pentru Hristos', 'Διά Χριστόν σαλός', 'Јуродиви'],
    'Grand Prince':         ['Великий князь', 'Mare cneaz', 'Μέγας πρίγκιπας', 'Велики кнез'],
    'Hegumen':              ['Игумен', 'Egumen', 'Ηγούμενος', 'Игуман'],
    'Hierodeacon':          ['Иеродиакон', 'Ierodiacon', 'Ιεροδιάκονος', 'Јерођакон'],
    'Hieromonk':            ['Иеромонах', 'Ieromonah', 'Ιερομόναχος', 'Јеромонах'],
    'Hieroschemamonk':      ['Иеросхимонах', 'Ieroschimonah', 'Ιεροσχημόναχος', 'Јеросхимонах'],
    'Iconographer':         ['Иконописец', 'Iconar', 'Αγιογράφος', 'Иконописац'],
    'King':                 ['Царь', 'Rege', 'Βασιλιάς', 'Краљ'],
    'Metropolitan':         ['Митрополит', 'Mitropolit', 'Μητροπολίτης', 'Митрополит'],
    'Monk':                 ['Монах', 'Monah', 'Μοναχός', 'Монах'],
    'Novice':               ['Послушник', 'Ascultător', 'Δόκιμος', 'Искушеник'],
    'Nun':                  ['Монахиня', 'Monahie', 'Μοναχή', 'Монахиња'],
    'Patriarch':            ['Патриарх', 'Patriarh', 'Πατριάρχης', 'Патријарх'],
    'Pope':                 ['Папа', 'Papă', 'Πάπας', 'Папа'],
    'Presbyter':            ['Пресвитер', 'Presbiter', 'Πρεσβύτερος', 'Презвитер'],
    'Priest':               ['Священник', 'Preot', 'Ιερέας', 'Свештеник'],
    'Prince':               ['Князь', 'Cneaz', 'Πρίγκιπας', 'Кнез'],
    'Princess':             ['Княгиня', 'Cneaghină', 'Πριγκίπισσα', 'Кнегиња'],
    'Protodeacon':          ['Протодиакон', 'Protodiacon', 'Πρωτοδιάκονος', 'Протођакон'],
    'Psalmist':             ['Псаломщик', 'Psalt', 'Ψάλτης', 'Псалт'],
    'Queen':                ['Царица', 'Regină', 'Βασίλισσα', 'Краљица'],
    'Recluse':              ['Затворник', 'Zăvorât', 'Έγκλειστος', 'Затворник'],
    'Schema-archimandrite': ['Схиархимандрит', 'Schiarhimandrit', 'Σχιαρχιμανδρίτης', 'Схиархимандрит'],
    'Schemamonk':           ['Схимонах', 'Schimonah', 'Σχημοναχός', 'Схимонах'],
    'Stylite':              ['Столпник', 'Stâlpnic', 'Στυλίτης', 'Столпник'],
    'Voivode':              ['Воевода', 'Voievod', 'Βοεβόδας', 'Војвода'],
    'Wonderworker':         ['Чудотворец', 'Făcător de minuni', 'Θαυματουργός', 'Чудотворац'],
    # Titles a church's own attestation carries, which stand on the same line.
    'Venerable':            ['Преподобный', 'Cuvios', 'Όσιος', 'Преподобни'],
    'Blessed':              ['Блаженный', 'Fericit', 'Μακάριος', 'Блажени'],
    'Martyr':               ['Мученик', 'Mucenic', 'Μάρτυς', 'Мученик'],
    'Great Martyr':         ['Великомученик', 'Mare Mucenic', 'Μεγαλομάρτυς', 'Великомученик'],
    'Hierarch':             ['Святитель', 'Ierarh', 'Ιεράρχης', 'Светитељ'],
    'First Archbishop':     ['Первый архиепископ', 'Primul arhiepiscop', 'Πρώτος Αρχιεπίσκοπος', 'Први архиепископ'],
    'recluse':              ['затворник', 'zăvorât', 'έγκλειστος', 'затворник'],
}

# The trailing phrase, in the case or form its language puts a see or a house
# in: Russian and Serbian take the adjectival see-form where the calendars use
# one and a genitive where they do not, Greek takes the genitive throughout,
# Romanian "de" for a city and "al" for a region.
PLACE = {
    'in Persia':                    ['Персидский', 'al Persiei', 'Περσίδος', 'персијски'],
    'of Akhtala in Iberia':         ['Ахтальский в Иверии', 'de Ahtala în Iberia', 'Αχταλών Ιβηρίας', 'ахталски у Иверији'],
    'of Alexandria':                ['Александрийский', 'al Alexandriei', 'Αλεξανδρείας', 'александријски'],
    'of Alexandria Minor':          ['Малой Александрии', 'al Alexandriei Mici', 'Αλεξανδρείας της Μικράς', 'Мале Александрије'],
    'of Alma-Ata':                  ['Алма-Атинский', 'de Alma-Ata', 'Αλμάτι', 'алмаатски'],
    'of Ancyra':                    ['Анкирский', 'de Ancira', 'Αγκύρας', 'анкирски'],
    'of Antioch':                   ['Антиохийский', 'al Antiohiei', 'Αντιοχείας', 'антиохијски'],
    'of Apamea':                    ['Апамейский', 'de Apameea', 'Απαμείας', 'апамејски'],
    'of Arsinoe':                   ['Арсинойский', 'de Arsinoe', 'Αρσινόης', 'арсинојски'],
    'of Athos':                     ['Афонский', 'din Athos', 'Αγίου Όρους', 'светогорски'],
    'of Bathys Ryax':               ['Вафис Риака', 'de Bathys Ryax', 'Βαθέος Ρύακος', 'Ватис Ријака'],
    'of Belgorod':                  ['Белгородский', 'de Belgorod', 'Μπελγκορόντ', 'белгородски'],
    'of Bohemia and Moravia-Silesia': ['Чешский и Моравско-Силезский', 'al Boemiei și Moraviei-Silezia', 'Βοημίας και Μοραβίας-Σιλεσίας', 'чешки и моравско-шлески'],
    'of Caesarea':                  ['Кесарийский', 'de Cezareea', 'Καισαρείας', 'кесаријски'],
    'of Caesarea in Cappadocia':    ['Кесарии Каппадокийской', 'de Cezareea Capadociei', 'Καισαρείας Καππαδοκίας', 'кесаријски у Кападокији'],
    'of Canterbury':                ['Кентерберийский', 'de Canterbury', 'Καντερβουρίας', 'кентерберијски'],
    'of Carrhae':                   ['Харранский', 'de Carrhae', 'Καρρών', 'харански'],
    'of Carthage':                  ['Карфагенский', 'de Cartagina', 'Καρχηδόνος', 'картагински'],
    'of Cetatea Albă-Ismail':       ['Белгород-Днестровский и Измаильский', 'de Cetatea Albă-Ismail', 'Τσετάτεα Άλμπα-Ισμαήλ', 'Четатеа Албе-Измаила'],
    'of Chernigov':                 ['Черниговский', 'de Cernigov', 'Τσερνίγκοφ', 'черниговски'],
    'of Chytri in Cyprus':          ['Хитрский на Кипре', 'de Chytri în Cipru', 'Χύτρων Κύπρου', 'хитарски на Кипру'],
    'of Colophon':                  ['Колофонский', 'de Colofon', 'Κολοφώνος', 'колофонски'],
    'of Comana':                    ['Команский', 'de Comana', 'Κομάνων', 'комански'],
    'of Constantinople':            ['Константинопольский', 'de Constantinopol', 'Κωνσταντινουπόλεως', 'цариградски'],
    'of Corone':                    ['Коронский', 'de Coroni', 'Κορώνης', 'коронски'],
    'of Crete':                     ['Критский', 'al Cretei', 'Κρήτης', 'критски'],
    'of Cyprus':                    ['Кипрский', 'al Ciprului', 'Κύπρου', 'кипарски'],
    'of Córdoba':                   ['Кордовский', 'de Cordoba', 'Κόρδοβας', 'кордобски'],
    'of Dabar-Bosnia':              ['Дабро-Боснийский', 'de Dabar-Bosnia', 'Δάβαρ-Βοσνίας', 'дабробосански'],
    'of Dmitrov':                   ['Дмитровский', 'de Dmitrov', 'Ντμίτροφ', 'дмитровски'],
    'of Edessa':                    ['Эдесский', 'de Edesa', 'Εδέσσης', 'едески'],
    'of Georgia':                   ['Грузии', 'a Georgiei', 'της Γεωργίας', 'Грузије'],
    'of Gorky':                     ['Горьковский', 'de Gorki', 'Γκόρκι', 'горкијски'],
    'of Gortyna':                   ['Гортинский', 'de Gortina', 'Γορτύνης', 'гортински'],
    'of Great Perm':                ['Великопермский', 'de Perm cel Mare', 'Μεγάλης Περμ', 'великопермски'],
    'of Heraclea':                  ['Ираклийский', 'de Heracleea', 'Ηρακλείας', 'ираклијски'],
    'of Hippo':                     ['Иппонийский', 'de Hipona', 'Ιππώνος', 'хипонски'],
    'of Iconium':                   ['Иконийский', 'de Iconium', 'Ικονίου', 'иконијски'],
    'of India':                     ['Индийский', 'al Indiei', 'της Ινδίας', 'индијски'],
    'of Judah':                     ['Иудейский', 'al lui Iuda', 'του Ιούδα', 'јудејски'],
    'of Kirillov':                  ['Кирилловский', 'de Kirillov', 'Κιρίλοφ', 'кириловски'],
    'of Kiziltash':                 ['Кизилташский', 'de Kiziltaș', 'Κιζιλτάς', 'кизилташки'],
    'of Kourion':                   ['Курийский', 'de Kourion', 'Κουρίου', 'куријски'],
    'of Kydonies':                  ['Кидонийский', 'de Kydonies', 'Κυδωνιών', 'кидонијски'],
    'of Kyiv':                      ['Киевский', 'de Kiev', 'Κιέβου', 'кијевски'],
    'of Laodicea':                  ['Лаодикийский', 'de Laodiceea', 'Λαοδικείας', 'лаодикијски'],
    'of Larissa':                   ['Ларисский', 'de Larisa', 'Λαρίσης', 'лариски'],
    'of Lefkada':                   ['Лефкадский', 'de Lefkada', 'Λευκάδος', 'лефкадски'],
    'of Lipetsk':                   ['Липецкий', 'de Lipețk', 'Λίπετσκ', 'липецки'],
    'of Lycia':                     ['Ликийский', 'al Liciei', 'Λυκίας', 'ликијски'],
    'of Lydia':                     ['Лидийский', 'al Lidiei', 'Λυδίας', 'лидијски'],
    'of Lyon':                      ['Лионский', 'de Lyon', 'Λυών', 'лионски'],
    'of Magnesia':                  ['Магнезийский', 'de Magnezia', 'Μαγνησίας', 'магнезијски'],
    'of Melicucca':                 ['Меликуккский', 'de Melicucca', 'Μελικουκκά', 'Меликуке'],
    'of Moldavia':                  ['Молдавский', 'al Moldovei', 'Μολδαβίας', 'молдавски'],
    'of Moschonisia':               ['Мосхонисийский', 'de Moschonisia', 'Μοσχονησίων', 'мосхонишки'],
    'of Moscow':                    ['Московский', 'de Moscova', 'Μόσχας', 'московски'],
    'of Narva':                     ['Нарвский', 'de Narva', 'Νάρβας', 'нарвски'],
    'of Nicaea':                    ['Никейский', 'de Niceea', 'Νικαίας', 'никејски'],
    'of Nicomedia':                 ['Никомидийский', 'de Nicomidia', 'Νικομηδείας', 'никомидијски'],
    'of Novgorod':                  ['Новгородский', 'de Novgorod', 'Νόβγκοροντ', 'новгородски'],
    'of Omsk':                      ['Омский', 'de Omsk', 'Ομσκ', 'омски'],
    'of Optina':                    ['Оптинский', 'de la Optina', 'Όπτινα', 'оптински'],
    'of Ostrog':                    ['Острожский', 'de Ostrog', 'Οστρόγκ', 'острошки'],
    'of Pelecete':                  ['Пеликитский', 'de Pelechit', 'Πελεκητής', 'пелекитски'],
    'of Penza':                     ['Пензенский', 'de Penza', 'Πένζα', 'пензански'],
    'of Pentapolis':                ['Пентапольский', 'de Pentapolis', 'Πενταπόλεως', 'пентапољски'],
    'of Roman':                     ['Романский', 'de Roman', 'Ρομάν', 'романски'],
    'of Rome':                      ['Римский', 'al Romei', 'Ρώμης', 'римски'],
    'of Sardis':                    ['Сардийский', 'de Sardes', 'Σάρδεων', 'сардски'],
    'of Selenginsk':                ['Селенгинский', 'de Selenghinsk', 'Σελεγκίνσκ', 'селенгински'],
    'of Serbia':                    ['Сербский', 'al Serbiei', 'Σερβίας', 'српски'],
    'of Shlisselburg':              ['Шлиссельбургский', 'de Șlisselburg', 'Σλίσελμπουργκ', 'шлиселбуршки'],
    'of Sinope':                    ['Синопский', 'de Sinope', 'Σινώπης', 'синопски'],
    'of Sirmium':                   ['Сирмийский', 'de Sirmium', 'Σιρμίου', 'сремски'],
    'of Skepsis in Mysia':          ['Скепсийский в Мисии', 'de Skepsis în Misia', 'Σκήψεως Μυσίας', 'скепсијски у Мизији'],
    'of Solovki':                   ['Соловецкий', 'de la Solovki', 'Σολόβκι', 'соловецки'],
    'of Starodub':                  ['Стародубский', 'de Starodub', 'Σταρόντουμπ', 'стародупски'],
    'of Tamasos':                   ['Тамасский', 'de Tamasos', 'Ταμασού', 'тамаски'],
    'of Tarsus':                    ['Тарсийский', 'de Tars', 'Ταρσού', 'тарски'],
    'of Tetritskaro':               ['Тетрицкаройский', 'de Tetritskaro', 'Τετριτσκαρό', 'тетрицкаројски'],
    'of Thessalonica':              ['Фессалоникийский', 'de Tesalonic', 'Θεσσαλονίκης', 'солунски'],
    'of Timișoara':                 ['Тимишоарский', 'al Timișoarei', 'Τιμισοάρας', 'темишварски'],
    'of Tobolsk':                   ['Тобольский', 'de Tobolsk', 'Τομπόλσκ', 'тоболски'],
    'of Trebia':                    ['Требийский', 'de Trebia', 'Τρεβίας', 'требијски'],
    'of Trimythous':                ['Тримифунтский', 'de Trimitunda', 'Τριμυθούντος', 'тримитунтски'],
    'of Velikiye Luki':             ['Великолукский', 'de Velikie Luki', 'Βελίκιγιε Λούκι', 'великолуцки'],
    'of Verny':                     ['Верненский', 'de Vernîi', 'Βέρνι', 'верненски'],
    'of Voronezh':                  ['Воронежский', 'de Voronej', 'Βορονέζ', 'воронешки'],
    'of Vratsa':                    ['Врачанский', 'de Vrața', 'Βράτσας', 'врачански'],
    'of Vyazma':                    ['Вяземский', 'de Viazma', 'Βιάζμα', 'вјаземски'],
    'of Vyazniki':                  ['Вязниковский', 'de Viazniki', 'Βιάζνικι', 'вјазниковски'],
    'of Wallachia':                 ['Валашский', 'al Țării Românești', 'Βλαχίας', 'влашки'],
    'of Yaroslavl':                 ['Ярославский', 'de Iaroslavl', 'Γιαροσλάβλ', 'јарославски'],
    'of Zaraysk':                   ['Зарайский', 'de Zaraisk', 'Ζαράισκ', 'зарајски'],
    'of Zela':                      ['Зильский', 'de Zela', 'Ζήλων', 'зилски'],
    'of Zilantov':                  ['Зилантовский', 'de la Zilantov', 'Ζιλάντοφ', 'зилантовски'],
    'of the East Saxons':           ['восточных саксов', 'al saxonilor de răsărit', 'των Ανατολικών Σαξόνων', 'источних Саса'],
    'of the Kyiv Caves':            ['Киево-Печерский', 'de la Peșterile Kievului', 'των Σπηλαίων του Κιέβου', 'кијевопечерски'],
    'of the Seventy':               ['от семидесяти', 'din cei Șaptezeci', 'εκ των Εβδομήκοντα', 'из Седамдесеторице'],
    'of the St Simeon Monastery':   ['монастыря святого Симеона', 'al Mănăstirii Sfântul Simeon', 'της Μονής Αγίου Συμεών', 'манастира светог Симеона'],
    'of monasticism':               ['монашества', 'al monahismului', 'του μοναχισμού', 'монаштва'],
}

# Phrases that are not "<rank> of <place>" at all, written out whole. Every one
# of these is an epithet a church's own attestation carries.
WHOLE = {
    'the Great':          ['Великий', 'cel Mare', 'ο Μέγας', 'Велики'],
    'the Wonderworker':   ['Чудотворец', 'Făcătorul de minuni', 'ο Θαυματουργός', 'Чудотворац'],
    'the Healer':         ['Целитель', 'Tămăduitorul', 'ο Ιαματικός', 'Исцелитељ'],
    'the Much-suffering': ['Многострадальный', 'Multpătimitorul', 'ο Πολύαθλος', 'Многострадални'],
    'the first hermit':   ['первый отшельник', 'primul pustnic', 'ο πρώτος ερημίτης', 'први пустињак'],
    'Father of monasticism': ['Отец монашества', 'Părintele monahismului', 'Πατέρας του μοναχισμού', 'Отац монаштва'],
    # A bare "of X" is a title standing on its own, with the rank already in
    # the name above it.
    'of Lycia':           ['Ликийский', 'al Liciei', 'Λυκίας', 'ликијски'],
    'of the Kyiv Caves':  ['Киево-Печерский', 'de la Peșterile Kievului', 'των Σπηλαίων του Κιέβου', 'кијевопечерски'],
}


def js(s):
    bs = chr(92)
    q = chr(39)
    return q + s.replace(bs, bs + bs).replace(q, bs + q) + q


def lower_first(s):
    return s[:1].lower() + s[1:] if s else s


def part(text, i):
    """One comma-free phrase, in language `i`, or None if nothing knows it."""
    if text in WHOLE:
        return WHOLE[text][i]
    m = re.match(r'^(.+?) ((?:of|in) .+)$', text)
    if m and m.group(1) in RANK and m.group(2) in PLACE:
        return RANK[m.group(1)][i] + ' ' + PLACE[m.group(2)][i]
    if text in RANK:
        return RANK[text][i]
    return None


def phrase(text, i):
    out = []
    for k, p in enumerate(text.split(', ')):
        got = part(p, i)
        if got is None:
            return None
        out.append(got if k == 0 else lower_first(got))
    return ', '.join(out)


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    cards = json.load(open('data/manifest.json', encoding='utf-8'))
    wanted = set()
    for c in cards:
        if c.get('office'):
            wanted.add(c['office'])
        for a in c.get('attestations', []) or []:
            for t in a.get('titles', []) or []:
                wanted.add(t)
    missing = collections.defaultdict(list)
    blocks = {}
    for i, lang in enumerate(LANGS):
        rows = []
        for text in sorted(wanted):
            got = phrase(text, i)
            if got is None:
                missing[lang].append(text)
                continue
            rows.append("    %s: %s," % (js(text), js(got)))
        blocks[lang] = '\n'.join(rows)
    for lang in LANGS:
        io.open('scratchpad/offices-%s.txt' % lang, 'w', encoding='utf-8', newline='\n').write(blocks[lang])
    print('%d phrases' % len(wanted))
    for lang in LANGS:
        print(lang, 'missing', len(missing[lang]), missing[lang][:10])


main()
