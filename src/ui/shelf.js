/**
 * The two shelves that turn a thirty-second visit into a habit (brief §8.1):
 * what the reader was in the middle of, and what they kept. They live on the
 * calendar because that is the page a returning reader lands on, and they are
 * rendered in the register voice — a shelf is a list of days' worth of
 * reading, not a widget.
 *
 * Both are hidden when empty. An empty shelf is not a designed state in the
 * sense DESIGN.md §5b means: a day with no commemorations is a fact about the
 * calendar and says so, whereas a reader who has saved nothing has simply not
 * used a feature yet, and inviting them to look at their own empty shelf would
 * be furniture.
 */

import * as store from '../lib/store.js';
import { fill } from './strings.js';
import { formatLifespan, formatSubtext } from '../lib/calendar-page.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { saintName } from '../lib/honorific.js';
import { paintSaved, wireSaveButtons } from './save.js';
import { STRINGS } from './strings.js';

const BASE = import.meta.env.BASE_URL;
const SHELF_LIMIT = 5;

function row(card, router, { removable = false } = {}) {
  const remove = removable
    ? `<button type="button" class="shelf-remove" data-forget="${esc(card.slug)}"
        aria-label="${STRINGS.shelf.remove}: ${esc(card.display_name)}">×</button>`
    : '';
  return `<li>
    <a class="reg-name" href="${router.href(`/saints/${card.slug}`)}" data-prefetch="${esc(card.slug)}">${esc(saintName(card))}</a>
    <span class="reg-feast utility">${esc(formatLifespan(card.dates))}</span>
    ${remove}
  </li>`;
}

/**
 * Continue reading wears the Index's own row dress (author, 2026-08-24): the
 * same card, the same classes, so the two read as one register.
 *
 * **It carries no bookmark** (author, 2026-08-28: "Remove bookmark on continue
 * reading row cards. And why was it even on the left side to begin with?").
 * It was there because the row copied the Index's, which had one until the day
 * before; the Index's rows lost theirs on 2026-08-27 and this was the last row
 * still wearing it. As for the left: the row builds `image, body, tools`, and
 * the Index's rows were re-ordered to name-first with the picture trailing
 * while this one was not — so the mark sat where the row's own dress had moved
 * on from. Removing it settles both halves of the question.
 *
 * **Note for whoever picks this up**: after this the shelf page has no Save
 * control at all. The Saved shelf's own rows (`row()` above) never had one, and
 * are rendered without `removable`, so nothing on this page un-saves a saint —
 * the saint's own page is the only route, which is where the author sent it
 * ("If people want to bookmark they can go to the profile page itself").
 *
 * The × that stood above that bookmark went on 2026-08-24, at the author's
 * instruction: a row is cleared by **swiping it across** instead. It came
 * back the next day, *on the desktop only* and to the right of the bookmark
 * rather than above it — a mouse has the swipe too, but a visible control is
 * the faster hand where there is a cursor to aim it, and the pointer that
 * can hover is the one that finds an × worth having. Touch keeps the swipe
 * alone, which is the gesture it came for.
 *
 * The button is the same button either way: `shelf-remove`, always in the
 * markup, let out of its clip by a `(hover: hover)` query. Hidden, it is
 * still a screen-reader-and-keyboard route that focus brings out —
 * DESIGN.md §5b's rule is that a gesture is never the only way to a thing,
 * and a shelf whose only clearing gesture is a swipe would strand every
 * reader who cannot make one.
 */
function readingRow(card, router) {
  const image = card.image
    ? `<span class="index-media" style="background-image:url('${BASE + card.image.lqip}')">
        <img src="${BASE + card.image.src}" alt="" width="${card.image.w}" height="${card.image.h}"
          loading="lazy" decoding="async" />
      </span>`
    : '';
  return `<li class="index-card panel is-row shelf-row">
    ${image}
    <span class="row-body">
      <span class="name-line">
        <a class="index-name" href="${router.href(`/saints/${card.slug}`)}" data-prefetch="${esc(card.slug)}">${esc(saintName(card))}</a>
      </span>
      <span class="index-dates utility">${esc(formatSubtext(card))}</span>
    </span>
    <button type="button" class="shelf-remove shelf-remove-quiet utility" data-forget="${esc(card.slug)}"
      >${esc(fill(STRINGS.shelf.removeNamed, { name: card.display_name }))}</button>
  </li>`;
}

