/**
 * The church chooser (author, 2026-08-22): the registry's churches as one-shot
 * choices, each with the calendar it keeps under its name, because choosing
 * the church is choosing the calendar. One component, three hosts — the
 * calendar's first-visit question, where a press is the answer; the header's
 * panel, where a press changes the church the whole site reads; and the
 * calendar's "change calendar" panel under the strip. Every press writes
 * through lib/church.js, which announces it, and the views that read the
 * church subscribe there.
 *
 * Drawn in ink and rule, never gold or red: a control is not a finding and not
 * liturgical time (DESIGN.md §2). The pressed state is carried by
 * aria-pressed, never by colour alone.
 *
 * It replaces ui/traditions.js and ui/plate.js — four communion switches, the
 * rite × communion lattice under (advanced), a Done — which went with the
 * traditions (DESIGN.md §5b, superseded 2026-08-22).
 */

import { enabledChurches } from '../data/churches.js';
import { chooseChurch, churchName, currentChurch, subscribeChurch } from '../lib/church.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { STRINGS, fill } from './strings.js';

const C = STRINGS.church;

/** The three as buttons, the current one pressed. */
export function renderChoices(current = currentChurch()) {
  return enabledChurches()
    .map(
      (c) =>
        `<button type="button" class="church-choice" data-church="${c.id}" aria-pressed="${String(c.id === current)}">` +
        `<span class="choice-name">${esc(c.display_name)}</span>` +
        `<span class="choice-calendar utility">${esc(C.calendarOf[c.default_calendar] ?? c.default_calendar)}</span>` +
        `</button>`,
    )
    .join('');
}

/** The question and its choices — the same inside wherever it stands. */
export function renderChooser({ current = currentChurch(), heading = C.heading, lede = C.lede } = {}) {
  return (
    `<h2 class="ask-heading">${heading}</h2>` +
    `<p>${lede}</p>` +
    `<div class="ask-choices" role="group" aria-label="${esc(C.groupLabel)}">${renderChoices(current)}</div>`
  );
}

/**
 * Delegated: any `[data-church]` button under `root` chooses, repaints the
 * pressed state in place, and calls `onChange(id)`. Returns a teardown.
 */
export function wireChooser(root, { onChange = () => {} } = {}) {
  const onClick = (e) => {
    const button = e.target.closest('[data-church]');
    if (!button || !root.contains(button)) return;
    const id = button.dataset.church;
    chooseChurch(id);
    for (const b of root.querySelectorAll('[data-church]')) b.setAttribute('aria-pressed', String(b === button));
    onChange(id);
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}

/**
 * The header's control: a button that names the chosen calendar — or asks
 * for one — and opens the chooser in a panel beneath the header, in the
 * page's flow, a disclosure rather than a dialogue, so whatever page is open
 * stays visible and the reader can watch it change. A press closes it and
 * hands the focus back. Returns the unsubscribe.
 */
export function mountChurchControl(button, panel) {
  let open = false;
  let unwire = null;

  const paintButton = () => {
    const id = currentChurch();
    button.textContent = id ? fill(C.showing, { church: churchName(id) }) : C.open;
    button.setAttribute('aria-label', C.openLabel);
  };
  const close = () => {
    open = false;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    unwire?.();
    unwire = null;
    button.focus();
  };
  const openPanel = () => {
    open = true;
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    panel.innerHTML = `<div class="church-panel-inner">${renderChooser()}</div>`;
    unwire = wireChooser(panel, { onChange: close });
    (panel.querySelector('[data-church][aria-pressed="true"]') ?? panel.querySelector('[data-church]'))?.focus();
  };

  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => (open ? close() : openPanel()));
  // Escape closes it from anywhere inside, the way a disclosure should.
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) close();
  });
  paintButton();
  return subscribeChurch(paintButton);
}
