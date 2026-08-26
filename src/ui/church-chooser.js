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
import { subscribeLanguage } from '../lib/i18n.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { flyInto, flyOutOf } from './fly.js';
import { STRINGS, fill } from './strings.js';

const C = STRINGS.church;

/**
 * The calendar mark the header's control wears (author, 2026-08-24), so the
 * button can drop the word "calendar" and carry the church's name alone. Same
 * drawing and same stroke as the month toggle on the calendar page, one size
 * down: the two mean the same thing and a reader should not have to learn
 * two marks for it.
 */
const ICON_CALENDAR = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
  stroke-width="1.7" aria-hidden="true" focusable="false">
  <rect x="3.25" y="5" width="17.5" height="15.75" rx="2.5"/>
  <path d="M3.25 9.75h17.5"/>
  <path d="M8 2.75v4M16 2.75v4" stroke-linecap="round"/>
</svg>`;

/** The three as buttons, the current one pressed. */
export function renderChoices(current = currentChurch()) {
  return enabledChurches()
    .map(
      (c) =>
        `<button type="button" class="church-choice" data-church="${c.id}" aria-pressed="${String(c.id === current)}">` +
        `<span class="choice-name">${esc(churchName(c.id))}</span>` +
        `<span class="choice-calendar utility">${esc(C.calendarOf[c.default_calendar] ?? c.default_calendar)}</span>` +
        `</button>`,
    )
    .join('');
}

/**
 * The question and its choices — the same inside wherever it stands.
 *
 * The explanatory paragraph under the heading was removed by the author
 * (2026-08-24): it named the four churches and their two calendars in prose
 * directly above four buttons that each print exactly that, so it said the
 * choices twice and delayed them by four lines. `STRINGS.church.lede` is
 * deleted rather than left dark.
 */
export function renderChooser({ current = currentChurch(), heading = C.heading } = {}) {
  return (
    `<h2 class="ask-heading">${heading}</h2>` +
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
  let flight = 0;
  let unwire = null;

  const paintButton = () => {
    const id = currentChurch();
    const name = id ? churchName(id) : null;
    // The mark carries "calendar" so the words do not have to; the accessible
    // name still says the whole sentence, and now says which church, which
    // the aria-label swallowed while the visible text was carrying it.
    button.innerHTML =
      ICON_CALENDAR +
      `<span class="church-open-name">${esc(name ? fill(C.showing, { church: name }) : C.open)}</span>`;
    button.setAttribute('aria-label', name ? fill(C.showingLabel, { church: name }) : C.openLabel);
  };
  /*
   * Closing, the panel shrinks and fades into the control that opened it
   * (author, 2026-08-25 evening), so a reader who answers learns where the
   * answer lives. The inner box flies, not the panel: the panel is the
   * full-width band with the rule under it, and a band scaling towards a
   * corner would take its own border with it.
   */
  /*
   * Whichever flight is in the air, so the other direction can land it
   * before it sets off. `flyInto` decides where to fly *from* by reading
   * the box's rect, and a panel halfway through arriving is at neither
   * end of its journey — so an open still climbing when the reader
   * presses again sent the close off in the wrong direction and by the
   * wrong distance. Caught by the suite's own direction assertion.
   */
  let land = null;
  const landFlight = () => {
    const f = land;
    land = null;
    f?.();
  };
  const close = () => {
    open = false;
    landFlight();
    const mine = (flight += 1);
    button.setAttribute('aria-expanded', 'false');
    unwire?.();
    unwire = null;
    const inner = panel.querySelector('.church-panel-inner');
    land = flyInto(
      inner,
      button,
      () => {
        if (mine !== flight) return;
        panel.hidden = true;
        panel.innerHTML = '';
      },
      // The band closes over the same 160 ms, so the page below rises with
      // the panel instead of snapping up when it goes (author, 2026-08-26).
      { collapse: panel },
    );
    button.focus();
  };
  /*
   * A close that is still in the air when the panel is opened again must not
   * land on the new one. `flight` is the token: the closing callback checks
   * that it is still the current flight before hiding and emptying, and the
   * panel's own collapse styles are cleared here, because until the old
   * flight finishes it is still holding `height: 0`.
   *
   * Found by the suite — a test that changed calendar twice inside 160 ms hit
   * a panel that was open, empty and nought pixels tall, and timed out trying
   * to press a button inside it.
   */
  const openPanel = () => {
    open = true;
    landFlight();
    flight += 1;
    panel.hidden = false;
    panel.style.height = '';
    panel.style.overflow = '';
    panel.style.transition = '';
    button.setAttribute('aria-expanded', 'true');
    panel.innerHTML = `<div class="church-panel-inner">${renderChooser()}</div>`;
    unwire = wireChooser(panel, { onChange: close });
    // The flight home, run backwards (author, 2026-08-26 evening). Same two
    // numbers, same 160 ms: the panel grows out of the control it belongs to
    // and the band opens under it, so what is below the header comes down
    // with the panel instead of being displaced ahead of it in one frame.
    land = flyOutOf(panel.querySelector('.church-panel-inner'), button, () => {}, { expand: panel });
    (panel.querySelector('[data-church][aria-pressed="true"]') ?? panel.querySelector('[data-church]'))?.focus({ preventScroll: true });
  };

  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => (open ? close() : openPanel()));
  // Escape closes it from anywhere inside, the way a disclosure should.
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) close();
  });
  paintButton();
  // The button carries words in two registers — the church's name and the
  // accessible sentence — so it repaints on either kind of change.
  subscribeLanguage(() => {
    paintButton();
    /*
     * And the panel too, if it is open (author, 2026-08-27: "make sure the
     * choose church calendar pop-up, which may still be open when changing
     * languages, also shows the updated language without having to close it
     * first to see it update"). Its heading and its four church names are all
     * translated, and a panel is a disclosure in the page's flow rather than a
     * dialogue — it is normal for it to be open while something else changes.
     *
     * The *children* of `.church-panel-inner` are replaced rather than the box
     * itself: the box carries the inline transform and opacity of whatever
     * flight is in the air, and swapping it would strand them.
     */
    if (!open) return;
    const inner = panel.querySelector('.church-panel-inner');
    if (!inner) return;
    unwire?.();
    inner.innerHTML = renderChooser();
    unwire = wireChooser(panel, { onChange: close });
  });
  return subscribeChurch(paintButton);
}
