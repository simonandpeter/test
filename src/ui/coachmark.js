/**
 * A mark under each of the header's two controls on a first visit, saying which
 * one changes the church and which changes the language. They are chrome and
 * not the calendar's, so they are mounted once at boot and stand on whatever
 * page the visit begins on.
 *
 * Four ways out: the ×, a swipe on a touch screen, the second scroll input
 * either way, and opening the control the mark points at — plus Escape, because
 * anything that takes focus and dismisses has to answer it. `a first visit is
 * shown where the two controls are, and the day is not held back` in
 * `e2e/chrome.spec.js` holds that set.
 *
 * The first-visit gate this reversed, the author's instruction behind it, and
 * what bought back the honesty the gate was buying:
 * `docs/SRC-DECISIONS.md § src/ui/coachmark.js`.
 */

import { hasChosen } from '../lib/church.js';
import { hasChosenLanguage } from '../lib/i18n.js';
import { readSettings, writeSetting } from '../lib/settings.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { STRINGS } from './strings.js';
import { reducedMotion } from '../lib/motion.js';

/**
 * How many scroll inputs it survives. Two, at the author's word — the first
 * scroll is a reader looking at the page they arrived on. `a coachmark goes on
 * the second scroll, and not on the first` in `e2e/chrome.spec.js`.
 */
const SCROLLS = 2;
/**
 * What counts as *one* input. A wheel notch or a finger's flick fires scroll
 * events every frame for a few hundred milliseconds, so counting raw events
 * would spend both on one gesture.
 */
const SCROLL_GAP = 400;
/** Far enough to be a scroll rather than a settle, in px. */
const SCROLL_SLOP = 24;
/** Sideways travel that dismisses a mark on a touch screen. */
const SWIPE = 40;

const CLOSE =
  '<svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true" focusable="false">' +
  '<path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>';

/**
 * Which marks this browser has already been shown. **Shown, not answered**, and
 * written when the mark is *mounted* rather than when it is dismissed — `a
 * coachmark is shown once, and a guess is still not an answer` in
 * `e2e/chrome.spec.js`. Why the gate is not `hasChosen()` alone:
 * `docs/SRC-DECISIONS.md § src/ui/coachmark.js`.
 */
const seenMarks = () => {
  const seen = readSettings().coachSeen;
  return Array.isArray(seen) ? seen : [];
};

/**
 * Mounts whichever marks this visit is owed and returns a teardown. Nothing is
 * mounted for a reader who has answered both questions, or for one who has
 * already been shown both marks.
 */
export function mountCoachmarks() {
  const seen = seenMarks();
  const wanted = [];
  if (!hasChosen()) wanted.push(['church-open', STRINGS.coach.church]);
  if (!hasChosenLanguage()) wanted.push(['lang-open', STRINGS.coach.language]);

  const live = [];
  const shown = [];
  for (const [id, text] of wanted) {
    if (seen.includes(id)) continue;
    const target = document.getElementById(id);
    if (target) {
      live.push(build(target, text));
      shown.push(id);
    }
  }
  if (shown.length) writeSetting('coachSeen', [...seen, ...shown]);
  if (!live.length) return () => {};
  // Both at once, because where one goes depends on where the other is.
  layout(live);

  const closeAll = () => {
    for (const mark of live.splice(0)) mark.close();
  };

  /* Positions are document coordinates, so a mark travels with the page. A
     resize moves the header under them — the calendar control changes line at
     560 px — so they are placed again rather than dismissed: a reader turning a
     phone has not answered anything. */
  const onResize = () => layout(live);

  /*
   * **Whatever is doing the scrolling, not the window.** Scroll events do not
   * bubble, but they are dispatched at the element and can be taken in the
   * capture phase from `document`, which catches a column's scroll and the
   * page's alike — the Daily page's two columns each carry their own scrollbar
   * and the page itself is fixed to the glass.
   */
  const position = (target) =>
    !target || target === document || target === document.documentElement ? window.scrollY : target.scrollTop;

  /**
   * **And only from something that scrolls the way a reader reads.** Listening
   * on `document` in the capture phase also catches the carousel's own drift
   * and the phone's nav strip, and `position` reads `scrollTop` — a *forced
   * layout*, on a frame the drift has already dirtied — for an answer a
   * horizontal scroller cannot give. Re-derive the cost with
   * `node scratchpad/cpu-profile.mjs`; what it read is in
   * `docs/SRC-DECISIONS.md § src/ui/coachmark.js`.
   *
   * Decided once per element and remembered, because the question itself costs
   * layout: an element that can scroll vertically is one a reader can read in.
   */
  const vertical = new WeakMap();
  const reads = (target) => {
    if (!target || target === document || target === document.documentElement) return true;
    if (!(target instanceof Element)) return false;
    let known = vertical.get(target);
    if (known === undefined) {
      known = target.scrollHeight > target.clientHeight;
      vertical.set(target, known);
    }
    return known;
  };

  let count = 0;
  let last = 0;
  let from = window.scrollY;
  const onScroll = (e) => {
    if (!reads(e?.target)) return;
    const now = Date.now();
    const at = position(e?.target);
    if (Math.abs(at - from) < SCROLL_SLOP) return;
    from = at;
    if (now - last > SCROLL_GAP) count += 1;
    last = now;
    if (count >= SCROLLS) {
      closeAll();
      teardown();
    }
  };

  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    closeAll();
    teardown();
  };

  /* Opening either control is the mark having been read: both go, not just
     the one pressed. They are one message in two halves. */
  const onPress = (e) => {
    if (!e.target.closest?.('#church-open, #lang-open')) return;
    closeAll();
    teardown();
  };

  function teardown() {
    document.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onPress, true);
    closeAll();
  }

  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onPress, true);

  for (const mark of live) mark.dismissed = teardownOne(live, mark, teardown);
  return teardown;
}

