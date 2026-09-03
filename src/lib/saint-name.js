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

/*
 * **An office restates itself after a comma, in the reader's own language, a
 * second time** — `card.office` already says "Bishop of Nicomedia" in
 * English, on the line below the name (`lib/honorific.js`, Amendment 50: "the
 * office moves to the line below"), and until now the comma clause that said
 * the same thing in Romanian, Greek, Serbian or Russian was left standing in
 * the name itself: «Antim, Episcopul Nicomidiei». The rank stripped above is
 * a *word in front of* the name; an office is a *noun plus the place that
 * follows it*, and needed a rule of its own — this was flagged and
 * deliberately left for later at Amendment 50's writing ("one does now, and
 * that one is an office rather than a rank").
 *
 * Anchored on a **comma** and then the office noun, so a kinship or
 * companionship clause is never touched — "fiica lui Fanuel", "в схиме
 * Серафим", "ο Λέσβιος" — none of them open with a word this list knows, the
 * same reasoning `display_name` already applies to keep "son of Bassa" in the
 * bare name (Amendment 50). The comma matters beyond marking where a clause
 * starts: an earlier version of this rule matched an office word after plain
 * whitespace too, to reach Greek's own comma-less "Άνθιμος επίσκοπος
 * Νικομήδειας" (the exact case Amendment 50 flagged and left), and a corpus
 * sweep threw it out again the same day — "Ιωάσαφ γιος του βασιλιά της
 * Ινδίας Αβενίρ" is "Joasaph, son of **the king** of India, Avenir", and the
 * comma-less rule read "the king" as Joasaph's own office and deleted his
 * father's title, and his father's name, out of the sentence. A genitive
 * kinship clause and a trailing office apposition are the same shape without
 * a comma between them, and this file already has no grammar to tell them
 * apart. **The comma-less Greek case stays open, not silently** - narrower
 * than Amendment 50 asked for, on purpose, rather than fixed unsafely. An
 * optional ordinal ("први", "Други") covers the Serbian forms that number a
 * see's hierarchs before naming the office.
 *
 * **The place after the office noun is consumed word by word, not to the end
 * of the string** — stopping at the next comma or "and" rather than a greedy
 * `.*$` — because a company entry can carry an office on its *first* member
 * before the comma that starts naming the rest: "Φήλιξ ο επίσκοπος,
 * Ιανουάριος ο πρεσβύτερος, Φορτουνάτος και Σεπτιμίνος" is four men, and a
 * greedy strip at the first office word would delete the other three along
 * with the conjunction the company filter below reads to reject the whole
 * line. Bounded, it removes only "ο επίσκοπος" and leaves the rest for that
 * filter to catch on its own terms.
 */
/*
 * `\p{L}*`, not `\w*` — the ASCII-only trap this file's own comments already
 * name twice over (the conjunction regex, the Greek apposition tail): `\w` is
 * `[A-Za-z0-9_]` even under the `u` flag, so an office root followed by a
 * Cyrillic or Greek inflection ("епископ**а**", "επίσκοπ**ος**") matched
 * nothing past the root, left the ending unconsumed, and failed the lookahead
 * that follows it — every one of these alternatives silently matched zero
 * saints until this was caught by the test for the no-comma Greek case.
 */
