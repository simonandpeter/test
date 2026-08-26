import './styles/fonts.css';
import './styles/metrics.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/calendar.css';
import './styles/saint.css';
import './styles/index.css';

import { STRINGS } from './ui/strings.js';
import { initTheme } from './lib/theme.js';
import { createRouter } from './lib/router.js';
import { loadManifest } from './lib/manifest.js';
import { loadDays, readyDays } from './data/days.js';
import { cancelPrefetches } from './lib/detail.js';
import { mountChurchControl } from './ui/church-chooser.js';
import { mountLanguageControl } from './ui/language-chooser.js';
import { mountCoachmarks } from './ui/coachmark.js';
import { currentLanguage, ensurePack, languageTag, subscribeLanguage } from './lib/i18n.js';
import * as calendar from './views/calendar.js';
import * as saints from './views/saints.js';
import * as saint from './views/saint.js';
import * as map from './views/map.js';
import * as about from './views/about.js';

const routes = [
  { path: '/', view: calendar, nav: 'calendar' },
  { path: '/calendar/:date?', view: calendar, nav: 'calendar' },
  { path: '/saints', view: saints, nav: 'saints' },
  { path: '/saints/:slug', view: saint, nav: 'saints' },
  { path: '/map', view: map, nav: 'map' },
  { path: '/about', view: about, nav: 'about' },
];

const viewEl = document.getElementById('view');
const navEl = document.getElementById('site-nav');
let data = null;
let router;
let currentView = null;
let first = true;
// The saint page's × returns to wherever the reader opened it from, when that
// was the calendar; anywhere else it falls back to All Saints. One slot is
// enough — a saint opened from another saint's page still closes to All
// Saints, which was already the fallback.
let lastRoute = null;

/*
 * The Daily button reads **Today** while the reader is on the Daily page and
 * looking at a day that is not today (author, 2026-08-26 evening) — press it
 * and `/` takes them back. Off that page it is Daily again, so the word only
 * ever offers what the page it is on can give.
 *
 * The label is its own span because the word changes under a link whose href,
 * `aria-current` and place in the row do not; swapping the anchor's whole
 * text would rebuild the element the reader may be hovering or tabbed to.
 */
let dailyIsToday = true;
/*
 * The word a fade is on its way to, and its timer.
 *
 * **Both exist because of a bug the author could describe better than the code
 * could** (2026-08-27: "if you press 'Today' and you go back to the current
 * date, the text 'Today' does not change back to 'Daily', you need to press it
 * again"). Pressing the button paints twice in the same tick: the nav is
 * rebuilt for the new route while `dailyIsToday` is still false, which starts a
 * fade to *Today*, and the Daily view's own `gos:day` follows a moment later
 * saying the day is today. The second call read the label's *current* text —
 * still "Daily", because the first fade had not landed — decided there was
 * nothing to do, and returned. Then the first timer fired and wrote "Today"
 * over the top of it, for good.
 *
 * So the comparison is against the word in flight, and a new decision cancels
 * the one it overtakes. The author's rule is the one this now keeps: on the
 * current date it says Daily.
 */
let pendingWord = null;
let fadeTimer = null;

function paintDailyLabel(fade = true) {
  const label = navEl.querySelector('[data-nav-label]');
  if (!label) return;
  const onDaily = navEl.querySelector('a[aria-current="page"][data-nav-daily]') !== null;
  const isToday = onDaily && !dailyIsToday;
  const word = isToday ? STRINGS.nav.today : STRINGS.nav.calendar;
  const settle = () => label.classList.toggle('is-today', isToday);
  if ((pendingWord ?? label.textContent) === word) {
    settle();
    return;
  }
  clearTimeout(fadeTimer);
  // Removed, not shortened (DESIGN.md §6): reduced motion gets the word, not
  // a faster fade to it.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fade || reduced) {
    pendingWord = null;
    label.textContent = word;
    settle();
    return;
  }
  pendingWord = word;
  label.classList.add('is-fading');
  fadeTimer = setTimeout(() => {
    pendingWord = null;
    label.textContent = word;
    settle();
    label.classList.remove('is-fading');
  }, 140);
}

