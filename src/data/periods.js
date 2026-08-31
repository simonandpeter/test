/**
 * Preset spans for the map's timeline (author, 2026-08-31: the "Whole span"
 * button becomes "a preset filter that shows periods of history ... both
 * periods of time and events +- 50 years").
 *
 * Two kinds of entry, exactly as instructed:
 *
 *   a **period** carries `from`/`to` and is used as written — it already has
 *   two ends, so inventing a window around it would be second-guessing the
 *   dates rather than reading them.
 *
 *   an **event** carries a single `year` and is read as that year ± 50,
 *   `EVENT_MARGIN` below. An event is a point in time and a point cannot
 *   filter a range, so the margin is what makes it answerable; ±50 is the
 *   author's own number and is applied in one place rather than baked into
 *   each row, so changing it is one edit.
 *
 * Years are negative for BC, matching `lib/dates.js` and the timeline's own
 * inputs — there is no year 0, but nothing here lands on one.
 *
 * **Not exhaustive and not a periodisation.** These are the spans a reader
 * of *this* corpus is likely to want, ordered oldest-first; they are a
 * convenience over the two handles, never a claim that church history
 * divides here rather than somewhere else.
 */

/** An event is a year; a filter needs a span. The author's own ±50. */
export const EVENT_MARGIN = 50;

export const PERIODS = [
  { id: 'apostolic', kind: 'period', from: 30, to: 100 },
  { id: 'ante-nicene', kind: 'period', from: 100, to: 325 },
  { id: 'great-persecution', kind: 'event', year: 303 },
  { id: 'milan', kind: 'event', year: 313 },
  { id: 'nicaea', kind: 'event', year: 325 },
  { id: 'desert-fathers', kind: 'period', from: 270, to: 500 },
  { id: 'ecumenical-councils', kind: 'period', from: 325, to: 787 },
  { id: 'chalcedon', kind: 'event', year: 451 },
  { id: 'fall-of-rome', kind: 'event', year: 476 },
  { id: 'justinian', kind: 'period', from: 527, to: 565 },
  { id: 'iconoclasm', kind: 'period', from: 726, to: 843 },
  { id: 'triumph-orthodoxy', kind: 'event', year: 843 },
  { id: 'baptism-of-rus', kind: 'event', year: 988 },
  { id: 'great-schism', kind: 'event', year: 1054 },
  { id: 'kyivan-rus', kind: 'period', from: 988, to: 1240 },
  { id: 'sack-of-constantinople', kind: 'event', year: 1204 },
  { id: 'hesychast', kind: 'period', from: 1290, to: 1360 },
  { id: 'fall-of-constantinople', kind: 'event', year: 1453 },
  { id: 'ottoman-period', kind: 'period', from: 1453, to: 1821 },
  { id: 'muscovite', kind: 'period', from: 1450, to: 1700 },
  { id: 'russian-empire', kind: 'period', from: 1721, to: 1917 },
  { id: 'greek-independence', kind: 'event', year: 1821 },
  { id: 'new-martyrs', kind: 'period', from: 1917, to: 1945 },
  { id: 'soviet-persecution', kind: 'event', year: 1937 },
];

/** A preset's own effective span: a period as written, an event ± the margin. */
export const spanOf = (preset) =>
  preset.kind === 'event'
    ? { from: preset.year - EVENT_MARGIN, to: preset.year + EVENT_MARGIN }
    : { from: preset.from, to: preset.to };
