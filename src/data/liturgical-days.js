/**
 * What each church's own calendar printed for a day, read off that calendar
 * and recorded here by hand (author's instruction, 2026-08-22): the scripture
 * readings and the fasting note, per civil date, per church. The lectionary
 * itself is not yet in the build — this is 23 August to 19 September 2026 (the
 * week recorded by hand on 22 August, and the three weeks that followed,
 * generated from the same four calendars on 23 August; Amendment 31), and the
 * Daily page prints a day's readings only where they are recorded. The
 * paschal-cycle title, the tone and whether a day is a fast are computed in
 * lib/liturgy.js and checked against these same pages in its tests.
 *
 * References are normalised to English book names so they can be linked (the
 * Greek pages cite them by letter-numbers); where a source's citation looks
 * like a misprint it is kept and said so, never silently corrected. Where a
 * Russian day prints several sets of pericopes the set's own label is kept in
 * parentheses ("Epistle (Ряд)", "Gospel (Богородицы)") in the calendar's words.
 * saint.gr publishes a day's readings about two weeks ahead: for 7–19 September
 * the Greek entry carries `readings: []` and a `note` saying so — an absence,
 * never an invention; its fasting mark and the feast's hymns are still there.
 *
 * Sources, read 2026-08-22 (23–29 August) and 2026-08-23 (30 August – 19 September):
 *   russian  — days.pravoslavie.ru/Days/2026MMDD.html (Julian date in the path)
 *   romanian — doxologia.ro/DD-august, doxologia.ro/DD-septembrie
 *   greek    — saint.gr/MM/DD/index.aspx
 *   serbian  — pravoslavno.rs/index.php?q=citanja&datum=YYYY-MM-DD (readings, the Prologue), ?tropar=MMDD (the day's troparion)
 */

const RU = (mmdd) => `https://days.pravoslavie.ru/Days/2026${mmdd}.html`;
const RO = (dd) => `https://doxologia.ro/${dd}-august`;
const GR = (dd) => `https://www.saint.gr/08/${dd}/index.aspx`;

const r = (label, ref) => ({ label, ref });

