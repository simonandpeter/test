/**
 * Two-way theme: light or dark, and the system is read rather than offered
 * (author, 2026-08-22, DESIGN.md §3 — it was three-way with a System option
 * until then).
 *
 * A reader who has never pressed the toggle follows their system preference,
 * live, including a change of it later; the first press fixes a choice, which
 * is kept from then on whatever the system does. `settings.theme` is therefore
 * 'light', 'dark', or null for "never pressed" — and a stored 'system' from
 * the three-way days reads as null.
 *
 * The first paint is handled by the inline script in index.html, which reads
 * the same key and sets .dark before any CSS applies — this module never runs
 * early enough for that and must not try. What it owns is everything after:
 * the toggle, the system-preference listener, and the 300 ms fade that runs
 * only around a deliberate change.
 */

import { readSettings, writeSetting } from './settings.js';
import { STRINGS, fill } from '../ui/strings.js';

const media = window.matchMedia('(prefers-color-scheme: dark)');

/** The reader's choice, or null if they have never made one. */
const storedChoice = () => {
  const theme = readSettings().theme;
  return theme === 'light' || theme === 'dark' ? theme : null;
};

const effective = (choice) => choice ?? (media.matches ? 'dark' : 'light');

/* The icon shows what a press does, not what is on: a moon in the light, a
   sun in the dark. Stroked in currentColor, so neither introduces a colour,
   and the name on the button says the same thing in words. */
const SUN =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
  'stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false">' +
  '<circle cx="12" cy="12" r="4.25"/>' +
  '<path d="M12 2.75v2.5M12 18.75v2.5M2.75 12h2.5M18.75 12h2.5M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M5.4 18.6l1.8-1.8M16.8 7.2l1.8-1.8"/>' +
  '</svg>';
const MOON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
  'stroke-width="1.6" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>' +
  '</svg>';

function apply(theme, { animate = false } = {}) {
  const root = document.documentElement;
  if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-anim');
    setTimeout(() => root.classList.remove('theme-anim'), 350);
  }
  root.classList.toggle('dark', theme === 'dark');
}

export function initTheme(toggleButton) {
  let choice = storedChoice();

  const label = () => {
    const now = effective(choice);
    const next = now === 'dark' ? 'light' : 'dark';
    toggleButton.innerHTML = now === 'dark' ? SUN : MOON;
    toggleButton.dataset.theme = now;
    toggleButton.setAttribute('aria-label', fill(STRINGS.theme.switchTo, { next: STRINGS.theme[next] }));
  };

  // Untouched, the site follows the system — which is the only time the
  // system's own change is listened to.
  media.addEventListener('change', () => {
    if (choice) return;
    apply(effective(null), { animate: true });
    label();
  });

  toggleButton.addEventListener('click', () => {
    choice = effective(choice) === 'dark' ? 'light' : 'dark';
    writeSetting('theme', choice);
    apply(choice, { animate: true });
    label();
  });

  apply(effective(choice));
  label();
}
