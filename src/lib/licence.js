/**
 * What a licence obliges, in one place, because two very different consumers
 * need the same answer: the build decides what to warn about, and the detail
 * page decides what to print under an image. If they disagreed, the site would
 * be claiming something the build had not checked.
 */

/**
 * The Creative Commons tools that dedicate a work to the public domain rather
 * than licensing it: CC0 waives the author's rights, the Public Domain Mark
 * labels a work whose copyright has expired. Neither obliges attribution, and
 * demanding a credit for one would be inventing an obligation.
 */
const NO_ATTRIBUTION = /^(cc0|public domain mark|public domain)/i;

/** A family name is not a licence: "Creative Commons" spans CC0 and CC BY-SA. */
export const licenceIsSettled = (licence) =>
  !!licence && licence !== 'unknown' && !/not recorded|unspecified/i.test(licence);

export const requiresAttribution = (licence) =>
  licenceIsSettled(licence) && !NO_ATTRIBUTION.test(licence);

/**
 * A stand-in for a source link we have not recorded yet, so the field can be
 * exercised before the real ones are in hand (author's instruction,
 * 2026-08-21). `.invalid` is reserved by RFC 2606 and can never resolve, which
 * is the point: a placeholder that could be mistaken for a source is worse
 * than an empty field, and this one announces itself to the build, to the page
 * and to anyone reading the file.
 *
 * The build keeps warning while it is in place, so replacing it stays on the
 * list rather than quietly becoming the answer.
 */
export const PLACEHOLDER_SOURCE = 'https://example.invalid/source-to-be-recorded';

export const isPlaceholderSource = (url) => /example\.invalid/i.test(url ?? '');
