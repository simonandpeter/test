# -*- coding: utf-8 -*-
"""Build .tmp/ru-drafts/up-12-13.json -- the ten russian rows of the Julian 13 December."""
import io, json

URL = 'https://days.pravoslavie.ru/Days/20261213.html'
READ = '13 October 2026'
SRC = 'Православный церковный календарь, Сретенский монастырь (days.pravoslavie.ru), 13 декабря ст. ст. — '
CLAUSE = ('; and the Православный церковный календарь of the Сретенский monastery for 13 декабря '
          'ст. ст. — [the day](%s), read %s' % (URL, READ))

L5 = 'Мчч. Евстратия, Авксентия, Евгения, Мардария и Ореста (284-305).'
LLUC = 'Мц. Лукии (304).'
LARS = 'Прп. Арсения Латрийского (VIII-X).'
LMAR = 'Прп. Мардария, затворника Печерского (XIII).'
LDOS = 'Свт. Досифея, митр. Молдавского (1693) (Рум.).'
LGER = 'Преставление прп. Германа Аляскинского (1836).'

NOTE_DAY = ('The same menologion day this folder’s other rows already carry, so there is no '
            'second day and none is noted. ')
NOT_READ = ('The reading this calendar links behind the entry was NOT opened: this folder’s '
            'life is already written out of its other sources, and that is said here rather than '
            'claimed otherwise. ')


def hymn(kind, tone, text, title, en, extra=''):
    return {"church": "russian", "kind": kind, "lang": "cu", "tone": tone, "text": text,
            "source": {"text": SRC + '«%s», %s.%s' % (title, tone, (' ' + extra) if extra else ''),
                       "url": URL, "year": 2026},
            "english": {"text": en, "rendered": "site"}}


def row(line, note):
    return {"church": "russian", "status": "venerated",
            "feast": {"day": 13, "month": 12, "calendar": "julian", "note": note},
            "source": {"text": SRC + '«%s»' % line, "url": URL, "year": 2026}}


def name(form, note):
    return [{"form": form, "lang": "ru", "note": note}]


ups = []

# ---------------------------------------------------------------- the five of Sebaste
TROP5 = hymn(
    'troparion', 'глас 4',
    'Мученик всечестных светлость,/ пяточисленных страстотерпцев воспоем,/ славу земных '
    'презревших,/ солнца светлаго Евстратия,/ премудраго витию со страдальцы,/ на огнь и муки '
    'дерзнувших за всех Царя Христа/ и от Престола Того славы почестьми венцев обдаренных./ Тех '
    'молитвами, Христе Боже,// спаси души наша.',
    'Тропарь мучеников',
    'Let us hymn the brightness of the all-honoured martyrs, the five passion-bearers who despised '
    'the glory of earthly things — Eustratius the shining sun, the all-wise orator, with his fellow '
    'sufferers — who dared the fire and the torments for Christ the King of all, and were endowed '
    'from His throne of glory with the honour of crowns. By their prayers, O Christ God, save our '
    'souls.',
    extra='The title names no one and the text is addressed to the five together — «пяточисленных '
          'страстотерпцев», the five-in-number passion-bearers — so it is written on all five of '
          'their folders. The two kontakia the day page prints beside it both close on the name of '
          'Eustratius and are written on his folder alone.')

DATES5 = {"death": {"earliest": 284, "latest": 305, "display": "284–305", "basis": "traditional",
                    "note": "The folder held no date of any kind and none of its other three "
                            "calendars gives one. days.pravoslavie.ru closes the line for 13 "
                            "декабря ст. ст. with «(284-305)», which is the reign of Diocletian "
                            "and Maximian and not a year of death, so it is recorded as a "
                            "traditional interval and not as attested."}}

