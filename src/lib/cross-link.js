/**
 * Saints named inside a life, linked to their own pages (author, 2026-08-26:
 * "In each Saint Profile, automatically scan for names of other saints to
 * hyperlink to their profile, e.g. St Ignatius the God-bearer in St Titus the
 * Apostle's profile page").
 *
 * Lives already carry hand-written links — `[Athanasius of
 * Alexandria](/saints/athanasius-of-alexandria)` — put in as each was written.
 * This finds the ones nobody remembered, and it is deliberately timid about
 * it, because a wrong link on a hagiography is a claim that two people are one
 * person, which is the exact error this corpus spends most of its care
 * avoiding (Amendment 45's dedupe key is the same problem wearing a different
 * hat).
 *
 * **Four rules, and each was earned by measuring rather than guessed.**
 * `scripts/cross-link-audit.mjs` runs the finished index over all 742 lives and
 * prints every link it would make; the rules below are what that run had to be
 * narrowed to before every single one of them was right.
 *
 * 1. **The name is cut at the first comma or bracket.** The corpus files a new
 *    martyr as "Ignatius (Lebedev), Schema-archimandrite, Monk-martyr (1938)",
 *    which no life will ever write out. What a life writes is the head of it.
 *
 * 2. **One word is never enough.** 43 folders are a single name — Christopher,
 *    Laurence, Faustus — and a life mentioning a Laurence is not thereby
 *    mentioning *that* Laurence. Two words is the shortest form that carries
 *    its own disambiguation ("of Alexandria", "the Great", a surname).
 *
 * 3. **No regnal numerals.** "John II" matched `john-ii-metropolitan-of-kyiv`
 *    inside the phrase "the emperor John II Komnenos" in Irene the Empress's
 *    life — a Kyivan metropolitan offered as a Byzantine emperor. Numerals are
 *    shared by emperors, patriarchs and metropolitans of the same name, and
 *    the corpus holds several of each; it is the one shape where two words are
 *    not disambiguation. This was the only false positive in the whole corpus
 *    and it is the reason this rule exists.
 *
 * 4. **A form two saints share links to neither.** Seven do — "Alexander the
 *    Presbyter", "John the Presbyter" and five more, all new martyrs of the
 *    1930s whose folders differ only by a year. Silence is right: the site
 *    cannot tell which is meant, and neither can the reader from a link.
 *
 * On top of those, at link time: never the saint whose own page this is, never
 * inside a link the life already has, and only the first mention of each — a
 * paragraph naming Athanasius four times wants one link, not four.
 */

/** Roman numerals as a word: I, V, X, L, C in the combinations these names use. */
const ROMAN = /^[IVXLC]+$/;

/** The part of a display name a life would actually write. */
export const matchableName = (name) => String(name ?? '').split(/[(,]/)[0].trim();

/** Whether a form is distinctive enough to link on. Rules 2 and 3 above. */
export function usableName(form) {
  const words = String(form ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  return !words.some((w) => ROMAN.test(w));
}

/**
 * The index, built once from the manifest: every usable form to the one slug
 * that owns it, and a pattern that finds them longest-first — so "Athanasius
 * of Alexandria" wins over any shorter form inside it.
 */
export function buildNameIndex(saints) {
  const bySlug = new Map();
  for (const saint of saints ?? []) {
    const form = matchableName(saint.display_name);
    if (!usableName(form)) continue;
    // Rule 4: the second claimant poisons the form rather than losing to the
    // first, so which folder happens to be earlier in the manifest decides
    // nothing.
    if (bySlug.has(form)) bySlug.set(form, null);
    else bySlug.set(form, saint.slug);
  }
  const forms = [...bySlug.entries()]
    .filter(([, slug]) => slug)
    .map(([form]) => form)
    .sort((a, b) => b.length - a.length);
  if (!forms.length) return { bySlug, pattern: null };
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /*
   * Letter boundaries rather than `\b`: JavaScript's word boundary is
   * ASCII-only, so a name ending in a non-ASCII letter would match inside a
   * longer word. Amendment 41 is the same finding in Greek, and it is written
   * down here so the next person to reach for `\b` in this repository meets it
   * a third time.
   */
  return { bySlug, pattern: new RegExp(`(?<!\\p{L})(${forms.map(escape).join('|')})(?!\\p{L})`, 'gu') };
}

/* One index per manifest; the pattern is 363 alternatives and is not worth
   rebuilding per saint opened. Keyed on the array itself, which lib/manifest.js
   caches for the life of the page. */
const cache = new WeakMap();

export function nameIndex(saints) {
  if (!saints) return { bySlug: new Map(), pattern: null };
  if (!cache.has(saints)) cache.set(saints, buildNameIndex(saints));
  return cache.get(saints);
}

/** Elements whose text is not prose and must not be rewritten. */
const CLOSED = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE']);

/**
 * Links every other saint named in `root`, in place. `href` turns a slug into
 * the site's own URL (the router owns the base path); `skipSlug` is the saint
 * whose page this is.
 */
export function linkSaintNames(root, { saints, skipSlug, href }) {
  const { bySlug, pattern } = nameIndex(saints);
  if (!root || !pattern) return 0;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest([...CLOSED].join(','))
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  // Collected before any of them is replaced: a TreeWalker over a tree being
  // rewritten under it is a walk with no defined end.
  const texts = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node);

  const linked = new Set(skipSlug ? [skipSlug] : []);
  let made = 0;

  for (const node of texts) {
    const text = node.nodeValue;
    pattern.lastIndex = 0;
    if (!pattern.test(text)) continue;
    pattern.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let at = 0;
    for (const match of text.matchAll(pattern)) {
      const slug = bySlug.get(match[1]);
      if (!slug || linked.has(slug)) continue;
      linked.add(slug);
      made += 1;
      frag.append(text.slice(at, match.index));
      const a = document.createElement('a');
      a.href = href(slug);
      a.textContent = match[1];
      a.dataset.prefetch = slug;
      a.dataset.crossLink = '';
      frag.append(a);
      at = match.index + match[1].length;
    }
    if (!at) continue;
    frag.append(text.slice(at));
    node.replaceWith(frag);
  }
  return made;
}
