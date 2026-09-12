import test from 'node:test';
import assert from 'node:assert/strict';
import { pickNameForms } from '../src/lib/saint-name.js';

/*
 * The choosing that turns a folder's recorded name forms into one display
 * name per language (author, 2026-08-26). It runs at build time, into the
 * manifest, so this is where it is checked — the runtime is a lookup.
 */

test('a recorded form is used, with its honorific, rank and office stripped', () => {
  const names = [
    { form: 'Феврония Муромская', lang: 'ru' },
    { form: 'Sfântul Sfințit Mucenic Antim, Episcopul Nicomidiei', lang: 'ro' },
    { form: 'Άγιος Άνθιμος Ιερομάρτυρας επίσκοπος Νικομήδειας', lang: 'el' },
    { form: 'Преп. Аврамије Смоленски', lang: 'sr' },
  ];
  assert.deepEqual(pickNameForms(names, 'Anthimus, Bishop of Nicomedia'), {
    ru: 'Феврония Муромская',
    // The site prints its own rank, so the entry's own honorific and rank
    // come off: «Св. Св. Аврамије» is what leaving them in produces. The
    // office comes off too, now (2026-09-04) — `card.office` already says
    // "Bishop of Nicomedia" in English on the line below the name, and the
    // comma clause said it again in Romanian.
    ro: 'Antim',
    /*
     * **And the Greek rank comes off wherever it sits.** Until 2026-08-27 only
     * a leading one was stripped, which was enough while the site printed
     * "Άγ." in front of everything; with the rank in the name it produced
     * «Ιερομάρτυς Άνθιμος Ιερομάρτυρας επίσκοπος Νικομήδειας». Greek writes
     * the rank after the name as readily as before it, and 31 of the recorded
     * Greek forms did. **The office («επίσκοπος Νικομήδειας») is not a rank,
     * and stays** (flagged and left at the time, and it is left again
     * 2026-09-04) — Greek is the one pack that attaches an office with no
     * comma at all, and the strip below is anchored on a comma on purpose
     * (see its own comment): reaching this case unsafely deleted other
     * saints' fathers out of *their* names in the same sweep that fixed the
     * comma cases. Narrower than was asked for, and said so here
     * rather than quietly.
     */
    el: 'Άνθιμος επίσκοπος Νικομήδειας',
    sr: 'Аврамије Смоленски',
  });
});

test('the office comes off in all four languages, and a kinship or byname comma does not', () => {
  /*
   * A sweep of the corpus (2026-09-04) found 32 recorded forms across ro, el
   * and sr where the office was still restated in the name after the comma
   * the rank strip never reached — matching `card.office`, which already
   * prints the same office in English on the line below. None found in ru.
   * A handful of each shape, kept as regressions.
   */
  assert.deepEqual(
    pickNameForms([{ form: 'Александар, патријарх Цариградски', lang: 'sr' }], 'Alexander, Patriarch of Constantinople'),
    { sr: 'Александар' },
  );
  assert.deepEqual(pickNameForms([{ form: 'Ketevan, regina Georgiei', lang: 'ro' }], 'Ketevan, Queen of Georgia'), {
    ro: 'Ketevan',
  });
  // An ordinal before the office is stripped with it — «први патријарх», not
  // just «патријарх».
  assert.deepEqual(
    pickNameForms([{ form: 'Јоаникије, први патријарх српски', lang: 'sr' }], 'Joannicius, Patriarch of Serbia'),
    { sr: 'Јоаникије' },
  );
  // A kinship or descriptive comma is not an office and stays, in every
  // language, whether or not the record carries an `office` field at all.
  assert.deepEqual(pickNameForms([{ form: 'Elisabeta, mama Sfântului Ioan Botezătorul', lang: 'ro' }], 'Elizabeth'), {
    ro: 'Elisabeta, mama Sfântului Ioan Botezătorul',
  });
  assert.deepEqual(pickNameForms([{ form: 'Зиновий (Мажуга), в схиме Серафим', lang: 'ru' }], 'Zenobius (Mazhuga)'), {
    ru: 'Зиновий (Мажуга), в схиме Серафим',
  });
  // A byname after the office is kept — only the office clause comes off.
  assert.deepEqual(
    pickNameForms([{ form: 'Όσιος Συμεών, ο Λέσβιος, Στυλίτης', lang: 'el' }], 'Symeon the Lesbian, Stylite'),
    { el: 'Συμεών, ο Λέσβιος' },
  );
  /*
   * **Why the strip needs a comma, not just an office word.** A version of
   * this rule tried matching after plain whitespace too, to reach Greek's own
   * comma-less appositions (the test above). A corpus sweep caught what it
   * broke the same day: «Ιωάσαφ γιος του βασιλιά της Ινδίας Αβενίρ» is
   * "Joasaph, son of the king of India, Avenir" — a kinship clause naming
   * Joasaph's *father's* office, not his own — and the comma-less rule read
   * "the king" as an apposition on Joasaph and deleted the rest of his
   * father's own name with it. A genitive kinship clause and a trailing
   * office apposition share the same shape without a comma between them.
   */
  assert.deepEqual(
    pickNameForms([{ form: 'Ιωάσαφ γιος του βασιλιά της Ινδίας Αβενίρ', lang: 'el' }], 'Joasaph of India'),
    { el: 'Ιωάσαφ γιος του βασιλιά της Ινδίας Αβενίρ' },
  );
});

