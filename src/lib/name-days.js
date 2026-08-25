/**
 * Whose name day it is (author, 2026-08-26: "add name days").
 *
 * In Orthodox practice a name day is the feast of the saint whose name you
 * bear, and in Greece, Romania, Russia and Serbia alike it is the day that is
 * actually kept — more so, in places, than a birthday. A calendar that prints
 * the day's saints and not the day's names is missing the question most people
 * bring to it.
 *
 * **Nothing here is invented, and nothing is looked up.** The names are the
 * corpus's own: the day's commemorations in the reader's chosen calendar, each
 * reduced to the personal name it starts with. That reduction is the only
 * judgement in the file and it is a narrow one — the same cut `lib/cross-link.js`
 * makes, at the first comma or bracket, and then the first word of what is
 * left. "Basil Sungurov, Priest" is Basil; "Eugene (Vyzhva), Abbot" is Eugene;
 * "John, Archbishop of Novgorod" is John.
 *
 * In the reader's own language where the corpus recorded a form in it, because
 * a name day is the reader's *name* and «Иоанн» is not "John" to the person
 * whose it is. `lib/saint-name.js` has already stripped the honorific and the
 * rank from those forms at build time, so the first word is the name.
 *
 * Three things are deliberately not done:
 *
 *   * **A company is not a name.** "The Fifty Martyrs of Palestine" gives
 *     nobody a name day, and neither does "The Twenty-three Martyrs". Decided
 *     on the English, always, for the reason `lib/honorific.js` gives: the
 *     other four languages carry no article to test.
 *   * **No name is completed, corrected or transliterated.** If the corpus
 *     holds no Romanian form for a saint the Romanian reader sees the English
 *     name, exactly as they do everywhere else on the site. Guessing that
 *     "Sozon" is "Sozon" in Romanian would be a claim about Romanian usage
 *     that no source here supports.
 *   * **No name is linked where two saints of the day share it.** Same rule as
 *     the cross-linker's fourth: the site cannot tell which is meant.
 */

/** A name a company bears rather than a person: decided on the English. */
const isCollective = (englishName) => /^The\s/.test(String(englishName ?? ''));

/**
 * The personal name a commemoration starts with, or null where there is not
 * one. `lang` picks the recorded form; English is the fallback and the one
 * language the corpus is complete in.
 */
export function givenName(card, lang = 'en') {
  const english = String(card?.display_name ?? '');
  if (!english || isCollective(english)) return null;
  const local = lang !== 'en' ? card?.names?.[lang] : null;
  const source = String(local || english);
  const head = source.split(/[(,]/)[0].trim();
  const first = head.split(/[\s ]+/)[0]?.replace(/[^\p{L}\p{M}'’-]+$/u, '') ?? '';
  // Two letters is the shortest real name in these languages; anything below
  // it is punctuation or an initial that survived the cut.
  if (first.length < 2) return null;
  return first;
}

/**
 * The day's names, once each, in the order the reader's language sorts them.
 * `slug` is the saint to open when exactly one of the day's commemorations
 * bears the name, and null when more than one does.
 */
export function nameDays(cards, { lang = 'en', locale = 'en' } = {}) {
  const byName = new Map();
  for (const card of cards ?? []) {
    const name = givenName(card, lang);
    if (!name) continue;
    if (byName.has(name)) byName.set(name, null);
    else byName.set(name, card.slug);
  }
  return [...byName.entries()]
    .map(([name, slug]) => ({ name, slug }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
