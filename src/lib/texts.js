/**
 * The Texts page's own small index (`data/texts.json`, `scripts/build-texts.mjs`)
 * — never the manifest, the same reasoning `loadManifestMeta` already gives:
 * which saints carry a primary source is a fact almost no visit needs, so it is
 * its own fetch rather than weight every card pays for.
 */

const url = (rel) => import.meta.env.BASE_URL + rel;

let cached = null;

export async function loadTexts() {
  if (cached) return cached;
  cached = await fetch(url('data/texts.json')).then((res) => {
    if (!res.ok) throw new Error(`${res.url}: HTTP ${res.status}`);
    return res.json();
  });
  return cached;
}