export const LITURGICAL_DAYS = {
  '2026-08-23': {
    russian: {
      readings: [r('Epistle', '1 Corinthians 15:1-11'), r('Gospel', 'Matthew 19:16-26')],
      fastingNote: 'Успенский пост; разрешается пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 10 августа ст. ст.', url: RU('0810') },
    },
    romanian: {
      readings: [r('Apostol', '1 Corinthians 15:1-11'), r('Evanghelie', 'Matthew 19:16-26')],
      title: 'Duminica a 12-a după Rusalii (Tânărul cel bogat)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 23 august — glas 3, voscr. 1', url: RO('23') },
    },
    greek: {
      // The Leavetaking of the Dormition: the feast's pericopes. saint.gr
      // prints the Gospel as "Κατα Λουκάν Α' 38-42 & ΙΑ' 27-28"; the feast's
      // reading is Luke 10:38-42; 11:27-28, and the letter is kept as found.
      readings: [r('Απόστολος', 'Philippians 2:5-11'), r('Ευαγγέλιο', 'Luke 10:38-42; 11:27-28')],
      title: 'Κυριακή ΙΒ΄ Ματθαίου — Απόδοσις της εορτής της Κοιμήσεως',
      fastingNote: null,
      source: { text: 'saint.gr, 23 Αυγούστου — Ἑωθινόν Ἦχος γ΄', url: GR('23') },
      // The feast's hymns, copied whole from saint.gr's page for the Leavetaking.
      hymns: [
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος α΄',
          text: 'Ἐν τὴ Γεννήσει τὴν παρθενίαν ἐφύλαξας, ἐν τὴ Κοιμήσει τὸν κόσμον οὐ κατέλιπες Θεοτόκε, Μετέστης πρὸς τὴν ζωήν, μήτηρ ὑπάρχουσα τῆς ζωῆς, καὶ ταὶς πρεσβείαις ταὶς σαὶς λυτρουμένη, ἐκ θανάτου τᾶς ψυχᾶς ἠμῶν.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr), Απόδοση εορτής κοιμήσεως Θεοτόκου', url: 'https://www.saint.gr/857/saint.aspx', year: 2026 },
          english: {
            text: 'In Birth-giving thou didst preserve thy virginity; in thy Falling-asleep thou hast not forsaken the world, O Birth-giver of God. Thou hast passed over into life, thou who art the Mother of Life, and through thine intercessions dost deliver our souls from death.',
            source: { text: 'Hapgood, Service Book of the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (1906), the Falling-Asleep of the Most Holy Birth-giver of God, p. 265', url: 'https://archive.org/details/cu31924029363128', year: 1906 },
          },
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος πλ. β΄', model: 'Αὐτόμελον',
          text: 'Τὴν ἐν πρεσβείαις ἀκοίμητον Θεοτόκον, καὶ προστασίαις ἀμετάθετον ἐλπίδα, τάφος καὶ νέκρωσις οὐκ ἐκράτησεν, ὡς γὰρ ζωῆς Μητέρα, πρὸς τὴν ζωὴν μετέστησεν, ὁ μήτραν οἰκήσας ἀειπάρθενον.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr), Απόδοση εορτής κοιμήσεως Θεοτόκου', url: 'https://www.saint.gr/857/saint.aspx', year: 2026 },
        },
      ],
    },
    serbian: {
      readings: [r('Апостол', '1 Corinthians 15:1-11'), r('Јеванђеље', 'Matthew 19:16-30')],
      title: 'Недеља 12. по Духовима',
      // The month calendar prints no fasting mark on this day.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 23.08.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-08-23' },
    },
  },
  '2026-08-24': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 8:7-15'), r('Gospel', 'Mark 3:6-12')],
      fastingNote: 'Успенский пост; сухоядение',
      source: { text: 'days.pravoslavie.ru, 11 августа ст. ст. — седмица 13-я, глас 3', url: RU('0811') },
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 8:7-15'), r('Evanghelie', 'Mark 3:6-12')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 24 august', url: RO('24') },
    },
    greek: {
      readings: [r('Απόστολος', '2 Corinthians 8:7-15'), r('Ευαγγέλιο', 'Mark 3:6-12')],
      fastingNote: null,
      source: { text: 'saint.gr, 24 Αυγούστου', url: GR('24') },
    },
    serbian: {
      readings: [r('Апостол', '2 Corinthians 8:7-15'), r('Јеванђеље', 'Mark 3:6-12')],
      title: 'Понедељак 13. по Духовима',
      fastingNote: 'пост (as marked on the month calendar)',
      source: { text: 'Православни подсетник (pravoslavno.rs), 24.08.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-08-24' },
    },
  },
  '2026-08-25': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 8:16-9:5'), r('Gospel', 'Mark 3:13-19')],
      fastingNote: 'Успенский пост; горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 12 августа ст. ст.', url: RU('0812') },
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 8:16-24; 9:1-5'), r('Evanghelie', 'Mark 3:13-21')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 25 august', url: RO('25') },
    },
    greek: {
      // The Apostle Titus: his own readings.
      readings: [r('Απόστολος', 'Titus 1:1-5; 2:15; 3:1-2, 12-15'), r('Ευαγγέλιο', 'Matthew 5:14-19')],
      fastingNote: null,
      source: { text: 'saint.gr, 25 Αυγούστου', url: GR('25') },
    },
    serbian: {
      readings: [r('Апостол', '2 Corinthians 8:16-24; 9:1-5'), r('Јеванђеље', 'Mark 3:13-19')],
      title: 'Уторак 13. по Духовима',
      fastingNote: 'пост (as marked on the month calendar)',
      source: { text: 'Православни подсетник (pravoslavno.rs), 25.08.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-08-25' },
    },
  },
  '2026-08-26': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 9:12-10:7'), r('Gospel', 'Mark 3:20-27')],
      fastingNote: 'Успенский пост; сухоядение',
      source: { text: 'days.pravoslavie.ru, 13 августа ст. ст.', url: RU('0813') },
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 9:12-15; 10:1-7'), r('Evanghelie', 'Mark 3:20-27')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 26 august', url: RO('26') },
    },
    greek: {
      readings: [r('Απόστολος', '2 Corinthians 9:12-15; 10:1-7'), r('Ευαγγέλιο', 'Mark 3:20-27')],
      fastingNote: 'Νηστεία',
      source: { text: 'saint.gr, 26 Αυγούστου', url: GR('26') },
    },
    serbian: {
      readings: [r('Апостол', '2 Corinthians 9:12-15; 10:1-7'), r('Јеванђеље', 'Mark 3:20-27')],
      title: 'Среда 13. по Духовима — Оданије Преображења',
      fastingNote: 'пост (as marked on the month calendar)',
      source: { text: 'Православни подсетник (pravoslavno.rs), 26.08.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-08-26' },
    },
  },
  '2026-08-27': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 10:7-18'), r('Gospel', 'Mark 3:28-35')],
      fastingNote: 'Успенский пост',
      source: { text: 'days.pravoslavie.ru, 14 августа ст. ст.', url: RU('0814') },
      // The forefeast of the Dormition: the day's own hymns.
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Людие, предыграйте,/ руками плещуще верно,/ и любовию соберитеся,/ днесь радующеся/ и светло восклицающе вси веселием:/ Божия бо Мати имать от земных к Вышним прейти славно,// Юже песньми присно яко Богородицу славим.',
          source: { text: 'days.pravoslavie.ru, 14 августа ст. ст. — Тропарь предпразднства', url: RU('0814'), year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 4',
          text: 'В славней памяти Твоей/ вселенная, невещественным Духом испещрена,/ умно с веселием зовет Тебе:/ радуйся, Дево,// христиан похвало.',
          source: { text: 'days.pravoslavie.ru, 14 августа ст. ст. — Кондак предпразднства', url: RU('0814'), year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 10:7-18'), r('Evanghelie', 'Mark 3:28-35')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 27 august', url: RO('27') },
    },
    greek: {
      readings: [r('Απόστολος', '2 Corinthians 10:7-18'), r('Ευαγγέλιο', 'Mark 3:28-35')],
      fastingNote: null,
      source: { text: 'saint.gr, 27 Αυγούστου', url: GR('27') },
    },
    serbian: {
      readings: [r('Апостол', '2 Corinthians 10:7-18'), r('Јеванђеље', 'Mark 3:28-35')],
      title: 'Четвртак 13. по Духовима — Претпразништво Успенија',
      fastingNote: 'пост (as marked on the month calendar)',
      source: { text: 'Православни подсетник (pravoslavno.rs), 27.08.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-08-27' },
    },
  },
  '2026-08-28': {
    russian: {
      // The Dormition of the Theotokos, 15 August in the Julian calendar.
      readings: [r('Epistle', 'Philippians 2:5-11'), r('Gospel', 'Luke 10:38-42; 11:27-28')],
      fastingNote: 'Успение Пресвятой Богородицы; на трапезе разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 15 августа ст. ст.', url: RU('0815') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 1',
          text: 'В рождестве девство сохранила еси,/ во успении мира не оставила еси, Богородице,/ преставилася еси к животу,/ Мати сущи Живота,// и молитвами Твоими избавляеши от смерти души наша.',
          source: { text: 'days.pravoslavie.ru, 15 августа ст. ст. — Тропарь праздника Успения', url: RU('0815'), year: 2026 },
          english: {
            text: 'In Birth-giving thou didst preserve thy virginity; in thy Falling-asleep thou hast not forsaken the world, O Birth-giver of God. Thou hast passed over into life, thou who art the Mother of Life, and through thine intercessions dost deliver our souls from death.',
            source: { text: 'Hapgood, Service Book of the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (1906), the Falling-Asleep of the Most Holy Birth-giver of God, p. 265', url: 'https://archive.org/details/cu31924029363128', year: 1906 },
          },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 2',
          text: 'В молитвах Неусыпающую Богородицу/ и в предстательствах непреложное упование/ гроб и умерщвление не удержаста:/ якоже бо Живота Матерь/ к животу престави// во утробу Вселивыйся приснодевственную.',
          source: { text: 'days.pravoslavie.ru, 15 августа ст. ст. — Кондак праздника Успения', url: RU('0815'), year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 11:5-21'), r('Evanghelie', 'Mark 4:1-9')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 28 august', url: RO('28') },
    },
    greek: {
      readings: [r('Απόστολος', '2 Corinthians 11:5-21'), r('Ευαγγέλιο', 'Mark 4:1-9')],
      fastingNote: 'Νηστεία',
      source: { text: 'saint.gr, 28 Αυγούστου', url: GR('28') },
    },
    serbian: {
      // The feast's pericopes at the Liturgy; the page prints the Vespers and
      // Matins readings too. The Serbian tropar and kondak of the feast could
      // not be read cleanly off the tropar page (2026-08-23) and are not
      // recorded rather than recorded wrong; the Russian pair stands above.
      readings: [r('Апостол', 'Philippians 2:5-11'), r('Јеванђеље', 'Luke 10:38-42; 11:27-28')],
      title: 'Петак 13. по Духовима — Успеније Пресвете Богородице (Велика Госпојина)',
      fastingNote: 'пост (as marked on the month calendar)',
      source: { text: 'Православни подсетник (pravoslavno.rs), 28.08.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-08-28' },
    },
  },
  '2026-08-29': {
    russian: {
      // 16 August in the Julian calendar: the Image Not Made by Hands.
      readings: [r('Epistle', 'Colossians 1:12-18'), r('Gospel', 'Luke 9:51-56; 10:22-24')],
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 16 августа ст. ст.', url: RU('0816') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 2',
          text: 'Пречистому Твоему образу покланяемся, Благий,/ просяще прощения прегрешений наших, Христе Боже:/ волею бо благоволил еси плотию взыти на Крест,/ да избавиши яже создал еси от работы вражия./ Тем благодарственно вопием Ти:/ радости исполнил еси вся, Спасе наш,// пришедый спасти мир.',
          source: { text: 'days.pravoslavie.ru, 16 августа ст. ст. — Тропарь Нерукотворенного Образа', url: RU('0816'), year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 2',
          text: 'Неизреченнаго и Божественнаго Твоего к человеком смотрения,/ неописанное Слово Отчее,/ и образ неписанный,/ и богописанный победителен,/ ведуще неложнаго Твоего воплощения,// почитаем, того лобызающе.',
          source: { text: 'days.pravoslavie.ru, 16 августа ст. ст. — Кондак Нерукотворенного Образа', url: RU('0816'), year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', 'Acts 13:25-33'), r('Evanghelie', 'Mark 6:14-30')],
      fastingNote: 'Post',
      source: { text: 'doxologia.ro, 29 august', url: RO('29') },
    },
    greek: {
      readings: [r('Απόστολος', 'Acts 13:25-32'), r('Ευαγγέλιο', 'Mark 6:14-30')],
      fastingNote: 'Νηστεία — επιτρέπεται το λάδι και ο οίνος',
      source: { text: 'saint.gr, 29 Αυγούστου', url: GR('29') },
    },
    serbian: {
      readings: [r('Апостол', '1 Corinthians 2:6-9'), r('Апостол', '1 Thessalonians 4:13-17'), r('Јеванђеље', 'Matthew 22:15-22')],
      title: 'Субота 13. по Духовима — Нерукотворена икона Господа Исуса Христа',
      // The month calendar prints no fasting mark on this day.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 29.08.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-08-29' },
    },
  },
  '2026-08-30': {
    russian: {
      readings: [r('Epistle', '1 Corinthians 16:13-24'), r('Gospel', 'Matthew 21:33-42')],
      title: 'Неделя 13-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 17 августа ст. ст. — Неделя 13-я по Пятидесятнице', url: RU('0817') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Днесь светло торжествует Печерская обитель/ и радуется явлением образа Богоматере/ безмерный лик Печерских отцев,/ с нимиже и мы непрестанно вопием:/ радуйся, Благодатная, Печерская похвало.',
          source: { text: 'days.pravoslavie.ru, 17 августа ст. ст. — Тропарь Божией Матери пред иконой Ее Печерской', url: 'https://days.pravoslavie.ru/Days/20260817.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 3',
          text: 'Дева днесь невидимо предстоит в церкви/ и с лики Печерских отцев молится о нас,/ благоговейно величающих Ей безмерную милость к роду нашему,/ явльшуюся в чудном образе Ея,/ обитель Печерскую украшающем.',
          source: { text: 'days.pravoslavie.ru, 17 августа ст. ст. — Кондак Божией Матери пред иконой Ее Печерской', url: 'https://days.pravoslavie.ru/Days/20260817.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', '1 Corinthians 16:13-24'), r('Evanghelie', 'Matthew 21:33-44')],
      title: 'Duminica a 13-a după Rusalii (Pilda lucrătorilor celor răi)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 30 august — glas 4, voscr. 2', url: 'https://doxologia.ro/30-august' },
    },
    greek: {
      readings: [r('Απόστολος', '1 Corinthians 16:13-24'), r('Ευαγγέλιο', 'Matthew 21:33-42')],
      title: 'Κυριακή ΙΓ΄ Ματθαίου — Ἀπόδοσις τῆς μνήμης τῆς ἀποτομῆς τῆς τ. κεφαλῆς Ἰωάννου τοῦ προδρόμου',
      fastingNote: null,
      source: { text: 'saint.gr, 30 Αυγούστου — Αναγνώσματα Κυριακής', url: 'https://www.saint.gr/08/30/index.aspx' },
    },
    serbian: {
      readings: [r('Апостол', '1 Corinthians 16:13-24'), r('Јеванђеље', 'Matthew 21:33-43')],
      title: 'Недеља 13. по Духовима',
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 30.08.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-08-30' },
    },
  },
  '2026-08-31': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 12:10-19'), r('Gospel', 'Mark 4:10-23'), r('Epistle (Мчч)', 'Ephesians 6:10-17'), r('Gospel (Мчч)', 'Luke 12:2-12')],
      title: 'Седмица 14-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 18 августа ст. ст. — Седмица 14-я по Пятидесятнице', url: RU('0818') },
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 12:10-19'), r('Evanghelie', 'Mark 4:10-23')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 31 august', url: 'https://doxologia.ro/31-august' },
      hymns: [
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2', model: 'Pe cea întru rugăciuni...',
          text: 'Cinstit Brâul tău, care a cuprins pântecele tău cel de Dumnezeu primitor, de Dumnezeu Născătoare, este putere nebiruită cetăţii tale şi vistierie de bunătăţi neîmpuţinată. Căci numai tu Singură ai născut, fiind pururea Fecioară.',
          source: { text: 'Doxologia — Condac la Praznicul aşezării în raclă a Cinstitului Brâu al Maicii Domnului', url: 'https://doxologia.ro/condac-la-praznicul-asezarii-racla-cinstitului-brau-al-maicii-domnului', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 8',
          text: 'Născătoare de Dumnezeu pururea Fecioară, Acoperământul oamenilor, Veşmântul şi Brâul Preacuratului tău trup, puternic Acoperământ cetăţii tale ai dăruit prin naşterea ta cea fără sămânţă, Nestricată rămânând. Că întru tine şi firea se înnoieşte şi vremea. Pentru aceasta, te rugăm, pace cetăţii tale dăruieşte şi sufletelor noastre mare milă.',
          source: { text: 'Doxologia — Tropar la Praznicul aşezării în raclă a Cinstitului Brâu al Maicii Domnului', url: 'https://doxologia.ro/tropar-la-praznicul-asezarii-racla-cinstitului-brau-al-maicii-domnului', year: 2026 },
        },
      ],
    },
    greek: {
      readings: [r('Απόστολος', 'Hebrews 9:1-7'), r('Ευαγγέλιο', 'Luke 10:38-42'), r('Ευαγγέλιο', 'Luke 11:27-28')],
      fastingNote: null,
      source: { text: 'saint.gr, 31 Αυγούστου — Αναγνώσματα ημέρας', url: 'https://www.saint.gr/08/31/index.aspx' },
      hymns: [
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος πλ. δ’.',
          text: 'Θεοτόκε ἀειπάρθενε, τῶν ἀνθρώπων ἡ σκέπη, Ἐσθῆτα καὶ Zώνην τοῦ ἀχράντου σου σώματος, κραταιὰν τῇ πόλει σου περιβολὴν ἐδωρήσω, τῷ ἀσπόρῳ τόκῳ σου ἄφθαρτα διαμείναντα, ἐπὶ σοὶ γὰρ καὶ φύσις καινοτομεῖται καὶ χρόνος, διὸ δυσωποῦμέν σε, εἰρήνην τῇ πολιτείᾳ σου δώρησαι, καὶ ταῖς ψυχαῖς ἡμῶν τὸ μέγα ἔλεος.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Κατάθεση Τιμίας Ζώνης της Θεοτόκου, Λειτουργικά κείμενα: Ἀπολυτίκιον', url: 'https://www.saint.gr/866/saint.aspx', year: 2026 },
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος β’.', model: 'Τὴν ἐν πρεσβείαις.',
          text: 'Τὴν θεοδόχον γαστέρα σου Θεοτόκε, περιλαβοῦσα ἡ Zώνη σου ἡ τιμία, κράτος τῇ πόλει σου ἀπροσμάχητον, καὶ θησαυρὸς ὑπάρχει, τῶν ἀγαθῶν ἀνέκλειπτος, ἡ μόνη τεκοῦσα ἀειπάρθενος.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Κατάθεση Τιμίας Ζώνης της Θεοτόκου, Λειτουργικά κείμενα: Κοντάκιον', url: 'https://www.saint.gr/866/saint.aspx', year: 2026 },
        },
      ],
    },
    serbian: {
      readings: [r('Апостол', '2 Corinthians 12:10-19'), r('Јеванђеље', 'Mark 4:11-23')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 31.08.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-08-31' },
    },
  },
  '2026-09-01': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 12:20-13:2'), r('Gospel', 'Mark 4:24-34'), r('Epistle (Мч)', 'Ephesians 6:10-17'), r('Gospel (Мч)', 'Luke 21:12-19')],
      title: 'Седмица 14-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 19 августа ст. ст. — Седмица 14-я по Пятидесятнице', url: RU('0819') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Заступнице верных Преблагая и Скорая,/ Пречистая Богородице Дево!/ Молим Тя пред святым и чудотворным образом Твоим,/ да, якоже древле от него заступление Твое/ граду Москве даровала еси,/ тако и ныне нас от всяких бед и напастей милостивно избави// и спаси души наша, яко Милосердая.',
          source: { text: 'days.pravoslavie.ru, 19 августа ст. ст. — Тропарь Божией Матери пред иконой Ее Донской', url: 'https://days.pravoslavie.ru/Days/20260819.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Всепетая и Всеславная Царице Богородице,/ Мати всея твари Содетеля,/ христианская надежде и Заступнице,/ ненадеющимся и отчаявшимся скорое надеяние, молим Тя:/ милостива буди нам, грешным,/ не остави раб Твоих и не отрини моления недостойных./ Молимся, взирающе ко образу Твоему честному/ святыя и чудотворныя иконы Твоей и вопиюще:/ с плавающими и путешествующими да пребудет милость Твоя./ О Владычице, ризою Твоею честною защити,/ и во всяких местех злых верныя соблюди,/ и молися к Рождшемуся из Тебе Христу Богу нашему,/ да спасет от грех души наша.',
          source: { text: 'days.pravoslavie.ru, 19 августа ст. ст. — Ин тропарь Божией Матери пред иконой Ее Донской', url: 'https://days.pravoslavie.ru/Days/20260819.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 8',
          text: 'Взбранной Воеводе победительная,/ яко избавльшеся от злых,/ благодарственная восписуем Ти, раби Твои, Богородице,/ но, яко имущая державу непобедимую,/ от всяких нас бед свободи, да зовем Ти:// радуйся, Невесто Неневестная.',
          source: { text: 'days.pravoslavie.ru, 19 августа ст. ст. — Кондак Божией Матери пред иконой Ее Донской', url: 'https://days.pravoslavie.ru/Days/20260819.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 2',
          text: 'В Небесныя обители преселившаяся с плотию,/ сущия на земли никакоже оставила еси, Богородице,/ образ Божественный и многочудесный Пречистаго Лица Твоего/ зрети любящим Тя и покланятися даровала еси,/ яко знамение Твоея благодати;/ чтим его, лобызающе.',
          source: { text: 'days.pravoslavie.ru, 19 августа ст. ст. — Ин кондак Божией Матери пред иконой Ее Донской', url: 'https://days.pravoslavie.ru/Days/20260819.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 12:20-21; 13:1-2'), r('Evanghelie', 'Mark 4:24-34')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 1 septembrie', url: 'https://doxologia.ro/1-septembrie' },
      hymns: [
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2',
          text: 'Cel Ce locuieşti întru cei de sus, Hristoase Împărate, Făcătorul tuturor celor văzute şi celor nevăzute şi Ziditorule, Cel Ce zilele şi nopţile, timpurile şi anii ai făcut, binecuvântează acum cununa anului, fereşte şi păzeşte în pace pe cei binecredincioşi, ţara aceasta şi pe poporul tău, Mult Îndurate.',
          source: { text: 'Doxologia — Condacul Începutului de an bisericesc, sau al Indictionului', url: 'https://doxologia.ro/condacul-inceputului-de-bisericesc-al-indictionului', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 2',
          text: 'A toată făptura Ziditorule, Cel Ce timpurile şi anii ai pus întru puterea Ta, binecuvintează cununa anului bunătăţii Tale, Doamne, păzind în pace poporul şi ţara aceasta, pentru rugăciunile Născătoarei de Dumnezeu şi ne mântuieşte pe noi.',
          source: { text: 'Doxologia — Troparul Începutului de an bisericesc, sau al Indictionului', url: 'https://doxologia.ro/troparul-inceputului-de-bisericesc-al-indictionului', year: 2026 },
        },
      ],
    },
    greek: {
      readings: [r('Απόστολος', '1 Timothy 2:1-7'), r('Ευαγγέλιο', 'Luke 4:16-22')],
      fastingNote: null,
      source: { text: 'saint.gr, 1 Σεπτεμβρίου — Αναγνώσματα ημέρας', url: 'https://www.saint.gr/09/01/index.aspx' },
      hymns: [
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος β’.',
          text: 'Ὁ πάσης δημιουργὸς τῆς κτίσεως, ὁ καιροὺς καὶ χρόνους ἐν τῇ ἰδίᾳ ἐξουσία θέμενος, εὐλόγησον τὸν στέφανον τοῦ ἐνιαυτοῦ τῆς χρηστότητός σου Κύριε, φυλάττων ἐν εἰρήνῃ τοὺς Βασιλεῖς καὶ τὴν πόλιν σου, πρεσβείαις τῆς Θεοτόκου, καὶ σῶσον ἡμᾶς.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Αρχή της Ινδίκτου, Λειτουργικά κείμενα: Ἀπολυτίκιον', url: 'https://www.saint.gr/896/saint.aspx', year: 2026 },
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος γ’.', model: 'Ἡ Παρθένος σήμερον.',
          text: 'Ὁ ἀρρήτῳ σύμπαντα, δημιουργήσας σοφίᾳ, καὶ καιροὺς ὁ θέμενος, ἐν τῇ αὐτοῦ ἐξουσίᾳ, δώρησαι, τῷ φιλοχρίστῳ λαῷ σου νίκας· ἔτους δέ, τάς τε εἰσόδους καὶ τάς ἐξόδους, εὐλογήσαις κατευθύνων, ἡμῶν τὰ ἔργα πρὸς θεῖόν σου θέλημα.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Αρχή της Ινδίκτου, Λειτουργικά κείμενα: Κοντάκιον', url: 'https://www.saint.gr/896/saint.aspx', year: 2026 },
        },
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ήχος βαρύς.',
          text: 'Χαίρε Κεχαριτωμένη, Θεοτόκε Παρθένε, λιμήν και προστασία του γένους των ανθρώπων εκ σου γαρ εσαρκώθη ο Λυτρωτής του κόσμου. Όθεν και χαρίτων ηγλάϊσας τω φέγγει, την σήν λαμπράν Εικόνα Μιασηνών τη Μάνδρα· ταύτην γαρ θαυμασίως, εξ υδάτων βυθού και αύθις ημιν δεδώρησαι.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Ανάμνηση Θαύματος της Θεοτόκου στη Μονή των Μιασηνών, Λειτουργικά κείμενα: Ἀπολυτίκιον', url: 'https://www.saint.gr/890/saint.aspx', year: 2026 },
        },
      ],
    },
    serbian: {
      readings: [r('Апостол', '2 Corinthians 12:20-21; 13:1-2'), r('Јеванђеље', 'Mark 4:24-34')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 01.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-01' },
    },
  },
  '2026-09-02': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 13:3-13'), r('Gospel', 'Mark 4:35-41')],
      title: 'Седмица 14-я по Пятидесятнице',
      fastingNote: 'Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 20 августа ст. ст. — Седмица 14-я по Пятидесятнице', url: RU('0820') },
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 13:3-13'), r('Evanghelie', 'Mark 4:35-41')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 2 septembrie', url: 'https://doxologia.ro/2-septembrie' },
    },
    greek: {
      readings: [r('Απόστολος', '2 Corinthians 13:3-13'), r('Ευαγγέλιο', 'Mark 4:35-41')],
      fastingNote: 'Νηστεία',
      source: { text: 'saint.gr, 2 Σεπτεμβρίου — Αναγνώσματα ημέρας', url: 'https://www.saint.gr/09/02/index.aspx' },
    },
    serbian: {
      readings: [r('Апостол', '2 Corinthians 13:3-13'), r('Јеванђеље', 'Mark 4:35-41')],
      // The month calendar marks fast days; this day carries the mark.
      fastingNote: 'Пост (означен у календару)',
      source: { text: 'Православни подсетник (pravoslavno.rs), 02.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-02' },
    },
  },
  '2026-09-03': {
    russian: {
      readings: [r('Epistle', 'Galatians 1:1-10; 1:20-2:5'), r('Gospel', 'Mark 5:1-20')],
      title: 'Седмица 14-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 21 августа ст. ст. — Седмица 14-я по Пятидесятнице', url: RU('0821') },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 1:1-3; 1:20-24; 2:1-5'), r('Evanghelie', 'Mark 5:1-20')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 3 septembrie', url: 'https://doxologia.ro/3-septembrie' },
    },
    greek: {
      readings: [r('Απόστολος', 'Galatians 1:1-3'), r('Απόστολος', 'Galatians 1:20-24'), r('Απόστολος', 'Galatians 2:1-5'), r('Ευαγγέλιο', 'Mark 5:1-20')],
      fastingNote: null,
      source: { text: 'saint.gr, 3 Σεπτεμβρίου — Αναγνώσματα ημέρας', url: 'https://www.saint.gr/09/03/index.aspx' },
    },
    serbian: {
      readings: [r('Апостол', 'Galatians 1:1-10; 1:20-24; 2:1-5'), r('Јеванђеље', 'Mark 5:1-20')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 03.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-03' },
    },
  },
  '2026-09-04': {
    russian: {
      readings: [r('Epistle', 'Galatians 2:6-10'), r('Gospel', 'Mark 5:22-24; 5:35-6:1')],
      title: 'Седмица 14-я по Пятидесятнице',
      fastingNote: 'Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 22 августа ст. ст. — Седмица 14-я по Пятидесятнице', url: RU('0822') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Днесь светло красуется обитель Красногорская,/ и с нею ликовствует Раифская пустыня,/ яко зарю солнечную, от востока возсиявшую, восприимши, Владычице,/ чудотворную Твою икону,/ еюже разгоняеши мглу искушений и бед от вопиющих верно:/ избави обитель нашу и вся страны христианския от всех навет вражиих/ и спаси души наша, яко Милосердная Заступница рода христианского.',
          source: { text: 'days.pravoslavie.ru, 22 августа ст. ст. — Тропарь Божией Матери пред иконой Ее Грузинской (Красногорской)', url: 'https://days.pravoslavie.ru/Days/20260822.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 5',
          text: 'Веселятся православнии народи,/ видяще, Владычице Дево Богородице,/ Твою пречудную и чудотворную икону,/ и приемлют врачевство душевное и телесное Твоею милостию всегда./ Темже и мы, покланяющеся оней, усердно Тебе вопием:/ помилуй, Благая Мати, смиренныя рабы Твоя/ и избави нас от всякаго зла и навета вражия,/ молящи Сына Твоего, Господа Иисуса,/ да, спасшеся зде, Небесное жительство получим/ человеколюбием и благодатию Его.',
          source: { text: 'days.pravoslavie.ru, 22 августа ст. ст. — Ин тропарь Божией Матери пред иконой Ее Грузинской (Красногорской)', url: 'https://days.pravoslavie.ru/Days/20260822.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 8',
          text: 'Тебе, Избранней от всех родов, Божией Матери,/ благодарственная пения приносим,/ пришествием честныя Твоей иконы, раби Твои, Богородице, озаряеми,/ но, яко имущая державу непобедимую,/ от всяких нас бед свободи, да зовем Ти:/ радуйся, Невесто Неневестная.',
          source: { text: 'days.pravoslavie.ru, 22 августа ст. ст. — Кондак Божией Матери пред иконой Ее Грузинской (Красногорской)', url: 'https://days.pravoslavie.ru/Days/20260822.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 6',
          text: 'Аще попущением Божественным/ от рук неверных честная Твоя, Владычице, икона/ поруганию подвержеся/ и копнем варвар прободена быстъ,/ обаче во стране нашей Православней/ любочестно всеми прославляется/ и благоговейно почитается,/ сего ради Тобою являет слепым зрение,/ глухим слышание, немым глаголание,/ хромым хождение, разслабленным укрепление,/ скорбным утешение и отраду./ Сих ради молим Тя, Милосердная Мати,/ до конца пробави милости Твоя на нас, яко Благая.',
          source: { text: 'days.pravoslavie.ru, 22 августа ст. ст. — Ин кондак Божией Матери пред иконой Ее Грузинской (Красногорской)', url: 'https://days.pravoslavie.ru/Days/20260822.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 2:6-10'), r('Evanghelie', 'Mark 5:22-24; 5:35-43; 6:1')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 4 septembrie', url: 'https://doxologia.ro/4-septembrie' },
    },
    greek: {
      readings: [r('Απόστολος', 'Galatians 2:6-10'), r('Ευαγγέλιο', 'Mark 5:22-24'), r('Ευαγγέλιο', 'Mark 5:35-43')],
      fastingNote: 'Νηστεία',
      source: { text: 'saint.gr, 4 Σεπτεμβρίου — Αναγνώσματα ημέρας', url: 'https://www.saint.gr/09/04/index.aspx' },
    },
    serbian: {
      readings: [r('Апостол', 'Galatians 2:6-10'), r('Јеванђеље', 'Mark 5:22-24; 5:35-43; 6:1')],
      // The month calendar marks fast days; this day carries the mark.
      fastingNote: 'Пост (означен у календару)',
      source: { text: 'Православни подсетник (pravoslavno.rs), 04.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-04' },
    },
  },
  '2026-09-05': {
    russian: {
      readings: [r('Epistle (Богородицы)', 'Philippians 2:5-11'), r('Gospel (Богородицы)', 'Luke 10:38-42; 11:27-28'), r('Epistle (Ряд)', '1 Corinthians 4:1-5'), r('Gospel (Ряд)', 'Matthew 23:1-12')],
      title: 'Седмица 14-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 23 августа ст. ст. — Седмица 14-я по Пятидесятнице', url: RU('0823') },
    },
    romanian: {
      readings: [r('Apostol', '1 Corinthians 4:1-5'), r('Evanghelie', 'Matthew 23:1-12')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 5 septembrie', url: 'https://doxologia.ro/5-septembrie' },
    },
    greek: {
      readings: [r('Απόστολος', '1 Corinthians 4:1-5'), r('Ευαγγέλιο', 'Matthew 23:1-12')],
      fastingNote: null,
      source: { text: 'saint.gr, 5 Σεπτεμβρίου — Αναγνώσματα ημέρας', url: 'https://www.saint.gr/09/05/index.aspx' },
    },
    serbian: {
      readings: [r('Апостол', '1 Corinthians 4:1-5'), r('Апостол', '1 Thessalonians 4:13-17'), r('Јеванђеље', 'Matthew 23:1-12')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 05.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-05' },
    },
  },
  '2026-09-06': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 1:21-2:4'), r('Gospel', 'Matthew 22:1-14'), r('Epistle (Свт)', 'Hebrews 7:26-8:2'), r('Gospel (Свт)', 'John 10:9-16')],
      title: 'Неделя 14-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 24 августа ст. ст. — Неделя 14-я по Пятидесятнице', url: RU('0824') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Днесь пророчество святителя Петра/ пред очами нашими сбывается,/ сердце бо России град Москва/ свыше славу велию приемлет,/ украшаем, яко бисером честным,/ многим сонмом Божиих угодников;/ к нимже мы любовию возопиим:/ о, пречуднии святителие,/ исповедницы и мученицы новии,/ благовернии князие, преподобнии отцы,/ и премудрии юродивии,/ и вси святии, знаемии и незнаемии,/ яко благочестия столпи,/ молите Христа Бога/ стране нашей в мире спастися.',
          source: { text: 'days.pravoslavie.ru, 24 августа ст. ст. — Тропарь Собора Московских святых', url: 'https://days.pravoslavie.ru/Days/20260824.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 3',
          text: 'Возвеличися ныне, граде Москво,/ велиих даров духовных сподобляющися,/ яко сокровищница пречестная/ святыням и мощем угодник Божиих/ и отечество возлюбленное многим святым,/ к их же помощи усердно прибегаем:/ о святых Московских дивный сонме,/ вашими ученьми и деяньми/ вкупе и страданьми за Христа,/ души наша просветите/ и спасения нам присно будите ходатаи.',
          source: { text: 'days.pravoslavie.ru, 24 августа ст. ст. — Кондак Собора Московских святых', url: 'https://days.pravoslavie.ru/Days/20260824.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 1:21-24; 2:1-4'), r('Evanghelie', 'Matthew 22:2-14')],
      title: 'Duminica a 14-a după Rusalii (Pilda nunții fiului de împărat)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 6 septembrie — glas 5, voscr. 3', url: 'https://doxologia.ro/6-septembrie' },
    },
    greek: {
      readings: [r('Απόστολος', '2 Corinthians 1:21-24'), r('Απόστολος', '2 Corinthians 2:1-4'), r('Ευαγγέλιο', 'Matthew 24:2-14')],
      title: 'Κυριακή ΙΔ΄ Ματθαίου — Ἀνάμνησις τοῦ ἐν Χώναις θαύματος τοῦ ἀρχαγγέλου Μιχαήλ',
      fastingNote: null,
      source: { text: 'saint.gr, 6 Σεπτεμβρίου — Αναγνώσματα Κυριακής', url: 'https://www.saint.gr/09/06/index.aspx' },
      hymns: [
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος δ’.',
          text: 'Τῶν οὐρανίων στρατιῶν Ἀρχιστράτηγε, δυσωποῦμέν σε ἀεὶ ἡμεῖς οἱ ἀνάξιοι, ἵνα ταῖς σαῖς δεήσεσι τειχίσης ἡμᾶς, σκέπη τῶν πτερύγων, τῆς ἀῢλου σου δόξης, φρουρῶν ἡμᾶς προσπίπτοντας, ἐκτενῶς καὶ βοῶντας· Ἐκ τῶν κινδύνων λύτρωσαι ἡμᾶς, ὡς ταξιάρχης τῶν ἄνω Δυνάμεων.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Ανάμνηση Θαύματος Αρχαγγέλου Μιχαήλ στις Χωναίς (ή Κολασσαίς), Λειτουργικά κείμενα: Ἀπολυτίκιον', url: 'https://www.saint.gr/2357/saint.aspx', year: 2026 },
        },
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος πλ. α’.', model: 'Τὸν συνάναρχον Λόγον.',
          text: 'Ὡς νεφέλη ὠράθης ἐπισκιάζουσα, Μιχαὴλ Ταξίαρχα τῷ σῷ ἁγίω ναῶ, ὑετίζων δαψιλῶς ὕδωρ ἀθάνατον ὅθεν ὡς ἄλλη κιβωτόν, διεφύλαξας αὐτόν, καὶ ρείθρων τῶν ποταμῖων, τὸν ροῦν ἠκόντιαας πόρρω, πρὸς εὐφροσύνην τῶν ψυχῶν ἠμῶν.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Ανάμνηση Θαύματος Αρχαγγέλου Μιχαήλ στις Χωναίς (ή Κολασσαίς), Λειτουργικά κείμενα: Έτερον Ἀπολυτίκιον', url: 'https://www.saint.gr/2357/saint.aspx', year: 2026 },
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος β’.', model: 'Αὐτόμελον.',
          text: 'Ἀρχιστράτηγε Θεοῦ, λειτουργὲ θείας δόξης, τῶν ἀνθρώπων ὁδηγέ, καὶ ἀρχηγὲ τῶν Ἀσωμάτων, τὸ συμφέρον ἡμῖν αἴτησαι, καὶ τὸ μέγα ἔλεος, ὡς τῶν Ἀσωμάτων ἀρχιστράτηγος.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Ανάμνηση Θαύματος Αρχαγγέλου Μιχαήλ στις Χωναίς (ή Κολασσαίς), Λειτουργικά κείμενα: Κοντάκιον', url: 'https://www.saint.gr/2357/saint.aspx', year: 2026 },
        },
      ],
    },
    serbian: {
      readings: [r('Апостол', '2 Corinthians 1:21; 1:22-24; 2:1-4'), r('Јеванђеље', 'Matthew 22:1-14')],
      title: 'Недеља 14. по Духовима',
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 06.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-06' },
    },
  },
  '2026-09-07': {
    russian: {
      readings: [r('Epistle', 'Galatians 2:11-16'), r('Gospel', 'Mark 5:24-34'), r('Epistle (Апп)', 'Titus 1:1-4; 2:15-3:3'), r('Gospel (Апп)', 'Matthew 5:14-19')],
      title: 'Седмица 15-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 25 августа ст. ст. — Седмица 15-я по Пятидесятнице', url: RU('0825') },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 2:11-16'), r('Evanghelie', 'Mark 5:24-34')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 7 septembrie', url: 'https://doxologia.ro/7-septembrie' },
      hymns: [
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3', model: 'Fecioara astăzi...',
          text: 'Astăzi Fecioara şi de Dumnezeu Născătoarea Maria, Cămara cea Sfântă a Cerescului Mire, se naşte din cea stearpă cu Sfatul lui Dumnezeu; Căruţa Cuvântului lui Dumnezeu bine se împodobeşte; că pentru aceasta a şi fost numită mai înainte Dumnezeiască Uşă şi cu adevărat Maică a Vieţii.',
          source: { text: 'Doxologia — Condac la Praznicul Înainteprăznuirii Naşterii Maicii Domnului', url: 'https://doxologia.ro/condac-la-praznicul-inaintepraznuirii-nasterii-maicii-domnului', year: 2026 },
        },
      ],
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: null,
      source: { text: 'saint.gr, 7 Σεπτεμβρίου', url: 'https://www.saint.gr/09/07/index.aspx' },
      hymns: [
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος δ’.', model: 'Κατεπλάγη Ἰωσήφ.',
          text: 'Ἐκ τῆς ῥίζης Ἰεσσαί, καὶ ἐξ ὀσφύος τοῦ Δαυῒδ, ἡ θεόπαις Μαριάμ, τίκτεται σήμερον ἡμῖν, διὸ καὶ χαίρει ἡ σύμπασα καὶ καινουργεῖται, συγχαίρει τε ὁμοῦ, ὁ οὐρανὸς καὶ ἡ γῆ. Αἰνέσατε αὐτὴν αἱ πατριαὶ τῶν ἐθνῶν, Ἰωακεὶμ εὐφραίνεται, καὶ Ἄννα πανηγυρίζει κραυγάζουσα· Ἡ στεῖρα τίκτει, τὴν Θεοτόκον, καὶ τροφὸν τῆς ζωῆς ἡμῶν.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Προεόρτια της Γέννησης της Δεσποίνης ημών Θεοτόκου και Αειπαρθένου Μαρ...., Λειτουργικά κείμενα: Ἀπολυτίκιον', url: 'https://www.saint.gr/948/saint.aspx', year: 2026 },
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος δ’.', model: 'Ἐπεφάνης σήμερον.',
          text: 'Τῇ σεπτῇ γεννήσει σου ἡ οἰκουμένη, τῷ ἀΰλῳ Πνεύματι, πεποικιλμένη νοερῶς, ἐν ευφροσύνῃ κραυγάζει σοι· Χαῖρε Παρθένε, Χριστιανῶν τὸ καύχημα.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Προεόρτια της Γέννησης της Δεσποίνης ημών Θεοτόκου και Αειπαρθένου Μαρ...., Λειτουργικά κείμενα: Κοντάκιον', url: 'https://www.saint.gr/948/saint.aspx', year: 2026 },
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος γ’.', model: 'Ἡ Παρθένος σήμερον.',
          text: 'Ἡ Παρθένος σήμερον, καὶ Θεοτόκος Μαρία, ἡ παστὰς ἡ ἄλυτος, τοῦ οὐρανίου Νυμφίου, τίκτεται, ἀπὸ τῆς στείρας θεοβουλήτως, ὄχημα, τοῦ Θεοῦ Λόγου εὐτρεπισθῆναι· εἰς τοῦτο γὰρ καὶ προωρίσθη, ἡ θεία πύλη, καὶ Μήτηρ τῆς ὄντως ζωῆς.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Προεόρτια της Γέννησης της Δεσποίνης ημών Θεοτόκου και Αειπαρθένου Μαρ...., Λειτουργικά κείμενα: Έτερον Κοντάκιον', url: 'https://www.saint.gr/948/saint.aspx', year: 2026 },
        },
      ],
    },
    serbian: {
      readings: [r('Апостол', 'Galatians 2:11-16'), r('Јеванђеље', 'Mark 5:24-34')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 07.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-07' },
    },
  },
  '2026-09-08': {
    russian: {
      readings: [r('Epistle', 'Galatians 2:21-3:7'), r('Gospel', 'Mark 6:1-7'), r('Epistle (Богородицы)', 'Philippians 2:5-11'), r('Gospel (Богородицы)', 'Luke 10:38-42; 11:27-28')],
      title: 'Седмица 15-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 26 августа ст. ст. — Седмица 15-я по Пятидесятнице', url: RU('0826') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Днесь светло красуется славнейший град Москва,/ яко зарю солнечную, восприемши, Владычице,/ чудотворную Твою икону,/ к нейже ныне мы притекающе и молящеся Тебе, взываем сице:/ о пречудная Владычице Богородице!/ Молися из Тебе воплощенному Христу Богу нашему,/ да избавит град сей и вся грады и страны христианския/ невредимы от всех навет вражиих// и спасет души наша, яко Милосерд.',
          source: { text: 'days.pravoslavie.ru, 26 августа ст. ст. — Тропарь Божией Матери пред иконой Ее Владимирская', url: 'https://days.pravoslavie.ru/Days/20260826.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 8',
          text: 'Взбранной Воеводе победительная,/ яко избавльшеся от злых/ пришествием Твоего честнаго образа, Владычице Богородице,/ светло сотворяем празднество сретения Твоего и обычно зовем Ти:// радуйся, Невесто Неневестная.',
          source: { text: 'days.pravoslavie.ru, 26 августа ст. ст. — Кондак Божией Матери пред иконой Ее Владимирская', url: 'https://days.pravoslavie.ru/Days/20260826.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 8',
          text: 'К Взбранней Воеводе и Заступнице, Деве и Богородице,/ в чистей совести, верою утвердившеся, русстии народи,/ невозвратно надежду имуще, притецем,/ к чудотворному Ей и пречистому образу, и возопием Ей:/ радуйся, Невесто Неневестная.',
          source: { text: 'days.pravoslavie.ru, 26 августа ст. ст. — Ин кондак Божией Матери пред иконой Ее Владимирской', url: 'https://days.pravoslavie.ru/Days/20260826.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', 'Philippians 2:5-11'), r('Evanghelie', 'Luke 10:38-42; 11:27-28')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 8 septembrie', url: 'https://doxologia.ro/8-septembrie' },
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Naşterea ta, de Dumnezeu Născătoare Fecioară, bucurie a vestit la toată lumea; că din tine a Răsărit Soarele dreptăţii, Hristos Dumnezeul nostru. Şi dezlegând blestemul, a dat binecuvântare; şi stricând moartea, ne-a dăruit nouă viaţă veşnică.',
          source: { text: 'Doxologia — Tropar la Praznicul Naşterii Maicii Domnului', url: 'https://doxologia.ro/tropar-la-praznicul-nasterii-maicii-domnului', year: 2026 },
          english: {
            text: 'Thy holy Nativity, O virgin Birth-giver of God, hath proclaimed joy unto all the universe; for from thee is risen the Sun of Righteousness, even Christ our God. And having destroyed the curse, he hath bestowed a blessing; and having brought Death to naught, he hath given unto us life eternal.',
            source: { text: 'Hapgood, Service Book of the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (1906), the Nativity of the Most Holy Birth-giver of God, p. 164', url: 'https://archive.org/details/cu31924029363128', year: 1906 },
          },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Sfinţii Ioachim şi Ana din defăimarea nenaşterii de fii, iar Adam şi Eva din stricăciunea morţii au scăpat, Preacurată, prin Sfântă naşterea ta. Aceasta o prăznuieşte şi poporul tău, de vina greşelilor mântuindu-se, când striga către tine: cea stearpă naşte pe Născătoarea de Dumnezeu şi Hrănitoarea vieţii noastre.',
          source: { text: 'Doxologia — Condac la Praznicul Naşterii Maicii Domnului', url: 'https://doxologia.ro/condac-la-praznicul-nasterii-maicii-domnului', year: 2026 },
          english: {
            text: 'Joachim and Anna were delivered from the reproach of childlessness, and Adam and Eve from the corruption of death, at thy holy Nativity, O All-pure One. This do thy people celebrate, being redeemed from the guilt of transgressions, when they cry unto thee: The barren giveth birth to the Birth-giver of God and the Nourisher of our Life.',
            source: { text: 'Hapgood, Service Book of the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (1906), the Nativity of the Most Holy Birth-giver of God, p. 165', url: 'https://archive.org/details/cu31924029363128', year: 1906 },
          },
        },
      ],
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: null,
      source: { text: 'saint.gr, 8 Σεπτεμβρίου', url: 'https://www.saint.gr/09/08/index.aspx' },
      hymns: [
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος δ’.',
          text: 'Ἡ γέννησίς σου Θεοτόκε, χαρὰν ἐμήνυσε πάσῃ τῇ οικουμένῃ, ἐκ σοῦ γὰρ ἀνέτειλεν ὁ Ἥλιος τῆς δικαιοσύνης, Χριστὸς ὁ Θεὸς ἡμῶν, καὶ λύσας τὴν κατάραν, ἔδωκε τὴν εὐλογίαν, καὶ καταργήσας τὸν θάνατον, ἐδωρήσατο ἡμῖν ζωὴν τὴν αἰώνιον.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Γέννηση της Υπεραγίας Θεοτόκου, Λειτουργικά κείμενα: Ἀπολυτίκιον', url: 'https://www.saint.gr/955/saint.aspx', year: 2026 },
          english: {
            text: 'Thy holy Nativity, O virgin Birth-giver of God, hath proclaimed joy unto all the universe; for from thee is risen the Sun of Righteousness, even Christ our God. And having destroyed the curse, he hath bestowed a blessing; and having brought Death to naught, he hath given unto us life eternal.',
            source: { text: 'Hapgood, Service Book of the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (1906), the Nativity of the Most Holy Birth-giver of God, p. 164', url: 'https://archive.org/details/cu31924029363128', year: 1906 },
          },
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος δ’.', model: 'Αὐτόμελον.',
          text: 'Ἰωακεὶμ καὶ Ἄννα ὀνειδισμοῦ ἀτεκνίας, καὶ Ἀδὰμ καὶ Εὔα, ἐκ τῆς φθορᾶς τοῦ θανάτου, ἠλευθερώθησαν, Ἄχραντε, ἐν τῇ ἁγίᾳ γεννήσει σου, αὐτὴν ἑορτάζει καὶ ὁ λαός σου, ἐνοχῆς τῶν πταισμάτων, λυτρωθεὶς ἐν τῷ κράζειν σοι· Ἡ Στεῖρα τίκτει τὴν Θεοτόκον, καὶ τροφὸν τῆς ζωῆς ἡμῶν.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Γέννηση της Υπεραγίας Θεοτόκου, Λειτουργικά κείμενα: Κοντάκιον', url: 'https://www.saint.gr/955/saint.aspx', year: 2026 },
          english: {
            text: 'Joachim and Anna were delivered from the reproach of childlessness, and Adam and Eve from the corruption of death, at thy holy Nativity, O All-pure One. This do thy people celebrate, being redeemed from the guilt of transgressions, when they cry unto thee: The barren giveth birth to the Birth-giver of God and the Nourisher of our Life.',
            source: { text: 'Hapgood, Service Book of the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (1906), the Nativity of the Most Holy Birth-giver of God, p. 165', url: 'https://archive.org/details/cu31924029363128', year: 1906 },
          },
        },
      ],
    },
    serbian: {
      readings: [r('Апостол', 'Galatians 2:21; 3:1-7'), r('Јеванђеље', 'Mark 6:1-7')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 08.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-08' },
    },
  },
  '2026-09-09': {
    russian: {
      readings: [r('Epistle', 'Galatians 3:15-22'), r('Gospel', 'Mark 6:7-13'), r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Matthew 4:25-5:12')],
      title: 'Седмица 15-я по Пятидесятнице',
      fastingNote: 'Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 27 августа ст. ст. — Седмица 15-я по Пятидесятнице', url: RU('0827') },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 3:15-22'), r('Evanghelie', 'Mark 6:7-13')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 9 septembrie', url: 'https://doxologia.ro/9-septembrie' },
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: 'Νηστεία - Επιτρέπεται το λάδι και ο οίνος',
      source: { text: 'saint.gr, 9 Σεπτεμβρίου', url: 'https://www.saint.gr/09/09/index.aspx' },
      hymns: [
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος γ’.', model: 'Θείας πίστεως.',
          text: 'Θείῳ Πνεύματι, ἐν τῇ Ἐφέσῳ, συνεκρότησαν, Σύνοδον Τρίτην, οἱ θεοφόροι Πατέρες καὶ ἅγιοι, καὶ Νεστορίου ἑλόντες τὴν αἵρεσιν, τὴν Θεοτόκον σαφῶς ἀνεκήρυξαν· οὓς ὑμνήσωμεν, συμφώνοις ᾠδαῖς καὶ ᾄσμασι, δοξάζοντες Χριστὸν τὸν πολυέλεον.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Μνήμη της Γ\' Αγίας Οικουμενικής Συνόδου, Λειτουργικά κείμενα: Ἀπολυτίκιον', url: 'https://www.saint.gr/991/saint.aspx', year: 2026 },
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος δ’.', model: 'Ὁ ὑψωθεὶς ἐν τῷ Σταυρῷ.',
          text: 'Τοῦ Παρακλήτου ἐπινεύσει τῇ θείᾳ, ἐν τῇ Ἐφέσῳ συνελθόντες Πατέρες, καὶ τὴν σεπτὴν καὶ Τρίτην θείαν Σύνοδον, πίστει συγκροτήσαντες, ἐν αὐτῇ Νεστορίου, ἅπασαν τὴν αἵρεσιν, καὶ τὸ ἔκφυλον δόγμα, καταβαλόντες δόγμασι σεπτοῖς, τὴν Ἐκκλησίαν τοῦ Χριστοῦ ἐστηρίξατε.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Μνήμη της Γ\' Αγίας Οικουμενικής Συνόδου, Λειτουργικά κείμενα: Κοντάκιον', url: 'https://www.saint.gr/991/saint.aspx', year: 2026 },
        },
      ],
    },
    serbian: {
      readings: [r('Апостол', 'Galatians 3:15-22'), r('Јеванђеље', 'Mark 6:7-13')],
      // The month calendar marks fast days; this day carries the mark.
      fastingNote: 'Пост (означен у календару)',
      source: { text: 'Православни подсетник (pravoslavno.rs), 09.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-09' },
    },
  },
  '2026-09-10': {
    russian: {
      readings: [r('Epistle', 'Galatians 3:23-4:5'), r('Gospel', 'Mark 6:30-45'), r('Epistle (за пятницу)', 'Galatians 4:8-21'), r('Gospel (за пятницу)', 'Mark 6:45-53'), r('Epistle (Прпп)', 'Galatians 5:22-6:2'), r('Gospel (Прпп)', 'Luke 6:17-23')],
      title: 'Седмица 15-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 28 августа ст. ст. — Седмица 15-я по Пятидесятнице', url: RU('0828') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Мысленное солнце и светлую луну,/ первоначальных Печерских,/ со всем собором преподобных днесь почтим,/ тии бо, церковную твердь озаряюще,/ просвещают во тьме страстей бедствующих,/ и подают от Христа Бога молитвами своими помощь во всех скорбех,// и душам нашим просят избавления.',
          source: { text: 'days.pravoslavie.ru, 28 августа ст. ст. — Тропарь преподобных отцов Киево-Печерских', url: 'https://days.pravoslavie.ru/Days/20260828.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 8',
          text: 'Избраннии от всех родов угодницы Божии,/ святии преподобнии Печерстии,/ на сих горах добродетельми просиявшии,/ вас земля не потаила есть,/ но Небо отверзеся вам и райское селение./ Темже мы похвальныя песни Богу, прославльшему вас,/ в памяти вашей приносим;/ вы же, яко имущии дерзновение,/ ваш собор почитающих от всех бед молитвами вашими заступайте,// яко заступницы наши и к Богу ходатаи.',
          source: { text: 'days.pravoslavie.ru, 28 августа ст. ст. — Кондак преподобных отцов Киево-Печерских', url: 'https://days.pravoslavie.ru/Days/20260828.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 3:23-29; 4:1-5'), r('Evanghelie', 'Mark 6:30-45')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 10 septembrie', url: 'https://doxologia.ro/10-septembrie' },
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: null,
      source: { text: 'saint.gr, 10 Σεπτεμβρίου', url: 'https://www.saint.gr/09/10/index.aspx' },
    },
    serbian: {
      readings: [r('Апостол', 'Galatians 3:23-29; 4:1-5'), r('Јеванђеље', 'Mark 6:30-44')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 10.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-10' },
    },
  },
  '2026-09-11': {
    russian: {
      readings: [r('Epistle', 'Acts 13:25-32'), r('Gospel', 'Mark 6:14-30')],
      title: 'Седмица 15-я по Пятидесятнице',
      fastingNote: 'Строгий пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 29 августа ст. ст. — Седмица 15-я по Пятидесятнице', url: RU('0829') },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 4:8-21'), r('Evanghelie', 'Mark 6:45-53')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 11 septembrie', url: 'https://doxologia.ro/11-septembrie' },
      hymns: [
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: '',
          text: 'Ca un cer mult luminos s-a arătat Biserica, luminând pe toţi credincioşii, întru care stând strigăm: această Biserică întăreşte-o, Doamne.',
          source: { text: 'Doxologia — Condac la Praznicul Înainte-prăznuirii Înălţării Sfintei Cruci', url: 'https://doxologia.ro/condac-la-praznicul-inainte-praznuirii-inaltarii-sfintei-cruci', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 2',
          text: 'Cu crucea cea de viaţă făcătoare a bunătăţii Tale, Doamne, pe care ne-ai dat-o nouă nevrednicilor spre mântuire, milostiveşte-Te, Stăpâne şi mântuieşte pe poporul cel dreptcredincios şi ţara aceasta. Pentru Născătoarea de Dumnezeu, Unule, Iubitorule de oameni.',
          source: { text: 'Doxologia — Tropar la Praznicul Înainte-prăznuirii Înălţării Sfintei Cruci', url: 'https://doxologia.ro/tropar-la-praznicul-inainte-praznuirii-inaltarii-sfintei-cruci', year: 2026 },
        },
      ],
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: 'Νηστεία',
      source: { text: 'saint.gr, 11 Σεπτεμβρίου', url: 'https://www.saint.gr/09/11/index.aspx' },
    },
    serbian: {
      readings: [r('Јеванђеље', 'Matthew 14:1-13'), r('Апостол', 'Acts 13:25-32'), r('Јеванђеље', 'Mark 6:14-30')],
      // The month calendar marks fast days; this day carries the mark.
      fastingNote: 'Пост (означен у календару)',
      source: { text: 'Православни подсетник (pravoslavno.rs), 11.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-11' },
    },
  },
  '2026-09-12': {
    russian: {
      readings: [r('Epistle (Блгв. кн. Александра)', 'Galatians 5:22-6:2'), r('Gospel (Блгв. кн. Александра)', 'Matthew 11:27-30'), r('Epistle (Ряд)', '1 Corinthians 4:17-5:5'), r('Gospel (Ряд)', 'Matthew 24:1-13')],
      title: 'Седмица 15-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 30 августа ст. ст. — Седмица 15-я по Пятидесятнице', url: RU('0830') },
    },
    romanian: {
      readings: [r('Apostol', '1 Corinthians 4:17-21; 5:1-5'), r('Evanghelie', 'Matthew 24:1-13')],
      title: 'Odovania Praznicului Naşterii Maicii Domnului',
      fastingNote: null,
      source: { text: 'doxologia.ro, 12 septembrie', url: 'https://doxologia.ro/12-septembrie' },
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: null,
      source: { text: 'saint.gr, 12 Σεπτεμβρίου', url: 'https://www.saint.gr/09/12/index.aspx' },
    },
    serbian: {
      readings: [r('Јеванђеље', 'John 10:9-16'), r('Апостол', 'Hebrews 13:7-16'), r('Јеванђеље', 'Matthew 5:14-19')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 12.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-12' },
    },
  },
  '2026-09-13': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 4:6-15'), r('Gospel', 'Matthew 22:35-46'), r('Epistle (Богородицы)', 'Hebrews 9:1-7'), r('Gospel (Богородицы)', 'Luke 10:38-42; 11:27-28')],
      title: 'Неделя 15-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 31 августа ст. ст. — Неделя 15-я по Пятидесятнице', url: RU('0831') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 8',
          text: 'Богородице Приснодево, человеков покрове,/ ризу и пояс пречистаго Твоего телесе,/ державное граду Твоему обложение даровала еси,/ безсеменным рождеством Твоим нетленна пребывающи,/ о Тебе бо и естество обновляется и время./ Темже молим Тя мир граду Твоему даровати/ и душам нашим велию милость.',
          source: { text: 'days.pravoslavie.ru, 31 августа ст. ст. — Тропарь Положения честного пояса Пресвятой Богородицы', url: 'https://days.pravoslavie.ru/Days/20260831.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 2',
          text: 'Богоприятное Твое чрево, Богородице,/ объемший пояс Твой честный/ держава граду Твоему необорима/ и сокровище есть благих неоскудно,/ едина рождшая Приснодево.',
          source: { text: 'days.pravoslavie.ru, 31 августа ст. ст. — Кондак Положения честного пояса Пресвятой Богородицы', url: 'https://days.pravoslavie.ru/Days/20260831.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 4',
          text: 'Честнаго пояса Твоего положение/ празднует днесь Твой, Препетая, храм/ и прилежно взывает Ти:/ радуйся, Дево,/ христиан похвало.',
          source: { text: 'days.pravoslavie.ru, 31 августа ст. ст. — Кондак Положения честного пояса Пресвятой Богородицы', url: 'https://days.pravoslavie.ru/Days/20260831.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 6:11-18'), r('Evanghelie', 'John 3:13-17')],
      title: 'Duminica dinaintea Înălțării Sfintei Cruci',
      fastingNote: null,
      source: { text: 'doxologia.ro, 13 septembrie — glas 6, voscr. 4', url: 'https://doxologia.ro/13-septembrie' },
      hymns: [
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: '',
          text: 'Ca un cer mult luminos s-a arătat Biserica, luminând pe toţi credincioşii, întru care stând, cântă: această casă întăreşte-o, Doamne.',
          source: { text: 'Doxologia — Condac la Praznicul Înnoirilor Sfintei Biserici a Învierii Domnului nostru Iisus Hristos', url: 'https://doxologia.ro/condac-la-praznicul-innoirilor-sfintei-biserici-invierii-domnului-nostru-iisus-hristos', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Precum ai arătat, Doamne, podoaba Tăriei celei de sus şi celor de jos frumuseţea Sfântului Locaş al Măririi Tale, pe care întăreşte-l în veacul veacului, primeşte şi rugăciunile noastre, ale celor care neîncetat se aduc Ţie într-însul. Pentru rugăciunile Născătoarei de Dumnezeu, Cel Ce eşti Viaţa şi Învierea tuturor.',
          source: { text: 'Doxologia — Tropar la Praznicul Înnoirilor Sfintei Biserici a Învierii Domnului nostru Iisus Hristos', url: 'https://doxologia.ro/tropar-la-praznicul-innoirilor-sfintei-biserici-invierii-domnului-nostru-iisus-hristos', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: '',
          text: 'Ca un cer mult luminos s-a arătat Biserica, luminând pe toţi credincioşii, întru care stând strigăm: această Biserică întăreşte-o, Doamne.',
          source: { text: 'Doxologia — Condac la Praznicul Înainte-prăznuirii Înălţării Sfintei Cruci', url: 'https://doxologia.ro/condac-la-praznicul-inainte-praznuirii-inaltarii-sfintei-cruci', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 2',
          text: 'Cu crucea cea de viaţă făcătoare a bunătăţii Tale, Doamne, pe care ne-ai dat-o nouă nevrednicilor spre mântuire, milostiveşte-Te, Stăpâne şi mântuieşte pe poporul cel dreptcredincios şi ţara aceasta. Pentru Născătoarea de Dumnezeu, Unule, Iubitorule de oameni.',
          source: { text: 'Doxologia — Tropar la Praznicul Înainte-prăznuirii Înălţării Sfintei Cruci', url: 'https://doxologia.ro/tropar-la-praznicul-inainte-praznuirii-inaltarii-sfintei-cruci', year: 2026 },
        },
      ],
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: null,
      source: { text: 'saint.gr, 13 Σεπτεμβρίου', url: 'https://www.saint.gr/09/13/index.aspx' },
      hymns: [
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος δ’.',
          text: 'Ὡς τοῦ ἄνω στερεώματος τὴν εὐπρέπειαν, καὶ τὴν κάτω συναπέδειξας ὡραιότητα, τοῦ ἁγίου σκηνώματος τῆς δόξης σου Κύριε, Κραταίωσον αὐτὸ εἰς αἰώνα αἰῶνος, καὶ πρόσδεξαι ἡμῶν, τὰς ἐν αὐτῷ ἀπαύστως προσαγομένας σοι δεήσεις, πρεσβείαις τῆς Θεοτόκου, ἡ πάντων ζωῂ καὶ ἀνάστασις.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Ανάμνηση των Εγκαινίων του Ιερού Ναού της Αναστάσεως, Λειτουργικά κείμενα: Ἀπολυτίκιον', url: 'https://www.saint.gr/2419/saint.aspx', year: 2026 },
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος δ’.', model: 'Αὐτόμελον',
          text: 'Οὐρανὸς πολύφωτος ἡ Ἐκκλησία, ἀνεδείχθη ἅπαντας, φωταγωγοῦσα τοὺς πιστούς, ἐν ᾧ ἑστῶτες κραυγάζομεν, Τοῦτον τὸν Οἶκον, στερέωσον Κύριε.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Ανάμνηση των Εγκαινίων του Ιερού Ναού της Αναστάσεως, Λειτουργικά κείμενα: Κοντάκιον', url: 'https://www.saint.gr/2419/saint.aspx', year: 2026 },
        },
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος β’.',
          text: 'Τὸν ζωοποιὸν Σταυρὸν τῆς σῆς ἀγαθότητος, ὃν ἐδωρήσω ἡμῖν τοῖς ἀναξίοις Κύριε, σοὶ προσάγομεν εἰς πρεσβείαν. Σῶζε τοὺς βασιλεῖς καὶ τὴν πόλιν σου, εἰρηνεύοντας διὰ τῆς Θεοτόκου, μόνε φιλάνθρωπε.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Προεόρτια της Υψώσεως του Τιμίου και Ζωοποιού Σταυρού, Λειτουργικά κείμενα: Ἀπολυτίκιον', url: 'https://www.saint.gr/2430/saint.aspx', year: 2026 },
        },
      ],
    },
    serbian: {
      readings: [r('Апостол', '2 Corinthians 4:6-15'), r('Јеванђеље', 'Matthew 22:36-46')],
      title: 'Недеља 15. по Духовима',
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 13.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-13' },
      hymns: [
        {
          church: 'serbian', kind: 'troparion', lang: 'sr', tone: 'глас 8',
          text: 'Владичице приснодјево, покрове људи, ризу и појас пречистога твога тела, као силан омотач си даровала граду твоме. И по бесеменом рођењу твоме остала си дјева: Од тебе се и природа и време обнављају. Зато те молимо, да мир граду твоме дарујеш, и душама нашим велику милост.',
          source: { text: 'Православни подсетник (pravoslavno.rs) — Тропар: Полагање појаса Пресвете Богородице', url: 'https://www.pravoslavno.rs/index.php?tropar=0913', year: 2026 },
        },
      ],
    },
  },
  '2026-09-14': {
    russian: {
      readings: [r('Epistle (Новолетия)', '1 Timothy 2:1-7'), r('Gospel (Новолетия)', 'Luke 4:16-22'), r('Epistle (Прп)', 'Colossians 3:12-16'), r('Gospel (Прп)', 'Matthew 11:27-30')],
      title: 'Седмица 16-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 1 сентября ст. ст. — Седмица 16-я по Пятидесятнице', url: RU('0901') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Торжество днесь празднуем светлое,/ се бо предлежит, о Всеблаженная, икона Твоя Всечестная,/ к ней же любовию сердца вси приходяще, Владычице,/ поклоняемся и тепло Тебе вопием:/ избави нас от бед и обстояний.',
          source: { text: 'days.pravoslavie.ru, 1 сентября ст. ст. — Тропарь Божией Матери пред иконой Ее Всеблаженная', url: 'https://days.pravoslavie.ru/Days/20260901.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 4',
          text: 'Во праздник Твой сошедшеся, вернии,/ священное ко славе Божией торжество Твое, Владычице, днесь всеблагоговейно совершаем,/ любовию же чтуще честную икону Твою,/ Тебе песнословим вси в радости:/ радуйся, Дево Честная Всеблаженная.',
          source: { text: 'days.pravoslavie.ru, 1 сентября ст. ст. — Кондак Божией Матери пред иконой Ее Всеблаженная', url: 'https://days.pravoslavie.ru/Days/20260901.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 5',
          text: 'Пречистая Владычице Богородице, упование всех христиан,/ понеже инаго упования не имамы разве Тебе,/ Всенепорочная Владычице моя, Госпоже Богородице,/ Мати Христа Бога моего./ Темже помилуй и избави мя от всех зол моих/ и умоли Милостиваго Сына Своего и Бога моего,/ да помилует окаянную душу мою,/ и да избавит мя от вечныя муки, и сподобит мя Царствия Своего.',
          source: { text: 'days.pravoslavie.ru, 1 сентября ст. ст. — Тропарь Божией Матери пред иконой Ее Черниговской-Гефсиманской', url: 'https://days.pravoslavie.ru/Days/20260901.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 2',
          text: 'Всея твари Содетелю,/ времена и лета во Своей власти положивый,/ благослови венец лета благости Твоея, Господи,/ сохраняя в мире люди и град Твой/ молитвами Богородицы и спаси ны.',
          source: { text: 'days.pravoslavie.ru, 1 сентября ст. ст. — Тропарь Индикту (церковному новолетию)', url: 'https://days.pravoslavie.ru/Days/20260901.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 2',
          text: 'В вышних живый, Христе Царю,/ всех видимых и невидимых Творче и Зиждителю,/ Иже дни и нощи, времена и лета сотворивый,/ благослови ныне венец лета,/ соблюди и сохрани в мире/ град и люди Твоя, Многомилостиве.',
          source: { text: 'days.pravoslavie.ru, 1 сентября ст. ст. — Кондак Индикту (церковному новолетию)', url: 'https://days.pravoslavie.ru/Days/20260901.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', '1 Corinthians 1:18-24'), r('Evanghelie', 'John 19:6-11,13-20,25-28,30-35')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 14 septembrie', url: 'https://doxologia.ro/14-septembrie' },
      hymns: [
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4', model: 'Cel Ce Te-ai înălţat...',
          text: 'Cel Ce Te-ai înălţat pe Cruce de bunăvoie, poporului Tău celui nou numit cu numele Tău, îndurările Tale dăruieşte-i, Hristoase Dumnezeule. Veseleşte cu puterea Ta pe dreptcredincioşii creştini, dăruindu-le biruinţă asupra celui protivnic; având ajutorul Tău, armă de pace nebiruită biruinţă.',
          source: { text: 'Doxologia — Condac la Praznicul Înălţării Sfintei Cruci', url: 'https://doxologia.ro/condac-la-praznicul-inaltarii-sfintei-cruci', year: 2026 },
          english: {
            text: 'Do thou who, of thine own good will, upon the Cross wast lifted up, bestow thy bounties upon the new State which is called by thy Name, O Christ, our God; make glad with thy might our most God-fearing (Emperor, King, or President), N., granting victory over his adversaries unto him who hath thine aid, which is a panoply of peace, a trophy invincible.',
            source: { text: 'Hapgood, Service Book of the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (1906), the Collect-Hymn of the Cross, p. 61', url: 'https://archive.org/details/cu31924029363128', year: 1906 },
          },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 1',
          text: 'Mântuieşte, Doamne, poporul Tău şi binecuvintează moştenirea Ta; biruinţă binecredincioşilor creştini asupra celui protivnic dăruieşte şi cu Crucea Ta păzeşte pe poporul Tău.',
          source: { text: 'Doxologia — Tropar la Praznicul Înălţării Sfintei Cruci', url: 'https://doxologia.ro/tropar-la-praznicul-inaltarii-sfintei-cruci', year: 2026 },
          english: {
            text: 'O Lord, save thy people, and bless thine inheritance, granting victory over enemies unto our Sovereign, N., and through thy Cross preserving thine Estate.',
            source: { text: 'Hapgood, Service Book of the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (1906), the Elevation of the Precious Cross of the Lord, p. 167', url: 'https://archive.org/details/cu31924029363128', year: 1906 },
          },
        },
      ],
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: 'Νηστεία',
      source: { text: 'saint.gr, 14 Σεπτεμβρίου', url: 'https://www.saint.gr/09/14/index.aspx' },
      hymns: [
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος α’.',
          text: 'Σῶσον Κύριε τὸν λαόν σου καὶ εὐλόγησον τὴν κληρονομίαν σου, νίκας τοῖς Βασιλεῦσι κατὰ βαρβάρων δωρούμενος καὶ τὸ σὸν φυλάττων διὰ τοῦ Σταυροῦ σου πολίτευμα.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Ύψωση του Τιμίου και Ζωοποιού Σταυρού, Λειτουργικά κείμενα: Ἀπολυτίκιον', url: 'https://www.saint.gr/2391/saint.aspx', year: 2026 },
          english: {
            text: 'O Lord, save thy people, and bless thine inheritance, granting victory over enemies unto our Sovereign, N., and through thy Cross preserving thine Estate.',
            source: { text: 'Hapgood, Service Book of the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (1906), the Elevation of the Precious Cross of the Lord, p. 167', url: 'https://archive.org/details/cu31924029363128', year: 1906 },
          },
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος δ’.', model: 'Αὐτόμελον.',
          text: 'Ὁ ὑψωθεὶς ἐν τῷ Σταυρῷ ἑκουσίως, τῇ ἐπωνύμῳ σου καινὴ πολιτεία, τοὺς οἰκτιρμούς σου δώρησαι, Χριστὲ ὁ Θεός, Εὔφρανον ἐν τῇ δυνάμει σου, τοὺς πιστοὺς Βασιλεῖς ἡμῶν, νίκας χορηγῶν αὐτοῖς, κατὰ τῶν πολεμίων, τὴν συμμαχίαν ἔχοιεν τὴν σήν, ὅπλον εἰρήνης, ἀήττητον τρόπαιον.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Ύψωση του Τιμίου και Ζωοποιού Σταυρού, Λειτουργικά κείμενα: Κοντάκιον', url: 'https://www.saint.gr/2391/saint.aspx', year: 2026 },
          english: {
            text: 'Do thou who, of thine own good will, upon the Cross wast lifted up, bestow thy bounties upon the new State which is called by thy Name, O Christ, our God; make glad with thy might our most God-fearing (Emperor, King, or President), N., granting victory over his adversaries unto him who hath thine aid, which is a panoply of peace, a trophy invincible.',
            source: { text: 'Hapgood, Service Book of the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (1906), the Collect-Hymn of the Cross, p. 61', url: 'https://archive.org/details/cu31924029363128', year: 1906 },
          },
        },
        {
          church: 'greek', kind: 'troparion', lang: 'el', tone: 'Ἦχος α’.', model: 'Του λίθου σφραγισθέντος.',
          text: 'Τὴν Σύνοδον τὴν Ἕκτην ἱερῶς συγκροτήσαντες, θεόσοφοι Πατέρες ἑκατὸν ἑβδομήκοντα, αἱρέσεων ἐλύσατε ἀχλύν, λαμπρότητι δογμάτων εὐσεβῶν· διὰ τοῦτο τὴν ἁγίαν μνήμην ὑμῶν, τιμῶμεν ἀνακράζοντες· δόξα τῷ ἐνισχύσαντι ὑμᾶς, δόξα τῷ στεφανώσαντι, δόξα τῷ βεβαιοῦντι δι’ ὑμῶν, πίστιν τὴν Ὀρθόδοξον.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Μνήμη της ΣΤ’ Οικουμενικής Συνόδου, Λειτουργικά κείμενα: Ἀπολυτίκιον', url: 'https://www.saint.gr/2393/saint.aspx', year: 2026 },
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος β’.', model: 'Τοὺς ἀσφαλεῖς.',
          text: 'Τοὺς τῷ φωτὶ τῶν ἀρετῶν ἐκλάμψαντας, καὶ ἐν Συνόδῳ τῇ Ἕκτῃ κηρύξαντας, τὸν Χριστὸν διπλοῦν ταῖς φύσεσι, καὶ ἐνεργείαις καὶ θελήσεσι, Πατέρας τοὺς θεόφρονας τιμήσωμεν, ὡς μύστας εὐσεβείας καὶ ἐκφάντορας· Χριστῷ γὰρ ὑπὲρ ἡμῶν πρεσβεύουσι.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Μνήμη της ΣΤ’ Οικουμενικής Συνόδου, Λειτουργικά κείμενα: Κοντάκιον', url: 'https://www.saint.gr/2393/saint.aspx', year: 2026 },
        },
      ],
    },
    serbian: {
      readings: [r('Апостол', 'Galatians 4:28-31; 5:1-10'), r('Јеванђеље', 'Mark 6:55-56; 7:1-8')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 14.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-14' },
    },
  },
  '2026-09-15': {
    russian: {
      readings: [r('Epistle', 'Galatians 4:28-5:10'), r('Gospel', 'Mark 6:54-7:8'), r('Epistle (за понедельник и за вторник)', 'Galatians 5:11-21'), r('Gospel (за понедельник и за вторник)', 'Mark 7:5-16'), r('Epistle (Мч)', 'Romans 8:28-39'), r('Gospel (Мч)', 'John 15:1-7')],
      title: 'Седмица 16-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 2 сентября ст. ст. — Седмица 16-я по Пятидесятнице', url: RU('0902') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Заступнице от враг иноплеменных Необоримая Калужския земли, / и Избавительнице от смертоносныя язвы Милостивая! / Избави рабы Твоя от всяких бед и болезней, / с верою и любовию прибегающия к чудотворней иконе Твоей, / и спаси души наша.',
          source: { text: 'days.pravoslavie.ru, 2 сентября ст. ст. — Тропарь (Калужской иконы Божией Матери)', url: 'https://days.pravoslavie.ru/Days/20260902.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Заступнице от враг иноплеменных Необоримая Калужский земли/ и Избавительнице от смертоносныя язвы Милостивая!/ Избави рабы Твоя от всяких бед и болезней,/ с верою и любовию прибегающий к чудотворней иконе Твоей,/ и спаси души наша.',
          source: { text: 'days.pravoslavie.ru, 2 сентября ст. ст. — Тропарь Божией Матери пред иконой Ее Калужской', url: 'https://days.pravoslavie.ru/Days/20260902.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 6',
          text: 'Не имамы песней, ниже словес,/ како достойно восхвалити Тя,/ Мати Христа Бога нашего,/ явления ради чудотворный иконы Твоей земли Калужстей,/ токмо можем вопити Тебе:/ не отврати милости Твоей от нас/ и низпосли ю всем, притекающим к цельбоносней иконе Твоей.',
          source: { text: 'days.pravoslavie.ru, 2 сентября ст. ст. — Кондак Божией Матери пред иконой Ее Калужской', url: 'https://days.pravoslavie.ru/Days/20260902.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 5:11-21'), r('Evanghelie', 'Mark 7:5-16')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 15 septembrie', url: 'https://doxologia.ro/15-septembrie' },
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: null,
      source: { text: 'saint.gr, 15 Σεπτεμβρίου', url: 'https://www.saint.gr/09/15/index.aspx' },
    },
    serbian: {
      readings: [r('Апостол', 'Galatians 5:11-21'), r('Јеванђеље', 'Mark 7:5-16')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 15.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-15' },
    },
  },
  '2026-09-16': {
    russian: {
      readings: [r('Epistle', 'Galatians 6:2-10'), r('Gospel', 'Mark 7:14-24'), r('Epistle (Сщмч)', 'Hebrews 13:7-16'), r('Gospel (Сщмч)', 'John 10:9-16')],
      title: 'Седмица 16-я по Пятидесятнице',
      fastingNote: 'Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 3 сентября ст. ст. — Седмица 16-я по Пятидесятнице', url: RU('0903') },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 6:2-10'), r('Evanghelie', 'Mark 7:14-24')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 16 septembrie', url: 'https://doxologia.ro/16-septembrie' },
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: 'Νηστεία',
      source: { text: 'saint.gr, 16 Σεπτεμβρίου', url: 'https://www.saint.gr/09/16/index.aspx' },
    },
    serbian: {
      readings: [r('Апостол', 'Galatians 6:2-10'), r('Јеванђеље', 'Mark 7:14-24')],
      // The month calendar marks fast days; this day carries the mark.
      fastingNote: 'Пост (означен у календару)',
      source: { text: 'Православни подсетник (pravoslavno.rs), 16.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-16' },
    },
  },
  '2026-09-17': {
    russian: {
      readings: [r('Epistle', 'Ephesians 1:1-9'), r('Gospel', 'Mark 7:24-30'), r('Epistle (Свв)', 'Hebrews 11:33-12:2'), r('Gospel (Свв)', 'Luke 12:32-40')],
      title: 'Седмица 16-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 4 сентября ст. ст. — Седмица 16-я по Пятидесятнице', url: RU('0904') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Иже во огни купины неопалимый, древле Моисеем виденныя,/ тайну воплощения Своего от Неискусобрачныя Девы Марии Прообразовавый,/ Той и ныне яко чудес Творец и всея твари Создатель/ икону Ея святую чудесы многими прослави,/ даровав ю верным во исцеление недугом и в защищение от огненнаго запаления./ Сего ради вопием Преблагословенней:/ Надеждо христиан, от лютых бед, огня и грома избави на Тя уповающия, и спаси души наша яко Милосерда.',
          source: { text: 'days.pravoslavie.ru, 4 сентября ст. ст. — Тропарь Божией Матери пред иконой Ее Неопалимая Купина', url: 'https://days.pravoslavie.ru/Days/20260904.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Иже в Купине, огнем горящей и несгораемей,/ показавый Моисеови Пречистую Твою Матерь, Христе Боже,/ огнь Божества неопальне во чреве Приимшую/ и нетленну по Рождестве Пребывшую,/ Тоя молитвами от пламене страстей избави нас/ и от огненных запалений град Твой сохрани,/ яко Многомилостив.',
          source: { text: 'days.pravoslavie.ru, 4 сентября ст. ст. — Ин тропарь Божией Матери пред иконой Ее Неопалимая Купина', url: 'https://days.pravoslavie.ru/Days/20260904.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 8',
          text: 'Предочистим чувствия душ и телес наших, да видим таинство Божественное,/ образно явленное древле великому во пророцех Моисею купиною, горевшею огнем и не сгаравшею,/ в нейже Твоего безсеменнаго Рождества, Богородице, предвозвещение исповедуем и, благоговейно покланяющеся Тебе и Рождшемуся от Тебе Спасу нашему,/ со страхом вопием: радуйся, Владычице, Покрове, и Прибежище, и Спасение душ наших.',
          source: { text: 'days.pravoslavie.ru, 4 сентября ст. ст. — Кондак Божией Матери пред иконой Ее Неопалимая Купина', url: 'https://days.pravoslavie.ru/Days/20260904.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 1:1-9'), r('Evanghelie', 'Mark 7:24-30')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 17 septembrie', url: 'https://doxologia.ro/17-septembrie' },
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: null,
      source: { text: 'saint.gr, 17 Σεπτεμβρίου', url: 'https://www.saint.gr/09/17/index.aspx' },
    },
    serbian: {
      readings: [r('Апостол', 'Ephesians 1:1-9'), r('Јеванђеље', 'Mark 7:24-30')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 17.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-17' },
    },
  },
  '2026-09-18': {
    russian: {
      readings: [r('Epistle', 'Ephesians 1:7-17'), r('Gospel', 'Mark 8:1-10'), r('Epistle (Прор)', 'Hebrews 6:13-20'), r('Gospel (Прор)', 'Matthew 23:29-39')],
      title: 'Седмица 16-я по Пятидесятнице',
      fastingNote: 'Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 5 сентября ст. ст. — Седмица 16-я по Пятидесятнице', url: RU('0905') },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 1:7-17'), r('Evanghelie', 'Mark 8:1-10')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 18 septembrie', url: 'https://doxologia.ro/18-septembrie' },
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: 'Νηστεία',
      source: { text: 'saint.gr, 18 Σεπτεμβρίου', url: 'https://www.saint.gr/09/18/index.aspx' },
    },
    serbian: {
      readings: [r('Апостол', 'Ephesians 1:7-17'), r('Јеванђеље', 'Mark 8:1-10')],
      // The month calendar marks fast days; this day carries the mark.
      fastingNote: 'Пост (означен у календару)',
      source: { text: 'Православни подсетник (pravoslavno.rs), 18.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-18' },
    },
  },
  '2026-09-19': {
    russian: {
      readings: [r('Epistle (Архангела)', 'Hebrews 2:2-10'), r('Gospel (Архангела)', 'Luke 10:16-21'), r('Epistle (Ряд)', '1 Corinthians 10:23-28'), r('Gospel (Ряд)', 'Matthew 24:34-44')],
      title: 'Седмица 16-я по Пятидесятнице',
      fastingNote: null,
      source: { text: 'days.pravoslavie.ru, 6 сентября ст. ст. — Седмица 16-я по Пятидесятнице', url: RU('0906') },
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Небесных воинств Архистратиже,/ молим тя присно мы, недостойнии,/ да твоими молитвами оградиши нас/ кровом крил невещественныя твоея славы,/ сохраняя нас припадающих прилежно и вопиющих:/ от бед избави нас,// яко чиноначальник вышних сил.',
          source: { text: 'days.pravoslavie.ru, 6 сентября ст. ст. — Тропарь Архангела Михаила', url: 'https://days.pravoslavie.ru/Days/20260906.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 2',
          text: 'Архистратиже Божий,/ служителю Божественныя славы,/ Ангелов начальниче и человеков наставниче,/ полезное нам проси и велию милость,// яко безплотных Архистратиг.',
          source: { text: 'days.pravoslavie.ru, 6 сентября ст. ст. — Кондак Архангела Михаила', url: 'https://days.pravoslavie.ru/Days/20260906.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', '1 Corinthians 10:23-28'), r('Evanghelie', 'Matthew 24:34-44')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 19 septembrie', url: 'https://doxologia.ro/19-septembrie' },
    },
    greek: {
      // saint.gr publishes a day's readings about two weeks ahead; on 23 August 2026 this day's were not yet up. Nothing is invented.
      readings: [],
      note: 'Αναγνώσματα: saint.gr had not yet published this day when read (23 August 2026).',
      fastingNote: null,
      source: { text: 'saint.gr, 19 Σεπτεμβρίου', url: 'https://www.saint.gr/09/19/index.aspx' },
    },
    serbian: {
      readings: [r('Апостол', '1 Corinthians 10:23-28'), r('Апостол', '1 Thessalonians 4:13-17'), r('Јеванђеље', 'Matthew 24:34-44')],
      // The month calendar marks fast days; this day carries none.
      fastingNote: null,
      source: { text: 'Православни подсетник (pravoslavno.rs), 19.09.2026', url: 'https://www.pravoslavno.rs/index.php?q=citanja&datum=2026-09-19' },
      hymns: [
        {
          church: 'serbian', kind: 'troparion', lang: 'sr', tone: 'глас 4',
          text: 'Војсковођо небеских војски, непрестано те молимо ми недостојни, да нас твојим молитвама заштитиш као заклоном крила твоје непропадљиве славе. Чувај нас који падамо на колена и усрдно вапијемо: Избави нас од беда као поглавар вишњих сила.',
          source: { text: 'Православни подсетник (pravoslavno.rs) — Тропар: Чудо светог архангела Михаила', url: 'https://www.pravoslavno.rs/index.php?tropar=0919', year: 2026 },
        },
      ],
    },
  },
  '2026-09-20': {
    russian: {
      readings: [r('Epistle (Недели пред Воздвижением)', 'Galatians 6:11-18'), r('Gospel (Недели пред Воздвижением)', 'John 3:13-17'), r('Epistle (Ряд. (под зачало))', '2 Corinthians 6:1-10'), r('Gospel (Ряд. (под зачало))', 'Matthew 25:14-30'), r('Epistle (Мч)', 'Ephesians 6:10-17'), r('Gospel (Мч)', 'John 15:17-16:2')],
      title: 'Неделя 16-я по Пятидесятнице, перед Воздвижением',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 7 сентября ст. ст. — Неделя 16-я по Пятидесятнице, перед Воздвижением', url: 'https://days.pravoslavie.ru/Days/20260907.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 2:16-20'), r('Evanghelie', 'Mark 8:34-38; 9:1')],
      title: 'Duminica după Înălțarea Sfintei Cruci (Luarea Crucii și urmarea lui Hristos)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 20 septembrie', url: 'https://doxologia.ro/20-septembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Mucenicii Tăi, Doamne, întru nevoinţele lor, cununile nestricăciunii au dobândit de la Tine, Dumnezeul nostru. Că având tăria Ta, pe chinuitori au învins; zdrobit-au şi ale demonilor neputincioase îndrăzniri. Pentru rugăciunile lor, mântuieşte sufletele noastre, Hristoase Dumnezeule.',
          source: { text: 'Doxologia — Troparul Sfântului Mare Mucenic Eustatie şi al celor împreună cu dânsul: soţia sa Teopisti cu cei doi fii ai lor Agapie şi Teopist', url: 'https://doxologia.ro/troparul-sfantului-mare-mucenic-eustatie-al-celor-impreuna-cu-dansul-sotia-sa-teopisti-cu-cei-doi', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2',
          text: 'Cele de sus căutând... Aievea râvnind Patimilor Lui Hristos şi cu credinţă bând paharul Lui, te-ai făcut părtaş şi împreună moştenitor măririi Lui, Sfinte Mucenice Eustatie; de la Însuşi Dumnezeul tuturor, luând dintru înălţime Dumnezeiască iertare.',
          source: { text: 'Doxologia — Condacul Sfântului Mare Mucenic Eustatie şi al celor împreună cu dânsul: soţia sa Teopisti cu cei doi fii ai lor Agapie şi Teopist', url: 'https://doxologia.ro/condacul-sfantului-mare-mucenic-eustatie-al-celor-impreuna-cu-dansul-sotia-sa-teopisti-cu-cei-doi', year: 2026 },
        },
      ],
    },
  },
  '2026-09-21': {
    russian: {
      readings: [r('Epistle', 'Philippians 2:5-11'), r('Gospel', 'Luke 10:38-42; 11:27-28')],
      title: 'Седмица 17-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 8 сентября ст. ст. — Седмица 17-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260908.html' },
      // Совершается служба великому празднику — the calendar's own sign for the day: T6
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Яко необоримую стену и источник чудес/ стяжавше Тя раби Твои,/ Богородице пречистая,/ сопротивных ополчения низлагаем./ Темже молим Тя:/ мир граду Твоему даруй/ и душам нашим велию милость.',
          source: { text: 'days.pravoslavie.ru, 8 сентября ст. ст. — Тропарь Божией Матери пред иконой Ее Знамение', url: 'https://days.pravoslavie.ru/Days/20260908.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 4',
          text: 'Честнаго образа Твоего знамение празднующе людие Твои, Богородительнице, имже дивную победу на сопротивныя граду Твоему даровала еси. Темже Тебе верою взываем: радуйся, Дево, христиан похвало.',
          source: { text: 'days.pravoslavie.ru, 8 сентября ст. ст. — Кондак Божией Матери пред иконой Ее Знамение', url: 'https://days.pravoslavie.ru/Days/20260908.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 5',
          text: 'Пред святою Твоею иконою, Владычице,/ молящиися исцелений сподобляются,/ веры истинныя познание приемлют/ и агарянская нашествия отражают./ Темже и нам, к Тебе припадающим,/ грехов оставление испроси,/ помыслы благочестия сердца наша просвети/ и к Сыну Твоему молитву вознеси// о спасении душ наших.',
          source: { text: 'days.pravoslavie.ru, 8 сентября ст. ст. — Тропарь Божией Матери пред иконой Ее Почаевской', url: 'https://days.pravoslavie.ru/Days/20260908.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 1',
          text: 'Источник исцелений и веры Православныя утверждение/ Почаевская Твоя икона, Богородице, явися,/ темже и нас, к ней притекающих,/ от бед и искушений свободи,/ лавру Твою невредиму сохрани,/ Православие во окрест стоящих странах утверди/ и грехи разреши молитвенник Твоих:// елика бо хощеши, можеши.',
          source: { text: 'days.pravoslavie.ru, 8 сентября ст. ст. — Кондак Божией Матери пред иконой Ее Почаевской', url: 'https://days.pravoslavie.ru/Days/20260908.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Днесь благовернии людие, осеняемии святым Богоматери образом, во умилении глаголем: Владычице, помози рабом Твоим в напастех, скорбех и болезнех, обременены бо грехми многими, и избави ны от всякаго зла, молящи Сына Твоего, Христа Бога нашего, спасти души наша.',
          source: { text: 'days.pravoslavie.ru, 8 сентября ст. ст. — Тропарь Божией Матери пред иконой Ее Глинской', url: 'https://days.pravoslavie.ru/Days/20260908.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 8',
          text: 'Аще и многажды икона Твоя, Богородице, уносима бысть с места явления, обаче чудесне в пустыню возвращашеся, отонудуже всем верным подает благо потребное.',
          source: { text: 'days.pravoslavie.ru, 8 сентября ст. ст. — Кондак Божией Матери пред иконой Ее Глинской', url: 'https://days.pravoslavie.ru/Days/20260908.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 1',
          text: 'Превечная Премудросте, Христе Боже наш! / Божественным смотрением Своим преклонивый Небеса, / благоволил еси вселитися во утробу Чистыя Отроковицы, / средостение вражды разрушив, / освятил еси естество наше / и Царствие Твое нам отверзл еси; / сего ради Тебе, Творца нашего и Избавителя, / и рождшую Тя, / спасения нашего тайне послужившую Деву Чистую, православно величаем.',
          source: { text: 'days.pravoslavie.ru, 8 сентября ст. ст. — Тропарь иконы Софии, Премудрости Божией', url: 'https://days.pravoslavie.ru/Days/20260908.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Рождество Твое, Богородице Дево,/ радость возвести всей вселенней:/ из Тебе бо возсия Солнце Правды, Христос Бог наш,/ и, разрушив клятву, даде благословение,// и, упразднив смерть, дарова нам живот вечный.',
          source: { text: 'days.pravoslavie.ru, 8 сентября ст. ст. — Тропарь праздника', url: 'https://days.pravoslavie.ru/Days/20260908.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 4',
          text: 'Иоаким и Анна поношения безчадства/ и Адам и Ева от тли смертныя свободистася, Пречистая,/ во святем рождестве Твоем./ То празднуют и людие Твои,/ вины прегрешений избавльшеся,/ внегда звати Ти:// неплоды раждает Богородицу и Питательницу Жизни нашея.',
          source: { text: 'days.pravoslavie.ru, 8 сентября ст. ст. — Кондак праздника', url: 'https://days.pravoslavie.ru/Days/20260908.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 1:22-23; 2:1-5'), r('Evanghelie', 'Mark 10:46-52')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 21 septembrie', url: 'https://doxologia.ro/21-septembrie' },
    },
  },
  '2026-09-22': {
    russian: {
      readings: [r('Epistle', 'Ephesians 1:22-2:3'), r('Gospel', 'Mark 10:46-52'), r('Epistle (за понедельник и за вторник (под зачало))', 'Ephesians 2:19-3:7'), r('Gospel (за понедельник и за вторник (под зачало))', 'Mark 11:11-23'), r('Epistle (Богоотцов)', 'Galatians 4:22-31'), r('Gospel (Богоотцов)', 'Luke 8:16-21')],
      title: 'Седмица 17-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 9 сентября ст. ст. — Седмица 17-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260909.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 2:19-22; 3:1-7'), r('Evanghelie', 'Mark 11:11-23')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 22 septembrie', url: 'https://doxologia.ro/22-septembrie' },
    },
  },
  '2026-09-23': {
    russian: {
      readings: [r('Epistle', 'Ephesians 3:8-21'), r('Gospel', 'Mark 11:23-26')],
      title: 'Седмица 17-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 10 сентября ст. ст. — Седмица 17-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260910.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 3:8-21'), r('Evanghelie', 'Mark 11:22-26')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 23 septembrie', url: 'https://doxologia.ro/23-septembrie' },
    },
  },
  '2026-09-24': {
    russian: {
      readings: [r('Epistle', 'Ephesians 4:14-19'), r('Gospel', 'Mark 11:27-33'), r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Luke 6:17-23')],
      title: 'Седмица 17-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 11 сентября ст. ст. — Седмица 17-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260911.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 4:14-17'), r('Evanghelie', 'Mark 11:27-33')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 24 septembrie', url: 'https://doxologia.ro/24-septembrie' },
    },
  },
  '2026-09-25': {
    russian: {
      readings: [r('Epistle', 'Ephesians 4:17-25'), r('Gospel', 'Mark 12:1-12'), r('Epistle (и за субботу (под зачало))', '1 Corinthians 14:20-25'), r('Gospel (и за субботу (под зачало))', 'Matthew 25:1-13'), r('Epistle (Богородицы)', 'Philippians 2:5-11'), r('Gospel (Богородицы)', 'Luke 10:38-42; 11:27-28')],
      title: 'Седмица 17-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 12 сентября ст. ст. — Седмица 17-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260912.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 4:17-25'), r('Evanghelie', 'Mark 12:1-12')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 25 septembrie', url: 'https://doxologia.ro/25-septembrie' },
    },
  },
  '2026-09-26': {
    russian: {
      readings: [r('Epistle (Обновления)', 'Hebrews 3:1-4'), r('Gospel (Обновления)', 'Matthew 16:13-18'), r('Epistle (Субботы пред Воздвижением)', '1 Corinthians 2:6-9'), r('Gospel (Субботы пред Воздвижением)', 'Matthew 10:37-11:1')],
      title: 'Седмица 17-я по Пятидесятнице. Суббота перед Воздвижением',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 13 сентября ст. ст. — Седмица 17-я по Пятидесятнице. Суббота перед Воздвижением', url: 'https://days.pravoslavie.ru/Days/20260913.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Corinthians 14:20-25'), r('Evanghelie', 'Matthew 25:1-13')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 26 septembrie', url: 'https://doxologia.ro/26-septembrie' },
    },
  },
  '2026-09-27': {
    russian: {
      readings: [r('Epistle', '1 Corinthians 1:18-24'), r('Gospel', 'John 19:6-11; 19:13-20; 19:25-28; 19:30-35')],
      title: 'Неделя 17-я по Пятидесятнице',
      fastingNote: 'Строгий пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 14 сентября ст. ст. — Неделя 17-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260914.html' },
      // Совершается служба великому празднику — the calendar's own sign for the day: T6
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 8',
          text: 'Уст твоих, якоже светлость огня возсиявши, благодать/ вселенную просвети:/ не сребролюбия мирови сокровища сниска,/ высоту нам смиренномудрия показа,/ но, твоими словесы наказуя, отче Иоанне Златоусте,// моли Слова, Христа Бога, спастися душам нашим.',
          source: { text: 'days.pravoslavie.ru, 14 сентября ст. ст. — Тропарь святителя Иоанна Златоустого', url: 'https://days.pravoslavie.ru/Days/20260914.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 6',
          text: 'От Небес приял еси Божественную благодать/ и твоими устнами вся учиши/ покланятися в Троице Единому Богу,/ Иоанне Златоусте, всеблаженне преподобне,/ достойно хвалим тя:/ еси бо наставник,// яко Божественная являя.',
          source: { text: 'days.pravoslavie.ru, 14 сентября ст. ст. — Кондак святителя Иоанна Златоустого', url: 'https://days.pravoslavie.ru/Days/20260914.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 1',
          text: 'Спаси, Господи, люди Твоя/ и благослови достояние Твое,/ победы на сопротивныя даруя// и Твое сохраняя Крестом Твоим жительство.',
          source: { text: 'days.pravoslavie.ru, 14 сентября ст. ст. — Тропарь Воздвижения Честнаго и Животворящего Креста', url: 'https://days.pravoslavie.ru/Days/20260914.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 4',
          text: 'Вознесыйся на Крест волею,/ тезоименитому Твоему новому жительству/ щедроты Твоя даруй, Христе Боже,/ возвесели нас силою Твоею,/ победы дая нам на сопостаты,/ пособие имущим Твое оружие мира,// непобедимую победу.',
          source: { text: 'days.pravoslavie.ru, 14 сентября ст. ст. — Кондак Воздвижения Честнаго и Животворящего Креста', url: 'https://days.pravoslavie.ru/Days/20260914.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 9:6-11'), r('Evanghelie', 'Luke 5:1-11')],
      title: 'Duminica a 18-a după Rusalii (Pescuirea minunată)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 27 septembrie', url: 'https://doxologia.ro/27-septembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 3 Sfinte Părinte Ierarhe Antim, după vrednicie ai fost rânduit păstor şi învăţător turmei tale, şi cu înţelepciune dumnezeiască ai revărsat râurile sfintelor tale cuvinte. Viaţa ai pus-o pentru păstoriţii tăi şi cununa muceniciei ai dobândit de la Hristos Dumnezeu, pe Care roagă-L, Sfinte Părinte Ierarhe Antim, să dăruiască pace şi mare milă celor ce săvârşesc sfântă pomenirea ta.',
          source: { text: 'Doxologia — Troparul Sfântului Ierarh Martir Antim Ivireanul, Mitropolitul Țării Românești', url: 'https://doxologia.ro/troparul-sfantului-ierarh-martir-antim-ivireanul-mitropolitul-tarii-romanesti', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Cel Ce Te-ai înălţat... Răni de multe feluri suferind şi vădit primind cununi de la Dumnezeu, fericiţilor, rugaţi-vă lui Hristos pentru noi, cei ce săvârşim pomenirea voastră cea sărbătorească, Preamare Calistrat, împreună cu cei ce au pătimit cu tine, ca să împace turma şi poporul Său, căci El este Întărirea credincioşilor.',
          source: { text: 'Doxologia — Condacul Sfinţilor Mucenici Calistrat şi Ghimnasie şi al celor împreună cu dânşii', url: 'https://doxologia.ro/condacul-sfintilor-mucenici-calistrat-ghimnasie-al-celor-impreuna-cu-dansii', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Arătatu-Te-ai astăzi lumii... Toată osteneala voastră, săvârşind astăzi Biserica, sfinţilor, vă laudă în taină pe voi, ca pe cei ce aţi pătimit pentru dânsa, Dumnezeieştilor mucenici, bunilor biruitori preaînţelepţi.',
          source: { text: 'Doxologia — Condacul Sfinţilor Mucenici Calistrat şi Ghimnasie şi al celor împreună cu dânşii', url: 'https://doxologia.ro/condacul-sfintilor-mucenici-calistrat-ghimnasie-al-celor-impreuna-cu-dansii-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Arătatu-Te-ai astăzi lumii... Ca o stea foarte mare ai strălucit în lume, întinzând razele nevoinţelor şi ale minunilor tale, luminând pe toţi cei ce cântă: Bucură-te, Sfinte Calistrat, lauda mucenicilor.',
          source: { text: 'Doxologia — Condacul Sfinţilor Mucenici Calistrat şi Ghimnasie şi al celor împreună cu dânşii', url: 'https://doxologia.ro/condacul-sfintilor-mucenici-calistrat-ghimnasie-al-celor-impreuna-cu-dansii-1', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Podobie: Fecioara astăzi… În ţara noastră sfinţitor te-ai arătat, Sfinte Ierarhe. Că Evanghelia lui Hristos cu râvnă o ai împlinit, pe poporul cel credincios l-ai luminat, lăcaşuri Sfintei Treimi ai ridicat, sufletul ţi-ai pus pentru turma lui Hristos. Pentru aceasta te-ai încununat de la Hristos Dumnezeu cu daruri netrecătoare.',
          source: { text: 'Doxologia — Condacul Sfântului Ierarh Martir Antim Ivireanul, Mitropolitul Țării Românești', url: 'https://doxologia.ro/condacul-sfantului-ierarh-martir-antim-ivireanul-mitropolitul-tarii-romanesti', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Mucenicii Tăi, Doamne, întru nevoinţele lor, cununile nestricăciunii au dobândit de la Tine, Dumnezeul nostru. Că având tăria Ta, pe chinuitori au învins; zdrobit-au şi ale demonilor neputincioase îndrăzniri. Pentru rugăciunile lor, mântuieşte sufletele noastre, Hristoase Dumnezeule.',
          source: { text: 'Doxologia — Troparul Sfinţilor Mucenici Calistrat şi Ghimnasie şi al celor împreună cu dânşii', url: 'https://doxologia.ro/troparul-sfintilor-mucenici-calistrat-ghimnasie-al-celor-impreuna-cu-dansii', year: 2026 },
        },
      ],
    },
  },
  '2026-09-28': {
    russian: {
      readings: [r('Epistle', 'Ephesians 4:25-32'), r('Gospel', 'Matthew 23:13-22'), r('Epistle (Вмч)', '2 Timothy 2:1-10'), r('Gospel (Вмч)', 'Matthew 10:16-22')],
      title: 'Седмица 18-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 15 сентября ст. ст. — Седмица 18-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260915.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 4:25-32'), r('Evanghelie', 'Luke 3:19-22')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 28 septembrie', url: 'https://doxologia.ro/28-septembrie' },
    },
  },
  '2026-09-29': {
    russian: {
      readings: [r('Epistle', 'Ephesians 5:20-26'), r('Gospel', 'Matthew 23:23-28'), r('Epistle (Вмц)', '2 Corinthians 6:1-10'), r('Gospel (Вмц)', 'Luke 7:36-50')],
      title: 'Седмица 18-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 16 сентября ст. ст. — Седмица 18-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260916.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 5:20-25'), r('Evanghelie', 'Luke 3:23-38; 4:1')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 29 septembrie', url: 'https://doxologia.ro/29-septembrie' },
    },
  },
  '2026-09-30': {
    russian: {
      readings: [r('Epistle', 'Ephesians 5:25-33'), r('Gospel', 'Matthew 23:29-39')],
      title: 'Седмица 18-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 17 сентября ст. ст. — Седмица 18-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260917.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 5:25-33'), r('Evanghelie', 'Luke 4:1-15')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 30 septembrie', url: 'https://doxologia.ro/30-septembrie' },
    },
  },
  '2026-10-01': {
    russian: {
      readings: [r('Epistle', 'Ephesians 5:33-6:9'), r('Gospel', 'Matthew 24:13-28')],
      title: 'Седмица 18-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 18 сентября ст. ст. — Седмица 18-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260918.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 3:23-29; 4:1-5'), r('Evanghelie', 'Luke 10:38-42; 11:27-28')],
      title: 'Acoperământul Maicii Domnului',
      fastingNote: null,
      source: { text: 'doxologia.ro, 1 octombrie', url: 'https://doxologia.ro/1-octombrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 3',
          text: 'Apostole Sfinte Anania, roagă pe Milostivul Dumnezeu, ca să dăruiască iertare de greşeli sufletelor noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Apostol Anania, unul din cei şaptezeci', url: 'https://doxologia.ro/troparul-sfantului-apostol-anania-unul-din-cei-saptezeci', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 8',
          text: 'Întru tine, părinte, cu osârdie s-a mântuit cel după chip; că luând crucea ai urmat lui Hristos; şi lucrând ai învăţat să nu se uite la trup, că este trecător; ci, să poarte grijă de suflet, de lucrul cel nemuritor. Pentru aceasta şi cu îngerii împreună se bucură, Preacuvioase Părinte Roman, duhul tău.',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios Roman Melodul', url: 'https://doxologia.ro/troparul-sfantului-cuvios-roman-melodul', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Astăzi, poporul cel binecredincios, luminat prăznuim, umbriţi fiind prin venirea ta, Maica lui Dumnezeu şi cău­tând către Preacinstită Icoana ta, cu umilinţă grăim: acoperă-ne pe noi cu Cinstitul tău Acoperă­mânt şi ne scapă de tot răul, rugând pe Fiul tău, Hristos Dumnezeul nostru, să mântu­iască sufletele noastre.',
          source: { text: 'Doxologia — Tropar la Praznicul Acoperământului Maicii Domnului', url: 'https://doxologia.ro/tropar-la-praznicul-acoperamantului-maicii-domnului', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 1',
          text: 'Povățuitori sihaștrilor, ocrotitori ai celor din nevoi și celor mâhniți mângâietori, Sfinților Cuvioși Iosif și Chiriac cei ce ați dobândit rugăciunea cea de foc și vase alese a Sfântului Duh v-ați făcut, rugați-vă lui Dumnezeu să dăruiască sufletelor noastre pace și mare milă!',
          source: { text: 'Doxologia — Troparul Sfinților Cuvioși Iosif și Chiriac de la Bisericani', url: 'https://doxologia.ro/troparul-sfintilor-cuviosi-iosif-chiriac-de-la-bisericani', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Cetele îngereşti Ţie Îţi dăruiesc cununile laudelor cereşti, Iar glasul cântăreţului Tău îţi împleteşte măriri dumnezeieşti, Cu rugăciunile aceluia, caută cu blândeţe spre a noastră nepricepere, Şi prin pustiul acestei lumi dă-ne Stăpână, duhovnicească mergere.',
          source: { text: 'Doxologia — Troparul icoanei Maicii Domnului Cucuzeliţa', url: 'https://doxologia.ro/troparul-icoanei-maicii-domnului-cucuzelita', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2',
          text: 'Pe cea întru rugăciuni... Cel ce întru rugăciuni eşti cald folositor şi celor ce cer, eşti grabnic ascultător, primeşte rugăciunea noastră, Sfinte Apostole Anania şi te roagă lui Hristos să ne miluiască pe noi, Cel Ce Unul este întru Sfinţi Preamărit.',
          source: { text: 'Doxologia — Condacul Sfântului Apostol Anania, unul din cei şaptezeci', url: 'https://doxologia.ro/condacul-sfantului-apostol-anania-unul-din-cei-saptezeci', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 8',
          text: 'Cu Dumnezeieştile fapte bu­ne ale Duhului, din tinereţe înfrumuseţându-te, Sfinte Preacuvioase Părinte Roman, Preaînţelepte, cinstitei Biserici a lui Hristos înfrumuseţător ai fost; căci cu cântări frumoase ai în­frumuseţat-o, fericite. Pentru aceea te rugăm: dăruieşte celor ce doresc Dumnezeieştile tale da­ruri, ca să strigăm ţie: bucură-te, părinte preafericite, podoaba Bisericii.',
          source: { text: 'Doxologia — Condacul Sfântului Cuvios Roman Melodul', url: 'https://doxologia.ro/condacul-sfantului-cuvios-roman-melodul', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Fecioara astăzi... Fecioara astăzi, înainte stă în Biserică şi cu cetele sfinţilor, nevăzut se roagă lui Dum­nezeu, îngerii cu ierarhii se în­chină şi Apostolii cu proorocii dănţuiesc; că pentru noi roagă Născătoarea de Dumnezeu pe Dumnezeu Cel mai înainte de veci.',
          source: { text: 'Doxologia — Condac la Praznicul Acoperământului Maicii Domnului', url: 'https://doxologia.ro/condac-la-praznicul-acoperamantului-maicii-domnului', year: 2026 },
        },
      ],
    },
  },
  '2026-10-02': {
    russian: {
      readings: [r('Epistle', 'Ephesians 6:18-24'), r('Gospel', 'Matthew 24:27-33; 24:42-51')],
      title: 'Седмица 18-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 19 сентября ст. ст. — Седмица 18-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260919.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 6:18-24'), r('Evanghelie', 'Luke 4:22-30')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 2 octombrie', url: 'https://doxologia.ro/2-octombrie' },
    },
  },
  '2026-10-03': {
    russian: {
      readings: [r('Epistle (Субботы по Воздвижении)', '1 Corinthians 1:26-29'), r('Gospel (Субботы по Воздвижении)', 'John 8:21-30'), r('Epistle (Ряд. (под зачало))', '1 Corinthians 15:39-45'), r('Gospel (Ряд. (под зачало))', 'Matthew 19:3-12'), r('Epistle (Вмч. или свв)', 'Ephesians 6:10-17'), r('Gospel (Вмч. или свв)', 'Luke 21:12-19')],
      title: 'Седмица 18-я по Пятидесятнице. Суббота по Воздвижении',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 20 сентября ст. ст. — Седмица 18-я по Пятидесятнице. Суббота по Воздвижении', url: 'https://days.pravoslavie.ru/Days/20260920.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Corinthians 15:39-45'), r('Evanghelie', 'Luke 4:31-36')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 3 octombrie', url: 'https://doxologia.ro/3-octombrie' },
    },
  },
  '2026-10-04': {
    russian: {
      readings: [r('Epistle (Недели по Воздвижении)', 'Galatians 2:16-20'), r('Gospel (Недели по Воздвижении)', 'Mark 8:34-9:1'), r('Epistle (Ряд)', '2 Corinthians 9:6-11'), r('Gospel (Ряд)', 'Matthew 18:23-35'), r('Epistle (Свт)', 'Hebrews 7:26-8:2'), r('Gospel (Свт)', 'John 10:9-16')],
      title: 'Неделя 18-я по Пятидесятнице, по Воздвижении',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 21 сентября ст. ст. — Неделя 18-я по Пятидесятнице, по Воздвижении', url: 'https://days.pravoslavie.ru/Days/20260921.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 11:31-33; 12:1-9'), r('Evanghelie', 'Luke 6:31-36')],
      title: 'Duminica a 19-a după Rusalii (Predica de pe munte – Iubirea vrăjmașilor)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 4 octombrie', url: 'https://doxologia.ro/4-octombrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Bunătate învăţându-te şi îmbărbătându-te întru toate, cu bună cunoştinţă, ca un sfinţitor cuvios îmbrăcându-te, ai scos din vasul alegerii cele negrăite; şi credinţa păzind, stadiul întocmai ai săvârşit, Sfinţite Mucenice Ierotei, roagă-te lui Hristos Dumnezeu, să mântuiască sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Sfinţit Mucenic Ierotei, Episcopul Atenei', url: 'https://doxologia.ro/troparul-sfantului-sfintit-mucenic-ierotei-episcopul-atenei', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Cu întreită cunună încununându-te a preoției Părinte, a bunei mărturisiri și cu cea a cuvântării de Dumnezeu, ca un soare strălucești, învățându-ne a cinsti Treimea cea de o ființă, la care Sfinte Dumitru totdeauna pomenește-ne.',
          source: { text: 'Doxologia — Troparul Sfântului Preot Mărturisitor Dumitru Stăniloae', url: 'https://doxologia.ro/troparul-sfantului-preot-marturisitor-dumitru-staniloae', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 8',
          text: 'Apărătoare Doamnă... Pe tine, ierarhul Atenei, te lăudăm, ca unii care ne-am învăţat prin tine cele minunate şi negrăite; că te-ai arătat cu­vântător de cântare de Dumnezeu primit. Roagă-te, dar, Preafericite Părinte Ierotei, să ne curăţim de toate greşelile, ca să strigăm: bucură-te, părinte, de Dumnezeu înţelepţite.',
          source: { text: 'Doxologia — Condacul Sfântului Sfinţit Mucenic Ierotei, Episcopul Atenei', url: 'https://doxologia.ro/condacul-sfantului-sfintit-mucenic-ierotei-episcopul-atenei', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Cel Ce Te-ai Înălţat pe Cruce... Ca un stâlp neclătinat, Sfinte Ierarhe Iero­tei, nu te-ai temut de îngrozirile vrăjmaşilor, ci ai surpat teme­iul înşelăciunii, întărindu-te ca pe o piatră cinstită, părinte. Pentru acesta, ca pe un birui­tor, Stăpânul te încununează cu dreapta cea Dumnezeiască şi În­cepătoare de viaţă; pe care roagă-L pentru noi toţi.',
          source: { text: 'Doxologia — Condacul Sfântului Sfinţit Mucenic Ierotei, Episcopul Atenei', url: 'https://doxologia.ro/condacul-sfantului-sfintit-mucenic-ierotei-episcopul-atenei-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: '',
          text: 'Glas 8 Podobie: Apărătoare Doamnă... Pe odraslirea cea în Domnul a românilor, nou-arătatul mare dascăl al Bisericii și înțelept tălcuitor al Filocaliei, pe Părintele Dumitru cu evlavie să-l cinstim după dreptate, credincioșilor, strigând: Bucură-te, Sfinte Dumitru, de Dumnezeu cuvântătorule!',
          source: { text: 'Doxologia — Condacul Sfântului Preot Mărturisitor Dumitru Stăniloae', url: 'https://doxologia.ro/condacul-sfantului-preot-marturisitor-dumitru-staniloae', year: 2026 },
        },
      ],
    },
  },
  '2026-10-05': {
    russian: {
      readings: [r('Epistle', 'Philippians 1:1-7'), r('Gospel', 'Luke 3:19-22'), r('Epistle (Сщмч)', 'Hebrews 4:14-5:6'), r('Gospel (Сщмч)', 'John 10:9-16')],
      title: 'Седмица 19-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 22 сентября ст. ст. — Седмица 19-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260922.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Philippians 1:1-7'), r('Evanghelie', 'Luke 4:38-44')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 5 octombrie', url: 'https://doxologia.ro/5-octombrie' },
    },
  },
  '2026-10-06': {
    russian: {
      readings: [r('Epistle', 'Philippians 1:8-14'), r('Gospel', 'Luke 3:23-4:1'), r('Epistle (Предтечи)', 'Galatians 4:22-31'), r('Gospel (Предтечи)', 'Luke 1:5-25')],
      title: 'Седмица 19-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 23 сентября ст. ст. — Седмица 19-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260923.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Philippians 1:8-14'), r('Evanghelie', 'Luke 5:12-16')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 6 octombrie', url: 'https://doxologia.ro/6-octombrie' },
    },
  },
  '2026-10-07': {
    russian: {
      readings: [r('Epistle', 'Philippians 1:12-20'), r('Gospel', 'Luke 4:1-15'), r('Epistle (и за четверг (под зачало))', 'Philippians 1:20-27'), r('Gospel (и за четверг (под зачало))', 'Luke 4:16-22'), r('Epistle (Первомц)', '2 Timothy 3:10-15'), r('Gospel (Первомц)', 'Matthew 25:1-13')],
      title: 'Седмица 19-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 24 сентября ст. ст. — Седмица 19-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260924.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Philippians 1:12-19'), r('Evanghelie', 'Luke 5:33-39')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 7 octombrie', url: 'https://doxologia.ro/7-octombrie' },
    },
  },
  '2026-10-08': {
    russian: {
      readings: [r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Luke 6:17-23')],
      title: 'Седмица 19-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 25 сентября ст. ст. — Седмица 19-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260925.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Philippians 1:20-27'), r('Evanghelie', 'Luke 6:12-19')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 8 octombrie', url: 'https://doxologia.ro/8-octombrie' },
    },
  },
  '2026-10-09': {
    russian: {
      readings: [r('Epistle (Ап)', '1 John 4:12-19'), r('Gospel (Ап)', 'John 19:25-27; 21:24-25')],
      title: 'Седмица 19-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 26 сентября ст. ст. — Седмица 19-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260926.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Philippians 1:27-30; 2:1-4'), r('Evanghelie', 'Luke 6:17-23')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 9 octombrie', url: 'https://doxologia.ro/9-octombrie' },
    },
  },
  '2026-10-10': {
    russian: {
      readings: [r('Epistle', 'Philippians 1:27-2:4'), r('Gospel', 'Luke 4:22-30'), r('Epistle (за пятницу и за субботу)', '1 Corinthians 15:58-16:3'), r('Gospel (за пятницу и за субботу)', 'Luke 4:31-36')],
      title: 'Седмица 19-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 27 сентября ст. ст. — Седмица 19-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260927.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Corinthians 15:58; 16:1-3'), r('Evanghelie', 'Luke 5:17-26')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 10 octombrie', url: 'https://doxologia.ro/10-octombrie' },
    },
  },
  '2026-10-11': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 11:31-12:9'), r('Gospel', 'Luke 5:1-11'), r('Epistle (Прп)', '2 Corinthians 4:6-15'), r('Gospel (Прп)', 'Luke 6:17-23')],
      title: 'Неделя 19-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 28 сентября ст. ст. — Неделя 19-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260928.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 2:16-20'), r('Apostol', 'Titus 3:8-15'), r('Evanghelie', 'Luke 8:5-15'), r('Evanghelie', 'John 17:1-13')],
      title: 'Duminica a 21-a după Rusalii (Pilda semănătorului - a Sfinților Părinți de la Sinodul al VII-lea Ecumenic)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 11 octombrie', url: 'https://doxologia.ro/11-octombrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 3',
          text: 'Apostole Sfinte Filip, roagă pe Milostivul Dumnezeu, ca să dăruiască iertare de greşeli sufletelor noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Apostol Filip, unul din cei 7 diaconi', url: 'https://doxologia.ro/troparul-sfantului-apostol-filip-unul-din-cei-7-diaconi', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 8',
          text: 'Îndreptătorule al Ortodoxiei, învăţătorule al dreptei cinstiri de Dumnezeu şi al curăţiei şi luminătorule al lumii, podoaba călugărilor cea de Dumnezeu insuflată Sfinte Părinte Teofan, înţelepte, cu învăţăturile tale pe toţi i-ai luminat. Alăută duhovnicească, roagă-te lui Hristos Dumnezeu ca să mântuiască sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Ierarh Teofan Mărturisitorul, Episcopul Niceei', url: 'https://doxologia.ro/troparul-sfantului-ierarh-teofan-marturisitorul-episcopul-niceei', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 8',
          text: 'Preaproslăvit eşti, Hristoase, Dumnezeul nostru, Cel Ce lumi­nători pe pământ pe Părinţii noştri i-ai întemeiat şi printr-înşii la adevărata credinţă pe noi toţi ne-ai îndreptat, Mult Îndurate, Slavă Ţie.',
          source: { text: 'Doxologia — Troparul Sfinţilor Părinţi de la Sinodul al VII-lea Ecumenic', url: 'https://doxologia.ro/troparul-sfintilor-parinti-de-la-sinodul-al-vii-lea-ecumenic', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Arătatu-Te-ai astăzi... Următor făcându-te învăţă­torului tău, Apostole, pentru Dânsul cu credinţă ai slujit la lucrarea Sfinţilor Săi. Pentru aceea toţi credincioşii te fericim.',
          source: { text: 'Doxologia — Condacul Sfântului Apostol Filip, unul din cei 7 diaconi', url: 'https://doxologia.ro/condacul-sfantului-apostol-filip-unul-din-cei-7-diaconi', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 1',
          text: 'Ceata Dumnezeiască... Frumos este rodul buzelor tale, părinte, iar viaţa dulce ca fagurele de miere, s-a arătat acum, fericite, Bisericii lui Hristos; că de tine s-au temut şi mulţimile demonilor şi s-au ru­şinat bârfitoarele limbi ale ereticilor, de tine, cel ce credinţa ai păzit.',
          source: { text: 'Doxologia — Condacul Sfântului Ierarh Teofan Mărturisitorul, Episcopul Niceei', url: 'https://doxologia.ro/condacul-sfantului-ierarh-teofan-marturisitorul-episcopul-niceei', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2',
          text: 'Chipul cel făcut de mână... Fiul, Cel Ce din Tatăl a Stră­lucit de negrăit, din femeie S-a Născut Îndoit în Fire; pe Care, văzându-L, nu ne lepădăm de închipuirea Chipului; ci, pe Acesta, cu bună credinţă însemnând-L, Îl cinstim cu cre­dinţă. Pentru aceasta, ţinând credinţa cea adevă­rată, Biserica, sărută Icoana înomenirii lui Hristos.',
          source: { text: 'Doxologia — Condacul Sfinţilor Părinţi de la Sinodul al VII-lea Ecumenic', url: 'https://doxologia.ro/condacul-sfintilor-parinti-de-la-sinodul-al-vii-lea-ecumenic', year: 2026 },
        },
      ],
    },
  },
  '2026-10-12': {
    russian: {
      readings: [r('Epistle', 'Philippians 2:12-16'), r('Gospel', 'Luke 4:37-44'), r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Luke 6:17-23')],
      title: 'Седмица 20-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 29 сентября ст. ст. — Седмица 20-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260929.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Philippians 2:12-16'), r('Evanghelie', 'Luke 6:24-30')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 12 octombrie', url: 'https://doxologia.ro/12-octombrie' },
    },
  },
  '2026-10-13': {
    russian: {
      readings: [r('Epistle', 'Philippians 2:16-23'), r('Gospel', 'Luke 5:12-16'), r('Epistle (и за среду (под зачало))', 'Philippians 2:24-30'), r('Gospel (и за среду (под зачало))', 'Luke 5:33-39'), r('Epistle (Свт)', 'Hebrews 7:26-8:2'), r('Gospel (Свт)', 'John 10:9-16')],
      title: 'Седмица 20-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 30 сентября ст. ст. — Седмица 20-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20260930.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Philippians 2:16-23'), r('Evanghelie', 'Luke 6:37-45')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 13 octombrie', url: 'https://doxologia.ro/13-octombrie' },
    },
  },
  '2026-10-14': {
    russian: {
      readings: [r('Epistle (Богородицы)', 'Hebrews 9:1-7'), r('Gospel (Богородицы)', 'Luke 10:38-42; 11:27-28')],
      title: 'Седмица 20-я по Пятидесятнице',
      fastingNote: 'День постный; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Седмица 20-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261001.html' },
      // Совершается служба великому празднику — the calendar's own sign for the day: T6
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 3',
          text: 'Апостоле святый Анание,/ моли Милостиваго Бога/ да прегрешений оставление// подаст душам нашим.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Тропарь апостола Анании', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 2',
          text: 'В молитвах теплейший заступниче/ и просящим скорейший послушателю,/ прими моление, Анание, наше/ и Христа моли помиловати ны,// Единаго во святых Почивающаго.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Кондак апостола Анании', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 8',
          text: 'В тебе, отче, известно спасеся еже по образу:/ приим бо крест, последовал еси Христу/ и, действуя, учил еси презирати убо плоть, преходит бо,/ прилежати же о души вещи безсмертней./ Темже и со Ангелы срадуется, преподобне Романе, дух твой.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Тропарь преподобнаго Романа Сладкопевца', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 8',
          text: 'Божественными добродетельми духа/ измлада украсився, Романе премудре,/ Церкви Христове пречестное украшение был еси:/ пением бо прекрасным украсив ю, блаженне./ Тем молим тя: подаждь желающим Божественнаго дарования твоего,/ яко да вопием ти:/ радуйся, отче преблаженне, красото церковная.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Кондак преподобнаго Романа Сладкопевца', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'От юности твоея весь Богу поработился еси, блаженне, / и Того ради любве отечество и род оставил еси, / в пустыню вселився / и в ней жестокое житие показав, / чудес дарования от Господа приял еси, / Савво преподобне, / моли Христа Бога спастися душам нашим.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Тропарь преподобного Саввы Вишерского, Новгородского', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 8',
          text: 'Отечества, преподобне, удалився/ и вселився в пустыню,/ и тамо на столп вшед, идеже жестокое житие показал еси,/ и многих житием удивив,/ отнюдуже дарование чудес от Христа приял еси,/ поминай нас, чествующих память твою, да зовем ти:/ радуйся, Савво, отче наш.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Кондак преподобного Саввы Вишерского, Новгородского', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Днесь светло красуется Богоспасаемый град Псков/ и вся страна Российская/ пришествием Матери Бога Вышняго/ на избавление града сего от варварскаго пленения./ Услыша плач и слезы раб Своих,/ скоро приклонися на мольбу к Сыну Своему и Богу нашему,/ и молением Своим гнев Божий укроти и весь мир просвети,/ и град сей от скорби на радость премени./ О, дивному знамению,/ како Пресвятая Владычице прииде на воздусе и в церковь Свою/ и на забрало града Пскова / и призва угодников своих, благоверных князей,/ и поноси в людех беззаконие./ И Своею пречистою рукою указоваше на поганаго злаго варвара/ и его совет на разрушение./ Возвеселися, Богоспасаемый граде Пскове/ и все Православие, имеюще такову Заступницу непобориму./ Днесь притецем, вернии,/ в дом спасительный Владычицы Богородицы,/ светло празднуя,/ и ко святому Ея образу со слезами припадем, вопиюще и глаголюще:/ О Всемилостивая Госпоже Владычице Богородцие,/ молися Сыну Своему Христу Богу нашему/ спасти православныя люди и град сей избавити от огненнаго запаления/ и от нахождения поганых и междоусобныя брани,/ и спасти души наша яко Милосердая.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Тропарь Божией Матери пред иконой Ее Псково-Покровской', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 8',
          text: 'Заступнице христиан, Предстательнице граду нашему Пскову,/ услыши молитву раб Своих, Владычице Богородице,/ и скорым Своим пришествием светолучными зарями раб Своих возвесели/ и торжествовати устрой, в беде и в сетовании возвесели,/ и завеща во граде молити Святую Троицу,/ и Сама обещася молити Ю./ О, преславному чудесе,/ како Небесная Царице к земным прийде избавити рабы Своя погибающия./ О, дивному знамению,/ како вразумляют; е рабы Своя, како бы умолити Святую Троицу./ О, Всемилостивая Владычице Богородице,/ аще не бы Ты предстояла, молящи за ны,/ кто бы нас избавил от толикия беды,/ яко не имамы иныя помощи и надежды, разве Тебе, Владычице,/ Твой бо раби, да не погибнем,/ и потщися на умоление раб своих присно,/ Богородице, чтущих Тя.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Кондак Божией Матери пред иконой Ее Псково-Покровской', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Днесь, благовернии людие, светло празднуем,/ осеняеми Твоим, Богомати, пришествием,/ и к Твоему взирающе пречистому образу, умильно глаголем:/ покрый нас честным Твоим Покровом/ и избави нас от всякаго зла,/ молящи Сына Твоего, Христа Бога нашего,// спасти души наша.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Тропарь Покрова Пресвятой Богородицы', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 3',
          text: 'Дева днесь предстоит в церкви/ и с лики святых невидимо за ны молится Богу,/ Ангели со архиереи покланяются,/ апостоли же со пророки ликовствуют:// нас бо ради молит Богородица Превечнаго Бога.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Кондак Покрова Пресвятой Богородицы', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 8',
          text: 'Днесь празднует Святая Церковь, чтущи Столп Животворящий и Хитон Господень, иже Свет просияша во вся концы вселенныя и жизни святое миро источиша. Сего ради Всесвятей Богоматери и рождшемуся от Нея Христу покланяемся во спасение душ наших.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Тропарь Животворящему Столпу и Хитону Господню', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 8',
          text: 'В Горней борьбе за мя непобедимый помощниче, Столпе святый и Богоосиянный, мир просвещаяй, яко молния освещаяй Небесноподобную пелену — свыше истканный Хитон Господень, украшаяй же воспевающия и празднующия торжество твое, даруй сугубое озарение и радость поющим ти: радуйся, Столпе, Богом осиянный.',
          source: { text: 'days.pravoslavie.ru, 1 октября ст. ст. — Кондак Животворящему Столпу и Хитону Господню', url: 'https://days.pravoslavie.ru/Days/20261001.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 3:17-18; 4:6-10'), r('Evanghelie', 'Mark 8:34-38; 9:1')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 14 octombrie', url: 'https://doxologia.ro/14-octombrie' },
    },
  },
  '2026-10-15': {
    russian: {
      readings: [r('Epistle', 'Philippians 3:1-8'), r('Gospel', 'Luke 6:12-19'), r('Epistle (Свв)', '1 Timothy 1:12-17'), r('Gospel (Свв)', 'John 10:9-16')],
      title: 'Седмица 20-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 2 октября ст. ст. — Седмица 20-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261002.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Philippians 3:1-8'), r('Evanghelie', 'Luke 7:17-30')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 15 octombrie', url: 'https://doxologia.ro/15-octombrie' },
    },
  },
  '2026-10-16': {
    russian: {
      readings: [r('Epistle', 'Philippians 3:8-19'), r('Gospel', 'Luke 6:17-23'), r('Epistle (Сщмч. Дионисия)', 'Acts 17:16-34'), r('Gospel (Сщмч. Дионисия)', 'Matthew 13:44-54')],
      title: 'Седмица 20-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 3 октября ст. ст. — Седмица 20-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261003.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Philippians 3:8-19'), r('Evanghelie', 'Luke 7:31-35')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 16 octombrie', url: 'https://doxologia.ro/16-octombrie' },
    },
  },
  '2026-10-17': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 1:8-11'), r('Gospel', 'Luke 5:17-26')],
      title: 'Седмица 20-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 4 октября ст. ст. — Седмица 20-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261004.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 1:8-11'), r('Evanghelie', 'Luke 5:27-32')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 17 octombrie', url: 'https://doxologia.ro/17-octombrie' },
    },
  },
  '2026-10-18': {
    russian: {
      readings: [r('Epistle', 'Galatians 1:11-19'), r('Gospel', 'Luke 6:31-36'), r('Epistle (Свтт)', 'Hebrews 13:17-21'), r('Gospel (Свтт)', 'Matthew 5:14-19')],
      title: 'Неделя 20-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 5 октября ст. ст. — Неделя 20-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261005.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 1:11-19'), r('Evanghelie', 'Luke 7:11-16')],
      title: 'Duminica a 20-a după Rusalii (Învierea fiului văduvei din Nain)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 18 octombrie', url: 'https://doxologia.ro/18-octombrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 3',
          text: 'Apostole Sfinte şi Evanghe­liste Luca, roagă pe Milostivul Dumnezeu, ca să dea iertare de greşeli sufletelor noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Apostol şi Evanghelist Luca', url: 'https://doxologia.ro/troparul-sfantului-apostol-evanghelist-luca', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 4 Fiind ucenic de taină al Stăpânului Iisus, iubitorul de oameni, de Dumnezeu grăitorule, Luca, cel ce ești scăparea credincioșilor în boli cumplite, primește-ne cererile și vindecă degrab neputințele trupului și toate durerile sufletului, ca să cinstim totdeauna pomenirea ta și să aducem laudă Domnului.',
          source: { text: 'Doxologia — Troparul Sfântului Apostol și Evanghelist Luca', url: 'https://doxologia.ro/troparul-sfantului-apostol-evanghelist-luca-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 1 Pe Apostolul Luca, cel împreună călător cu marele Pavel și scriitorul cel insuflat de Dumnezeu al Evangheliei a treia, să-l cinstim în cântări, credincioșilor, ca pe un vrednic lucrător al lui Hristos, că, fiind strălucit cu lumina harului, a dăruit lumină lumii, scriind parabolele cele minunate și istorisind întemeierea Bisericii prin venirea Duhului Sfânt.',
          source: { text: 'Doxologia — Troparul Sfântului Apostol și Evanghelist Luca', url: 'https://doxologia.ro/troparul-sfantului-apostol-evanghelist-luca-1', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Arătat-Te-ai astăzi lumii... Ucenic făcându-te Cuvântu­lui lui Dumnezeu, împreună cu Apostolul Pavel ai luminat tot pământul şi negura ai gonit, scriind Dum­nezeiască Evanghelie a lui Hristos, Dumnezeul nostru.',
          source: { text: 'Doxologia — Condacul Sfântului Apostol şi Evanghelist Luca', url: 'https://doxologia.ro/condacul-sfantului-apostol-evanghelist-luca', year: 2026 },
        },
      ],
    },
  },
  '2026-10-19': {
    russian: {
      readings: [r('Epistle', 'Philippians 4:10-23'), r('Gospel', 'Luke 6:24-30'), r('Epistle (Ап)', '1 Corinthians 4:9-16'), r('Gospel (Ап)', 'John 20:19-31')],
      title: 'Седмица 21-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 6 октября ст. ст. — Седмица 21-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261006.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Philippians 4:10-23'), r('Evanghelie', 'Luke 7:36-50')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 19 octombrie', url: 'https://doxologia.ro/19-octombrie' },
    },
  },
  '2026-10-20': {
    russian: {
      readings: [r('Epistle', 'Colossians 1:1-2; 1:7-11'), r('Gospel', 'Luke 6:37-45'), r('Epistle (Мчч)', 'Hebrews 11:33-12:2'), r('Gospel (Мчч)', 'Luke 21:12-19')],
      title: 'Седмица 21-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 7 октября ст. ст. — Седмица 21-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261007.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Colossians 1:1-11'), r('Evanghelie', 'Luke 8:1-3')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 20 octombrie', url: 'https://doxologia.ro/20-octombrie' },
    },
  },
  '2026-10-21': {
    russian: {
      readings: [r('Epistle', 'Colossians 1:18-23'), r('Gospel', 'Luke 6:46-7:1')],
      title: 'Седмица 21-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 8 октября ст. ст. — Седмица 21-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261008.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Colossians 1:18-23'), r('Evanghelie', 'Luke 8:22-25')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 21 octombrie', url: 'https://doxologia.ro/21-octombrie' },
    },
  },
  '2026-10-22': {
    russian: {
      readings: [r('Epistle', 'Colossians 1:24-29'), r('Gospel', 'Luke 7:17-30'), r('Epistle (Ап)', '1 Corinthians 4:9-16'), r('Gospel (Ап)', 'Luke 10:16-21')],
      title: 'Седмица 21-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 9 октября ст. ст. — Седмица 21-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261009.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Colossians 1:24-29; 2:1'), r('Evanghelie', 'Luke 9:7-11')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 22 octombrie', url: 'https://doxologia.ro/22-octombrie' },
    },
  },
  '2026-10-23': {
    russian: {
      readings: [r('Epistle', 'Colossians 2:1-7'), r('Gospel', 'Luke 7:31-35'), r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Luke 6:17-23')],
      title: 'Седмица 21-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 10 октября ст. ст. — Седмица 21-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261010.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Colossians 2:1-7'), r('Evanghelie', 'Luke 9:12-18')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 23 octombrie', url: 'https://doxologia.ro/23-octombrie' },
    },
  },
  '2026-10-24': {
    russian: {
      readings: [r('Epistle (Ап)', 'Acts 8:26-39'), r('Gospel (Ап)', 'Luke 10:1-21'), r('Epistle (Ряд)', '2 Corinthians 3:12-18'), r('Gospel (Ряд)', 'Luke 5:27-32')],
      title: 'Седмица 21-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 11 октября ст. ст. — Седмица 21-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261011.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 3:12-18'), r('Evanghelie', 'Luke 6:1-10')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 24 octombrie', url: 'https://doxologia.ro/24-octombrie' },
    },
  },
  '2026-10-25': {
    russian: {
      readings: [r('Epistle', 'Galatians 2:16-20'), r('Gospel', 'Luke 7:11-16'), r('Epistle (Свв. отцов)', 'Hebrews 13:7-16'), r('Gospel (Свв. отцов)', 'John 17:1-13')],
      title: 'Неделя 21-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 12 октября ст. ст. — Неделя 21-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261012.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 2:4-10'), r('Evanghelie', 'Luke 8:26-39')],
      title: 'Duminica a 23-a după Rusalii (Vindecarea demonizatului din ținutul Gherghesenilor)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 25 octombrie', url: 'https://doxologia.ro/25-octombrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Mucenicii Tăi, Doamne, întru nevoinţele lor, cununile nesctricăciunii au dobândit de la Tine, Dumnezeul nostru. Că având tăria Ta, pe chinuitori au învins; zdrobit-au şi ale demonilor neputincioase îndrăzniri. Pentru rugăciunile lor, mântuieşte sufletele noastre, Hristoase Dumnezeule.',
          source: { text: 'Doxologia — Troparul Sfinţilor Mucenici Marcian şi Martirie', url: 'https://doxologia.ro/troparul-sfintilor-mucenici-marcian-martirie', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Cel Ce Te-ai Înălţat pe Cruce... Cu nevoinţă bună v-aţi ne­voit din pruncie, Sfinte Marcian împreună cu Înţeleptul Martirie şi aţi surpat pe vicleanul Arie, păzind nevătămată credinţa creştină, urmând Apostolului Pavel Înţeleptului vostru învăţător. Pentru aceasta, împreună cu dânsul aţi aflat Viaţa, ca nişte apărători ai Preasfintei Treimi, preaaleşi.',
          source: { text: 'Doxologia — Condacul Sfinţilor Mucenici Marcian şi Martirie', url: 'https://doxologia.ro/condacul-sfintilor-mucenici-marcian-martirie', year: 2026 },
        },
      ],
    },
  },
  '2026-10-26': {
    russian: {
      readings: [r('Epistle', 'Colossians 2:13-20'), r('Gospel', 'Luke 7:36-50'), r('Epistle (Богородицы)', 'Philippians 2:5-11'), r('Gospel (Богородицы)', 'Luke 10:38-42; 11:27-28')],
      title: 'Седмица 22-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 13 октября ст. ст. — Седмица 22-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261013.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Timothy 2:1-10'), r('Apostol', 'Hebrews 12:11-13; 12:25-27'), r('Evanghelie', 'John 15:17-27; 16:1-2'), r('Evanghelie', 'Matthew 8:23-27')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 26 octombrie', url: 'https://doxologia.ro/26-octombrie' },
    },
  },
  '2026-10-27': {
    russian: {
      readings: [r('Epistle', 'Colossians 2:20-3:3'), r('Gospel', 'Luke 8:1-3')],
      title: 'Седмица 22-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 14 октября ст. ст. — Седмица 22-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261014.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 4:7-13'), r('Evanghelie', 'Matthew 11:27-30')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 27 octombrie', url: 'https://doxologia.ro/27-octombrie' },
    },
  },
  '2026-10-28': {
    russian: {
      readings: [r('Epistle', 'Colossians 3:17-4:1'), r('Gospel', 'Luke 8:22-25'), r('Epistle (Свт)', 'Ephesians 6:10-17'), r('Gospel (Свт)', 'Luke 12:8-12')],
      title: 'Седмица 22-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 15 октября ст. ст. — Седмица 22-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261015.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Colossians 3:17-20; 4:1-2'), r('Evanghelie', 'Luke 9:44-50')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 28 octombrie', url: 'https://doxologia.ro/28-octombrie' },
    },
  },
  '2026-10-29': {
    russian: {
      readings: [r('Epistle', 'Colossians 4:2-9'), r('Gospel', 'Luke 9:7-11'), r('Epistle (Мч)', '2 Timothy 2:1-10'), r('Gospel (Мч)', 'Matthew 27:33-54')],
      title: 'Седмица 22-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 16 октября ст. ст. — Седмица 22-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261016.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Colossians 4:2-9'), r('Evanghelie', 'Luke 9:49-56')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 29 octombrie', url: 'https://doxologia.ro/29-octombrie' },
    },
  },
  '2026-10-30': {
    russian: {
      readings: [r('Epistle', 'Colossians 4:10-18'), r('Gospel', 'Luke 9:12-18')],
      title: 'Седмица 22-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 17 октября ст. ст. — Седмица 22-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261017.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Colossians 4:10-18'), r('Evanghelie', 'Luke 10:1-15')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 30 octombrie', url: 'https://doxologia.ro/30-octombrie' },
    },
  },
  '2026-10-31': {
    russian: {
      readings: [r('Epistle (Ап)', 'Colossians 4:5-9; 4:14; 4:18'), r('Gospel (Ап)', 'Luke 10:16-21'), r('Epistle (Ряд)', '2 Corinthians 5:1-10'), r('Gospel (Ряд)', 'Luke 6:1-10')],
      title: 'Седмица 22-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 18 октября ст. ст. — Седмица 22-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261018.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 5:1-10'), r('Evanghelie', 'Luke 7:1-10')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 31 octombrie', url: 'https://doxologia.ro/31-octombrie' },
    },
  },
  '2026-11-01': {
    russian: {
      readings: [r('Epistle', 'Galatians 6:11-18'), r('Gospel', 'Luke 8:5-15')],
      title: 'Неделя 22-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 19 октября ст. ст. — Неделя 22-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261019.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 6:11-18'), r('Evanghelie', 'Luke 16:19-31')],
      title: 'Duminica a 22-a după Rusalii (Bogatul nemilostiv și săracul Lazăr)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 1 noiembrie', url: 'https://doxologia.ro/1-noiembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 8',
          text: 'Sfinţilor cei fără de arginţi şi de minuni făcători, cercetaţi neputinţele noastre; în dar aţi luat, în dar daţi-ne nouă.',
          source: { text: 'Doxologia — Troparul Sfinţilor doctori fără de arginţi Cosma şi Damian, din Asia', url: 'https://doxologia.ro/troparul-sfintilor-doctori-fara-de-arginti-cosma-damian-din-asia', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 1',
          text: 'Doctorii cei înţelepţi ai lumii, de la Dumnezeu luând compătimirea, rugaţi-vă şi acum pentru noi cei ce strigăm: Doamne, mântuieşte poporul şi ţara aceasta şi slobozeşte sufletele noastre de cumplitele primejdii, pentru rugăciunile Născătoarei de Dumnezeu.',
          source: { text: 'Doxologia — Troparul Sfinţilor doctori fără de arginţi Cosma şi Damian, din Asia', url: 'https://doxologia.ro/troparul-sfintilor-doctori-fara-de-arginti-cosma-damian-din-asia-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 8 Cu curgerile lacrimilor tale ai lucrat pustiul cel neroditor şi cu suspinele cele dintru adânc ai făcut ostenelile tale însutit roditoare; şi te-ai făcut luminător lumii strălucind cu minunile, David, Părintele nostru. Roagă-te lui Hristos Dumnezeu ca să mântuiască sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios David din Evia', url: 'https://doxologia.ro/troparul-sfantului-cuvios-david-din-evia', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2',
          text: 'Căutând cele de sus... Har de tămăduiri luând, întindeţi sănătate celor ce sunt în nevoi, măriţi doctori făcători de minuni. Dar cu cercetarea lor de către voi, cutezările vrăjmaşilor le-aţi potolit, lumea tămăduind cu minunile.',
          source: { text: 'Doxologia — Condacul Sfinţilor doctori fără de arginţi Cosma şi Damian, din Asia', url: 'https://doxologia.ro/condacul-sfintilor-doctori-fara-de-arginti-cosma-damian-din-asia', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Podobie: Arătatu-Te-ai astăzi lumii... Arătatu-te-ai în lume ca o stea prealuminoasă, cu dumnezeieștile daruri ale tămăduirilor luminând pe toți care cu credință se apropie de tine, Davide, lauda Părinților.',
          source: { text: 'Doxologia — Condacul Sfântului Cuvios David din Evia', url: 'https://doxologia.ro/condacul-sfantului-cuvios-david-din-evia', year: 2026 },
        },
      ],
    },
  },
  '2026-11-02': {
    russian: {
      readings: [r('Epistle', '1 Thessalonians 1:1-5'), r('Gospel', 'Luke 9:18-22'), r('Epistle (Вмч)', '2 Timothy 2:1-10'), r('Gospel (Вмч)', 'John 15:17-16:2')],
      title: 'Седмица 23-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 20 октября ст. ст. — Седмица 23-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261020.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Thessalonians 1:1-5'), r('Evanghelie', 'Luke 10:22-24')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 2 noiembrie', url: 'https://doxologia.ro/2-noiembrie' },
    },
  },
  '2026-11-03': {
    russian: {
      readings: [r('Epistle', '1 Thessalonians 1:6-10'), r('Gospel', 'Luke 9:23-27'), r('Epistle (и за среду (под зачало))', '1 Thessalonians 2:1-8'), r('Gospel (и за среду (под зачало))', 'Luke 9:43-50'), r('Epistle (Прп)', '2 Corinthians 9:6-11'), r('Gospel (Прп)', 'Luke 6:17-23')],
      title: 'Седмица 23-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 21 октября ст. ст. — Седмица 23-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261021.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Thessalonians 1:6-10'), r('Evanghelie', 'Luke 11:1-10')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 3 noiembrie', url: 'https://doxologia.ro/3-noiembrie' },
    },
  },
  '2026-11-04': {
    russian: {
      readings: [r('Epistle (Богородицы)', 'Philippians 2:5-11'), r('Gospel (Богородицы)', 'Luke 10:38-42; 11:27-28')],
      title: 'Седмица 23-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 22 октября ст. ст. — Седмица 23-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261022.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Thessalonians 2:1-8'), r('Evanghelie', 'Luke 11:9-13')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 4 noiembrie', url: 'https://doxologia.ro/4-noiembrie' },
    },
  },
  '2026-11-05': {
    russian: {
      readings: [r('Epistle', '1 Thessalonians 2:9-14'), r('Gospel', 'Luke 9:49-56'), r('Epistle (Ап)', 'Galatians 1:11-19'), r('Gospel (Ап)', 'Matthew 13:54-58')],
      title: 'Седмица 23-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 23 октября ст. ст. — Седмица 23-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261023.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Thessalonians 2:9-14'), r('Evanghelie', 'Luke 11:14-23')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 5 noiembrie', url: 'https://doxologia.ro/5-noiembrie' },
    },
  },
  '2026-11-06': {
    russian: {
      readings: [r('Epistle', '1 Thessalonians 2:14-19'), r('Gospel', 'Luke 10:1-15'), r('Epistle (Богородицы)', 'Philippians 2:5-11'), r('Gospel (Богородицы)', 'Luke 10:38-42; 11:27-28')],
      title: 'Седмица 23-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 24 октября ст. ст. — Седмица 23-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261024.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Thessalonians 2:14-20'), r('Evanghelie', 'Luke 11:23-26')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 6 noiembrie', url: 'https://doxologia.ro/6-noiembrie' },
    },
  },
  '2026-11-07': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 8:1-5'), r('Gospel', 'Luke 7:1-10'), r('Epistle (За упокой)', '1 Thessalonians 4:13-17'), r('Gospel (За упокой)', 'John 5:24-30')],
      title: 'Седмица 23-я по Пятидесятнице. Димитриевская родительская суббота',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 25 октября ст. ст. — Седмица 23-я по Пятидесятнице. Димитриевская родительская суббота', url: 'https://days.pravoslavie.ru/Days/20261025.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 8:1-5'), r('Evanghelie', 'Luke 8:16-21')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 7 noiembrie', url: 'https://doxologia.ro/7-noiembrie' },
    },
  },
  '2026-11-08': {
    russian: {
      readings: [r('Epistle (Трясения)', 'Hebrews 12:6-13; 12:25-27'), r('Gospel (Трясения)', 'Matthew 8:23-27'), r('Epistle (Ряд. (под зачало))', 'Ephesians 2:4-10'), r('Gospel (Ряд. (под зачало))', 'Luke 16:19-31'), r('Epistle (Вмч)', '2 Timothy 2:1-10'), r('Gospel (Вмч)', 'John 15:17-16:2')],
      title: 'Неделя 23-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 26 октября ст. ст. — Неделя 23-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261026.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 2:14-22'), r('Apostol', 'Hebrews 2:2-10'), r('Evanghelie', 'Luke 8:41-56'), r('Evanghelie', 'Luke 10:16-21')],
      title: 'Duminica a 24-a după Rusalii (Învierea fiicei lui Iair)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 8 noiembrie', url: 'https://doxologia.ro/8-noiembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 4 Mai-marilor Voievozi ai oștirilor ce­rești, rugămu-vă pe voi noi, ne­vred­nicii, ca prin rugăciunile voastre să ne acoperiți cu acoperământul aripilor măririi voastre celei netrupești, păzindu-ne pe noi, cei ce cădem cu dinadinsul și strigăm: Iz­băviți-ne din nevoi, ca niște Mai-mari peste cetele Puterilor celor de sus.',
          source: { text: 'Doxologia — Troparul Sfinților Arhangheli Mihail și Gavriil', url: 'https://doxologia.ro/troparul-sfintilor-arhangheli-mihail-gavriil', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2',
          text: 'Arhanghele al lui Dumnezeu și slujitorule al dumnezeieștii măriri, apărătorul oamenior și mai-marele celor fără de trup, cere pentru noi ce este de folos și mare milă, Cel ce ești voievod mai mare a celor fără de trup.',
          source: { text: 'Doxologia — Condacul Sfântului Arhanghel Mihail', url: 'https://doxologia.ro/condacul-sfantului-arhanghel-mihail', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2',
          text: 'Mai marilor Voievozi ai lui Dumnezeu, slujitorilor Dumnezeieştii Slave, povăţuitorii oamenilor şi Căpeteniile îngerilor, cereţi pentru noi ceea ce este de folos şi mare milă, ca nişte mai mari Voievozi ai celor fără de trup.',
          source: { text: 'Doxologia — Condac la Sărbătoarea Soborului Sfinților Arhangheli Mihail și Gavriil şi a tuturor puterilor cereşti', url: 'https://doxologia.ro/condac-la-sarbatoarea-soborului-sfintilor-arhangheli-mihail-gavriil-tuturor-puterilor-ceresti', year: 2026 },
        },
      ],
    },
  },
  '2026-11-09': {
    russian: {
      readings: [r('Epistle', '1 Thessalonians 2:20-3:8'), r('Gospel', 'Luke 10:22-24'), r('Epistle (Мч)', 'Ephesians 6:10-17'), r('Gospel (Мч)', 'Luke 21:12-19')],
      title: 'Седмица 24-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 27 октября ст. ст. — Седмица 24-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261027.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Thessalonians 2:20; 3:1-8'), r('Evanghelie', 'Luke 11:29-33')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 9 noiembrie', url: 'https://doxologia.ro/9-noiembrie' },
    },
  },
  '2026-11-10': {
    russian: {
      readings: [r('Epistle', '1 Thessalonians 3:9-13'), r('Gospel', 'Luke 11:1-10'), r('Epistle (Свт)', 'Hebrews 7:26-8:2'), r('Gospel (Свт)', 'John 10:9-16')],
      title: 'Седмица 24-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 28 октября ст. ст. — Седмица 24-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261028.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Thessalonians 3:8-13'), r('Evanghelie', 'Luke 11:34-41')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 10 noiembrie', url: 'https://doxologia.ro/10-noiembrie' },
    },
  },
  '2026-11-11': {
    russian: {
      readings: [r('Epistle', '1 Thessalonians 4:1-12'), r('Gospel', 'Luke 11:9-13'), r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Matthew 11:27-30')],
      title: 'Седмица 24-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 29 октября ст. ст. — Седмица 24-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261029.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Thessalonians 4:1-12'), r('Evanghelie', 'Luke 11:42-46')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 11 noiembrie', url: 'https://doxologia.ro/11-noiembrie' },
    },
  },
  '2026-11-12': {
    russian: {
      readings: [r('Epistle', '1 Thessalonians 5:1-8'), r('Gospel', 'Luke 11:14-23')],
      title: 'Седмица 24-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 30 октября ст. ст. — Седмица 24-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261030.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Thessalonians 4:18; 5:1-10'), r('Evanghelie', 'Luke 11:47-54; 12:1')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 12 noiembrie', url: 'https://doxologia.ro/12-noiembrie' },
    },
  },
  '2026-11-13': {
    russian: {
      readings: [r('Epistle', '1 Thessalonians 5:9-13; 5:24-28'), r('Gospel', 'Luke 11:23-26')],
      title: 'Седмица 24-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 31 октября ст. ст. — Седмица 24-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261031.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Thessalonians 5:9-13; 5:24-28'), r('Evanghelie', 'Luke 12:2-12')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 13 noiembrie', url: 'https://doxologia.ro/13-noiembrie' },
    },
  },
  '2026-11-14': {
    russian: {
      readings: [r('Epistle (Бессребреников)', '1 Corinthians 12:27-13:8'), r('Gospel (Бессребреников)', 'Matthew 10:1; 10:5-8'), r('Epistle (Ряд)', '2 Corinthians 11:1-6'), r('Gospel (Ряд)', 'Luke 8:16-21')],
      title: 'Седмица 24-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 1 ноября ст. ст. — Седмица 24-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261101.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Corinthians 11:1-6'), r('Evanghelie', 'Luke 9:1-6')],
      fastingNote: 'Lăsatul secului pentru Postul Nașterii Domnului',
      source: { text: 'doxologia.ro, 14 noiembrie', url: 'https://doxologia.ro/14-noiembrie' },
    },
  },
  '2026-11-15': {
    russian: {
      readings: [r('Epistle', 'Ephesians 2:14-22'), r('Gospel', 'Luke 8:26-39'), r('Epistle (Мчч)', 'Ephesians 6:10-17'), r('Gospel (Мчч)', 'Matthew 10:16-22')],
      title: 'Неделя 24-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 2 ноября ст. ст. — Неделя 24-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261102.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 4:1-7'), r('Evanghelie', 'Luke 10:25-37')],
      title: 'Duminica a 25-a după Rusalii (Pilda samarineanului milostiv)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 15 noiembrie', url: 'https://doxologia.ro/15-noiembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 2 Nevoitorule al pustiirilor nordice și rugător pentru întreaga lume, învățător Ortodoxiei și chip al evlaviei, podoaba Alaskăi și veselia Americii, Sfinte Părinte Gherman, roagă-te pentru noi!',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios Gherman de Alaska', url: 'https://doxologia.ro/troparul-sfantului-cuvios-gherman-de-alaska', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 4 Sălășluindu-L pe Hristos în inima ta, Cuvioase Părinte Paisie, te-ai făcut biserică vie a Preasfintei Treimi; că, primind darul cuvântului și al scrierii, pe tineri i-ai învățat și pe bătrâni mai înțelepți i-ai arătat, iar pe cei leneși i-ai îndemnat la lucrarea faptelor bune. Pentru acestea, fericite, roagă-te să se mântuiască sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios Paisie de la Neamț', url: 'https://doxologia.ro/troparul-sfantului-cuvios-paisie-de-la-neamt-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 8 Icoană a toată făptuirea și contemplarea în Mănăstirea Noul Valaam te-ai arătat, locuitorilor Alaskăi lumina Evangheliei revărsându-o, cel de-o-minte cu Apostolii, Gherman fericite; și acum, solește către Domnul să risipească întunericul patimilor noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios Gherman de Alaska', url: 'https://doxologia.ro/troparul-sfantului-cuvios-gherman-de-alaska-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 8',
          text: 'Pe Cuviosul Paisie de la Neamț, vasul cel ales al Duhului Sfânt, pe părintele Filocaliei românești și dascălul cel cu mulți ucenici, care a hrănit pe toți cu învățăturile Sfintelor Evanghelii, înnoind multe mănăstiri, să-l lăudăm astăzi după cuviință, cântându-i împreună cu cetele cerești: Bucură-te, Cuvioase Părinte Paisie, lauda Moldovei și cununa Cuvioșilor!',
          source: { text: 'Doxologia — Condacul Sfântului Cuvios Paisie de la Neamț', url: 'https://doxologia.ro/condacul-sfantului-cuvios-paisie-de-la-neamt', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2',
          text: 'Căutând cele de sus... De sus luând harul, înţelepţilor, celor din ispite le ajutaţi, prealăudaţilor. Pentru aceasta, sfinţilor, pe tânără din amară moarte o aţi scăpat. Că voi sunteţi cu adevărat mărirea Edesei şi bucurie a lumii.',
          source: { text: 'Doxologia — Condacul Sfinţilor Mucenici şi Mărturisitori Gurie, Samona şi Aviv, diaconul', url: 'https://doxologia.ro/condacul-sfintilor-mucenici-marturisitori-gurie-samona-aviv-diaconul', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Podobie: Fecioara astăzi... Sfântul Cuvios Paisie de la Neamț cheamă la a sa pomenire pe toți fiii săi duhovnicești, dreptcredincioși și monahi, ca să deprindă cu dragoste lucrarea minții și rugăciunea către Dumnezeu, Cel mai înainte de veci.',
          source: { text: 'Doxologia — Condacul Sfântului Cuvios Paisie de la Neamț', url: 'https://doxologia.ro/condacul-sfantului-cuvios-paisie-de-la-neamt-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: '',
          text: 'Glas 8 Podobie: Apărătoarei Doamne... Flacăra credinței sălășluindu o în inimă, și de focul părtășiei împăratului a toate arzând nemistuit, în Alaska ai topit gheața sufletelor, Sfinte, următorul isihaștilor și slăvite propovăduitorule, pentru care strigăm ție: Bucură-te, Cuvioase Gherman, luceafărul Americii.',
          source: { text: 'Doxologia — Condacul Sfântului Cuvios Gherman de Alaska', url: 'https://doxologia.ro/condacul-sfantului-cuvios-gherman-de-alaska', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Apărătorule al dreptei credințe și lauda monahilor, Cuvioase Părinte Paisie, din pruncie iubind pe Hristos, ca un alt Avraam ai părăsit patria ta, în Muntele Athosului nevoindu-te; și, adunând ceată de ucenici, te-ai așezat în țara Moldovei cea binecuvântată și Mănăstirea Neamțului rai pământesc ai făcut-o. Pentru aceasta, împreună cu îngerii, nu înceta a te ruga lui Dumnezeu pentru sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios Paisie de la Neamț', url: 'https://doxologia.ro/troparul-sfantului-cuvios-paisie-de-la-neamt', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Ocrotitorii şi apărătorii Edesei, cei ce săvârşiţi minuni mari în lume, cei ce pe tânără aţi dat-o iarăşi în braţele maicii sale şi pe călcătorul de lege got l-aţi arătat osândit cu dreaptă judecată, cereţi pentru noi neîncetat să se mântuiască sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfinţilor Mucenici şi Mărturisitori Gurie, Samona şi Aviv, diaconul', url: 'https://doxologia.ro/troparul-sfintilor-mucenici-marturisitori-gurie-samona-aviv-diaconul', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 5',
          text: 'Minunile sfinţilor Tăi mucenici zid nebiruit ne-ai dăruit nouă, Hristoase Dumnezeule. Pentru rugăciunile lor, sfaturile păgânilor le risipeşte, sceptrele împărăţiei le întăreşte, ca un Bun şi de oameni Iubitor.',
          source: { text: 'Doxologia — Troparul Sfinţilor Mucenici şi Mărturisitori Gurie, Samona şi Aviv, diaconul', url: 'https://doxologia.ro/troparul-sfintilor-mucenici-marturisitori-gurie-samona-aviv-diaconul-0', year: 2026 },
        },
      ],
    },
  },
  '2026-11-16': {
    russian: {
      readings: [r('Epistle', '2 Thessalonians 1:1-10'), r('Gospel', 'Luke 11:29-33'), r('Epistle (Свв)', 'Ephesians 6:10-17'), r('Gospel (Свв)', 'Luke 21:12-19')],
      title: 'Седмица 25-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 3 ноября ст. ст. — Седмица 25-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261103.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Thessalonians 1:1-10'), r('Evanghelie', 'Luke 12:13-15; 12:22-31')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 16 noiembrie', url: 'https://doxologia.ro/16-noiembrie' },
    },
  },
  '2026-11-17': {
    russian: {
      readings: [r('Epistle', '2 Thessalonians 1:10-2:2'), r('Gospel', 'Luke 11:34-41'), r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Matthew 4:25-5:12')],
      title: 'Седмица 25-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 4 ноября ст. ст. — Седмица 25-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261104.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Thessalonians 1:10-12; 2:1-2'), r('Evanghelie', 'Luke 12:42-48')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 17 noiembrie', url: 'https://doxologia.ro/17-noiembrie' },
    },
  },
  '2026-11-18': {
    russian: {
      readings: [r('Epistle', '2 Thessalonians 2:1-12'), r('Gospel', 'Luke 11:42-46'), r('Epistle (Свт)', 'Hebrews 7:26-8:2'), r('Gospel (Свт)', 'John 10:9-16')],
      title: 'Седмица 25-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 5 ноября ст. ст. — Седмица 25-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261105.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Thessalonians 2:1-12'), r('Evanghelie', 'Luke 12:48-59')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 18 noiembrie', url: 'https://doxologia.ro/18-noiembrie' },
    },
  },
  '2026-11-19': {
    russian: {
      readings: [r('Epistle', '2 Thessalonians 2:13-3:5'), r('Gospel', 'Luke 11:47-12:1'), r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Luke 6:17-23'), r('Epistle (Свт)', 'Hebrews 8:3-6'), r('Gospel (Свт)', 'Luke 12:8-12')],
      title: 'Седмица 25-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 6 ноября ст. ст. — Седмица 25-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261106.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Thessalonians 2:13-17; 3:1-5'), r('Evanghelie', 'Luke 13:1-9')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 19 noiembrie', url: 'https://doxologia.ro/19-noiembrie' },
    },
  },
  '2026-11-20': {
    russian: {
      readings: [r('Epistle', '2 Thessalonians 3:6-18'), r('Gospel', 'Luke 12:2-12'), r('Epistle (и за субботу (под зачало))', 'Galatians 1:3-10'), r('Gospel (и за субботу (под зачало))', 'Luke 9:1-6'), r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Matthew 4:25-5:12')],
      title: 'Седмица 25-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 7 ноября ст. ст. — Седмица 25-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261107.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Thessalonians 3:6-18'), r('Evanghelie', 'Luke 13:31-35')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 20 noiembrie', url: 'https://doxologia.ro/20-noiembrie' },
    },
  },
  '2026-11-21': {
    russian: {
      readings: [r('Epistle (Бесплотных)', 'Hebrews 2:2-10'), r('Gospel (Бесплотных)', 'Luke 10:16-21')],
      title: 'Седмица 25-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 8 ноября ст. ст. — Седмица 25-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261108.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 9:1-7'), r('Evanghelie', 'Luke 10:38-42; 11:27-28')],
      title: 'Intrarea în biserică a Maicii Domnului',
      fastingNote: null,
      source: { text: 'doxologia.ro, 21 noiembrie', url: 'https://doxologia.ro/21-noiembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Astăzi, înainte însemnarea bunăvoinţei lui Dumnezeu şi propovăduirea mântuirii oamenilor, în Templul lui Dumnezeu luminat Fecioara se arată şi pe Hristos tuturor mai înainte Îl vesteşte. Acesteia şi noi cu mare glas să-i strigăm: Bucură-te, Împlinirea rânduielii Ziditorului .',
          source: { text: 'Doxologia — Tropar la Praznicul Intrării în biserică a Maicii Domnului', url: 'https://doxologia.ro/tropar-la-praznicul-intrarii-biserica-maicii-domnului', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Cel Ce Te-ai Înălţat... Preacurat Templu al Mântuitorului, Cămara cea de mult preţ şi Fecioară, Sfinţită Vistieria Slavei lui Dumnezeu, astăzi este adusă în Casa Domnului, împreună aducând harul Duhului lui Dumnezeu, pe care o laudă îngerii lui Dumnezeu. Aceasta este Cortul cel Ceresc.',
          source: { text: 'Doxologia — Condac la Praznicul Intrării în biserică a Maicii Domnului', url: 'https://doxologia.ro/condac-la-praznicul-intrarii-biserica-maicii-domnului', year: 2026 },
        },
      ],
    },
  },
  '2026-11-22': {
    russian: {
      readings: [r('Epistle', 'Ephesians 4:1-6'), r('Gospel', 'Luke 8:41-56'), r('Epistle (Богородицы)', 'Philippians 2:5-11'), r('Gospel (Богородицы)', 'Luke 10:38-42; 11:27-28')],
      title: 'Неделя 25-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 9 ноября ст. ст. — Неделя 25-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261109.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 5:8-19'), r('Evanghelie', 'Luke 12:16-21')],
      title: 'Duminica a 26-a după Rusalii (Pilda bogatului căruia i-a rodit țarina)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 22 noiembrie', url: 'https://doxologia.ro/22-noiembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Pe vlăstarul Libisiului și lauda Eviei, pe cel arătat în vremurile din urmă, al monahilor prieten adevărat. pe Iacob să-l cinstim credincioși pe noul iubitor al Isichei, pe cel ce vindecării dăruiește celor care îl cinstesc cu bună credință și cu Evlavie strigă cu laude. Slavă Lui Hristos, Celui ce te-a slăvit, slavă Celui care minunat te-a arătat, slavă Celui ce te-a sfințit în vremurile din urmă.',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios Iacov Tsalikis', url: 'https://doxologia.ro/troparul-sfantului-cuvios-iacov-tsalikis', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 3 Sfinte Iacove, mult lăudate, al Eviei crin înmiresmat, din a Treimii Lumină ne ocrotești; tu, dar al Domnului Chip ni-L împărtășești și întunericul inimii risipești; la Hristos tu mijlocind de-a pururea mare milă, în dar să ni se dea.',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios Iacov Tsalikis', url: 'https://doxologia.ro/troparul-sfantului-cuvios-iacov-tsalikis-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Arătatu-Te-ai astăzi... Sfinţite Apostole al lui Hristos Filimon, pe cei ce cu credinţă săvârşesc astăzi preasfântă pomenirea ta, izbăveşte-i pe toţi de tot felul de ispite şi de necazuri.',
          source: { text: 'Doxologia — Condacul Sfinţilor Apostoli Filimon, Arhip şi Onisim şi al celor împreună cu dânşii', url: 'https://doxologia.ro/condacul-sfintilor-apostoli-filimon-arhip-onisim-al-celor-impreuna-cu-dansii', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: '',
          text: 'Cel Ce Te-ai Înălţat... Pe Sfânta Cecilia, care s-a făcut mireasă lui Hristos de bună voie şi şi-a împodobit inima cu virtuţi, cu sfântă cuviinţă să o lăudăm mulţimea credincioşilor. Că ea a ruşinat semeţia lui Almachie, strălucind ca soarele în mijlocul celor ce o căutau şi după aceea s-a arătat celor de pe pământ Dumnezeiesc sprijin, întărind credinţa.',
          source: { text: 'Doxologia — Condacul Sfintei Muceniţe Cecilia', url: 'https://doxologia.ro/condacul-sfintei-mucenite-cecilia', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: '',
          text: 'Ca o rază ai ieşit, luminând lumii, fericite, luminat fiind de razele Apostolului Pavel, soarele cel preastrălucitor, care a luminat lumea. Pentru aceasta, toţi te cinstim, Sfinte Apostole Onisim.',
          source: { text: 'Doxologia — Condacul Sfântului Apostol Onisim', url: 'https://doxologia.ro/condacul-sfantului-apostol-onisim', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4-lea',
          text: 'Podobie: Arătatu-Te-ai astăzi... Ca pe o stea mare câştigându-te Biserica pe tine, Fericite Arhip şi luminându-se cu razele minunilor tale, strigă către tine: scapă pe cei ce cu credinţă cinstesc sfântă pomenirea ta.',
          source: { text: 'Doxologia — Condacul Sfântului Apostol Arhip', url: 'https://doxologia.ro/condacul-sfantului-apostol-arhip', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 3',
          text: 'Sfinţilor Apostoli, rugaţi pe Milostivul Dumnezeu ca să dea iertare de greşeli sufletelor noastre.',
          source: { text: 'Doxologia — Troparul Sfinţilor Apostoli Filimon, Arhip şi Onisim şi al celor împreună cu dânşii', url: 'https://doxologia.ro/troparul-sfintilor-apostoli-filimon-arhip-onisim-al-celor-impreuna-cu-dansii', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Mieluşeaua Ta, Iisuse, Cecilia, strigă cu glas mare: pe Tine, Mirele meu, te iubesc și pe Tine căutându-Te mă chinuiesc și împreună mă răstignesc și împreună mă îngrop cu Botezul Tău; și pătimesc pentru Tine, ca să împărățesc întru Tine; și mor pentru tine, ca să viez pentru Tine; ci, ca o jertfă fără de prihană, primește-mă pe mine ceea ce cu dragoste mă jertfesc Ție. Pentru rugăciunile ei, ca un Milostiv, mântuiește sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfintei Muceniţe Cecilia', url: 'https://doxologia.ro/troparul-sfintei-mucenite-cecilia', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 3',
          text: 'Apostole Sfinte Onisim, roagă pe Milostivul Dumnezeu, ca să dăruiască iertare de greşeli sufletelor noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Apostol Onisim', url: 'https://doxologia.ro/troparul-sfantului-apostol-onisim', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 3 Apostole Sfinte Arhip, roagă pe Milostivul Dumnezeu, ca să dăruiască iertare de greşeli sufletelor noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Apostol Arhip', url: 'https://doxologia.ro/troparul-sfantului-apostol-arhip', year: 2026 },
        },
      ],
    },
  },
  '2026-11-23': {
    russian: {
      readings: [r('Epistle', '1 Timothy 1:1-7'), r('Gospel', 'Luke 12:13-15; 12:22-31')],
      title: 'Седмица 26-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 10 ноября ст. ст. — Седмица 26-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261110.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Timothy 1:1-7'), r('Evanghelie', 'Luke 14:1; 14:12-15')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 23 noiembrie', url: 'https://doxologia.ro/23-noiembrie' },
    },
  },
  '2026-11-24': {
    russian: {
      readings: [r('Epistle', '1 Timothy 1:8-14'), r('Gospel', 'Luke 12:42-48'), r('Epistle (Мчч)', 'Ephesians 6:10-17'), r('Gospel (Мчч)', 'Matthew 10:32-33; 10:37-38; 19:27-30'), r('Epistle (Прп)', 'Hebrews 13:17-21'), r('Gospel (Прп)', 'Matthew 4:25-5:12')],
      title: 'Седмица 26-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 11 ноября ст. ст. — Седмица 26-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261111.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Timothy 1:8-14'), r('Evanghelie', 'Luke 14:25-35')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 24 noiembrie', url: 'https://doxologia.ro/24-noiembrie' },
    },
  },
  '2026-11-25': {
    russian: {
      readings: [r('Epistle', '1 Timothy 1:18-20; 2:8-15'), r('Gospel', 'Luke 12:48-59'), r('Epistle (и за четверг (под зачало))', '1 Timothy 3:1-13'), r('Gospel (и за четверг (под зачало))', 'Luke 13:1-9'), r('Epistle (Свт)', 'Hebrews 4:14-5:6'), r('Gospel (Свт)', 'Luke 6:17-23')],
      title: 'Седмица 26-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 12 ноября ст. ст. — Седмица 26-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261112.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Timothy 1:18-20; 2:8-15'), r('Evanghelie', 'Luke 15:1-10')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 25 noiembrie', url: 'https://doxologia.ro/25-noiembrie' },
    },
  },
  '2026-11-26': {
    russian: {
      readings: [r('Epistle (Свт)', 'Hebrews 7:26-8:2'), r('Gospel (Свт)', 'John 10:9-16')],
      title: 'Седмица 26-я по Пятидесятнице',
      fastingNote: 'Заговенье на Рождественский пост; Поста нет',
      source: { text: 'days.pravoslavie.ru, 13 ноября ст. ст. — Седмица 26-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261113.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Timothy 3:1-13'), r('Evanghelie', 'Luke 16:1-9')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 26 noiembrie', url: 'https://doxologia.ro/26-noiembrie' },
    },
  },
  '2026-11-27': {
    russian: {
      readings: [r('Epistle', '1 Timothy 4:4-8; 4:16'), r('Gospel', 'Luke 13:31-35'), r('Epistle (Ап)', '1 Corinthians 4:9-16'), r('Gospel (Ап)', 'John 1:43-51')],
      title: 'Седмица 26-я по Пятидесятнице',
      fastingNote: 'День постный; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 14 ноября ст. ст. — Седмица 26-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261114.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Timothy 4:4-8; 4:16'), r('Evanghelie', 'Luke 16:15-18; 17:1-4')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 27 noiembrie', url: 'https://doxologia.ro/27-noiembrie' },
    },
  },
  '2026-11-28': {
    russian: {
      readings: [r('Epistle (Мчч)', 'Ephesians 6:10-17'), r('Gospel (Мчч)', 'Luke 12:8-12'), r('Epistle (Ряд)', 'Galatians 3:8-12'), r('Gospel (Ряд)', 'Luke 9:37-43')],
      title: 'Седмица 26-я по Пятидесятнице',
      fastingNote: 'Начало Рождественского поста; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 15 ноября ст. ст. — Седмица 26-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261115.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 3:8-12'), r('Evanghelie', 'Luke 9:57-62')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 28 noiembrie', url: 'https://doxologia.ro/28-noiembrie' },
    },
  },
  '2026-11-29': {
    russian: {
      readings: [r('Epistle', 'Ephesians 5:8-19'), r('Gospel', 'Luke 10:25-37'), r('Epistle (Ап)', '1 Corinthians 4:9-16'), r('Gospel (Ап)', 'Matthew 9:9-13')],
      title: 'Неделя 26-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 16 ноября ст. ст. — Неделя 26-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261116.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Colossians 3:12-16'), r('Evanghelie', 'Luke 18:18-27')],
      title: 'Duminica a 30-a după Rusalii (Dregătorul bogat – Păzirea poruncilor)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 29 noiembrie', url: 'https://doxologia.ro/29-noiembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Mucenicul Tău, Doamne, Paramon, întru nevoinţa sa, cununa nestricăciunii a dobândit de la Tine, Dumnezeul nostru; că având puterea Ta, pe chinuitori a învins; zdrobit-a şi ale demonilor neputincioase îndrăzniri. Pentru rugăciunile lui, mântuieşte sufletele noastre, Hristoase Dumnezeule.',
          source: { text: 'Doxologia — Troparul Sfântului Mucenic Paramon', url: 'https://doxologia.ro/troparul-sfantului-mucenic-paramon', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Pe Cel împreună fără de început Ieșit din insula Cipru, ai venit la Sion, mucenicind la fântâna lui Iacov și primind tăierea capului și a degetelor. Iar cortul tău Hristos făcându-l nestricăcios, l-a arătat fântână de bogate daruri și felurite tămăduiri, sfinte sfințite mucenice Filumen.',
          source: { text: 'Doxologia — Troparul Noulul Sfințit Mucenic Filumen', url: 'https://doxologia.ro/troparul-noulul-sfintit-mucenic-filumen', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Cel Ce Te-ai Înălţat pe Cruce... Cu răbdarea Dumnezeieştilor Porunci ţi-ai curăţit sufletul de spurcăciuni şi către săvârşirea pătimirii ai ajuns. Că te-ai lepădat a jertfi idolilor celor înşelători şi urmând lui Hristos, cu suliţa ai fost împus. Dar cu osârdie roagă-te pentru lume, Preafericite Paramon.',
          source: { text: 'Doxologia — Condacul Sfântului Mucenic Paramon', url: 'https://doxologia.ro/condacul-sfantului-mucenic-paramon', year: 2026 },
        },
      ],
    },
  },
  '2026-11-30': {
    russian: {
      readings: [r('Epistle', '1 Timothy 5:1-10'), r('Gospel', 'Luke 14:12-15'), r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Matthew 4:25-5:12'), r('Epistle (Свт)', '1 Corinthians 12:7-11'), r('Gospel (Свт)', 'Matthew 10:1; 10:5-8')],
      title: 'Седмица 27-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 17 ноября ст. ст. — Седмица 27-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261117.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Corinthians 4:9-16'), r('Evanghelie', 'John 1:35-51')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 30 noiembrie', url: 'https://doxologia.ro/30-noiembrie' },
    },
  },
  '2026-12-01': {
    russian: {
      readings: [r('Epistle', '1 Timothy 5:11-21'), r('Gospel', 'Luke 14:25-35')],
      title: 'Седмица 27-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 18 ноября ст. ст. — Седмица 27-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261118.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Timothy 5:11-21'), r('Evanghelie', 'Luke 17:26-37')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 1 decembrie', url: 'https://doxologia.ro/1-decembrie' },
    },
  },
  '2026-12-02': {
    russian: {
      readings: [r('Epistle', '1 Timothy 5:22-6:11'), r('Gospel', 'Luke 15:1-10'), r('Epistle (Свт)', 'Ephesians 6:10-17'), r('Gospel (Свт)', 'Matthew 5:14-19')],
      title: 'Седмица 27-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 19 ноября ст. ст. — Седмица 27-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261119.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Timothy 5:22-25; 6:1-11'), r('Evanghelie', 'Luke 18:15-17; 18:26-30')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 2 decembrie', url: 'https://doxologia.ro/2-decembrie' },
    },
  },
  '2026-12-03': {
    russian: {
      readings: [r('Epistle', '1 Timothy 6:17-21'), r('Gospel', 'Luke 16:1-9'), r('Epistle (и за пятницу (под зачало))', '2 Timothy 1:1-2; 1:8-18'), r('Gospel (и за пятницу (под зачало))', 'Luke 16:15-18; 17:1-4'), r('Epistle (Свт)', 'Hebrews 7:26-8:2'), r('Gospel (Свт)', 'John 10:9-16')],
      title: 'Седмица 27-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 20 ноября ст. ст. — Седмица 27-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261120.html' },
    },
    romanian: {
      readings: [r('Apostol', '1 Timothy 6:17-21'), r('Evanghelie', 'Luke 18:31-34')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 3 decembrie', url: 'https://doxologia.ro/3-decembrie' },
    },
  },
  '2026-12-04': {
    russian: {
      readings: [r('Epistle', 'Hebrews 9:1-7'), r('Gospel', 'Luke 10:38-42; 11:27-28')],
      title: 'Седмица 27-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 21 ноября ст. ст. — Седмица 27-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261121.html' },
      // Совершается служба великому празднику — the calendar's own sign for the day: T6
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Днесь благоволения Божия предображение/ и человеков спасения проповедание:/ в храме Божии ясно Дева является/ и Христа всем предвозвещает./ Той и мы велегласно возопиим:/ радуйся, смотрения// Зиждителева исполнение.',
          source: { text: 'days.pravoslavie.ru, 21 ноября ст. ст. — Тропарь праздника', url: 'https://days.pravoslavie.ru/Days/20261121.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 4',
          text: 'Пречистый храм Спасов,/ многоценный чертог и Дева,/ священное сокровище славы Божия,/ днесь вводится в дом Господень, благодать совводящи,/ Яже в Дусе Божественном,/ Юже воспевают Ангели Божии:// Сия есть селение Небесное.',
          source: { text: 'days.pravoslavie.ru, 21 ноября ст. ст. — Кондак праздника', url: 'https://days.pravoslavie.ru/Days/20261121.html', year: 2026 },
        },
      ],
    },
    romanian: {
      readings: [r('Apostol', '2 Timothy 1:1-2; 1:8-18'), r('Evanghelie', 'Luke 19:12-28')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 4 decembrie', url: 'https://doxologia.ro/4-decembrie' },
    },
  },
  '2026-12-05': {
    russian: {
      readings: [r('Epistle (Апп)', 'Philemon 1:1-25'), r('Gospel (Апп)', 'Luke 10:1-15'), r('Epistle (Ряд)', 'Galatians 5:22-6:2'), r('Gospel (Ряд)', 'Luke 9:57-62')],
      title: 'Седмица 27-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 22 ноября ст. ст. — Седмица 27-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261122.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 5:22-26; 6:1-2'), r('Evanghelie', 'Luke 10:19-21')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 5 decembrie', url: 'https://doxologia.ro/5-decembrie' },
    },
  },
  '2026-12-06': {
    russian: {
      readings: [r('Epistle', 'Ephesians 6:10-17'), r('Gospel', 'Luke 12:16-21'), r('Epistle (Блгв. кн)', 'Galatians 5:22-6:2'), r('Gospel (Блгв. кн)', 'Matthew 11:27-30')],
      title: 'Неделя 27-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 23 ноября ст. ст. — Неделя 27-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261123.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 6:10-17'), r('Apostol', 'Hebrews 13:17-21'), r('Evanghelie', 'Luke 13:10-17'), r('Evanghelie', 'Luke 6:17-23')],
      title: 'Duminica a 27-a după Rusalii (Tămăduirea femeii gârbove)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 6 decembrie', url: 'https://doxologia.ro/6-decembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Îndreptător credinţei şi chip blândeţelor, învăţător înfrânârii te-a arătat pe tine, turmei tale, adevărul lucrurilor. Pentru aceasta ai dobândit cu smerenia cele înalte şi cu sărăcia cele bogate; Părinte Ierarhe Nicolae, roagă pe Hristos Dumnezeu să mântuiască sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Ierarh Nicolae, Arhiepiscopul Mirelor Lichiei', url: 'https://doxologia.ro/troparul-sfantului-ierarh-nicolae-arhiepiscopul-mirelor-lichiei', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Fecioara astăzi... În Mira, Sfinte, sfinţitor te-ai arătat; că Evanghelia lui Hristos plinind-o, cuvioase, ţi-ai pus sufletul tău pentru poporul tău; mântuit-ai pe cei nevinovaţi din moarte. Pentru aceasta te-ai sfinţit ca un mare tăinuitor al darului lui Dumnezeu.',
          source: { text: 'Doxologia — Condacul Sfântului Ierarh Nicolae, Arhiepiscopul Mirelor Lichiei', url: 'https://doxologia.ro/condacul-sfantului-ierarh-nicolae-arhiepiscopul-mirelor-lichiei', year: 2026 },
        },
      ],
    },
  },
  '2026-12-07': {
    russian: {
      readings: [r('Epistle', '2 Timothy 2:20-26'), r('Gospel', 'Luke 17:20-25'), r('Epistle (Свв)', 'Ephesians 6:10-17'), r('Gospel (Свв)', 'Luke 21:12-19')],
      title: 'Седмица 28-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 24 ноября ст. ст. — Седмица 28-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261124.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Timothy 2:20-26'), r('Evanghelie', 'Luke 19:37-44')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 7 decembrie', url: 'https://doxologia.ro/7-decembrie' },
    },
  },
  '2026-12-08': {
    russian: {
      readings: [r('Epistle', '2 Timothy 3:16-4:4'), r('Gospel', 'Luke 17:26-37'), r('Epistle (Богородицы (под зачало))', 'Hebrews 9:1-7'), r('Gospel (Богородицы (под зачало))', 'Luke 10:38-42; 11:27-28'), r('Epistle (Сщмчч)', 'Philippians 3:20-4:3'), r('Gospel (Сщмчч)', 'Matthew 5:14-19')],
      title: 'Седмица 28-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 25 ноября ст. ст. — Седмица 28-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261125.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Timothy 3:16-17; 4:1-4'), r('Evanghelie', 'Luke 19:45-48')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 8 decembrie', url: 'https://doxologia.ro/8-decembrie' },
    },
  },
  '2026-12-09': {
    russian: {
      readings: [r('Epistle', '2 Timothy 4:9-22'), r('Gospel', 'Luke 18:15-17; 18:26-30')],
      title: 'Седмица 28-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 26 ноября ст. ст. — Седмица 28-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261126.html' },
    },
    romanian: {
      readings: [r('Apostol', '2 Timothy 4:9-22'), r('Evanghelie', 'Luke 20:1-8')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 9 decembrie', url: 'https://doxologia.ro/9-decembrie' },
    },
  },
  '2026-12-10': {
    russian: {
      readings: [r('Epistle', 'Titus 1:5-2:1'), r('Gospel', 'Luke 18:31-34'), r('Epistle (Богородицы (под зачало))', 'Hebrews 9:1-7'), r('Gospel (Богородицы (под зачало))', 'Luke 10:38-42; 11:27-28'), r('Epistle (Вмч)', 'Ephesians 6:10-17'), r('Gospel (Вмч)', 'John 15:1-7')],
      title: 'Седмица 28-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 27 ноября ст. ст. — Седмица 28-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261127.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Titus 1:5-14'), r('Evanghelie', 'Luke 20:9-18')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 10 decembrie', url: 'https://doxologia.ro/10-decembrie' },
    },
  },
  '2026-12-11': {
    russian: {
      readings: [r('Epistle', 'Titus 1:15-2:10'), r('Gospel', 'Luke 19:12-28'), r('Epistle (Прмч)', '2 Timothy 1:8-18'), r('Gospel (Прмч)', 'Matthew 10:23-31')],
      title: 'Седмица 28-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 28 ноября ст. ст. — Седмица 28-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261128.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Titus 1:15-16; 2:1-10'), r('Evanghelie', 'Luke 20:19-26')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 11 decembrie', url: 'https://doxologia.ro/11-decembrie' },
    },
  },
  '2026-12-12': {
    russian: {
      readings: [r('Epistle', 'Ephesians 1:16-23'), r('Gospel', 'Luke 10:19-21')],
      title: 'Седмица 28-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 29 ноября ст. ст. — Седмица 28-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261129.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 1:16-23'), r('Evanghelie', 'Luke 12:32-40')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 12 decembrie', url: 'https://doxologia.ro/12-decembrie' },
    },
  },
  '2026-12-13': {
    russian: {
      readings: [r('Epistle', 'Colossians 1:12-18'), r('Gospel', 'Luke 13:10-17'), r('Epistle (Ап)', '1 Corinthians 4:9-16'), r('Gospel (Ап)', 'John 1:35-51')],
      title: 'Неделя 28-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 30 ноября ст. ст. — Неделя 28-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261130.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Colossians 3:4-11'), r('Evanghelie', 'Luke 14:16-24')],
      title: 'Duminica a 28-a după Rusalii (a Sfinților Strămoși – Pilda celor poftiți la cină)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 13 decembrie', url: 'https://doxologia.ro/13-decembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 2 Nevoitorule al pustiirilor nordice și rugător pentru întreaga lume, învățător Ortodoxiei și chip al evlaviei, podoaba Alaskăi și veselia Americii, Sfinte Părinte Gherman, roagă-te pentru noi!',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios Gherman de Alaska', url: 'https://doxologia.ro/troparul-sfantului-cuvios-gherman-de-alaska', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 8 Icoană a toată făptuirea și contemplarea în Mănăstirea Noul Valaam te-ai arătat, locuitorilor Alaskăi lumina Evangheliei revărsându-o, cel de-o-minte cu Apostolii, Gherman fericite; și acum, solește către Domnul să risipească întunericul patimilor noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios Gherman de Alaska', url: 'https://doxologia.ro/troparul-sfantului-cuvios-gherman-de-alaska-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Arătatu-te-ai bun lucrător în via lui Hristos, folosind cuvântul Evangheliei Domnului la povățuirea dreptcredincioșilor pe calea mântuirii, ca un adevărat păstor duhovnicesc al Bisericii și slujitor al oamenilor. Credința păzind-o și pe credincioși către Dumnezeu îndreptându-i, întărești nădejdea în sufletele celor care te cinstesc, fericite ierarhe.',
          source: { text: 'Doxologia — Condacul Sfântului Ierarh Dosoftei', url: 'https://doxologia.ro/condacul-sfantului-ierarh-dosoftei', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2',
          text: 'Pe Născătoarea de Dumnezeu... Luminător prealuminos te-ai arătat celor ce şedeau întru în­tunericul necunoştinţei, purtătorule de biruinţă. Că agonisindu-ţi credinţa ca pe un scut, nu te-ai temut de semeţiile vrăjmaşilor, Sfinte Mucenice Eustratie, arătându-te mai bun vorbitor decât ritorii.',
          source: { text: 'Doxologia — Condacul Sfinţilor Mari Mucenici Eustratie, Auxentie, Evghenie, Mardarie şi Orest', url: 'https://doxologia.ro/condacul-sfintilor-mari-mucenici-eustratie-auxentie-evghenie-mardarie-orest', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2',
          text: 'Pe Născătoarea de Dumnezeu... Nevoindu-te cu deadinsul şi păstrând fecioria nestricată, bucurându-te, te-ai adus Făcă­torului tău. Că lepădându-te de mirele cel lumesc, prealăudată, te-ai logodit cu Hristos şi săvâr­şind călătoria prin credinţă şi prin luminată mucenicie, dai acum tămăduiri celor ce te cin­stesc pe tine.',
          source: { text: 'Doxologia — Condacul Sfintei Muceniţe Lucia fecioara din Siracuza', url: 'https://doxologia.ro/condacul-sfintei-mucenite-lucia-fecioara-din-siracuza', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: '',
          text: 'Glas 8 Podobie: Apărătoarei Doamne... Flacăra credinței sălășluindu o în inimă, și de focul părtășiei împăratului a toate arzând nemistuit, în Alaska ai topit gheața sufletelor, Sfinte, următorul isihaștilor și slăvite propovăduitorule, pentru care strigăm ție: Bucură-te, Cuvioase Gherman, luceafărul Americii.',
          source: { text: 'Doxologia — Condacul Sfântului Cuvios Gherman de Alaska', url: 'https://doxologia.ro/condacul-sfantului-cuvios-gherman-de-alaska', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 8',
          text: 'Apărătorule al Ortodoxiei și învățătorule al sfințeniei, păstor blând ca un miel și mare dascăl al Sfintei Liturghii, Părinte Ierarhe Dosoftei, roagă pe Hristos-Dumnezeu să mântuiască sufletele noastre!',
          source: { text: 'Doxologia — Troparul Sfântului Ierarh Dosoftei, Mitropolitul Moldovei', url: 'https://doxologia.ro/troparul-sfantului-ierarh-dosoftei-mitropolitul-moldovei', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 3',
          text: 'Statornicia purtătorilor de biruinţă, cei cinci la număr: Sfinţii Mari Mucenici Eustratie şi Auxentie împreună cu ceilalţi luptători, înfruntând cu îndrăzneală focul şi celelalte chinuri, au primit de la Hristos cununile măririi; Căruia se şi roagă, să mântuiască sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfinţilor Mari Mucenici Eustratie, Auxentie, Evghenie, Mardarie şi Orest', url: 'https://doxologia.ro/troparul-sfintilor-mari-mucenici-eustratie-auxentie-evghenie-mardarie-orest', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Mieluşeaua Ta, Iisuse, Lucia, strigă cu glas mare: pe Tine, Mirele meu, te iubesc și pe Tine căutându-Te mă chinuiesc și împreună mă răstignesc și împreună mă îngrop cu Botezul Tău; și pătimesc pentru Tine, ca să împărățesc întru Tine; și mor pentru tine, ca să viez pentru Tine; ci, ca o jertfă fără de prihană, primește-mă pe mine ceea ce cu dragoste mă jertfesc Ție. Pentru rugăciunile ei, ca un Milostiv, mântuiește sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfintei Muceniţe Lucia fecioara din Siracuza', url: 'https://doxologia.ro/troparul-sfintei-mucenite-lucia-fecioara-din-siracuza', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 2',
          text: 'Întru credinţă pe Strămoşi i-ai îndreptat, printr-înşii logodindu-Ţi mai înainte Biserica cea din păgâni; sunt lăudaţi întru mărire Sfinţii, că din sămânţa lor este Rodul care Te-a născut pe Tine fără de sămânţă. Cu rugăciunile lor, Hristoase Dumnezeule, mântuieşte sufle­tele noastre.',
          source: { text: 'Doxologia — Tropar la Duminica Sfinţilor Strămoşi', url: 'https://doxologia.ro/tropar-la-duminica-sfintilor-stramosi', year: 2026 },
        },
      ],
    },
  },
  '2026-12-14': {
    russian: {
      readings: [r('Epistle', 'Hebrews 3:5-11; 3:17-19'), r('Gospel', 'Luke 19:37-44'), r('Epistle (Прав)', 'Colossians 3:12-16'), r('Gospel (Прав)', 'Luke 6:31-36')],
      title: 'Седмица 29-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 1 декабря ст. ст. — Седмица 29-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261201.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 3:5-11; 3:17-19'), r('Evanghelie', 'Luke 20:27-44')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 14 decembrie', url: 'https://doxologia.ro/14-decembrie' },
    },
  },
  '2026-12-15': {
    russian: {
      readings: [r('Epistle', 'Hebrews 4:1-13'), r('Gospel', 'Luke 19:45-48')],
      title: 'Седмица 29-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 2 декабря ст. ст. — Седмица 29-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261202.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 4:1-13'), r('Evanghelie', 'Luke 21:12-19')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 15 decembrie', url: 'https://doxologia.ro/15-decembrie' },
    },
  },
  '2026-12-16': {
    russian: {
      readings: [r('Epistle', 'Hebrews 5:11-6:8'), r('Gospel', 'Luke 20:1-8'), r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Matthew 4:25-5:12')],
      title: 'Седмица 29-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 3 декабря ст. ст. — Седмица 29-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261203.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 5:11-14; 6:1-8'), r('Evanghelie', 'Luke 21:5-8; 21:10-11; 21:20-24')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 16 decembrie', url: 'https://doxologia.ro/16-decembrie' },
    },
  },
  '2026-12-17': {
    russian: {
      readings: [r('Epistle', 'Hebrews 7:1-6'), r('Gospel', 'Luke 20:9-18'), r('Epistle (Вмц)', 'Galatians 3:23-29'), r('Gospel (Вмц)', 'Mark 5:24-34')],
      title: 'Седмица 29-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 4 декабря ст. ст. — Седмица 29-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261204.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 7:1-6'), r('Evanghelie', 'Luke 21:28-33')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 17 decembrie', url: 'https://doxologia.ro/17-decembrie' },
    },
  },
  '2026-12-18': {
    russian: {
      readings: [r('Epistle', 'Hebrews 7:18-25'), r('Gospel', 'Luke 20:19-26'), r('Epistle (и за субботу (под зачало))', 'Ephesians 2:11-13'), r('Gospel (и за субботу (под зачало))', 'Luke 12:32-40'), r('Epistle (Прп)', 'Galatians 5:22-6:2'), r('Gospel (Прп)', 'Matthew 11:27-30')],
      title: 'Седмица 29-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 5 декабря ст. ст. — Седмица 29-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261205.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 7:18-25'), r('Evanghelie', 'Luke 21:37-38; 22:1-8')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 18 decembrie', url: 'https://doxologia.ro/18-decembrie' },
    },
  },
  '2026-12-19': {
    russian: {
      readings: [r('Epistle (Свт)', 'Hebrews 13:17-21'), r('Gospel (Свт)', 'Luke 6:17-23')],
      title: 'Седмица 29-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 6 декабря ст. ст. — Седмица 29-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261206.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Ephesians 2:11-13'), r('Evanghelie', 'Luke 13:19-29')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 19 decembrie', url: 'https://doxologia.ro/19-decembrie' },
    },
  },
  '2026-12-20': {
    russian: {
      readings: [r('Epistle', 'Colossians 3:12-16'), r('Gospel', 'Luke 17:12-19'), r('Epistle ((Недели 29-й) ** . Прп)', '2 Corinthians 4:6-15'), r('Gospel ((Недели 29-й) ** . Прп)', 'Luke 6:17-23')],
      title: 'Неделя 29-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 7 декабря ст. ст. — Неделя 29-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261207.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 11:9-10; 11:32-40'), r('Evanghelie', 'Matthew 1:1-25')],
      title: 'Duminica dinaintea Nașterii Domnului (a Sfinților Părinți după trup ai Domnului)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 20 decembrie', url: 'https://doxologia.ro/20-decembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Și părtaș obiceiurilor și următor scaunelor Apostolilor fiind, lucrare ai aflat, de Dumnzeu însuflate, spre suirea privirii la cele înalte. Pentru aceasta, cuvântul adevărului drept învățând și cu credință răbdând până la sânge, Sfințite Mucenice Ignatie, roagă-te lui Hristos Dumnezeu să mântuiască sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Sfințit Mucenic Ignatie Teoforul', url: 'https://doxologia.ro/troparul-sfantului-sfintit-mucenic-ignatie-teoforul', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 2',
          text: 'Mari sunt faptele credinţei; că în mijlocul izvorului văpăii, ca într-o apă de odihnă sfinţii trei Tineri s-au bucurat şi Proo­rocul Daniel păstor leilor ca unor oi s-a arătat. Pentru rugăciunile lor, Hristoase Dum­nezeule, miluieşte-ne pe noi.',
          source: { text: 'Doxologia — Troparul Sfinţilor Părinţi după trup ai Domnului', url: 'https://doxologia.ro/troparul-sfintilor-parinti-dupa-trup-ai-domnului', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'S-a înscris oarecând, cu bă­trânul Iosif, în Betleem, Maria, ca cea din sămânţa lui David, purtând în pântece sarcina cea fără de sămânţă. Dar a sosit vremea naşterii şi nici un loc de sălăşluire nu era; ci, ca un palat frumos s-a arătat peştera împă­rătesei. Hristos Se naşte, ca să ridice chipul cel mai înainte căzut.',
          source: { text: 'Doxologia — Tropar la Sărbătoarea Înainte-prăznuirii Naşterii Domnului', url: 'https://doxologia.ro/tropar-la-sarbatoarea-inainte-praznuirii-nasterii-domnului-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Găteşte-te Betleeme, că s-a deschis tuturor Edenul! Împodobeşte-te, Efrata, că Pomul vieţii a înflorit în peşteră din Fecioară! Pentru că pântecele Aceleia Rai Înţelegător s-a ară­tat, întru care este Dumnezeies­cul Pom, din care mâncând vom fi vii şi nu vom muri ca Adam. Hristos Se naşte, ca să ridice chipul cel căzut mai înainte.',
          source: { text: 'Doxologia — Tropar la Sărbătoarea Înainte-prăznuirii Naşterii Domnului', url: 'https://doxologia.ro/tropar-la-sarbatoarea-inainte-praznuirii-nasterii-domnului', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Glas 1 Toată grija cea lumească lepădând, cu un glas să lăudăm pe cel ce este lumină călăuzitoare pământului Rusiei şi lumii întregi, pe preotul Ioan, bunul păstor, care ne-a arătat nouă strălucitorul chip al vieţuirii în Hristos, şi pe pământ fiind, de duhul rugăciunii s-a aprins, şi de la Domnul îndoit dar de tămăduire a dobândit. Cu ale lui sfinte rugăciuni, întru credinţă să ne întărească pe noi Hristos, şi fii neclintiţi ai Bisericii să ne arate, spre mântuirea sufletelor noastre!',
          source: { text: 'Doxologia — Troparul Sfântului Ioan de Kronstadt', url: 'https://doxologia.ro/troparul-sfantului-ioan-de-kronstadt', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: '',
          text: 'Pe făclia virtuții și duhovnicul cel vestit, pe dascălul răbdării din Mănăstirea Sâmbăta de Sus, pe Sfântul Serafim, cei credincioși, cu laude veniți să îl cinstim, și, ca unui iscusit Părinte și rugător, să-i zicem cu evlavie: Slavă Celui pe Care L-ai slujit! Slavă Celui ce te-a luminat! Slavă Celui ce te-a împodobit cu minunate daruri!',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios Serafim cel Răbdător de la Sâmbăta de Sus', url: 'https://doxologia.ro/troparul-sfantului-cuvios-serafim-cel-rabdator-de-la-sambata-de-sus', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Fecioara astăzi... Ziua cea purtătoare de lumină a strălucitoarelor tale nevoințe vestește mai înainte tuturor pe Cel ce S-a născut din Fecioara; că de Acesta însetând și din dragostea de a te îndulci de El, te-ai grăbit a fi măcinat de fiare. Pentru aceasta de Dumnezeu purtător ai fost numit, Ignatie, mărite.',
          source: { text: 'Doxologia — Condacul Sfântului Sfințit Mucenic Ignatie Teoforul', url: 'https://doxologia.ro/condacul-sfantului-sfintit-mucenic-ignatie-teoforul', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 6',
          text: 'Chipul cel scris de mână nu l-aţi cinstit, căci cu Fiinţa Cea Nescrisă într-armându-vă, de trei ori fericiţilor, în lupta cu focul v-aţi preamărit; şi stând în mijlocul văpăii celei de nesu­ferit pe Dumnezeu L-aţi chemat: grăbeşte, o Îndurate şi sârguieşte ca un Milostiv, spre ajuto­rul nostru că poţi toate câte le voieşti.',
          source: { text: 'Doxologia — Condacul Sfinţilor Părinţi după trup ai Domnului', url: 'https://doxologia.ro/condacul-sfintilor-parinti-dupa-trup-ai-domnului', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 1',
          text: 'Ceata îngerească... Veseleşte-te Betleeme, Efrata găteşte-te; că iată Mieluşeaua, purtând în pântece pe Păstorul Cel Mare, se grăbeşte să-L nască; pe Care văzându-L purtătorii de Dumnezeu Pă­rinţi, se bucură împreună cu păstorii, lăudând pe Fecioara, care Îl hrăneşte cu lapte.',
          source: { text: 'Doxologia — Condac la Sărbătoarea Înainteprăznuirii Naşterii Domnului', url: 'https://doxologia.ro/condac-la-sarbatoarea-inaintepraznuirii-nasterii-domnului', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Fecioara astăzi... Fecioara astăzi pe Cuvântul Cel mai înainte de veci merge să-L nască în peşteră în chip de negrăit. Dănţuieşte lumea au­zind, slăveşte cu Îngerii şi cu păstorii pe Cel Ce vine să Se arate Prunc Tânăr, pe Dum­nezeu Cel mai înainte de veci.',
          source: { text: 'Doxologia — Condac la Sărbătoarea Înainte-prăznuirii Naşterii Domnului', url: 'https://doxologia.ro/condac-la-sarbatoarea-inainte-praznuirii-nasterii-domnului-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 2',
          text: 'Cele de sus căutând... În Betleem văzând cu scutece înfăşat pe Cel Ce ţine tot pământui cu mâna, cântări de înainteprăznuire să aducem Ce­lei ce L-a născut; că se veseleşte ca o Maică, ţinând în braţe pe Fiul lui Dumnezeu.',
          source: { text: 'Doxologia — Condac la Sărbătoarea Înainte-prăznuirii Naşterii Domnului', url: 'https://doxologia.ro/condac-la-sarbatoarea-inainte-praznuirii-nasterii-domnului', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Podobie: Fecioara astăzi... Înainte-mergere zilei preamari și slăvite a Nașterii Domnului cu trup din Maica-Fecioară s-a făcut ziua mutării tale la ceruri, cel ce cânți cu serafimii, Părinte Sfinte Serafim, cel în necazuri plin de răbdare, podoaba Cuvioșilor.',
          source: { text: 'Doxologia — Condacul Sfântului Cuvios Serafim cel Răbdător de la Sâmbăta de Sus', url: 'https://doxologia.ro/condacul-sfantului-cuvios-serafim-cel-rabdator-de-la-sambata-de-sus', year: 2026 },
        },
      ],
    },
  },
  '2026-12-21': {
    russian: {
      readings: [r('Epistle', 'Hebrews 8:7-13'), r('Gospel', 'Luke 20:27-44')],
      title: 'Седмица 30-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 8 декабря ст. ст. — Седмица 30-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261208.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 8:7-13'), r('Evanghelie', 'Mark 8:11-21')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 21 decembrie', url: 'https://doxologia.ro/21-decembrie' },
    },
  },
  '2026-12-22': {
    russian: {
      readings: [r('Epistle', 'Hebrews 9:8-10; 9:15-23'), r('Gospel', 'Luke 21:12-19'), r('Epistle (Прав. Анны)', 'Galatians 4:22-31'), r('Gospel (Прав. Анны)', 'Luke 8:16-21')],
      title: 'Седмица 30-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 9 декабря ст. ст. — Седмица 30-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261209.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 9:8-23'), r('Evanghelie', 'Mark 8:22-26')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 22 decembrie', url: 'https://doxologia.ro/22-decembrie' },
    },
  },
  '2026-12-23': {
    russian: {
      readings: [r('Epistle', 'Hebrews 10:1-18'), r('Gospel', 'Luke 21:5-7; 21:10-11; 21:20-24'), r('Epistle (Свт)', 'Hebrews 7:26-8:2'), r('Gospel (Свт)', 'John 10:9-16'), r('Epistle (Мчч)', 'Ephesians 6:10-17'), r('Gospel (Мчч)', 'Luke 21:12-19')],
      title: 'Седмица 30-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 10 декабря ст. ст. — Седмица 30-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261210.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 10:1-18'), r('Evanghelie', 'Mark 8:30-34')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 23 decembrie', url: 'https://doxologia.ro/23-decembrie' },
    },
  },
  '2026-12-24': {
    russian: {
      readings: [r('Epistle', 'Hebrews 10:35-11:7'), r('Gospel', 'Luke 21:28-33')],
      title: 'Седмица 30-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 11 декабря ст. ст. — Седмица 30-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261211.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 10:35-39; 11:1-7'), r('Evanghelie', 'Mark 9:10-15')],
      fastingNote: 'Ajunul Crăciunului',
      source: { text: 'doxologia.ro, 24 decembrie', url: 'https://doxologia.ro/24-decembrie' },
    },
  },
  '2026-12-25': {
    russian: {
      readings: [r('Epistle', 'Hebrews 11:8; 11:11-16'), r('Gospel', 'Luke 21:37-22:8'), r('Epistle (Свт)', 'Hebrews 13:17-21'), r('Gospel (Свт)', 'Luke 6:17-23')],
      title: 'Седмица 30-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 12 декабря ст. ст. — Седмица 30-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261212.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 4:4-7'), r('Evanghelie', 'Matthew 2:1-12')],
      title: 'Nașterea Domnului (Crăciunul)',
      fastingNote: 'Harți',
      source: { text: 'doxologia.ro, 25 decembrie', url: 'https://doxologia.ro/25-decembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Fecioara astăzi... Fecioara astăzi, pe Cel mai presus de fiinţă naşte şi pământul peştera Celui Neapropiat aduce. Îngerii cu păstorii slavoslovesc şi magii cu Steaua călătoresc. Că pentru noi s-a născut Prunc Tânăr, Dumnezeu, Cel mai înainte de veci.',
          source: { text: 'Doxologia — Condac la Praznicul Naşterii Domnului (Crăciunul)', url: 'https://doxologia.ro/condac-la-praznicul-nasterii-domnului-craciunul', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 6',
          text: 'Cel Ce mai înainte de Luceafăr S-a născut din Tatăl fără de mamă, astăzi pe pământ S-a Întrupat din tine, fără de tată. Pentru aceasta steaua bine vesteşte magilor; iar îngerii cu păstorii laudă naşterea ta cea mai presus de fire, Ceea ce eşti Plină de har.',
          source: { text: 'Doxologia — Condacul Praznicului Naşterii Domnului (Crăciunului), la Sărbătoarea Sfântului Ierarh Eftimie Mărturisitorul, Episcopul Sardei', url: 'https://doxologia.ro/condacul-praznicului-nasterii-domnului-craciunului-la-sarbatoarea-sfantului-ierarh-eftimie', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Naşterea Ta, Hristoase, Dumnezeul nostru, răsărit-a lumii lumina cunoştinţei; că întru dânsa cei ce slujeau stelelor de la Stea s-au învăţat să se închine Ţie, Soarelui dreptăţii şi să Te cunoască pe Tine, Răsăritul Cel de sus, Doamne, Slavă Ţie!',
          source: { text: 'Doxologia — Tropar la Praznicul Naşterii Domnului (Crăciunul)', url: 'https://doxologia.ro/tropar-la-praznicul-nasterii-domnului-craciunul', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 6',
          text: 'În Taină Te-ai născut în peşteră, dar cerul pe Tine tuturor Te-a propovăduit, punând Steaua înainte ca o gură, Mântuitorule. Şi a adus Ţie pe magi, care Ţi s-au închinat cu credinţă; împreună cu care miluieşte-ne pe noi.',
          source: { text: 'Doxologia — Tropar la Praznicul Naşterii Domnului (Crăciunul)', url: 'https://doxologia.ro/tropar-la-praznicul-nasterii-domnului-craciunul-0', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 6',
          text: 'Răsărit-ai, Hristoase, ca un Soare Înţelegător al dreptăţii; şi Steaua Te-a arătat încăput în peşteră, pe Tine, Cel Neîncăput. Pe magi i-ai îndreptat spre închinarea Ta, cu care împreună Te slăvim, Dătătorule de viaţă, Slavă Ţie!',
          source: { text: 'Doxologia — Tropar la Praznicul Naşterii Domnului (Crăciunul)', url: 'https://doxologia.ro/tropar-la-praznicul-nasterii-domnului-craciunul-1', year: 2026 },
        },
      ],
    },
  },
  '2026-12-26': {
    russian: {
      readings: [r('Epistle (Мчч)', 'Ephesians 6:10-17'), r('Gospel (Мчч)', 'Luke 21:12-19'), r('Epistle (Ряд)', 'Ephesians 5:1-8'), r('Gospel (Ряд)', 'Luke 13:18-29')],
      title: 'Седмица 30-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 13 декабря ст. ст. — Седмица 30-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261213.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 2:11-18'), r('Evanghelie', 'Matthew 2:13-23')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 26 decembrie', url: 'https://doxologia.ro/26-decembrie' },
    },
  },
  '2026-12-27': {
    russian: {
      readings: [r('Epistle', 'Colossians 3:4-11'), r('Gospel', 'Luke 14:16-24')],
      title: 'Неделя 30-я по Пятидесятнице, святых праотец',
      fastingNote: 'Рождественский пост; Разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 14 декабря ст. ст. — Неделя 30-я по Пятидесятнице, святых праотец', url: 'https://days.pravoslavie.ru/Days/20261214.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Galatians 1:11-19'), r('Apostol', 'Acts 6:8-15; 7:1-5; 7:47-60'), r('Evanghelie', 'Matthew 2:13-23'), r('Evanghelie', 'Matthew 21:33-44')],
      title: 'Duminica după Nașterea Domnului (a Sfinților Iosif Logodnicul, David Prorocul și Iacob, ruda Domnului. Fuga în Egipt)',
      fastingNote: null,
      source: { text: 'doxologia.ro, 27 decembrie', url: 'https://doxologia.ro/27-decembrie' },
      // the day doxologia marks with the rank cross, and the hymns it links for it
      hymns: [
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Încununatu-s-a creștetul tău cu diademă împărătească, pe urma luptelor pe care le-ai pătimit pentru Hristos Dumnezeu, luptătorule cel dintâi printre mucenici. Că vădind nebunia iudeilor, ai văzut pe Mântuitorul tău, de-a dreapta Tatălui. Pe Acela roagă-L totdeauna pentru sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Apostol și Arhidiacon Ștefan', url: 'https://doxologia.ro/troparul-sfantului-apostol-arhidiacon-stefan', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 4',
          text: 'Încununatu-s-a creştetul tău cu diademă împărătească, pe urma luptelor pe care le-ai pătimit pentru Hristos Dumnezeu, luptătorule cel dintâi printre mucenici. Că vădind nebunia iudeilor, ai văzut pe Mântuitorul tău, de-a dreapta Tatălui. Pe Acela roagă-L totdeauna pentru sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Apostol Întâiului Mucenic şi Arhidiacon Ştefan', url: 'https://doxologia.ro/troparul-sfantului-apostol-intaiului-mucenic-arhidiacon-stefan', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 8',
          text: 'Îndreptătorule al Ortodoxiei, învăţătorule al dreptei cinstiri de Dumnezeu şi al curăţiei şi luminătorule al lumii, podoaba călugărilor cea de Dumnezeu insuflată Sfinte Părinte Teodor, înţelepte, cu învăţăturile tale pe toţi i-ai luminat. Alăută duhovnicească, roagă-te lui Hristos Dumnezeu ca să mântuiască sufletele noastre.',
          source: { text: 'Doxologia — Troparul Sfântului Cuvios Teodor Mărturisitorul', url: 'https://doxologia.ro/troparul-sfantului-cuvios-teodor-marturisitorul', year: 2026 },
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 2',
          text: 'Binevesteşte Iosif lui David, Dumnezeiescului părinte, mi­nunile: văzut-ai pe Fecioara născând; cu magii te-ai închi­nat; cu păstorii ai slăvit şi prin îngeri înştiinţare ai primit. Roagă pe Hristos Dumnezeu să mântuiască sufletele noastre.',
          source: { text: 'Doxologia — Tropar la Duminica după Naşterea Domnului', url: 'https://doxologia.ro/tropar-la-duminica-dupa-nasterea-domnului', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Fecioara astăzi ... Stăpânul nostru, ieri a venit la noi cu trup, iar astăzi sluga Lui a ieșit cu totul din trup; ieri Împăratul noastru S-a născut cu trup, astăzi sluga cu pietre este ucisă; că pentru Dânsul se și sfârșește întâiul mucenic și dumnezeiescul Ștefan.',
          source: { text: 'Doxologia — Condacul Sfântului Apostol și Arhidiacon Ștefan', url: 'https://doxologia.ro/condacul-sfantului-apostol-arhidiacon-stefan', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Fecioara astăzi... Stăpânul nostru, ieri a venit la noi cu Trup, iar astăzi sluga Lui a ieşit cu totul din trup; ieri Împăratul nostru S-a născut cu Trup, astăzi sluga cu pietre este ucisă; că pentru Dânsul se şi sfârşeşte întâiul mucenic şi Dumnezeiescul Ştefan.',
          source: { text: 'Doxologia — Condacul Sfântul Apostol Întâiului Mucenic şi Arhidiacon Ştefan', url: 'https://doxologia.ro/condacul-sfantul-apostol-intaiului-mucenic-arhidiacon-stefan', year: 2026 },
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 3',
          text: 'Fecioara astăzi... De veselie astăzi, Dumneze­iescul David se umple; şi Dreptul Iosif împreună cu Iacob, laudă aduce; că luând cunună pentru înrudirea cu Hristos se bucură; şi pe Cel Ce s-a născut în chip de negrăit pe pământ, Îl laudă şi strigă: mântuieşte, Îndurate, pe cei ce Te cinstesc pe Tine.',
          source: { text: 'Doxologia — Condac la Duminica după Naşterea Domnului', url: 'https://doxologia.ro/condac-la-duminica-dupa-nasterea-domnului', year: 2026 },
        },
      ],
    },
  },
  '2026-12-28': {
    russian: {
      readings: [r('Epistle', 'Hebrews 11:17-23; 11:27-31'), r('Gospel', 'Mark 8:11-21'), r('Epistle (Свт)', 'Hebrews 7:26-8:2'), r('Gospel (Свт)', 'John 10:9-16')],
      title: 'Седмица 31-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 15 декабря ст. ст. — Седмица 31-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261215.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 11:17-31'), r('Evanghelie', 'Mark 9:42-50; 10:1')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 28 decembrie', url: 'https://doxologia.ro/28-decembrie' },
    },
  },
  '2026-12-29': {
    russian: {
      readings: [r('Epistle', 'Hebrews 12:25-26; 13:22-25'), r('Gospel', 'Mark 8:22-26')],
      title: 'Седмица 31-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 16 декабря ст. ст. — Седмица 31-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261216.html' },
    },
    romanian: {
      readings: [r('Apostol', 'Hebrews 12:25-29'), r('Evanghelie', 'Mark 10:2-12')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 29 decembrie', url: 'https://doxologia.ro/29-decembrie' },
    },
  },
  '2026-12-30': {
    russian: {
      readings: [r('Epistle', 'James 1:1-18'), r('Gospel', 'Mark 8:30-34'), r('Epistle (Свв)', 'Hebrews 11:33-12:2'), r('Gospel (Свв)', 'Luke 11:47-12:1')],
      title: 'Седмица 31-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 17 декабря ст. ст. — Седмица 31-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261217.html' },
    },
    romanian: {
      readings: [r('Apostol', 'James 1:1-18'), r('Evanghelie', 'Mark 10:11-16')],
      fastingNote: 'Harți',
      source: { text: 'doxologia.ro, 30 decembrie', url: 'https://doxologia.ro/30-decembrie' },
    },
  },
  '2026-12-31': {
    russian: {
      readings: [r('Epistle', 'James 1:19-27'), r('Gospel', 'Mark 9:10-16')],
      title: 'Седмица 31-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 18 декабря ст. ст. — Седмица 31-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261218.html' },
    },
    romanian: {
      readings: [r('Apostol', 'James 1:19-27'), r('Evanghelie', 'Mark 10:17-27')],
      fastingNote: null,
      source: { text: 'doxologia.ro, 31 decembrie', url: 'https://doxologia.ro/31-decembrie' },
    },
  },
  '2027-01-01': {
    russian: {
      readings: [r('Epistle', 'James 2:1-13'), r('Gospel', 'Mark 9:33-41'), r('Epistle (и за субботу)', 'Colossians 1:3-6'), r('Gospel (и за субботу)', 'Luke 14:1-11')],
      title: 'Седмица 31-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 19 декабря ст. ст. — Седмица 31-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261219.html' },
    },
  },
  '2027-01-02': {
    russian: {
      readings: [r('Epistle (Субботы пред Рождеством Христовым)', 'Galatians 3:8-12'), r('Gospel (Субботы пред Рождеством Христовым)', 'Luke 13:18-29'), r('Epistle (Прав)', 'Hebrews 4:14-5:6'), r('Gospel (Прав)', 'Matthew 5:14-19'), r('Gospel (Сщмч)', 'Mark 9:33-41')],
      title: 'Седмица 31-я по Пятидесятнице. Суббота перед Рождеством Христовым',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 20 декабря ст. ст. — Седмица 31-я по Пятидесятнице. Суббота перед Рождеством Христовым', url: 'https://days.pravoslavie.ru/Days/20261220.html' },
    },
  },
  '2027-01-03': {
    russian: {
      readings: [r('Epistle (Недели пред Рождеством Христовым)', 'Hebrews 11:9-10; 11:17-23; 11:32-40'), r('Gospel (Недели пред Рождеством Христовым)', 'Matthew 1:1-25'), r('Epistle (Свт)', 'Hebrews 7:26-8:2'), r('Gospel (Свт)', 'Luke 6:17-23')],
      title: 'Неделя 31-я по Пятидесятнице, перед Рождеством Христовым, святых отец',
      fastingNote: 'Рождественский пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 21 декабря ст. ст. — Неделя 31-я по Пятидесятнице, перед Рождеством Христовым, святых отец', url: 'https://days.pravoslavie.ru/Days/20261221.html' },
    },
  },
  '2027-01-04': {
    russian: {
      readings: [r('Epistle', 'James 2:14-26'), r('Gospel', 'Mark 9:42-10:1'), r('Epistle (Вмц)', 'Galatians 3:23-29'), r('Gospel (Вмц)', 'Luke 7:36-50')],
      title: 'Седмица 32-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: cухоядение (хлеб, овощи, фрукты)',
      source: { text: 'days.pravoslavie.ru, 22 декабря ст. ст. — Седмица 32-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261222.html' },
    },
  },
  '2027-01-05': {
    russian: {
      readings: [r('Epistle', 'James 3:1-10'), r('Gospel', 'Mark 10:2-12'), r('Epistle (Мчч)', 'Ephesians 6:10-17'), r('Gospel (Мчч)', 'Luke 21:12-19')],
      title: 'Седмица 32-я по Пятидесятнице',
      fastingNote: 'Рождественский пост; Монастырский устав: горячая пища без масла',
      source: { text: 'days.pravoslavie.ru, 23 декабря ст. ст. — Седмица 32-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261223.html' },
    },
  },
  '2027-01-06': {
    russian: {
      readings: [r('Epistle (На 1-м часе)', 'Hebrews 1:1-12'), r('Gospel (На 1-м часе)', 'Matthew 1:18-25'), r('Epistle (На 3-м часе)', 'Galatians 3:23-29'), r('Gospel (На 3-м часе)', 'Luke 2:1-20'), r('Epistle (На 6-м часе)', 'Hebrews 1:10-2:3'), r('Gospel (На 6-м часе)', 'Matthew 2:1-12'), r('Epistle (На 9-м часе)', 'Hebrews 2:11-18'), r('Gospel (На 9-м часе)', 'Matthew 2:13-23'), r('Epistle', 'Hebrews 1:1-12'), r('Gospel', 'Luke 2:1-20')],
      title: 'Седмица 32-я по Пятидесятнице',
      fastingNote: 'Рождественский пост. Строгий пост; Пища с растительным маслом',
      source: { text: 'days.pravoslavie.ru, 24 декабря ст. ст. — Седмица 32-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261224.html' },
    },
  },
  '2027-01-07': {
    russian: {
      readings: [r('Epistle', 'Galatians 4:4-7'), r('Gospel', 'Matthew 2:1-12')],
      title: 'Седмица 32-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 25 декабря ст. ст. — Седмица 32-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261225.html' },
      // Совершается служба великому празднику — the calendar's own sign for the day: T6
      hymns: [
        {
          church: 'russian', kind: 'troparion', lang: 'cu', tone: 'глас 4',
          text: 'Рождество Твое, Христе Боже наш,/ возсия мирови свет разума,/ в нем бо звездам служащии/ звездою учахуся/ Тебе кланятися, Солнцу Правды,/ и Тебе ведети с высоты Востока.// Господи, слава Тебе!',
          source: { text: 'days.pravoslavie.ru, 25 декабря ст. ст. — Тропарь Рождества Христова', url: 'https://days.pravoslavie.ru/Days/20261225.html', year: 2026 },
        },
        {
          church: 'russian', kind: 'kontakion', lang: 'cu', tone: 'глас 3',
          text: 'Дева днесь Пресущественнаго раждает,/ и земля вертеп Неприступному приносит,/ Ангели с пастырьми славословят,/ волсви же со звездою путешествуют,/ нас бо ради родися// Отроча Младо, Превечный Бог.',
          source: { text: 'days.pravoslavie.ru, 25 декабря ст. ст. — Кондак Рождества Христова', url: 'https://days.pravoslavie.ru/Days/20261225.html', year: 2026 },
        },
      ],
    },
  },
  '2027-01-08': {
    russian: {
      readings: [r('Epistle (Богородицы)', 'Hebrews 2:11-18'), r('Gospel (Богородицы)', 'Matthew 2:13-23')],
      title: 'Седмица 32-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 26 декабря ст. ст. — Седмица 32-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261226.html' },
    },
  },
  '2027-01-09': {
    russian: {
      readings: [r('Epistle (Субботы по Рождестве Христовом)', '1 Timothy 6:11-16'), r('Gospel (Субботы по Рождестве Христовом)', 'Matthew 12:15-21'), r('Epistle (Ряд. (под зачало))', '1 Thessalonians 5:14-23'), r('Gospel (Ряд. (под зачало))', 'Luke 16:10-15'), r('Epistle (Первомч)', 'Acts 6:8-15; 7:1-5; 7:47-60'), r('Gospel (Первомч)', 'Matthew 21:33-42')],
      title: 'Седмица 32-я по Пятидесятнице. Суббота по Рождестве Христовом',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 27 декабря ст. ст. — Седмица 32-я по Пятидесятнице. Суббота по Рождестве Христовом', url: 'https://days.pravoslavie.ru/Days/20261227.html' },
    },
  },
  '2027-01-10': {
    russian: {
      readings: [r('Epistle (Недели по Рождестве Христовом)', 'Galatians 1:11-19'), r('Gospel (Недели по Рождестве Христовом)', 'Matthew 2:13-23')],
      title: 'Неделя 32-я по Пятидесятнице, по Рождестве Христовом',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 28 декабря ст. ст. — Неделя 32-я по Пятидесятнице, по Рождестве Христовом', url: 'https://days.pravoslavie.ru/Days/20261228.html' },
    },
  },
  '2027-01-11': {
    russian: {
      readings: [r('Epistle', '1 Peter 2:21-3:9'), r('Gospel', 'Mark 10:46-52'), r('Epistle (Мчч)', '2 Corinthians 5:15-21'), r('Gospel (Мчч)', 'Matthew 2:13-23')],
      title: 'Седмица 33-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 29 декабря ст. ст. — Седмица 33-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261229.html' },
    },
  },
  '2027-01-12': {
    russian: {
      readings: [r('Epistle', '1 Peter 3:10-22'), r('Gospel', 'Mark 11:11-23'), r('Epistle (Свт)', 'Hebrews 7:26-8:2'), r('Gospel (Свт)', 'John 10:9-16')],
      title: 'Седмица 33-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 30 декабря ст. ст. — Седмица 33-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261230.html' },
    },
  },
  '2027-01-13': {
    russian: {
      readings: [r('Epistle', '1 Peter 4:1-11'), r('Gospel', 'Mark 11:23-26'), r('Epistle (Прп. Паисия)', 'Galatians 5:22-6:2'), r('Gospel (Прп. Паисия)', 'Luke 6:17-23')],
      title: 'Седмица 33-я по Пятидесятнице',
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 31 декабря ст. ст. — Седмица 33-я по Пятидесятнице', url: 'https://days.pravoslavie.ru/Days/20261231.html' },
    },
  },
};

/** What one church's calendar recorded for a day, or null. */
export const recordedDay = (iso, churchId) => LITURGICAL_DAYS[iso]?.[churchId] ?? null;

/**
 * The last civil date any of the four calendars has been read for.
 *
 * Derived, never written down: a literal date in a printed sentence is a
 * sentence that goes stale, and one already had — the Daily page told readers
 * "the corpus reaches 19 September" for a fortnight after it stopped being
 * true. The Daily page uses this to say, once and in prose, that a day past
 * the end of the records has no readings rather than none printed.
 */
export const RECORDS_REACH = Object.keys(LITURGICAL_DAYS).sort().at(-1) ?? null;

/** A Bible Gateway link for a reference, in the NKJV for now (author, 2026-08-22). */
export const bibleGatewayUrl = (ref) =>
  `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=NKJV`;
