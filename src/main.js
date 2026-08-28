import './styles/fonts.css';
import './styles/metrics.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/calendar.css';
import './styles/saint.css';
import './styles/index.css';

import { BRAND, STRINGS } from './ui/strings.js';
import { WORDMARK } from './ui/wordmark.js';
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
/**
 * The running ease, so a navigation can call it off.
 *
 * **A tween outlives the press that started it**, and the last frames of this
 * one write 0 — so a reader who presses the current section and then another
 * one within the same third of a second had the second page's remembered
 * position overwritten by the tail of the first page's scroll home. Found by
 * the section test, which is the third time this codebase has been bitten by
 * two things owning `window.scrollY` at once (Amendment 9's rule, again).
 */
let scrollTween = null;

function stopScrollTween() {
  if (scrollTween) cancelAnimationFrame(scrollTween);
  scrollTween = null;
}

function animateScrollToTop(duration = 300) {
  stopScrollTween();
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
    scrollTween = t < 1 ? requestAnimationFrame(tick) : null;
  };
  scrollTween = requestAnimationFrame(tick);
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
 * Puts a section back where it was left, waiting — briefly — for the view to
 * be tall enough to hold the position.
 *
 * A view renders synchronously but is not its final height synchronously. The
 * Daily page is the worst of them: `fillSaintHymns` waits on the hero saint's
 * detail record and then adds the hymns, which is 508 px on an ordinary day —
 * so a scroll applied the moment the markup lands clamps against a page a
 * third shorter than the one the reader is about to see, and the correction
 * arrives after the fade has finished. That is the jump.
 *
 * **This is awaited from inside the transition callback, which is the whole
 * mechanism.** `startViewTransition` does not snapshot the new state until the
 * promise its callback returns has settled, so waiting here means the fade is
 * captured with the page already at the right place — no second pass, and
 * nothing to correct afterwards.
 *
 * *An earlier version propped a `min-height` floor under the view instead, so
 * the scroll could not clamp. It worked on a desk and was the wrong tool: a
 * floor changes the document's height, and it measured the natural height by
 * clearing and re-setting the property on every frame. On a phone, repeated
 * document-height changes are what make the URL bar show and hide — and the
 * sticky header jumps with it. Nothing here touches layout now.*
 */
const reachableTop = () =>
  Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

/**
 * Where the last restore actually put the page, so the late pass below can
 * tell "the reader has not moved" from "the reader has scrolled away".
 */
let landedAt = null;