const OFFICE_WORD = {
  ru: 'митрополит\\p{L}*|архиепископ\\p{L}*|епископ\\p{L}*|патриарх\\p{L}*|архимандрит\\p{L}*|игумен\\p{L}*|иеромонах\\p{L}*|схиархимандрит\\p{L}*|иеросхимонах\\p{L}*|схимонах\\p{L}*|монах\\p{L}*|монахин\\p{L}*|протоиере\\p{L}*|протодиакон\\p{L}*|иеродиакон\\p{L}*|архидиакон\\p{L}*|диакон\\p{L}*|пресвитер\\p{L}*|священник\\p{L}*|иере\\p{L}*|папа\\p{L}*|княз\\p{L}*|княгин\\p{L}*|цар\\p{L}*|короле\\p{L}*|коро\\p{L}*|император\\p{L}*|воевод\\p{L}*|иконописец\\p{L}*|столпник\\p{L}*|псаломщик\\p{L}*|послушник\\p{L}*',
  el: 'αρχιεπίσκοπ\\p{L}*|επίσκοπ\\p{L}*|μητροπολίτ\\p{L}*|πατριάρχ\\p{L}*|πρωτοπρεσβύτερ\\p{L}*|πρεσβύτερ\\p{L}*|ιερέ\\p{L}*|πρωθιερ\\p{L}*|αρχιδιάκον\\p{L}*|πρωτοδιάκον\\p{L}*|διάκον\\p{L}*|ηγούμεν\\p{L}*|αρχιμανδρίτ\\p{L}*|ιερομόναχ\\p{L}*|μοναχ\\p{L}*|πρίγκιπ\\p{L}*|πριγκίπισσ\\p{L}*|βασιλι\\p{L}*|βασίλισσ\\p{L}*|αυτοκράτορ\\p{L}*|αυτοκράτειρ\\p{L}*|αγιογράφ\\p{L}*|στυλίτ\\p{L}*|πάπ\\p{L}*',
  ro: 'arhiepiscop\\p{L}*|mitropolit\\p{L}*|episcop\\p{L}*|patriarh\\p{L}*|arhimandrit\\p{L}*|egumen\\p{L}*|stare[țţ]\\p{L}*|ieromonah\\p{L}*|monahi\\p{L}*|monah\\p{L}*|protoiere\\p{L}*|protopop\\p{L}*|arhidiacon\\p{L}*|diacon\\p{L}*|preot\\p{L}*|prin[țţ]es\\p{L}*|prin[țţ]\\p{L}*|regin\\p{L}*|rege\\p{L}*|împ[ăa]r[ăa]tea\\p{L}*|împ[ăa]rat\\p{L}*|voievod\\p{L}*|iconograf\\p{L}*|st[âa]lpnic\\p{L}*|pap\\p{L}*',
  sr: 'архиепископ\\p{L}*|митрополит\\p{L}*|епископ\\p{L}*|еп\\.|патријарх\\p{L}*|архимандрит\\p{L}*|игуман\\p{L}*|јеромонах\\p{L}*|монахињ\\p{L}*|монах\\p{L}*|презвитер\\p{L}*|свештеник\\p{L}*|протојереј\\p{L}*|прот\\p{L}*|архиђакон\\p{L}*|ђакон\\p{L}*|дијакон\\p{L}*|краљиц\\p{L}*|краљ\\p{L}*|кнегињ\\p{L}*|кнез\\p{L}*|цариц\\p{L}*|цар\\p{L}*|војвод\\p{L}*|иконописац\\p{L}*|столпник\\p{L}*|пап\\p{L}*',
};

const ORDINAL = {
  ru: '(?:перв(?:ый|ого)|втор(?:ой|ого)|трет(?:ий|ьего))\\s+',
  el: '',
  ro: '',
  sr: '(?:први|друг(?:и|ог)|трећ(?:и|ег))\\s+',
};

/* Only Greek writes an article in front of the office - «ο Επίσκοπος», never
   *«Episcopul Episcopul» - consumed with it so the strip never orphans a
   bare "ο" the way an article-blind match would. */
const ARTICLE = { ru: '', el: '(?:ο|η|οι|το)\\s+', ro: '', sr: '' };

/* "and", repeated from `CONJUNCTION`'s own languages, as a word the office's
   trailing place must stop before rather than swallow. */
const AND_WORD = { ru: 'и', el: 'και', ro: 'și', sr: 'и' };

const TRAILING_OFFICE = Object.fromEntries(
  LANGS.map((lang) => [
    lang,
    new RegExp(
      `,\\s*(?:${ARTICLE[lang]})?(?:${ORDINAL[lang]})?(?:${OFFICE_WORD[lang]})(?:\\s+(?!${AND_WORD[lang]}\\b)[^\\s,]+)*(?=[\\s,]|$)`,
      'giu',
    ),
  ]),
);

const stripTrailingOffice = (form, lang) =>
  String(form).replace(TRAILING_OFFICE[lang], '').replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').trim();

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
      const bare = stripTrailingOffice(stripAppositions(stripPrefixes(entry.form, lang), lang), lang);
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
