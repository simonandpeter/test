/**
 * What a screenshot tool puts in `localStorage` before the site boots, in one
 * place, because getting it wrong is silent.
 *
 * The site reads its two settings — theme and language — once, on boot, and a
 * page already painted does not repaint for either. So a tool that wants a
 * particular theme or pack has to seed storage before the first byte of the
 * app runs, and a value the app does not recognise is not an error: it is the
 * *other* theme, or English, drawn under a label that says otherwise.
 *
 * That is not hypothetical. `contact-sheet.mjs` seeded `theme: 'vigil'` — the
 * design's word for the dark theme, and not one storage may hold — from the
 * day it was written until 2026-09-10, so every vigil row of every contact
 * sheet was the day theme. Half of the desktop rebuild's design is dark and
 * the instrument built to review it could not see it.
 *
 * `lib/settings.js` owns the translation (`THEMES`); this file owns the
 * seeding, and both of the tools that seed read it rather than retyping it.
 */
import { THEMES } from '../src/lib/settings.js';

/** The names a tool's own `--themes=` flag takes: the design's, not storage's. */
export const THEME_NAMES = Object.keys(THEMES);

/**
 * The settings object to write under `gos-settings`.
 *
 * `theme` is written out even for the light one rather than left `null`. Null
 * means "this reader has never pressed the toggle", which is a real state and
 * the right default for a reader — but for a screenshot it hands the decision
 * to whatever `prefers-color-scheme` the machine running the tool reports, and
 * a picture that depends on the desk it was taken at is not evidence.
 *
 * The coachmarks are marked seen, or every first tile is two tooltips.
 */
export function seed(theme, language = 'en') {
  if (!THEME_NAMES.includes(theme)) {
    throw new Error(`unknown theme ${JSON.stringify(theme)}; this tool shoots ${THEME_NAMES.join(' or ')}`);
  }
  return {
    theme: THEMES[theme],
    language: language === 'en' ? null : language,
    church: 'russian',
    coachSeen: ['church-open', 'lang-open'],
  };
}

/**
 * And what the *browser* should be told, so the document's own
 * `prefers-color-scheme` agrees with the storage the tool wrote. Nothing in
 * the app's layout reads it — the class on `<html>` is what the stylesheets
 * follow — but the favicon and the two `theme-color` meta tags do, and a tool
 * whose two halves disagree about which theme it is shooting is the shape of
 * bug this file exists for.
 */
export const colorScheme = (theme) => (THEMES[theme] === 'dark' ? 'dark' : 'light');