/**
 * Renders both shelves into `el` and keeps them in step with the store.
 * Returns a teardown the view calls when it re-renders.
 */
export function mountShelves(el, { data, router }) {
  let alive = true;

  const paint = async () => {
    const [reading, saved] = await Promise.all([
      store.listReading(SHELF_LIMIT),
      store.listSaved(SHELF_LIMIT),
    ]);
    if (!alive) return;

    // A slug whose folder has since gone is dropped rather than named: the
    // shelf can only show what the manifest can still describe.
    const readingCards = reading.map((r) => data.bySlug.get(r.slug)).filter(Boolean);
    const savedCards = saved.map((slug) => data.bySlug.get(slug)).filter(Boolean);

    const sections = [];
    if (readingCards.length) {
      sections.push(
        `<h2 class="register-heading">${STRINGS.shelf.continueReading}</h2>
         <ul class="shelf shelf-cards">${readingCards.map((c) => readingRow(c, router)).join('')}</ul>`,
      );
    }
    if (savedCards.length) {
      sections.push(
        `<h2 class="register-heading">${STRINGS.shelf.saved}</h2>
         <ul class="register shelf">${savedCards.map((c) => row(c, router)).join('')}</ul>`,
      );
    }
    el.innerHTML = sections.join('');
    paintSaved(el);
  };

  const onClick = (e) => {
    const button = e.target.closest('[data-forget]');
    if (!button) return;
    store.clearReading(button.dataset.forget);
  };

  el.addEventListener('click', onClick);
  const unwireSwipe = wireSwipe(el);
  // The reading rows carry the Save bookmark now, and nothing else wires this
  // container — the day panel's wiring stops at the panel.
  const unwireSave = wireSaveButtons(el);
  const unsubscribe = store.subscribe((what) => {
    if (what === 'saved' || what === 'reading') paint();
  });
  paint();

  return () => {
    alive = false;
    el.removeEventListener('click', onClick);
    unwireSwipe();
    unwireSave();
    unsubscribe();
  };
}

/**
 * Past this much of the row's width, the hand meant it. **0.25 since
 * 2026-08-26**, down from 0.4 (author: "Make the swipe on the Continue Reading
 * row cards easier, it snaps back too easily making it too hard to remove").
 * On a 360 px phone that is 90 px of travel instead of 144.
 */
const SWIPE_OUT = 0.25;
/**
 * …or a flick, whatever the distance. This is the other half of the same
 * complaint and probably the larger half: a quick push across a row is over in
 * about 120 ms and covers barely a third of the width, so a distance-only test
 * reads the most natural version of the gesture as a miss. px/ms at the
 * release, measured over the last ~80 ms the way the week rail measures its
 * throw — a long slow haul that ends still is not a flick.
 */
const SWIPE_FLICK = 0.4;
/** Where a hold stops being a press and starts being a swipe. */
const SWIPE_SLOP = 8;
/**
 * How much taller than wide the movement has to be before it is the page
 * scrolling rather than the row moving. It used to be any excess at all,
 * tested on the *first* move event: a finger that starts a degree off
 * horizontal produced dy > dx for one frame and lost the gesture for good,
 * with no way back short of lifting and starting again. Now the axis is
 * decided once, at the slop, and the vertical has to win by a fifth.
 */
const SWIPE_AXIS = 1.2;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A Continue-reading row is cleared by swiping it across (author,
 * 2026-08-24). Pointer events, so a mouse drag does it as readily as a
 * finger — the same reversal the week rail made when it took the desktop
 * drag; a shelf whose gesture worked on a phone and nowhere else would be
 * the "no gesture at all on the mouse" problem again.
 *
 * The row follows the hand, and past SWIPE_OUT of its own width it leaves in
 * the direction it was pushed. Under that it springs back, which is what
 * tells the reader the gesture exists and did not take: a row that snapped
 * home with no travel would read as a dead press. Vertical movement wins
 * outright — the shelf sits in a scrolling page and stealing the scroll to
 * dismiss something the reader was only scrolling past is the one failure
 * this gesture can commit. Reduced motion keeps the dismissal and removes
 * the travel: the row goes, it does not fly.
 */
