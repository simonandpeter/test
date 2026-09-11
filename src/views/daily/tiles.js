import { formatSubtext } from '../../lib/calendar-page.js';
import { cardCrop } from '../../lib/hero-crop.js';
import { saintName } from '../../lib/honorific.js';
import { currentLanguage } from '../../lib/i18n.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { DUR, reducedMotion } from '../../lib/motion.js';
import { typeGlyph, typeName } from '../../lib/saint-types.js';
import { hymnMarkup, mergeForReading } from '../../ui/hymns.js';
import { STRINGS, fill } from '../../ui/strings.js';
import { reachInWords } from './entries.js';
import { state } from './state.js';

/**
 * A saint of the day, as one element that is both the tile and the card
 * (plan §3, §4).
 *
 * **The element never changes shape by rebuild.** Every part a saint has —
 * the picture, the name, the two-line preview, the life, the troparion and
 * the kontakion — is in the article from the first paint, and folded versus
 * open is `daily-tiles.css` choosing what to show. So opening costs no
 * rebuild: no picture is fetched twice, no fade replays, and nothing that had
 * already arrived from `loadDetail` is thrown away and asked for again.
 *
 * The late parts (the life and the hymns are not in the manifest) are filled
 * in place by `lives.js`, into boxes this file has already drawn at their
 * final width with the honest "nothing recorded" line standing in them — so
 * the four columns never shift as payloads land.
 */

const BASE = import.meta.env.BASE_URL;

/**
 * The six marks, salvaged from `panel.js` ahead of its deletion, plus a
 * seventh this view adds.
 *
 * Which of the six a saint gets is `typeGlyph` in `lib/saint-types.js` —
 * arithmetic over the corpus's own vocabulary, unit-tested there; this is
 * only the ink. A cross for the martyr, a cross on a bar for the
 * hieromartyr, the schema cross on its steps for the venerable, a mitre for
 * the hierarch, a chalice for the presbyter and a crown for the prince.
 *
 * **`saint` is this view's fallback and it is deliberately not `typeGlyph`'s**
 * (plan §4). `tests/type-glyph.test.mjs:56` pins that an unmatched type
 * returns no mark, and that is the right answer for a function whose job is
 * "does the corpus know a mark for this": the corpus knows forty kinds of
 * saint and inventing one mark each says less than the space it takes. What
 * the *page* needs is different — a mat with nothing in it reads as a picture
 * that failed to load — so the eight-pointed cross, which is the site's own
 * mark and says "a saint" where saying "a martyr" would not be true, is
 * chosen here at the point of drawing and nowhere else.
 *
 * `aria-hidden`, and the tile says the word as well: at `--rule` the mark is
 * 1.41:1 on the field, which is right for decoration and a legibility failure
 * for anything carrying information — so it carries none, and the type goes
 * into the tile's accessible text wherever the subtext has not said it.
 */
export const GLYPH_PATHS = {
  martyr: '<path d="M12 4v16M5 11h14"/>',
  hieromartyr: '<path d="M12 4v16M5 11h14M8 20h8"/>',
  venerable: '<path d="M12 4v13M8.5 8h7M6 11h12M8.5 17h7M9.5 20h5"/>',
  hierarch: '<path d="M12 2v4M10.5 4h3"/><path d="M6 20v-5a6 6 0 0 1 12 0v5z"/>',
  presbyter: '<path d="M8 5h8l-1 5a3 3 0 0 1-6 0z"/><path d="M12 13v5M9 19h6"/>',
  prince: '<path d="M5 17l1.6-8 3.4 4 2-6 2 6 3.4-4L19 17z"/><path d="M5 19.5h14"/>',
  saint: '<path d="M12 3v18M9 6h6M6 10h12M9.5 20h5M8 15.5l8 1.5"/>',
};

export const glyphMarkup = (kind) =>
  `<svg class="row-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH_PATHS[kind] ?? GLYPH_PATHS.saint}</svg>`;

