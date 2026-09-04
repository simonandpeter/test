/**
 * Every user-facing string in the app, in one module, so that additional UI
 * languages later are a translation job rather than an excavation (brief §16).
 * No other file may contain literal UI text.
 */

/**
 * The site's name, in every language (author, 2026-08-28). A brand is a mark
 * rather than a word, so it does not go through the packs — see `site.name`
 * below for what that key is still doing there.
 *
 * The two words are printed with their own gap rather than a plain space
 * ("Make the space between 'DAILY' and 'DOX' half as wide"), and the way that
 * is done is worth stating because it is exact rather than tuned: a space set
 * at half the font size is half as wide, because a glyph's advance scales with
 * the size. No em-guess at what a space measures in a face that is Nicefore on
 * one machine and Literata on another.
 */
export const BRAND = ['Daily', 'Dox'];

export const STRINGS = {
  site: {
    /*
     * **The name is a stamp, not a string** (author, 2026-08-28: "make sure
     * this new website title is applied to all languages, it no longer gets
     * translated, it stays constant as a stamp of branding"). `BRAND` below is
     * what the masthead, the veil and the tab now print, in every pack.
     *
     * This key stays in all five packs so the coverage script has the same key
     * set everywhere, and because a translated name is a decision a future
     * author might want back. **Nothing reads it.** Editing `ru.site.name` will
     * not change what the header says — change `BRAND`.
     *
     * **`tabName` below is untouched and still translated**, which is not an
     * oversight. The head and the page carry deliberately different names —
     * Amendment 31 — and the instruction here is about the one the reader
     * *sees*, the stamp in the corner. Collapsing the split would undo a
     * decision the author made rather than carry out the one they gave.
     *
     * The instruction it replaces (2026-08-25: "change the title on header and
     * loading screen to the picked language") is superseded rather than
     * reversed: what that one was fixing was a title hard-coded in index.html
     * and stale by a rename, and the name still comes from one place.
     */
    name: 'Daily Dox',
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
    /*
     * What the Daily button reads while the reader is on the Daily page
     * looking at a day that is not today (author, 2026-08-26 evening) — press
     * it and it takes them back. Off that page it is Daily again.
     *
     * **In the four packs that are not English this is the word they already
     * use for Daily** — «Сегодня», Astăzi, Σήμερα, Данас all mean Today — so
     * the label does not visibly change there. The control still does what
     * the word says; what is lost is only the change of state. Giving those
     * packs a distinct base label («Ежедневно», Zilnic, Καθημερινά, Дневно)
     * is the fix and it is the author's, because it changes a nav label they
     * have reviewed a dozen times and because those words are longer, which
     * is the 320 px chrome line's whole budget.
     */
    today: 'Today',
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
    /*
     * The two steps beside the date on a desktop (author, 2026-09-01). The
     * words a reader sees; `prevDay`/`nextDay` above are what a screen reader
     * hears, because "Yesterday" on a page showing a day three weeks back is
     * the wrong word for the thing the button does.
     */
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    prevWeek: 'Previous week',
    nextWeek: 'Next week',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    monthView: 'Month view',
    /*
     * The reckoning the page reads a fixed day by (author, 2026-09-02). The
     * button prints the answer — "Revised Julian" — and the label is what a
     * screen reader is given for the control, because the answer alone does
     * not say what question it is answering.
     *
     * `reckoningFollow` is the way back to the church's own default rather
     * than a third calendar: a reader who has overridden it should be able to
     * stop overriding it, and "Julian" would not say that.
     */
    reckoningLabel: 'The calendar this page is read by',
    reckoningFollow: 'Follow my church',
    /*
     * The whole church month at once (author, 2026-09-01: "Make an expandable
     * calendar button under the weekly display called 'Full Screen Calendar'
     * that opens up a full screen calendar modal in the same style as the
     * smaller one but with lots more detail").
     *
     * The button's words are the author's own, capitalised as they wrote them.
     */
    /* Renamed 2026-09-02 (author: change to "Open Fullscreen"), and shortened
       because it moved to the calendar's right margin where the old four words
       reached back under the grid. */
    fullScreen: 'Open Fullscreen',
    fullClose: 'Close',
    fullPeriods: 'Fasts and seasons',
    fullFeasts: 'Great Feasts',
    // Most months hold neither, which is a fact about the church year rather
    // than a gap in the data, so it is said in a sentence.
    fullQuiet: 'No fasting season and no Great Feast fall in this month.',
    fullCount: '{n} saints',
    fullCountOne: '1 saint',
    closeMonth: 'Close month view',
    weekLabel: 'Choose a day',
    commemorationsFor: 'Commemorations for {date}',
    alsoToday: 'Also commemorated',
    /* The two faces of that list (author, 2026-09-01), and the name of the
       pair for a reader who cannot see that they are beside a heading. */
    registerView: 'Show also commemorated as',
    viewCards: 'Cards',
    viewList: 'List',
    /*
     * The way from the day's saint into their life (author, 2026-09-01: add a
     * "...continue reading >" button at the bottom right at the end of the
     * preview text). The leading ellipsis is the author's and is doing real
     * work: it says the paragraph above was cut rather than finished, which
     * is the one thing a reader cannot tell from a clamped block of text.
     * `continueReadingOf` is what a screen reader hears, because "continue
     * reading" on a page of saints does not say whose life it opens.
     */
    continueReading: '…continue reading',
    heroPlaces: { birth: 'Born at {place}', death: 'Died at {place}' },
    continueReadingOf: 'Continue reading the life of {name}',
    /*
     * The same door, on a wide screen, renamed (author, 2026-09-04: "instead
     * of the 'continue reading' button on Daily page desktop, rename it
     * 'read more'"). A word of its own rather than a re-skin of
     * `continueReading`: the phone's own button sits below the cut text as
     * "…continue reading", reading as the sentence's own ending, while the
     * desktop one is centred under the whole preview as a plainer, separate
     * call to action — the ellipsis that made sense stitched onto a clipped
     * sentence does not belong here.
     */
    readMore: 'Read more',
    readMoreOf: 'Read more of the life of {name}',
    emptyDay: 'No commemorations are recorded for this day - yet. The corpus grows folder by folder, and an empty day is a gap in our sourcing, not a claim about the calendar. Try a neighbouring day, or the saints themselves.',
    // Amendment 44: the day's calendar is recorded — readings, the fast, sometimes its hymns — but none of its saints is a folder yet. Different from an empty day, and the page says which.
    // The reach used to be the literal "19 September" and had been stale for a
    // fortnight when it was found (2026-08-27). It is read off the corpus now:
    // a printed sentence that names a date is a sentence that goes stale.
    dayWithoutSaints: 'The readings and hymns below are this day\'s own, read off the calendar. Its saints are not folders yet - the corpus reaches {reach} so far, and grows folder by folder. Nothing here is a claim that the day is bare.',
    /* Past the end of the day records (2026-08-27). The computed lines - the
       fast, the tone, the week - hold for any date, so a day months ahead
       looked whole while the half that is read off a calendar was simply
       absent. Said once, in prose, in the register of the three silences. */
    beyondRecords: 'The readings and hymns are recorded as far as {until}, and this day is past that. What stands above - the fast, the tone and the week - is computed, and holds for any date.',
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
      /*
       * The grade as it leads the fasting line, under the date — and since
       * 2026-08-26 it names the *type* of fast rather than the technical
       * term for its allowance (author: "For the fasting labels, change to
       * show the types directly: Strict Fasting …, Oil and Wine Allowed,
       * Oil, Wine and Fish Allowed, or No Fast").
       *
       * Two of the vocabulary's five grades now share a label. `xerophagy`
       * (uncooked) and `no-oil` (cooked, still without oil) are both Strict
       * Fasting to a reader deciding what to eat, and the distinction
       * between them is a difference in how the food is prepared rather than
       * in what is set aside. **Nothing sourced is lost by the merge**: the
       * bubble still prints the calendar's own words verbatim under the
       * allowance — «сухоядение» and «горячая пища без масла» read as
       * differently there as they ever did — with the page they came from
       * named beside them. What changed is only which of the two the chip
       * leads with.
       *
       * `dairy` keeps a label of its own because it is not one of the four:
       * Cheesefare Week sets aside meat and permits what the other grades do
       * not, and calling it any of the author's four would be wrong rather
       * than coarse.
       */
      grades: {
        strict: 'Strict Fasting',
        xerophagy: 'Strict Fasting',
        'no-oil': 'Strict Fasting',
        oil: 'Oil and Wine Allowed',
        fish: 'Oil, Wine and Fish Allowed',
        dairy: 'Dairy Allowed',
      },
      // And the whole of what the bubble says, one line per grade.
      allows: {
        strict: 'Vegan; set aside meat, animal products, cooking oils and alcohol.',
        xerophagy: 'Vegan; set aside meat, animal products, cooking oils and alcohol.',
        'no-oil': 'Vegan; set aside meat, animal products, cooking oils and alcohol.',
        oil: 'Meat, dairy and eggs are set aside; oil and wine are permitted.',
        fish: 'Meat, dairy and eggs are set aside; oil, wine and fish are permitted.',
        dairy: 'No meat; dairy and eggs are permitted.',
        none: 'Nothing is set aside today.',
      },
      /* `unstated` stood here — "Meat, dairy and eggs are set aside." — for a
         fast whose calendar printed no allowance. It has no caller since the
         evening of 2026-08-26, when such a day started reading Strict Fasting
         by default (lib/fast-grade.js argues it, DESIGN.md §5b records the
         reversal), and it is removed rather than left for someone to grep
         for. `liturgy.fast` — "Fast - {reason}" — went with it and for the
         same reason: there is no longer a fast day without a grade to name. */
      // Note: "Not a fast. Nothing is set aside, including on a Wednesday
      // or Friday." The Wednesday-and-Friday clause was answering a question
      // about *other* days.
      free: 'Nothing is set aside.',
      sourceNote: 'As printed by {source}.',
      /*
       * The same citation, doing a different job (2026-08-27). `sourceNote`
       * labels a quotation and is right above one. Where the note is *not*
       * quoted - an ungraded fast day, which has defaulted to Strict Fasting
       * since the evening of 2026-08-26 - the sentence above the citation is
       * ours and not the calendar's, and "As printed by saint.gr" was
       * attributing our reading to them. saint.gr printed «Νηστεία»; the word
       * Strict is this site's.
       */
      sourceDay: 'The day’s record comes from {source}.',
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
      /*
       * The tone of the *week* — the Octoechos turns once a week from the
       * Sunday, and a weekday keeps its Sunday's tone (lib/liturgy.js). It is
       * not the tone of any hymn printed below: a troparion carries its own,
       * and the two routinely differ, which is a question the author asked on
       * 2026-08-26 looking at a Monday in Tone 4 whose troparion is Tone 8.
       * If this line is ever to say so it says it here, in five languages.
       */
      tone: 'Tone {tone}',
      /*
       * A fast day's chip is its grade alone, so the only template left here
       * is the one for a day that is no fast at all. `graded`, `bare` and
       * `freeBecause` stood beside it until the evening of 2026-08-26, when
       * the author moved the occasion to a chip of its own ("Don't mention
       * the event for fasting in the fasting label") and left none of the
       * three with a caller.
       */
      free: 'No Fast',
    },
    /*
     * The Great Feasts, named (author, 2026-08-26: "Add a label if its a
     * Feast Day as well with the name of the Feast"). lib/liturgy.js says
     * which feast the day is — reckoned in the church's own calendar, so the
     * Russian keeps the Dormition on the civil 28 August — and hands back a
     * key; the words are here, per language, and are never composed.
     *
     * Nine keys and not thirteen. The four movable Great Feasts — Pascha,
     * Palm Sunday, the Ascension and Pentecost — are already named by the
     * cycle line that stands in this same row, in all five languages, so a
     * chip beside it would print the same words twice.
     */
    feasts: {
      label: 'Great Feast',
      line: '{label} - {name}',
      names: {
        nativityTheotokos: 'The Nativity of the Theotokos',
        exaltation: 'The Exaltation of the Cross',
        entryTheotokos: 'The Entry of the Theotokos into the Temple',
        nativity: 'The Nativity of the Lord',
        theophany: 'Theophany',
        meeting: 'The Meeting of the Lord',
        annunciation: 'The Annunciation',
        transfiguration: 'The Transfiguration',
        dormition: 'The Dormition of the Theotokos',
      },
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
    nameDays: { heading: 'Name days', headingToday: "Today's name days" },
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
    /*
     * The day panel's notices, as a lead and a pointer (redrawn 2026-08-27).
     *
     * The two halves used to be one string apiece, which is what let 28 August
     * 2026 print the Dormition's chip, its readings and its troparion around
     * the sentence "Nothing in the Russian calendar today" - the day's subject
     * being a feast, and the page's subject being a saint folder, of which
     * that day has none. A lead says what the day *is*; the pointer says where
     * the other churches' commemorations are; and the feast lead is the one
     * that was missing. Both halves keep their old wording to the word.
     */
    silence: {
      none: 'Nothing in the {church} calendar today.',
      feast: 'Today is {feast} in the {church} calendar.',
      // Only where the day's own record is here to say it of. Past 13 January
      // 2027 there are no readings below, and the sentence would be promising
      // what the page cannot show.
      feastRecords: 'The readings and hymns below are the feast’s own.',
      feastNoSaints: 'No saint of the day is a folder here yet.',
      elsewhereOne:
        'One commemoration falls today in another church’s calendar - change ' +
        'calendar in the header to see it.',
      elsewhereMany:
        '{count} commemorations fall today in other churches’ calendars - ' +
        'change calendar in the header to see them.',
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
    /*
     * The rank a saint's name is printed with (author, 2026-08-27: "Add the
     * rank Hieromartyr or Righteous if it applies to the saint, and if there
     * is no special rank, print 'St.' prefixed"). One entry per rank the
     * precedence walk in `lib/honorific.js` can reach, masculine and
     * feminine. English declines none of these, so both forms are the same
     * word here; the pair exists for the four packs that do decline them.
     *
     * **`honorific` lost its stop with the same instruction** ("and then
     * strip the ."), reversing 2026-08-25's "please add '.' after St or Sf".
     * It is stripped in all five packs rather than in English alone: a stop
     * in four of them and none in the fifth is the inconsistency that would
     * need correcting next.
     */
    ranks: {
      honorific: { m: 'St', f: 'St' },
      forefather: { m: 'Righteous Forefather', f: 'Righteous Foremother' },
      'great-martyr': { m: 'Great Martyr', f: 'Great Martyr' },
      'virgin-martyr': { m: 'Virgin Martyr', f: 'Virgin Martyr' },
      'passion-bearer': { m: 'Passion-bearer', f: 'Passion-bearer' },
      'equal-to-the-apostles': { m: 'Equal to the Apostles', f: 'Equal to the Apostles' },
      apostle: { m: 'Apostle', f: 'Apostle' },
      prophet: { m: 'Prophet', f: 'Prophetess' },
      hieromartyr: { m: 'Hieromartyr', f: 'Hieromartyr' },
      'venerable-martyr': { m: 'Venerable Martyr', f: 'Venerable Martyr' },
      'new-martyr': { m: 'New Martyr', f: 'New Martyr' },
      martyr: { m: 'Martyr', f: 'Martyr' },
      venerable: { m: 'Venerable', f: 'Venerable' },
      confessor: { m: 'Confessor', f: 'Confessor' },
      blessed: { m: 'Blessed', f: 'Blessed' },
      righteous: { m: 'Righteous', f: 'Righteous' },
    },
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
    /*
     * The two ways into All Saints (author, 2026-08-27). The page opens on the
     * carousel — a search field and a drifting row of saints — and the button
     * beside the heading names *the mode it will take you to*, not the one you
     * are in: "Advanced search" while the carousel is showing, "Carousel mode"
     * while the filters are.
     */
    modeToSearch: 'Advanced search',
    modeToCarousel: 'Carousel mode',
    carouselLabel: 'Saints, drifting',
    /*
     * The three survivors of cancelled Session 6, taken on their merits
     * (2026-08-29): the shuffle deals the row a new hand, and the label says
     * the act rather than the mechanism — no reader owes us the word "seed".
     * `carouselKeys` is the row's own keyboard, announced on the focused track.
     */
    shuffle: 'Shuffle',
    carouselKeys: 'Arrow keys step the row.',
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
    /*
     * One line where there were two (author, 2026-08-26 evening: "Just print
     * 1 line, 'Of 742, 127 saints are in Romanian calendar'"). The page said
     * "127 saints" over "127/742 saints venerated in the Romanian calendar",
     * which is the same number twice whenever no filter is narrowing.
     *
     * Split in two so the lead-in can be set in the secondary ink and the
     * rest in the page's own: the author asked for it "in grey or whatever is
     * halfway between background colour and font colour", and the literal
     * midpoint of gesso and ink is #83807b at **3.09:1**, under AA's 4.5 for
     * text. `--ink-soft` is this palette's own answer to that question and
     * clears it at 5.82:1, so the contrast between the two halves is bought
     * by lifting the *rest* to full ink rather than by sinking the lead-in
     * below the floor. DESIGN.md §2, and the third time this file has been
     * asked for a colour that cannot carry words.
     *
     * Each pack orders its own two halves; the four that are not English
     * already put the church's name in parentheses, because these names are
     * adjectives («Русская») and do not decline into the sentence.
     */
    /*
     * The page's only count, and a ratio (author, 2026-08-27: "instead of Of
     * x, y saints are in the Romanian calendar, just print y/x saints listed.
     * And remove the extra print number of saints that shows up above this
     * line when filters are added").
     *
     * `{shown}` is what is *on the grid* rather than what the church keeps,
     * which is the change that lets the tweened count go: with the church's
     * own number as the numerator a filtered page would have had its real
     * count nowhere. So the line answers both questions the two lines used to
     * answer between them, and it answers them in the word the author chose —
     * listed is what is listed.
     */
    listed: '{shown}/{total} saints listed.',
    keptTitle: 'The calendar control in the header changes which church’s calendar this is.',
    filters: {
      // "Calendar", not "Church" (author, 2026-08-27): since the same
      // sitting this facet *is* the Index's calendar choice, opened on the
      // one the header keeps, so it should carry the header's own word.
      church: 'Calendar',
      // Offered only when the corpus holds a saint no calendar keeps.
      uncalendared: 'Not calendarised',
      month: 'Feast month',
      type: 'Type',
      sex: 'Gender',
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
      random: 'Random order',
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
    backMap: 'Back to the map',
    veneration: 'Veneration',
    /*
     * The apparatus column's own name, for a reader who meets it as a scrolling
     * region rather than as a shape beside the life (2026-09-02). It says what
     * is in the box rather than where the box is: 'left column' means nothing
     * to someone who is not looking at it.
     */
    asideLabel: 'Dates, places and veneration',
    // The register reads the reader's church first (author, 2026-08-22); the
    // other two wait behind this, for this page only.
    otherChurches: 'See the other churches ({count})',
    hideOtherChurches: 'Hide the other churches',
    life: 'Life',
    /*
     * The column of saints beside the life (author, 2026-09-01: "for where the
     * right column would be on Daily Page, provide a row view scroll of the
     * advanced search results in All Saints where you just came from ... Add an
     * option to minimise the search at the very top of this right column").
     *
     * "Your search" rather than "All Saints", because that is what it is: the
     * set the reader had narrowed to when they opened this saint, in the order
     * they had it in. A reader who arrived by any other road gets the corpus,
     * and the heading is honest either way.
     */
    fromSearch: 'Your search',
    sideSearch: 'Search these',
    sideCount: '{n} saints',
    sideCountOne: '1 saint',
    sideNone: 'Nothing here matches that.',
    minimise: 'Minimise',
    expand: 'Show',
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
    /*
     * The name of the civil calendar, for the *second* date in a veneration
     * row (author, 2026-09-02: "just state which falls on '28 January 2026
     * (Gregorian)' and that always stays the same").
     *
     * **Deliberately not in `church.calendarNames`**, and that is the whole
     * reason it is here. `formatFeast` reads a feast's own calendar out of
     * that map and prints the parenthetical only when it finds one — the
     * Gregorian's *absence* is what makes a civil-stored feast print as a bare
     * "17 January", which is the correct reading for the page's own reckoning.
     * Adding the key there labelled every such feast and turned a unit test
     * red on the runner; the two dates want two sources.
     */
    civilCalendar: 'Gregorian',
    feastThisYear: '{feast}, which falls on {gregorian}',
    feastNoOccurrence: '{feast}, which has no occurrence in {year}',
    noFeast: 'No feast day recorded.',
    citation: 'Source: {text}',
    notFoundTitle: 'No such saint',
    notFound: 'There is no saint at this address. The corpus is small and grows folder by folder, so a link that worked yesterday can only be a typo today.',
    failed: 'This saint’s entry could not be loaded. The text lives in a file alongside the rest of the site, so this is usually a network hiccup rather than a missing saint.',
    /*
     * The honest offline state (brief §12: "uncached saints show a clear 'Not
     * available offline' state, not a broken card"). Chosen over `failed`
     * when the browser says it is offline - the fetch failing for want of a
     * network is not a hiccup, and telling a reader to retry into no network
     * is telling them the site is broken when it is the metro that is.
     */
    offline: 'This saint has not been read on this device yet, so there is nothing stored to show offline. Saints you have opened or saved are kept; this one needs the network once.',
    retry: 'Try again',
    historicity: {
      attested: 'Attested - documented by sources close to the events.',
      traditional: 'Traditional - transmitted by the tradition, without independent documentation.',
      disputed: 'Disputed - the sources conflict, or scholarship divides.',
      legendary: 'Legendary - the account is a legend; the person may not have existed.',
    },
    // 'Sex unrecorded' until 2026-08-26 evening: the facet above it says
    // Gender, so the word was carrying its own heading a second time.
    sexLabel: { male: 'Male', female: 'Female', unknown: 'Unrecorded' },
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
    /* The lede, the tray and the Places register are gone with the reading
       they lived in (author, 2026-08-30: the page is the map and a small
       footer, nothing else), and their strings went with them - `lede`,
       `setAside`, `placesHeading`, `noneOfKind`, `uncertainty`, `unlocated`,
       `unlocatedNote` all read by nothing after Amendment 77. */
    kindGroup: 'Which place to show',
    /*
     * One dot cannot honestly stand for four different facts (§8.3), so the
     * reader picks which. `see` rather than the brief's "ministry" because it
     * is what the corpus records: a bishop's see is a specific claim, and
     * relabelling it ministry here would say something the data does not.
     */
    kinds: {
      death: 'Died',
      birth: 'Born',
      see: 'See',
      relics: 'Relics',
    },
    canvasLabel: 'A world map. Drag to move it, arrow keys to pan, plus and minus or a scroll to zoom.',
    /* `caption` - the Natural Earth credit, the soft-edges gloss and the
       scroll hint, printed in a footer under the picture - went on
       2026-08-31 at the author's instruction. Natural Earth asks for no
       attribution ("crediting the authors is unnecessary"), so nothing in it
       was owed; the credit is on the About page with the rest of the
       sourcing, where a reader looking for it would look. */
    zoomGroup: 'Zoom the map',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Whole world',
    landFailed: 'The coastline could not be loaded. The dots still mark their places.',
    // The timeline (author, 2026-08-30 evening: "add a timeline bar at the
    // bottom ... where you can filter saints by date on the map"). `from`
    // and `to` reuse `saints.filters.from`/`.to` — the same question, the
    // same two words, asked by a slider instead of a pair of number boxes.
    timelineGroup: 'Filter by date',
    /* `timelineReadout` went on 2026-08-31 with the line it printed: the
       range is what the two year buttons say, and its `shown` count stopped
       meaning "dots on the picture" the day the timeline began dimming
       rather than removing. */
    timelineReset: 'Whole span',
    /*
     * The map's own search (author, 2026-08-31), which replaced the four
     * kind buttons in the legend. One box over two corpora — the located
     * saints, and `data/places.js`'s gazetteer — because "where is Anthony"
     * and "where is Alexandria" are the same question asked of a map, and
     * splitting them into two controls would make the reader choose which
     * kind of thing they were looking for before they had found it.
     */
    searchLabel: 'Find a saint or a place',
    searchPlaceholder: 'Find a saint or place…',
    searchNone: 'Nothing found',
    searchSaints: 'Saints',
    searchPlaces: 'Places',
    // Announced when a choice flies the map somewhere, because the map
    // itself is one opaque image to a screen reader and a view that moved
    // silently would be a control that appeared to do nothing.
    searchFlewTo: 'Showing {name}',
    /*
     * Choosing a saint (author, 2026-08-31), which is what a press on a dot
     * or a name does now that it no longer opens the saint. `profile` is
     * the button's own word; `profileOf` is what a screen reader hears,
     * because "Profile" alone on a page of dots says nothing about whose.
     * `selected` is announced when the flight lands, for the same reason
     * `searchFlewTo` is — the canvas is one opaque image.
     */
    /*
     * Watching the saints move (author, 2026-09-01), which is off unless the
     * reader asks: the map's resting answer is where each of them ended, and
     * the path between one recorded place and the next is drawn rather than
     * sourced. `movement` names the box; the two announcements are for a
     * reader the picture tells nothing.
     */
    movement: 'Movement',
    movementOn: 'Movement on. Each saint is shown where they were in the timeline’s upper year.',
    movementOff: 'Movement off. Each saint is shown at their resting place.',
    play: 'Play the years',
    /*
     * How fast playback runs (author, 2026-09-02). The option prints the rate
     * as the author wrote it — "1y", "25y" — because it sits beside a play
     * button in a corner of the picture and has no room to say it in words;
     * the label the option belongs to says the rest, out of sight.
     */
    speedLabel: 'Years per second',
    speedOption: '{years}y/s',
    /*
     * The triangle over the selection (author, 2026-09-01). It has no visible
     * label — it is a shape on a rail — so this is the whole of what a screen
     * reader is given for it, and it says what the control *does* rather than
     * naming its shape: the year the map is showing people in.
     */
    watching: 'The year being shown',
    pause: 'Pause',
    profile: 'Profile',
    profileOf: 'Profile of {name}',
    selected: '{name} selected. Their path is shown.',
    /*
     * The filter panel (author, 2026-09-01), and the note is as load-bearing
     * as the two boxes: "not shown" here means *unnamed and unhaloed*, never
     * removed, so a reader who ticks a box expecting new dots to appear is
     * told in advance that the dots were already there. `showPast` and
     * `showFuture` are the author's own two words — a saint already dead in
     * the reader's chosen years, and one not yet born in them — rather than
     * the `past`/`future` the code sorts them by.
     */
    filters: 'Filters',
    showPast: 'Saints already dead',
    showFuture: 'Saints not yet born',
    filterNote: 'Either way their dot stays on the map.',
    showingPast: 'Showing saints who had already died.',
    showingFuture: 'Showing saints not yet born.',
    showingLiveOnly: 'Showing only saints alive in these years.',
    /*
     * What a mark standing for more than one saint prints (2026-09-01). Two
     * saints at one coordinate can never be separated by zooming, so the
     * map says how many are there instead of drawing positions none of them
     * hold — `{name}` is the best-ranked of them, `{count}` is the rest.
     */
    andMore: '{name} +{count}',
    /*
     * A blob's own count, once a coordinate has more saints than one picture
     * can name at a time (author, 2026-09-04: "only do this blob function
     * wherever there are more than 8 saints ... the other groups only
     * display number"). Bare, unlike `andMore` above — a blob is not a
     * collapsed mark standing in for a saint too close to separate, it is a
     * *readable* group of real, individually-drawn dots the picture is
     * choosing not to name right now, so there is no single one of them to
     * lead the count the way a merged mark's representative does.
     */
    blobCount: '+{count}',
    /*
     * The timeline's typed ends (author, 2026-08-31), beside the two
     * handles rather than instead of them: a reader who knows the year
     * types it, a reader who is browsing drags for it. `era` is a real
     * select rather than a minus sign, because "-431" is a number a reader
     * has to decode and "431 BC" is one they can read.
     */
    yearFrom: 'From year',
    yearTo: 'To year',
    era: 'Era',
    eraAD: 'AD',
    eraBC: 'BC',
    /*
     * The preset spans (author, 2026-08-31), which took over the "Whole
     * span" button's place. That button survives *inside* the list as its
     * first entry rather than beside it: "show me everything" is the same
     * kind of answer as "show me the fourth century", and two controls that
     * both set the same two numbers would be one control too many.
     */
    presetLabel: 'Jump to a period',
    presetWhole: 'Whole span',
    presets: {
      apostolic: 'The Apostolic age',
      'ante-nicene': 'The ante-Nicene church',
      'great-persecution': 'The Great Persecution',
      milan: 'The Edict of Milan',
      nicaea: 'The First Council of Nicaea',
      'desert-fathers': 'The Desert Fathers',
      'ecumenical-councils': 'The seven Ecumenical Councils',
      chalcedon: 'The Council of Chalcedon',
      'fall-of-rome': 'The fall of the Western Empire',
      justinian: 'The age of Justinian',
      iconoclasm: 'The Iconoclast controversy',
      'triumph-orthodoxy': 'The Triumph of Orthodoxy',
      'baptism-of-rus': 'The Baptism of Rus',
      'great-schism': 'The Great Schism',
      'kyivan-rus': 'Kyivan Rus',
      'sack-of-constantinople': 'The sack of Constantinople',
      hesychast: 'The Hesychast renewal',
      'fall-of-constantinople': 'The fall of Constantinople',
      'ottoman-period': 'Under Ottoman rule',
      muscovite: 'Muscovite Russia',
      'russian-empire': 'The Russian Empire',
      'greek-independence': 'Greek independence',
      'new-martyrs': 'The New Martyrs',
      'soviet-persecution': 'The Soviet persecution',
    },
  },

  texts: {
    title: 'Texts',
    lede: 'The primary sources this site cites in full: the saints’ own writings, and the writings of those who knew them.',
    empty: 'Nothing here yet.',
    // The saint the text is about, not necessarily its author — a source is
    // as often a life written of a saint (Athanasius on Antony, Jerome on
    // Paul) as a saint's own writing, and "by {name}" would misattribute the
    // first case.
    on: 'on {name}',
  },

  about: {
    title: 'About',
    /*
     * The editorial policy, written 2026-08-29 against what the code and the
     * corpus actually do (brief §8.4: "write it as substance, not boilerplate";
     * it is "the project's defence against the objection that it takes sides").
     *
     * Every claim below was checked against the thing that would make it false:
     * the three states against `schema/saint.schema.json`, the calendars
     * against `src/data/churches.js`, the counts against
     * `data/manifest.meta.json` - which is why the counts are not written here
     * at all but read at render time. A statistic typed into a sentence is
     * stale the next time a folder is added.
     */
    policy: {
      heading: 'What this site claims',
      /*
       * Brief §2's first principle, in the reader's words rather than the
       * repository's. The distinction it draws is the whole project: a
       * commemoration is a fact about a church, and this site reports those
       * facts rather than settling them.
       */
      attest: 'This site never says that someone is a saint. It reports that a named church commemorates them, on a stated day, according to a source you can open. Where two churches differ, both are shown, and neither is corrected.',
      statesHeading: 'Three answers, not two',
      /*
       * §2 again: collapsing "not venerated" into "undocumented" would
       * systematically flatter whichever tradition is better digitised, which
       * is the specific bias this project exists to avoid.
       */
      states: 'For each church a figure is *venerated*, *not venerated*, or *undocumented*. The first two are findings and both require a citation; the third means only that we have not sourced it. Treating a gap in our reading as a refusal would quietly favour whichever church publishes most on the web.',
      datesHeading: 'Dates are intervals',
      dates: 'Every date is a range, and a date known exactly is a range whose ends meet. Where a life is uncertain the page says so rather than choosing a year - an undated saint is listed as undated, not omitted.',
    },
    calendars: {
      heading: 'The calendars',
      lede: 'Fixed feasts are stored with the calendar they were given in and converted for display; they are never rewritten into one reckoning. Pascha and everything that moves with it are reckoned by the Julian computus in all four churches.',
      /** One line per church: which reckoning it keeps. */
      old: 'Old Calendar - fixed feasts by the Julian reckoning, thirteen days behind the civil date until 2100.',
      new: 'New Calendar - fixed feasts on the civil date.',
    },
    sourcing: {
      heading: 'Where it comes from',
      lede: 'Each commemoration is taken from that church\'s own published calendar or synaxarion, and every saint\'s page links the page it was read from. These are the publications the corpus cites today.',
      /** "{count} commemorations from {host}" - the numbers are read, not typed. */
      fromHost: '{count} from {host}',
      lives: 'The lives are written here from the sources each page names. They are in English only: they are paraphrase, and machine-translating a life would turn a sourced claim about a person into an unsourced one.',
      /* The map's own ground, credited here rather than on the map (author,
         2026-08-31). Natural Earth is public domain and asks for no
         attribution at all, so this is a courtesy and says so - and the
         sourcing section is where a reader who wants to know what the
         picture is made of will look. */
      map: 'The map’s coastline, rivers, lakes and terrain shading are Natural Earth, which is public domain and asks for no credit. It is named here because a reader is owed the provenance of a picture as much as of a date.',
      /* Points to the Texts page rather than duplicating its own lede here
         (2026-09-04). Kept out of the primary nav on purpose: the header's
         four-label budget is already the tightest fit the widest packs
         allow (`chrome.spec.js`, "the four pages hold one line in every
         pack") — a fifth broke it everywhere, so this is the door instead. */
      texts: 'Some of these are reproduced in full on the {link} page.',
    },
    /*
     * Export / Import (brief §11, Session 8's surviving third, 2026-08-29).
     * In the privacy section, because that is where the page explains what the
     * device holds - and taking it with you, or bringing it along, is the
     * other half of that explanation.
     */
    data: {
      heading: 'Your data, portable',
      lede: 'Everything above can be downloaded as one file, and a downloaded file can be brought to another device. Importing merges: the newer record wins, so bringing an old backup cannot undo what you did here yesterday.',
      exportButton: 'Download your data',
      importButton: 'Import a file',
      imported: 'Imported. {count} records were newer than what this device held.',
      importedNone: 'Imported. This device already held everything in the file, at the same age or newer.',
      importFailed: 'That file is not an export from this site, so nothing was changed.',
    },
    coverage: {
      heading: 'How much is here',
      lede: 'Counted from the corpus at the last build rather than stated from memory.',
      saints: '{count} saints',
      commemorations: '{count} commemorations across four churches',
      undated: '{count} with no date recorded',
      located: '{count} with a place we can point to',
      /*
       * The most honest line on the page, and the one that will date fastest.
       * Every attestation in the corpus is currently a *positive* finding: no
       * refusal and no sourced "we looked and found nothing" has been recorded
       * yet. Saying so is the difference between a coverage statistic and a
       * claim about the churches.
       */
      positiveOnly: 'Every attestation recorded so far is a positive one. No refusal and no sourced absence has been entered yet, so a church missing from a saint\'s page means we have not read that church on them - not that it does not keep them.',
      built: 'Counted {when}.',
      unavailable: 'The coverage figures could not be loaded.',
    },
    /*
     * Privacy (author, 2026-08-24). Written against what the code actually
     * does rather than as boilerplate: lib/settings.js owns the localStorage
     * key and lib/store.js the four IndexedDB stores, and this text names
     * exactly those and nothing else. If either grows a field, this changes
     * with it - a privacy policy that has drifted from the code is worse than
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
