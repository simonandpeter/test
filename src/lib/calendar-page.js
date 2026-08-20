/**
 * Pure logic for the calendar page: date stepping, week framing, the
 * deterministic hero pick, interval display. No DOM — everything here is
 * unit-tested in Node, and the view is a thin renderer over it.
 */

import { gregorianToJdn, jdnToGregorian, isValidDate } from './jdn.js';
import { toIsoDate } from './feasts.js';
import { STRINGS, fill } from '../ui/strings.js';

export function parseIso(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isValidDate('gregorian', year, month, day) ? { year, month, day } : null;
}

export const todayIso = (now = new Date()) =>
  toIsoDate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });

export function addDaysIso(iso, n) {
  const d = parseIso(iso);
  return toIsoDate(jdnToGregorian(gregorianToJdn(d.year, d.month, d.day) + n));
}

/** Monday-to-Sunday week containing the date. JDN 0 was a Monday. */
export function weekOf(iso) {
  const d = parseIso(iso);
  const jdn = gregorianToJdn(d.year, d.month, d.day);
  const monday = jdn - (jdn % 7);
  return Array.from({ length: 7 }, (_, i) => toIsoDate(jdnToGregorian(monday + i)));
}

/**
 * The saint the day opens on. Deterministic from the date and the day's
 * entries — the same day shows every visitor the same hero, so a shared link
 * is a shared page. Prefers saints that carry an image, silently.
 */
export function pickHero(iso, entries, bySlug) {
  const slugs = [...new Set(entries.map((e) => e.slug))].sort();
  if (slugs.length === 0) return null;
  const withImage = slugs.filter((slug) => bySlug.get(slug)?.image);
  const pool = withImage.length ? withImage : slugs;
  // FNV-1a over the ISO date: stable across sessions and visitors.
  let h = 0x811c9dc5;
  for (const ch of iso) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return pool[(h >>> 0) % pool.length];
}

/** A year interval for display: its own display string, or derived honestly. */
export function formatInterval(iv) {
  if (!iv) return STRINGS.dates.undated;
  if (iv.display) return iv.display;
  const { earliest, latest } = iv;
  if (earliest === null && latest === null) return STRINGS.dates.undated;
  if (earliest === null) return fill(STRINGS.dates.before, { y: latest });
  if (latest === null) return fill(STRINGS.dates.after, { y: earliest });
  if (earliest === latest) return String(earliest);
  return `${earliest}–${latest}`;
}

export function formatLifespan(dates) {
  const birth = formatInterval(dates?.birth);
  const death = formatInterval(dates?.death);
  if (birth === STRINGS.dates.undated && death === STRINGS.dates.undated) {
    return STRINGS.dates.undated;
  }
  return `${birth} – ${death}`;
}