function renderNav(current) {
  // The span the fade was working on is about to be replaced, so nothing is
  // in flight any more.
  clearTimeout(fadeTimer);
  pendingWord = null;
  navEl.innerHTML = ['calendar', 'saints', 'map', 'about']
    .map((key) => {
      const to = key === 'calendar' ? '/' : `/${key}`;
      const cur = key === current ? ' aria-current="page"' : '';
      const mark = key === 'calendar' ? ' data-nav-daily' : '';
      const text =
        key === 'calendar'
          ? `<span class="nav-label" data-nav-label>${STRINGS.nav.calendar}</span>`
          : STRINGS.nav[key];
      return `<a href="${router.href(to)}"${cur}${mark}>${text}</a>`;
    })
    .join('');
  // Leaving the Daily page puts the word back without a fade: the button the
  // reader pressed has already gone somewhere, and a word changing after the
  // page has is a second event where there was one.
  paintDailyLabel(current === 'calendar');
}

/**
 * A fixed span home, however far down the reader was (2026-08-27: "make sure
 * it scrolls back to the top instead of just jumping back with no animation
 * ... a set time animation so if you scroll really far down it doesn't take
 * ages"). Fixed rather than proportional to distance — three thousand pixels
 * eases over the same span as three hundred — which is why this is a
 * hand-rolled tween against `performance.now()` rather than the platform's
 * `scrollTo({ behavior: 'smooth' })`: the CSSOM View spec leaves smooth
 * scroll's duration and curve to the browser, and Chrome's own scales with
 * distance. Reduced motion is still every other scroll in this file —
 * removed, not shortened.
 */
function animateScrollToTop(duration = 300) {
  const from = window.scrollY;
  if (!from || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, 0);
    return;
  }
  const start = performance.now();
  const easeOutCubic = (t) => 1 - (1 - t) ** 3;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, Math.round(from * (1 - easeOutCubic(t))));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/*
 * Pressing the button for the page you are already on takes you to the top of
 * it (author, 2026-08-27). The listener sits on the nav rather than on each
 * anchor, so it survives every re-render, and it runs before the router's own
 * document-level click handler because the nav is inside the document — which
 * is what lets it forget the remembered position first, so the navigation
 * that follows lands at the top rather than putting the reader back where
 * they just asked not to be.
 *
 * The navigation itself is never skipped, same URL or not: the Index's nav
 * link opens fresh, filters and all, even from `/saints` back to `/saints`
 * (Addendum H3, "the nav link still opens the Index fresh, because it does
 * not ask") — a real render the reader's press has to trigger, not a no-op
 * this file could shortcut by comparing pathnames. What changes is only how
 * `swap` lands the scroll once that render has happened: a flag set here and
 * read there, because two things trying to own `window.scrollY` for the same
 * click — this listener animating toward 0 while `swap`'s own reset jumps
 * there first — is exactly the race an earlier version of this fell into, the
 * animation caught mid-flight and yanked back to its own target a frame in.
 */
let animateLanding = false;
navEl.addEventListener('click', (e) => {
  const link = e.target.closest('a[aria-current="page"]');
  if (!link || !navEl.contains(link)) return;
  sectionScroll.delete(lastRoute?.nav);
  animateLanding = link.pathname === location.pathname;
});

// The Daily view says which day it is showing; the button answers.
document.addEventListener('gos:day', (e) => {
  dailyIsToday = e.detail.today;
  paintDailyLabel();
});

/**
 * Where the reader was in each of the four sections (author, 2026-08-27: "when
 * you switch between them ... you come back to the same spot. However, if you
 * click on the page header button a second time, it will scroll you back to
 * the top of that page").
 *
 * Kept by section rather than by path, because that is the unit the header
 * offers: the Daily page is one place to a reader whichever day it is showing.
 * In memory and not in the store — it is where this visit left off, not a
 * preference, and a new tab should open at the top.
 *
 * The saint page is deliberately not a section. It has no nav button, it is
 * opened from a card and closed back to it, and `views/saints.js` has kept its
 * own record for that journey since DESIGN.md §5c; two mechanisms restoring
 * one scroll would fight.
 */
const sectionScroll = new Map();

