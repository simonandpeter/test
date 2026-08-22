/**
 * Which church the reader keeps (author, 2026-08-22): one of the registry's
 * three — Russian, Romanian or Greek — and with it which calendar, because
 * the calendar follows the church (DESIGN.md §5b). One choice for the whole
 * site: the calendar page shows that church's calendar, the Index keeps that
 * church's saints and names what it sets aside, the saint's page reads that
 * church's register first. Asked once on a first visit, changed from the
 * header; `settings.church` holds it, `null` until the reader has answered.
 *
 * This replaces lib/tradition.js — a set of churches with communion and rite
 * toggles, and a separate calendar choice beneath it. A one-communion corpus
 * reads one church at a time, so what is left is Amendment 23's "one calendar
 * at a time" with the layer above it removed: the choice is the calendar.
 */

import { CHURCHES_BY_ID, enabledChurches } from '../data/churches.js';
import { readSettings, writeSetting } from './settings.js';

export const churchIds = () => enabledChurches().map((c) => c.id);

/** The stored choice, if the registry still holds it; null otherwise. */
export function storedChurch() {
  const id = readSettings().church;
  const church = typeof id === 'string' ? CHURCHES_BY_ID[id] : null;
  return church && church.enabled !== false ? id : null;
}

/** Null until the reader has answered; a church id once they have. */
export const hasChosen = () => storedChurch() !== null;

/**
 * The one live copy. Every consumer — the calendar, the Index, the saint's
 * page, the map — reads through here, so no view holds a copy to drift from
 * another's. Lazy: importing the module does not read storage.
 */
let current;

export function currentChurch() {
  if (current === undefined) current = storedChurch();
  return current;
}

/* ---- change notification ------------------------------------------------ */

const listeners = new Set();

/** Views that read the church subscribe on render and unsubscribe on destroy. */
export function subscribeChurch(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function chooseChurch(id) {
  if (!CHURCHES_BY_ID[id]) throw new Error(`Unknown church: ${id}`);
  current = id;
  writeSetting('church', id);
  for (const fn of listeners) fn(id);
  return id;
}

export const churchName = (id) => CHURCHES_BY_ID[id]?.display_name ?? '';

/* ---- what it does ------------------------------------------------------- */

/** One church's share of a day: the entries that church's calendar keeps. */
export const entriesInChurch = (entries, churchId) =>
  churchId ? entries.filter((e) => e.church === churchId) : [];

/**
 * Whether a saint stands in this church's calendar: an attestation of
 * veneration by it. No church chosen yet keeps everything — an unanswered
 * reader has set nothing aside, and a filter that hid anyone before the
 * question was answered would be adjudicating by accident.
 */
export const keptBy = (card, churchId) =>
  !churchId ||
  (card.attestations ?? []).some((a) => a.church === churchId && a.status === 'venerated');