/** One mark going leaves the other standing; the last one out tears down. */
const teardownOne = (live, mark, teardown) => () => {
  const at = live.indexOf(mark);
  if (at >= 0) live.splice(at, 1);
  mark.close();
  if (!live.length) teardown();
};

function build(target, text) {
  const el = document.createElement('div');
  el.className = 'coachmark';
  el.setAttribute('role', 'note');
  el.innerHTML =
    `<span class="coachmark-text">${esc(text)}</span>` +
    `<button type="button" class="coachmark-close icon-button" ` +
    `aria-label="${esc(STRINGS.coach.dismiss)}">${CLOSE}</button>`;
  document.body.appendChild(el);

  const mark = { el, target, dismissed: null, close: () => close(el) };

  el.querySelector('.coachmark-close').addEventListener('click', () => mark.dismissed?.());

  /* The swipe. Touch and pen only: a mouse has the × under the cursor already,
     and a mouse drag across a note is more often a text selection than a
     dismissal. Either direction — this is a brush-away, not a choice. */
  let hold = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.target.closest('button')) return;
    hold = { x: e.clientX, id: e.pointerId };
  });
  el.addEventListener('pointermove', (e) => {
    if (!hold || e.pointerId !== hold.id) return;
    const dx = e.clientX - hold.x;
    if (Math.abs(dx) < SWIPE) return;
    hold = null;
    el.style.transform = `translateX(${dx > 0 ? 60 : -60}px)`;
    mark.dismissed?.();
  });
  el.addEventListener('pointerup', () => { hold = null; });
  el.addEventListener('pointercancel', () => { hold = null; });

  // One frame at rest, then the class that runs the fade and the glow. Under
  // reduced motion the class is on from the first paint and base.css gives it
  // nothing to run: the movement is removed, not shortened (STRUCTURE.md).
  if (reducedMotion()) el.classList.add('is-in');
  else requestAnimationFrame(() => el.classList.add('is-in'));
  return mark;
}

/** The clear space kept between two marks that would otherwise collide. */
const APART = 10;
/** How close to the edge of the page a mark may sit. */
const INSET = 8;

/**
 * Under the control, arrow over it, and never off the side of the page: the box
 * is clamped into the viewport while the arrow stays with the button, so a
 * control at the very edge of a 320 px screen still gets a mark that points at
 * it rather than one that has slid away from what it means.
 */
function place(el, target, left = null) {
  const b = target.getBoundingClientRect();
  const width = el.getBoundingClientRect().width;
  const centre = b.left + b.width / 2;
  const wanted = left === null ? centre - width / 2 : left;
  const put = Math.max(INSET, Math.min(wanted, document.documentElement.clientWidth - width - INSET));
  el.style.left = `${Math.round(put + scrollX)}px`;
  el.style.top = `${Math.round(b.bottom + scrollY + 9)}px`;
  el.style.setProperty('--arrow-x', `${Math.round(centre - put)}px`);
  return { left: put, right: put + width, centre };
}

/**
 * Both marks, placed so neither covers the other — `on a first visit the two
 * marks clear the fold, and so does the day` in `e2e/chrome.spec.js` fails if
 * they overlap.
 *
 * Each is centred under its own control, which is right on a phone where the
 * two controls are a screen apart. When they collide they open outwards from
 * the midpoint between the controls instead, each keeping its arrow over its
 * own button because the arrow is set from the control's centre and not from
 * the box's. Two marks is all there has ever been and all this handles; a third
 * would want a different idea, not a loop.
 *
 * What the desktop's two buttons in one corner did to the first version:
 * `docs/SRC-DECISIONS.md § src/ui/coachmark.js`.
 */
function layout(marks) {
  const placed = marks.map((mark) => ({ mark, at: place(mark.el, mark.target) }));
  if (placed.length < 2) return;
  placed.sort((a, b) => a.at.centre - b.at.centre);
  for (let i = 1; i < placed.length; i += 1) {
    const before = placed[i - 1];
    const now = placed[i];
    if (before.at.right + APART <= now.at.left) continue;
    const mid = (before.at.centre + now.at.centre) / 2;
    const width = before.at.right - before.at.left;
    before.at = place(before.mark.el, before.mark.target, mid - APART / 2 - width);
    // The split above assumes the midpoint has room either side of it, which
    // is false the moment "before" is itself pinned to the viewport's edge
    // instead of landing where the split intended — a narrow phone with two
    // wide marks, since 2026-08-26. "before"'s *actual* right edge, not the
    // one the split assumed, is the floor "now" may not come in under.
    now.at = place(now.mark.el, now.mark.target, Math.max(mid + APART / 2, before.at.right + APART));
    /*
     * And the mirror of that, which the wide chrome of 2026-09-01 made
     * reachable: with both controls at the window's right edge the midpoint
     * is there too, so "now" is clamped *left* of where the split asked for
     * it and lands back on top of "before". `place` is the only thing that
     * knows it was clamped, so the check has to be after it — and the
     * remedy is to move the other one, the edge being immovable.
     */
    if (now.at.left < before.at.right + APART) {
      const width = before.at.right - before.at.left;
      before.at = place(before.mark.el, before.mark.target, now.at.left - APART - width);
    }
  }
}

function close(el) {
  if (!el.isConnected) return;
  if (reducedMotion()) {
    el.remove();
    return;
  }
  el.classList.remove('is-in');
  const off = () => el.remove();
  el.addEventListener('transitionend', off, { once: true });
  // The guarantee behind the transitionend: a mark whose transition never
  // fires — a hidden tab, an interrupted paint — is still taken off the page
  // rather than left invisible over the header.
  setTimeout(off, 500);
}
