/**
 * A saint's name in the reader's language (author, 2026-08-26: "there are
 * names like 'The Twenty-three Martyrs' who do not translate across
 * languages, and the names are not printed in cyrillic when the Russian
 * language is chosen. Same with the Greek and Serbian. Every saint name needs
 * to have the equivalent in the displayed language").
 *
 * **The corpus already holds these.** Every one of the 708 folders carries a
 * `names` array of forms with their language, transcribed from the same
 * calendar entries the attestations were read from — «Феврония Муромская»,
 * «Άγιος Άνθιμος Ιερομάρτυρας επίσκοπος Νικομήδειας», „Sfântul Sfințit
 * Mucenic Antim, Episcopul Nicomidiei". They were shown on the saint page
 * under "Also called" until the author removed that block (Amendment 38) and
 * have been in the data, unused, since. Nothing here is invented; this only
 * chooses which recorded form to print.
 *
 * **Where a language has no form, the reason is usually not a gap.** A saint
 * has a Romanian name when a Romanian calendar names them, and 116 of 708 do;
 * for the rest there is no Romanian source to take a name from, and English
 * stands. Counted against the churches that actually keep each saint the
 * coverage is 393/393 Russian, 331/344 Greek, 116/122 Romanian, 116/129
 * Serbian — so the fallback is nearly always "this church does not keep this
 * saint", not "nobody looked".
 *
 * Two rules decide what is usable, and both exist because a calendar entry is
 * not a name field:
 *
 * 1. **A form naming several people is not this saint's name.** The Greek
 *    entry for Agathocleia is «Άγιοι Εύοδος, Καλλίστη, Αγαθόκλεια και
 *    Ερμογένης» — the whole company of that day. Printing it over one of them
 *    would be a false claim about who is commemorated. Detected by the
 *    language's own conjunction rather than by punctuation, because a comma
 *    in these entries is usually an apposition ("Osie, Episcopul Cordobei")
 *    and rejecting those would throw away good names. A saint whose *English*
 *    name is itself a company keeps the listed form, because there the list
 *    is the name.
 * 2. **The honorific and rank are stripped.** The site prints its own — St. /
 *    Sf. / Св. / Άγ. / Св., `lib/honorific.js` — and «Св. Св. Аврамије» is
 *    what leaving them in produces.
 *
 * The choosing happens at build time (`scripts/build-manifest.mjs`) so the
 * manifest carries one clean form per language and the runtime is a lookup.
 */

/* Honorifics and ranks, longest first, applied repeatedly: an entry may open
   with both ("Sfântul Sfințit Mucenic", «Св. муч.»). */
const PREFIXES = {
  ru: [
    'Священномученик', 'Священномученика', 'Преподобномученик', 'Великомученик',
    'Преподобный', 'Преподобная', 'Преподобного', 'Благоверный', 'Праведный',
    'Святитель', 'Святителя', 'Святые', 'Святая', 'Святой', 'Мученик', 'Мученица',
    'Блаженный', 'Пророк', 'Апостол', 'Праотец',
    'Сщмч.', 'Прмч.', 'Вмч.', 'Прп.', 'Свт.', 'Блгв.', 'Прав.', 'Мчч.', 'Мц.', 'Мч.',
    'Свв.', 'Св.',
  ],
  el: [
    'Ιερομάρτυρας', 'Οσιομάρτυρας', 'Μεγαλομάρτυρας', 'Νεομάρτυρας', 'Μάρτυρας',
    'Προφήτης', 'Προφήτιδα', 'Ομολογητής', 'Νεομάρτυς',
    'Απόστολος', 'Όσιος', 'Οσία', 'Όσιοι', 'Δίκαιος', 'Δικαία',
    'Άγιος', 'Αγία', 'Άγιοι', 'Άγιες', 'Αγ.',
  ],
  ro: [
    'Sfinții Mucenici', 'Sfântul Sfințit Mucenic', 'Sfânta Muceniță', 'Sfântul Mucenic',
    'Sfântul Mare Mucenic', 'Sfântul Ierarh', 'Sfântul Apostol', 'Sfântul Proroc',
    'Sfântul Cuvios',
    'Sfinții', 'Sfintele', 'Sfântul', 'Sfânta', 'Sf.',
    'Marele Mucenic', 'Mare Mucenic', 'Noul Mucenic', 'Nou-Mucenic', 'Preot Mucenic',
    'Mucenic', 'Muceniță', 'Ierarh', 'Cuvios', 'Cuvioasa', 'Cuvioasă', 'Cuviosul',
    'Proorocul', 'Proorocița', 'Apostol', 'Dreptul', 'Dreapta', 'Fericitul', 'Fericita',
    'Mărturisitorul', 'Mărturisitoarea',
  ],
  sr: [
    'Свештеномученик', 'Преподобномученик', 'Великомученик', 'Преподобни',
    'Преподобна', 'Мученик', 'Мученица', 'Праведни', 'Пророк', 'Апостол', 'Праотац',
    'Свети', 'Света', 'Свете', 'Преп.', 'Св. свештеномуч.', 'Св. муч.', 'Св.',
    'свештеномученик', 'мученик', 'мученица', 'преподобни', 'муч.', 'преп.',
    'праотац', 'пророк',
  ],
};

