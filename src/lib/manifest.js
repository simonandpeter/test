/**
 * The manifest is fetched once, on load, and every later question — filtering,
 * searching, mapping, the feast index — is answered from it client-side with
 * no further round-trips (brief §7). Detail payloads (life.md, sources,
 * full-size images) are fetched per saint, on open, in Session 4a.
 */

const url = (rel) => import.meta.env.BASE_URL + rel;

let cached = null;

export async function loadManifest() {
  if (cached) return cached;
  const [manifest, meta] = await Promise.all([
    fetch(url('data/manifest.json')).then(ok),
    fetch(url('data/manifest.meta.json')).then(ok),
  ]);
  const bySlug = new Map(manifest.map((s) => [s.slug, s]));
  cached = { saints: manifest, meta, bySlug };
  return cached;
}

function ok(res) {
  if (!res.ok) throw new Error(`${res.url}: HTTP ${res.status}`);
  return res.json();
}
