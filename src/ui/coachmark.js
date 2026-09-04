/**
 * The two things a first visit is not told, said where they are done (author,
 * 2026-08-26): "Replace the language and calendar pop-ups on first opening
 * with a fade-in glowing tool tip with an arrow pointing to each of the two
 * buttons, explaining you can select your church from here, and language from
 * here. Text as minimal as possible."
 *
 * **This reverses the first-visit gate**, and the reversal is worth stating
 * plainly because DESIGN.md §5b and Amendment 23 both rest on it. From
 * 2026-08-21 the calendar asked which church the reader kept and *showed
 * nothing until it was answered*: the page below waited, deliberately, because
 * a calendar with no church chosen would have been the site picking one and
 * not saying so. A second block joined it on 2026-08-25 for the language.
 *
 * What replaces it says the same two things and asks neither: the site opens
 * on a calendar, and a mark under each control says which control changes it.
 * The honesty the gate was buying is bought instead by `defaultChurch()` in
 * lib/church.js — the guess is made from the browser's own language, it is
 * never written to settings, and `hasChosen()` still knows the difference — and
 * by the header, which has named the church on every page since 2026-08-24.
 * That control did not exist when the gate was designed.
 *
 * The marks are chrome, not the calendar's: they point at header buttons, so
 * they are mounted once at boot and stand on whatever page the visit begins on.
 *
 * Four ways out, and the reader is expected to take one of them (author, same
 * instruction): the ×, a swipe on a touch screen, the second scroll input
 * either way, and — not asked for but obviously right — opening the control it
 * points at, which is the mark having done its job. Escape too, because
 * anything that takes focus and dismisses has to answer Escape.
 */

import { hasChosen } from '../lib/church.js';
import { hasChosenLanguage } from '../lib/i18n.js';
import { readSettings, writeSetting } from '../lib/settings.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { STRINGS } from './strings.js';
import { reducedMotion } from '../lib/motion.js';

/**
 * How many scroll inputs it survives. Two, at the author's word: the first
 * scroll is a reader looking at the page they arrived on, and taking the mark
 * away on it would mean most readers never see it at all.
 */
const SCROLLS = 2;
/**
 * What counts as *one* input. A wheel notch or a finger's flick fires scroll
 * events every frame for a few hundred milliseconds, so counting raw events
 * would spend both on one gesture. Movement that stops for this long has
 * ended, and the next movement is the next input.
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
 * Which marks this browser has already been shown. **Shown, not answered**
 * (found in review, 2026-08-27): the gate was `hasChosen()` alone, so a reader
 * who is content with the guessed calendar and with English answers neither
 * question and was met by both marks on every load, for ever. The two
 * conditions are different questions and the mark wants the second one.
 *
 * Written when the mark is *mounted* rather than when it is dismissed, which
 * is the literal reading of "has been shown" and the only one that cannot
 * leak: a reader who closes the tab without touching either mark has still
 * seen it, and a dismissal-only flag would bring both back the next morning.
 * The four ways out stay exactly as they were; they are how a reader gets rid
 * of the mark *now*, not what stops it coming back.
 */
const seenMarks = () => {
  const seen = readSettings().coachSeen;
  return Array.isArray(seen) ? seen : [];
};

/**
 * Mounts whichever marks this visit is owed, and returns a teardown. Nothing
 * is mounted for a reader who has answered both questions, or for one who has
 * been shown both marks once.
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

  /* Positions are document coordinates, so a mark travels with the page the
     way the fast bubble does. A resize moves the header under them — the
     calendar control changes line at 560 px — so they are placed again rather
     than dismissed: a reader turning a phone has not answered anything. */
  const onResize = () => layout(live);

  /*
   * **Whatever is doing the scrolling, not the window** (2026-09-01). The
   * Daily page stopped scrolling that day — its two columns each carry their
   * own scrollbar and the page itself is fixed to the glass — so a mark that
   * only watched `window.scrollY` sat there through any amount of reading.
   * Scroll events do not bubble, but they are dispatched at the element and
   * can be taken in the capture phase from `document`, which is what catches
   * a column's scroll and the page's alike.
   */
  const position = (target) =>
    !target || target === document || target === document.documentElement ? window.scrollY : target.scrollTop;

  let count = 0;
  let last = 0;
  let from = window.scrollY;
  const onScroll = (e) => {
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
  // nothing to run: the movement is removed, not shortened (DESIGN.md §6).
  if (reducedMotion()) el.classList.add('is-in');
  else requestAnimationFrame(() => el.classList.add('is-in'));
  return mark;
}

/** The clear space kept between two marks that would otherwise collide. */
const APART = 10;
/** How close to the edge of the page a mark may sit. */
const INSET = 8;

/**
 * Under the control, arrow over it, and never off the side of the page — the
 * same arithmetic the fast bubble uses, and for the same reason: the box is
 * clamped into the viewport and the arrow stays with the button, so a control
 * at the very edge of a 320 px screen still gets a mark that points at it
 * rather than one that has slid away from what it means.
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
 * Both marks, placed so neither covers the other.
 *
 * Centring each under its own control is right on a phone, where the calendar
 * control is at the start of the header's second line and the language control
 * is at the end of its first — a screen apart. On a desktop they are two
 * buttons in the same corner, four pixels between them, and two centred boxes
 * overlapped by ninety: the language mark covered the church mark's ×, and the
 * × could be seen but not pressed. (Found by the browser suite, which timed out
 * clicking it; a hit test at the button's own coordinates came back
 * `SPAN.coachmark-text` — the wrong mark's.)
 *
 * So when they collide they open outwards from the midpoint between the two
 * controls: the left one ends before it, the right one begins after it, and
 * each keeps its arrow over its own button because the arrow is set from the
 * control's centre and not from the box's. Two marks is all there has ever
 * been and all this handles; a third would want a different idea, not a loop.
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
