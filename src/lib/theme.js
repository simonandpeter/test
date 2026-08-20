/**
 * Three-way theme: light / dark / system, defaulting to system (DESIGN.md §3).
 *
 * The first paint is handled by the inline script in index.html, which reads
 * the same localStorage key and sets .dark before any CSS applies — this
 * module never runs early enough for that and must not try. What it owns is
 * everything after: the toggle, the system-preference listener, and the
 * 300 ms fade that runs only around a deliberate change.
 */

import { readSettings, writeSetting } from './settings.js';
import { STRINGS, fill } from '../ui/strings.js';

const ORDER = ['system', 'light', 'dark'];
const media = window.matchMedia('(prefers-color-scheme: dark)');

const wantsDark = (theme) => theme === 'dark' || (theme === 'system' && media.matches);

function apply(theme, { animate = false } = {}) {
  const root = document.documentElement;
  if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-anim');
    setTimeout(() => root.classList.remove('theme-anim'), 350);
  }
  root.classList.toggle('dark', wantsDark(theme));
}

export function initTheme(toggleButton) {
  let theme = readSettings().theme;

  media.addEventListener('change', () => {
    if (theme === 'system') apply(theme, { animate: true });
  });

  const label = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    toggleButton.textContent = `${STRINGS.theme.label}: ${STRINGS.theme[theme]}`;
    toggleButton.setAttribute(
      'aria-label',
      fill(STRINGS.theme.switchTo, { current: STRINGS.theme[theme], next: STRINGS.theme[next] }),
    );
  };

  toggleButton.addEventListener('click', () => {
    theme = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    writeSetting('theme', theme);
    apply(theme, { animate: true });
    label();
  });

  apply(theme);
  label();
}
