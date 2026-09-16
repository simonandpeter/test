import { formatSubtext } from '../../lib/calendar-page.js';
import { currentChurch } from '../../lib/church.js';
import { loadDetail, prefetch } from '../../lib/detail.js';
import { cardCrop } from '../../lib/hero-crop.js';
import { saintName } from '../../lib/honorific.js';
import { currentLanguage } from '../../lib/i18n.js';
import { escapeHtml as esc, firstParagraphText } from '../../lib/markdown.js';
import { DUR, EASE, reducedMotion } from '../../lib/motion.js';
import { neighboursAt } from '../../lib/prayer-order.js';
import { hymnMarkup, mergeForReading } from '../../ui/hymns.js';
import { STRINGS } from '../../ui/strings.js';
import { clearAsides, fillAsides } from './asides.js';
import { state } from './state.js';

const BASE = import.meta.env.BASE_URL;

/**
 * The saint in hand: the icon on the left of the pair and what is sung on the
 * right. One saint to a screen, and the arrows are the only things that move.
 *
 * **The hymns are `ui/hymns.js`'s and nothing here renders one.** That module
 * already reads each record's own `lang` and `kind`, collapses a hymn two
 * traditions share into one text carrying both citations, and puts the tone
 * into the reader's own words — none of which a second renderer would get
 * right, and all of which a saint's own page depends on.
 */

/*
 * The picture is the register's mat and picture, the same two boxes and the
 * same clamped `cardCrop` shape the Daily rows and the Index's cards draw,
 * because a reader who has met an icon on one page should meet the same
 * silhouette on this one.
 */
const picture = (card) =>
  card.image
    ? `<span class="hy-pic-frame" style="--hy-aspect:${cardCrop(card.image).aspect};--hy-focus:${
        cardCrop(card.image).focus
      }">
        <img src="${BASE + card.image.src}" alt="" width="${card.image.w}" height="${card.image.h}"
          decoding="async" />
      </span>`
    : '';

/**
 * The half of the card the manifest can answer at once: the picture, the name
 * and the dates. The life's opening line and the hymns are a fetch away and
 * are filled into the two boxes this leaves empty — which are drawn rather than
 * added later so the column does not change width as the payload lands.
 */
export function cardMarkup(card) {
  return `<article class="hy-saint" data-slug="${esc(card.slug)}">
    <div class="hy-pic">
      ${picture(card)}
      <h2 class="hy-name">${esc(saintName(card))}</h2>
      <p class="hy-sub utility">${esc(formatSubtext(card))}</p>
      <p class="hy-line" data-hy-lede></p>
    </div>
    <div class="hy-hymns" data-hy-hymns tabindex="0" role="region"
      aria-label="${esc(STRINGS.calendar.hymns.heading)}"></div>
  </article>`;
}

/**
 * The hymns, ordered the way a saint's own page orders them: the reader's own
 * church first, because that is the calendar the whole site is read in, and the
 * others under it rather than hidden.
 *
 * `withChurch` only where more than one calendar is named, counted after the
 * merge — a merged row is the one that most needs its label and the only row
 * that can carry two.
 */
function hymnsMarkup(hymns) {
  const all = mergeForReading(hymns ?? []);
  /*
   * **The two silences are two, because the rule above them is conditional**
   * (`ui/strings.js`, `calendar.hymns`): reading English, a column holds an
   * English rendering or says there is none; reading one of the four packs, it
   * holds that tradition's own text or says there is none in that language.
   * The saint reached this page because the manifest says a hymn exists, so an
   * empty column here is about the reading and not about the corpus.
   */
  if (!all.length) {
    const H = STRINGS.calendar.hymns;
    return `<p class="hy-line">${esc(currentLanguage() === 'en' ? H.noEnglish : H.noneInYourLanguage)}</p>`;
  }
  const church = currentChurch();
  const ordered = [...all].sort((a, b) => (b.church === church) - (a.church === church));
  const spans = new Set(all.flatMap((h) => [h.church, ...(h.alsoIn ?? []).map((a) => a.church)])).size > 1;
  return ordered.map((h) => hymnMarkup(h, { withChurch: spans })).join('');
}

/**
 * The half that arrives with the payload.
 *
 * **`generation` is the whole of the staleness check.** A reader who steps
 * twice quickly has two fetches in flight and they can land in either order;
 * without this the second saint's card would be overwritten by the first
 * saint's hymns. `state` is re-read rather than captured for the same reason —
 * the view may have been destroyed while this was in the air.
 *
 * A payload that never arrives leaves the two boxes as they were drawn: empty.
 * The page says it has nothing rather than substituting something (CLAUDE.md,
 * "a failure may degrade the page, never fake it"), and the hymn box says so in
 * words, because an empty column beside a saint the manifest said had a hymn
 * would read as a gap in the page rather than in the fetch.
 */
function fillDetail(root, card, generation) {
  loadDetail(card.slug).then(
    (payload) => {
      if (!state || state.generation !== generation) return;
      const article = root.querySelector(`.hy-saint[data-slug="${CSS.escape(card.slug)}"]`);
      if (!article) return;
      const lede = article.querySelector('[data-hy-lede]');
      if (lede) lede.textContent = firstParagraphText(payload?.life) ?? '';
      const box = article.querySelector('[data-hy-hymns]');
      if (box) box.innerHTML = hymnsMarkup(payload?.saint?.hymns);
    },
    () => {
      /* The saint's own folder did not answer; the card keeps what the manifest
         gave it and says nothing it cannot support. */
    },
  );
}

