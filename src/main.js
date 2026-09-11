import './styles/fonts.css';
import './styles/metrics.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/calendar.css';
import './styles/saint.css';
import './styles/index.css';
/*
 * **`map.css` is not here, and that is a first-paint decision.** Every sheet
 * imported by this module is concatenated into one render-blocking stylesheet
 * that every route waits for before it paints anything. The map's 27 kB is
 * more than a third of it and is read by one route in six.
 *
 * Measured on 2026-09-10, when `npm run test:lighthouse` went red on a
 * 1,248-byte diff: first contentful paint steps by exactly one 150 ms round
 * trip somewhere between 73.9 kB and 75.1 kB of that sheet — 1357 ms and
 * 1507 ms on CI, 1535 and 1690 on this desk — and emptying `map.css` at the
 * larger size put it back to 1534. Taking 9.6 kB out of the JavaScript moved
 * nothing, because the script is deferred and was never on that path.
 *
 * `views/map.js` imports it dynamically instead, which is the same arrangement
 * the map's own coastline data has had since it shipped: fetched as its own
 * chunk beside the boot, never in front of the first paint.
 *
 * **`theme-fade.css` is the second one missing from this list**, and
 * `lib/theme.js` imports it the same way. It is the cross-fade's `@property`
 * registrations and its one transition rule, needed only when a reader presses
 * the toggle — and on 2026-09-10 the step above was pinned to the byte: 73,629
 * green and 73,688 red, found by adding 57 bytes of CSS matching no element to
 * a tree that had just gone green.
 */
import './styles/about.css';

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
import { registerServiceWorker } from './lib/offline.js';
import { wireNavScroll } from './ui/nav-scroll.js';
import {
  facePainted,
  layerFor,
  markPainted,
  mountStage,
  stageFace,
  stageUp,
  stageWidth,
  swapFace,
  teardownStage,
} from './ui/face-stage.js';
import * as calendar from './views/calendar.js';
import * as saints from './views/saints.js';
import * as saint from './views/saint.js';
import * as map from './views/map.js';
import * as texts from './views/texts.js';
import * as about from './views/about.js';

