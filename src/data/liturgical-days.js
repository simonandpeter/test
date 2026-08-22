/**
 * What each church's own calendar printed for a day, read off that calendar
 * and recorded here by hand (author's instruction, 2026-08-22): the scripture
 * readings and the fasting note, per civil date, per church. The lectionary
 * itself is not yet in the build — this is the week of 23–29 August 2026, and
 * the Daily page prints a day's readings only where they are recorded. The
 * paschal-cycle title, the tone and whether a day is a fast are computed in
 * lib/liturgy.js and checked against these same pages in its tests.
 *
 * References are normalised to English book names so they can be linked (the
 * Greek pages cite them by letter-numbers); where a source's citation looks
 * like a misprint it is kept and said so, never silently corrected.
 *
 * Sources, read 2026-08-22:
 *   russian  — days.pravoslavie.ru/Days/2026MMDD.html (Julian date in the path)
 *   romanian — doxologia.ro/DD-august
 *   greek    — saint.gr/08/DD/index.aspx
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
};

/** What one church's calendar recorded for a day, or null. */
export const recordedDay = (iso, churchId) => LITURGICAL_DAYS[iso]?.[churchId] ?? null;

/** A Bible Gateway link for a reference, in the NKJV for now (author, 2026-08-22). */
export const bibleGatewayUrl = (ref) =>
  `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=NKJV`;
