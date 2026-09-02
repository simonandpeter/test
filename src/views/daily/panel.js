import { recordedDay } from '../../data/days.js';
import { formatSubtext, pickHero, todayIso } from '../../lib/calendar-page.js';
import { churchName, entriesInChurch } from '../../lib/church.js';
import { loadDetail } from '../../lib/detail.js';
import { heroCrop } from '../../lib/hero-crop.js';
import { saintName } from '../../lib/honorific.js';
import { currentLanguage, languageTag } from '../../lib/i18n.js';
import { greatFeast } from '../../lib/liturgy.js';
import { escapeHtml as esc, firstParagraphText } from '../../lib/markdown.js';
import { nameDays } from '../../lib/name-days.js';
import { STRINGS, fill } from '../../ui/strings.js';
import { allEntriesFor, entriesFor, reachInWords } from './entries.js';
import { fillSaintHymns, hymnsMarkup, readingsMarkup } from './record.js';
import { state } from './state.js';

/* The site's base path, declared per file as every other view does: it is a
   build-time constant, not shared state. */
const BASE = import.meta.env.BASE_URL;

/**
 * The day panel: the hero, the register beneath it, and the three silences.
 *
 * This is the half of the Daily page that answers "what is today", as against
 * the half that answers "which day" — the roll, the rail and the month, which
 * stay in views/calendar.js and which nothing here calls. The panel is
 * repainted whole on every change of day; `select()` in calendar.js is the one
 * funnel that does it.
 */

/**
 * The hero's life, opened (author, 2026-08-25). The same first paragraph the
 * Index's Detailed rows show, from the same fetched payload and the same
 * helper, so the two never disagree about where a life begins. Wide screens
 * only — the CSS hides the box below 760 px, where the hero has no spare
 * column and the life is a scroll away under the register anyway.
 */
function fillHeroLede(panel, slug, iso, card) {
  loadDetail(slug).then(
    (payload) => {
      if (!state || state.selected !== iso) return;
      fillHeroPlaces(panel, payload);
      const box = panel.querySelector('[data-hero-lede]');
      if (!box) return;
      const text = firstParagraphText(payload?.life);
      if (!text) return;
      box.textContent = text;
      box.hidden = false;

      /*
       * **The way in is the last words of the paragraph** (author,
       * 2026-09-01: "make the '...continue reading' part of the actual
       * preview paragraph"), where it was a block of its own beneath it.
       * Appended here rather than written into the markup because it has to
       * come *after* the text, and the text arrives with the payload.
       */
      const link = document.createElement('a');
      link.className = 'hero-more';
      link.href = state.router.href(`/saints/${slug}`);
      link.dataset.prefetch = slug;
      link.setAttribute('aria-label', fill(STRINGS.calendar.continueReadingOf, { name: saintName(card) }));
      link.textContent = STRINGS.calendar.continueReading;
      const chevron = document.createElement('span');
      chevron.className = 'hero-more-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '›';
      link.append(chevron);
      box.append(' ', link);

      /*
       * **And two lines of the life going on under it** (author, 2026-09-01:
       * "gradient fade the last two lines of preview text below it").
       *
       * The preview used to stop dead at the button, which says the paragraph
       * was cut and does not show it. Two more lines running under the button
       * and fading out say the same thing by demonstration — the life carries
       * on, and this is where you stop being able to read it.
       *
       * `aria-hidden`, because these words cannot be finished: a screen reader
       * given half a sentence with no way to reach the rest is worse served
       * than one given the button, which is right beside it and says whose life
       * it opens. The tail is a picture of text rather than text.
       *
       * A generous slice rather than a measured one: the box is two lines tall
       * with its overflow hidden, so what it needs is *enough* words, and forty
       * is enough at any column width the card reaches.
       */
      const tail = document.createElement('span');
      tail.className = 'hero-lede-tail';
      tail.setAttribute('aria-hidden', 'true');
      box.append(tail);
      box.__tail = tail;

      // Kept whole so a resize can re-fit from the original rather than from
      // whatever the last fit left behind.
      box.__full = text;
      fitLede(panel);
    },
    () => {},
  );
}

/** How many words are handed to the faded tail. Two lines' worth at any
 *  column the card reaches, with room to spare — the box's own height is what
 *  decides where they stop. */
const TAIL_WORDS = 40;

