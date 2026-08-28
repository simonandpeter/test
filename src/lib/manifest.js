/**
 * The manifest is fetched once, on load, and every later question — filtering,
 * searching, mapping, the feast index — is answered from it client-side with
 * no further round-trips (brief §7). Detail payloads (life.md, sources,
 * full-size images) are fetched per saint, on open, in Session 4a.
 */

const url = (rel) => import.meta.env.BASE_URL + rel;

let cached = null;
let cachedMeta = null;

export async function loadManifest() {
  if (cached) return cached;
  const manifest = await fetch(url('data/manifest.json')).then(ok);
  const bySlug = new Map(manifest.map((s) => [s.slug, s]));
  cached = { saints: manifest, bySlug };
  return cached;
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
export async function loadManifestMeta() {
  cachedMeta ??= await fetch(url('data/manifest.meta.json')).then(ok);
  return cachedMeta;
}

function ok(res) {
  if (!res.ok) throw new Error(`${res.url}: HTTP ${res.status}`);
  return res.json();
}