/**
 * Puts the page back to a remembered position, and keeps trying for a moment.
 *
 * A view is rendered synchronously but is not always its final height
 * synchronously: About fetches its statistics, the Index fills descriptions,
 * and a scroll to 400 on a page that is briefly 814 px tall lands at 14 and
 * stays there. So this scrolls, and then re-scrolls on each frame until the
 * position is *reachable* — at which point one more call lands it — or half a
 * second has passed, which is long enough for a fetch that was already warm
 * and short enough that a reader who starts scrolling is not fought for long.
 */
function restoreScroll(y) {
  if (!y) return;
  let frames = 0;
  const tick = () => {
    window.scrollTo(0, y);
    const reachable = document.documentElement.scrollHeight >= y + window.innerHeight;
    if (!reachable && frames++ < 30) requestAnimationFrame(tick);
  };
  tick();
}

function show({ route, params, path }, nav = {}) {
  const view = route?.view;
  const firstRender = first;
  const cameFrom = lastRoute;
  // Where this reader is *leaving* from, before anything moves.
  if (!firstRender && cameFrom?.nav) sectionScroll.set(cameFrom.nav, window.scrollY);
  lastRoute = { path, nav: route?.nav };
  // Only a change of section restores: within one, the view owns the question
  // — the Index puts a reader back on the card they opened — and every other
  // navigation lands at the top, which is what it has always done.
  const returning =
    !firstRender && !nav.restore && route?.nav && route.nav !== cameFrom?.nav
      ? (sectionScroll.get(route.nav) ?? 0)
      : 0;
  // Every prefetch in flight was a guess about where this reader was going,
  // and the navigation has just answered it (brief §7).
  cancelPrefetches();

  // Read and clear immediately: this navigation is the one the flag was set
  // for, and the next one — whatever triggers it — starts from instant again.
  const landAnimated = animateLanding;
  animateLanding = false;

  const swap = () => {
    // Views that hold listeners or timers get told they are leaving; the rest
    // are pure renderers and do not implement it.
    currentView?.destroy?.();
    currentView = view ?? null;
    renderNav(route?.nav);
    // Every navigation lands at the top of the page it opens, or — a change
    // of section — back where this section was left (`returning`). The first
    // render keeps whatever position the browser gave it. A press of the
    // current page's own nav button eases there instead of jumping.
    if (!firstRender) {
      if (landAnimated) animateScrollToTop();
      else window.scrollTo(0, 0);
    }
    if (!view) {
      document.title = `${STRINGS.notFound.title} - ${STRINGS.site.tabName}`;
      viewEl.innerHTML = `<h1>${STRINGS.notFound.title}</h1><p>${STRINGS.notFound.body}</p>`;
      return;
    }
    // A view whose title depends on what it is showing supplies titleFor; the
    // manifest is already loaded, so it never has to wait for a fetch to name
    // the page.
    const heading = view.titleFor
      ? view.titleFor(params, data)
      : typeof view.title === 'function'
        ? view.title()
        : view.title;
    document.title = `${heading} - ${STRINGS.site.tabName}`;
    view.render(viewEl, { data, params, router, nav, cameFrom });
    // A returning section is put back where it was *before* the transition's
    // new-state snapshot is taken (the Index's own restore — the saint page's
    // × or a browser back — happens separately, from its own record, DESIGN.md
    // §5c). The view has just rendered synchronously, so its height already
    // exists for everything but async-filled content, which the retry loop
    // after `finished` corrects. Doing it here means the fade crosses into the
    // page already at the right spot instead of at the top with a jump after.
    if (!firstRender && returning) window.scrollTo(0, returning);
    // Keyboard and screen-reader focus follows the page change — but not
    // into the first page of the visit. There is no page change to announce
    // yet, focus is already at the top of the document, and Chrome treats a
    // programmatic focus with no interaction behind it as keyboard-driven, so
    // the reader would meet the heading wearing a focus ring they did not ask
    // for and cannot dismiss without clicking away.
    if (firstRender) return;
    const h1 = viewEl.querySelector('h1');
    if (!h1) return;
    h1.setAttribute('tabindex', '-1');
    h1.focus({ preventScroll: true });
  };

  // Cross-fade where the platform provides it; instant elsewhere. Reduced
  // motion gets no transition at all, not a shorter one.
  //
  // The first render is never a transition: there is no previous page to
  // cross-fade from, and startViewTransition defers its callback to the next
  // rendering opportunity — which a browser is free not to offer for a long
  // time to a page it is not painting, a background tab most of all. Gating
  // the app's first paint on that is a blank page waiting to happen; it was
  // reproducibly a second long in a headless browser.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /*
   * `swap` already put a returning section back where it was, so the fade
   * itself crosses into the right spot. This second call, after the
   * transition settles, is only for a view that was not yet its final height
   * inside `swap` — About's fetched statistics, the Index's filled-in
   * descriptions — where the first attempt landed short and this corrects it
   * once the content has grown. In the common case it lands on the same y a
   * second time and does nothing.
   */
  if (document.startViewTransition && !reduced && !first) {
    document.startViewTransition(swap).finished.finally(() => restoreScroll(returning));
  } else {
    swap();
    restoreScroll(returning);
  }
  first = false;
}