FIVE = [
    ('eustratius-of-arabraca', 'Евстратий Севастийский', 'военачальник, мч.', None),
    ('auxentius-companion-of-eustratius', 'Авксентий Севастийский, Аравийский',
     'пресвитер, сщмч.', 'Presbyter'),
    ('eugene-of-satala', 'Евгений Севастийский', 'мч.', None),
    ('mardarius', 'Мардарий Севастийский', 'мч.', None),
    ('orestes-companion-of-eustratius', 'Орест Севастийский', 'мч.', None),
]
for slug, form, stripped, office in FIVE:
    u = {"slug": slug, "church": "russian",
         "row": row(L5, NOTE_DAY +
                    'The line is the joint feast of the five and all five folders already stood in '
                    'the corpus, so this day is five rows and no arrival. ' + NOT_READ +
                    'THE LINE’S «(284-305)» IS WRITTEN AS A DATE WHERE THE FOLDER HAD NONE, '
                    'as a traditional interval and not a year of death. The day page’s '
                    'troparion of the martyrs is written on all five; its two kontakia name '
                    'Eustratius and are written on his folder only.'),
         "names": name(form,
                       'The calendar’s own name page for him is «%s, %s»; the rank is '
                       'stripped and the epithets kept, the day line itself declining the bare '
                       'forename only. `fk.mjs` on the stored string returns NONE.' % (form, stripped)),
         "dates": DATES5,
         "hymns_add": [TROP5],
         "life_para":
             'The Russian calendar keeps the five together on 13 декабря ст. ст., the same '
             'menologion day as the other calendars here, and its line is their joint feast: '
             '«Мчч. Евстратия, Авксентия, Евгения, Мардария и Ореста (284-305).» — the martyrs '
             'Eustratius, Auxentius, Eugene, Mardarius and Orestes, with the reign of Diocletian '
             'and Maximian in place of a year of death. That interval is the only dating any of '
             'this folder’s four calendars has given.\n\n'
             'The day page carries a troparion of the martyrs addressed to the five together, and '
             'it is written on each of their five folders; the two kontakia printed beside it both '
             'close on the name of the first of them and belong to his folder alone. The readings '
             'this calendar links behind the entry were not opened, the life above being already '
             'written out of the other sources.',
         "source_clause": CLAUSE}
    if office:
        u["office"] = office
    ups.append(u)

ups[0]["hymns_add"] = [
    TROP5,
    hymn('kontakion', 'глас 3',
         'Витийствуя пред беззаконнующими Божественная,/ биения претерпел еси мужественнейшим '
         'сердцем,/ облистал еси богознаменьми, пречудне,/ угасил еси возвышенный прелести '
         'пламень,/ сего ради тя чествуем, всеблаженне,// мучениче Христов Евстратие.',
         'Кондак мучеников',
         'Proclaiming divine things as an orator before the lawless, thou didst endure the '
         'beatings with a most manly heart; thou didst shine with signs from God, O most wondrous '
         'one, and didst quench the towering flame of delusion. Therefore do we honour thee, O '
         'all-blessed Eustratius, martyr of Christ.',
         extra='The title says «мучеников», of the martyrs, but the text closes on his own name, so '
               'it is written on this folder and not on the other four.'),
    hymn('kontakion', 'глас 2',
         'Светильник явился еси светлейший/ во тьме неведения седящим, страстотерпче:/ верою бо, '
         'яко копием, обложився,/ врагов шатания не убоялся еси, Евстратие,// риторов сый '
         'благоязычнейший.',
         'Кондак мучеников',
         'Thou didst appear as a most shining lamp to those who sat in the darkness of ignorance, '
         'O passion-bearer; for being armed with faith as with a spear, thou didst not fear the '
         'ragings of the enemy, O Eustratius, most eloquent of orators.',
         extra='The second kontakion the page prints under the same title, and it too closes on '
               'his own name, so it is written on this folder and not on the other four.'),
]

# ---------------------------------------------------------------- Lucia
ups.append({
    "slug": "lucia-of-syracuse", "church": "russian",
    "row": row(LLUC, NOTE_DAY +
               'The line gives the year «(304)», which this folder already holds as its death '
               'year, so no date is touched. ' + NOT_READ +
               'The day page prints no hymn under her name, so none is added: its hymn blocks are '
               'for the five martyrs, for Arcadius of Novotorzhsk, for Arsenius of Latros, for '
               'Herman of Alaska and for Mardarius the Recluse, and the reader counted them.'),
    "names": name('Лукия Сиракузская',
                  'The calendar’s own name page for her is «Лукия Сиракузская, дева, мц.»; the '
                  'rank and the word «дева», virgin, which this folder carries as a type, are '
                  'stripped and the epithet kept. The day line itself gives «Мц. Лукии» and no '
                  'epithet at all. `fk.mjs` on the stored string returns NONE.'),
    "life_para":
        'The Russian calendar keeps her on 13 декабря ст. ст., the same menologion day as the '
        'other calendars here, and its line is «Мц. Лукии (304).» — the martyr Lucia, 304 — with '
        'the year this folder already records. Its own name page adds the epithet the line leaves '
        'out, «Лукия Сиракузская», Lucia of Syracuse. The day page carries hymns for five of the '
        'memories it heads and none under her name, and the readings it links were not opened.',
    "source_clause": CLAUSE})

