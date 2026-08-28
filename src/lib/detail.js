/**
 * The second loading layer (brief §7): the manifest answers every card-level
 * question, and this fetches the rest of one saint — the full `saint.json`
 * with its name forms, citations and place names, plus the life text — only
 * when that saint is opened, or about to be.
 *
 * Prefetching is the reason opening feels instant, and the reason it needs a
 * budget: hover on a dense register would otherwise open a request per card.
 * Four in flight, speculative work cancelled the moment the reader navigates,
 * and a reader-initiated open never waits behind the queue.
 */

import { evictOldest } from './lru.js';

const BASE = import.meta.env.BASE_URL;

const MAX_IN_FLIGHT = 4;
/**
 * The brief caps requests in flight; the queue behind them needs a bound too.
 * A virtualised grid can offer sixty cards to the budget in one scroll frame,
 * and a guess made sixty cards ago is not a guess worth spending a request on
 * by the time it reaches the front.
 */
const MAX_QUEUED = 12;

/**
 * How many payloads are kept (Addendum G4). A life plus its images is the
 * heaviest thing this app holds per saint, and the cache had no ceiling: a
 * reader working through the Index could accumulate every saint they had
 * opened for the life of the page. Twenty-four is well past any plausible
 * back-and-forth and small enough to bound the tab.
 *
 * **Payloads only.** The queue and the in-flight speculative set below are not
 * touched — evicting an in-flight request would leave its `AbortController`
 * orphaned and its `catch` writing to a map that no longer expects it.
 */
const MAX_CACHED = 24;

/** slug -> Promise of the payload. A rejection is evicted, never cached. */
const cache = new Map();


const speculative = new Map(); // slug -> AbortController
const waiting = [];

const folder = (slug) => `${BASE}saints/${slug}/`;

async function fetchText(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

async function fetchPayload(slug, signal) {
  const saint = JSON.parse(await fetchText(folder(slug) + 'saint.json', signal));
  // The life and the image credits are independent of each other, so they go
  // together; both depend on saint.json, so they go after it.
  const [life, images] = await Promise.all([
    saint.text?.life ? fetchText(folder(slug) + saint.text.life, signal) : null,
    Promise.all(
      (saint.images ?? []).map(async (image) => ({
        ...image,
        // A missing or malformed meta file is a gap in what we know about the
        // picture, not a reason to withhold the saint: the page says so in
        // words and carries on.
        credit: image.meta
          ? await fetchText(folder(slug) + image.meta, signal)
              .then(JSON.parse)
              .catch(() => null)
          : null,
      })),
    ),
  ]);
  return { slug, saint, life, images };
}

function start(slug, signal) {
  const promise = fetchPayload(slug, signal);
  cache.set(slug, promise);
  evictOldest(cache, MAX_CACHED);
  promise.catch(() => cache.delete(slug));
  return promise;
}

/**
 * The reader has asked for this saint, so it is never queued and never
 * cancelled — an in-flight prefetch for the same slug is adopted rather than
 * duplicated.
 */
export function loadDetail(slug) {
  const hit = cache.get(slug);
  if (!hit) return start(slug);
  /*
   * Re-inserted so the Map's order stays "least recently used first".
   *
   * **This re-inserts a promise that may still be pending, and that is
   * load-bearing** rather than sloppy: it means a payload cannot be evicted
   * while a caller is actively waiting on it. A tidy-up that re-inserted only
   * settled entries would let a pending fetch age to the back of the queue and
   * be dropped mid-flight, which is the orphaned-`AbortController` case the
   * cap's own comment guards against for the speculative set.
   */
  cache.delete(slug);
  cache.set(slug, hit);
  return hit;
}

export const isLoaded = (slug) => cache.has(slug);

function pump() {
  while (speculative.size < MAX_IN_FLIGHT && waiting.length) {
    const slug = waiting.shift();
    if (cache.has(slug)) continue;
    const controller = new AbortController();
    speculative.set(slug, controller);
    start(slug, controller.signal)
      .catch(() => {}) // speculative work fails silently; the open will retry
      .finally(() => {
        speculative.delete(slug);
        pump();
      });
  }
}

/** Speculative. Safe to call repeatedly and on slugs already loaded. */
export function prefetch(slug) {
  if (!slug || cache.has(slug) || speculative.has(slug) || waiting.includes(slug)) return;
  waiting.push(slug);
  if (waiting.length > MAX_QUEUED) waiting.shift();
  pump();
}

/**
 * Navigation invalidates every guess made about where the reader was going.
 * Payloads already in the cache stay — the guess was wrong about *when*, not
 * about what the file contains.
 */
export function cancelPrefetches() {
  waiting.length = 0;
  for (const [slug, controller] of speculative) {
    controller.abort();
    cache.delete(slug);
  }
  speculative.clear();
}

/**
 * Source texts are fetched only when a reader opens one. Jerome's Life of Paul
 * is 40 KB of the 60 KB in `saints/`, and nobody should pay for it to look at
 * a feast day.
 */
export async function loadSource(slug, relative) {
  const key = `${slug}#${relative}`;
  if (!cache.has(key)) {
    const promise = fetchText(folder(slug) + relative);
    cache.set(key, promise);
    promise.catch(() => cache.delete(key));
  }
  return cache.get(key);
}

/**
 * Wires a rendered subtree's saint links to the prefetch budget: hover where
 * there is a pointer to hover with, viewport entry where there is not. The
 * mobile path deliberately watches for the link approaching the fold rather
 * than reaching it, since on a phone the tap follows the sighting closely.
 *
 * Returns a teardown; views call it when they re-render.
 */
export function observePrefetch(root) {
  const links = [...root.querySelectorAll('[data-prefetch]')];
  if (!links.length) return () => {};

  const fine = window.matchMedia('(pointer: fine)').matches;
  if (fine) {
    const onEnter = (e) => prefetch(e.currentTarget.dataset.prefetch);
    for (const link of links) {
      link.addEventListener('pointerenter', onEnter);
      link.addEventListener('focus', onEnter);
    }
    return () => {
      for (const link of links) {
        link.removeEventListener('pointerenter', onEnter);
        link.removeEventListener('focus', onEnter);
      }
    };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        prefetch(entry.target.dataset.prefetch);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '200px' },
  );
  for (const link of links) observer.observe(link);
  return () => observer.disconnect();
}
