/**
 * The language control (author, 2026-08-24, Amendment 36): a globe mark and
 * the current language's code — "EN" — standing between the calendar control
 * and the theme toggle, opening the five languages in a panel under the
 * header, the same disclosure the calendar control taught the header. Every
 * choice writes through lib/i18n.js, which announces it; main.js re-renders
 * the open view.
 *
 * Each language is offered in its own tongue — «Русский», not "Russian" —
 * because the reader who needs the control is precisely the one who may not
 * read the language the site is currently in.
 */

import { LANGUAGES, chooseLanguage, currentLanguage, LANGUAGES_BY_ID } from '../lib/i18n.js';
import { STRINGS, fill } from './strings.js';
import { flyInto } from './fly.js';

/* The same drawing family as the calendar mark: stroked, currentColor, named
   by the button's label rather than by being understood. */
const ICON_GLOBE = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
  stroke-width="1.7" aria-hidden="true" focusable="false">
  <circle cx="12" cy="12" r="9.25"/>
  <ellipse cx="12" cy="12" rx="4.1" ry="9.25"/>
  <path d="M3.3 9h17.4M3.3 15h17.4"/>
</svg>`;

/** The question and the five, the same inside wherever it stands — the
 *  header's panel, and (since 2026-08-25 evening) the calendar's first-visit
 *  gate, where it stands beside the calendar question. */
export function renderLanguageChooser(current = currentLanguage()) {
  return (
    `<h2 class="ask-heading">${STRINGS.language.heading}</h2>` +
    `<div class="ask-choices" role="group" aria-label="${STRINGS.language.groupLabel}">${renderChoices(current)}</div>`
  );
}

function renderChoices(current) {
  return LANGUAGES.map(
    (l) =>
      `<button type="button" class="church-choice" data-language="${l.id}" lang="${l.tag}"
        aria-pressed="${String(l.id === current)}">` +
      `<span class="choice-name">${l.name}</span>` +
      `<span class="choice-calendar utility">${l.code}</span>` +
      `</button>`,
  ).join('');
}

/** Mirrors mountChurchControl; returns nothing to unmount because the header
 *  outlives every view. */
export function mountLanguageControl(button, panel) {
  let open = false;

  const paintButton = () => {
    const L = STRINGS.language;
    const lang = LANGUAGES_BY_ID[currentLanguage()];
    button.innerHTML = ICON_GLOBE + `<span class="church-open-name">${lang.code}</span>`;
    button.setAttribute('aria-label', fill(L.showingLabel, { name: lang.name }));
  };
  // The same flight home the calendar control makes, for the same reason.
  const close = () => {
    open = false;
    button.setAttribute('aria-expanded', 'false');
    const inner = panel.querySelector('.church-panel-inner');
    flyInto(inner, button, () => {
      panel.hidden = true;
      panel.innerHTML = '';
    });
    button.focus();
  };
  const openPanel = () => {
    open = true;
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    panel.innerHTML = `<div class="church-panel-inner">${renderLanguageChooser()}</div>`;
    (panel.querySelector('[data-language][aria-pressed="true"]') ?? panel.querySelector('[data-language]'))?.focus();
  };

  panel.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-language]');
    if (!choice || !panel.contains(choice)) return;
    chooseLanguage(choice.dataset.language);
    paintButton();
    close();
  });

  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => (open ? close() : openPanel()));
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) close();
  });

  paintButton();
  return paintButton;
}
