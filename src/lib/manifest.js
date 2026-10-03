/**
 * The manifest is fetched once, on load, and every later question — filtering,
 * searching, mapping, the feast index — is answered from it client-side with
 * no further round-trips (brief §7). Detail payloads (life.md, sources,
 * full-size images) are fetched per saint, on open, in Session 4a.
 */

const url = (rel) => import.meta.env.BASE_URL + rel;

let cached = null;
let cachedMeta = null;
let cachedMentions = null;

export async function loadManifest() {
  if (cached) return cached;
  cached = indexManifest(await fetch(url('data/manifest.json')).then(ok));
  return cached;
}

/**
 * The two lookups every view is handed, built once off the fetched array.
 *
 * **`byAlias` is the slugs that are gone** (2026-10-03, TODO item 13): a merge
 * folds two folders into one and the folded-away slug survives as an alias, so
 * a bookmark of it still opens the saint. It is separate from `bySlug` and
 * consulted only when that misses — an alias may never shadow a live folder,
 * which `scripts/build-manifest.mjs` fails the build over.
 *
 * Exported for `tests/manifest.test.mjs`: the fetch is the only reason
 * `loadManifest` needs a browser, and the indexing is the part with a rule in
 * it.
 *
 * @param manifest the manifest array as fetched
 * @returns `{ saints, bySlug, byAlias }`; `byAlias` maps a dead slug to the
 *   card that claims it
 */
export function indexManifest(manifest) {
  const bySlug = new Map(manifest.map((s) => [s.slug, s]));
  const byAlias = new Map();
  for (const card of manifest) {
    for (const alias of card.aliases ?? []) if (!bySlug.has(alias)) byAlias.set(alias, card);
  }
  return { saints: manifest, bySlug, byAlias };
}

/**
 * The coverage statistics, which **nothing on the boot path reads** (Addendum
 * G1, done 2026-08-28). This was fetched beside the manifest in the same
 * `Promise.all` and hung on `data.meta`, and a sweep of `src/` found no reader:
 * the only other `.meta` in the codebase is `image.meta` in lib/detail.js,
 * which is a different field.
 *
 * It is 1,247 bytes, so the cost was never the payload — it was **a second
 * round trip on the path that blocks first paint**, taken on every visit for a
 * page that does not exist yet. About's statistics are Session 9's, and this is
 * what that session calls when it gets there.
 */
/**
 * `mentionedIn` for every saint who has it, fetched on demand and written onto
 * the cards the manifest already handed out.
 *
 * **Off the boot path on purpose** (3 October 2026). It is `related` read
 * backwards, it was a field on 2,971 cards, and at 51 kB gzipped of the
 * manifest's 419 kB it was costing every first paint about 250 ms on the
 * floor's 1.6 Mbit/s line — on four routes out of six that never read it. CI's
 * FCP floor is what found it: 1,356 ms to 1,507 ms against a 1,500 ms line, on
 * every route alike, as the corpus grew.
 *
 * It is assigned onto the cards rather than returned as a map because
 * `prayer-order.js`, `views/prayer/find.js` and `views/saint.js` all read
 * `card.mentionedIn` synchronously, from call sites that have no way to await.
 * A route that draws a relation awaits this first; one that does not sees the
 * field absent, which is exactly what it saw for a saint who is named nowhere.
 *
 * Resolves to false where the fetch fails: a page without its reverse links is
 * a page missing a list, not a page that cannot be read.
 */
export async function loadMentions() {
  cachedMentions ??= (async () => {
    const { bySlug } = await loadManifest();
    const mentions = await fetch(url('data/mentions.json')).then(ok);
    for (const [slug, from] of Object.entries(mentions)) {
      const card = bySlug.get(slug);
      if (card) card.mentionedIn = from;
    }
    return true;
  })().catch(() => false);
  return cachedMentions;
}

export async function loadManifestMeta() {
  cachedMeta ??= await fetch(url('data/manifest.meta.json')).then(ok);
  return cachedMeta;
}

function ok(res) {
  if (!res.ok) throw new Error(`${res.url}: HTTP ${res.status}`);
  return res.json();
}
