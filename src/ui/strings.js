/**
 * Every user-facing string in the app, in one module, so that additional UI
 * languages later are a translation job rather than an excavation (brief §16).
 * No other file may contain literal UI text.
 */

export const STRINGS = {
  site: {
    name: 'Gallery of Saints',
    tagline: 'The saints of the Catholic, Eastern Orthodox, Oriental Orthodox and Church of the East traditions, attested church by church.',
  },

  nav: {
    calendar: 'Calendar',
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
    title: 'Calendar',
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

    /*
     * One calendar at a time (author, 2026-08-22, Addendum H8). Which one is
     * a separate choice from the traditions, asked before the week or the
     * month is shown, from the calendars the traditions allow.
     */
    which: {
      heading: 'Which calendar would you like to see?',
      lede:
        'Your traditions keep {count} calendars here, and this page shows one ' +
        'at a time, so no day lists a saint twice. Choose the one to open; ' +
        'you can change it whenever you like.',
      showing: 'The {church} calendar',
      change: 'Change calendar',
      changeLabel: 'Change which calendar is shown',
    },

    /*
     * Three silences, redrawn for one calendar at a time: a day the corpus has
     * nothing for, a day this calendar has nothing for while others the reader
     * keeps do, and a reader who has no tradition selected at all. Different
     * facts, each stated as the fact it is.
     */
    silence: {
      none:
        'No tradition is selected, so there is no calendar to show. Select ' +
        'Tradition, in the header, is where to choose one.',
      otherCalendarsOne:
        'Nothing in the {church} calendar today. One commemoration falls today ' +
        'in another calendar you keep — change calendar to see it.',
      otherCalendarsMany:
        'Nothing in the {church} calendar today. {count} commemorations fall ' +
        'today in other calendars you keep — change calendar to see them.',
      setAsideOne:
        'Nothing in the {church} calendar today. One commemoration here belongs ' +
        'to a tradition you have set aside — Select Tradition, in the header, ' +
        'is where to widen it.',
      setAsideMany:
        'Nothing in the {church} calendar today. {count} commemorations here ' +
        'belong to traditions you have set aside — Select Tradition, in the ' +
        'header, is where to widen it.',
    },
  },

  /*
   * The reader's traditions (author, 2026-08-21; site-wide since 2026-08-22).
   * One selection, read by the calendar, the Index and the saint's page, set
   * from the header's control or answered once on a first visit.
   */
  traditions: {
    open: 'Select Tradition',
    openLabel: 'Select Tradition: choose which traditions this site shows',
    heading: 'Which traditions do you keep?',
    lede:
      'Four communions keep their own calendars here, and on most days they ' +
      'commemorate different people. Choose the ones you keep — or, under ' +
      'advanced, the churches themselves. Nothing is hidden for good, and you ' +
      'can change it whenever you like.',
    advanced: '(advanced)',
    advancedLabel: 'Choose church by church',
    plateLede:
      'Every dot is a church, in the rite it keeps its calendar by. Turn one ' +
      'off and the site stops showing what it commemorates. A communion or a ' +
      'rite turns its whole row or column at once.',
    done: 'Done',
    all: 'Every tradition',
    none: 'No tradition selected',
    showing: 'Showing: {names}',
    // The plate's own legends (src/ui/plate.js).
    cellLabel: '{church}, {rite} rite',
    riteLabel: 'Everything in the {rite} rite',
    coarse:
      'Eastern Catholic is one entry in this registry standing for roughly ' +
      'two dozen churches across six rites, so its six dots are one switch.',

    /*
     * The question a first visit is asked (author, 2026-08-21; revised
     * 2026-08-22). Asked on the calendar because the calendar is what the
     * answer changes first, and asked once: pressing a communion is the
     * answer. Phrased as a choice about the reader, not about the data.
     */
    ask: {
      heading: 'Which traditions do you keep?',
      lede:
        'Four communions keep their own calendars here, and on most days they ' +
        'commemorate different people. Choose the one you keep — or, under ' +
        'advanced, the churches themselves. Nothing is hidden for good: Select ' +
        'Tradition, in the header, changes it whenever you like.',
    },
  },

  dates: {
    undated: 'undated',
    before: 'before {y}',
    after: 'after {y}',
    undatedNote: 'No date is recorded at either end of this life. Undated is a finding rather than a blank: it means nothing we have found fixes a bound.',
  },

  badge: {
    venerated: 'Venerated in {n} of {total}{unit}: {names}.',
    veneratedNone: 'Venerated in none of the {total}{unit} documented here.',
    refused: 'Positively not venerated by: {names}.',
    undocumented: '{n} undocumented.',
    // What the total counts. The matrix's total is 13 cells across two axes
    // and has no one-word noun, so it is counted bare — the spec's own
    // example reads "Venerated in 2 of 13:".
    unit: { communions: ' communions', cells: '' },
    state: {
      attested: 'venerated, with a citation',
      refused: 'positively not venerated',
      undocumented: 'undocumented — not sourced either way',
    },
  },

  matrix: {
    cell: '{church}, {rite} rite: {state}',
    // Six of the thirteen cells are filled from one registry entry. Saying so
    // in the cell's own legend is the only place a reader can find it out.
    coarse:
      ' (one registry entry covering every Eastern Catholic church of this rite, ' +
      'so this cell is coarser than it looks)',
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
    // The Index keeps the reader's traditions (author, 2026-08-22): what is
    // set aside by them is counted and named, never silently dropped.
    setAsideOne: 'One saint is venerated only in traditions you have set aside — Select Tradition, in the header, widens it.',
    setAsideMany: '{count} saints are venerated only in traditions you have set aside — Select Tradition, in the header, widens it.',
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
      breadth: 'Breadth of veneration',
      breadthLabel: 'Venerated in at least',
      breadthNote: 'How many communions venerate this figure. It is a measure of how widely a cult travelled, not of importance, and nothing is sorted by it unless you ask.',
      breadthRosterNote: 'The communions it counts, and the churches inside each — the same axes the veneration mark is drawn from. Eastern Catholic is one registry entry spanning six rites, so it counts once, for the Catholic communion.',
      any: 'Any',
    },
    layout: {
      label: 'View',
      cards: 'Cards',
      rows: 'Rows',
      description: 'How the saints are laid out',
      // The tick box beside them (author, 2026-08-22): the full mark for the
      // badge, and the opening of the life under the name.
      detailed: 'Detailed',
      detailedDescription: 'Show the full veneration mark and a short description on every saint',
    },
    sort: {
      label: 'Sort',
      name: 'Name',
      earliest: 'Earliest date',
      latest: 'Latest date',
      breadth: 'Breadth of veneration',
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
    // The register reads the reader's traditions first (author, 2026-08-22);
    // the rest wait behind this, for this page only.
    otherTraditions: 'See other traditions ({count})',
    hideOtherTraditions: 'Hide other traditions',
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
    feastThisYear: '{feast}, which falls on {gregorian} in {year}',
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
    // The map reads the reader's traditions too (author, 2026-08-22).
    setAside: '{count} more are venerated only in traditions you have set aside.',
  },

  about: {
    title: 'About',
    placeholder: 'This page will state the editorial policy plainly: the inclusion criterion, the attestation model, the calendar conversion rules, the coverage statistics, the sourcing, the licence, and how to submit a correction. It is written as substance in Session 9, not boilerplate now.',

    glyph: {
      heading: 'Reading the mark',
      lede:
        'Every name on this site carries a small field of circles. It is the ' +
        'one thing here you cannot guess at, so it is explained rather than ' +
        'left to be discovered.',
      states: 'Each circle is one church, and says one of three things.',
      attested:
        'Venerated, with a citation. This is the only place gold appears on ' +
        'the site.',
      refused:
        'Positively not venerated: a church has been checked and does not ' +
        'keep this figure. Same size as an attestation, because a refusal is ' +
        'a finding and not an absence.',
      undocumented:
        'Undocumented — not sourced either way. Smaller, so that silence and ' +
        'refusal stay apart even in greyscale or at a glance.',
      twoViews: 'Two views, one set of findings',
      badge:
        'In lists and on cards the mark is one row of four: the Catholic, ' +
        'Eastern Orthodox, Oriental Orthodox and Church of the East ' +
        'communions. A communion is filled if any church within it is ' +
        'attested.',
      matrix:
        'Beside a saint’s own name it opens into a grid — communions down, ' +
        'liturgical rites across, thirteen positions where a church actually ' +
        'exists. The empty positions are not churches; nothing is drawn there.',
      decomposition:
        'The grid is the row taken apart, never a second set of findings. Roll ' +
        'a row of the grid up and you get that communion’s cell in the row of ' +
        'four, always.',
      // The scrollable region's own name: at narrow widths the lattice is wider
      // than the screen and takes a tab stop, so it has to say what it is.
      plate: 'The lattice: liturgical rite across, communion down',
      shape:
        'This is the actual shape — rite across the top, communion down the ' +
        'side. Empty positions have no cell; there is nothing to fill.',
      worked:
        'Nestorius is why the grid exists. In the East Syriac column the ' +
        'Assyrian Church of the East venerates him, and directly above it the ' +
        'Catholic communion refuses him — the same rite, either side of a ' +
        'split that has held since 431. The row of four cannot show that; one ' +
        'column of the grid does.',
      coarse:
        'One caveat the marks carry themselves: Eastern Catholic is a single ' +
        'entry in our registry standing for roughly two dozen churches across ' +
        'six rites, so its six cells all report that one entry. Hovering a ' +
        'cell says so. Splitting the entry waits on sourcing.',
      hover: 'Hover or tap any circle to read what it stands for.',
    },
  },

  notFound: {
    title: 'Not found',
    body: 'There is no page at this address.',
  },
};

/** Tiny template: fill('{count} saints', { count: 10 }) → '10 saints'. */
export const fill = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