# ---------------------------------------------------------------- Arsenius of Latros
ups.append({
    "slug": "arsenios-of-latros", "church": "russian",
    "row": row(LARS, NOTE_DAY +
               'THE LINE’S CENTURY DISAGREES WITH THE FOLDER’S AND THE FOLDER’S IS '
               'KEPT. days.pravoslavie.ru closes the line «(VIII-X)», the eighth to the tenth '
               'century; the folder’s `floruit` is saint.gr’s «μεταξύ του 8ου και 9ου '
               'αιώνα», the eighth to the ninth, recorded there as an inference and cited as one. '
               'The Russian reading is wider and no narrower, so it replaces nothing and is '
               'recorded in the life instead. The office `Abbot` IS NEW ON THIS FOLDER and is the '
               'name page’s own word «игумен». ' + NOT_READ +
               'The day page’s two hymns under his name are both commons of a venerable '
               'father, not propers, and are copied whole as `BRIEF.md` §4 directs.'),
    "office": "Abbot",
    "names": name('Арсений Латрийский',
                  'The calendar’s own name page for him is «Арсений Латрийский, игумен»; the '
                  'rank is stripped, the epithet kept, and the rank itself written into `office`. '
                  '`fk.mjs` on the stored string returns NONE.'),
    "hymns_add": [
        hymn('troparion', 'глас 8',
             'В тебе, отче, известно спасеся еже по образу,/ приим бо крест, последовал еси '
             'Христу,/ и дея, учил еси презирати убо плоть, преходит бо,/ прилежати же о души, '
             'вещи безсмертней./ Темже и со Ангелы срадуется, преподобне Арсение, дух твой.',
             'Тропарь преподобного Арсения, иже в Латре',
             'In thee, O father, that which is according to the image was surely saved; for taking '
             'up the cross thou didst follow Christ, and by thy deeds thou didst teach us to '
             'despise the flesh, since it passeth away, and to care for the soul, a thing '
             'immortal. Therefore doth thy spirit rejoice together with the angels, O venerable '
             'Arsenius.',
             extra='THIS IS A COMMON, the troparion of a venerable father with his name set into '
                   'it, and it is copied whole as the page has it because the page serves it under '
                   'his name.'),
        hymn('kontakion', 'глас 8',
             'Иже на земли вся оставль и Христовым стопам последовал еси тепле,/ Того, славне, на '
             'рамо свое честный крест взем,/ умертвил еси труды постническими телесная желания, '
             'всеблаженне./ Тем зовем ти:/ радуйся, отче Арсение.',
             'Кондак преподобного Арсения, иже в Латре',
             'Having left all things upon earth, thou didst follow fervently in the footsteps of '
             'Christ, and taking His precious cross upon thy shoulder, O glorious one, thou didst '
             'put to death the desires of the body by the labours of fasting, O all-blessed one. '
             'Therefore we cry to thee: rejoice, O father Arsenius.',
             extra='A COMMON likewise, the kontakion of a venerable father with his name set into '
                   'it, served under his name and copied whole.'),
    ],
    "life_para":
        'The Russian calendar keeps him on 13 декабря ст. ст., the same menologion day as the Greek '
        'calendar here, and its line is «Прп. Арсения Латрийского (VIII-X).» — the venerable '
        'Arsenius of Latros, the eighth to the tenth century. That interval is wider than the '
        'eighth-to-ninth saint.gr infers above, and it is recorded here rather than put in place of '
        'it. The calendar’s own name page calls him «игумен», abbot, which the Greek entry '
        'does not.\n\n'
        'The day page carries a troparion and a kontakion under his name, and both are commons — '
        'the service of a venerable father with his name set into it, which is what this calendar '
        'serves for a monk who has no proper of his own. They are copied whole, as they stand on '
        'the page. The readings the entry links were not opened; the life above is saint.gr’s.',
    "source_clause": CLAUSE})

