/**
 * A reading's reference, in the reader's own language, linked to a Bible in
 * that language (author, 2026-08-25).
 *
 * The corpus's references are English and stay English in the data — they are
 * keys as much as text, and `liturgical-days.js` is transcribed from four
 * calendars that each print their own. What varies here is the *display*, and
 * where the link goes.
 *
 * **Where each language's link goes, and how it was settled.** Every scheme
 * below was opened and read before it was written down; none is a guess.
 *
 * - Russian → Bible Gateway's Russian Synodal text (`RUSV`), the same host the
 *   site already used, with the version swapped.
 * - Greek → greekbible.com, which takes a path of `/{book}/{chapter}/` with
 *   slugs like `1-corinthians` (verified against Matthew 19).
 * - Serbian → wordproject.org/bibles/sr, which takes `/{n}/{chapter}.htm` with
 *   the ordinary book numbering, 40 being Matthew (verified likewise).
 * - Romanian → **not** ebiblia.ro, which the author asked for. Its reader is a
 *   JavaScript application whose own navigation is `javascript:app.…` calls;
 *   it exposes no addressable passage URL to link to. Rather than ship a link
 *   that opens the front page and leaves the reader to find the chapter, the
 *   Romanian link goes to Bible Gateway's Cornilescu (`RMNN`), which opens the
 *   passage. Recorded for the author to overrule: if eBiblia gains a deep
 *   link, it is one line here.
 *
 * A language with no entry falls back to the English NKJV the site opened
 * with, which is what an English reader gets.
 */

/**
 * The books the lectionary actually cites.
 *
 * *Amended in place (Amendment 44).* This said "sixteen, and it is a closed
 * set", which was true of the four weeks it was written for and stopped being
 * true when the Russian and Romanian records ran on to January: those months
 * cite six books more. The set is still closed and still measured — every
 * reference in the harvest is checked against this table, and a book that is
 * missing is named rather than discovered by a reader. It is *not* the whole
 * Bible, and should not become it: an entry earns its place by being cited.
 *
 * A reference whose book is absent still renders and still links — in English,
 * through Bible Gateway in the reader's own version — so a gap is a blemish
 * and never a break.
 *
 * No Old Testament book is cited by any day recorded so far, which is worth
 * knowing before one is added: greekbible.com carries the New Testament only,
 * and an Old Testament entry would need `greek: null` and a fallback rather
 * than a slug that returns the site's index.
 */
