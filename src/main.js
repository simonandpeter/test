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
import { cancelPrefetches } from './lib/detail.js';
import { mountChurchControl } from './ui/church-chooser.js';
import { mountLanguageControl } from './ui/language-chooser.js';
import { currentLanguage, languageTag, subscribeLanguage } from './lib/i18n.js';
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

function renderNav(current) {
  navEl.innerHTML = ['calendar', 'saints', 'map', 'about']
    .map((key) => {
      const to = key === 'calendar' ? '/' : `/${key}`;
      const cur = key === current ? ' aria-current="page"' : '';
      return `<a href="${router.href(to)}"${cur}>${STRINGS.nav[key]}</a>`;
    })
    .join('');
}

function show({ route, params, path }, nav = {}) {
  const view = route?.view;
  const firstRender = first;
  const cameFrom = lastRoute;
  lastRoute = { path, nav: route?.nav };
  // Every prefetch in flight was a guess about where this reader was going,
  // and the navigation has just answered it (brief §7).
  cancelPrefetches();

  const swap = () => {
    // Views that hold listeners or timers get told they are leaving; the rest
    // are pure renderers and do not implement it.
    currentView?.destroy?.();
    currentView = view ?? null;
    renderNav(route?.nav);
    // Every navigation lands at the top of the page it opens. A view that puts
    // the reader back where they were — the Index, on its × or on the
    // browser's back — does so after this, from its own record (DESIGN.md
    // §5c). The first render keeps whatever position the browser gave it.
    if (!firstRender) window.scrollTo(0, 0);
    if (!view) {
      document.title = `${STRINGS.notFound.title} — ${STRINGS.site.tabName}`;
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
    document.title = `${heading} — ${STRINGS.site.tabName}`;
    view.render(viewEl, { data, params, router, nav, cameFrom });
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
  if (document.startViewTransition && !reduced && !first) document.startViewTransition(swap);
  else swap();
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
    router.refresh();
    paintSiteName();
  });
  paintSiteName();

  const veil = document.getElementById('veil');
  // The veil is up before this runs, so its English stands for the moment the
  // modules take to parse and is replaced here — a language chosen on a
  // previous visit paints before the manifest arrives, which is the long wait.
  paintSiteName();
  try {
    data = await loadManifest();
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
  veil.classList.add('done');
  // Gone entirely once faded, so it can never intercept a tap.
  setTimeout(() => veil.remove(), 300);
}

boot();
