/**
 * The honorific in front of a saint's name (author, 2026-08-24): the corpus is
 * saints, so every name is read with "St" before it, and the rank — martyr,
 * hieromartyr, presbyter, hierarch — is a category in the profile rather than
 * part of the name. The rank already lives in `types` and is printed on the
 * saint page's facts line; nothing here touches it.
 *
 * This is applied when a name is drawn, never written into the data. The
 * manifest keeps the bare name, so sorting still files a saint under their own
 * initial rather than filing all 708 under S, and search still matches what
 * the reader types.
 */

/**
 * A collective is not given the honorific. "The Fifty Martyrs of Palestine" is
 * a company, and "St The Fifty Martyrs" is not English; there are 26 of these
 * in the corpus and they all announce themselves with a leading article.
 */
const isCollective = (name) => /^The\s/.test(name);

/** "John Chrysostom" → "St John Chrysostom"; a collective is returned unchanged. */
export function withHonorific(displayName) {
  const name = String(displayName ?? '');
  if (!name || isCollective(name)) return name;
  if (/^(St|Saint)\s/.test(name)) return name;
  return `St ${name}`;
}