async function restoreSection(y) {
  landedAt = null;
  if (!y) return;
  /*
   * **A timer, and on no account `requestAnimationFrame`.**
   *
   * This runs inside the transition callback, and for the length of that
   * callback the browser has *suspended rendering* — it will not run an
   * animation frame until the promise the callback returned has settled. So
   * awaiting a frame in here is a deadlock in both directions: the promise is
   * waiting for a frame that is waiting for the promise. The transition never
   * finishes, and the page is left at the top of the new view — the very fault
   * this function exists to remove, made permanent. Cost a whole debugging
   * round on 2026-08-27; the timer queue keeps running throughout, and a
   * layout read is still honest while painting is held.
   *
   * Ten turns of ~16 ms is about 160 ms, which covers a warm `loadDetail`
   * several times over and still reads as one movement rather than a wait.
   */
  for (let turns = 0; turns < 10 && reachableTop() < y; turns++) {
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  // Clamped, in case the view genuinely ended up shorter than where the reader
  // had been — a filter can do that between one visit and the next.
  const to = Math.min(y, reachableTop());
  window.scrollTo(0, to);
  landedAt = to;
}

/**
 * The safety net, and it is deliberately a net rather than the mechanism.
 *
 * On a slow phone a cold `loadDetail` can outlast the wait above, and then the
 * page is put down short of where the reader left it. Landing short and
 * *staying* short is quietly wrong, which is worse than the jump this round
 * set out to remove — so if the content arrives late, the position is
 * completed after the fade.
 *
 * It fires only when it has something to fix and nobody to fight: the earlier
 * pass fell short, the target is reachable now, and the page is still sitting
 * exactly where that pass left it. When the wait did its job — which is every
 * warm navigation — this does nothing at all.
 */
function settleLate(y) {
  if (!y || landedAt === null || landedAt >= y) return;
  let frames = 0;
  const tick = () => {
    if (Math.abs(window.scrollY - landedAt) > 2) return;
    if (reachableTop() >= y) {
      window.scrollTo(0, y);
      landedAt = y;
      return;
    }
    if (frames++ < 40) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
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
  // Whatever the last press set moving, this navigation is the end of it: a
  // tween still easing toward the *old* page's top would otherwise land on the
  // new page and take it there.
  stopScrollTween();

  /*
   * **Async on purpose.** `startViewTransition` waits for the promise its
   * callback returns before snapshotting the new state, so awaiting the scroll
   * restore in here is what makes the fade cross into a page that is already
   * where the reader left it. Everything before the await is synchronous and
   * unchanged.
   */
  const swap = async () => {
    // Views that hold listeners or timers get told they are leaving; the rest
    // are pure renderers and do not implement it.
    currentView?.destroy?.();
    currentView = view ?? null;
    renderNav(route?.nav);
    /*
     * Every navigation lands at the top of the page it opens, or — a change of
     * section — back where this section was left (`returning`). The first
     * render keeps whatever position the browser gave it. A press of the
     * current page's own nav button eases there instead of jumping.
     *
     * **A restore does not touch zero on the way.** It used to: reset to 0,
     * then scroll to the remembered position a moment later. On a desk that is
     * invisible, and on a phone it is the header "jumping up and down when
     * changing pages" — arriving at 0 tells the browser the reader is at the
     * top, so it starts showing its URL bar, and the scroll that follows sends
     * it away again. The whole page moves twice, and the sticky bar rides it
     * both ways. Where there is a position to go back to, that is the only
     * place this navigation scrolls to.
     */
    if (!firstRender && !returning) {
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
    // new-state snapshot is taken, so the fade crosses into the page already at
    // the right spot rather than at the top with a jump after it. (The Index's
    // own restore — the saint page's × or a browser back — happens separately,
    // from its own record, DESIGN.md §5c.)
    if (!firstRender) await restoreSection(returning);
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
  // `swap` owns the section restore now, floor and all, so there is nothing
  // left to correct once the transition settles — a second pass here is what
  // used to produce the jump this fixed.
  if (document.startViewTransition && !reduced && !first) {
    document.startViewTransition(swap).finished.finally(() => settleLate(returning));
  } else {
    swap().then(() => settleLate(returning));
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
  /*
   * **The stamp is outlines now, and the markup already has them** (author,
   * 2026-08-28). `vite.config.js`'s wordmark plugin substitutes the same SVG
   * into both slots at build time, so the veil carries it in the first paint
   * rather than waiting for this module to parse — which was the whole
   * complaint, since the veil is what a reader looks at while the modules
   * arrive.
   *
   * This still runs, and only fills a slot that is somehow empty: the name is
   * no longer a translation (it is `BRAND`, constant in every pack), so there
   * is nothing here to repaint on a language change.
   */
  for (const el of document.querySelectorAll('[data-site-name]')) {
    if (!el.firstElementChild) el.innerHTML = WORDMARK;
  }
  // And the masthead's own href, once, with the base path on it.
  const home = document.querySelector('[data-site-home]');
  if (home) home.setAttribute('href', router.href('/'));
}

/**
 * The height of the sticky bar, published to CSS as `--chrome-h`.
 *
 * Anything that wants to stick *under* the chrome needs to know how tall it is
 * — the Index's search field does — and that is not a constant: the narrow
 * header is two rows, the five packs set their own widths, and an open chooser
 * panel makes the bar taller still. A ResizeObserver is the only honest answer;
 * a number written into the stylesheet would be wrong at some width in some
 * language on the day it was written.
 */
function watchChromeHeight() {
  const bar = document.querySelector('.chrome-bar');
  if (!bar) return;
  const publish = () => {
    // The header alone, not the panels: a panel opens *downward* over the page
    // and should not push what is stuck under the bar down with it.
    const header = bar.querySelector('header.chrome');
    const h = Math.round((header ?? bar).getBoundingClientRect().height);
    document.documentElement.style.setProperty('--chrome-h', `${h}px`);
  };
  publish();
  new ResizeObserver(publish).observe(bar);
}

async function boot() {
  watchChromeHeight();
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
