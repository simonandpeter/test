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
  defaultLocationKind: 'death',
  riverSeed: null,
  // 'cards' — image above the name, box from the manifest's aspect ratio.
  // 'rows'  — thumbnail left, name and glyph right, packed tight.
  indexLayout: 'cards',
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