/**
 * Trims the preview until the card's text column ends above the bottom of the
 * picture beside it (author, 2026-09-01: "make sure the text on the main saint
 * card does not go below the bottom of the image").
 *
 * **Trimmed rather than clamped**, and the link is why. `-webkit-line-clamp`
 * cuts the box and adds its own ellipsis, which would fall *after* the words
 * and take the link with it — the one thing that must survive the cut is the
 * thing the cut removes. So the text is shortened on a word boundary until
 * what is left, link and all, fits the budget, and the ellipsis is the link's
 * own leading character.
 *
 * **And the budget now has to hold the faded tail as well** (2026-09-01
 * evening). The tail is two lines with its overflow hidden, so it is a fixed
 * cost the search measures along with everything else — which is the whole
 * reason it is a fixed height rather than a word count: a tail whose height
 * depended on how many words fell into it would move under the search that was
 * trying to fit it.
 *
 * A binary search over the word count, because each try costs a layout: nine
 * measurements for a three-hundred-word paragraph rather than three hundred.
 */
function fitLede(panel) {
  const hero = panel.querySelector('.hero');
  const box = panel.querySelector('[data-hero-lede]');
  const media = panel.querySelector('.hero-media');
  const body = panel.querySelector('.hero-body');
  if (!hero || !box || !media || !body || !box.__full) return;

  const limit = media.getBoundingClientRect().height;
  // No picture laid out yet, or a width where the preview is not shown at
  // all: there is no budget to fit and nothing to trim against.
  if (limit <= 0 || box.offsetParent === null) return;

  const words = box.__full.split(' ');
  const tail = box.__tail;
  const write = (n) => {
    box.firstChild.nodeValue = words.slice(0, n).join(' ');
    // What the life says next, faded out. Empty where the paragraph ends with
    // the head — there is nothing going on under the button to show.
    if (tail) tail.textContent = words.slice(n, n + TAIL_WORDS).join(' ');
  };
  write(words.length);
  if (body.scrollHeight <= limit) return;

  let lo = 0;
  let hi = words.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    write(mid);
    if (body.scrollHeight <= limit) lo = mid;
    else hi = mid - 1;
  }
  write(lo);
}

/**
 * Where the saint was born and where they died, under the office and the
 * years. The manifest carries a location's coordinates without its name, so
 * the words come from the saint's own payload — which is already being
 * fetched for the life above.
 */
function fillHeroPlaces(panel, payload) {
  const box = panel.querySelector('[data-hero-places]');
  if (!box) return;
  const P = STRINGS.calendar.heroPlaces;
  const named = (kind) => {
    const at = (payload?.saint?.locations ?? []).find((l) => l.kind === kind);
    return at?.historical_name || at?.modern_name || null;
  };
  const parts = [
    ['birth', named('birth')],
    ['death', named('death')],
  ]
    .filter(([, name]) => name)
    .map(([kind, name]) => fill(P[kind], { place: name }));
  if (!parts.length) return;
  box.textContent = parts.join(' · ');
  box.hidden = false;
}

/**
 * One saint under *Also commemorated*.
 *
 * **This row is the register's own, not the Index's** (author, 2026-08-27:
 * "for saints under 'Also Commemorated' on the Daily page, don't do it in the
 * exact same row style anymore, pack them more tightly"). It wore
 * `.index-card.is-row` from Amendment 38, which was a good borrowing while the
 * two wanted the same thing and stopped being one the moment they did not: the
 * Index's rows grew a second line of name and a taller box the same afternoon,
 * and this list wants the opposite of that. Sharing a class would have made
 * every future change to either a decision about both.
 *
 * No bookmark, by the same instruction that took it off the rows and the hero.
 * The thumbnail is smaller and trails the name, which is where the Index's own
 * picture went on 2026-08-27 and for the same reason: the names start at one
 * left edge, and a saint with no icon does not push the column about.
 */
