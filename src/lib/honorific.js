import { currentLanguage } from './i18n.js';
import { STRINGS } from '../ui/strings.js';

/**
 * The rank in front of a saint's name (author, 2026-08-27), which reverses the
 * blanket "St." of 2026-08-24.
 *
 * That earlier decision was not wrong about the corpus it had: `display_name`
 * held the name, the office, the rank and the death year in one string -
 * "Gorazd, Bishop of Bohemia and Moravia-Silesia, Hieromartyr (1942)" - and
 * "St." was the one honorific that could not collide with a rank already
 * sitting in the name. Splitting the data (saints-naming-addendum.md, Step 1)
 * is what made this possible, and it was done first for exactly that reason.
 *
 * Neither major English-language Orthodox calendar names saints the other way.
 * OCA prints *Venerable Moses the Ethiopian*, *Righteous Hezekiah*, *Prophet
 * Zacharias*: the rank is part of the name, not a category beside it. "St."
 * becomes the marked case - hierarchs, bishops, theologians, 58 of 742 - which
 * is also how OCA prints those.
 *
 * The manifest keeps the bare name. Nothing here is written into the data, so
 * sorting still files a saint under their own initial and search still matches
 * what the reader types.
 */

/**
 * A collective is not given a rank. "The Fifty Martyrs of Palestine" is a
 * company, and "Martyr The Fifty Martyrs" is not English; there are 22 of
 * these in the corpus and every one announces itself with a leading article,
 * which was checked against the whole corpus rather than assumed.
 */
const isCollective = (name) => /^The\s/.test(name);

/**
 * The monastic types imply *Venerable* whether or not the record says so.
 * Nine folders carry `monk`, `hermit`, `ascetic` or `monastic` without
 * `venerable` - Anthony the Great and Paul of Thebes among them, two of the
 * seven saints who actually have an icon - and would otherwise fall through to
 * "St". Implying it here rather than tagging those nine also covers the
 * monastic added next year whose author forgets the tag.
 */
const MONASTIC = ['monk', 'hermit', 'ascetic', 'monastic', 'abbot', 'abbess', 'stylite', 'hieromonk', 'recluse'];

/**
 * **The precedence, in words**, because it is an editorial choice and not a
 * lookup: where a saint carries several ranks, the one printed is the one the
 * church names them by. Reading down, the first that matches wins.
 *
 *  1. Righteous Forefather - Abraham, Isaac, Jacob. The corpus already
 *     distinguishes `patriarch-of-israel` from `patriarch`, so this needs no
 *     list of names: the Forefathers are typed apart from the patriarchs of
 *     Constantinople and Alexandria, and "Patriarch Abraham" was never a risk.
 *  2. Great Martyr, then Virgin Martyr, then Passion-bearer - the three the
 *     services single out. Great before Virgin reverses the addendum's order:
 *     `great-martyr` is the rarer and stronger title, and putting Virgin first
 *     would have printed *Virgin Martyr* over a saint the calendars call a
 *     Great Martyr.
 *  3. Equal to the Apostles, then Apostle, then Prophet - the ranks that place
 *     a figure in the history rather than in the manner of their death.
 *  4. The martyrdoms, most particular first: Hieromartyr, Venerable Martyr,
 *     New Martyr, plain Martyr.
 *  5. Venerable, Confessor, Blessed, Righteous.
 *  6. "St" for everyone else, which is the hierarchs, bishops and theologians.
 */
const PRECEDENCE = [
  ['forefather', (t) => t.has('patriarch-of-israel')],
  ['great-martyr', (t) => t.has('great-martyr')],
  ['virgin-martyr', (t) => t.has('martyr') && t.has('virgin')],
  ['passion-bearer', (t) => t.has('passion-bearer')],
  ['equal-to-the-apostles', (t) => t.has('equal-to-the-apostles')],
  ['apostle', (t) => t.has('apostle')],
  ['prophet', (t) => t.has('prophet') || t.has('prophetess')],
  ['hieromartyr', (t) => t.has('hieromartyr')],
  ['venerable-martyr', (t) => t.has('venerable-martyr')],
  ['new-martyr', (t) => t.has('new-martyr')],
  ['martyr', (t) => t.has('martyr')],
  ['venerable', (t) => t.has('venerable') || MONASTIC.some((m) => t.has(m))],
  ['confessor', (t) => t.has('confessor')],
  ['blessed', (t) => t.has('fool-for-christ')],
  ['righteous', (t) => t.has('righteous')],
];

/**
 * The types a printed rank has already said, so the saint page's facts line
 * can stop repeating them: "Hieromartyr, Bishop" under a heading that reads
 * *Hieromartyr Abda* says the word twice. Only the ranks are dropped - `abbot`,
 * `virgin`, `bishop` and the rest stay, because *Venerable* does not say
 * Abbot and the facts line is where a reader finds out.
 */
const SPOKEN_FOR = {
  forefather: ['patriarch-of-israel', 'righteous'],
  'great-martyr': ['great-martyr', 'martyr'],
  'virgin-martyr': ['martyr'],
  'passion-bearer': ['passion-bearer'],
  'equal-to-the-apostles': ['equal-to-the-apostles'],
  apostle: ['apostle'],
  prophet: ['prophet', 'prophetess'],
  hieromartyr: ['hieromartyr', 'martyr'],
  'venerable-martyr': ['venerable-martyr', 'martyr'],
  'new-martyr': ['new-martyr', 'martyr'],
  martyr: ['martyr'],
  venerable: ['venerable'],
  confessor: ['confessor'],
  blessed: ['fool-for-christ'],
  righteous: ['righteous'],
  honorific: [],
};