test('a rank in the plural names a company too, and without a conjunction', () => {
  /*
   * «Св. исповедници Едески» is *the confessors of Edessa*, one line the
   * Serbian calendar prints for three men, and all three folders carried it
   * as their own Serbian name. There is no "и" in it, so the conjunction rule
   * above could not see it, and the site printed the company over each of
   * them in turn. Found 2026-08-27 when the rank moved into the name and it
   * started reading «Исповедник исповедници Едески».
   */
  const names = [{ form: 'Св. исповедници Едески', lang: 'sr' }];
  assert.deepEqual(pickNameForms(names, 'Barses of Edessa'), {});
  // A saint whose English name is itself a company keeps the listed form,
  // because there the list is the name.
  assert.deepEqual(pickNameForms(names, 'The Martyrs of Edessa'), { sr: 'исповедници Едески' });
});

test('a form naming the whole company is not one saint’s name', () => {
  /*
   * The Greek entry for Agathocleia is the day's whole company —
   * «Άγιοι Εύοδος, Καλλίστη, Αγαθόκλεια και Ερμογένης» — and printing it over
   * her alone would be a false claim about who is commemorated. 65 of the 331
   * Greek forms are entries like this.
   */
  const names = [{ form: 'Άγιοι Εύοδος, Καλλίστη, Αγαθόκλεια και Ερμογένης', lang: 'el' }];
  assert.deepEqual(pickNameForms(names, 'Agathocleia of Nicomedia'), {});
  // Unless the saint *is* a company, where the list is the name.
  assert.deepEqual(pickNameForms(names, 'The Martyrs Euodus and Callista and Hermogenes'), {
    el: 'Εύοδος, Καλλίστη, Αγαθόκλεια και Ερμογένης',
  });
});

test('the fullest recorded form wins, and a language with none is absent', () => {
  const names = [
    { form: 'Стефан', lang: 'ru' },
    { form: 'Стефан Ермолин', lang: 'ru' },
  ];
  const picked = pickNameForms(names, 'Stephen (Yermolin), Presbyter, Hieromartyr (1937)');
  assert.equal(picked.ru, 'Стефан Ермолин');
  // Absent rather than English: a caller can tell "not recorded" from "the
  // same in both", and the reason is usually that the church reading in that
  // language does not keep this saint.
  assert.equal('el' in picked, false);
  assert.deepEqual(pickNameForms([], 'Alban of Britain'), {});
  assert.deepEqual(pickNameForms(null, 'Alban of Britain'), {});
});

test('the strip list reaches a rank standing behind another rank', () => {
  /*
   * **What this was**: eighteen forms across the corpus printed a rank where
   * the name belongs, and the Romanian name days were where it showed —
   * «Sfântul Cuvios Mărturisitor Sofian de la Antim» reached the reader as
   * *Mărturisitor*, «Sfânta Împărăteasă Pulheria» as *Împărăteasă*. The list
   * stripped the honorific, then the rank behind it, and stopped at a third
   * word it did not hold. English was right on both, which is what made it a
   * strip-list defect rather than a corpus one (`corpus-gate.mjs` counts
   * them). Three words is also why the loop runs four passes and not three.
   */
  assert.deepEqual(
    pickNameForms([{ form: 'Sfântul Cuvios Mărturisitor Sofian de la Antim', lang: 'ro' }], 'Sofian of Antim'),
    { ro: 'Sofian de la Antim' },
  );
  assert.deepEqual(pickNameForms([{ form: 'Sfânta Împărăteasă Pulheria', lang: 'ro' }], 'Pulcheria the Empress'), {
    ro: 'Pulheria',
  });
  assert.deepEqual(pickNameForms([{ form: 'Sfântul Ierarh Martir Antim Ivireanul', lang: 'ro' }], 'Antim Ivireanul'), {
    ro: 'Antim Ivireanul',
  });
  // The feminine of a rank the list held only in the masculine.
  assert.deepEqual(pickNameForms([{ form: 'Sfânta Mare Muceniță Eufimia', lang: 'ro' }], 'Euphemia'), {
    ro: 'Eufimia',
  });
});