/**
 * The register's saints, tallest picture first (author, 2026-09-02: "On
 * desktop daily page, reorder the daily saints cards in order from tallest
 * saint image to shortest to no saint image").
 *
 * **Tallest is the smallest `aspect`**, which is width over height: a card's
 * column is a fixed width, so what a picture is *drawn* at is that width times
 * its own height over its width. Sorting on the ratio rather than on `h` is
 * what makes "tallest" mean tallest on the page rather than tallest in the
 * file — a 2000 px-tall panorama is a short card.
 *
 * **The DOM is what carries it, because the desktop layout is multi-column**
 * (`columns: 190px`, calendar.css): CSS `order` moves nothing in a block
 * container, so the rows have to arrive in the order they should read. That
 * makes this a change to both widths unless something puts the phone back —
 * so each row carries `--reg-seq`, its place in the calendar's own order, and
 * below 1024 px the flex column reads it and restores exactly that. The
 * instruction is scoped to the desktop and this keeps it there.
 *
 * The sort is stable in Node and in every browser this ships to, so saints who
 * share a ratio — and all the imageless ones, who share `Infinity` — keep the
 * calendar's own order among themselves.
 */
function registerOrder(entries, data) {
  const drawnRatio = (entry) => {
    const image = data.bySlug.get(entry.slug)?.image;
    if (!image) return Infinity;
    // `aspect` is width over height, so the tallest picture is the smallest
    // number and an imageless saint sorts past every picture there is.
    return image.aspect || 1;
  };
  return entries
    .map((entry, seq) => ({ entry, seq }))
    .sort((a, b) => drawnRatio(a.entry) - drawnRatio(b.entry));
}

function registerRow(saint, title, transition, seq = 0) {
  const image = saint.image
    ? `<span class="reg-thumb" style="background-image:url('${BASE + saint.image.lqip}')">
        <img src="${BASE + saint.image.src}" alt="" width="${saint.image.w}" height="${saint.image.h}"
          loading="lazy" decoding="async" />
      </span>`
    : '<span class="reg-thumb is-blank" aria-hidden="true"></span>';
  /*
   * `--reg-seq` is where this saint stood in the calendar's own order, which
   * is what the phone puts back — see `registerOrder` below and the
   * `max-width: 1023.98px` rule in calendar.css.
   */
  return `<li class="reg-card" style="--reg-seq:${seq}">
    <span class="reg-body">
      <a class="reg-name" href="${state.router.href(`/saints/${saint.slug}`)}"
        data-prefetch="${saint.slug}"${transition}>${esc(saintName(saint))}</a>
      ${/* No day in any of the four calendars currently puts a *titled*
             saint in the register: all 20 titled attestations in the corpus
             belong to saints who are their own day's hero, so this branch has
             no reachable trigger today and carries no browser test — said
             plainly rather than left looking covered. It is kept because
             titles are data and the corpus grows; the register is where a
             church's own title for the day belongs when one arrives. */ ''}
      ${title ? `<span class="reg-title">${esc(title)}</span>` : ''}
      <span class="reg-sub utility">${esc(formatSubtext(saint))}</span>
    </span>
    ${image}
  </li>`;
}

/**
 * Three silences, and a reader is owed the difference between them (redrawn
 * 2026-08-22 for one church at a time; a third added at Amendment 44). The
 * corpus having nothing for a day is a statement about our sourcing; this
 * church's calendar having nothing while another of the three does is a fact
 * about the choice made above, and says where the others are.
 *
 * The third is new because the day records now run months past the saints. A
 * day can carry its readings, its fast and a dozen hymns and still have no
 * folder for any saint of it — and the old wording called that "an empty day"
 * directly above the day's own readings, which told the reader the opposite of
 * what the page was showing. Prose in ink in every case, never a banner.
 */
function emptyDayNote(iso) {
  const S = STRINGS.calendar.silence;
  const all = allEntriesFor(iso, state.data);
  const here = new Set(entriesInChurch(all, state.calendar).map((e) => e.slug));
  const elsewhere = new Set(all.map((e) => e.slug).filter((slug) => !here.has(slug))).size;
  const church = churchName(state.calendar);

  /*
   * **A fourth, and it is the one that was wrong rather than missing.** The
   * page's subject is a saint folder, so a day whose subject is a *feast* had
   * no subject and fell straight to the silence: 28 August 2026 in the Russian
   * calendar printed the Dormition's gold chip, the fast it earns, the feast's
   * readings and the feast's troparion, with "Nothing in the Russian calendar
   * today" sitting in the middle of them. The day was never empty; the corpus
   * has no folder for any saint of it, which is a different sentence.
   *
   * The feast is read in the church's own calendar, exactly as the chip above
   * reads it, so the Russian keeps the Dormition on the civil 28 August and
   * the other three on the 15th - and the note follows the chip rather than
   * guessing at the civil date.
   */
  const feast = greatFeast(iso, state.calendar);
  // The day's own calendar, which is recorded further ahead than its saints
  // are folders and stops a good deal short of the feasts, which are computed.
  const recorded = Boolean(recordedDay(iso, state.calendar)?.readings?.length);
  const lead = feast
    ? [
        fill(S.feast, { church, feast: STRINGS.calendar.feasts?.names?.[feast] ?? feast }),
        recorded ? S.feastRecords : '',
        S.feastNoSaints,
      ]
        .filter(Boolean)
        .join(' ')
    : elsewhere > 0
      ? fill(S.none, { church })
      : recorded
        ? fill(STRINGS.calendar.dayWithoutSaints, { reach: reachInWords() })
        : STRINGS.calendar.emptyDay;

  if (elsewhere === 0) return lead;
  const pointer = elsewhere === 1 ? S.elsewhereOne : fill(S.elsewhereMany, { count: elsewhere });
  return `${lead} ${pointer}`;
}

