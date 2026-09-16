import { formatSubtext } from '../../lib/calendar-page.js';
import { currentChurch } from '../../lib/church.js';
import { loadDetail, prefetch } from '../../lib/detail.js';
import { cardCrop } from '../../lib/hero-crop.js';
import { saintName } from '../../lib/honorific.js';
import { currentLanguage } from '../../lib/i18n.js';
import { escapeHtml as esc, firstParagraphText } from '../../lib/markdown.js';
import { DUR, reducedMotion } from '../../lib/motion.js';
import { neighboursAt } from '../../lib/prayer-order.js';
import { hymnMarkup, mergeForReading } from '../../ui/hymns.js';
import { STRINGS } from '../../ui/strings.js';
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
    <div class="hy-hymns" data-hy-hymns></div>
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
 * Draws the saint at `state.at`, and fades to them where the reader asked for
 * the change.
 *
 * **The swap happens when the fade is over, not on a timer guessed to match
 * it.** The mockup this page is drawn from redrew at a 200 ms `setTimeout`
 * against a 300 ms CSS transition and so painted the new saint at two thirds
 * opacity; `transitionend` is the event that actually says the old one has
 * gone, and `DUR.move` is only the fallback for the case where no transition
 * ran at all (a hidden tab, a browser that skipped it).
 *
 * **Reduced motion removes the fade rather than shortening it** (STRUCTURE.md
 * §3): the end state arrives on the same tick.
 */
export function showCard(root, { animate = false } = {}) {
  const hold = root.querySelector('#hy-hold');
  if (!hold || !state) return;
  const draw = () => {
    const card = state.order[state.at];
    if (!card) {
      hold.innerHTML = '';
      return;
    }
    const generation = state.generation;
    hold.innerHTML = cardMarkup(card);
    fillDetail(hold, card, generation);
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
  };

  if (!animate || reducedMotion()) {
    hold.classList.remove('is-out');
    draw();
    return;
  }

  let done = false;
  const swap = () => {
    if (done) return;
    done = true;
    hold.removeEventListener('transitionend', onEnd);
    clearTimeout(timer);
    draw();
    /*
     * Two frames, not one: a class removed in the same frame the content was
     * written has nothing to transition from, because the browser has not yet
     * computed a style for the new box.
     */
    requestAnimationFrame(() => requestAnimationFrame(() => hold.classList.remove('is-out')));
  };
  const onEnd = (e) => {
    if (e.target === hold && e.propertyName === 'opacity') swap();
  };
  hold.addEventListener('transitionend', onEnd);
  const timer = setTimeout(swap, DUR.move * 2);
  hold.classList.add('is-out');
}

/** Steps by one, within the ends. The hymnal is a book and does not wrap. */
export function stepBy(root, delta) {
  if (!state) return;
  const at = state.at + delta;
  if (at < 0 || at >= state.order.length) return;
  state.at = at;
  state.generation += 1;
  showCard(root, { animate: true });
}