/**
 * **Which hymns a reader is shown, and it turns on their language** (plan
 * §11.1, from the author on 2026-09-12: "When English is the language, I only
 * want English hymns showing").
 *
 * Reading English, the only hymns that appear are the ones somebody has
 * rendered into English — translator credited by `hymnMarkup` itself, which
 * prints either the book it was copied from or the admission that this site
 * made it. A kind with no English rendering keeps its column and says so,
 * because a column that vanishes moves the other three and tells the reader
 * nothing.
 *
 * Reading Greek, Russian, Romanian or Serbian, the tradition's own text is
 * shown exactly as `hymnMarkup` prints it today — which is the whole point of
 * the conditional: an English reader meeting Church Slavonic has been given
 * nothing, and a Russian reader meeting it has been given the hymn.
 *
 * `mergeForReading` runs first, so a troparion the Greek and the Russian both
 * sing is one English text carrying both books rather than the same words
 * twice.
 */
export function hymnsOfKinds(hymns, churchId = state?.calendar, language = currentLanguage()) {
  const mine = (hymns ?? []).filter((h) => h.church === churchId);
  const merged = mergeForReading(mine, language).filter((h) => (language === 'en' ? Boolean(h.english) : true));
  const of = (kind) => merged.find((h) => h.kind === kind) ?? null;
  return { troparion: of('troparion'), kontakion: of('kontakion') };
}

/**
 * One hymn column's contents. Drawn empty at first paint and redrawn by
 * `lives.js` when the payload lands; both go through here so the empty state
 * and the filled one are the same box at the same width.
 *
 * The head, when there is a hymn, is `hymnMarkup`'s own `.hymn-kind` line —
 * "Troparion · Tone 4" in the reader's words — so nothing here repeats it.
 * Only the empty column has to name itself.
 */
export function hymnColumnHTML(kind, hymn, language = currentLanguage()) {
  if (hymn) return hymnMarkup(hymn);
  const H = STRINGS.calendar.hymns;
  const none = language === 'en' ? H.noEnglish : H.noneInYourLanguage;
  return `<p class="td-label">${esc(H[kind] ?? kind)}</p><p class="row-none">${esc(none)}</p>`;
}

/**
 * A stable 0–900 ms from a slug: FNV-1a over the characters, so a repaint of
 * the same day deals every saint the same moment and nothing blinks twice.
 * Ported from the mockup, where it staggers the columns' arrival.
 */
function delayFor(slug) {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i += 1) h = Math.imul(h ^ slug.charCodeAt(i), 0x01000193) >>> 0;
  return h % DUR.linger;
}

/**
 * The picture, or the mark that stands where the corpus has none.
 *
 * **`cardCrop`, not a copy of it** (plan §4). The mockup carries a
 * hand-written `cropOf` that rounds differently from `lib/hero-crop.js`; the
 * difference is a pixel of overflow past a reserved block, which is the exact
 * bug `hero-crop.js` warns about in its own comment. One decision, one
 * function.
 *
 * The source is held back on `data-src` so `revealImages` can let the day's
 * pictures up one at a time — see below.
 */
function mediaHTML(saint) {
  if (!saint.image) {
    return `<span class="row-media is-glyph" aria-hidden="true">${glyphMarkup(typeGlyph(saint.types) ?? 'saint')}</span>`;
  }
  const { aspect, focus } = cardCrop(saint.image);
  return `<span class="row-media" style="--ar:${aspect ?? 1}">
    <img data-src="${esc(BASE + saint.image.src)}" alt="" width="${saint.image.w}" height="${saint.image.h}"
      style="object-position:${esc(focus)}" decoding="async" />
  </span>`;
}

/**
 * One saint: the tile and the card in one article.
 *
 * **The name is a link, and that is a functional requirement rather than a
 * flourish** (plan §11.7a). Requirement 5 makes a click open the card, which
 * took the register row's way through to `/saints/<slug>` with it — and Daily
 * without it is a dead end. So the name carries the anchor from the first
 * paint, inert while the tile is folded (`open.js` opens the tile instead)
 * and live once it is open, which is where a reader who wants the whole life
 * asks for it.
 */
