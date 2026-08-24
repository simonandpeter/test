import { currentLanguage } from './i18n.js';

/**
 * The honorific in front of a saint's name (author, 2026-08-24): the corpus is
 * saints, so every name is read with "St." before it, and the rank — martyr,
 * hieromartyr, presbyter, hierarch — is a category in the profile rather than
 * part of the name. The rank already lives in `types` and is printed on the
 * saint page's facts line; nothing here touches it.
 *
 * This is applied when a name is drawn, never written into the data. The
 * manifest keeps the bare name, so sorting still files a saint under their own
 * initial rather than filing all 708 under S, and search still matches what
 * the reader types.
 */

/**
 * A collective is not given the honorific. "The Fifty Martyrs of Palestine" is
 * a company, and "St The Fifty Martyrs" is not English; there are 26 of these
 * in the corpus and they all announce themselves with a leading article.
 */
const isCollective = (name) => /^The\s/.test(name);

/**
 * The honorific itself, in the reader's language (author, 2026-08-25: "please
 * add '.' after St or Sf, so its St. or Sf., same in other languages if this
 * grammar applies").
 *
 * The stop is an abbreviation mark and every one of these is an abbreviation,
 * so all five take it — English "St." included, which is the American
 * convention rather than the British one the rest of this site follows, and
 * is what the author asked for. The Cyrillic pair abbreviate the same way:
 * «Св.» for Russian and Serbian alike, «Άγ.» for Greek, "Sf." for Romanian.
 *
 * What this does *not* do is decline. Greek «Άγ.» and Slavonic «Св.» take a
 * feminine form for a woman — «Αγ.»/«Св.» are read as such by convention —
 * and Romanian marks it outright ("Sf." serves both, but "Sfânta" and
 * "Sfântul" do not). The abbreviated forms are exactly the ones that avoid
 * the question, which is why they are what is printed; a spelled-out
 * honorific would need the saint's sex, which the manifest carries, and a
 * grammar per language, which it does not.
 */
const HONORIFICS = { en: 'St.', ro: 'Sf.', ru: 'Св.', el: 'Άγ.', sr: 'Св.' };

/** "John Chrysostom" → "St. John Chrysostom"; a collective is returned unchanged. */
export function withHonorific(displayName) {
  const name = String(displayName ?? '');
  if (!name || isCollective(name)) return name;
  const honorific = HONORIFICS[currentLanguage()] ?? HONORIFICS.en;
  // Already carrying one, in any of the five spellings or the old stopless
  // English the corpus was written with.
  if (/^(St\.?|Saint|Sf\.?|Св\.?|Άγ\.?)\s/.test(name)) return name;
  return `${honorific} ${name}`;
}