const routes = [
  { path: '/', view: calendar, nav: 'calendar' },
  { path: '/calendar/:date?', view: calendar, nav: 'calendar' },
  { path: '/saints', view: saints, nav: 'saints' },
  { path: '/saints/:slug', view: saint, nav: 'saints' },
  { path: '/map', view: map, nav: 'map' },
  { path: '/texts', view: texts, nav: 'texts' },
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
  const settle = () => {
    label.classList.toggle('is-today', isToday);
    // Daily and Today are not the same width, and on a phone the row is
    // centred on a page rather than laid out in columns — so the word landing
    // drags whatever is centred a few pixels off the midline. Silent, and
    // never against a reader who has swiped elsewhere (`ui/nav-scroll.js`).
    navScroll?.recentre();
  };
  if ((pendingWord ?? label.textContent) === word) {
    settle();
    return;
  }
  clearTimeout(fadeTimer);
  // Removed, not shortened (PLAN.md): reduced motion gets the word, not
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

const NAV_KEYS = ['calendar', 'saints', 'texts', 'map', 'about'];

function navHref(key) {
  return key === 'calendar' ? '/' : `/${key}`;
}

/**
 * One `<a>`, exactly one of which ever wears `aria-current` on a given render.
 * `data-nav-key` is how the phone's strip finds a link again without rebuilding
 * the row (see `renderNav`).
 */
function navLinkHTML(key, current) {
  const cur = key === current ? ' aria-current="page"' : '';
  const daily = key === 'calendar' ? ' data-nav-daily' : '';
  const text =
    key === 'calendar'
      ? `<span class="nav-label" data-nav-label>${STRINGS.nav.calendar}</span>`
      : STRINGS.nav[key];
  return `<a href="${router.href(navHref(key))}" data-nav-key="${key}"${cur}${daily}>${text}</a>`;
}

/**
 * Whatever `wireNavScroll` set up for the current render, if any — a phone's
 * own strip only. `renderNav` always builds the same five links at every width
 * (author, 2026-09-07, "an infinite scroll header" on a phone):
 * `ui/nav-scroll.js`'s own loop rotates a flex `order`, not the DOM and not
 * buffered clones, precisely so `.site-nav a[href$="/saints"]` and its like
 * stay the one element, in the one place, the rest of this file — and the
 * whole suite — already hold them to be.
 */
let navScroll = null;

/**
 * Whether the phone's strip owes the reader a glide, and why `show()` and not
 * `renderNav` is the one that pays it.
 *
 * `renderNav` runs inside `startViewTransition`'s own update callback, where
 * the browser has suspended rendering and the page is about to be covered by
 * the transition's snapshots for the length of the fade. A smooth scroll
 * started in there does not survive it — measured, not assumed: the strip
 * moved a single pixel and stopped, where the same `scrollTo` outside a
 * transition travels the whole way over nine frames. `restoreSection`'s own
 * note names the same suspension from the other side, which is what said where
 * to look. So the glide is armed here and let go once `finished` settles, with
 * the fade behind it and the page the reader pressed already on screen.
 */
let navNeedsGlide = false;

function settleNav() {
  if (!navNeedsGlide) return;
  navNeedsGlide = false;
  navScroll?.glide();
}

function renderNav(current) {
  const narrow = matchMedia('(max-width: 759.98px)').matches;
  /*
   * **A navigation moves `aria-current`; it does not rebuild the strip**
   * (2026-09-08). The five links are the same five whatever page is open, and
   * rebuilding them threw away the two things the gentle press needs: the
   * rotation the reader's own swipes had put the ring in, and the scroll
   * position the new page has to glide *from*. Rebuilding is still what
   * happens at every other width, and on anything that changes the row itself
   * — a language, a crossing of the nav's own breakpoint — which is the
   * `narrow && navScroll` guard here and the teardown below.
   *
   * The labels are rewritten in place with it, because `router.refresh()` on a
   * language change comes through here too and a strip that kept its old words
   * would be the one thing this path could silently get wrong. The Daily
   * button's own word is not touched: it is a span with a fade in flight and
   * `paintDailyLabel` is its only writer.
   */
  if (narrow && navScroll && navEl.children.length === NAV_KEYS.length) {
    for (const a of navEl.children) {
      const key = a.dataset.navKey;
      if (key === current) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
      if (key !== 'calendar') a.textContent = STRINGS.nav[key];
    }
    navNeedsGlide = true;
    paintDailyLabel(current === 'calendar');
    return;
  }

  // The span the fade was working on is about to be replaced, so nothing is
  // in flight any more.
  clearTimeout(fadeTimer);
  pendingWord = null;
  navScroll?.destroy();
  navScroll = null;

  navEl.innerHTML = NAV_KEYS.map((key) => navLinkHTML(key, current)).join('');
  // Below the nav's own breakpoint (759.98px, base.css) the row is a
  // horizontal strip rather than a plain line; wiring it outside that width
  // would measure a track CSS never made scrollable.
  if (narrow) navScroll = wireNavScroll(navEl);
  // Leaving the Daily page puts the word back without a fade: the button the
  // reader pressed has already gone somewhere, and a word changing after the
  // page has is a second event where there was one.
  paintDailyLabel(current === 'calendar');
}

// A window crossing the nav's own breakpoint without a navigation — a
// rotation, a resized devtools pane — still has to wire or unwire the strip;
// a navigation rebuilds the row from scratch anyway, so this only checks for
// the one thing that changes the row's own shape rather than rebuilding on
// every pixel of a live drag-resize.
let navNarrow = matchMedia('(max-width: 759.98px)').matches;
window.addEventListener('resize', () => {
  const narrow = matchMedia('(max-width: 759.98px)').matches;
  if (narrow === navNarrow) return;
  navNarrow = narrow;
  if (lastRoute) renderNav(lastRoute.nav);
});

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
/**
 * **The strip answers the press, not the navigation** (author, 2026-09-08:
 * "I want the animation to be separate from the loading below otherwise it
 * feels disjointed uneven and unpredictable. It should be a smooth instant
 * response, and the loading below should happen independently").
 *
 * It was armed in `renderNav` and let go from `show()` once the view
 * transition's `finished` settled — so a press bought a quarter-second of
 * nothing, then the page changed, then the header moved. Three events for one
 * touch, in an order the reader cannot predict because it depends on how long
 * the page took.
 *
 * The glide starts *here* now, on the press itself, before the router has been
 * asked for anything. And the cross-fade is skipped for this one gesture,
 * which is the other half of the same problem: a view transition replaces the
 * whole document with a snapshot for its duration, so a header animating
 * underneath one is a header nobody can see. Only this press — every other
 * navigation on the site still cross-fades — because this is the only one
 * where the chrome is the thing the reader is looking at.
 *
 * *The wider fix, not taken: `:root { view-transition-name: none }` with the
 * name moved to `#view` would scope the cross-fade to the content and leave
 * the chrome live for every navigation. It also rewrites the saint page's own
 * shared-element and swipe transitions, which is a great deal of risk to buy
 * a fade on the one gesture that reads better without it.*
 */
let skipFade = false;
navEl.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link || !navEl.contains(link)) return;
  // The phone's strip only: the wide row has nothing to glide.
  if (navScroll) {
    navScroll.glide(link);
    skipFade = true;
  }
  if (!link.matches('[aria-current="page"]')) return;
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
 * own record for that journey since the saint page was specified; two mechanisms restoring
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