function wireSwipe(el) {
  let hold = null;

  const rowOf = (node) => node?.closest?.('.shelf-row') ?? null;

  const release = (row, animate) => {
    row.classList.remove('is-swiping');
    row.style.transform = '';
    row.style.opacity = '';
    if (!animate) row.style.transition = 'none';
  };

  const down = (e) => {
    if (e.button > 0) return;
    const row = rowOf(e.target);
    // The bookmark and the hidden remove button are controls: a press that
    // starts on one is that control's, not a swipe's.
    if (!row || e.target.closest('button')) return;
    hold = { row, x: e.clientX, y: e.clientY, id: e.pointerId, swiping: false, dx: 0, samples: [] };
  };

  const move = (e) => {
    if (!hold || e.pointerId !== hold.id) return;
    const dx = e.clientX - hold.x;
    const dy = e.clientY - hold.y;
    if (!hold.swiping) {
      // Nothing is decided until the hold has travelled: an early frame says
      // more about the hand settling than about which way it is going.
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_SLOP) return;
      if (Math.abs(dy) > Math.abs(dx) * SWIPE_AXIS) {
        // The page is scrolling under the hand; this was never a swipe.
        hold = null;
        return;
      }
      hold.swiping = true;
      hold.row.classList.add('is-swiping');
      hold.row.setPointerCapture?.(e.pointerId);
    }
    // The last ~80 ms of travel, for the flick test at the release.
    hold.samples = hold.samples.filter((s) => e.timeStamp - s.t < 80);
    hold.samples.push({ t: e.timeStamp, x: e.clientX });
    hold.dx = dx;
    const width = hold.row.getBoundingClientRect().width || 1;
    hold.row.style.transform = `translateX(${dx}px)`;
    // The row thins as it goes, so how far is left to push is visible.
    hold.row.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / width / (SWIPE_OUT * 2)));
  };

  const up = (e) => {
    if (!hold || e.pointerId !== hold.id) return;
    const { row, dx, swiping, samples } = hold;
    hold = null;
    if (!swiping) return;
    row.releasePointerCapture?.(e.pointerId);
    // A swipe is not a click: the row is a link to the saint, and letting go
    // of a dragged row must not open them.
    const swallow = (click) => click.stopPropagation();
    row.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => row.removeEventListener('click', swallow, { capture: true }), 0);

    const width = row.getBoundingClientRect().width || 1;
    const slug = row.querySelector('[data-forget]')?.dataset.forget;
    /*
     * Far enough, *or* fast enough, and in the direction it actually went: a
     * flick back toward where it started is a reader changing their mind, and
     * dismissing on the speed of that would be the opposite of what the hand
     * said. Samples still fresh at the release only — the window is pruned as
     * moves arrive, so a fast drag held still and then let go would otherwise
     * read the stale flick.
     */
    const fresh = samples.filter((s) => e.timeStamp - s.t < 120);
    const first = fresh[0];
    const last = fresh[fresh.length - 1];
    const dt = first && last ? last.t - first.t : 0;
    const velocity = dt > 0 ? (last.x - first.x) / dt : 0;
    const flicked = Math.abs(velocity) >= SWIPE_FLICK && Math.sign(velocity) === Math.sign(dx);
    if ((Math.abs(dx) < width * SWIPE_OUT && !flicked) || !slug) {
      release(row, !reducedMotion());
      return;
    }
    if (reducedMotion()) {
      store.clearReading(slug);
      return;
    }
    // Out the way it was pushed, then the store repaints the shelf without it.
    row.classList.add('is-leaving');
    row.style.transform = `translateX(${dx > 0 ? width : -width}px)`;
    row.style.opacity = '0';
    row.addEventListener('transitionend', () => store.clearReading(slug), { once: true });
  };

  const cancel = (e) => {
    if (!hold || e.pointerId !== hold.id) return;
    const { row, swiping } = hold;
    hold = null;
    if (swiping) release(row, !reducedMotion());
  };

  /*
   * A row is a link with a picture in it, and dragging either is a *native*
   * drag in every desktop browser — which fires pointercancel and takes the
   * gesture away mid-swipe. (Found the first time the swipe was rendered and
   * looked at: the row never moved, and the pointer log showed the cancel.)
   * Refusing the dragstart is enough; it leaves clicks, focus and the
   * keyboard alone, where preventing the pointerdown would have cost the
   * focus a press should give.
   */
  const nodrag = (e) => {
    if (e.target?.closest?.('.shelf-row')) e.preventDefault();
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('dragstart', nodrag);

  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
    el.removeEventListener('dragstart', nodrag);
  };
}
