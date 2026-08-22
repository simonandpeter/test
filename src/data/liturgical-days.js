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
  },
  '2026-08-27': {
    russian: {
      readings: [r('Epistle', '2 Corinthians 10:7-18'), r('Gospel', 'Mark 3:28-35')],
      fastingNote: 'Успенский пост',
      source: { text: 'days.pravoslavie.ru, 14 августа ст. ст.', url: RU('0814') },
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
  },
  '2026-08-28': {
    russian: {
      // The Dormition of the Theotokos, 15 August in the Julian calendar.
      readings: [r('Epistle', 'Philippians 2:5-11'), r('Gospel', 'Luke 10:38-42; 11:27-28')],
      fastingNote: 'Успение Пресвятой Богородицы; на трапезе разрешается рыба',
      source: { text: 'days.pravoslavie.ru, 15 августа ст. ст.', url: RU('0815') },
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
  },
  '2026-08-29': {
    russian: {
      // 16 August in the Julian calendar: the Image Not Made by Hands.
      readings: [r('Epistle', 'Colossians 1:12-18'), r('Gospel', 'Luke 9:51-56; 10:22-24')],
      fastingNote: 'Поста нет',
      source: { text: 'days.pravoslavie.ru, 16 августа ст. ст.', url: RU('0816') },
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
  },
};

/** What one church's calendar recorded for a day, or null. */
export const recordedDay = (iso, churchId) => LITURGICAL_DAYS[iso]?.[churchId] ?? null;

/** A Bible Gateway link for a reference, in the NKJV for now (author, 2026-08-22). */
export const bibleGatewayUrl = (ref) =>
  `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=NKJV`;
