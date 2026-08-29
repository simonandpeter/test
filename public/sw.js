/**
 * The service worker: the site, kept working on the metro (brief §12).
 *
 * Hand-written rather than generated, and small enough to read whole, because
 * a cache is the one part of a site that can serve a bug *forever*: a worker
 * nobody can read is a worker nobody can trust to let go. Four caches, one per
 * strategy the brief names, each versioned so a strategy change abandons its
 * predecessor's contents wholesale rather than mixing generations.
 *
 * Every path is derived from `registration.scope`, so the same file serves
 * under `/` locally and `/test/` on Pages without a build step touching it.
 *
 * **Nothing is cached unless the response was ok.** An opaque error or a 404
 * cached once would be served forever; the honest failure is to fail.
 */

const VERSION = 'v1';
const SHELL = `shell-${VERSION}`; // index.html, data/manifest.json - stale-while-revalidate
const ASSETS = `assets-${VERSION}`; // hashed /assets/ - cache-first, immutable by name
const SAINTS = `saints-${VERSION}`; // saint.json, life.md, meta - cache on read
const IMAGES = `images-${VERSION}`; // icons and thumbs - cache-first, capped, LRU

/*
 * The image cache's cap, in entries rather than bytes: the Cache API does not
 * report sizes without reading every body back, and 150 icons at the corpus's
 * ~40-80 kB each is a few megabytes - the eviction exists to stop unbounded
 * growth, not to hit a number. LRU by re-insertion: a hit is re-put, so
 * `keys()` order (insertion order in Chromium) is oldest-first.
 */
const IMAGE_CAP = 150;

const BASE = new URL(self.registration.scope).pathname;

/*
 * **Every match ignores `Vary`.** The dev preview answers with `Vary: Origin`,
 * and the Cache API honours it: an entry stored by this worker's own plain
 * `fetch` (no Origin header) then refused to match the parser's requests for
 * the same URL - module scripts and crossorigin font preloads *do* send
 * Origin - so the offline shell booted a page whose own bundle was a cache
 * miss. ERR_FAILED on four assets that were demonstrably in the cache, and
 * `window.fetch` of the same URL hitting, was the whole symptom. Safe as a
 * blanket because nothing here caches anything but same-origin GETs, where
 * Vary buys nothing.
 */
const MATCH = { ignoreVary: true };

/**
 * Fetch-and-put for a list where any member may fail, because `addAll` is
 * atomic and one refused font would throw away the whole install. (The test
 * rehearsal aborts every woff2 on purpose - COLD_FACE - and an install that
 * failed under it would be a worker the rehearsed suite never exercises.)
 */
async function putAll(cache, urls) {
  await Promise.all(
    urls.map((u) =>
      fetch(u)
        .then((r) => (r.ok ? cache.put(u, r) : null))
        .catch(() => {}),
    ),
  );
}

self.addEventListener('install', (e) => {
  /*
   * The shell and **its own assets**, eagerly. The entry JS and CSS load
   * *before* this worker controls the page - a worker only sees requests made
   * after it claims - so caching on read can never catch them: the first
   * offline visit found the shell cached and the bundle it boots from not,
   * which is a blank page wearing a 200.
   *
   * The asset names are hashed, so they are parsed out of the shell itself
   * rather than kept as a list a build step must regenerate: everything the
   * page names under assets/ - the entry script, the stylesheet, the
   * modulepreloaded chunks, the font preloads - is exactly the set the shell
   * cannot boot without.
   */
  e.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      await putAll(shell, [BASE, `${BASE}data/manifest.json`]);
      try {
        const html = await (await shell.match(BASE)).text();
        const urls = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)].map((m) => m[1]);
        await putAll(await caches.open(ASSETS), [...new Set(urls)]);
      } catch {
        // No shell, no asset list; the read-through cache picks up from here.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (e) => {
  // Every cache this version does not own is a previous generation's.
  const keep = new Set([SHELL, ASSETS, SAINTS, IMAGES]);
  e.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/** Cache-first: the answer if we have it, the network once if we do not. */
async function cacheFirst(cacheName, request, { cap = 0 } = {}) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, MATCH);
  if (hit) {
    if (cap) {
      // A hit re-inserted is a hit moved to the young end of the queue.
      cache.put(request, hit.clone()).catch(() => {});
    }
    return hit;
  }
  const fresh = await fetch(request);
  if (fresh.ok) {
    await cache.put(request, fresh.clone()).catch(() => {});
    if (cap) trim(cache, cap);
  }
  return fresh;
}

/** Stale-while-revalidate: the cached answer now, a fresher one for next time. */
async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, MATCH);
  const refresh = fetch(request)
    .then((fresh) => {
      if (fresh.ok) cache.put(request, fresh.clone()).catch(() => {});
      return fresh;
    })
    .catch(() => null);
  return hit ?? (await refresh) ?? Response.error();
}

async function trim(cache, cap) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - cap))) await cache.delete(key);
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // Bible Gateway, Commons - not ours to cache

  /*
   * A navigation is answered by the app shell when the network cannot answer
   * it - which is the whole of offline routing for a single-page app: the
   * shell boots, reads the path, and the router takes it from there. Online,
   * the network wins so a deploy is picked up on the next visit.
   */
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((fresh) => {
          if (fresh.ok) caches.open(SHELL).then((c) => c.put(BASE, fresh.clone())).catch(() => {});
          return fresh;
        })
        .catch(async () => (await caches.match(BASE, MATCH)) ?? Response.error()),
    );
    return;
  }

  const path = url.pathname;

  // Hashed assets are immutable by construction - the hash is the identity -
  // so asking the network twice for one name is asking twice for one answer.
  if (path.startsWith(`${BASE}assets/`)) {
    e.respondWith(cacheFirst(ASSETS, request));
    return;
  }

  if (path.startsWith(`${BASE}saints/`)) {
    // Pictures are capped and evicted; the texts are small and kept.
    if (/\.(jpe?g|png|webp)$/.test(path)) {
      e.respondWith(cacheFirst(IMAGES, request, { cap: IMAGE_CAP }));
    } else {
      // Cache on read (§12): anything opened stays available offline, and a
      // corrected life is picked up on the next online read.
      e.respondWith(staleWhileRevalidate(SAINTS, request));
    }
    return;
  }

  if (path.startsWith(`${BASE}data/`)) {
    e.respondWith(staleWhileRevalidate(SHELL, request));
  }
});
