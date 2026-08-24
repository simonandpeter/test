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
        },
        {
          church: 'romanian', kind: 'kontakion', lang: 'ro', tone: 'Glasul 4',
          text: 'Sfinţii Ioachim şi Ana din defăimarea nenaşterii de fii, iar Adam şi Eva din stricăciunea morţii au scăpat, Preacurată, prin Sfântă naşterea ta. Aceasta o prăznuieşte şi poporul tău, de vina greşelilor mântuindu-se, când striga către tine: cea stearpă naşte pe Născătoarea de Dumnezeu şi Hrănitoarea vieţii noastre.',
          source: { text: 'Doxologia — Condac la Praznicul Naşterii Maicii Domnului', url: 'https://doxologia.ro/condac-la-praznicul-nasterii-maicii-domnului', year: 2026 },
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
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος δ’.', model: 'Αὐτόμελον.',
          text: 'Ἰωακεὶμ καὶ Ἄννα ὀνειδισμοῦ ἀτεκνίας, καὶ Ἀδὰμ καὶ Εὔα, ἐκ τῆς φθορᾶς τοῦ θανάτου, ἠλευθερώθησαν, Ἄχραντε, ἐν τῇ ἁγίᾳ γεννήσει σου, αὐτὴν ἑορτάζει καὶ ὁ λαός σου, ἐνοχῆς τῶν πταισμάτων, λυτρωθεὶς ἐν τῷ κράζειν σοι· Ἡ Στεῖρα τίκτει τὴν Θεοτόκον, καὶ τροφὸν τῆς ζωῆς ἡμῶν.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Γέννηση της Υπεραγίας Θεοτόκου, Λειτουργικά κείμενα: Κοντάκιον', url: 'https://www.saint.gr/955/saint.aspx', year: 2026 },
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
        },
        {
          church: 'romanian', kind: 'troparion', lang: 'ro', tone: 'Glasul 1',
          text: 'Mântuieşte, Doamne, poporul Tău şi binecuvintează moştenirea Ta; biruinţă binecredincioşilor creştini asupra celui protivnic dăruieşte şi cu Crucea Ta păzeşte pe poporul Tău.',
          source: { text: 'Doxologia — Tropar la Praznicul Înălţării Sfintei Cruci', url: 'https://doxologia.ro/tropar-la-praznicul-inaltarii-sfintei-cruci', year: 2026 },
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
        },
        {
          church: 'greek', kind: 'kontakion', lang: 'el', tone: 'Ἦχος δ’.', model: 'Αὐτόμελον.',
          text: 'Ὁ ὑψωθεὶς ἐν τῷ Σταυρῷ ἑκουσίως, τῇ ἐπωνύμῳ σου καινὴ πολιτεία, τοὺς οἰκτιρμούς σου δώρησαι, Χριστὲ ὁ Θεός, Εὔφρανον ἐν τῇ δυνάμει σου, τοὺς πιστοὺς Βασιλεῖς ἡμῶν, νίκας χορηγῶν αὐτοῖς, κατὰ τῶν πολεμίων, τὴν συμμαχίαν ἔχοιεν τὴν σήν, ὅπλον εἰρήνης, ἀήττητον τρόπαιον.',
          source: { text: 'Ορθόδοξος Συναξαριστής (saint.gr) — Ύψωση του Τιμίου και Ζωοποιού Σταυρού, Λειτουργικά κείμενα: Κοντάκιον', url: 'https://www.saint.gr/2391/saint.aspx', year: 2026 },
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
};

/** What one church's calendar recorded for a day, or null. */
export const recordedDay = (iso, churchId) => LITURGICAL_DAYS[iso]?.[churchId] ?? null;

/** A Bible Gateway link for a reference, in the NKJV for now (author, 2026-08-22). */
export const bibleGatewayUrl = (ref) =>
  `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=NKJV`;
