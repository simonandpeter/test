/**
 * The tradition chooser (author, 2026-08-22, Addendum H7): four communion
 * switches, and under *(advanced)* the plate for a church-by-church answer.
 * One component, two hosts — the header's *Select Tradition* panel, where the
 * four are switches a reader flips, and the calendar's first-visit question,
 * where the four are one-shot choices because a question is answered once.
 * Both write the same selection through lib/tradition.js, and every view that
 * respects it subscribes there.
 *
 * The communion switches are drawn like the plate's row heads — ink for on,
 * soft for off, a dotted underline for a row that is half on — and carry
 * `aria-pressed`, including "mixed", so the state never rests on the value.
 * Nothing here is gold or red: a control is not a finding (DESIGN.md §2).
 */

import { enabledCommunions } from '../data/churches.js';
import {
  communionState,
  currentSelection,
  selectCommunion,
  toggleChurch,
  toggleCommunion,
  toggleRite,
  writeSelection,
} from '../lib/tradition.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { renderFilterPlate } from './plate.js';
import { STRINGS } from './strings.js';

const T = STRINGS.traditions;

/** The four communions as switches — a standing control's grain. */
export function renderSwitches(selection) {
  return enabledCommunions()
    .map((c) => {
      const state = communionState(selection, c.id);
      return (
        `<button type="button" class="communion-switch" data-communion="${c.id}" ` +
        `aria-pressed="${state === 'on' ? 'true' : state === 'mixed' ? 'mixed' : 'false'}" ` +
        `data-state="${state}">${esc(c.display_name)}</button>`
      );
    })
    .join('');
}

/** The four communions as one-shot choices — a question's grain. */
export const renderChoices = () =>
  enabledCommunions()
    .map((c) => `<button type="button" class="ask-choice" data-ask-choice="${c.id}">${esc(c.display_name)}</button>`)
    .join('');

/**
 * The chooser's inside. `mode` is 'control' (switches) or 'question'
 * (choices); both carry the advanced disclosure and the plate behind it, and
 * a Done. In the question the Done only appears once the plate is open —
 * pressing a communion is the answer and needs no second press, but a plate
 * answer is several presses and needs a way to say "that is all".
 */
export function renderChooser({ selection = currentSelection(), mode = 'control' } = {}) {
  const four = mode === 'question' ? renderChoices() : renderSwitches(selection);
  return (
    `<div class="chooser-row" role="group" aria-label="${esc(T.heading)}">` +
    `<div class="chooser-four" data-four>${four}</div>` +
    `<button type="button" class="chooser-advanced" data-advanced aria-expanded="false" ` +
    `aria-label="${esc(T.advancedLabel)}">${esc(T.advanced)}</button>` +
    `</div>` +
    `<div class="chooser-plate" data-plate-box hidden>` +
    `<p class="chooser-lede utility">${T.plateLede}</p>` +
    `<div data-plate></div>` +
    `<p class="chooser-note utility">${T.coarse}</p>` +
    `</div>` +
    `<div class="chooser-actions"${mode === 'question' ? ' hidden' : ''} data-actions>` +
    `<button type="button" data-done>${T.done}</button>` +
    `</div>`
  );
}

/**
 * Wires a chooser. `onChange({ answered })` after every write — `answered` is
 * true for a one-shot choice, which is the question's cue to take itself off
 * the page — and `onDone()` for the Done button. Returns a teardown.
 *
 * The plate is rebuilt on every press, which takes the focus off what was
 * pressed, so it is put back by dataset key; the switches are updated in
 * place and keep theirs. A control a keyboard reader can press only once is
 * not a control (SESSIONS.md Amendment 19).
 */
export function wireChooser(root, { onChange = () => {}, onDone = () => {} } = {}) {
  const four = root.querySelector('[data-four]');
  const isQuestion = !!four.querySelector('[data-ask-choice]');

  const paintPlate = () => {
    const box = root.querySelector('[data-plate]');
    if (box && !root.querySelector('[data-plate-box]').hidden) {
      box.innerHTML = renderFilterPlate(currentSelection());
    }
  };
  const paintSwitches = () => {
    if (isQuestion) return;
    for (const b of four.querySelectorAll('[data-communion]')) {
      const state = communionState(currentSelection(), b.dataset.communion);
      b.setAttribute('aria-pressed', state === 'on' ? 'true' : state === 'mixed' ? 'mixed' : 'false');
      b.dataset.state = state;
    }
  };

  const write = (selection, { answered = false } = {}) => {
    writeSelection(selection);
    const active = document.activeElement;
    const key = active?.dataset?.church
      ? `[data-church="${active.dataset.church}"]`
      : active?.dataset?.rite
        ? `[data-rite="${active.dataset.rite}"]`
        : null;
    paintSwitches();
    paintPlate();
    if (key) root.querySelector(`[data-plate] ${key}`)?.focus();
    onChange({ answered });
  };

  const onClick = (e) => {
    const button = e.target.closest('button');
    if (!button || !root.contains(button)) return;
    const d = button.dataset;
    if (d.askChoice) return write(selectCommunion(d.askChoice), { answered: true });
    if (d.communion && button.classList.contains('communion-switch')) {
      return write(toggleCommunion(currentSelection(), d.communion));
    }
    if (button.hasAttribute('data-advanced')) {
      const box = root.querySelector('[data-plate-box]');
      const open = box.hidden;
      box.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      if (open) {
        paintPlate();
        const actions = root.querySelector('[data-actions]');
        if (actions) actions.hidden = false;
      }
      return;
    }
    if (d.church) return write(toggleChurch(currentSelection(), d.church));
    if (d.communion) return write(toggleCommunion(currentSelection(), d.communion));
    if (d.rite) return write(toggleRite(currentSelection(), d.rite));
    if (button.hasAttribute('data-done')) onDone();
  };

  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}

/**
 * The header's control: a button that opens the chooser in a panel beneath
 * the header, in the page's flow — a disclosure, not a dialogue, so whatever
 * page is open stays visible and usable and the reader can watch it change.
 * Done closes it and hands the focus back.
 */
export function mountTraditionControl(button, panel) {
  let open = false;
  const paintStatus = () => {};

  const close = () => {
    open = false;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  };
  const openPanel = () => {
    open = true;
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    panel.innerHTML =
      `<div class="tradition-panel-inner">` +
      `<h2 class="tradition-heading">${T.heading}</h2>` +
      `<p class="tradition-lede">${T.lede}</p>` +
      `<div data-chooser>${renderChooser({ selection: currentSelection(), mode: 'control' })}</div>` +
      `</div>`;
    unwire?.();
    unwire = wireChooser(panel.querySelector('[data-chooser]'), { onChange: paintStatus, onDone: close });
    panel.querySelector('[data-four] button')?.focus();
  };
  let unwire = null;

  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => (open ? close() : openPanel()));
  // Escape closes it from anywhere inside, the way a disclosure should.
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) close();
  });
}
