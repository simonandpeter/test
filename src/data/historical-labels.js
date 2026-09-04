/**
 * A faint, always-drawn atlas layer of the old cities and regions this
 * corpus's own lives keep naming — Constantinople, Nicomedia, Antioch, and
 * the rest (author, 2026-09-05: "add a faint layer of text with the location
 * names, the main locations, Alexandria, Damascus, Antioch, Constantinople,
 * Nicomedia, Laodicea, Cappadocia, Anatolia, Rome, Italy, old cities and
 * regions as well").
 *
 * **Deliberately separate from `data/places.js`**, even where a coordinate
 * repeats: that file is a search gazetteer, read only in answer to what a
 * reader types, and this one is drawn on every paint whether or not the
 * search has ever been opened — a wash of geographic context under the
 * saints' own dots, the way a printed historical atlas names Anatolia and
 * Cappadocia in faint type across the ground they cover.
 *
 * `kind: 'region'` is a broad area with no one point that is "it" — the
 * coordinate is a reasonable centre for the label, not a claim about a
 * border — and fades out as the reader zooms in past what a region-sized
 * label could ever sit inside. `kind: 'city'` is a real place and keeps a
 * small marker of its own; it fades in early and stays, since a reader deep
 * enough in to read a saint's own name is also deep enough to want to know
 * whose city they are looking at.
 */

export const HISTORICAL_LABELS = [
  // --- regions -------------------------------------------------------
  { name: 'Anatolia', kind: 'region', lon: 32.5, lat: 39.0 },
  { name: 'Cappadocia', kind: 'region', lon: 34.8, lat: 38.6 },
  { name: 'Italy', kind: 'region', lon: 12.6, lat: 43.0 },
  { name: 'Mesopotamia', kind: 'region', lon: 43.0, lat: 34.5 },
  { name: 'Thebaid', kind: 'region', lon: 32.6, lat: 26.2 },

  // --- cities ----------------------------------------------------------
  { name: 'Constantinople', kind: 'city', lon: 28.98, lat: 41.01 },
  { name: 'Nicomedia', kind: 'city', lon: 29.92, lat: 40.77 },
  { name: 'Antioch', kind: 'city', lon: 36.16, lat: 36.2 },
  { name: 'Alexandria', kind: 'city', lon: 29.92, lat: 31.2 },
  { name: 'Damascus', kind: 'city', lon: 36.29, lat: 33.51 },
  { name: 'Laodicea', kind: 'city', lon: 29.11, lat: 37.84 },
  { name: 'Rome', kind: 'city', lon: 12.5, lat: 41.9 },
  { name: 'Jerusalem', kind: 'city', lon: 35.22, lat: 31.78 },
  { name: 'Nicaea', kind: 'city', lon: 29.72, lat: 40.43 },
  { name: 'Ephesus', kind: 'city', lon: 27.34, lat: 37.94 },
  { name: 'Caesarea', kind: 'city', lon: 35.5, lat: 38.72 },
  { name: 'Carthage', kind: 'city', lon: 10.32, lat: 36.85 },
];
