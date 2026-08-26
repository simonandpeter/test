/**
 * The day records, fetched beside the manifest instead of parsed before the
 * first paint (2026-08-27).
 *
 * `liturgical-days.js` is 293 kB of hand-transcribed calendar and was
 * **statically imported**, which put every byte of it in the entry chunk: a
 * reader opening the Map or About downloaded six months of Russian pericopes
 * to look at neither, and a reader opening the Daily page waited for all of it
 * to parse before anything was drawn. HANDOFF has called the eager import the
 * real fix's target since Amendment 44 - "load it lazily and the cut can be
 * reversed".
 *
 * **The load is started at boot, in parallel with the manifest, and awaited
 * with it.** That is the whole trick, and it is why nothing on the page moves:
 * the veil is already up for the manifest, which is the longer wait at 490 kB,
 * so the records arrive inside a wait the reader was making anyway. Deferring
 * them any later would have been visible - the fast chip's *grade* is read out
 * of a day's own note, so a panel painted before the records arrived would
 * have shown an ungraded chip and then changed it under the reader.
 *
 * The two accessors below are synchronous and answer `null` until the module
 * lands, so every caller reads exactly as it did before. If the fetch fails
 * the page keeps its computed half - the fast, the tone, the week - and loses
 * the transcribed half, which is the same shape as a day past the end of the
 * records and already has its own sentence.
 */

let loaded = null;

/** Starts the fetch. Idempotent; returns the same promise on every call. */
export function loadDays() {
  if (!loaded) {
    loaded = import('./liturgical-days.js').then(
      (module) => module,
      (error) => {
        // Not thrown on: the site is readable without the records, and the
        // veil must not be held open by a chunk the page can do without.
        console.error('day records failed to load', error);
        return null;
      },
    );
  }
  return loaded;
}

let records = null;

/** Awaits the fetch and resolves it into the synchronous accessors below. */
export async function readyDays() {
  records = await loadDays();
  return records;
}

/** What one church's calendar recorded for a day, or null. */
export const recordedDay = (iso, churchId) => records?.recordedDay(iso, churchId) ?? null;

/** The last civil date any calendar has been read for, or null before they land. */
export const recordsReach = () => records?.RECORDS_REACH ?? null;
