import { recordedDay } from '../../data/days.js';
import { formatSubtext, pickHero, todayIso } from '../../lib/calendar-page.js';
import { churchName, entriesInChurch } from '../../lib/church.js';
import { loadDetail } from '../../lib/detail.js';
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
function fillHeroLede(panel, slug, iso) {
  loadDetail(slug).then(
    (payload) => {
      if (!state || state.selected !== iso) return;
      const box = panel.querySelector('[data-hero-lede]');
      if (!box) return;
      const text = firstParagraphText(payload?.life);
      if (!text) return;
      box.textContent = text;
      box.hidden = false;
    },
    () => {},
  );
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
function registerRow(saint, title, transition) {
  const image = saint.image
    ? `<span class="reg-thumb" style="background-image:url('${BASE + saint.image.lqip}')">
        <img src="${BASE + saint.image.src}" alt="" width="${saint.image.w}" height="${saint.image.h}"
          loading="lazy" decoding="async" />
      </span>`
    : '<span class="reg-thumb is-blank" aria-hidden="true"></span>';
  return `<li class="reg-card">
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

/**
 * The tallest the hero's icon may stand, as a multiple of its own width
 * (author, 2026-09-01). Past this it is cropped from the bottom, as it always
 * was; up to it the icon is shown whole.
 */
const MAX_HERO_RATIO = 1.6;

export function paintDay(panel) {
  const { data, selected } = state;
  const entries = entriesFor(selected, data);

  if (entries.length === 0) {
    panel.innerHTML =
      `<div class="day-main"><div class="empty-day"><p>${emptyDayNote(selected)}</p></div></div>` +
      `<div class="day-side">${readingsMarkup(selected, state.calendar)}${hymnsMarkup(selected, state.calendar)}</div>`;
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
  const shape = hero.image
    ? `${hero.image.w} / ${Math.min(hero.image.h, hero.image.w * MAX_HERO_RATIO)}`
    : '';
  const media = hero.image
    ? `<div class="hero-figure">
        <a class="hero-media" href="${state.router.href(`/saints/${hero.slug}`)}"
          data-prefetch="${hero.slug}" aria-hidden="true" tabindex="-1"
          style="background-image:url('${BASE + hero.image.lqip}'); --hero-shape:${shape}">
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
  const rows = registerEntries
    .map((e) => {
      const saint = data.bySlug.get(e.slug);
      const title = titleFor(saint, e.church);
      const transition = named.has(saint.slug) ? '' : ` style="view-transition-name:s-${saint.slug}-name"`;
      named.add(saint.slug);
      return registerRow(saint, title, transition);
    })
    .join('');
  const register = registerEntries.length
    ? `<h2 class="register-heading">${STRINGS.calendar.alsoToday}</h2>
       <ul class="register register-cards">${rows}</ul>`
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
  panel.innerHTML = `
    <div class="day-main">
      <article class="hero ${hero.image ? 'has-media' : ''}">
        ${media}
        <div class="hero-body">
          <h2 class="hero-name" style="view-transition-name:s-${hero.slug}-name">
            <a href="${state.router.href(`/saints/${hero.slug}`)}" data-prefetch="${hero.slug}">${esc(saintName(hero))}</a>
          </h2>
          <p class="hero-dates utility">${esc(formatSubtext(hero))}</p>
          <!-- The opening of the life, on a wide screen only (author,
               2026-08-25: "because there is space on the left of the saint card
               under their name"). It arrives with the fetched life rather than
               from the manifest, so the box is here from the first paint and
               fills a moment later; empty until then, and empty for good where
               a saint has no life recorded, because a heading over nothing is
               the furniture DESIGN.md §5b refuses. -->
          <p class="hero-lede" data-hero-lede hidden></p>
        </div>
      </article>
      ${register}
      ${nameDaysMarkup(entries, data)}
    </div>
    <div class="day-side">
      ${readingsMarkup(selected, state.calendar)}
      ${hymnsMarkup(selected, state.calendar)}
    </div>`;
  fillSaintHymns(panel, hero.slug, selected);
  fillHeroLede(panel, hero.slug, selected);
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
