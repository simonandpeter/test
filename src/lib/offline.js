/**
 * The service worker's page-side half: registration, and the eager precache
 * that makes Save a promise (brief §12: "saved saints - precached eagerly on
 * save, so the saved shelf works fully offline").
 *
 * **Precaching is reading.** The worker caches saint texts on read and images
 * cache-first, so warming the cache is nothing more than fetching the same
 * URLs the page would fetch - every request passes through the worker's own
 * fetch handler and lands in the right cache under the right policy, cap and
 * eviction included. No message channel, no second copy of the caching rules,
 * and no second reader of saint.json's shape: `loadDetail` is the first one
 * and this borrows it.
 */

// Guarded: the unit suite imports lib/store.js under plain Node, where
// import.meta.env does not exist. '/' is what Vite serves locally anyway.
const BASE = import.meta.env?.BASE_URL ?? '/';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // In dev, Vite serves modules the worker's caches would fight with; the
  // worker is a production concern and registers against the built site only.
  if (!import.meta.env?.PROD) return;
  // After load, so registration never competes with the boot fetches the
  // reader is actually waiting on.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${BASE}sw.js`).catch(() => {
      // A browser that refuses (private mode, storage pressure) gets the
      // ordinary online site, which is what it had yesterday.
    });
  });
}

/**
 * Fetch everything a saint's page would, so it is all in cache before the
 * network goes away. Fire-and-forget by design: a failed precache leaves a
 * saved saint exactly as saved as before - the shelf's offline promise is
 * best-effort, and the press must never wait on a fetch.
 */
export async function precacheSaint(slug) {
  if (!('serviceWorker' in navigator)) return;
  /*
   * Wait for the worker to take the page rather than testing `controller`
   * once: a reader's very first visit installs the worker *while* they read,
   * and a save pressed in that window found no controller and quietly kept no
   * promise. `ready` resolves at activation; the claim lands a beat later.
   */
  try {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
        setTimeout(resolve, 3000);
      });
    }
  } catch {
    return;
  }
  if (!navigator.serviceWorker.controller) return;
  /*
   * `loadDetail` names the files; the plain fetches below are what fill the
   * cache. The distinction is load-bearing: loadDetail keeps payloads in
   * memory, so on the very page a reader saves from it resolves without
   * touching the network - and a fetch that never happens is a fetch the
   * worker never sees. Each URL is requested outright so the worker's own
   * read-through strategies do the caching, policy, cap and eviction included.
   *
   * (Imported at the moment of use, not at module top: lib/store.js imports
   * this file and the unit suite imports lib/store.js under plain Node, where
   * detail.js's top-level import.meta.env read would throw before a test ran.)
   */
  import('./detail.js')
    .then(({ loadDetail }) => loadDetail(slug))
    .then((payload) => {
      const saint = payload?.saint;
      if (!saint) return;
      const folder = `${BASE}saints/${slug}/`;
      const files = [
        'saint.json',
        saint.text?.life,
        ...(saint.images ?? []).flatMap((image) => [image.file, image.meta]),
      ].filter(Boolean);
      for (const file of files) fetch(folder + file).catch(() => {});
    })
    .catch(() => {});
}