# ---------------------------------------------------------------- Mardarius the Recluse
ups.append({
    "slug": "mardarius-the-recluse", "church": "russian",
    "row": row(LMAR, NOTE_DAY +
               'The line closes «(XIII)», the thirteenth century, which is the `floruit` this '
               'folder already holds from saint.gr, so no date is touched. ' + NOT_READ +
               'The day page’s two hymns under his name are propers — each names him and the '
               'Far Caves — and are written here.'),
    "names": name('Мардарий Печерский',
                  'The calendar’s own name page for him is «Мардарий Печерский, затворник»; '
                  'the rank «затворник», recluse, is stripped, which is the word this folder’s '
                  'display name already carries in English, and the epithet «Печерский», of the '
                  'Caves, is kept. `fk.mjs` on the stored string returns NONE.'),
    "hymns_add": [
        hymn('troparion', 'глас 4',
             'Бывый, блаженне Мардарие,/ нестяжатель Христа ради,/ и Того за многая твоя '
             'благодеяния/ в сердце твое вселивый,/ молися о нас, поющих тя.',
             'Тропарь преподобного Мардария, затворника Печерского, в Дальних пещерах',
             'O blessed Mardarius, who wast without possessions for Christ’s sake and who, '
             'for thy many good deeds, didst make Him to dwell within thy heart: pray for us who '
             'sing thy praises.'),
        hymn('kontakion', 'глас 2',
             'Вышних ища, нижних не стяжал еси,/ и колесницу огненну к Небеси, нестяжание, себе '
             'поставль,/ со Ангелы жити сподобился еси./ Мардарие славне,/ с нимиже Христа Бога '
             'моли/ непрестанно о всех нас.',
             'Кондак преподобного Мардария, затворника Печерского, в Дальних пещерах',
             'Seeking the things that are above, thou didst possess nothing below, and setting '
             'poverty before thyself as a chariot of fire to heaven, thou wast counted worthy to '
             'dwell with the angels. O glorious Mardarius, together with them pray thou unceasingly '
             'to Christ God for us all.'),
    ],
    "life_para":
        'The Russian calendar keeps him on 13 декабря ст. ст., the same menologion day as the Greek '
        'calendar here, and its line is «Прп. Мардария, затворника Печерского (XIII).» — the '
        'venerable Mardarius, recluse of the Caves, the thirteenth century, which is the century '
        'saint.gr gives above. The day page carries a troparion and a kontakion under his name, '
        'both of them proper to him: each names him, and each titles him of the Far Caves of the '
        'Lavra. They are written here. The readings the entry links were not opened.',
    "source_clause": CLAUSE})

# ---------------------------------------------------------------- Dosoftei
ups.append({
    "slug": "dosoftei-of-moldavia", "church": "russian",
    "row": row(LDOS, NOTE_DAY +
               'The line closes «(1693) (Рум.)», the year this folder already records and a mark '
               'saying the memory is the Romanian church’s, which the folder’s Romanian '
               'row already carries. ' + NOT_READ +
               '**NO RUSSIAN NAME FORM WAS STORED AND THAT IS DELIBERATE.** The name page gives '
               '«Святитель Досифей, митрополит Молдавский», and stripping both rank words leaves '
               '«Досифей», a bare forename which `fk.mjs` shows already folds onto '
               '`dositheia-the-recluse-of-kyiv` and `dositheus-of-verkhny-ostrov`; the epithet '
               '«Молдавский» stands only inside the rank phrase «митрополит Молдавский», so a form '
               'pairing the two would be a reconstruction and not a reading. Withholding it is the '
               'answer the Russian block took for the two chief apostles on 29 июня. The day page '
               'prints no hymn under his name.'),
    "life_para":
        'The Russian calendar keeps him on 13 декабря ст. ст., the same menologion day as the '
        'Romanian calendar here, and its line is «Свт. Досифея, митр. Молдавского (1693) (Рум.).» — '
        'the hierarch Dositheus, metropolitan of Moldavia, 1693, with «(Рум.)» marking the memory '
        'as the Romanian church’s. The year is the one recorded above. No Russian form of his '
        'name is stored: what the calendar prints is rank and see, and the forename left when those '
        'are stripped is shared with other saints in this corpus. The day page carries no hymn '
        'under his name, and the readings it links were not opened.',
    "source_clause": CLAUSE})

