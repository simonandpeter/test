import test from 'node:test';
import assert from 'node:assert/strict';
import { pickNameForms } from '../src/lib/saint-name.js';

/*
 * The choosing that turns a folder's recorded name forms into one display
 * name per language (author, 2026-08-26). It runs at build time, into the
 * manifest, so this is where it is checked — the runtime is a lookup.
 */

test('a recorded form is used, with its honorific and rank stripped', () => {
  const names = [
    { form: 'Феврония Муромская', lang: 'ru' },
    { form: 'Sfântul Sfințit Mucenic Antim, Episcopul Nicomidiei', lang: 'ro' },
    { form: 'Άγιος Άνθιμος Ιερομάρτυρας επίσκοπος Νικομήδειας', lang: 'el' },
    { form: 'Преп. Аврамије Смоленски', lang: 'sr' },
  ];
  assert.deepEqual(pickNameForms(names, 'Anthimus, Bishop of Nicomedia'), {
    ru: 'Феврония Муромская',
    // The site prints its own "Sf." / "Άγ." / "Св.", so the entry's own
    // honorific and rank come off: «Св. Св. Аврамије» is what leaving them in
    // produces. A comma is left alone — it is an apposition here, not a list.
    ro: 'Antim, Episcopul Nicomidiei',
    el: 'Άνθιμος Ιερομάρτυρας επίσκοπος Νικομήδειας',
    sr: 'Аврамије Смоленски',
  });
});

test('a form naming the whole company is not one saint’s name', () => {
  /*
   * The Greek entry for Agathocleia is the day's whole company —
   * «Άγιοι Εύοδος, Καλλίστη, Αγαθόκλεια και Ερμογένης» — and printing it over
   * her alone would be a false claim about who is commemorated. 65 of the 331
   * Greek forms are entries like this.
   */
  const names = [{ form: 'Άγιοι Εύοδος, Καλλίστη, Αγαθόκλεια και Ερμογένης', lang: 'el' }];
  assert.deepEqual(pickNameForms(names, 'Agathocleia of Nicomedia'), {});
  // Unless the saint *is* a company, where the list is the name.
  assert.deepEqual(pickNameForms(names, 'The Martyrs Euodus and Callista and Hermogenes'), {
    el: 'Εύοδος, Καλλίστη, Αγαθόκλεια και Ερμογένης',
  });
});

test('the fullest recorded form wins, and a language with none is absent', () => {
  const names = [
    { form: 'Стефан', lang: 'ru' },
    { form: 'Стефан Ермолин', lang: 'ru' },
  ];
  const picked = pickNameForms(names, 'Stephen (Yermolin), Presbyter, Hieromartyr (1937)');
  assert.equal(picked.ru, 'Стефан Ермолин');
  // Absent rather than English: a caller can tell "not recorded" from "the
  // same in both", and the reason is usually that the church reading in that
  // language does not keep this saint.
  assert.equal('el' in picked, false);
  assert.deepEqual(pickNameForms([], 'Alban of Britain'), {});
  assert.deepEqual(pickNameForms(null, 'Alban of Britain'), {});
});
