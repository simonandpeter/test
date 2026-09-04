/**
 * Whether this reader has asked for less movement.
 *
 * One line, and its own module because ten parts of the site ask — the
 * Daily page's roll, picker and fast bubble, the carousel's loop, the grain,
 * the shelf, the chooser panels' flight, the coachmarks and the map — and
 * none of them owns it. Until 2026-09-05 eight of them carried their own
 * copy of this line; DESIGN.md §6 wants motion *removed* under it, never
 * shortened, and eight copies were eight chances to get that wrong once.
 *
 * Read fresh each time rather than cached: a reader can change the setting
 * without reloading. Guarded on `matchMedia` existing (the map's own copy
 * had that, the others did not), so a module that reaches this without a
 * window — a unit test, a worker — reads "no preference" rather than
 * throwing.
 */
export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