/**
 * A record's types with the ones already said removed — by the rank in the
 * name, and by the office beside them. "Reposed 1942 · Bishop of Bohemia and
 * Moravia-Silesia · Bishop" is the second case, and it is compared on the
 * slug rather than on the type's translated name because both halves of the
 * comparison are the corpus's own English: `office` is recorded data, like
 * `display_name`, and does not follow the reader's language.
 */
export function typesBeside(card) {
  const said = new Set(SPOKEN_FOR[rankKey(card)] ?? []);
  const office = String(card?.office ?? '').toLowerCase();
  return (card?.types ?? []).filter((t) => !said.has(t) && !(office && office.includes(t.replace(/-/g, ' '))));
}

/** Which rank a record resolves to. `honorific` is the fallback, never absent. */
export function rankKey(card) {
  const types = new Set(card?.types ?? []);
  for (const [key, test] of PRECEDENCE) if (test(types)) return key;
  return 'honorific';
}

/**
 * The rank in the reader's language, in the form the saint's sex takes.
 *
 * The four languages that are not English decline these, which the old
 * abbreviation-only honorific was chosen precisely to avoid; the file's own
 * header used to say a spelled-out form "would need the saint's sex, which the
 * manifest carries, and a grammar per language, which it does not". Half of
 * that objection was always smaller than it read. `sex` is populated on all
 * 742 records - 633 male, 89 female, 20 unknown, and the unknowns are the
 * collectives, which take no rank at all - so what is needed is two forms per
 * label, which is a table and not a grammar. Unknown reads as the masculine,
 * which is the unmarked form in all four.
 */
export function rankLabel(card) {
  const key = rankKey(card);
  const forms = STRINGS.saints?.ranks?.[key] ?? STRINGS.saints?.ranks?.honorific;
  if (!forms) return '';
  return (card?.sex === 'female' ? forms.f : forms.m) || forms.m || '';
}

/**
 * Names that take no rank at all. Two cases, and the second is here before the
 * work that needs it: a **collective**, and a **feast**. When the Great Feasts
 * become folders the blanket honorific would have printed "St. Dormition of
 * the Theotokos", and "St. Mary" if the Theotokos ever gets an entry of her
 * own. `kind: "feast"` is an explicit opt-out in the schema rather than a
 * guess about the shape of the name; nothing in the corpus carries it yet.
 */
const takesNoRank = (card, english) => card?.kind === 'feast' || isCollective(english);

/** Already carrying one, in any of the five spellings, stopped or not. */
const alreadyPrefixed = (name) => /^(St\.?|Saint|Sf\.?|Св\.?|Άγ\.?)\s/.test(name);

/**
 * "Gorazd" → "Hieromartyr Gorazd"; a collective or a feast is returned
 * unchanged. The card is what decides the rank, so a bare string still gets
 * the fallback - which is what the honorific was.
 */
export function withHonorific(displayName, card = null) {
  const name = String(displayName ?? '');
  if (!name || takesNoRank(card, name)) return name;
  if (alreadyPrefixed(name)) return name;
  const label = rankLabel(card);
  return label ? `${label} ${name}` : name;
}

/**
 * A search query with a leading rank taken off it.
 *
 * The index holds the bare name, and every name is *drawn* with a rank in
 * front of it, so a reader typing back what the screen shows — "Venerable
 * Anthony the Great" — must not be told there is no such saint. Dropping the
 * word from the query rather than adding it to the index is deliberate: terms
 * combine with AND, and a term no document carries would zero every search it
 * appeared in.
 *
 * It has to be built from the pack rather than written down, because the rank
 * is now sixteen words in five languages instead of one abbreviation, and
 * because *Venerable* is not always a type: it is implied for the monastics,
 * so the index has no such term for Anthony the Great at all. Longest first,
 * so "Venerable Martyr" is taken off before "Venerable" can take half of it.
 */
export function withoutRank(query) {
  const pack = STRINGS.saints?.ranks ?? {};
  const labels = [...new Set(Object.values(pack).flatMap((f) => [f.m, f.f]))]
    .concat(['St', 'Saint', 'Sf', 'Св', 'Άγ'])
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const trimmed = String(query).trim();
  for (const label of labels) {
    const lower = trimmed.toLowerCase();
    if (lower.startsWith(label.toLowerCase() + ' ') || lower.startsWith(label.toLowerCase() + '. ')) {
      return trimmed.slice(trimmed.indexOf(' ', label.length - 1) + 1).trim();
    }
  }
  return trimmed;
}

/**
 * A saint's name as this reader should see it (author, 2026-08-26): the form
 * the corpus recorded in their language where there is one, the English
 * otherwise, with the rank in front either way.
 *
 * The manifest carries one chosen form per language - `lib/saint-name.js`
 * argues the choosing, and does it at build time, stripping the honorific and
 * rank the source calendar printed so this one is not said twice. Where a
 * language has none, the reason is usually that the church reading in that
 * language does not keep this saint, so there is no source in it to take a
 * name from.
 *
 * **Whether a name takes a rank is decided on the English**, always. "The
 * Twenty-three Martyrs" takes none because "Martyr The Twenty-three Martyrs"
 * is not English; «Двадцать три мученика» carries no article to give the test
 * a handle, so asking the localised form would put a rank in front of a
 * company. The English name is the one place the corpus is complete, and it is
 * the same figure either way.
 */
export function saintName(card) {
  const english = String(card?.display_name ?? '');
  const local = card?.names?.[currentLanguage()];
  const name = local ? String(local) : english;
  if (!name || takesNoRank(card, english)) return name;
  return withHonorific(name, card);
}