/**
 * The site's name, wherever it is printed (author, 2026-08-25: "change the
 * title on header and loading screen to the picked language"). Both were
 * hard-coded in index.html — and stale there, still saying The Orthodox Saint
 * a rename later — so they carry a data-site-name hook and the pack fills it.
 */
function paintSiteName() {
  for (const el of document.querySelectorAll('[data-site-name]')) {
    el.textContent = STRINGS.site.name;
  }
  // And the masthead's own href, once, with the base path on it.
  const home = document.querySelector('[data-site-home]');
  if (home) home.setAttribute('href', router.href('/'));
}

async function boot() {
  initTheme(document.getElementById('theme-toggle'));
  // The stored language is applied before anything renders (Amendment 36):
  // currentLanguage() merges the locale over STRINGS on first read, and the
  // document says what language it now speaks.
  currentLanguage();
  document.documentElement.lang = languageTag();
  // The site-wide church control (author, 2026-08-22): one choice, read by
  // every view through lib/church.js. It names itself.
  mountChurchControl(document.getElementById('church-open'), document.getElementById('church-panel'));
  mountLanguageControl(document.getElementById('lang-open'), document.getElementById('lang-panel'));
  router = createRouter(routes, show);

  // A language change re-renders everything that carries words: the open view
  // and the nav through refresh() — every render reads STRINGS afresh — the
  // title through show()'s own path, and the church control through its own
  // language subscription in church-chooser.js.
  subscribeLanguage(() => {
    /*
     * Guarded on the manifest since 2026-08-27, when the locale packs became
     * per-language chunks: the reader's pack is 20 kB against the manifest's
     * 490 kB, so it lands *first*, and `ensurePack` notifies on arrival — which
     * asked the router to repaint a view whose data was still null. The site
     * name is painted either way, because that is the half the veil shows.
     */
    if (data) router.refresh();
    paintSiteName();
  });
  paintSiteName();

  const veil = document.getElementById('veil');
  // The veil is up before this runs, so its English stands for the moment the
  // modules take to parse and is replaced here — a language chosen on a
  // previous visit paints before the manifest arrives, which is the long wait.
  paintSiteName();
  /*
   * The day records are 293 kB and were in the entry chunk until 2026-08-27.
   * The fetch is started here rather than awaited here, so it runs *beside*
   * the manifest's 490 kB rather than after it, and the two land inside one
   * wait the reader was making anyway. See src/data/days.js for why it is not
   * deferred any further than this.
   */
  loadDays();
  /*
   * And the reader's own locale pack, for the same reason and in the same
   * wait: it is 20-30 kB of one language rather than 106 kB of four, and
   * having it before the first paint is what keeps a page from appearing in
   * English and then changing.
   */
  const pack = ensurePack(currentLanguage());
  try {
    data = (await Promise.all([loadManifest(), readyDays(), pack]))[0];
  } catch (e) {
    console.error(e);
    veil.innerHTML = `
      <div class="error-note">
        <p>${STRINGS.loading.manifestFailed}</p>
        <button id="retry">${STRINGS.loading.retry}</button>
      </div>`;
    document.getElementById('retry').addEventListener('click', () => location.reload());
    return;
  }

  router.start();
  // After the first view is on the page, so the marks are placed against a
  // header that has finished settling — the calendar control's own name is
  // painted by mountChurchControl above, and a mark placed against a button
  // still reading its default width would point a few pixels off.
  mountCoachmarks();
  veil.classList.add('done');
  // Gone entirely once faded, so it can never intercept a tap.
  setTimeout(() => veil.remove(), 300);
}

boot();
