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
  /*
   * How *Also commemorated* is laid out on the Daily page (author, 2026-09-01:
   * "Cards by default, site remembers what you left it as").
   *
   * 'cards' rather than null, and the difference from `indexLayout` above is
   * worth stating because they look like the same decision. The Index needed
   * null because its answer depends on the screen — cards at a desk, rows on a
   * phone — and a stored default would have answered before the screen was
   * consulted. This one does not: the list is a list on a phone whatever is
   * stored here, because the toggle is a desktop control, so the stored value
   * only ever speaks about the surface it was set on.
   */
  registerLayout: 'cards',
};

/**
 * The two faces that list can wear (docs/daily-desktop-visuals.md §10.4).
 *
 * **Two, and `list` is gone** (author, 2026-09-10). §10.4 had ruled the
 * opposite — that `expanded` arrived as a third face beside `cards` and
 * `list`, because the reference's two marks were read as two frames of one
 * control rather than as the whole of it. The author has since said the two
 * marks are the control.
 *
 * **The value went from this list and not only from the desktop control**,
 * because the phone never had a list face to lose. Below 1024 px the register
 * is the base `.register-cards` column of rows whatever this setting says —
 * `is-cards`, `is-expanded` and the late `is-list` all styled nothing there
 * (calendar.css) and the control itself is `display: none` — so removing the
 * value changes what a phone draws in no way at all. Scoping the list of legal
 * values to a breakpoint would have been a fiction about a face that never
 * existed at the other one.
 *
 * A reader who stored `list` before today lands on `cards`: every reader of
 * this constant filters through it (`views/calendar.js`, `views/daily/panel.js`)
 * rather than trusting the stored string, which is the whole reason the list
 * lives in this file. A stored value is whatever a previous version of the
 * site, or a reader with the console open, left there.
 */
export const REGISTER_LAYOUTS = ['cards', 'expanded'];

/**
 * The two themes, under both of the names this project gives them.
 *
 * **The keys are the design's names and the values are the storage's**, and
 * the gap between the two is not cosmetic — it shipped a bug. `tokens.css`
 * calls the themes *day* and *vigil*, PLAN and this rebuild's document use
 * those words throughout, and `scripts/contact-sheet.mjs` labels its rows with
 * them. But a stored theme may only ever say `'light'` or `'dark'` (and
 * `null`, for a reader who has never pressed the toggle), because that is what
 * `lib/theme.js` and index.html's first-paint script read. The sheet wrote
 * `'vigil'` into storage, which is neither, so the first-paint script fell
 * through to the system preference — light, in a headless browser — and every
 * "vigil" tile the tool ever drew was the day theme with a dark label under
 * it. Nobody could review dark mode through the instrument built to review it.
 *
 * So the translation lives here, once, beside the values it translates into,
 * rather than being retyped by each tool that shoots the site.
 */
export const THEMES = { day: 'light', vigil: 'dark' };

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
