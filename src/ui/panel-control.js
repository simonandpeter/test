/**
 * A header control that opens a panel beneath the bar (2026-09-05).
 *
 * The calendar control and the language control were one piece of machinery
 * written twice — `docs/CLEANUP-PLAN.md` item 4 diffed them line by line: the
 * open/close state, the flight bookkeeping, the outside press, the Escape, the
 * `aria-expanded` handling and the guarded hide-and-empty were the same code,
 * and the language chooser's own comments said so ("the same flight home the
 * calendar control makes, for the same reason"). One of them carried a bug
 * report that applied to both and was fixed in one. What genuinely differs is
 * three things, and those are the three arguments: what the panel is filled
 * with (`render`), what is wired inside it once it is painted (`wire`, which
 * returns its own teardown), and which button the focus lands on (any pressed
 * choice, else the first). Painting the button itself stays with each control
 * — it is their own words and their own mark.
 *
 * A disclosure rather than a dialogue: the panel opens in the page's flow
 * directly under the header, so whatever page is open stays visible and the
 * reader can watch it change. A press closes it and hands the focus back.
 */

import { flyInto, flyOutOf } from './fly.js';

/**
 * Wires `button` to open `panel`. Returns `{ close, isOpen, refresh }`:
 * `refresh` repaints the panel's inside while it stands open, for the
 * calendar control whose heading and choices are all translated.
 */
export function mountPanelControl(button, panel, { render, wire = () => {} }) {
  let open = false;
  let flight = 0;
  let unwire = null;

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
  const teardown = () => {
    unwire?.();
    unwire = null;
  };
  const close = () => {
    open = false;
    landFlight();
    const mine = (flight += 1);
    button.setAttribute('aria-expanded', 'false');
    teardown();
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
    panel.innerHTML = `<div class="church-panel-inner">${render()}</div>`;
    unwire = wire(panel) ?? null;
    // The flight home, run backwards (author, 2026-08-26 evening). Same two
    // numbers, same 160 ms: the panel grows out of the control it belongs to
    // and the band opens under it, so what is below the header comes down
    // with the panel instead of being displaced ahead of it in one frame.
    land = flyOutOf(panel.querySelector('.church-panel-inner'), button, () => {}, { expand: panel });
    focusChoice();
  };
  // The pressed choice, else the first: the reader's own answer is where the
  // keyboard should land, and a first visit has none yet.
  const focusChoice = () =>
    (panel.querySelector('.church-panel-inner [aria-pressed="true"]') ?? panel.querySelector('.church-panel-inner button'))?.focus({
      preventScroll: true,
    });
  /*
   * The *children* of `.church-panel-inner` are replaced rather than the box
   * itself: the box carries the inline transform and opacity of whatever
   * flight is in the air, and swapping it would strand them.
   */
  const refresh = () => {
    if (!open) return;
    const inner = panel.querySelector('.church-panel-inner');
    if (!inner) return;
    teardown();
    inner.innerHTML = render();
    unwire = wire(panel) ?? null;
  };

  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => (open ? close() : openPanel()));
  // Escape closes it from anywhere inside, the way a disclosure should.
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) close();
  });
  /*
   * **And a press anywhere else closes it** (author, 2026-09-02: "when you
   * click off the pop-ups for language or calendar that they close. E.g. if
   * they are open and I click outside their bubble they should close").
   *
   * It never did: the panel opened in the page's own flow, where a disclosure
   * that stays until it is answered or dismissed is ordinary, and the button
   * was the only way to shut it. Since 2026-09-02 it floats over the page on a
   * desktop, and a floating panel that ignores the page underneath is a
   * panel a reader has to go back and find the switch for.
   *
   * `pointerdown` rather than `click`, so it closes on the press rather than
   * on the release — a reader who presses on the page and drags has already
   * said they are done with the panel. The button is excluded because its own
   * handler toggles: closing here first would make the press reopen it.
   */
  const onAway = (e) => {
    if (!open) return;
    if (panel.contains(e.target) || button.contains(e.target)) return;
    /*
     * **The other chooser is not "outside"** (2026-09-02, keeping the
     * instruction of 2026-08-27 intact). The two panels are independent
     * disclosures and both may stand open at once — that is what makes "the
     * calendar panel follows a language change while it is open" a case at
     * all, and it is the author's own: changing language with the calendar
     * chooser still showing, and seeing it repaint without being closed and
     * reopened. A press on the other control is the reader reaching for the
     * second panel, not dismissing the first.
     */
    if (e.target.closest?.('.church-panel, #church-open, #lang-open')) return;
    close();
  };
  document.addEventListener('pointerdown', onAway);

  return { close, isOpen: () => open, refresh };
}
