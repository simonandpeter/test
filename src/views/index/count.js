import { prefetch } from '../../lib/detail.js';
import { saintName } from '../../lib/honorific.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { STRINGS, fill } from '../../ui/strings.js';
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
