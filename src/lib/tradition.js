/**
 * Which traditions the reader is reading in (author, 2026-08-21), and since
 * 2026-08-22 which one calendar the calendar page shows.
 *
 * The calendar used to offer four reckonings and print the day in the chosen
 * one. That is withdrawn; what a reader is asked instead is which communion
 * they keep, and the site — the calendar, the Index, the saint's page — shows
 * accordingly. It is the same question the site is organised around, asked of
 * the reader rather than of the corpus.
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
 * in the same control that caused it.
 *
 * **The calendar the page shows is a second, separate choice** (author,
 * 2026-08-22, Addendum H8): one church, from those the selection allows, asked
 * for before the week or month can be seen. `settings.calendar` holds it and
 * is kept even while the selection does not allow it, so widening the
 * selection again finds it still chosen.
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

/**
 * The one live copy of the reader's selection. Every consumer — the calendar,
 * the Index, the saint's page, the map when it comes — reads through here, so
 * there is no view-local cache to drift from another's. Lazy, so importing
 * the module does not read storage as a side effect.
 */
let current = null;

export function currentSelection() {
  return (current ??= readSelection());
}

/* ---- change notification ------------------------------------------------ */

/**
 * The header's control can change the selection while any view is on screen,
 * so a view that respects it subscribes on render and unsubscribes on
 * destroy, and repaints from `currentSelection()` when told. Returns the
 * unsubscribe.
 */
const listeners = new Set();

export function subscribeSelection(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function writeSelection(selection) {
  current = selection;
  writeSetting('traditions', [...selection]);
  for (const fn of listeners) fn(selection);
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

/**
 * What a communion's switch shows: on when every church in it is selected,
 * off when none is, and mixed in between — a fact about the row, carried by
 * `aria-pressed="mixed"` and said in the underline rather than a third colour.
 */
export function communionState(selection, communionId) {
  const ids = churchesInCommunion(communionId).map((c) => c.id);
  const on = ids.filter((id) => selection.has(id)).length;
  return on === 0 ? 'off' : on === ids.length ? 'on' : 'mixed';
}

/* ---- what it does, and what it is called -------------------------------- */

/** The day's commemorations, narrowed to the reader's traditions. */
export const filterEntries = (entries, selection) =>
  entries.filter((e) => selection.has(e.church));

/**
 * Whether a saint is one of the reader's traditions': venerated by a church in
 * the selection. With everything selected nothing is filtered at all — a
 * figure every church refuses is still a figure in the corpus, and a filter
 * that hid him under "all" would be adjudicating by accident.
 */
export const venerates = (card, selection) =>
  isAll(selection) ||
  (card.attestations ?? []).some((a) => a.status === 'venerated' && selection.has(a.church));

/**
 * What a status line says. Everything selected names itself as such; a
 * narrowed selection names itself as briefly as it honestly can — a communion
 * by its own name when the whole of it is on and nothing else is, and the
 * churches themselves otherwise.
 */
export function selectionLabel(selection) {
  if (isAll(selection)) return STRINGS.traditions.all;
  if (selection.size === 0) return STRINGS.traditions.none;

  const whole = enabledCommunions().filter((communion) =>
    churchesInCommunion(communion.id).every((c) => selection.has(c.id)),
  );
  const covered = new Set(whole.flatMap((c) => churchesInCommunion(c.id).map((x) => x.id)));
  const loose = [...selection].filter((id) => !covered.has(id));

  const names = [
    ...whole.map((c) => c.display_name),
    ...loose.map((id) => CHURCHES_BY_ID[id]?.display_name).filter(Boolean),
  ];
  return fill(STRINGS.traditions.showing, { names: names.join(', ') });
}

/* ---- the calendar the page shows (author, 2026-08-22) ------------------- */

/** The churches whose calendars the selection allows, in registry order. */
export const allowedCalendars = (selection = currentSelection()) =>
  enabledChurches().filter((c) => selection.has(c.id));

export const storedCalendar = () => {
  const id = readSettings().calendar;
  return typeof id === 'string' && CHURCHES_BY_ID[id] ? id : null;
};

/**
 * The calendar to show, or null if the reader has to be asked: the stored one
 * if the selection still allows it; the only allowed one if there is exactly
 * one — a question with one answer is not a question; otherwise nothing.
 */
export function chosenCalendar(selection = currentSelection()) {
  const allowed = allowedCalendars(selection);
  const stored = storedCalendar();
  if (stored && allowed.some((c) => c.id === stored)) return stored;
  if (allowed.length === 1) return allowed[0].id;
  return null;
}

export function chooseCalendar(id) {
  writeSetting('calendar', id);
  return id;
}

/** One calendar's share of a day: the entries the chosen church keeps. */
export const entriesInCalendar = (entries, churchId) =>
  churchId ? entries.filter((e) => e.church === churchId) : [];
