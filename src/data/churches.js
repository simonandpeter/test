/**
 * The church registry — three local churches of the Orthodox Church, the
 * author's decision for this project (DESIGN.md §5b, 2026-08-22): Russian,
 * Romanian and Greek, "for now". One entry per church the site offers; the
 * reader chooses one and the whole site reads it. Everything downstream is
 * generated from this file — what an attestation may name, the chooser's
 * buttons, the Index's church facet, the build's validation — so adding a
 * church is adding an entry, and the suites say what it touches.
 *
 * Each church keeps one of two calendars for its fixed feasts (the author's
 * second decision): `julian`, the Old Calendar, or `revised-julian`, the New
 * — fixed feasts on Gregorian dates. Pascha is reckoned by the Julian computus
 * in all three; the two fields are independent on purpose (lib/feasts.js).
 *
 * `default_calendar` and `paschal_computus` are fallbacks — what new-saint
 * scaffolds, and the computus a paschal feast takes when it does not name its
 * own. An attestation that states its calendar always wins: a church that
 * changed its reckoning would change its rows, not this file.
 *
 * The cross-church registry this replaces — eight churches in four
 * communions, with rites — is in the archive (tag archive/cross-church-2026-08)
 * and comes back with that corpus.
 */
export const CHURCHES = [
  {
    id: 'russian',
    display_name: 'Russian',
    jurisdiction: 'Russian Orthodox Church (Moscow Patriarchate)',
    default_calendar: 'julian',
    paschal_computus: 'julian',
    enabled: true,
    note:
      'Old Calendar: fixed feasts by the Julian reckoning, thirteen days behind ' +
      'the civil date until 2100. Sourced from the Patriarchate’s daily calendar ' +
      '(days.pravoslavie.ru), which prints the Julian and civil dates together ' +
      'and the typikon rank of the day’s service.',
  },
  {
    id: 'romanian',
    display_name: 'Romanian',
    jurisdiction: 'Romanian Orthodox Church (Patriarchate of Romania)',
    default_calendar: 'revised-julian',
    paschal_computus: 'julian',
    enabled: true,
    note:
      'New Calendar since 1924: fixed feasts on Gregorian dates, Pascha by the ' +
      'Julian computus. Sourced from the Patriarchate’s news agency, Basilica ' +
      '(basilica.ro/en/orthodox-calendar-…), which marks rank with the Romanian ' +
      'calendar’s crosses.',
  },
  {
    id: 'greek',
    display_name: 'Greek',
    jurisdiction: 'Church of Greece',
    default_calendar: 'revised-julian',
    paschal_computus: 'julian',
    enabled: true,
    note:
      'New Calendar since 1924: fixed feasts on Gregorian dates, Pascha by the ' +
      'Julian computus. “Greek” is the Church of Greece (author, 2026-08-22), ' +
      'not the Old Calendarists. Sourced from the Orthodox Synaxaristis ' +
      '(saint.gr), a Greek-language synaxarion on that calendar.',
  },
];

export const CHURCHES_BY_ID = Object.fromEntries(CHURCHES.map((c) => [c.id, c]));

export const enabledChurches = () => CHURCHES.filter((c) => c.enabled !== false);
