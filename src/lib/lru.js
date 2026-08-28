/**
 * Least-recently-used eviction for a `Map` used as a cache (Addendum G4).
 *
 * Its own module because it is pure and `lib/detail.js` is not — that file
 * reads `import.meta.env.BASE_URL` at module scope, so importing it under
 * `node --test` fails before a single assertion runs. An eviction policy that
 * is wrong by one is invisible until a reader loses a page they just looked at,
 * which is exactly the kind of thing worth pinning as arithmetic rather than
 * inferring from a browser test.
 *
 * A `Map` iterates in insertion order, so re-inserting an entry on a *hit* is
 * what makes "the oldest key" mean "the least recently used one". The caller
 * does that; this only trims.
 */
export function evictOldest(map, cap) {
  while (map.size > cap) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) return map;
    map.delete(oldest);
  }
  return map;
}
