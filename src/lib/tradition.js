/**
 * Which traditions the reader is reading in (author, 2026-08-21).
 *
 * The calendar used to offer four reckonings and print the day in the chosen
 * one. That is withdrawn; what a reader is asked instead is which communion
 * they keep — or that they want all of them — and the day's commemorations are
 * shown accordingly. It is the same question the site is organised around,
 * asked of the reader rather than of the corpus.
 *
 * The selection is **a set of churches**, not of communions, because that is
 * what an attestation names. A communion toggle and a rite toggle are both
 * shorthands that resolve to churches here, so there is one kind of thing in
 * the set and one place that decides what is in it.
 *
 * `settings.traditions` holds it: `null` when the reader has never been asked,
 * an array of church ids once they have. The two are different states on
 * purpose — "everything, because I chose everything" and "everything, because
 * nobody has asked yet" look the same on the calendar and only one of them
 * should raise the question.
 *
 * An empty selection is allowed. It shows the empty-day state on every day,
 * which is a designed state (DESIGN.md §5b) and is one click from being undone
 * in the same panel that caused it.
 */

import { CHURCHES_BY_ID, enabledChurches, enabledCommunions, churchesInCommunion } from '../data/churches.js';
import { readSettings, writeSetting } from './settings.js';
import { STRINGS, fill } from '../ui/strings.js';

export const allChurchIds = () => enabledChurches().map((c) => c.id);

/** Null until the reader has been asked. Anything else is their answer. */
export const storedTraditions = () => {
  const stored = readSettings().traditions;
  return Array.isArray(stored) ? stored : null;
};

export const hasChosen = () => storedTraditions() !== null;

/**
 * Ids the registry no longer holds are dropped rather than kept: a church that
 * has been disabled since the reader chose is not a filter any more, and
 * leaving it in the set would make `isAll` wrong for ever after.
 */
export function readSelection() {
  const stored = storedTraditions();
  if (stored === null) return new Set(allChurchIds());
  const live = new Set(allChurchIds());
  return new Set(stored.filter((id) => live.has(id)));
}

export function writeSelection(selection) {
  writeSetting('traditions', [...selection]);
  return selection;
}

export const isAll = (selection) => selection.size === allChurchIds().length;

/* ---- toggles ------------------------------------------------------------ */

const flip = (selection, ids, on) => {
  const next = new Set(selection);
  for (const id of ids) (on ? next.add(id) : next.delete(id));
  return next;
};

/**
 * One church, on or off — and a church is one toggle however many cells it
 * holds. Eastern Catholic occupies six positions from a single registry entry,
 * so all six answer together; six independent switches would be six findings
 * where the registry has one (DESIGN.md §7b).
 */
export const toggleChurch = (selection, id) =>
  flip(selection, [id], !selection.has(id));

/** A whole row: all of it off if all of it is on, all of it on otherwise. */
export function toggleCommunion(selection, communionId) {
  const ids = churchesInCommunion(communionId).map((c) => c.id);
  return flip(selection, ids, !ids.every((id) => selection.has(id)));
}

/** A whole column, across communions — "everything Byzantine", in one press. */
export function toggleRite(selection, riteId) {
  const ids = enabledChurches()
    .filter((c) => c.rites.includes(riteId))
    .map((c) => c.id);
  return flip(selection, ids, !ids.every((id) => selection.has(id)));
}

export const selectAll = () => new Set(allChurchIds());

export const selectCommunion = (communionId) =>
  new Set(churchesInCommunion(communionId).map((c) => c.id));

/* ---- what it does, and what it is called -------------------------------- */

/** The day's commemorations, narrowed to the reader's traditions. */
export const filterEntries = (entries, selection) =>
  entries.filter((e) => selection.has(e.church));

/**
 * What the button says. Everything selected is the invitation rather than a
 * report — there is nothing to report — and a narrowed selection names itself
 * as briefly as it honestly can: a communion by its own name when the whole of
 * it is on and nothing else is, and the churches themselves otherwise.
 */
export function selectionLabel(selection) {
  if (isAll(selection)) return STRINGS.filter.all;
  if (selection.size === 0) return STRINGS.filter.none;

  const whole = enabledCommunions().filter((communion) =>
    churchesInCommunion(communion.id).every((c) => selection.has(c.id)),
  );
  const covered = new Set(whole.flatMap((c) => churchesInCommunion(c.id).map((x) => x.id)));
  const loose = [...selection].filter((id) => !covered.has(id));

  const names = [
    ...whole.map((c) => c.display_name),
    ...loose.map((id) => CHURCHES_BY_ID[id]?.display_name).filter(Boolean),
  ];
  return fill(STRINGS.filter.showing, { names: names.join(', ') });
}
