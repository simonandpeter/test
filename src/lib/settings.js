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
  // Which traditions the reader keeps — site-wide since 2026-08-22. `null`
  // means the reader has not been asked yet, which is a different state from
  // having answered — see lib/tradition.js. `calendarPreference` stood here
  // until 2026-08-21 and went with the reckoning toggle; a value left in a
  // reader's storage from before then is simply ignored.
  traditions: null,
  // Which one church's calendar the calendar page shows (author, 2026-08-22,
  // Addendum H8): a church id, or null until the reader has been asked. Kept
  // even while the selection does not allow it, so widening the selection
  // again finds it still chosen.
  calendar: null,
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
