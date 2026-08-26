/**
 * What a day's fast *allows*, read off the church's own calendar (author,
 * 2026-08-25 evening: "the fasting text should say which type of fast is
 * required, and the pop-up shouldn't explain more than what that day
 * requires").
 *
 * This is the one honest way the site can answer that question. `lib/liturgy.js`
 * states which fast a day falls in and refuses to compute the day's allowance,
 * because the allowance is the typikon's and jurisdictions keeping the very
 * same fast differ — a rule this file does not repeal. What it does instead is
 * *read*: each of the four calendars prints its own allowance beside the day
 * where it has one, in its own words, and those words are already transcribed
 * into `data/liturgical-days.js`. So the grade is a quotation resolved to a
 * closed vocabulary, never a derivation.
 *
 * Which means the honest answer is sometimes "no grade". A calendar that
 * printed «Νηστεία» and nothing else has said the day is a fast and has not
 * said what it allows; the page then says exactly that much and no more. The
 * one grade taken from anywhere else is `fish`, and only when liturgy.js has
 * already declared the day fish-permitted — that claim is liturgy.js's own,
 * made under DESIGN.md's "the two allowances every typikon shares", and this
 * file merely names it in the same vocabulary as the rest.
 *
 * The vocabulary, strictest first:
 *
 *   strict     a fast whose calendar named no allowance (2026-08-26); the
 *              strictest reading, and the default rather than a quotation
 *   xerophagy  uncooked food, without oil or wine
 *   no-oil     cooked food, still without oil or wine
 *   oil        oil and wine permitted
 *   fish       fish permitted
 *   dairy      no meat; dairy and eggs permitted (Cheesefare Week)
 *   none       not a fast
 *
 * The patterns below are the words those four calendars actually print. Said
 * plainly: only the ones marked *seen* are exercised by today's four weeks of
 * data — the rest are written from the same calendars' own vocabulary for the
 * days not yet transcribed, and each is matched on a whole phrase rather than
 * a stem, because «горячая пища без масла» and «пища с растительным маслом»
 * differ by one word and mean opposite things.
 *
 * One trap is worth naming, because it cost this file a whole grade in
 * silence. days.pravoslavie.ru prints «Монастырский устав: cухоядение (хлеб,
 * овощи, фрукты)», and the first letter of that word is a LATIN SMALL LETTER
 * C. It renders exactly like the Cyrillic «с», so the strictest fast in the
 * vocabulary matched nothing at all and the day showed no grade. Notes are now
 * tested as printed *and* with confusable Latin letters folded to their
 * Cyrillic twins — the quotation itself is never altered, and a Romanian note,
 * which is Latin script and means it, is matched on its own terms first.
 */

/**
 * The Latin letters that have a Cyrillic twin no reader can tell apart. Only
 * these: a letter that merely resembles another is not on the list, because
 * folding it would invent a match rather than repair one.
 */
const CONFUSABLE = {
  a: 'а', c: 'с', e: 'е', o: 'о', p: 'р', x: 'х', y: 'у', j: 'ј',
};

const cyrillicFold = (text) =>
  text.replace(/[aceopxyj]/g, (ch) => CONFUSABLE[ch] ?? ch);