/**
 * Which arrows are live, and the two neighbours in the cache behind them.
 *
 * **Its own function because the ends move without the saint moving.** A query
 * typed into the field shortens the book under the reader's hands: the saint in
 * hand can be unchanged and be the last one in it, and an arrow left enabled
 * there would step to nobody. `views/prayer/find.js` calls this on exactly that
 * change, where redrawing the card would throw away the hymn's scroll position
 * for nothing.
 */
export function refreshEnds(root) {
  if (!state) return;
  const { prev, next } = neighboursAt(state.order, state.at);
  const prevBtn = root.querySelector('#hy-prev');
  const nextBtn = root.querySelector('#hy-next');
  if (prevBtn) prevBtn.disabled = !prev;
  if (nextBtn) nextBtn.disabled = !next;
  /*
   * Both neighbours, because a reader who has stepped forward is as likely to
   * step back as on — and speculatively, so `lib/detail.js` cancels them the
   * moment the reader leaves for somewhere else entirely.
   */
  if (prev) prefetch(prev.slug);
  if (next) prefetch(next.slug);
}

/** The fade in flight, so a second press cancels the first rather than racing it. */
let fading = null;

/**
 * Draws the saint at `state.at`, and fades to them where the reader asked for
 * the change.
 *
 * **The swap waits on the animation's own `finished`, not on a timer and not on
 * `transitionend`.** The mockup this page is drawn from redrew at a 200 ms
 * `setTimeout` against a 300 ms CSS transition and so painted the new saint at
 * two thirds opacity. A CSS transition plus a fallback timer is the same bug
 * wearing a longer timer: **measured on this desk** (2026-09-16, 6 runs of one
 * press), the transition did not start at all on one of them — the swap then
 * landed on the timer at full opacity — and under load it started late enough
 * that the timer caught it at 0.35. An animation has neither failure: it always
 * runs and `finished` resolves exactly once, when the card is actually gone.
 *
 * `DUR.move` and `EASE.soft` are the same scale `tokens.css` holds, which
 * `tests/design-tokens.test.mjs` is what keeps true of both halves.
 *
 * **Reduced motion removes the fade rather than shortening it** (STRUCTURE.md
 * §3): the end state arrives on the same tick.
 */
export function showCard(root, { animate = false } = {}) {
  const hold = root.querySelector('#hy-hold');
  if (!hold || !state) return;
  const draw = () => {
    const card = state.order[state.at];
    /* The field narrowed the hymnal to nobody. The count line says so in words;
       here the three regions empty rather than keeping the saint the query has
       just excluded, which would be the page disagreeing with its own count. */
    if (!card) {
      hold.innerHTML = '';
      clearAsides(root);
      refreshEnds(root);
      return;
    }
    const generation = state.generation;
    hold.innerHTML = cardMarkup(card);
    fillDetail(hold, card, generation);
    /*
     * **The asides are emptied now and drawn once, when the folder answers.**
     * They were drawn twice — the manifest's half at once and the payload's
     * merged in after — and on a phone that costs a jolt rather than buying
     * anything: the two columns stand *under* a card whose own two boxes fill
     * from the same fetch, so whatever is in them is pushed down the page the
     * moment the hymns arrive. Measured at 360 px, that was a CLS of 0.076
     * against `quality-floor.spec.js`'s budget of 0.02, and the whole of it was
     * blamed on `.hy-side`. Drawn once, the columns have no height to be moved
     * from and the card grows into the space below it.
     *
     * A step costs nothing for it: the neighbours are prefetched, so
     * `loadDetail` answers from the cache in a microtask and the columns are
     * filled before the frame is painted.
     *
     * They are *outside* `.hy-hold`, so they change at the press rather than
     * behind the card's fade. That is deliberate: the fade is the page being
     * turned, and the two lists beside it are the page's margins, which do not
     * need to be turned to be read.
     */
    clearAsides(root);
    fillAsides(root, card, generation);
    refreshEnds(root);
  };

  fading?.cancel();
  fading = null;

  if (!animate || reducedMotion()) {
    draw();
    return;
  }

  const generation = state.generation;
  // `forwards`, so the card stays gone between the fade ending and the redraw;
  // without it the old saint flashes back for a frame before being replaced.
  const out = hold.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: DUR.move,
    easing: EASE.soft,
    fill: 'forwards',
  });
  fading = out;
  out.finished.then(
    () => {
      // The reader pressed again while this was running, and the press that
      // overtook it owns the card now.
      if (!state || state.generation !== generation) return;
      draw();
      // Cancelling hands the box back to the sheet's own `opacity: 1`, which is
      // where the second half starts from.
      out.cancel();
      fading = hold.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: DUR.move,
        easing: EASE.soft,
      });
    },
    () => {
      /* Cancelled by a press that overtook it; that press draws the card. */
    },
  );
}

/** Steps by one, within the ends. The hymnal is a book and does not wrap. */
export function stepBy(root, delta) {
  if (!state) return;
  const at = state.at + delta;
  if (at < 0 || at >= state.order.length) return;
  showAt(root, at);
}

/**
 * Goes to a named saint, which is what a press in either aside does. A slug the
 * hymnal does not hold is not an error: the aside draws such a row inert, and
 * this refuses it a second time rather than trusting that.
 */
export function goToSlug(root, slug) {
  if (!state) return;
  const at = state.order.findIndex((card) => card.slug === slug);
  if (at < 0 || at === state.at) return;
  showAt(root, at);
}

function showAt(root, at) {
  state.at = at;
  // The payload belongs to the saint being left, and the asides read it.
  state.detail = null;
  state.generation += 1;
  showCard(root, { animate: true });
}
