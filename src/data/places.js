/**
 * Places the map's search can fly to — countries, regions and the historic
 * cities this corpus keeps returning to (author, 2026-08-31: "You can also
 * search for places, e.g. ukraine, russia, romania, france, constantinople,
 * antioch, alexandria, damascus").
 *
 * **Hand-written, and deliberately not generated.** Natural Earth ships a
 * populated-places set that would cover the modern cities and none of the
 * ones a synaxarion actually names: Constantinople, Nicomedia, Carrhae and
 * Thebes are the places this corpus is *about*, and they are either absent
 * from a modern gazetteer or filed under a modern name a reader searching
 * this site would not think to type. So each entry carries the name the
 * reader is likely to reach for, `also` for the forms they might type
 * instead, and a `zoom` sized to what the place actually is — a country
 * wants its whole span in frame, a city wants its own ground.
 *
 * `zoom` is a scale on `lib/map-view.js`'s own 1..MAX_SCALE range, not a
 * radius: the search flies the view to `{ lon, lat, zoom }` and the clamp
 * arithmetic does the rest.
 */

export const PLACES = [
  // --- the corpus's own heartlands, as countries -------------------------
  { name: 'Ukraine', lon: 31.2, lat: 48.4, zoom: 9 },
  { name: 'Russia', lon: 45.0, lat: 57.0, zoom: 3.5 },
  { name: 'Romania', lon: 25.0, lat: 45.9, zoom: 11 },
  { name: 'Serbia', lon: 20.9, lat: 44.0, zoom: 14 },
  { name: 'Greece', lon: 22.5, lat: 39.0, zoom: 11 },
  { name: 'Bulgaria', lon: 25.5, lat: 42.7, zoom: 12 },
  { name: 'Georgia', lon: 43.4, lat: 42.3, zoom: 13 },
  { name: 'Turkey', also: ['Asia Minor', 'Anatolia'], lon: 35.2, lat: 39.0, zoom: 8 },
  { name: 'Egypt', lon: 30.8, lat: 26.8, zoom: 8 },
  { name: 'Syria', lon: 38.0, lat: 35.0, zoom: 11 },
  { name: 'Israel', also: ['Palestine', 'Holy Land'], lon: 35.0, lat: 31.5, zoom: 16 },
  { name: 'Italy', lon: 12.6, lat: 42.5, zoom: 9 },
  { name: 'France', also: ['Gaul'], lon: 2.2, lat: 46.6, zoom: 9 },
  { name: 'Spain', lon: -3.7, lat: 40.4, zoom: 9 },
  { name: 'England', also: ['Britain', 'United Kingdom'], lon: -1.5, lat: 52.5, zoom: 11 },
  { name: 'Ireland', lon: -8.0, lat: 53.2, zoom: 13 },
  { name: 'Germany', lon: 10.4, lat: 51.2, zoom: 10 },
  { name: 'Cyprus', lon: 33.4, lat: 35.1, zoom: 22 },
  { name: 'Ethiopia', lon: 39.6, lat: 9.1, zoom: 9 },
  { name: 'Armenia', lon: 45.0, lat: 40.2, zoom: 16 },
  { name: 'Lebanon', lon: 35.9, lat: 33.9, zoom: 22 },
  { name: 'Iraq', also: ['Mesopotamia'], lon: 43.7, lat: 33.2, zoom: 10 },
  { name: 'Iran', also: ['Persia'], lon: 53.7, lat: 32.4, zoom: 8 },

  // --- the cities the lives actually name --------------------------------
  {
    name: 'Constantinople',
    also: ['Istanbul', 'Byzantium', 'Tsargrad'],
    lon: 28.98,
    lat: 41.01,
    zoom: 40,
  },
  { name: 'Antioch', also: ['Antakya'], lon: 36.16, lat: 36.2, zoom: 40 },
  { name: 'Alexandria', lon: 29.92, lat: 31.2, zoom: 40 },
  { name: 'Damascus', lon: 36.29, lat: 33.51, zoom: 40 },
  { name: 'Jerusalem', lon: 35.22, lat: 31.78, zoom: 40 },
  { name: 'Rome', lon: 12.5, lat: 41.9, zoom: 40 },
  { name: 'Athens', lon: 23.73, lat: 37.98, zoom: 40 },
  { name: 'Thessaloniki', also: ['Salonica'], lon: 22.94, lat: 40.64, zoom: 40 },
  { name: 'Mount Athos', also: ['Athos', 'Holy Mountain'], lon: 24.23, lat: 40.25, zoom: 45 },
  { name: 'Kyiv', also: ['Kiev', 'Kyiv Caves', 'Pechersk Lavra'], lon: 30.52, lat: 50.45, zoom: 40 },
  { name: 'Moscow', lon: 37.62, lat: 55.75, zoom: 40 },
  { name: 'Novgorod', lon: 31.27, lat: 58.52, zoom: 40 },
  { name: 'Saint Petersburg', also: ['Petersburg', 'Petrograd'], lon: 30.34, lat: 59.93, zoom: 40 },
  { name: 'Nicomedia', also: ['Izmit'], lon: 29.92, lat: 40.77, zoom: 40 },
  { name: 'Nicaea', also: ['Iznik'], lon: 29.72, lat: 40.43, zoom: 40 },
  { name: 'Ephesus', lon: 27.34, lat: 37.94, zoom: 40 },
  { name: 'Smyrna', also: ['Izmir'], lon: 27.14, lat: 38.42, zoom: 40 },
  { name: 'Caesarea', lon: 35.5, lat: 38.72, zoom: 40 },
  { name: 'Edessa', also: ['Urfa'], lon: 38.79, lat: 37.15, zoom: 40 },
  { name: 'Carrhae', also: ['Harran'], lon: 39.03, lat: 36.86, zoom: 40 },
  { name: 'Gaza', lon: 34.47, lat: 31.5, zoom: 40 },
  { name: 'Sinai', also: ['Mount Sinai', 'Saint Catherine'], lon: 33.98, lat: 28.54, zoom: 30 },
  { name: 'Thebes', also: ['Thebaid'], lon: 32.63, lat: 25.7, zoom: 30 },
  { name: 'Tbilisi', lon: 44.79, lat: 41.72, zoom: 40 },
  { name: 'Sirmium', also: ['Sremska Mitrovica'], lon: 19.61, lat: 44.98, zoom: 40 },
  { name: 'Ohrid', lon: 20.8, lat: 41.12, zoom: 40 },
  { name: 'Studenica', lon: 20.53, lat: 43.49, zoom: 40 },
  { name: 'Diveyevo', lon: 43.24, lat: 55.04, zoom: 40 },
  { name: 'Optina', lon: 35.83, lat: 54.05, zoom: 40 },
  { name: 'Valaam', lon: 30.94, lat: 61.38, zoom: 35 },
  { name: 'Solovki', also: ['Solovetsky'], lon: 35.71, lat: 65.02, zoom: 30 },
  { name: 'Milan', lon: 9.19, lat: 45.46, zoom: 40 },
  { name: 'Hippo', lon: 7.75, lat: 36.9, zoom: 40 },
  { name: 'Carthage', lon: 10.32, lat: 36.85, zoom: 40 },
  { name: 'Tours', lon: 0.69, lat: 47.39, zoom: 40 },
  { name: 'Canterbury', lon: 1.08, lat: 51.28, zoom: 40 },
  { name: 'Lyon', lon: 4.84, lat: 45.76, zoom: 40 },
  { name: 'Ravenna', lon: 12.2, lat: 44.42, zoom: 40 },
  { name: 'Patmos', lon: 26.55, lat: 37.31, zoom: 40 },
  { name: 'Crete', lon: 24.81, lat: 35.24, zoom: 22 },
  { name: 'Alaska', lon: -152.0, lat: 62.0, zoom: 6 },
];