/* How tall the hero's icon may stand, how wide, and where it is cropped from
   when it exceeds either — all three are `lib/hero-crop.js`. They moved out of
   this file on 2026-09-01 evening when the author added the second limit: it is
   arithmetic with two of their own constants in it and one branch the corpus
   cannot reach today, and all three of those wanted a unit test a module that
   imports the DOM cannot have. */

export { fitLede };

export function paintDay({ main, side }) {
  const { data, selected } = state;
  const entries = entriesFor(selected, data);

  if (entries.length === 0) {
    main.innerHTML = `<div class="empty-day"><p>${emptyDayNote(selected)}</p></div>`;
    side.innerHTML = `${readingsMarkup(selected, state.calendar)}${hymnsMarkup(selected, state.calendar)}`;
    return;
  }

  const heroSlug = pickHero(selected, entries, data.bySlug, state.calendar);
  const hero = data.bySlug.get(heroSlug);

  // The image opens the saint too (author, 2026-08-21). Hidden from the
  // accessibility tree and out of the tab order on purpose: the name beside it
  // already links to the same page, and a second link with no text of its own
  // would be either an unnamed link or the same one announced twice.
  /*
   * **The icon is shown whole unless it is taller than 1:1.6** (author,
   * 2026-09-01: "don't crop the main saint image on Daily page unless it
   * exceeds an aspect ratio of 1:1.6, that's the maximum height. And cap the
   * height to double the height of the current square crop").
   *
   * The ratio is computed here rather than declared in CSS because the
   * manifest already knows the icon's own dimensions — the `width`/`height`
   * attributes below are the same two numbers — and that is what lets the box
   * reserve the *right* height before the image decodes. A CSS rule cannot
   * know one saint's icon from another's, so it could only reserve one shape
   * for all of them, which is exactly the crop being removed.
   *
   * **The second cap never binds, and saying so is cheaper than writing it
   * twice.** The square crop's height is its own width, so twice it is 2w;
   * the ratio cap is 1.6w; and 1.6w is always the smaller. Written as
   * `min(h, 1.6w, 2w)` the third term could never be reached, so the height
   * cap the author asked for is honoured by the tighter rule standing in
   * front of it rather than by a line of code that does nothing.
   */
  /*
   * The height the box is drawn at: the icon's own, held between the two limits
   * the author set. Whichever limit bites, `object-fit: cover` crops to it and
   * `--hero-focus` says from where.
   */
  const crop = heroCrop(hero.image);
  const drawnH = crop.height;
  const shape = hero.image ? `${hero.image.w} / ${drawnH}` : '';
  /*
   * The same shape as a plain number, for the *column*: the picture is given
   * whichever is smaller of its share of the card and the width at which it
   * stands exactly as tall as the card (`--card-h / --hero-r` in the
   * stylesheet). Without it, widening the column for landscape icons — which
   * is what the author asked for — made portrait ones enormous: Lupus at
   * 1:1.6 in a 414 px column is 662 px of icon over a 505 px card.
   */
  const ratio = hero.image ? (drawnH / hero.image.w).toFixed(4) : '1';
  const media = hero.image
    ? `<div class="hero-figure">
        <a class="hero-media" href="${state.router.href(`/saints/${hero.slug}`)}"
          data-prefetch="${hero.slug}" aria-hidden="true" tabindex="-1"
          style="background-image:url('${BASE + hero.image.lqip}'); --hero-shape:${shape}; --hero-focus:${crop.focus}">
          <img src="${BASE + hero.image.src}" alt="" width="${hero.image.w}" height="${hero.image.h}"
            style="view-transition-name:s-${hero.slug}-image" loading="eager" decoding="async" />
        </a>
      </div>`
    : '';

  // One calendar, one church: the register needs no church heading, and a
  // saint can appear in it only once. The shared element is the first row
  // that names them all the same, because the hero already carries its own.
  const registerEntries = entries.filter((e) => e.slug !== heroSlug);
  const named = new Set([heroSlug]);
  const rows = registerOrder(registerEntries, data)
    .map(({ entry: e, seq }) => {
      const saint = data.bySlug.get(e.slug);
      const title = titleFor(saint, e.church);
      const transition = named.has(saint.slug) ? '' : ` style="view-transition-name:s-${saint.slug}-name"`;
      named.add(saint.slug);
      return registerRow(saint, title, transition, seq);
    })
    .join('');
  /*
   * **Two presentations of one list** (author, 2026-09-01: "Make the Also
   * Commemorated saint cards on desktop behave the same as the cards view on
   * All Saints page on desktop, separated in columns depending on window size.
   * Have an option near the 'Also Commemorated' subheading to display them as a
   * List or as Cards (Cards by default), site remembers what you left it as").
   *
   * **The markup does not change between them, only a class.** A register entry
   * has always been a name, a subtitle and a thumbnail in that document order,
   * which is a row when it is laid out in a line and a card when it is laid out
   * in a column with the picture pulled to the top — so the toggle is a class
   * on the list and nothing is re-rendered to change face. That matters more
   * here than it would elsewhere: the panel is rebuilt on every day change, so
   * a mode that needed its own markup would have to be threaded through the
   * paint, and a listener inside the panel would die with it every time the
   * reader stepped a day. The listener is on the view (views/calendar.js) and
   * the state is a class.
   */
  const view = state.registerView === 'list' ? 'list' : 'cards';
  const control = `<div class="register-view" role="group" aria-label="${STRINGS.calendar.registerView}">
      ${['cards', 'list']
        .map(
          (mode) =>
            `<button type="button" data-reg-view="${mode}" aria-pressed="${view === mode}">${
              mode === 'cards' ? STRINGS.calendar.viewCards : STRINGS.calendar.viewList
            }</button>`,
        )
        .join('')}
    </div>`;
  const register = registerEntries.length
    ? `<div class="register-head">
         <h2 class="register-heading">${STRINGS.calendar.alsoToday}</h2>
         ${control}
       </div>
       <ul class="register register-cards is-${view}" data-register>${rows}</ul>`
    : '';

  /*
   * **Two boxes, because on a wide screen the day is two columns** (author,
   * 2026-09-01: "we will have 2 columns, a wide column to the left and a
   * narrower column to the right"). The day's own saints go left — the hero,
   * the register, and the name days below them — and what the church printed
   * for the day goes right.
   *
   * **The left column has to be one box, and that is what moves the name
   * days.** They were the panel's last child, after the hymns, and the first
   * attempt kept them there and placed them in column 1 by hand. It does not
   * work: a grid item spanning two rows gives its height to the rows it
   * spans, so a long day of hymns inflated the second row and drove the name
   * days to the foot of the page, hundreds of pixels below the register they
   * belong to. Only one item per column flows independently of the other
   * column's length.
   *
   * They are also where the instruction puts them — "the main saint of the
   * day, with the also commemorated and name days" — and where `nameDaysMarkup`
   * has always argued they belong: under the day's saints, being a second
   * reading of that same list. The cost is on the phone, where both boxes are
   * `display: contents` and document order is the layout: the name days now
   * follow the register instead of the hymns.
   */
  main.innerHTML = `
    <article class="hero ${hero.image ? 'has-media' : ''}" style="--hero-r:${ratio}">
      ${media}
      <div class="hero-body">
        <h2 class="hero-name" style="view-transition-name:s-${hero.slug}-name">
          <a href="${state.router.href(`/saints/${hero.slug}`)}" data-prefetch="${hero.slug}">${esc(saintName(hero))}</a>
        </h2>
        <p class="hero-dates utility">${esc(formatSubtext(hero))}</p>
        <!--
          Where they were born and where they died, under the office and the
          years (author, 2026-09-01: "add office and locations of birth and
          death under the name on the main saint card"). The office is already
          in the line above — formatSubtext has carried it since it became a
          field — so what is new here is the two places.

          Filled late, like the lede, and for the same reason: the manifest
          carries a location's coordinates and not its name (build-manifest.mjs
          keeps the names in the folder), so the words come with the saint's
          own payload. Empty until then and empty for good where the corpus has
          no place, because a line that says "Born:" and nothing else is the
          furniture DESIGN.md 5b refuses.
        -->
        <p class="hero-places utility" data-hero-places hidden></p>
        <!-- The opening of the life, on a wide screen only (author,
             2026-08-25: "because there is space on the left of the saint card
             under their name"). It arrives with the fetched life rather than
             from the manifest, so the box is here from the first paint and
             fills a moment later; empty until then, and empty for good where
             a saint has no life recorded, because a heading over nothing is
             the furniture DESIGN.md 5b refuses.

             The way into the life is now the last words *of this paragraph*
             (author, 2026-09-01: "make the '...continue reading' part of the
             actual preview paragraph"), written into it by fillHeroLede once
             the text is there and trimmed to fit — see fitLede below. -->
        <p class="hero-lede" data-hero-lede hidden></p>
        <!--
          The same way in, for the width where the preview is not shown.
          Below 760 px the lede is not displayed and the link inside it goes
          with it, and the author asked for the link on the phone as well as
          the desktop (2026-09-01, the round before the one that moved it into
          the paragraph). Exactly one of the two is ever laid out: this is
          hidden from 760 px up, where the paragraph appears.
        -->
        <a class="hero-more hero-more-alone" href="${state.router.href(`/saints/${hero.slug}`)}"
          data-prefetch="${hero.slug}"
          aria-label="${esc(fill(STRINGS.calendar.continueReadingOf, { name: saintName(hero) }))}"
          >${esc(STRINGS.calendar.continueReading)}<span class="hero-more-chevron" aria-hidden="true">&rsaquo;</span></a>
      </div>
    </article>
    ${register}`;

  side.innerHTML = `
    ${readingsMarkup(selected, state.calendar)}
    ${hymnsMarkup(selected, state.calendar)}
    ${nameDaysMarkup(entries, data)}`;

  fillSaintHymns(side, hero.slug, selected);
  fillHeroLede(main, hero.slug, selected, hero);
}

