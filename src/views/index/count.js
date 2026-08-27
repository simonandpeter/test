import { saintName } from '../../lib/honorific.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { fill, STRINGS } from '../../ui/strings.js';
import { readerHasFiltered } from './filter.js';
import { state } from './state.js';

/**
 * The count line, and the tray of saints a date range set aside.
 *
 * One line saying what is listed out of what there is, tweened when the number
 * changes. The tray beneath it is the undated: a saint with no bound at either
 * end fails every range, so a range filter would silently delete them — they
 * are counted and named instead.
 */

/**
 * The count animates (brief §8.2) but is announced once: a live region ticking
 * through every intermediate number would be unusable, so the tween is
 * aria-hidden and the final figure is what a screen reader is told.
 */
export function paintCount(next, animate) {
  const row = state.el.querySelector('[data-count-row]');
  if (!row.firstChild) {
    row.innerHTML = `<span data-count aria-hidden="true">0</span>
      <span aria-hidden="true">${STRINGS.saints.countLabel}</span>
      <span class="sr-only" aria-live="polite" data-count-live></span>`;
  }
  const value = row.querySelector('[data-count]');
  const liveRegion = row.querySelector('[data-count-live]');
  liveRegion.textContent = fill(STRINGS.saints.countAnnounce, { count: next });

  const from = state.shown ?? 0;
  state.shown = next;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reduced || from === next) {
    value.textContent = String(next);
    return;
  }

  const started = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - started) / 200);
    value.textContent = String(Math.round(from + (next - from) * t));
    if (t < 1 && state) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * The undated tray (Addendum F). A date range cannot include or exclude a
 * saint with no bound at either end, so they are set aside and counted rather
 * than silently dropped — an honest gap, styled as one.
 */
export function paintTray(undated) {
  const tray = state.el.querySelector('[data-tray]');
  if (!undated.length) {
    tray.innerHTML = '';
    return;
  }
  tray.innerHTML = `<details class="tray">
    <summary>${fill(STRINGS.saints.undatedTray, { count: undated.length })}</summary>
    <p class="utility">${STRINGS.saints.undatedNote}</p>
    <ul class="register">
      ${undated
        .map(
          (c) => `<li><a class="reg-name" href="${state.router.href(`/saints/${c.slug}`)}"
            data-prefetch="${esc(c.slug)}">${esc(saintName(c))}</a></li>`,
        )
        .join('')}
    </ul>
  </details>`;
}

/**
 * What the page says about what it found: the count line, the Clear button,
 * the empty note, and the tray beneath them.
 *
 * This was the second third of `update()`. It reports the answer `matching()`
 * works out, and it is here rather than there because reporting is not
 * deciding — the same numbers could be said in a different place without
 * changing which saints matched.
 */
export function paintSummary({ matched, undated }, { animate }) {
  const { el, cards, filters } = state;
  const S = STRINGS.saints;
  const asideNote = el.querySelector('[data-set-aside]');
  /*
   * **One count line, and it is a ratio** (author, 2026-08-27). It stood as two
   * — a tweened "127 saints" over "Of 742, 127 saints are in the Romanian
   * calendar" — which was the same number twice in the state the Index opens
   * in, and Amendment 49 answered that by hiding whichever was redundant. The
   * author's answer is better: one line saying what is listed out of what
   * there is, which is true whether the narrowing came from the church, from a
   * filter, or from both.
   *
   * The numerator is `matched`, not the church's own count, which is what lets
   * the tweened line go: a filtered page keeps its real number here.
   */
  /*
   * **The denominator recedes** (author, 2026-08-28: "make the '/742', the
   * total number of saints and the '/', a considerably darker / lighter
   * (depending on the light mode) font colour so the main number that stands
   * out is the number listed by the current filters"). The numerator is what
   * the reader's filters just did; the total is the constant behind it.
   *
   * Done by wrapping the substring rather than by giving the pack a second
   * template, because all five write the ratio the same way — `{shown}/{total}`
   * — and a pack that ever moves the slash away from the total keeps a working
   * line, just an undimmed one. The text is escaped first and the span is
   * added after, so the wrapping cannot smuggle markup out of a translation.
   */
  const total = String(cards.length);
  const line = esc(fill(S.listed, { shown: matched.length, total }));
  asideNote.innerHTML = line.replace(`/${total}`, `<span class="count-of">/${total}</span>`);
  asideNote.title = S.keptTitle;
  /*
   * The tweened row stays in the DOM and out of sight. Its visible number was
   * what the author asked to remove; what it also carries is the `aria-live`
   * region that announces the count as filters change, and a reader who cannot
   * see the line is the one reader who needs that most.
   */
  el.querySelector('[data-clear]').hidden = !readerHasFiltered(filters, state.facets?.churches);
  el.querySelector('[data-empty]').hidden = matched.length > 0;
  paintCount(matched.length, animate);
  paintTray(undated);
}
