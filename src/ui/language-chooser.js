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

import { LANGUAGES, chooseLanguage, currentLanguage, ensureAllPacks, ensurePack, LANGUAGES_BY_ID } from '../lib/i18n.js';
import { STRINGS, fill } from './strings.js';
import { mountPanelControl } from './panel-control.js';

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

/** Mirrors mountChurchControl — the same ui/panel-control.js disclosure with
 *  the five languages inside it; returns nothing to unmount because the
 *  header outlives every view. */
export function mountLanguageControl(button, panel) {
  const paintButton = () => {
    const L = STRINGS.language;
    const lang = LANGUAGES_BY_ID[currentLanguage()];
    button.innerHTML = ICON_GLOBE + `<span class="church-open-name">${lang.code}</span>`;
    button.setAttribute('aria-label', fill(L.showingLabel, { name: lang.name }));
  };

  const control = mountPanelControl(button, panel, {
    render: () => renderLanguageChooser(),
    /* The packs are fetched per language since 2026-08-27, so the four this
       panel offers are started the moment it opens: by the time a reader has
       read five words and pressed one, the chunk is in cache and the change
       is instant. Deliberately not awaited — the panel must not wait on a
       network to appear. */
    wire: () => {
      ensureAllPacks();
    },
  });

  panel.addEventListener('click', async (e) => {
    const choice = e.target.closest('[data-language]');
    if (!choice || !panel.contains(choice)) return;
    /* Awaited, so the page never shows the moment between the choice and the
       pack: `chooseLanguage` is synchronous and merges whatever has landed,
       which would be English if a reader pressed inside the fetch. The prefetch
       on open means this has almost always already resolved. */
    await ensurePack(choice.dataset.language);
    chooseLanguage(choice.dataset.language);
    paintButton();
    control.close();
  });

  paintButton();
  return paintButton;
}
