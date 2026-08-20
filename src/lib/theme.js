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

  /**
   * All three labels are rendered, stacked in one grid cell, with only the
   * current one visible. The button is therefore always as wide as its widest
   * label — "Theme: System" — whatever face the reader's system supplies, so
   * cycling the theme cannot change the width of anything, wrap the header
   * onto a second line, or change its height. A reserved width in `ch` would
   * be a guess about a font we do not choose.
   *
   * The hidden labels are `visibility: hidden`, so they are out of the
   * accessibility tree as well as invisible; the button's name comes from
   * aria-label regardless.
   */
  toggleButton.innerHTML = ORDER.map(
    (mode) => `<span class="theme-option" data-mode="${mode}">${STRINGS.theme.label}: ${STRINGS.theme[mode]}</span>`,
  ).join('');

  const label = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    for (const option of toggleButton.querySelectorAll('.theme-option')) {
      option.toggleAttribute('data-current', option.dataset.mode === theme);
    }
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