export function tileHTML(saint) {
  const name = saintName(saint);
  const sub = formatSubtext(saint);
  const href = state.router.href(`/saints/${saint.slug}`);
  const link = (cls) =>
    `<a class="${cls}" href="${esc(href)}" data-prefetch="${esc(saint.slug)}">${esc(name)}</a>`;
  /*
   * The word the mark stands for, where the tile does not already print it.
   * `formatSubtext` carries the *office*, which only a third of the corpus
   * has, so on most imageless tiles the glyph would otherwise be the only
   * thing saying what kind of saint this is — and it is `aria-hidden`.
   * Skipped where the subtext says it anyway, so a martyr with an office is
   * not announced as "Martyr · d. 320, Martyr".
   */
  const said = sub.toLowerCase();
  const missing = saint.image
    ? []
    : (saint.types ?? []).map(typeName).filter((word) => !said.includes(word.toLowerCase()));
  const spoken = missing.length ? `<span class="sr-only">${esc(missing.join(', '))}</span>` : '';

  return `<article class="day-tile${saint.image ? '' : ' no-pic'}" data-slug="${esc(saint.slug)}"
    style="--row-delay:${delayFor(saint.slug)}ms">
    ${mediaHTML(saint)}
    <div class="row-head">
      <h2 class="row-name">${link('row-link')}</h2>
      <p class="row-sub">${esc(sub)}${spoken}</p>
    </div>
    <p class="row-line" data-line></p>
    <div class="row-life">
      <p class="td-label">${esc(STRINGS.calendar.fromTheLife)}</p>
      <div class="td-flow">
        <!--
          Shown only on a card with no picture, where the life takes the
          icon's column and the name has to head it — which is where the name
          sits under the picture on every other card, so the eye finds it in
          the same place.
        -->
        <h2 class="row-name-in">${link('row-link')}</h2>
        <p class="row-sub-in">${esc(sub)}</p>
        <div class="td-life" data-life></div>
      </div>
    </div>
    <div class="row-trop" data-hymn="troparion">${hymnColumnHTML('troparion', null)}</div>
    <div class="row-kont" data-hymn="kontakion">${hymnColumnHTML('kontakion', null)}</div>
  </article>`;
}

/** The day's saints, in the day's own order. */
export const tilesHTML = (entries, data) =>
  entries
    .map((entry) => data.bySlug.get(entry.slug))
    .filter(Boolean)
    .map(tileHTML)
    .join('');

/**
 * **A day with no saints says so where the saints would have been** (plan
 * §11.3). The sidebar always has something to print because it computes every
 * line it shows; the grid is the thing that is empty, and the empty thing is
 * what the reader is looking at. The wording is the one `entries.js` already
 * owns — how far the corpus reaches, read off the index rather than written
 * down and left to go stale.
 */
export function emptyGridHTML() {
  const reach = reachInWords();
  const text = reach
    ? fill(STRINGS.calendar.dayWithoutSaints, { reach })
    : STRINGS.calendar.emptyDay;
  return `<p class="day-empty">${esc(text)}</p>`;
}

/**
 * **The day fills in rather than blinking** (plan §11.7e). Sixteen pictures
 * is a day, not a corpus, so they are all asked for at once — and let up one
 * at a time, no faster than one every `DUR.move`, so no more than four or
 * five are ever rising together.
 *
 * Under reduced motion the queue is bypassed entirely: every picture is shown
 * the moment it has decoded, because a reader who has asked for no motion has
 * asked for no staggered arrival either.
 *
 * Returns a teardown, so a day change cannot leave a timer showing pictures
 * into a grid that has been replaced.
 */
export function revealImages(root) {
  const reduced = reducedMotion();
  let waiting = [];
  let timer = null;
  let lastShown = 0;
  let stopped = false;

  const drain = () => {
    timer = null;
    if (stopped) return;
    const img = waiting.shift();
    if (img) {
      img.classList.add('is-loaded');
      lastShown = performance.now();
    }
    if (waiting.length) timer = setTimeout(drain, DUR.move);
  };

  const queue = (img) => {
    if (stopped) return;
    if (reduced) {
      img.classList.add('is-loaded');
      return;
    }
    waiting.push(img);
    if (timer) return;
    timer = setTimeout(drain, Math.max(0, DUR.move - (performance.now() - lastShown)));
  };

  for (const img of root.querySelectorAll('img[data-src]')) {
    img.src = img.getAttribute('data-src');
    img.removeAttribute('data-src');
    if (img.complete && img.naturalWidth) queue(img);
    else img.addEventListener('load', () => queue(img), { once: true });
  }

  return () => {
    stopped = true;
    waiting = [];
    if (timer) clearTimeout(timer);
    timer = null;
  };
}