# ---------------------------------------------------------------- Herman of Alaska
GER = 'Тропарь преподобного Германа Аляскинского'
ups.append({
    "slug": "herman-of-alaska", "church": "russian",
    "row": row(LGER,
               'A DAY OF THIS FOLDER’S OWN, AND NOT THE DAY ITS OTHER ROWS CARRY. The '
               'Romanian row keeps him on 15 noiembrie and the Greek on 9 Αυγούστου; the Russian '
               'calendar keeps his repose, «Преставление», on 13 декабря ст. ст., and that is the '
               'day this row records because it is the day the day page listed him. The two other '
               'days are not touched and nothing is moved. ' + NOT_READ +
               'The day page prints EIGHT hymn blocks under his name and SIX ARE WRITTEN HERE: two '
               'of the eight are second redactions of blocks already taken — an «Ин тропарь» '
               'differing from the one before it in «имея»/«имеяй» and in the word order of one '
               'clause, and an «Ин кондак» printing the «Валаама» kontakion once as running text '
               'and once broken at the slashes. The slashed redaction is the one written, matching '
               'every other hymn in this corpus; neither pair is two hymns and recording both '
               'would say it was.'),
    "names": name('Герман Аляскинский',
                  'The calendar’s own name page for him is «Преподобный Герман Аляскинский»; '
                  'the rank is stripped and the epithet kept. `fk.mjs` on the stored string returns '
                  'NONE.'),
    "hymns_add": [
        hymn('troparion', 'глас 7',
             'Звездо пресветлая Церкве Христовы,/ на севере просиявшая,/ вся к Царствию Небесному '
             'путеводящая,/ учителю и апостоле истинныя веры,/ предстателю и заступниче гонимых,/ '
             'украшение изящное Святыя Церкве во Америце,/ преподобне отче Германе Аляскинский,/ '
             'молися ко Господу, Спасу нашему,/ спастися душам нашим.',
             GER,
             'O most radiant star of the Church of Christ, which shone forth in the north and '
             'guideth all unto the heavenly kingdom; teacher and apostle of the true faith, '
             'intercessor and defender of the persecuted, excellent adornment of the holy Church in '
             'America, venerable father Herman of Alaska: pray to the Lord our Saviour that our '
             'souls may be saved.'),
        hymn('troparion', 'глас 1',
             'Лозу Православия принесл еси в Америку из России благочестивый/ и, удобрив корень '
             'постническими трудами/ и напоив обильне молитвенными слезами,/ плоды принесл еси — '
             'виноград возлюбленный,/ Германе преблаженне отче наш./ Темже и Бог тя прослави, яко '
             'апостола преподобнаго,/ нетлением мощей и благодатию чудес,/ от них же почерпающе '
             'благодеяния, восхваляем тя:/ слава Давшему ти крепость,/ слава Венчавшему тя, слава '
             'Даровавшему тя Америце светило Православия.',
             GER,
             'Thou didst bring the vine of Orthodoxy from Russia to America, O pious one, and '
             'having dressed its root with the labours of fasting and watered it abundantly with '
             'tears of prayer, thou didst bring forth fruit, a beloved vineyard, O most blessed '
             'Herman our father. Therefore God glorified thee as a venerable apostle by the '
             'incorruption of thy relics and the grace of wonders; and drawing good things from '
             'them we praise thee: glory to Him who gave thee strength, glory to Him who crowned '
             'thee, glory to Him who granted thee to America as a luminary of Orthodoxy.',
             extra='The second of the three troparia the page prints, under the same title as the '
                   'first.'),
        hymn('troparion', 'глас 3',
             'Преподобне отче наш Германе,/ первый светильниче, в земли нашей просиявый,/ приносим '
             'вси тебе похвалы сия,/ ты же, яко имея дерзновение ко Господу,/ буди нам заступник и '
             'утешитель/ и Церкве нашея покровитель дивный,/ да вси со умилением зовем ти:/ '
             'радуйся, отче наш Германе, Аляски и всея Америки преславный чудотворче.',
             'Ин тропарь преподобного Германа Аляскинского, поемый во Америце',
             'O venerable father Herman, first lamp to shine forth in our land, we all bring thee '
             'these praises; and do thou, having boldness before the Lord, be our defender and '
             'consoler and the wondrous protector of our Church, that we all may cry to thee with '
             'compunction: rejoice, O our father Herman, most glorious wonderworker of Alaska and '
             'of all America.',
             extra='The title says it is the one sung in America, «поемый во Америце». The page '
                   'prints a second redaction of it immediately after, differing in «имея»/«имеяй» '
                   'and in the order of one clause; that is the same hymn and is not recorded '
                   'twice.'),
        hymn('kontakion', 'глас 3',
             'Свет вечный Христа Спаса нашего/ тя на путь евангельский во Америку настави,/ '
             'возвестити весть о мире евангельскую./ Днесь Престолу Славы предстоя,/ молися о '
             'стране твоей и людех ея,/ о мире всего мира/ и спасении душ наших.',
             'Кондак преподобного Германа Аляскинского',
             'The eternal light of Christ our Saviour guided thee upon the path of the gospel to '
             'America, to proclaim the gospel tidings of peace. Standing today before the throne of '
             'glory, pray for thy land and for its people, for the peace of the whole world and for '
             'the salvation of our souls.'),
        hymn('kontakion', 'глас 8',
             'Взбранному Воеводе своинствовався,/ в брань вступил еси на духа злобы в поле '
             'преподобия и апостольства./ И, пожав победы обоюдныя,/ воздвизаеши нас вопити тебе:/ '
             'радуйся, святе Германе, апостоле преподобный.',
             'Кондак преподобного Германа Аляскинского',
             'Having gone to war under the Champion Leader, thou didst enter the battle against the '
             'spirit of malice in the field of monastic struggle and of apostleship; and having '
             'reaped the victory in both, thou dost move us to cry to thee: rejoice, O holy Herman, '
             'venerable apostle.',
             extra='The second kontakion the page prints under the same title as the first.'),
        hymn('kontakion', 'глас 8',
             'Валаама пострижник,/ честный возлюбленник Божией Матери бывый,/ ревнитель подвигов '
             'древних подвижников новый,/ молитву, яко копие и щит, приемый,/ страшен демоном и '
             'тьме язычестей ставый,/ Германе преподобне, моли Христа Бога спасти души наша.',
             'Ин кондак преподобного Германа Аляскинского',
             'O tonsured monk of Valaam, who wast the honoured beloved of the Mother of God, new '
             'emulator of the struggles of the ancient ascetics, who tookest prayer as spear and '
             'shield and becamest terrible to the demons and to the darkness of paganism: O '
             'venerable Herman, pray to Christ God that our souls may be saved.',
             extra='The page prints this kontakion twice, once as running prose and once broken at '
                   'the slashes. The broken redaction is the one written, matching every other hymn '
                   'in this corpus; the two are one hymn and the prose one is not recorded '
                   'separately.'),
    ],
    "life_para":
        'The Russian calendar keeps him on a day of his own: «Преставление прп. Германа '
        'Аляскинского (1836).» — the repose of the venerable Herman of Alaska, 1836 — on 13 '
        'декабря ст. ст., where the Romanian calendar keeps him on 15 noiembrie and the Greek on 9 '
        'Αυγούστου. The year is the one recorded above. Neither of the other two days is altered '
        'by this; all three stand as each calendar prints them.\n\n'
        'The day page carries more hymnody under his name than under any other memory of the day — '
        'eight blocks, of which six are distinct: three troparia, one of them titled as the one '
        'sung in America, and three kontakia, the last of them the Valaam kontakion. Two of the '
        'eight are second redactions, differing by a word or by line breaks alone, and are not '
        'recorded twice. All six are written here with English renderings made for this corpus.',
    "source_clause": CLAUSE})

io.open('.tmp/ru-drafts/up-12-13.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(ups, ensure_ascii=False, indent=2) + '\n')
print('wrote', len(ups), 'upgrades;', sum(len(u.get('hymns_add', [])) for u in ups), 'hymns')
