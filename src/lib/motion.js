/**
 * Whether this reader has asked for less movement.
 *
 * One line, and its own module because ten parts of the site ask — the
 * Daily page's roll, picker and fast bubble, the carousel's loop, the grain,
 * the shelf, the chooser panels' flight, the coachmarks and the map — and
 * none of them owns it. Until 2026-09-05 eight of them carried their own
 * copy of this line; PLAN.md wants motion *removed* under it, never
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

/**
 * The motion scale, for the half of it that lives in JavaScript.
 *
 * `src/styles/tokens.css` is the same numbers for CSS, and
 * `tests/design-tokens.test.mjs` holds the two files to each other — a tween
 * hand-rolled here and a transition declared there are routinely the same
 * movement (the mode fade's length is read by `views/index/modes.js` and
 * declared in `index.css`), and two copies of a number is how twelve durations
 * happened in the first place.
 *
 * PLAN.md's Motion section is what the names mean. Reach for the name, not the
 * number.
 */
export const DUR = {
  /** A control acknowledging a press. */
  answer: 140,
  /** The standard: a panel, a chip, a fade. */
  move: 200,
  /** Something arriving on or leaving the page. */
  settle: 300,
  /** A journey across the screen: a flight, a glide. */
  travel: 450,
  /** The whole page changing face: the two-layer stage's swap. */
  swap: 620,
  /** Content arriving on its own account, with no gesture behind it. */
  linger: 900,
};

/**
 * The easing half of the same scale, for the same reason.
 *
 * Until 2026-09-08 the durations lived here and the curves did not, so
 * `ui/fly.js` carried `--ease-soft`'s exact curve as a string literal and
 * `ui/roll.js` had a fifth one nobody had written down. A scale with half its
 * values outside it is a naming convention.
 *
 * `--ease-turn` is the die's, and it is here rather than folded into one of
 * the others because it is the only symmetric curve on the site: one full
 * rotation reads as a turn only if it accelerates and decelerates equally,
 * where every other movement on the site is asymmetric on purpose.
 */
export const EASE = {
  /** The default: decisive, arrives calm. */
  base: 'cubic-bezier(0.2, 0, 0, 1)',
  /** Leaves at once, eases in to rest. */
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Long fades: nothing decided. */
  soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** The one overshoot. */
  spring: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)',
  /** One full turn: symmetric, so it reads as a rotation and not a wind-up. */
  turn: 'cubic-bezier(0.45, 0, 0.25, 1)',
};