const titleFor = (saint, churchId) =>
  saint.attestations.find((a) => a.church === churchId)?.titles?.join(', ') ?? '';

/**
 * Whose name day it is (author, 2026-08-26: "add name days"). Under the day's
 * saints, because it is a second reading of the same list and not a new claim
 * about the day: every name here is the first word of a commemoration already
 * printed above it. lib/name-days.js argues the reduction and the three things
 * it refuses to do.
 *
 * A name links to its saint only where exactly one of the day's saints bears
 * it; where two or more do, the name stands as text, because a link would be
 * the site choosing between them. On 20 September that is five of the day's
 * twenty-one — two Eugenes, two Macariuses, a John who is also a John — and
 * they read exactly as the linked ones do, which is the point.
 */
function nameDaysMarkup(entries, data) {
  const cards = entries.map((e) => data.bySlug.get(e.slug)).filter(Boolean);
  const names = nameDays(cards, { lang: currentLanguage(), locale: languageTag() });
  if (!names.length) return '';
  const items = names
    .map(({ name, slug }) =>
      slug
        ? `<li><a class="name-day" href="${state.router.href(`/saints/${slug}`)}" data-prefetch="${esc(slug)}">${esc(name)}</a></li>`
        : `<li><span class="name-day">${esc(name)}</span></li>`,
    )
    .join('');
  /*
   * "Today's name days" only on the day that is actually today (author,
   * 2026-08-26). The Daily page is a day browser — the rail reaches 121 days
   * either side — so the word would be false on every day but one, and the
   * rest of this panel is careful to say "this day" rather than "today" for
   * exactly that reason. The heading the author asked for stands where it is
   * true and the plain one stands everywhere else.
   */
  const N = STRINGS.calendar.nameDays;
  const heading = state.selected === todayIso() ? N.headingToday : N.heading;
  return `<section class="day-namedays" data-namedays>
    <h2 class="register-heading">${esc(heading)}</h2>
    <ul class="namedays">${items}</ul>
  </section>`;
}
