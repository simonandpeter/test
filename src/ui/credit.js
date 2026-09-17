import { isPlaceholderSource, licenceIsSettled, requiresAttribution } from '../lib/licence.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { STRINGS, fill } from './strings.js';

/**
 * What we can say about this image, and no more. A licence that obliges
 * attribution and has none is an unresolved question and says so; a
 * public-domain work owes nobody a credit and simply names its licence.
 *
 * The source link is printed only when it is a real one. A placeholder is in
 * these files on purpose (lib/licence.js) and must not be handed to a reader
 * as though it led somewhere.
 */
export function creditLine(meta) {
  if (!meta || !licenceIsSettled(meta.licence)) {
    return `<span class="unrecorded">${STRINGS.saint.creditUnrecorded}</span>`;
  }
  if (requiresAttribution(meta.licence) && !meta.credit) {
    return `<span class="unrecorded">${STRINGS.saint.creditUnrecorded}</span>`;
  }

  const text = meta.credit
    ? fill(STRINGS.saint.credit, { credit: esc(meta.credit), licence: esc(meta.licence) })
    : esc(meta.licence);
  const linkable = meta.source_url && !isPlaceholderSource(meta.source_url);
  return linkable ? `<a href="${esc(meta.source_url)}" rel="noopener noreferrer">${text}</a>` : text;
}