const BOOKS = {
  Matthew: { n: 40, greek: 'matthew', ro: 'Matei', ru: 'Матфея', el: 'Ματθαίον', sr: 'Матеј' },
  Mark: { n: 41, greek: 'mark', ro: 'Marcu', ru: 'Марка', el: 'Μάρκον', sr: 'Марко' },
  Luke: { n: 42, greek: 'luke', ro: 'Luca', ru: 'Луки', el: 'Λουκάν', sr: 'Лука' },
  John: { n: 43, greek: 'john', ro: 'Ioan', ru: 'Иоанна', el: 'Ιωάννην', sr: 'Јован' },
  Acts: { n: 44, greek: 'acts', ro: 'Faptele Apostolilor', ru: 'Деяния', el: 'Πράξεις', sr: 'Дела апостолска' },
  Romans: { n: 45, greek: 'romans', ro: 'Romani', ru: 'Римлянам', el: 'Ρωμαίους', sr: 'Римљанима' },
  '1 Corinthians': { n: 46, greek: '1-corinthians', ro: '1 Corinteni', ru: '1 Коринфянам', el: 'Α΄ Κορινθίους', sr: '1. Коринћанима' },
  '2 Corinthians': { n: 47, greek: '2-corinthians', ro: '2 Corinteni', ru: '2 Коринфянам', el: 'Β΄ Κορινθίους', sr: '2. Коринћанима' },
  Galatians: { n: 48, greek: 'galatians', ro: 'Galateni', ru: 'Галатам', el: 'Γαλάτας', sr: 'Галатима' },
  Ephesians: { n: 49, greek: 'ephesians', ro: 'Efeseni', ru: 'Ефесянам', el: 'Εφεσίους', sr: 'Ефесцима' },
  Philippians: { n: 50, greek: 'philippians', ro: 'Filipeni', ru: 'Филиппийцам', el: 'Φιλιππησίους', sr: 'Филипљанима' },
  Colossians: { n: 51, greek: 'colossians', ro: 'Coloseni', ru: 'Колоссянам', el: 'Κολοσσαείς', sr: 'Колошанима' },
  '1 Thessalonians': { n: 52, greek: '1-thessalonians', ro: '1 Tesaloniceni', ru: '1 Фессалоникийцам', el: 'Α΄ Θεσσαλονικείς', sr: '1. Солуњанима' },
  '1 Timothy': { n: 54, greek: '1-timothy', ro: '1 Timotei', ru: '1 Тимофею', el: 'Α΄ Τιμόθεον', sr: '1. Тимотеју' },
  Titus: { n: 56, greek: 'titus', ro: 'Tit', ru: 'Титу', el: 'Τίτον', sr: 'Титу' },
  '2 Thessalonians': { n: 53, greek: '2-thessalonians', ro: '2 Tesaloniceni', ru: '2 Фессалоникийцам', el: 'Β΄ Θεσσαλονικείς', sr: '2. Солуњанима' },
  '2 Timothy': { n: 55, greek: '2-timothy', ro: '2 Timotei', ru: '2 Тимофею', el: 'Β΄ Τιμόθεον', sr: '2. Тимотеју' },
  Philemon: { n: 57, greek: 'philemon', ro: 'Filimon', ru: 'Филимону', el: 'Φιλήμονα', sr: 'Филимону' },
  Hebrews: { n: 58, greek: 'hebrews', ro: 'Evrei', ru: 'Евреям', el: 'Εβραίους', sr: 'Јеврејима' },
  James: { n: 59, greek: 'james', ro: 'Iacov', ru: 'Иакова', el: 'Ιακώβου', sr: 'Јаковљева' },
  '1 Peter': { n: 60, greek: '1-peter', ro: '1 Petru', ru: '1 Петра', el: 'Α΄ Πέτρου', sr: '1. Петрова' },
  '1 John': { n: 62, greek: '1-john', ro: '1 Ioan', ru: '1 Иоанна', el: 'Α΄ Ιωάννου', sr: '1. Јованова' },
};

const GATEWAY = { en: 'NKJV', ru: 'RUSV', ro: 'RMNN' };

/**
 * "1 Corinthians 15:1-11" → { book, rest, chapter }. The rest is kept whole,
 * including a second passage after a semicolon ("Luke 10:38-42; 11:27-28"),
 * because a reference is a quotation of the calendar and is not rewritten.
 */
export function parseRef(ref) {
  const text = String(ref ?? '').trim();
  const book = Object.keys(BOOKS).find((b) => text.startsWith(`${b} `));
  if (!book) return { book: null, rest: text, chapter: null, entry: null };
  const rest = text.slice(book.length + 1);
  const chapter = Number(rest.match(/^(\d+)/)?.[1] ?? 0) || null;
  return { book, rest, chapter, entry: BOOKS[book] };
}

/** The reference as the reader's language prints it; English where unknown. */
export function refInLanguage(ref, language) {
  const { book, rest, entry } = parseRef(ref);
  if (!book || !entry) return String(ref ?? '');
  const name = entry[language] ?? book;
  return `${name} ${rest}`;
}

/** Where the reference opens, in a Bible of the reader's own language. */
export function bibleUrl(ref, language) {
  const { book, chapter, entry } = parseRef(ref);
  if (book && entry && chapter) {
    if (language === 'el') return `https://www.greekbible.com/${entry.greek}/${chapter}/`;
    if (language === 'sr') return `https://www.wordproject.org/bibles/sr/${entry.n}/${chapter}.htm`;
  }
  const version = GATEWAY[language] ?? GATEWAY.en;
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=${version}`;
}
