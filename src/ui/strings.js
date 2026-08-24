/**
 * Every user-facing string in the app, in one module, so that additional UI
 * languages later are a translation job rather than an excavation (brief §16).
 * No other file may contain literal UI text.
 */

export const STRINGS = {
  site: {
    // The header and the loading veil print this (author, 2026-08-25: "change
    // the title on header and loading screen to the picked language"). It was
    // hard-coded in index.html in both places, and stale there besides — the
    // site was renamed Orthodoxy Daily on 2026-08-24 and this key still said
    // The Orthodox Saint.
    name: 'Orthodoxy Daily',
    // The tab and the bookmark keep the *other* name, which is Amendment 31's
    // deliberate split: the head says The Orthodox Saint, the page says
    // Orthodoxy Daily. Painting the header from the pack (2026-08-25) nearly
    // collapsed that split by accident — one key was feeding both — so the
    // head has a key of its own now, translated in every pack exactly as the
    // old shared one was.
    tabName: 'The Orthodox Saint',
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
    densityLabel: '{count} commemorations',
    openSaint: 'Read about {name}',
    // Under the date (author, 2026-08-22): where the day stands in the
    // paschal cycle, the tone, and whether it is a fast — lib/liturgy.js.
    /**
     * The fast, explained when the reader asks (author, 2026-08-25: a modal on
     * the fast label, hinted by an (i), describing "exactly what is allowed on
     * the fast, e.g. fish, oils, etc.").
     *
     * What it says and what it refuses to say are both deliberate.
     * `lib/liturgy.js` states *whether* a day is a fast and *which* fast; it
     * does not compute the day's allowance, because that is the typikon's and
     * differs between jurisdictions keeping the very same fast — and a site
     * that invented one would be handing out a ruling nobody gave it. So the
     * modal gives three things: the day's own kind in words; the *source's own
     * note* for the day where the calendar printed one, quoted and cited as
     * everything else in this corpus is; and a glossary of the terms those
     * sources use, which describes what the words mean rather than what the
     * reader must do. The last line says whose the answer actually is.
     */
    fastModal: {
      open: 'What this fast allows',
      hint: 'What this fast allows',
      heading: 'What this fast allows',
      kinds: {
        fast: 'A fast day. Meat, dairy and eggs are set aside; how far beyond that the day goes is what the levels below name.',
        fish: 'A fast day on which fish is permitted — a feast keeping its own honour inside a fast.',
        'fast-free': 'Not a fast. Nothing is set aside, including on a Wednesday or Friday.',
      },
      sourceHeading: 'What the calendar printed for this day',
      sourceNote: 'As printed by {source}.',
      levelsHeading: 'The words the calendars use',
      levels: [
        '<b>Xerophagy</b> — uncooked food, without oil or wine. The strictest of the ordinary days.',
        '<b>Cooked without oil</b> — food from the fire, still without oil or wine.',
        '<b>Oil and wine permitted</b> — the usual relaxation on a feast or a Saturday or Sunday within a fast.',
        '<b>Fish permitted</b> — kept for the greater feasts inside a fast.',
      ],
      whose:
        'Which of these a given day holds is the typikon’s to say, and jurisdictions keeping the same fast differ. This page states which fast the day falls in and prints what the church’s own calendar printed; your own church gives the rule.',
      close: 'Close',
    },

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
      // Which Bible a link opens follows the reader's language (author,
      // 2026-08-25); lib/bible.js holds the four and says how each was
      // settled. The sentence names the one this language actually opens.
      source: 'As printed by {source}. Links open {bible}.',
      bible: 'the New King James Version at Bible Gateway',
      // The two labels the lectionaries use. The data carries each church's
      // own — "Апостол", "Evanghelie" — and often a qualifier with it
      // ("Epistle (Прор)"); the base is translated here and the qualifier is
      // kept exactly as the calendar printed it.
      epistle: 'Epistle',
      gospel: 'Gospel',
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
     * Two silences (redrawn 2026-08-22 for one church at a time): a day the
     * corpus has nothing for, which is a gap in our sourcing; and a day this
     * church's calendar has nothing for while another of the three does, which
     * is a fact about the choice made above and says where the others are.
     * Prose in ink, never a banner. Since 2026-08-24 the calendar is changed
     * in the header, so that is where these two point.
     */
    silence: {
      otherChurchOne:
        'Nothing in the {church} calendar today. One commemoration falls today ' +
        'in another church’s calendar — change calendar in the header to see it.',
      otherChurchMany:
        'Nothing in the {church} calendar today. {count} commemorations fall ' +
        'today in other churches’ calendars — change calendar in the header to see them.',
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
    // The header's control is a calendar mark and the church's name alone
    // (author, 2026-08-24). It read "{church} calendar" until then, which
    // said "calendar" twice once the icon was beside it and made the widest
    // control in the header wider still. The accessible name keeps the whole
    // sentence, because an icon says nothing to a screen reader.
    showing: '{church}',
    showingLabel: '{church} calendar — change which church’s calendar the site shows',
    heading: 'Which calendar do you keep?',
    groupLabel: 'Churches',
    calendarOf: { julian: 'Julian calendar', 'revised-julian': 'Revised Julian calendar' },
    // The churches by id, here rather than only in data/churches.js, so the
    // locale packs can translate them (Amendment 36): the registry stays the
    // authority on what exists, this is the authority on what it is called.
    names: { russian: 'Russian', romanian: 'Romanian', greek: 'Greek', serbian: 'Serbian' },
  },

  /*
   * The site's language (author, 2026-08-24, Amendment 36): five, chosen from
   * the header. Each language names itself in lib/i18n.js's registry; these
   * are only the control's own strings.
   */
  language: {
    open: 'Language',
    openLabel: 'The site’s language',
    showingLabel: '{name} — change the site’s language',
    heading: 'In which language?',
    groupLabel: 'Languages',
  },

  dates: {
    undated: 'undated',
    before: 'before {y}',
    after: 'after {y}',
    // A life with no recorded beginning is read from its end (author,
    // 2026-08-24): "undated - 1779" became "Entered eternal glory in 1779",
    // and on 2026-08-25 that became plain "Reposed 1779". One form now
    // instead of three: with the verb doing no grammatical work the
    // prepositions went with it, and "Reposed 5th C.", "Reposed c. 250" and
    // "Reposed before 556" all read as the register entries they are. The
    // three keys survive so the packs need no surgery.
    reposeIn: 'Reposed {when}',
    reposeInThe: 'Reposed {when}',
    repose: 'Reposed {when}',
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
    // The count says the useful number outright (author, 2026-08-25): the
    // pair of counts made the reader subtract to learn how much of the
    // corpus this calendar keeps. The header's role moved into a title
    // attribute rather than being said on the page every time.
    kept: '{shown}/{total} saints venerated in the {church} calendar.',
    keptAll: '{total} saints, the whole corpus.',
    keptTitle: 'The calendar control in the header changes which church’s calendar this is.',
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
      // Author, 2026-08-24. Distinct from the *Random saint* button beside it:
      // that one opens a saint, this one orders the whole Index. Choosing it
      // again reshuffles.
      random: 'Random',
    },
  },

  contact: {
    heading: 'Contact',
    // Through the project's issue tracker, not an inbox (author, 2026-08-25:
    // "or even better if they can be stored in the github repo by some
    // built-in affordance so my name doesn't get too involved"). GitHub
    // issues are that affordance: they land in the repository this site is
    // built from, they need no server, and no address of the author's appears
    // on any page. The trade is that an issue is public, which the reader is
    // told before they open one rather than after.
    lede: 'Corrections, a saint who is missing, a source that says otherwise — all of it is welcome.',
    open: 'Open an issue on the project',
    note: 'Issues are part of the public repository this site is built from, so what you write there can be read by anyone. Please leave out anything you would not put on a page of it.',
  },

  saint: {
    // The bookmark's accessible names carry the saint's name: on the Index
    // there are many on one page, and a column of identical "Save" buttons is
    // what a screen reader would otherwise be given.
    saveNamed: 'Save {name}',
    savedNamed: '{name} is saved. Activate to remove it.',
    back: 'Back to All Saints',
    backDaily: 'Back to Daily',
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
    // The Continue-reading rows are cleared by swiping them across (author,
    // 2026-08-24); this names the button that does the same thing for a
    // reader who cannot swipe, and which only a keyboard or a screen reader
    // ever reaches. It says the whole action, because out of the row's
    // visual context it has nothing else to lean on.
    removeNamed: 'Remove {name} from Continue reading',
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
    /*
     * Privacy (author, 2026-08-24). Written against what the code actually
     * does rather than as boilerplate: lib/settings.js owns the localStorage
     * key and lib/store.js the four IndexedDB stores, and this text names
     * exactly those and nothing else. If either grows a field, this changes
     * with it — a privacy policy that has drifted from the code is worse than
     * none, because a reader has no way to tell.
     */
    privacy: {
      heading: 'Privacy',
      lede:
        'Nothing about you is collected, and there is no account to make. ' +
        'What this site remembers, it remembers on your own device, and it is ' +
        'only what it needs to give you back the page you left.',
      keepsHeading: 'What is kept on your device',
      keeps: [
        'Where you were reading, and how far down the page you had got.',
        'The saints you have saved, and the saints you have opened recently.',
        'The church whose calendar you chose, and the light or dark setting.',
        'How you last left the All Saints page — cards or rows, and whether descriptions were shown.',
      ],
      notHeading: 'What is not done',
      not: [
        'No analytics, no tracking pixels, no advertising, and no cookies.',
        'Nothing you do here is sent to this site’s makers or to anyone else.',
        'Nothing is shared or sold, because nothing is gathered to share or sell.',
      ],
      clearing:
        'All of it stays in this browser, on this device, and clearing the ' +
        'site’s data in your browser removes every trace of it. Nothing is ' +
        'kept anywhere else, so there is nothing to ask us to delete.',
      hosting:
        'Two honest footnotes. The files are served by GitHub Pages, and any ' +
        'web server sees the requests made to it; that is the host’s doing, ' +
        'not this site’s, and it is the same for every page on the internet. ' +
        'And the day’s readings link out to Bible Gateway — following one ' +
        'takes you to a different site, with its own policy.',
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
