/**
 * Whether this reader has asked for less movement.
 *
 * One line, and its own module because three of the Daily page's parts ask —
 * the roll, the picker and the fast bubble — and none of them owns it. Read
 * fresh each time rather than cached: a reader can change the setting without
 * reloading, and DESIGN.md §6 wants motion *removed* under it, never shortened.
 */
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
