/**
 * The church registry. This file is the authority for what the veneration
 * badge's columns are, what an attestation may name, and how a movable feast is
 * reckoned. The badge grid is generated from it, so it is exactly as wide as
 * the communions currently enabled — never a fixed width padded with reserved
 * cells.
 *
 * Communion and rite are independent and both are stored on every church.
 * Communion is the authority that decides additions to and deletions from a
 * calendar; rite is the liturgical tradition a church inherits its calendar
 * from. A Chaldean Catholic answers to Rome but keeps the East Syriac calendar
 * it shares with the Assyrian Church of the East — collapsing either axis into
 * the other would make that unrepresentable.
 *
 * `rites` is a list rather than a single value because eastern-catholic really
 * does span six of them. See its note.
 */

export const RITES = [
  { id: 'latin', display_name: 'Latin' },
  { id: 'byzantine', display_name: 'Byzantine' },
  { id: 'alexandrian', display_name: 'Alexandrian' },
  { id: 'geez', display_name: "Ge'ez" },
  { id: 'armenian', display_name: 'Armenian' },
  { id: 'west-syriac', display_name: 'West Syriac' },
  { id: 'east-syriac', display_name: 'East Syriac' },
];

/**
 * Badge column order. Fixed: position encodes identity, so a church's column
 * must never move between saints. Append here; do not reorder.
 */
export const COMMUNIONS = [
  { id: 'catholic', display_name: 'Catholic' },
  { id: 'eastern-orthodox', display_name: 'Eastern Orthodox' },
  { id: 'oriental-orthodox', display_name: 'Oriental Orthodox' },
  { id: 'church-of-the-east', display_name: 'Church of the East' },
];

/**
 * `default_calendar` and `paschal_computus` are fallbacks used when scaffolding
 * a new saint and when an attestation's paschal feast does not name its own
 * computus. An attestation that states its calendar always wins: these are
 * conveniences, not assertions about a church.
 */
export const CHURCHES = [
  {
    id: 'roman-catholic',
    display_name: 'Roman Catholic',
    communion: 'catholic',
    rites: ['latin'],
    default_calendar: 'gregorian',
    paschal_computus: 'gregorian',
    enabled: true,
  },
  {
    id: 'eastern-catholic',
    display_name: 'Eastern Catholic',
    communion: 'catholic',
    rites: ['byzantine', 'alexandrian', 'geez', 'armenian', 'west-syriac', 'east-syriac'],
    default_calendar: 'julian',
    paschal_computus: 'julian',
    enabled: true,
    coarse: true,
    note:
      'One entry covering roughly two dozen sui iuris churches across every rite ' +
      'family. The coarsest cell in the registry and the first candidate for ' +
      'splitting once sourcing allows. Its calendar and computus defaults follow ' +
      'the Byzantine majority and are wrong for several member churches, so ' +
      'attestations here should state their own.',
  },
  {
    id: 'eastern-orthodox',
    display_name: 'Eastern Orthodox',
    communion: 'eastern-orthodox',
    rites: ['byzantine'],
    default_calendar: 'julian',
    paschal_computus: 'julian',
    enabled: true,
    note:
      'Not split into Byzantine and Slavic: that is a cultural distinction, not ' +
      'an ecclesial one, and it excludes the Romanian and Georgian churches, ' +
      'which are neither. All autocephalous Eastern Orthodox churches share one ' +
      'calendar-authority structure. Individual churches on the Revised Julian ' +
      'calendar keep fixed feasts on Gregorian dates while reckoning Pascha by ' +
      'the Julian computus, which is why the two fields differ independently.',
  },
  {
    id: 'coptic',
    display_name: 'Coptic Orthodox',
    communion: 'oriental-orthodox',
    rites: ['alexandrian'],
    default_calendar: 'coptic',
    paschal_computus: 'julian',
    enabled: true,
  },
  {
    id: 'armenian',
    display_name: 'Armenian Apostolic',
    communion: 'oriental-orthodox',
    rites: ['armenian'],
    default_calendar: 'gregorian',
    paschal_computus: 'gregorian',
    enabled: true,
    note:
      'Reckons Pascha by the Gregorian computus, unlike the other Oriental ' +
      'Orthodox churches. The Patriarchate of Jerusalem is the exception and ' +
      'keeps the Julian reckoning; attestations concerning it should say so.',
  },
  {
    id: 'ethiopian-eritrean',
    display_name: 'Ethiopian and Eritrean Orthodox',
    communion: 'oriental-orthodox',
    rites: ['geez'],
    default_calendar: 'ethiopian',
    paschal_computus: 'julian',
    enabled: true,
    note:
      'Kept as one entry. The Eritrean church became autocephalous in 1993 but ' +
      'shares the Ge’ez calendar; splitting it awaits sourcing that ' +
      'distinguishes the two calendars in practice.',
  },
  {
    id: 'syriac-malankara',
    display_name: 'Syriac and Malankara Orthodox',
    communion: 'oriental-orthodox',
    rites: ['west-syriac'],
    default_calendar: 'gregorian',
    paschal_computus: 'julian',
    enabled: true,
    note:
      'Two churches under one entry, which risks misattributing Malankara’s ' +
      'own saints to the Syriac Orthodox and the reverse. Flagged as a known ' +
      'simplification rather than merged silently; splitting is warranted as ' +
      'soon as Malankara-specific sources are in hand.',
  },
  {
    id: 'assyrian-church-of-the-east',
    display_name: 'Assyrian Church of the East',
    communion: 'church-of-the-east',
    rites: ['east-syriac'],
    default_calendar: 'gregorian',
    paschal_computus: 'gregorian',
    enabled: true,
    needs_sourcing: ['paschal_computus'],
    note:
      'A fourth communion, not a branch of Oriental Orthodoxy — filing it ' +
      'under Oriental would make figures like Nestorius and Isaac of Nineveh ' +
      'unrepresentable. Whether to include it at all is the author’s ' +
      'decision, not the build’s: the enabled flag exists for that, defaults ' +
      'on, and the About page states the choice. The 1968 split into Assyrian ' +
      'and Ancient Church of the East bodies is treated as one entry for now. ' +
      'The paschal computus here is the least certain field in this registry ' +
      'and should be verified against a primary source before the About page ' +
      'claims anything about it.',
  },
];

export const CHURCHES_BY_ID = Object.fromEntries(CHURCHES.map((c) => [c.id, c]));

export const enabledChurches = () => CHURCHES.filter((c) => c.enabled !== false);

/** Communions that have at least one enabled church — the badge's columns. */
export const enabledCommunions = () => {
  const live = new Set(enabledChurches().map((c) => c.communion));
  return COMMUNIONS.filter((c) => live.has(c.id));
};

export const churchesInCommunion = (communionId) =>
  enabledChurches().filter((c) => c.communion === communionId);
