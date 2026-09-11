import { loadDetail } from '../../lib/detail.js';
import { currentLanguage } from '../../lib/i18n.js';
import { firstParagraphText, renderMarkdown, stripLeadingHeading } from '../../lib/markdown.js';
import { DUR } from '../../lib/motion.js';
import { hymnColumnHTML, hymnsOfKinds } from './tiles.js';
import { state } from './state.js';

/**
 * The parts of a saint that are not in the manifest, fetched after paint and
 * written into the boxes `tiles.js` has already drawn (plan §3).
 *
 * The life and the hymns both live in the saint's own payload, so this is one
 * `loadDetail` per saint of the day filling four places in that saint's
 * article: the tile's two-line preview, the card's "From the life" column and
 * the two hymn columns. It is `panel.js`'s `fillRegisterLives` and
 * `record.js`'s `fillSaintHymns` merged, which is the right shape now that
 * the tile and the card are one element — two passes over the same day
 * fetching the same payloads was only ever an artefact of the hero and the
 * register being two renders.
 *
 * **Every write is guarded on the day still being the day.** `state.selected`
 * is re-read at each resolution exactly as `record.js:101` guards it today: a
 * reader who steps a day while a fetch is in flight must not have the
 * previous day's life land in the new day's grid.
 */

/**
 * **The open card's payload is fetched first and the rest wait for an idle
 * moment** (plan §11.7f). Firing `loadDetail` for every saint of the day on
 * paint is N blocking requests competing with first paint, and on a day with
 * sixteen commemorations that is the Lighthouse FCP budget spent on text
 * nobody is reading yet: the folded tiles want two lines of a life, and they
 * can want them a second later. The card the reader is actually looking at
 * does not wait.
 */
const onIdle = (fn) =>
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback(fn, { timeout: DUR.travel })
    : setTimeout(fn, DUR.answer);

const cancelIdle = (handle) => {
  if (handle == null) return;
  if (typeof cancelIdleCallback === 'function') cancelIdleCallback(handle);
  else clearTimeout(handle);
};

/** How many lives are asked for at once, once the open card has its own. */
const LANES = 4;

function fillTile(tile, payload) {
  const preview = firstParagraphText(payload?.life);
  const line = tile.querySelector('[data-line]');
  if (line && preview) line.textContent = preview;

  /*
   * The card's life column gets the life itself rather than the preview
   * again. The column is given a reading depth and let go at the foot — the
   * mask in `daily-tiles.css` — so a whole life in it is not an overflow, it
   * is what the mask is for; a single paragraph under a fade that expects
   * more reads as a page that ran out.
   */
  const life = tile.querySelector('[data-life]');
  if (life && payload?.life) life.innerHTML = renderMarkdown(stripLeadingHeading(payload.life), { headingOffset: 2 });
  else if (life && preview) life.textContent = preview;

  const language = currentLanguage();
  const { troparion, kontakion } = hymnsOfKinds(payload?.saint?.hymns, state.calendar, language);
  const trop = tile.querySelector('[data-hymn="troparion"]');
  const kont = tile.querySelector('[data-hymn="kontakion"]');
  /*
   * Rewritten whether or not a hymn was found: the column was drawn with the
   * "nothing recorded" line already in it, and redrawing it with the same
   * line is how the box keeps its width through the fetch instead of growing
   * into it. Only the contents of the two columns change; the columns
   * themselves are never added or removed, so the four never shift.
   */
  if (trop) trop.innerHTML = hymnColumnHTML('troparion', troparion, language);
  if (kont) kont.innerHTML = hymnColumnHTML('kontakion', kontakion, language);
}

/**
 * Fills the whole day. Returns a teardown the view calls on a day change or
 * on destroy: the in-flight fetches are not abortable — `loadDetail` caches
 * them and another day may want the same saint — so what is cancelled is the
 * *writing*, which is the only part that could be wrong.
 */
export function fillDay(grid, iso) {
  // The grid's own order is the open card first, then the day's — which is
  // exactly the order a reader meets these in.
  const tiles = [...grid.querySelectorAll('.day-tile')];
  if (!tiles.length) return () => {};

  let cancelled = false;
  let idle = null;
  const live = () => !cancelled && state?.selected === iso;

  const fill = async (tile) => {
    try {
      const payload = await loadDetail(tile.dataset.slug);
      if (!live() || !tile.isConnected) return;
      fillTile(tile, payload);
    } catch {
      /*
       * A life that will not load leaves the tile exactly as it was: a name,
       * its dates and the two hymn columns admitting they have nothing —
       * which is what the tile said before the fetch and is not a lie.
       */
    }
  };

  const [first, ...rest] = tiles;
  fill(first);

  idle = onIdle(() => {
    idle = null;
    if (!live()) return;
    const queue = [...rest];
    const lane = async () => {
      while (queue.length && live()) await fill(queue.shift());
    };
    for (let i = 0; i < LANES; i += 1) lane();
  });

  return () => {
    cancelled = true;
    cancelIdle(idle);
    idle = null;
  };
}