/** Order matters: a note states one allowance, and the first match wins. */
const PATTERNS = [
  // fish — the loosest, and the one a note names last when it names several
  ['fish', [
    'разрешается рыба',        // seen: «на трапезе разрешается рыба» (ru)
    'разрешается пища с рыбой',
    'κατάλυση ιχθύος',
    'επιτρέπεται το ψάρι',
    'dezlegare la pește',
    'dezlegare la peşte',
    'риба је дозвољена',
    'дозвољена риба',
  ]],
  // oil (and, where the calendar says so, wine)
  ['oil', [
    'пища с растительным маслом', // seen: ru, both with and without «разрешается»
    'разрешается растительное масло',
    'επιτρέπεται το λάδι',        // seen: «Νηστεία — επιτρέπεται το λάδι και ο οίνος»
    'κατάλυση ελαίου',
    'dezlegare la ulei',
    'на уљу',
    'дозвољено уље',
  ]],
  // cooked, but without oil
  ['no-oil', [
    'горячая пища без масла',   // seen (ru)
    'варение без елея',
    'χωρίς λάδι',
    'ανέλαιη',
    'fără ulei',
    'без уља',
  ]],
  // xerophagy
  ['xerophagy', [
    'сухоядение',               // seen (ru)
    'ξηροφαγία',
    'uscată',
    'сухојед',
  ]],
  // cheesefare, where a calendar spells the week's own allowance out
  ['dairy', [
    'молочное и яйца',
    'дозвољени млечни производи',
  ]],
  // and a calendar that says outright there is no fast
  ['none', [
    'поста нет',                // seen (ru)
    'δεν υπάρχει νηστεία',
    'нема поста',
    'fără post',
    // seen (ro, Amendment 44): doxologia prints «(Harți)» beside the date for
    // a day the fast is lifted on — 25 December among them. It names the day,
    // and naming it is naming the allowance.
    'harți',
    'harti',
  ]],
];

/**
 * The grade a printed note names, or null if it names none. Matching is
 * accent-blind only in case: these are quotations and their diacritics carry
 * meaning, so nothing is stripped.
 */
export function gradeFromNote(note) {
  if (!note) return null;
  const text = String(note).toLocaleLowerCase();
  // as printed first, then with the Cyrillic twins folded in — see the trap
  // described at the head of this file
  const forms = [text, cyrillicFold(text)];
  for (const [grade, phrases] of PATTERNS) {
    if (phrases.some((p) => forms.some((f) => f.includes(p)))) return grade;
  }
  return null;
}

/**
 * The day's grade: what its own calendar printed, or — where it printed
 * nothing — what the day is by default.
 *
 * **The default is new on 2026-08-26 and it is a reversal**, made at the
 * author's instruction and recorded in DESIGN.md §5b in place: *'"Fast -
 * Friday" becomes "Strict Fasting", and tool tip shows "Vegan; set aside
 * meat, animal products, cooking oils and alcohol."'* Until then a fast whose
 * calendar named no allowance said only which fast it was, on the ground that
 * the allowance is the typikon's and jurisdictions differ — and the cost of
 * that rule was that three of the four calendars never named a type at all,
 * because only days.pravoslavie.ru prints one. 67 Romanian, 59 Greek and 62
 * Serbian fast days of the 144 recorded carry no note whatsoever.
 *
 * So the silence is filled, and the direction it is filled in is the one that
 * cannot mislead a reader into eating something their church set aside:
 * **strict**. On an ordinary Wednesday or Friday — the author's own example —
 * that is the plain typikon rule in all four churches. Inside a fast season
 * where the calendar published nothing it is the strictest reading of that
 * season, which errs toward asking more rather than permitting more.
 *
 * Where it errs it errs *knowably*, and one case is worth naming because it
 * is the most likely to be wrong: a Saturday or Sunday inside the Nativity
 * Fast, where the Romanian calendar does print «dezlegare la pește» on its
 * own site and this corpus never captured the note. Such a day now reads
 * Strict Fasting. Capturing those notes is the fix; the default is not.
 *
 * The one exception is a day this build already *knows* the allowance for
 * without reading it: `fasting.allows`, which today is Cheesefare Week alone
 * — see lib/liturgy.js, where the reason itself says dairy and eggs are
 * permitted and a strict default would contradict the words beside it.
 */
export function gradeForDay(fasting, note) {
  const printed = gradeFromNote(note);
  if (printed) return printed;
  if (fasting?.kind === 'fish') return 'fish';
  if (fasting?.kind !== 'fast') return null;
  if (fasting.allows) return fasting.allows;
  return 'strict';
}