/**
 * Which half of the pair a route is, or `null` for everything else. By view
 * module and not by `nav`, because `/saints/:slug` answers to the `saints`
 * section and is a third route as far as the stage is concerned.
 */
const faceOf = (route) =>
  route?.view === calendar ? 'calendar' : route?.view === saints ? 'saints' : null;

function show({ route, params, path }, nav = {}) {
  const view = route?.view;
  const firstRender = first;
  const cameFrom = lastRoute;
  /*
   * **A swiped saint-to-saint navigation pushes rather than fades**
   * (2026-09-04, `views/saint.js`'s `wireSaintSwipe`). Set before
   * `startViewTransition` below captures the *old* snapshot, so both the
   * outgoing and incoming pseudo-elements see it — `base.css`'s
   * `[data-swipe-nav]` rules read it there. Mirrored from `nav.swipe` on
   * every navigation rather than cleared after use, the same way
   * `dataset.route`/`dataset.view` are: an ordinary navigation carries no
   * `swipe`, so this resets to `''` on its own.
   */
  document.documentElement.dataset.swipeNav = nav.swipe ?? '';
  // Where this reader is *leaving* from, before anything moves.
  if (!firstRender && cameFrom?.nav) sectionScroll.set(cameFrom.nav, window.scrollY);
  // `face` and not `nav`: a saint's page answers to the same section as All
  // Saints, and it is emphatically not the other half of the pair.
  lastRoute = { path, nav: route?.nav, face: faceOf(route) };
  // Only a change of section restores: within one, the view owns the question
  // — the Index puts a reader back on the card they opened — and every other
  // navigation lands at the top, which is what it has always done.
  const returning =
    !firstRender && !nav.restore && route?.nav && route.nav !== cameFrom?.nav
      ? (sectionScroll.get(route.nav) ?? 0)
      : 0;
  /*
   * **The pair.** Past 1024 px the Daily page and All Saints are two faces of
   * one stage rather than two pages (plan §5): the view being left is not torn
   * down, it is slid out of the clipped box and parked, which is what lets the
   * carousel come back still holding its scroll position and still drifting.
   * `ui/face-stage.js` owns the box and the sequence; everything this file has
   * to do is render into a layer instead of into `#view`, not ask All Saints to
   * render itself a second time, and keep its hands off the scroll while the
   * stage is driving.
   *
   * **A swap and a mount are different things.** A swap needs a face to come
   * *from* — this navigation is between the two. A deep link to a day, or
   * arrival from a saint's page, mounts the stage and paints one layer; the
   * other is empty until the first swap towards it, which therefore renders
   * and then slides (§11.7 b). And because the decision is taken here, in the
   * one place every navigation passes through, the browser's Back button
   * between the two faces takes exactly the path a click takes (§11.7 c) —
   * `popstate` arrives at `show()` like everything else.
   */
  const face = faceOf(route);
  const onStage = !!face && stageWidth();
  const stageSwap =
    onStage && !firstRender && !!cameFrom?.face && cameFrom.face !== face && stageFace() === cameFrom.face;
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
    //
    // **All Saints is not told, when it is only being parked.** A swap toward
    // the day leaves its layer mounted and live, so `destroy()` — which takes
    // its `remembered` snapshot, closes its state and drops its subscriptions —
    // would be destroying a view that is still on the page and still running.
    // The day is destroyed on the way out as usual: it is rendered fresh every
    // time, because the date is a route parameter.
    const leaving = currentView;
    if (!(stageSwap && leaving === saints)) currentView?.destroy?.();
    currentView = view ?? null;
    /*
     * Leaving the pair for a third route — Map, Texts, About, a saint — takes
     * the stage down, and whichever face was parked has to be told now, while
     * its markup is still in the document for it to read. After this the site
     * is back to one view in `#view` and All Saints rebuilds from its own
     * snapshot exactly as it did before any of this existed.
     */
    if (stageUp() && !onStage) {
      if (facePainted('saints') && leaving !== saints) saints.destroy?.();
      if (facePainted('calendar') && leaving !== calendar) calendar.destroy?.();
      teardownStage();
    }
    renderNav(route?.nav);
    /*
     * Which section is on, published to CSS so a stylesheet can answer
     * questions a view cannot answer about itself — the map wants the whole
     * window under the header, and the column it would otherwise sit in belongs
     * to `main`, not to anything the view renders.
     *
     * **On the root element, and index.html sets it before first paint too.**
     * Here alone it would arrive with the modules, and the map would paint in
     * the column for a frame and then take the window: 0.21 of layout shift on
     * the one criterion §13 spells out. This keeps it in step from the second
     * navigation onward; the head does the first frame.
     */
    document.documentElement.dataset.route = route?.nav ?? '';
    /*
     * And which *view*, which is not the same question (2026-09-02). `nav` is
     * the section the header underlines, so the Index and a saint's page share
     * one — and a saint's page is the only route on the site whose layout the
     * section cannot name. Published beside it rather than folded into it,
     * because the header's answer is right and it is a stylesheet that needs
     * the finer one: `html[data-view='saint']` is what gives that page's
     * columns their own scrolling.
     */
    document.documentElement.dataset.view = route?.view === saint ? 'saint' : '';
    /*
     * And whether the route fills the window (base.css, "a route that fills
     * the window", 2026-09-05): the Daily page and a saint's own page give up
     * the page's scroll past 1024 px so their columns can keep their own.
     * One attribute the two stylesheets used to reach for by their own
     * names — index.html sets it for the first frame, this keeps it true.
     *
     * **A stage swap owns this attribute for its duration** and is skipped
     * here: the slide needs the window's scroll gone *before* it starts and
     * given back only once it has landed, which is a sequence rather than a
     * fact about the route. Every other navigation — a cold load straight onto
     * the day among them (§11.7 d) — sets it here as it always has.
     */
    if (stageSwap) {
      /* face-stage.js has it */
    } else if (route?.nav === 'calendar' || route?.view === saint) {
      document.documentElement.dataset.fillsWindow = '';
    } else {
      delete document.documentElement.dataset.fillsWindow;
    }
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
    // A stage swap is excepted: it scrolls the window itself, on its own beat,
    // and a reset dropped in here is the jump the pin exists to prevent.
    if (!firstRender && !returning && !stageSwap) {
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
    /*
     * Three ways in, and the view cannot tell them apart: it is handed an
     * element and renders into it, the same argument it has always been given.
     *
     * The one that is not a render at all is the swap back onto All Saints
     * when its layer is already painted. That skipped call *is* requirement 1:
     * no second `render()`, so no `destroy()` before it, so no snapshot, no
     * teardown, no rebuilt carousel — the page that comes up from below is the
     * one that went down, still holding its scroll and still drifting.
     */
    const paint = (el) => {
      view.render(el, { data, params, router, nav, cameFrom });
      if (onStage) markPainted(face);
    };
    if (stageSwap) {
      swapFace({
        to: face,
        returning,
        render: (layer) => {
          if (face === 'saints' && facePainted('saints')) return;
          paint(layer);
        },
      });
    } else if (onStage) {
      paint(mountStage(viewEl, face));
    } else {
      paint(viewEl);
    }
    // A returning section is put back where it was *before* the transition's
    // new-state snapshot is taken, so the fade crosses into the page already at
    // the right spot rather than at the top with a jump after it. (The Index's
    // own restore — the saint page's × or a browser back — happens separately,
    // from its own record.) A stage swap restores its own, on landing, and is
    // passed 0 rather than skipped so the late pass below is disarmed with it.
    if (!firstRender) await restoreSection(stageSwap ? 0 : returning);
    // Keyboard and screen-reader focus follows the page change — but not
    // into the first page of the visit. There is no page change to announce
    // yet, focus is already at the top of the document, and Chrome treats a
    // programmatic focus with no interaction behind it as keyboard-driven, so
    // the reader would meet the heading wearing a focus ring they did not ask
    // for and cannot dismiss without clicking away.
    if (firstRender) return;
    // Inside the layer this navigation painted, not `#view`: both faces are in
    // the document at once and All Saints is the earlier of the two, so a
    // document-order query would hand the day's navigation the other page's
    // heading.
    const h1 = (onStage ? (layerFor(face) ?? viewEl) : viewEl).querySelector('h1');
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
  // Read and cleared with `animateLanding` above: this press's own fade
  // decision, and the next navigation starts from the ordinary one.
  // A stage swap is never faded over: a view transition covers the document
  // with a snapshot for its duration, and a slide underneath one is a slide
  // nobody sees (trap 14 is the same fact, from the instrument's side).
  const fade = !skipFade && !stageSwap;
  skipFade = false;
  if (document.startViewTransition && !reduced && !first && fade) {
    document.startViewTransition(swap).finished.finally(() => {
      settleLate(returning);
      settleNav();
    });
  } else {
    swap().then(() => {
      settleLate(returning);
      settleNav();
    });
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
  /*
   * Inside the app (2026-09-05): the status bar, the splash and Android's
   * back button — lib/native.js. Imported only when the Capacitor shell has
   * announced itself, so the web bundle's entry chunk never carries it; the
   * import is started here, beside the boot fetches, and awaited only where
   * the splash has to be told the page is ready.
   */
  const native = globalThis.Capacitor?.isNativePlatform?.() ? import('./lib/native.js') : null;
  native?.then((m) => m.initNative()).catch(() => {});
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
  // The splash comes down once the first view is on the page, not on a timer.
  native?.then((m) => m.bootDone()).catch(() => {});
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
registerServiceWorker();
