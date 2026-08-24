/**
 * A history-API router small enough to read in one sitting. Hash routing would
 * have been simpler, but the brief's deep links are real paths
 * (/calendar/2026-08-20), and GitHub Pages can serve them by shipping a copy
 * of index.html as 404.html — vite.config.js does that at build time.
 *
 * Routes are matched in order against patterns like '/calendar/:date?'. The
 * base path (Vite's BASE_URL, '/' locally and '/<repo>/' on Pages) is
 * stripped before matching and re-applied by href(), so no view ever sees it.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const compile = (pattern) => {
  const names = [];
  const rx = pattern
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      if (!seg.startsWith(':')) return '/' + seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const optional = seg.endsWith('?');
      names.push(seg.slice(1, optional ? -1 : undefined));
      return optional ? '(?:/([^/]+))?' : '/([^/]+)';
    })
    .join('');
  return { rx: new RegExp(`^${rx || '/'}/?$`), names };
};

export function createRouter(routes, onNavigate) {
  const table = routes.map((r) => ({ ...r, ...compile(r.path) }));

  // The app owns scroll (DESIGN.md §5c): every navigation lands at the top of
  // the page it opens, except the Index returning to where the reader left it,
  // which it does itself. The browser's own restoration cannot do that job —
  // it fires before a virtualised grid has been re-rendered and so restores
  // into nothing — and left on, it fights the one that can.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const resolve = (pathname) => {
    let path = decodeURIComponent(pathname);
    if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
    if (!path.startsWith('/')) path = '/' + path;
    for (const route of table) {
      const m = path.match(route.rx);
      if (!m) continue;
      const params = {};
      route.names.forEach((n, i) => {
        if (m[i + 1] !== undefined) params[n] = m[i + 1];
      });
      return { route, params, path };
    }
    return { route: null, params: {}, path };
  };

  // `state` rides along to the view as a hint about the navigation — the
  // saint page's × asks the Index to restore itself with { restore: true } —
  // and a history traversal arrives marked { pop: true } for the same reason.
  const navigate = (to, { replace = false, state = null } = {}) => {
    const url = BASE + to;
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
    onNavigate(resolve(to), { pop: false, ...state });
  };

  // Same-origin link clicks become navigations; everything else — new tabs,
  // downloads, external links — is left to the browser.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if (!a || a.target || a.hasAttribute('download') || a.origin !== location.origin) return;
    e.preventDefault();
    navigate(a.pathname.startsWith(BASE) ? a.pathname.slice(BASE.length) || '/' : a.pathname);
  });

  window.addEventListener('popstate', () => onNavigate(resolve(location.pathname), { pop: true }));

  return {
    navigate,
    start: () => onNavigate(resolve(location.pathname), { pop: false, first: true }),
    // Re-render the page that is open, in place, same URL and no history
    // entry — a language change (Amendment 36) needs every word redrawn and
    // nothing else moved.
    refresh: () => onNavigate(resolve(location.pathname), { pop: false }),
    href: (to) => BASE + to,
  };
}
