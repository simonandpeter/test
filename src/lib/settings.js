/**
 * Settings live in localStorage — and only settings (brief §11). They are the
 * one piece of state that must be readable synchronously before first paint
 * (the theme), which IndexedDB cannot do. Saved saints, reading positions and
 * history belong to the IndexedDB store built in Session 4a, not here.
 */

const KEY = 'gos-settings';

const DEFAULTS = {
  // 'light' | 'dark' once the reader has pressed the toggle; null until then,
  // which means "follow the system" (author, 2026-08-22 — it was three-way
  // with a 'system' value until then, and a stored 'system' reads as null).
  theme: null,
  // Which church the reader keeps (author, 2026-08-22): a church id from the
  // registry — russian, romanian or greek — or null until the reader has been
  // asked, which is a different state from having answered (lib/church.js).
  // `traditions` and `calendar` stood here for the cross-church build and went
  // with it; values left in a reader's storage from then are simply ignored.
  church: null,
  /*
   * The site's language (author, 2026-08-24): one of lib/i18n.js's five ids,
   * or null until the reader has been asked. Null *reads* as English —
   * i18n.js falls back to it and always did — so nothing about a first paint
   * changes; what the null buys is the difference between "English because
   * the reader chose it" and "English because nobody has said".
   *
   * It said 'en' outright until 2026-08-25 evening, on the reasoning that
   * English is an answer and not a question. The author reversed that: "same
   * as the message to choose which church, open the language options as well
   * for first time visitors to know they can change language" — the question
   * is not which language the site should be in, it is whether the reader
   * knows the site has five.
   */
  language: null,
  /*
   * Which coachmarks this browser has already been shown, by control id
   * (2026-08-27). It is a *seen* list and not an *answered* one, and that is
   * the whole point of it: the two marks were gated on `hasChosen()` and
   * `hasChosenLanguage()`, so a reader content with the guessed calendar and
   * with English never answered either question and was shown both marks on
   * every load, for ever. A coachmark that returns is not a coachmark.
   */
  coachSeen: [],
  defaultLocationKind: 'death',
  riverSeed: null,
  // 'cards' — image above the name, box from the manifest's aspect ratio.
  // 'rows'  — name and dates first, a square thumbnail at the trailing edge.
  //
  // **null until the reader chooses**, since 2026-08-27, and that is the whole
  // point of it being null rather than 'cards': the author asked for cards on a
  // desktop and rows on a phone, and a stored value cannot say "whichever suits
  // the screen". A default here would have answered the question before
  // `defaultLayout()` in views/index/controls.js ever got to ask it — which is
  // exactly what happened the first time this was written, silently, because
  // 'cards' is a perfectly valid layout and nothing looked wrong.
  indexLayout: null,
  // Detailed (author, 2026-08-22): the matrix for the badge and a line of the
  // life on every card. Off until asked for, and remembered once it is.
  indexDetailed: false,
};

export function readSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    // Private mode or corrupted storage — defaults, harmlessly.
    return { ...DEFAULTS };
  }
}

export function writeSetting(key, value) {
  const next = { ...readSettings(), [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the setting still applies for this page's lifetime
    // because callers use the returned object, it just won't persist.
  }
  return next;
}
