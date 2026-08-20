import './styles/fonts.css';
import './styles/metrics.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/calendar.css';
import './styles/saint.css';

import { STRINGS } from './ui/strings.js';
import { initTheme } from './lib/theme.js';
import { createRouter } from './lib/router.js';
import { loadManifest } from './lib/manifest.js';
import { cancelPrefetches } from './lib/detail.js';
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

function renderNav(current) {
  navEl.innerHTML = ['calendar', 'saints', 'map', 'about']
    .map((key) => {
      const to = key === 'calendar' ? '/' : `/${key}`;
      const cur = key === current ? ' aria-current="page"' : '';
      return `<a href="${router.href(to)}"${cur}>${STRINGS.nav[key]}</a>`;
    })
    .join('');
}

function show({ route, params }) {
  const view = route?.view;
  // Every prefetch in flight was a guess about where this reader was going,
  // and the navigation has just answered it (brief §7).
  cancelPrefetches();

  const swap = () => {
    // Views that hold listeners or timers get told they are leaving; the rest
    // are pure renderers and do not implement it.
    currentView?.destroy?.();
    currentView = view ?? null;
    renderNav(route?.nav);
    if (!view) {
      document.title = `${STRINGS.notFound.title} — ${STRINGS.site.name}`;
      viewEl.innerHTML = `<h1>${STRINGS.notFound.title}</h1><p>${STRINGS.notFound.body}</p>`;
      return;
    }
    // A view whose title depends on what it is showing supplies titleFor; the
    // manifest is already loaded, so it never has to wait for a fetch to name
    // the page.
    const heading = view.titleFor ? view.titleFor(params, data) : view.title;
    document.title = `${heading} — ${STRINGS.site.name}`;
    view.render(viewEl, { data, params, router });
    // Keyboard and screen-reader focus follows the page change.
    viewEl.querySelector('h1')?.setAttribute('tabindex', '-1');
    viewEl.querySelector('h1')?.focus({ preventScroll: true });
  };

  // Cross-fade where the platform provides it; instant elsewhere. Reduced
  // motion gets no transition at all, not a shorter one.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !reduced) document.startViewTransition(swap);
  else swap();
}

async function boot() {
  initTheme(document.getElementById('theme-toggle'));
  router = createRouter(routes, show);

  const veil = document.getElementById('veil');
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
