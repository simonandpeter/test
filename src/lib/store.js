/**
 * The local store (brief §11). Local-first, and local is complete: everything
 * on this site works signed-out, forever, and there is no account UI, no
 * "Sign in" placeholder and no authentication anywhere. When accounts are
 * warranted the right shape is a hosted auth provider with this store as the
 * source of truth and the server as a mirror — one adapter behind the
 * interface below, and nothing else changes.
 *
 * That promise is what the record shape is for. Every record carries a stable
 * `id` and an `updatedAt`, so the four stores are already a sync-ready log
 * rather than a bag of current values, and an unsave is a tombstone rather
 * than a deletion — otherwise a stale save arriving from another device would
 * silently resurrect it. None of that costs anything today; retrofitting it
 * would cost a migration.
 *
 * Settings are the exception to "IndexedDB holds it": the theme has to be
 * readable synchronously before first paint, which IndexedDB cannot do, so
 * localStorage stays the synchronous mirror (settings.js owns it) and this
 * store keeps the sync-ready copy. Writes go through setSetting and land in
 * both.
 */

import { openDB } from 'idb';
import { readSettings, writeSetting } from './settings.js';

const DB_NAME = 'gallery-of-saints';
const DB_VERSION = 1;
const STORES = ['saved', 'reading', 'history', 'settings'];

/** History is a convenience, not an archive; it stays bounded and clearable. */
export const HISTORY_CAP = 200;

const now = () => Date.now();

/* ---- pure record shaping ----------------------------------------------- */
/* Exported so the log's rules are unit-testable without a browser: these are
   the parts a sync adapter will have to agree with. */

export const savedRecord = (slug, at = now()) => ({
  id: slug,
  slug,
  savedAt: at,
  deletedAt: null,
  updatedAt: at,
});

export const tombstone = (record, at = now()) => ({ ...record, deletedAt: at, updatedAt: at });

export const readingRecord = (slug, scrollPos, at = now()) => ({
  id: slug,
  slug,
  scrollPos: Math.max(0, Math.round(scrollPos)) || 0,
  lastReadAt: at,
  updatedAt: at,
});

export const historyRecord = (slug, at = now()) => ({ id: slug, slug, visitedAt: at, updatedAt: at });

export const isLive = (record) => !!record && !record.deletedAt;

/** Newest first, tombstones dropped, optionally capped. */
export const liveByRecency = (rows, key, limit = Infinity) =>
  rows
    .filter(isLive)
    .sort((a, b) => b[key] - a[key])
    .slice(0, limit);

/** Which history rows fall outside the cap. */
export const overflow = (rows, cap = HISTORY_CAP) =>
  rows
    .slice()
    .sort((a, b) => b.visitedAt - a.visitedAt)
    .slice(cap);

/**
 * Last write wins on `updatedAt`, ties to the incoming record. This is the
 * whole merge rule a sync adapter needs, and it lives here rather than in that
 * future adapter so the local store already obeys the rule it will be judged
 * by.
 */
export const merge = (mine, theirs) =>
  !mine ? theirs : !theirs ? mine : theirs.updatedAt >= mine.updatedAt ? theirs : mine;

/* ---- the database ------------------------------------------------------- */

/**
 * A Map-backed stand-in with the four idb methods this module uses. Private
 * browsing and storage-blocked contexts throw on open; a reader in one of them
 * should get a site that works for the session rather than a dead Save button,
 * so the fallback is silent by design and nothing above this line knows which
 * one it is talking to.
 */
function memoryDb() {
  const tables = new Map(STORES.map((name) => [name, new Map()]));
  return {
    memory: true,
    async get(store, key) {
      return tables.get(store).get(key);
    },
    async getAll(store) {
      return [...tables.get(store).values()];
    },
    async put(store, value) {
      tables.get(store).set(value.id, value);
      return value.id;
    },
    async delete(store, key) {
      tables.get(store).delete(key);
    },
  };
}

let dbPromise = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        for (const name of STORES) {
          if (!database.objectStoreNames.contains(name)) {
            database.createObjectStore(name, { keyPath: 'id' });
          }
        }
      },
    }).catch(() => memoryDb());
  }
  return dbPromise;
}

/* ---- change notification ------------------------------------------------ */

const listeners = new Set();

/** Returns an unsubscribe. Views re-read the store rather than take a diff. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const announce = (what) => {
  for (const fn of listeners) fn(what);
};

/* ---- saved --------------------------------------------------------------- */

export async function save(slug) {
  await (await db()).put('saved', savedRecord(slug));
  announce('saved');
}

export async function unsave(slug) {
  const d = await db();
  const existing = await d.get('saved', slug);
  await d.put('saved', tombstone(existing ?? savedRecord(slug)));
  announce('saved');
}

export async function toggleSaved(slug) {
  const saved = await isSaved(slug);
  await (saved ? unsave(slug) : save(slug));
  return !saved;
}

export async function isSaved(slug) {
  return isLive(await (await db()).get('saved', slug));
}

/** Slugs, most recently saved first. */
export async function listSaved(limit = Infinity) {
  const rows = await (await db()).getAll('saved');
  return liveByRecency(rows, 'savedAt', limit).map((r) => r.slug);
}

/* ---- reading ------------------------------------------------------------- */

/**
 * Where the reader had got to. `scrollPos` is a document offset in CSS pixels
 * at the width it was recorded at, so it is a hint rather than a promise —
 * restoring it on a narrower screen lands near the place, not on it.
 */
export async function markReading(slug, scrollPos = 0) {
  await (await db()).put('reading', readingRecord(slug, scrollPos));
  announce('reading');
}

/**
 * Records that the reader opened this saint without disturbing where they had
 * got to. Opening is starting to read; it is not starting again from the top.
 */
export async function touchReading(slug) {
  const d = await db();
  const existing = await d.get('reading', slug);
  await d.put('reading', readingRecord(slug, existing?.scrollPos ?? 0));
  announce('reading');
}

export async function getReading(slug) {
  const row = await (await db()).get('reading', slug);
  return isLive(row) ? row : null;
}

export async function listReading(limit = 6) {
  const rows = await (await db()).getAll('reading');
  return liveByRecency(rows, 'lastReadAt', limit);
}

export async function clearReading(slug) {
  const d = await db();
  const existing = await d.get('reading', slug);
  if (existing) await d.put('reading', tombstone(existing));
  announce('reading');
}

/* ---- history ------------------------------------------------------------- */

export async function visit(slug) {
  const d = await db();
  await d.put('history', historyRecord(slug));
  // Pruning on write keeps the cap honest without a scheduled sweep. History
  // is local convenience, so overflow is deleted outright rather than
  // tombstoned: there is nothing for a future sync to reconcile in a visit
  // that has already fallen off the end.
  for (const row of overflow(await d.getAll('history'))) await d.delete('history', row.id);
  announce('history');
}

export async function listHistory(limit = HISTORY_CAP) {
  const rows = await (await db()).getAll('history');
  return liveByRecency(rows, 'visitedAt', limit);
}

export async function clearHistory() {
  const d = await db();
  for (const row of await d.getAll('history')) await d.delete('history', row.id);
  announce('history');
}

/* ---- settings ------------------------------------------------------------ */

/** Synchronous, from the localStorage mirror — the theme needs it pre-paint. */
export const getSettings = readSettings;

export async function setSetting(key, value) {
  const next = writeSetting(key, value);
  await (await db()).put('settings', { id: key, key, value, updatedAt: now() });
  announce('settings');
  return next;
}
