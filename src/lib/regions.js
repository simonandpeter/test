/**
 * Coarse region derivation from coordinates, applied at manifest-build time so
 * the Index and Map filters have a region field without one having to be
 * hand-entered per saint, and so it cannot drift from the coordinates.
 *
 * Bounding boxes, not polygons: no dependency, no bundled shapefile, and at the
 * granularity this filter needs — "show me Egyptian saints" — boxes are honest
 * enough. They are also visibly not enough in three places, which is why some
 * regions carry several: the Maghreb interleaves with Sicily and with Iberia
 * closely enough that one rectangle put Augustine of Hippo in Italy and Tangier
 * in Spain. The extra boxes buy separation at the Strait of Gibraltar (Morocco
 * stops at 36.1°N, below Tarifa) and the Strait of Sicily (Tunisia stops at
 * 11.8°E, west of Trapani).
 *
 * Boxes overlap, so order matters and the first match wins. The comments mark
 * the places where the ordering is load-bearing rather than incidental. This
 * whole table is the first thing to replace with real polygons when the region
 * filter starts carrying more weight than it does today.
 *
 * A point outside every box returns null, which the UI must render as
 * undocumented rather than as an "Other" bucket — the same three-state
 * discipline as everywhere else. We have not classified it, which is not the
 * same as it having no region.
 */

// Each entry: [west, south, east, north].
export const REGIONS = [
  // Africa first: Egypt before the Maghreb so the Libyan box cannot claim the
  // western desert, and both before Iberia and Italy so the straits resolve.
  { id: 'egypt', display_name: 'Egypt', bboxes: [[24, 21.5, 34.2, 32]] },
  { id: 'nubia-ethiopia', display_name: 'Nubia and Ethiopia', bboxes: [[30, 3, 48, 22]] },
  {
    id: 'maghreb',
    display_name: 'Maghreb',
    bboxes: [
      [-18, 20, -1, 36.1], // Morocco, stopping south of Tarifa
      [-1, 20, 11.8, 37.5], // Algeria and Tunisia, stopping west of Sicily
      [11.8, 19, 25, 33.5], // Libya
    ],
  },

  { id: 'britain-ireland', display_name: 'Britain and Ireland', bboxes: [[-11, 49, 2, 61]] },
  { id: 'scandinavia', display_name: 'Scandinavia', bboxes: [[4, 54.5, 32, 71.5]] },
  { id: 'iberia', display_name: 'Iberia', bboxes: [[-10, 35.5, 3.5, 44]] },
  { id: 'italy', display_name: 'Italy', bboxes: [[6, 35.5, 19, 47.5]] },
  { id: 'gaul', display_name: 'Gaul and France', bboxes: [[-5, 42, 8.5, 51.5]] },
  { id: 'germania', display_name: 'Germania and Central Europe', bboxes: [[5, 45, 25, 55]] },

  // The eastern sequence is ordered by which tradition owns the figures found
  // there, not by modern borders: Mesopotamia before Anatolia so Nisibis and
  // Edessa read as East Syriac rather than Turkish, and the Levant before
  // Anatolia so Antioch reads as a Syrian patriarchate. The cost is that some
  // points in southern Turkey are called Levant, which is the better error.
  { id: 'caucasus', display_name: 'Caucasus', bboxes: [[38, 38, 50, 45]] },
  { id: 'mesopotamia', display_name: 'Mesopotamia', bboxes: [[38.5, 29, 49, 38]] },
  { id: 'levant', display_name: 'Levant', bboxes: [[32.2, 29, 40, 37.5]] },
  { id: 'anatolia', display_name: 'Anatolia', bboxes: [[25.5, 35.5, 45, 42.5]] },
  { id: 'greece-aegean', display_name: 'Greece and the Aegean', bboxes: [[19, 34, 28.3, 41.5]] },
  { id: 'balkans', display_name: 'Balkans', bboxes: [[13, 38.5, 30, 48]] },
  { id: 'persia', display_name: 'Persia', bboxes: [[44, 25, 63, 40]] },
  { id: 'arabia', display_name: 'Arabia', bboxes: [[34, 12, 60, 30]] },
  { id: 'india', display_name: 'India', bboxes: [[68, 6, 92, 36]] },
  { id: 'central-asia', display_name: 'Central Asia', bboxes: [[46, 30, 90, 55]] },
  { id: 'east-asia', display_name: 'East Asia', bboxes: [[90, 15, 150, 55]] },
  { id: 'southeast-asia', display_name: 'Southeast Asia', bboxes: [[92, -11, 141, 22]] },
  // Last among the Eurasian boxes: this one is enormous and would otherwise
  // swallow the Caucasus, Central Asia and half of Anatolia.
  { id: 'slavic-east', display_name: 'Russia and the Slavic East', bboxes: [[22, 44, 180, 78]] },
  { id: 'sub-saharan-africa', display_name: 'Sub-Saharan Africa', bboxes: [[-20, -35, 52, 20]] },
  { id: 'americas', display_name: 'Americas', bboxes: [[-170, -56, -30, 72]] },
  { id: 'oceania', display_name: 'Oceania', bboxes: [[110, -50, 180, 0]] },
];

export const REGIONS_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export function regionOf(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  for (const { id, bboxes } of REGIONS) {
    for (const [w, s, e, n] of bboxes) {
      if (lon >= w && lon <= e && lat >= s && lat <= n) return id;
    }
  }
  return null;
}