/* "and", in each language: the mark that an entry is naming a company. */
/* Spaces rather than `\b`, because JavaScript's word boundary is ASCII-only:
   `/\bκαι\b/` never matches, since a Greek letter is not a word character to
   it, and `/\bи\b/` and `/\bși\b/` fail the same way. Found by the unit test
   for this file, which had been passing every listed Greek entry straight
   through while looking like it filtered them. */
const CONJUNCTION = {
  ru: /(?:^|\s)и(?:\s|$)/,
  el: /(?:^|\s)και(?:\s|$)/,
  ro: /(?:^|\s)și(?:\s|$)/,
  sr: /(?:^|\s)и(?:\s|$)/,
};

/*
 * A rank in the plural is the other way an entry names a company, and it does
 * it without a conjunction: «Св. исповедници Едески» is *the confessors of
 * Edessa*, and the Serbian calendar prints that one line for three men. All
 * three folders carried it as their own name, so the site printed the company
 * over each of them in turn - which is the same false claim rule 1 above
 * exists to refuse, arriving by a door that rule could not see. Found
 * 2026-08-27, when the rank moved into the name and made it read «Исповедник
 * исповедници Едески».
 */
const PLURAL_RANK = {
  ru: /(мученики|мученицы|исповедники|апостолы|пророки|преподобные|святители)/i,
  sr: /(мученици|мученице|исповедници|апостоли|пророци|преподобни|светитељи)/i,
  el: /(μάρτυρες|ομολογητές|απόστολοι|προφήτες|όσιοι|ιερομάρτυρες)/i,
  ro: /(mucenici|mărturisitori|apostoli|prooroci|cuvioși)/i,
};

export const LANGS = ['ru', 'el', 'ro', 'sr'];

/** An English display name that is itself a company, so a list is right. */
const englishNamesMany = (name) =>
  /\band\b|\bThe (?:Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Twenty|Thirty|Forty|Soldiers|Clergy|Martyrs|Monk)/i.test(
    name ?? '',
  );

/*
 * Greek writes the rank *after* the name as often as before it — «Βαβύλας ο
 * Ιερομάρτυρας επίσκοπος Αντιοχείας», «Φανούριος ο Νεοφανής, ο
 * Μεγαλομάρτυρας» — and stripping only what leads left the site printing
 * «Ιερομάρτυς Βαβύλας ο Ιερομάρτυρας» once the rank moved into the name
 * (2026-08-27). Thirty-one Greek forms read that way.
 *
 * Only Greek does this here, and deliberately. The article makes the
 * apposition unambiguous: «ο Ομολογητής» after a name is that name's rank. In
 * Romanian the same words appear in the genitive of *another* saint — «Natalia,
 * soția Sfântului Mucenic Adrian» — and a stripper that cannot tell the two
 * apart would delete Adrian's rank out of Natalia's name. The Romanian cases
 * are all leading, so the prefix list above is enough for them.
 */
/*
 * The article is optional because the entries write it both ways — «Βαβύλας ο
 * Ιερομάρτυρας» and «Άνθιμος Ιερομάρτυρας» — and it is matched *separately*
 * from the rank so that a byname keeps its own: «Ιλαρίων ο νέος
 * οσιομάρτυρας» loses the rank and stays "the New".
 *
 * The tail is a lookahead and not `\b`, for the reason the conjunction test
 * below already carries: JavaScript's word boundary is ASCII-only, so `\b`
 * after «Ιερομάρτυρας» never matches and the whole rule would sit there
 * looking right and doing nothing.
 */
const EL_APPOSITION =
  /\s*,?(?:\s+(?:ο|η|οι|το))?\s+(?:ιερομάρτυρας|οσιομάρτυρας|μεγαλομάρτυρας|νεομάρτυρας|νεομάρτυς|παρθενομάρτυς|μάρτυρας|μάρτυρες|απόστολος|ομολογητής|ομολογήτρια|προφήτης|προφήτιδα|όσιος|οσία|δίκαιος|δικαία)(?=[\s,]|$)/giu;

const stripAppositions = (form, lang) =>
  lang === 'el' ? String(form).replace(EL_APPOSITION, '').replace(/\s{2,}/g, ' ').trim() : form;

function stripPrefixes(form, lang) {
  let out = String(form).trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const before = out;
    for (const prefix of PREFIXES[lang]) {
      if (out.startsWith(prefix + ' ')) {
        out = out.slice(prefix.length + 1).trim();
        break;
      }
    }
    if (out === before) break;
  }
  return out;
}

/**
 * One display form per language, from a saint's recorded `names`. Returns an
 * object with only the languages that have a usable form; a language with
 * none is left out entirely rather than set to the English, so a caller can
 * tell "no name recorded" from "the name happens to be the same".
 */
export function pickNameForms(names, displayName) {
  const out = {};
  const many = englishNamesMany(displayName);
  for (const lang of LANGS) {
    const usable = [];
    for (const entry of names ?? []) {
      if (entry?.lang !== lang || !entry?.form) continue;
      const bare = stripAppositions(stripPrefixes(entry.form, lang), lang);
      if (!bare) continue;
      if (!many && CONJUNCTION[lang].test(bare)) continue;
      if (!many && PLURAL_RANK[lang].test(bare)) continue;
      usable.push(bare);
    }
    // The fullest recorded form: «Стефан Ермолин» says more than «Стефан»,
    // and both are recorded for the same man.
    if (usable.length) out[lang] = usable.reduce((a, b) => (b.length > a.length ? b : a));
  }
  return out;
}
