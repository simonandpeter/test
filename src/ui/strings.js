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
    tagline: 'The saints of the Orthodox Church, church by church - Russian, Romanian, Greek and Serbian, each in its own calendar.',
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
    emptyDay: 'No commemorations are recorded for this day - yet. The corpus grows folder by folder, and an empty day is a gap in our sourcing, not a claim about the calendar. Try a neighbouring day, or the saints themselves.',
    // Amendment 44: the day's calendar is recorded — readings, the fast, sometimes its hymns — but none of its saints is a folder yet. Different from an empty day, and the page says which.
    dayWithoutSaints: 'The readings and hymns below are this day\'s own, read off the calendar. Its saints are not folders yet - the corpus reaches 19 September so far, and grows folder by folder. Nothing here is a claim that the day is bare.',
    heroIn: 'In the {church}',
    densityLabel: '{count} commemorations',
    openSaint: 'Read about {name}',
    /* The two dots under a date on the week strip (author, 2026-08-26). They
       are what a screen reader is given in place of the dots, so each says
       the whole fact rather than naming a colour. */
    marks: {
      fast: 'a fast',
      fish: 'a fast, fish permitted',
      feast: 'a feast',
    },
    // Under the date (author, 2026-08-22): where the day stands in the
    // paschal cycle, the tone, and whether it is a fast — lib/liturgy.js.
    /**
     * The fast, and what it allows (author, 2026-08-25 evening: "the fasting
     * text should say which type of fast is required, and the pop-up
     * shouldn't explain more than what that day requires. E.g. if a day is
     * Xerophagy, the pop-up says 'Uncooked food, without oil or wine'").
     *
     * A glossary of all four grades stood here for one day. It went because
     * the instruction is right: a reader looking at Tuesday is owed Tuesday,
     * and three grades that do not apply are three chances to act on the
     * wrong one.
     *
     * What replaced it does not repeal the boundary that glossary was built
     * around. `lib/liturgy.js` still refuses to compute an allowance, because
     * the allowance is the typikon's and jurisdictions keeping the same fast
     * differ. The grade a day now carries is *read* off the church's own
     * printed note (lib/fast-grade.js) and named in the reader's language
     * from the closed vocabulary below — a quotation resolved, never a
     * derivation. Where a calendar printed no allowance, `unstated` says that
     * much and stops, which is the shape this site takes everywhere else it
     * has been given a fact and not a rule.
     */
    fastModal: {
      open: 'What this fast allows',
      hint: 'What this fast allows',
      // The grade as it leads the fasting line, under the date.
      grades: {
        xerophagy: 'Xerophagy',
        'no-oil': 'Cooked without oil',
        oil: 'Oil and wine',
        fish: 'Fish permitted',
        dairy: 'Dairy permitted',
      },
      // And the whole of what the bubble says, one line per grade.
      allows: {
        xerophagy: 'Uncooked food, without oil or wine.',
        'no-oil': 'Cooked food, still without oil or wine.',
        oil: 'Oil and wine are permitted.',
        fish: 'Fish is permitted.',
        dairy: 'No meat; dairy and eggs are permitted.',
        none: 'Nothing is set aside today.',
      },
      /* A fast whose calendar printed no allowance: what every fast sets
         aside, and nothing else. It carried a second sentence — "This
         calendar prints no finer rule for the day" — for one day; the author
         cut it (2026-08-26) on the same principle that cut the glossary. The
         silence it announced is still the truth and is still what the page
         does; saying so in the bubble was the site talking about itself. */
      unstated: 'Meat, dairy and eggs are set aside.',
      // Likewise: "Not a fast. Nothing is set aside, including on a Wednesday
      // or Friday." The Wednesday-and-Friday clause was answering a question
      // about *other* days.
      free: 'Nothing is set aside.',
      sourceNote: 'As printed by {source}.',
      close: 'Close',
    },

    /*
     * The paschal cycle's day, in words (author, 2026-08-26). lib/liturgy.js
     * says which day it is; ui/cycle-name.js turns that into this. `{n}` is
     * the week's number, already in the shape that language wants it: English
     * gets "13th", because its ordinals are irregular and no template can
     * build them; the other four get a bare 13 and add their own suffix in
     * the pattern («{n}-я седмица», «Săptămâna a {n}-a»).
     *
     * Holy Week and Bright Week are tables of seven, indexed by weekday, and
     * not templates: Slavonic, Serbian and Greek decline the adjective for
     * the weekday's gender, so «Великая Среда» and «Великий Четверг» cannot
     * come out of one pattern. Index 0 is Sunday and is never reached — that
     * Sunday is Pascha itself, and Palm Sunday before it.
     */
    cycle: {
      publican: 'Sunday of the Publican and the Pharisee',
      prodigal: 'Sunday of the Prodigal Son',
      meatfare: 'Meatfare Sunday - the Last Judgement',
      cheesefare: 'Cheesefare Sunday - Forgiveness Sunday',
      lent1: '1st Sunday of Great Lent - the Triumph of Orthodoxy',
      lent2: '2nd Sunday of Great Lent - St Gregory Palamas',
      lent3: '3rd Sunday of Great Lent - the Veneration of the Cross',
      lent4: '4th Sunday of Great Lent - St John Climacus',
      lent5: '5th Sunday of Great Lent - St Mary of Egypt',
      lazarus: 'Lazarus Saturday',
      palm: 'Palm Sunday - the Entry into Jerusalem',
      holyWeek: [
        'Great and Holy Sunday',
        'Great and Holy Monday',
        'Great and Holy Tuesday',
        'Great and Holy Wednesday',
        'Great and Holy Thursday',
        'Great and Holy Friday',
        'Great and Holy Saturday',
      ],
      publicanWeekday: '{weekday} of the week of the Publican and the Pharisee',
      meatfareWeekday: '{weekday} of Meatfare Week',
      cheesefareWeekday: '{weekday} of Cheesefare Week',
      cleanMonday: 'Clean Monday - Great Lent begins',
      lentWeekday: '{weekday} of the {n} week of Great Lent',
      pascha: 'Pascha - the Resurrection of the Lord',
      brightWeek: [
        'Bright Sunday',
        'Bright Monday',
        'Bright Tuesday',
        'Bright Wednesday',
        'Bright Thursday',
        'Bright Friday',
        'Bright Saturday',
      ],
      thomas: 'Thomas Sunday - Antipascha',
      myrrhbearers: 'Sunday of the Myrrh-bearing Women',
      paralytic: 'Sunday of the Paralytic',
      midPentecost: 'Mid-Pentecost',
      samaritan: 'Sunday of the Samaritan Woman',
      blindMan: 'Sunday of the Blind Man',
      leavetaking: 'Leavetaking of Pascha',
      ascension: 'Ascension of the Lord',
      fathers: 'Sunday of the Holy Fathers of the First Council',
      souls: 'Saturday of Souls',
      pentecost: 'Pentecost',
      holySpirit: 'Monday of the Holy Spirit',
      allSaints: 'Sunday of All Saints',
      paschaWeekday: '{weekday} of the {n} week of Pascha',
      sundayAfterPentecost: '{n} Sunday after Pentecost',
      weekAfterPentecost: '{n} week after Pentecost',
    },
    liturgy: {
      tone: 'Tone {tone}',
      fast: 'Fast - {reason}',
      // The grade leads the line where the calendar gave one (2026-08-25
      // evening). `fish` went with it: a fish-permitted day always resolves
      // to the `fish` grade, so the old wording had no reachable caller.
      graded: '{grade} - {reason}',
      free: 'No fast',
      freeBecause: 'No fast - {reason}',
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
    /*
     * Whose name day it is (author, 2026-08-26: "add name days"). A heading
     * and nothing else: the names under it are the day's own saints read a
     * second way, and a sentence explaining that would be the furniture
     * DESIGN.md §5b refuses. What the site will not say is who *should*
     * celebrate on which day — usage differs between the four churches and
     * between families inside them, and lib/name-days.js states the day's
     * names rather than anyone's obligation.
     */
    nameDays: { heading: 'Name days' },
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
        'in another church’s calendar - change calendar in the header to see it.',
      otherChurchMany:
        'Nothing in the {church} calendar today. {count} commemorations fall ' +
        'today in other churches’ calendars - change calendar in the header to see them.',
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
    showingLabel: '{church} calendar - change which church’s calendar the site shows',
    heading: 'Which calendar do you keep?',
    groupLabel: 'Churches',
    calendarOf: { julian: 'Julian calendar', 'revised-julian': 'Revised Julian calendar' },
    /* The same two calendars, named rather than described: `calendarOf` reads
       under a church's name in the chooser ("Julian calendar"), and this reads
       inside the brackets after a feast's date ("17 January (Julian)"). Two
       keys because Romanian and Russian do not put the same word in both
       places, and one of them would have had to be wrong. */
    calendarNames: { julian: 'Julian', 'revised-julian': 'Revised Julian' },
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
    showingLabel: '{name} - change the site’s language',
    heading: 'In which language?',
    groupLabel: 'Languages',
  },

  /*
   * The two marks a first visit meets (author, 2026-08-26, replacing the
   * first-visit gate — ui/coachmark.js): "Text as minimal as possible."
   * Four or five words each, naming the thing the button changes rather than
   * describing the button. They sit *under* the control they point at, with an
   * arrow on it, so neither has to say "here" twice.
   */
  coach: {
    church: 'Pick your church calendar.',
    language: 'Pick your language.',
    dismiss: 'Dismiss',
  },

  dates: {
    undated: 'Undated',
    // The era, on dates whose own numbers do not carry it (author,
    // 2026-08-26). A string rather than a suffix in the code because the
    // packs may want it before the number, or not at all.
    ad: '{when} AD',
    // A life placed but not bounded: no birth, no death, and a floruit that
    // says where in time the sources put them (author, 2026-08-26).
    flourished: 'Lived {when}',
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
    /*
     * The 44 types the corpus uses, as words (author, 2026-08-25 evening:
     * "make all the search terms have a capital letter at the start, like
     * 'Abbot'"). The data keeps the slug, because the filter matches on it;
     * this is what a reader is shown, and lib/saint-types.js is the only
     * place that crosses between the two. A type nobody has named here still
     * prints as a word - the slug, title-cased - so the corpus can grow a
     * type without waiting for a string.
     */
    types: {
      martyr: 'Martyr',
      hieromartyr: 'Hieromartyr',
      venerable: 'Venerable',
      presbyter: 'Presbyter',
      bishop: 'Bishop',
      hierarch: 'Hierarch',
      'venerable-martyr': 'Venerable martyr',
      righteous: 'Righteous',
      confessor: 'Confessor',
      abbot: 'Abbot',
      virgin: 'Virgin',
      deacon: 'Deacon',
      'new-martyr': 'New martyr',
      patriarch: 'Patriarch',
      prince: 'Prince',
      apostle: 'Apostle',
      metropolitan: 'Metropolitan',
      hermit: 'Hermit',
      'great-martyr': 'Great martyr',
      monastic: 'Monastic',
      prophet: 'Prophet',
      'fool-for-christ': 'Fool for Christ',
      monk: 'Monk',
      'patriarch-of-israel': 'Patriarch of Israel',
      theologian: 'Theologian',
      king: 'King',
      soldier: 'Soldier',
      abbess: 'Abbess',
      princess: 'Princess',
      empress: 'Empress',
      stylite: 'Stylite',
      iconographer: 'Iconographer',
      prophetess: 'Prophetess',
      apologist: 'Apologist',
      physician: 'Physician',
      'passion-bearer': 'Passion-bearer',
      preacher: 'Preacher',
      forerunner: 'Forerunner',
      ascetic: 'Ascetic',
      hymnographer: 'Hymnographer',
      queen: 'Queen',
      'equal-to-the-apostles': 'Equal to the Apostles',
      hieromonk: 'Hieromonk',
      deaconess: 'Deaconess',
    },
    /* "The whole corpus, filterable." stood under the All Saints heading from
       the first Index until the author removed it (2026-08-25 evening). The
       count note under the controls already says how much of the corpus this
       calendar keeps, and the filters are visibly filters; a line that only
       describes the furniture is the furniture DESIGN.md 5b refuses. The key
       is gone from all five packs with it. */
    search: 'Search',
    searchHint: 'name, type, church, region',
    random: 'Random saint',
    clear: 'Clear filters',
    countLabel: 'saints',
    countAnnounce: '{count} saints match',
    noneMatch: 'No saint in the corpus matches all of these filters. That is a fact about a corpus of ten, not about the calendar - widen a filter, or clear them and look around.',
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
    lede: 'Corrections, a saint who is missing, a source that says otherwise - all of it is welcome.',
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
    /*
     * A feast in its own reckoning (data/calendars.js), in the reader's
     * language since 2026-08-26. The month name comes from Intl; these are the
     * words around it, and each pack sets its own order — Romanian and Greek
     * put a preposition between the day and the month, Russian and Serbian
     * decline the month into the genitive, which Intl already gives them.
     */
    feastIn: {
      dayMonth: '{day} {month}',
      inCalendar: '{feast} ({calendar})',
      pascha: 'Pascha',
      afterPascha: '{n} days after Pascha',
      beforePascha: '{n} days before Pascha',
    },
    // The life is the author's own paraphrase in English and is not
    // translated — Amendment 2 forbids the machine translation that would be
    // the only way to do it at this scale, and a mistranslated hagiography is
    // a false claim about a person. So a reader in one of the other four is
    // told, once, in their own language, rather than left to wonder whether
    // the page is broken.
    lifeInEnglish: 'This life is written in English and has not been translated.',
    feastThisYear: '{feast}, which falls on {gregorian}',
    feastNoOccurrence: '{feast}, which has no occurrence in {year}',
    noFeast: 'No feast day recorded.',
    citation: 'Source: {text}',
    notFoundTitle: 'No such saint',
    notFound: 'There is no saint at this address. The corpus is small and grows folder by folder, so a link that worked yesterday can only be a typo today.',
    failed: 'This saint’s entry could not be loaded. The text lives in a file alongside the rest of the site, so this is usually a network hiccup rather than a missing saint.',
    retry: 'Try again',
    historicity: {
      attested: 'Attested - documented by sources close to the events.',
      traditional: 'Traditional - transmitted by the tradition, without independent documentation.',
      disputed: 'Disputed - the sources conflict, or scholarship divides.',
      legendary: 'Legendary - the account is a legend; the person may not have existed.',
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
        'How you last left the All Saints page - cards or rows, and whether descriptions were shown.',
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
        'And the day’s readings link out to Bible Gateway - following one ' +
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