test('Romanian is written with two different t, and the list matches both', () => {
  /*
   * ț is the comma-below letter Romanian actually uses and ţ is the legacy
   * cedilla code point a great deal of Romanian text still carries. The corpus
   * holds both — «Sfânta Muceniţă Hira» with the cedilla beside «Sfânta Mare
   * Muceniță Eufimia» with the comma — and a list written in one spelling
   * walked past the other and printed *Muceniţă* as a name. `corpus-gate.mjs`
   * walked past it too, for the same reason, which is why it reported
   * fourteen of the eighteen.
   */
  assert.deepEqual(pickNameForms([{ form: 'Sfânta Muceniţă Hira', lang: 'ro' }], 'Hira'), { ro: 'Hira' });
  // **Folded for matching only.** What reaches the reader is the character the
  // source wrote, not a normalised copy of it.
  assert.deepEqual(pickNameForms([{ form: 'Sfânta Muceniţă Chiriachiţa', lang: 'ro' }], 'Kyriaki'), {
    ro: 'Chiriachiţa',
  });
});

test('a Serbian rank is stripped in lower case and in its short form', () => {
  /*
   * The Serbian entries write the rank after the honorific in lower case —
   * «Свети апостол Тадеј» — and the list held only the capitalised word, so
   * three apostles, a righteous woman and an empress printed their rank.
   * «Свешт. муч.» is «Св. свештеномуч.» written shorter and four more forms
   * carried it past the whole list, past the gate's own regex as well.
   */
  assert.deepEqual(pickNameForms([{ form: 'Свети апостол Тадеј', lang: 'sr' }], 'Thaddeus'), { sr: 'Тадеј' });
  assert.deepEqual(pickNameForms([{ form: 'праведна Јелисавета', lang: 'sr' }], 'Elizabeth'), { sr: 'Јелисавета' });
  assert.deepEqual(pickNameForms([{ form: 'Свешт. муч. Кукша', lang: 'sr' }], 'Kuksha'), { sr: 'Кукша' });
  // Serbian puts the title in front of the name, so a leading office is a
  // title like any other here — unlike Greek, two tests down.
  assert.deepEqual(pickNameForms([{ form: 'Епископ Атанасије', lang: 'sr' }], 'Athanasius'), { sr: 'Атанасије' });
  assert.deepEqual(
    pickNameForms([{ form: 'Преп. царица Ирина, у монаштву названа Ксенија', lang: 'sr' }], 'Irene the Empress'),
    { sr: 'Ирина, у монаштву названа Ксенија' },
  );
});

test('a rank word standing in front of an office is a name, in Greek', () => {
  /*
   * «Άγιος Όσιος επίσκοπος Κορδούης της Ισπανίας» is Hosius of Córdoba, and
   * Ὅσιος is his name — the same word the Greek calendars use for
   * *Venerable*. Stripping it left «επίσκοπος Κορδούης της Ισπανίας»: an
   * office, a place, and nobody named. Greek writes the office *behind* the
   * name with no comma at all in 64 of its 441 recorded forms, so a word
   * sitting in front of an office that has a place behind it is filling the
   * name slot.
   *
   * The office itself stays, as it does for every other Greek form: it has no
   * comma in front of it, and `stripTrailingOffice` above is anchored on a
   * comma on purpose — see its own test two up.
   */
  assert.deepEqual(
    pickNameForms([{ form: 'Άγιος Όσιος επίσκοπος Κορδούης της Ισπανίας', lang: 'el' }], 'Hosius of Córdoba'),
    { el: 'Όσιος επίσκοπος Κορδούης της Ισπανίας' },
  );
  // A one-word office is the whole name and is left alone: Basilissa and
  // Papas are two saints, not a queen and a pope.
  assert.deepEqual(pickNameForms([{ form: 'Αγία Βασίλισσα', lang: 'el' }], 'Basilissa of Nicomedia'), {
    el: 'Βασίλισσα',
  });
  assert.deepEqual(pickNameForms([{ form: 'Άγιος Πάπας', lang: 'el' }], 'Papas of Laranda'), { el: 'Πάπας' });
  // And the rank in front of an ordinary name still comes off.
  assert.deepEqual(pickNameForms([{ form: 'Όσιος Μελέτιος επίσκοπος Κύπρου', lang: 'el' }], 'Meletius of Cyprus'), {
    el: 'Μελέτιος επίσκοπος Κύπρου',
  });
  // «Αγίες» and «Άγιες» are one word accented two ways and the corpus writes
  // both; only one was listed.
  assert.deepEqual(pickNameForms([{ form: 'Αγίες Δύο Κόρες', lang: 'el' }], 'The Two Maidens'), { el: 'Δύο Κόρες' });
});
