/**
 * Every user-facing string in the app, in one module, so that additional UI
 * languages later are a translation job rather than an excavation (brief §16).
 * No other file may contain literal UI text.
 */

export const STRINGS = {
  site: {
    name: 'The Orthodox Saint',
    tagline: 'The saints of the Orthodox Church, church by church — Russian, Romanian, Greek and Serbian, each in its own calendar.',
  },

  nav: {
    calendar: 'Daily',
    saints: 'All Saints',
    map: 'Map',
    about: 'About',
  },

  theme: {
    light: 'light',
    dark: 'dark',
    // The toggle's accessible name: what a press does (author, 2026-08-22 —
    // the control is two-way now and the icon shows the same thing).
    switchTo: 'Switch to the {next} theme',
  },

  loading: {
    manifestFailed: 'The list of saints could not be loaded. This site needs that one file to work at all, so nothing can be shown yet.',
    retry: 'Try again',
  },

  calendar: {
    title: 'Daily',
    today: 'Today',
    goToday: 'Go to today',
    prevDay: 'Previous day',
    nextDay: 'Next day',
    prevWeek: 'Previous week',
    nextWeek: 'Next week',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    monthView: 'Month view',
    closeMonth: 'Close month view',
    weekLabel: 'Choose a day',
    commemorationsFor: 'Commemorations for {date}',
    alsoToday: 'Also commemorated',
    emptyDay: 'No commemorations are recorded for this day — yet. The corpus grows folder by folder, and an empty day is a gap in our sourcing, not a claim about the calendar. Try a neighbouring day, or the saints themselves.',
    heroIn: 'In the {church}',
    heroFeast: '{church}: {feast}',
    densityLabel: '{count} commemorations',
    openSaint: 'Read about {name}',
    // The day in the chosen church's own reckoning, after the calendar's name
    // (author, 2026-08-22): "10 August (Julian)" under a civil 23 August.
    ownDate: '{date} ({calendar})',
    // Under the date (author, 2026-08-22): where the day stands in the
    // paschal cycle, the tone, and whether it is a fast — lib/liturgy.js.
    liturgy: {
      tone: 'Tone {tone}',
      fast: 'Fast — {reason}',
      fish: 'Fast, fish permitted — {reason}',
      free: 'No fast',
      freeBecause: 'No fast — {reason}',
    },
    // The day's readings, where a church's calendar has been read and recorded
    // (author, 2026-08-22; src/data/liturgical-days.js). Links open the NKJV
    // at Bible Gateway for now.
    readings: {
      heading: 'Readings',
      source: 'As printed by {source}. Links open the New King James Version at Bible Gateway.',
    },
    // The hymns of the day's saint or feast, in the chosen church's language,
    // copied whole from the cited source (author, 2026-08-22).
    hymns: {
      heading: 'Hymns',
      troparion: 'Troparion',
      kontakion: 'Kontakion',
      source: 'Text from {source}',
    },

    /*
     * One calendar at a time (author, 2026-08-22, Addendum H8; redrawn the
     * same day for one church of three): the calendar is the chosen church's,
     * named under the strip with the way to change it.
     */
    which: {
      showing: 'The {church} calendar',
      change: 'Change calendar',
      changeLabel: 'Change which church’s calendar is shown',
    },

    /*
     * Two silences (redrawn 2026-08-22 for one church at a time): a day the
     * corpus has nothing for, which is a gap in our sourcing; and a day this
     * church's calendar has nothing for while another of the three does, which
     * is a fact about the choice made above and says where the others are.
     * Prose in ink, never a banner.
     */
    silence: {
      otherChurchOne:
        'Nothing in the {church} calendar today. One commemoration falls today ' +
        'in another church’s calendar — change calendar to see it.',
      otherChurchMany:
        'Nothing in the {church} calendar today. {count} commemorations fall ' +
        'today in other churches’ calendars — change calendar to see them.',
    },
  },

  /*
   * The church the reader keeps (author, 2026-08-22): one of four, and with
   * it the calendar, because the calendar follows the church. Asked once on a
   * first visit, changed from the header; read by the calendar, the Index and
   * the saint's page.
   */
  church: {
    open: 'Choose a calendar',
    openLabel: 'Which church’s calendar the site shows',
    showing: '{church} calendar',
    heading: 'Which calendar do you keep?',
    lede:
      'Four churches keep their calendars here: the Russian and the Serbian ' +
      'on the Julian calendar, the Romanian and the Greek on the Revised ' +
      'Julian. Choose the ' +
      'one you keep — the calendar, the saints and each saint’s page read it — ' +
      'and change it whenever you like.',
    groupLabel: 'Churches',
    calendarOf: { julian: 'Julian calendar', 'revised-julian': 'Revised Julian calendar' },
  },

  dates: {
    undated: 'undated',
    before: 'before {y}',
    after: 'after {y}',
    undatedNote: 'No date is recorded at either end of this life. Undated is a finding rather than a blank: it means nothing we have found fixes a bound.',
  },

  saints: {
    title: 'All Saints',
    lede: 'The whole corpus, filterable.',
    search: 'Search',
    searchHint: 'name, type, church, region',
    random: 'Random saint',
    clear: 'Clear filters',
    countLabel: 'saints',
    countAnnounce: '{count} saints match',
    noneMatch: 'No saint in the corpus matches all of these filters. That is a fact about a corpus of ten, not about the calendar — widen a filter, or clear them and look around.',
    undatedTray: '{count} undated, set aside',
    undatedNote: 'A date range can neither include nor exclude a saint with no bound at either end, so these are set aside rather than dropped. They match everything else you have chosen.',
    // The Index keeps the reader's church (author, 2026-08-22): what is set
    // aside by it is counted and named, never silently dropped.
    setAsideOne: 'One saint is not in the {church} calendar — the calendar control in the header changes it.',
    setAsideMany: '{count} saints are not in the {church} calendar — the calendar control in the header changes it.',
    filters: {
      church: 'Church',
      month: 'Feast month',
      type: 'Type',
      sex: 'Sex',
      region: 'Region',
      historicity: 'Historicity',
      dates: 'Dates',
      from: 'From year',
      to: 'To year',
      rangeMode: 'How the range applies',
      overlaps: 'Overlaps',
      within: 'Entirely within',
      rangeNote: 'Overlaps takes any life that touched the range; entirely within takes only lives that sit inside it. Negative years are BC.',
      any: 'Any',
    },
    layout: {
      label: 'View',
      cards: 'Cards',
      rows: 'Rows',
      description: 'How the saints are laid out',
      // The tick box beside them (author, 2026-08-22): the opening of the life
      // under the name. It swapped the mark for the full matrix too, until the
      // glyph was removed (2026-08-22, DESIGN.md §2).
      detailed: 'Detailed',
      detailedDescription: 'Show a short description on every saint',
    },
    sort: {
      label: 'Sort',
      name: 'Name',
      earliest: 'Earliest date',
      latest: 'Latest date',
    },
  },

  saint: {
    nameForms: 'Also called',
    save: 'Save',
    saved: 'Saved',
    // The bookmark's accessible names carry the saint's name: on the Index
    // there are many on one page, and a column of identical "Save" buttons is
    // what a screen reader would otherwise be given.
    saveNamed: 'Save {name}',
    savedNamed: '{name} is saved. Activate to remove it.',
    back: 'Back to All Saints',
    veneration: 'Veneration',
    // The register reads the reader's church first (author, 2026-08-22); the
    // other two wait behind this, for this page only.
    otherChurches: 'See the other churches ({count})',
    hideOtherChurches: 'Hide the other churches',
    life: 'Life',
    noLife: 'No life has been written for this saint yet. The entry is a set of attestations until one is.',
    sources: 'Sources',
    related: 'Related',
    sourceFailed: 'This source text could not be loaded. It is a file in this saint’s folder, so a reload usually fixes it.',
    creditUnrecorded: 'The licence for this image is not yet recorded, or requires a credit we do not have. Until that is settled, it is shown here on the understanding that it must not be reused on this page’s authority.',
    credit: '{credit} · {licence}',
    statusVenerated: 'Venerated',
    statusRefused: 'Not venerated',
    statusUndocumented: 'Undocumented',
    undocumentedNote: 'Not sourced either way. Absence of data is not absence of veneration.',
    refusedNote: 'A positive finding: this church has established that it does not venerate this figure.',
    // The Gregorian date carries its own year; saying it twice read as a stutter
    // ("30 January 2026 in 2026") until 2026-08-22.
    feastThisYear: '{feast}, which falls on {gregorian}',
    feastNoOccurrence: '{feast}, which has no occurrence in {year}',
    noFeast: 'No feast day recorded.',
    citation: 'Source: {text}',
    notFoundTitle: 'No such saint',
    notFound: 'There is no saint at this address. The corpus is small and grows folder by folder, so a link that worked yesterday can only be a typo today.',
    failed: 'This saint’s entry could not be loaded. The text lives in a file alongside the rest of the site, so this is usually a network hiccup rather than a missing saint.',
    retry: 'Try again',
    historicity: {
      attested: 'Attested — documented by sources close to the events.',
      traditional: 'Traditional — transmitted by the tradition, without independent documentation.',
      disputed: 'Disputed — the sources conflict, or scholarship divides.',
      legendary: 'Legendary — the account is a legend; the person may not have existed.',
    },
    sexLabel: { male: 'Male', female: 'Female', unknown: 'Sex unrecorded' },
    // One register of what is known about when and where, keyed by the kind
    // a date and a location share. The date bar that used to stand here was
    // withdrawn by the author on 2026-08-21.
    factsLabel: 'Dates and places',
    kinds: {
      birth: 'Born',
      floruit: 'Flourished',
      death: 'Died',
      ministry: 'Ministry',
      see: 'See',
      relics: 'Relics',
    },
    placeUnnamed: 'Place recorded only as coordinates.',
  },

  shelf: {
    continueReading: 'Continue reading',
    saved: 'Saved',
    resume: 'Resume',
    remove: 'Remove from this shelf',
  },

  map: {
    title: 'Map',
    placeholder: 'The globe arrives in Session 7. {located} of {count} saints currently carry usable coordinates; the rest will wait in the unlocated tray, never silently dropped.',
    // The map reads the reader's church too (author, 2026-08-22).
    setAside: '{count} more are not in the {church} calendar.',
  },

  about: {
    title: 'About',
    placeholder: 'This page will state the editorial policy plainly: the inclusion criterion, the attestation model, the calendar conversion rules, the coverage statistics, the sourcing, the licence, and how to submit a correction. It is written as substance in Session 9, not boilerplate now.',
  },

  notFound: {
    title: 'Not found',
    body: 'There is no page at this address.',
  },
};

/** Tiny template: fill('{count} saints', { count: 10 }) → '10 saints'. */
export const fill = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
