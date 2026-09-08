var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};

// <define:import.meta.env>
var define_import_meta_env_default;
var init_define_import_meta_env = __esm({
  "<define:import.meta.env>"() {
    define_import_meta_env_default = { BASE_URL: "/" };
  }
});

// src/lib/lru.js
function evictOldest(map, cap) {
  while (map.size > cap) {
    const oldest = map.keys().next().value;
    if (oldest === void 0) return map;
    map.delete(oldest);
  }
  return map;
}
var init_lru = __esm({
  "src/lib/lru.js"() {
    init_define_import_meta_env();
  }
});

// src/lib/detail.js
async function fetchText(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}
async function fetchPayload(slug, signal) {
  const saint = JSON.parse(await fetchText(folder(slug) + "saint.json", signal));
  const [life, images] = await Promise.all([
    saint.text?.life ? fetchText(folder(slug) + saint.text.life, signal) : null,
    Promise.all(
      (saint.images ?? []).map(async (image) => ({
        ...image,
        // A missing or malformed meta file is a gap in what we know about the
        // picture, not a reason to withhold the saint: the page says so in
        // words and carries on.
        credit: image.meta ? await fetchText(folder(slug) + image.meta, signal).then(JSON.parse).catch(() => null) : null
      }))
    )
  ]);
  return { slug, saint, life, images };
}
function start(slug, signal) {
  const promise = fetchPayload(slug, signal);
  cache.set(slug, promise);
  evictOldest(cache, MAX_CACHED);
  promise.catch(() => cache.delete(slug));
  return promise;
}
function pump() {
  while (speculative.size < MAX_IN_FLIGHT && waiting.length) {
    const slug = waiting.shift();
    if (cache.has(slug)) continue;
    const controller = new AbortController();
    speculative.set(slug, controller);
    start(slug, controller.signal).catch(() => {
    }).finally(() => {
      speculative.delete(slug);
      pump();
    });
  }
}
function prefetch(slug) {
  if (!slug || cache.has(slug) || speculative.has(slug) || waiting.includes(slug)) return;
  waiting.push(slug);
  if (waiting.length > MAX_QUEUED) waiting.shift();
  pump();
}
function observePrefetch(root) {
  const links = [...root.querySelectorAll("[data-prefetch]")];
  if (!links.length) return () => {
  };
  const fine = window.matchMedia("(pointer: fine)").matches;
  if (fine) {
    const onEnter = (e) => prefetch(e.currentTarget.dataset.prefetch);
    for (const link of links) {
      link.addEventListener("pointerenter", onEnter);
      link.addEventListener("focus", onEnter);
    }
    return () => {
      for (const link of links) {
        link.removeEventListener("pointerenter", onEnter);
        link.removeEventListener("focus", onEnter);
      }
    };
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        prefetch(entry.target.dataset.prefetch);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "200px" }
  );
  for (const link of links) observer.observe(link);
  return () => observer.disconnect();
}
var BASE, MAX_IN_FLIGHT, MAX_QUEUED, MAX_CACHED, cache, speculative, waiting, folder;
var init_detail = __esm({
  "src/lib/detail.js"() {
    init_define_import_meta_env();
    init_lru();
    BASE = define_import_meta_env_default.BASE_URL;
    MAX_IN_FLIGHT = 4;
    MAX_QUEUED = 12;
    MAX_CACHED = 24;
    cache = /* @__PURE__ */ new Map();
    speculative = /* @__PURE__ */ new Map();
    waiting = [];
    folder = (slug) => `${BASE}saints/${slug}/`;
  }
});

// src/views/index/modes.js
init_define_import_meta_env();

// src/lib/calendar-page.js
init_define_import_meta_env();

// src/lib/jdn.js
init_define_import_meta_env();
function gregorianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}
function julianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
}
var TO_JDN = {
  gregorian: gregorianToJdn,
  julian: julianToJdn,
  "revised-julian": gregorianToJdn
};
var FIXED_CALENDARS = Object.keys(TO_JDN);

// src/lib/feasts.js
init_define_import_meta_env();

// src/lib/computus.js
init_define_import_meta_env();

// src/ui/strings.js
init_define_import_meta_env();
var STRINGS = {
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
    name: "Daily Dox",
    // The tab and the bookmark keep the *other* name, which is Amendment 31's
    // deliberate split: the head says The Orthodox Saint, the page says
    // Orthodoxy Daily. Painting the header from the pack (2026-08-25) nearly
    // collapsed that split by accident — one key was feeding both — so the
    // head has a key of its own now, translated in every pack exactly as the
    // old shared one was.
    tabName: "The Orthodox Saint",
    tagline: "The saints of the Orthodox Church, church by church - Russian, Romanian, Greek and Serbian, each in its own calendar."
  },
  nav: {
    calendar: "Daily",
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
    today: "Today",
    saints: "All Saints",
    map: "Map",
    about: "About"
  },
  theme: {
    light: "light",
    dark: "dark",
    // The toggle's accessible name: what a press does (author, 2026-08-22 —
    // the control is two-way now and the icon shows the same thing).
    switchTo: "Switch to the {next} theme"
  },
  loading: {
    manifestFailed: "The list of saints could not be loaded. This site needs that one file to work at all, so nothing can be shown yet.",
    retry: "Try again"
  },
  calendar: {
    title: "Daily",
    today: "Today",
    prevDay: "Previous day",
    nextDay: "Next day",
    /*
     * The two steps beside the date on a desktop (author, 2026-09-01). The
     * words a reader sees; `prevDay`/`nextDay` above are what a screen reader
     * hears, because "Yesterday" on a page showing a day three weeks back is
     * the wrong word for the thing the button does.
     */
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
    prevWeek: "Previous week",
    nextWeek: "Next week",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    monthView: "Month view",
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
    reckoningLabel: "The calendar this page is read by",
    reckoningFollow: "Follow my church",
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
    fullScreen: "Open Fullscreen",
    fullClose: "Close",
    fullPeriods: "Fasts and seasons",
    fullFeasts: "Great Feasts",
    // Most months hold neither, which is a fact about the church year rather
    // than a gap in the data, so it is said in a sentence.
    fullQuiet: "No fasting season and no Great Feast fall in this month.",
    fullCount: "{n} saints",
    fullCountOne: "1 saint",
    closeMonth: "Close month view",
    weekLabel: "Choose a day",
    commemorationsFor: "Commemorations for {date}",
    alsoToday: "Also commemorated",
    /* The two faces of that list (author, 2026-09-01), and the name of the
       pair for a reader who cannot see that they are beside a heading. */
    registerView: "Show also commemorated as",
    viewCards: "Cards",
    viewList: "List",
    /*
     * The way from the day's saint into their life (author, 2026-09-01: add a
     * "...continue reading >" button at the bottom right at the end of the
     * preview text). The leading ellipsis is the author's and is doing real
     * work: it says the paragraph above was cut rather than finished, which
     * is the one thing a reader cannot tell from a clamped block of text.
     * `continueReadingOf` is what a screen reader hears, because "continue
     * reading" on a page of saints does not say whose life it opens.
     */
    continueReading: "\u2026continue reading",
    heroPlaces: { birth: "Born at {place}", death: "Died at {place}" },
    continueReadingOf: "Continue reading the life of {name}",
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
    readMore: "Read more",
    readMoreOf: "Read more of the life of {name}",
    emptyDay: "No commemorations are recorded for this day - yet. The corpus grows folder by folder, and an empty day is a gap in our sourcing, not a claim about the calendar. Try a neighbouring day, or the saints themselves.",
    // Amendment 44: the day's calendar is recorded — readings, the fast, sometimes its hymns — but none of its saints is a folder yet. Different from an empty day, and the page says which.
    // The reach used to be the literal "19 September" and had been stale for a
    // fortnight when it was found (2026-08-27). It is read off the corpus now:
    // a printed sentence that names a date is a sentence that goes stale.
    dayWithoutSaints: "The readings and hymns below are this day's own, read off the calendar. Its saints are not folders yet - the corpus reaches {reach} so far, and grows folder by folder. Nothing here is a claim that the day is bare.",
    /* Past the end of the day records (2026-08-27). The computed lines - the
       fast, the tone, the week - hold for any date, so a day months ahead
       looked whole while the half that is read off a calendar was simply
       absent. Said once, in prose, in the register of the three silences. */
    beyondRecords: "The readings and hymns are recorded as far as {until}, and this day is past that. What stands above - the fast, the tone and the week - is computed, and holds for any date.",
    heroIn: "In the {church}",
    densityLabel: "{count} commemorations",
    openSaint: "Read about {name}",
    /* The two dots under a date on the week strip (author, 2026-08-26). They
       are what a screen reader is given in place of the dots, so each says
       the whole fact rather than naming a colour. */
    marks: {
      fast: "a fast",
      fish: "a fast, fish permitted",
      feast: "a feast"
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
      open: "What this fast allows",
      hint: "What this fast allows",
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
        strict: "Strict Fasting",
        xerophagy: "Strict Fasting",
        "no-oil": "Strict Fasting",
        oil: "Oil and Wine Allowed",
        fish: "Oil, Wine and Fish Allowed",
        dairy: "Dairy Allowed"
      },
      // And the whole of what the bubble says, one line per grade.
      allows: {
        strict: "Vegan; set aside meat, animal products, cooking oils and alcohol.",
        xerophagy: "Vegan; set aside meat, animal products, cooking oils and alcohol.",
        "no-oil": "Vegan; set aside meat, animal products, cooking oils and alcohol.",
        oil: "Meat, dairy and eggs are set aside; oil and wine are permitted.",
        fish: "Meat, dairy and eggs are set aside; oil, wine and fish are permitted.",
        dairy: "No meat; dairy and eggs are permitted.",
        none: "Nothing is set aside today."
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
      free: "Nothing is set aside.",
      sourceNote: "As printed by {source}.",
      /*
       * The same citation, doing a different job (2026-08-27). `sourceNote`
       * labels a quotation and is right above one. Where the note is *not*
       * quoted - an ungraded fast day, which has defaulted to Strict Fasting
       * since the evening of 2026-08-26 - the sentence above the citation is
       * ours and not the calendar's, and "As printed by saint.gr" was
       * attributing our reading to them. saint.gr printed «Νηστεία»; the word
       * Strict is this site's.
       */
      sourceDay: "The day\u2019s record comes from {source}.",
      close: "Close"
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
      publican: "Sunday of the Publican and the Pharisee",
      prodigal: "Sunday of the Prodigal Son",
      meatfare: "Meatfare Sunday - the Last Judgement",
      cheesefare: "Cheesefare Sunday - Forgiveness Sunday",
      lent1: "1st Sunday of Great Lent - the Triumph of Orthodoxy",
      lent2: "2nd Sunday of Great Lent - St Gregory Palamas",
      lent3: "3rd Sunday of Great Lent - the Veneration of the Cross",
      lent4: "4th Sunday of Great Lent - St John Climacus",
      lent5: "5th Sunday of Great Lent - St Mary of Egypt",
      lazarus: "Lazarus Saturday",
      palm: "Palm Sunday - the Entry into Jerusalem",
      holyWeek: [
        "Great and Holy Sunday",
        "Great and Holy Monday",
        "Great and Holy Tuesday",
        "Great and Holy Wednesday",
        "Great and Holy Thursday",
        "Great and Holy Friday",
        "Great and Holy Saturday"
      ],
      publicanWeekday: "{weekday} of the week of the Publican and the Pharisee",
      meatfareWeekday: "{weekday} of Meatfare Week",
      cheesefareWeekday: "{weekday} of Cheesefare Week",
      cleanMonday: "Clean Monday - Great Lent begins",
      lentWeekday: "{weekday} of the {n} week of Great Lent",
      pascha: "Pascha - the Resurrection of the Lord",
      brightWeek: [
        "Bright Sunday",
        "Bright Monday",
        "Bright Tuesday",
        "Bright Wednesday",
        "Bright Thursday",
        "Bright Friday",
        "Bright Saturday"
      ],
      thomas: "Thomas Sunday - Antipascha",
      myrrhbearers: "Sunday of the Myrrh-bearing Women",
      paralytic: "Sunday of the Paralytic",
      midPentecost: "Mid-Pentecost",
      samaritan: "Sunday of the Samaritan Woman",
      blindMan: "Sunday of the Blind Man",
      leavetaking: "Leavetaking of Pascha",
      ascension: "Ascension of the Lord",
      fathers: "Sunday of the Holy Fathers of the First Council",
      souls: "Saturday of Souls",
      pentecost: "Pentecost",
      holySpirit: "Monday of the Holy Spirit",
      allSaints: "Sunday of All Saints",
      paschaWeekday: "{weekday} of the {n} week of Pascha",
      sundayAfterPentecost: "{n} Sunday after Pentecost",
      weekAfterPentecost: "{n} week after Pentecost"
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
      tone: "Tone {tone}",
      /*
       * A fast day's chip is its grade alone, so the only template left here
       * is the one for a day that is no fast at all. `graded`, `bare` and
       * `freeBecause` stood beside it until the evening of 2026-08-26, when
       * the author moved the occasion to a chip of its own ("Don't mention
       * the event for fasting in the fasting label") and left none of the
       * three with a caller.
       */
      free: "No Fast"
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
      label: "Great Feast",
      line: "{label} - {name}",
      names: {
        nativityTheotokos: "The Nativity of the Theotokos",
        exaltation: "The Exaltation of the Cross",
        entryTheotokos: "The Entry of the Theotokos into the Temple",
        nativity: "The Nativity of the Lord",
        theophany: "Theophany",
        meeting: "The Meeting of the Lord",
        annunciation: "The Annunciation",
        transfiguration: "The Transfiguration",
        dormition: "The Dormition of the Theotokos"
      }
    },
    // The day's readings, where a church's calendar has been read and recorded
    // (author, 2026-08-22; src/data/liturgical-days.js). Links open the NKJV
    // at Bible Gateway for now.
    readings: {
      heading: "Readings",
      // Which Bible a link opens follows the reader's language (author,
      // 2026-08-25); lib/bible.js holds the four and says how each was
      // settled. The sentence names the one this language actually opens.
      source: "As printed by {source}. Links open {bible}.",
      bible: "the New King James Version at Bible Gateway",
      // The two labels the lectionaries use. The data carries each church's
      // own — "Апостол", "Evanghelie" — and often a qualifier with it
      // ("Epistle (Прор)"); the base is translated here and the qualifier is
      // kept exactly as the calendar printed it.
      epistle: "Epistle",
      gospel: "Gospel"
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
    nameDays: { heading: "Name days", headingToday: "Today's name days" },
    // The hymns of the day's saint or feast, in the chosen church's language,
    // copied whole from the cited source (author, 2026-08-22).
    hymns: {
      heading: "Hymns",
      troparion: "Troparion",
      kontakion: "Kontakion",
      source: "Text from {source}",
      /*
       * Under a hymn this site rendered itself, in place of the citation there
       * is none. Amendment 2 forbade rendering anything here until the author
       * reversed it for hymns alone on 2026-09-07, and the line exists because
       * the reversal came with a condition: a reader has to be able to tell a
       * translation made here from a text copied out of a book.
       */
      renderedHere: "Rendered for this site"
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
      none: "Nothing in the {church} calendar today.",
      feast: "Today is {feast} in the {church} calendar.",
      // Only where the day's own record is here to say it of. Past 13 January
      // 2027 there are no readings below, and the sentence would be promising
      // what the page cannot show.
      feastRecords: "The readings and hymns below are the feast\u2019s own.",
      feastNoSaints: "No saint of the day is a folder here yet.",
      elsewhereOne: "One commemoration falls today in another church\u2019s calendar - change calendar in the header to see it.",
      elsewhereMany: "{count} commemorations fall today in other churches\u2019 calendars - change calendar in the header to see them."
    }
  },
  /*
   * The church the reader keeps (author, 2026-08-22): one of four, and with
   * it the calendar, because the calendar follows the church. Asked once on a
   * first visit, changed from the header; read by the calendar, the Index and
   * the saint's page.
   */
  church: {
    open: "Choose a calendar",
    openLabel: "Which church\u2019s calendar the site shows",
    // The header's control is a calendar mark and the church's name alone
    // (author, 2026-08-24). It read "{church} calendar" until then, which
    // said "calendar" twice once the icon was beside it and made the widest
    // control in the header wider still. The accessible name keeps the whole
    // sentence, because an icon says nothing to a screen reader.
    showing: "{church}",
    showingLabel: "{church} calendar - change which church\u2019s calendar the site shows",
    heading: "Which calendar do you keep?",
    groupLabel: "Churches",
    calendarOf: { julian: "Julian calendar", "revised-julian": "Revised Julian calendar" },
    /* The same two calendars, named rather than described: `calendarOf` reads
       under a church's name in the chooser ("Julian calendar"), and this reads
       inside the brackets after a feast's date ("17 January (Julian)"). Two
       keys because Romanian and Russian do not put the same word in both
       places, and one of them would have had to be wrong. */
    calendarNames: { julian: "Julian", "revised-julian": "Revised Julian" },
    // The churches by id, here rather than only in data/churches.js, so the
    // locale packs can translate them (Amendment 36): the registry stays the
    // authority on what exists, this is the authority on what it is called.
    names: { russian: "Russian", romanian: "Romanian", greek: "Greek", serbian: "Serbian" }
  },
  /*
   * The site's language (author, 2026-08-24, Amendment 36): five, chosen from
   * the header. Each language names itself in lib/i18n.js's registry; these
   * are only the control's own strings.
   */
  language: {
    open: "Language",
    openLabel: "The site\u2019s language",
    showingLabel: "{name} - change the site\u2019s language",
    heading: "In which language?",
    groupLabel: "Languages"
  },
  /*
   * The two marks a first visit meets (author, 2026-08-26, replacing the
   * first-visit gate — ui/coachmark.js): "Text as minimal as possible."
   * Four or five words each, naming the thing the button changes rather than
   * describing the button. They sit *under* the control they point at, with an
   * arrow on it, so neither has to say "here" twice.
   */
  coach: {
    church: "Pick your church calendar.",
    language: "Pick your language.",
    dismiss: "Dismiss"
  },
  dates: {
    undated: "Undated",
    // The era, on dates whose own numbers do not carry it (author,
    // 2026-08-26). A string rather than a suffix in the code because the
    // packs may want it before the number, or not at all.
    ad: "{when} AD",
    // A life placed but not bounded: no birth, no death, and a floruit that
    // says where in time the sources put them (author, 2026-08-26).
    flourished: "Lived {when}",
    before: "before {y}",
    after: "after {y}",
    // A life with no recorded beginning is read from its end (author,
    // 2026-08-24): "undated - 1779" became "Entered eternal glory in 1779",
    // and on 2026-08-25 that became plain "Reposed 1779". One form now
    // instead of three: with the verb doing no grammatical work the
    // prepositions went with it, and "Reposed 5th C.", "Reposed c. 250" and
    // "Reposed before 556" all read as the register entries they are. The
    // three keys survive so the packs need no surgery.
    reposeIn: "Reposed {when}",
    reposeInThe: "Reposed {when}",
    repose: "Reposed {when}",
    undatedNote: "No date is recorded at either end of this life. Undated is a finding rather than a blank: it means nothing we have found fixes a bound."
  },
  saints: {
    title: "All Saints",
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
      honorific: { m: "St", f: "St" },
      forefather: { m: "Righteous Forefather", f: "Righteous Foremother" },
      "great-martyr": { m: "Great Martyr", f: "Great Martyr" },
      "virgin-martyr": { m: "Virgin Martyr", f: "Virgin Martyr" },
      "passion-bearer": { m: "Passion-bearer", f: "Passion-bearer" },
      "equal-to-the-apostles": { m: "Equal to the Apostles", f: "Equal to the Apostles" },
      apostle: { m: "Apostle", f: "Apostle" },
      prophet: { m: "Prophet", f: "Prophetess" },
      hieromartyr: { m: "Hieromartyr", f: "Hieromartyr" },
      "venerable-martyr": { m: "Venerable Martyr", f: "Venerable Martyr" },
      "new-martyr": { m: "New Martyr", f: "New Martyr" },
      martyr: { m: "Martyr", f: "Martyr" },
      venerable: { m: "Venerable", f: "Venerable" },
      confessor: { m: "Confessor", f: "Confessor" },
      blessed: { m: "Blessed", f: "Blessed" },
      righteous: { m: "Righteous", f: "Righteous" }
    },
    types: {
      martyr: "Martyr",
      hieromartyr: "Hieromartyr",
      venerable: "Venerable",
      presbyter: "Presbyter",
      bishop: "Bishop",
      hierarch: "Hierarch",
      "venerable-martyr": "Venerable martyr",
      righteous: "Righteous",
      confessor: "Confessor",
      abbot: "Abbot",
      virgin: "Virgin",
      deacon: "Deacon",
      "new-martyr": "New martyr",
      patriarch: "Patriarch",
      prince: "Prince",
      apostle: "Apostle",
      metropolitan: "Metropolitan",
      hermit: "Hermit",
      "great-martyr": "Great martyr",
      monastic: "Monastic",
      prophet: "Prophet",
      "fool-for-christ": "Fool for Christ",
      monk: "Monk",
      "patriarch-of-israel": "Patriarch of Israel",
      theologian: "Theologian",
      king: "King",
      soldier: "Soldier",
      abbess: "Abbess",
      princess: "Princess",
      empress: "Empress",
      stylite: "Stylite",
      iconographer: "Iconographer",
      prophetess: "Prophetess",
      apologist: "Apologist",
      physician: "Physician",
      "passion-bearer": "Passion-bearer",
      preacher: "Preacher",
      forerunner: "Forerunner",
      ascetic: "Ascetic",
      hymnographer: "Hymnographer",
      queen: "Queen",
      "equal-to-the-apostles": "Equal to the Apostles",
      hieromonk: "Hieromonk",
      deaconess: "Deaconess"
    },
    /* "The whole corpus, filterable." stood under the All Saints heading from
       the first Index until the author removed it (2026-08-25 evening). The
       count note under the controls already says how much of the corpus this
       calendar keeps, and the filters are visibly filters; a line that only
       describes the furniture is the furniture DESIGN.md 5b refuses. The key
       is gone from all five packs with it. */
    search: "Search",
    searchHint: "name, type, church, region",
    /*
     * The two ways into All Saints (author, 2026-08-27). The page opens on the
     * carousel — a search field and a drifting row of saints — and the button
     * beside the heading names *the mode it will take you to*, not the one you
     * are in: "Advanced search" while the carousel is showing, "Carousel mode"
     * while the filters are.
     */
    modeToSearch: "Advanced search",
    modeToCarousel: "Carousel mode",
    carouselLabel: "Saints, drifting",
    /*
     * The three survivors of cancelled Session 6, taken on their merits
     * (2026-08-29): the shuffle deals the row a new hand, and the label says
     * the act rather than the mechanism — no reader owes us the word "seed".
     * `carouselKeys` is the row's own keyboard, announced on the focused track.
     */
    shuffle: "Shuffle",
    carouselKeys: "Arrow keys step the row.",
    random: "Random saint",
    clear: "Clear filters",
    countLabel: "saints",
    countAnnounce: "{count} saints match",
    noneMatch: "No saint in the corpus matches all of these filters. That is a fact about a corpus of ten, not about the calendar - widen a filter, or clear them and look around.",
    undatedTray: "{count} undated, set aside",
    undatedNote: "A date range can neither include nor exclude a saint with no bound at either end, so these are set aside rather than dropped. They match everything else you have chosen.",
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
    listed: "{shown}/{total} saints listed.",
    keptTitle: "The calendar control in the header changes which church\u2019s calendar this is.",
    filters: {
      // "Calendar", not "Church" (author, 2026-08-27): since the same
      // sitting this facet *is* the Index's calendar choice, opened on the
      // one the header keeps, so it should carry the header's own word.
      church: "Calendar",
      // Offered only when the corpus holds a saint no calendar keeps.
      uncalendared: "Not calendarised",
      month: "Feast month",
      type: "Type",
      sex: "Gender",
      region: "Region",
      historicity: "Historicity",
      dates: "Dates",
      from: "From year",
      to: "To year",
      rangeMode: "How the range applies",
      overlaps: "Overlaps",
      within: "Entirely within",
      rangeNote: "Overlaps takes any life that touched the range; entirely within takes only lives that sit inside it. Negative years are BC.",
      any: "Any"
    },
    layout: {
      label: "View",
      cards: "Cards",
      rows: "Rows",
      description: "How the saints are laid out",
      // The tick box beside them (author, 2026-08-22): the opening of the life
      // under the name. It swapped the mark for the full matrix too, until the
      // glyph was removed (2026-08-22, DESIGN.md §2).
      detailed: "Detailed",
      detailedDescription: "Show a short description on every saint"
    },
    sort: {
      label: "Sort",
      name: "Name",
      earliest: "Earliest date",
      latest: "Latest date",
      // Author, 2026-08-24. Distinct from the *Random saint* button beside it:
      // that one opens a saint, this one orders the whole Index. Choosing it
      // again reshuffles.
      random: "Random order"
    }
  },
  contact: {
    heading: "Contact",
    // Through the project's issue tracker, not an inbox (author, 2026-08-25:
    // "or even better if they can be stored in the github repo by some
    // built-in affordance so my name doesn't get too involved"). GitHub
    // issues are that affordance: they land in the repository this site is
    // built from, they need no server, and no address of the author's appears
    // on any page. The trade is that an issue is public, which the reader is
    // told before they open one rather than after.
    lede: "Corrections, a saint who is missing, a source that says otherwise - all of it is welcome.",
    open: "Open an issue on the project",
    note: "Issues are part of the public repository this site is built from, so what you write there can be read by anyone. Please leave out anything you would not put on a page of it."
  },
  saint: {
    // The bookmark's accessible names carry the saint's name: on the Index
    // there are many on one page, and a column of identical "Save" buttons is
    // what a screen reader would otherwise be given.
    saveNamed: "Save {name}",
    savedNamed: "{name} is saved. Activate to remove it.",
    back: "Back to All Saints",
    backDaily: "Back to Daily",
    backMap: "Back to the map",
    veneration: "Veneration",
    /*
     * The apparatus column's own name, for a reader who meets it as a scrolling
     * region rather than as a shape beside the life (2026-09-02). It says what
     * is in the box rather than where the box is: 'left column' means nothing
     * to someone who is not looking at it.
     */
    asideLabel: "Dates, places and veneration",
    // The register reads the reader's church first (author, 2026-08-22); the
    // other two wait behind this, for this page only.
    otherChurches: "See the other churches ({count})",
    hideOtherChurches: "Hide the other churches",
    life: "Life",
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
    fromSearch: "Your search",
    sideSearch: "Search these",
    sideCount: "{n} saints",
    sideCountOne: "1 saint",
    sideNone: "Nothing here matches that.",
    minimise: "Minimise",
    expand: "Show",
    noLife: "No life has been written for this saint yet. The entry is a set of attestations until one is.",
    sources: "Sources",
    related: "Related",
    sourceFailed: "This source text could not be loaded. It is a file in this saint\u2019s folder, so a reload usually fixes it.",
    creditUnrecorded: "The licence for this image is not yet recorded, or requires a credit we do not have. Until that is settled, it is shown here on the understanding that it must not be reused on this page\u2019s authority.",
    credit: "{credit} \xB7 {licence}",
    statusVenerated: "Venerated",
    statusRefused: "Not venerated",
    statusUndocumented: "Undocumented",
    undocumentedNote: "Not sourced either way. Absence of data is not absence of veneration.",
    refusedNote: "A positive finding: this church has established that it does not venerate this figure.",
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
      dayMonth: "{day} {month}",
      inCalendar: "{feast} ({calendar})",
      pascha: "Pascha",
      afterPascha: "{n} days after Pascha",
      beforePascha: "{n} days before Pascha"
    },
    // The life is the author's own paraphrase in English and is not
    // translated — Amendment 2 forbids the machine translation that would be
    // the only way to do it at this scale, and a mistranslated hagiography is
    // a false claim about a person. So a reader in one of the other four is
    // told, once, in their own language, rather than left to wonder whether
    // the page is broken.
    lifeInEnglish: "This life is written in English and has not been translated.",
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
    civilCalendar: "Gregorian",
    feastThisYear: "{feast}, which falls on {gregorian}",
    feastNoOccurrence: "{feast}, which has no occurrence in {year}",
    noFeast: "No feast day recorded.",
    citation: "Source: {text}",
    notFoundTitle: "No such saint",
    notFound: "There is no saint at this address. The corpus is small and grows folder by folder, so a link that worked yesterday can only be a typo today.",
    failed: "This saint\u2019s entry could not be loaded. The text lives in a file alongside the rest of the site, so this is usually a network hiccup rather than a missing saint.",
    /*
     * The honest offline state (brief §12: "uncached saints show a clear 'Not
     * available offline' state, not a broken card"). Chosen over `failed`
     * when the browser says it is offline - the fetch failing for want of a
     * network is not a hiccup, and telling a reader to retry into no network
     * is telling them the site is broken when it is the metro that is.
     */
    offline: "This saint has not been read on this device yet, so there is nothing stored to show offline. Saints you have opened or saved are kept; this one needs the network once.",
    retry: "Try again",
    historicity: {
      attested: "Attested - documented by sources close to the events.",
      traditional: "Traditional - transmitted by the tradition, without independent documentation.",
      disputed: "Disputed - the sources conflict, or scholarship divides.",
      legendary: "Legendary - the account is a legend; the person may not have existed."
    },
    // 'Sex unrecorded' until 2026-08-26 evening: the facet above it says
    // Gender, so the word was carrying its own heading a second time.
    sexLabel: { male: "Male", female: "Female", unknown: "Unrecorded" },
    // One register of what is known about when and where, keyed by the kind
    // a date and a location share. The date bar that used to stand here was
    // withdrawn by the author on 2026-08-21.
    factsLabel: "Dates and places",
    kinds: {
      birth: "Born",
      floruit: "Flourished",
      death: "Died",
      ministry: "Ministry",
      see: "See",
      relics: "Relics"
    },
    placeUnnamed: "Place recorded only as coordinates."
  },
  shelf: {
    continueReading: "Continue reading",
    saved: "Saved",
    resume: "Resume",
    remove: "Remove from this shelf",
    // The Continue-reading rows are cleared by swiping them across (author,
    // 2026-08-24); this names the button that does the same thing for a
    // reader who cannot swipe, and which only a keyboard or a screen reader
    // ever reaches. It says the whole action, because out of the row's
    // visual context it has nothing else to lean on.
    removeNamed: "Remove {name} from Continue reading"
  },
  map: {
    title: "Map",
    /* The lede, the tray and the Places register are gone with the reading
       they lived in (author, 2026-08-30: the page is the map and a small
       footer, nothing else), and their strings went with them - `lede`,
       `setAside`, `placesHeading`, `noneOfKind`, `uncertainty`, `unlocated`,
       `unlocatedNote` all read by nothing after Amendment 77. */
    kindGroup: "Which place to show",
    /*
     * One dot cannot honestly stand for four different facts (§8.3), so the
     * reader picks which. `see` rather than the brief's "ministry" because it
     * is what the corpus records: a bishop's see is a specific claim, and
     * relabelling it ministry here would say something the data does not.
     */
    kinds: {
      death: "Died",
      birth: "Born",
      see: "See",
      relics: "Relics"
    },
    canvasLabel: "A world map. Drag to move it, arrow keys to pan, plus and minus or a scroll to zoom.",
    /* `caption` - the Natural Earth credit, the soft-edges gloss and the
       scroll hint, printed in a footer under the picture - went on
       2026-08-31 at the author's instruction. Natural Earth asks for no
       attribution ("crediting the authors is unnecessary"), so nothing in it
       was owed; the credit is on the About page with the rest of the
       sourcing, where a reader looking for it would look. */
    zoomGroup: "Zoom the map",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    zoomReset: "Whole world",
    landFailed: "The coastline could not be loaded. The dots still mark their places.",
    // The timeline (author, 2026-08-30 evening: "add a timeline bar at the
    // bottom ... where you can filter saints by date on the map"). `from`
    // and `to` reuse `saints.filters.from`/`.to` — the same question, the
    // same two words, asked by a slider instead of a pair of number boxes.
    timelineGroup: "Filter by date",
    /* `timelineReadout` went on 2026-08-31 with the line it printed: the
       range is what the two year buttons say, and its `shown` count stopped
       meaning "dots on the picture" the day the timeline began dimming
       rather than removing. */
    timelineReset: "Whole span",
    /*
     * The map's own search (author, 2026-08-31), which replaced the four
     * kind buttons in the legend. One box over two corpora — the located
     * saints, and `data/places.js`'s gazetteer — because "where is Anthony"
     * and "where is Alexandria" are the same question asked of a map, and
     * splitting them into two controls would make the reader choose which
     * kind of thing they were looking for before they had found it.
     */
    searchLabel: "Find a saint or a place",
    searchPlaceholder: "Find a saint or place\u2026",
    searchNone: "Nothing found",
    searchSaints: "Saints",
    searchPlaces: "Places",
    // Announced when a choice flies the map somewhere, because the map
    // itself is one opaque image to a screen reader and a view that moved
    // silently would be a control that appeared to do nothing.
    searchFlewTo: "Showing {name}",
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
    movement: "Movement",
    movementOn: "Movement on. Each saint is shown where they were in the timeline\u2019s upper year.",
    movementOff: "Movement off. Each saint is shown at their resting place.",
    play: "Play the years",
    /*
     * How fast playback runs (author, 2026-09-02). The option prints the rate
     * as the author wrote it — "1y", "25y" — because it sits beside a play
     * button in a corner of the picture and has no room to say it in words;
     * the label the option belongs to says the rest, out of sight.
     */
    speedLabel: "Years per second",
    speedOption: "{years}y/s",
    /*
     * The triangle over the selection (author, 2026-09-01). It has no visible
     * label — it is a shape on a rail — so this is the whole of what a screen
     * reader is given for it, and it says what the control *does* rather than
     * naming its shape: the year the map is showing people in.
     */
    watching: "The year being shown",
    pause: "Pause",
    profile: "Profile",
    profileOf: "Profile of {name}",
    selected: "{name} selected. Their path is shown.",
    /*
     * The filter panel (author, 2026-09-01), and the note is as load-bearing
     * as the two boxes: "not shown" here means *unnamed and unhaloed*, never
     * removed, so a reader who ticks a box expecting new dots to appear is
     * told in advance that the dots were already there. `showPast` and
     * `showFuture` are the author's own two words — a saint already dead in
     * the reader's chosen years, and one not yet born in them — rather than
     * the `past`/`future` the code sorts them by.
     */
    filters: "Filters",
    showPast: "Saints already dead",
    showFuture: "Saints not yet born",
    filterNote: "Either way their dot stays on the map.",
    showingPast: "Showing saints who had already died.",
    showingFuture: "Showing saints not yet born.",
    showingLiveOnly: "Showing only saints alive in these years.",
    /*
     * What a mark standing for more than one saint prints (2026-09-01). Two
     * saints at one coordinate can never be separated by zooming, so the
     * map says how many are there instead of drawing positions none of them
     * hold — `{name}` is the best-ranked of them, `{count}` is the rest.
     */
    andMore: "{name} +{count}",
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
    blobCount: "+{count}",
    /*
     * The timeline's typed ends (author, 2026-08-31), beside the two
     * handles rather than instead of them: a reader who knows the year
     * types it, a reader who is browsing drags for it. `era` is a real
     * select rather than a minus sign, because "-431" is a number a reader
     * has to decode and "431 BC" is one they can read.
     */
    yearFrom: "From year",
    yearTo: "To year",
    era: "Era",
    eraAD: "AD",
    eraBC: "BC",
    /*
     * The preset spans (author, 2026-08-31), which took over the "Whole
     * span" button's place. That button survives *inside* the list as its
     * first entry rather than beside it: "show me everything" is the same
     * kind of answer as "show me the fourth century", and two controls that
     * both set the same two numbers would be one control too many.
     */
    presetLabel: "Jump to a period",
    presetWhole: "Whole span",
    presets: {
      apostolic: "The Apostolic age",
      "ante-nicene": "The ante-Nicene church",
      "great-persecution": "The Great Persecution",
      milan: "The Edict of Milan",
      nicaea: "The First Council of Nicaea",
      "desert-fathers": "The Desert Fathers",
      "ecumenical-councils": "The seven Ecumenical Councils",
      chalcedon: "The Council of Chalcedon",
      "fall-of-rome": "The fall of the Western Empire",
      justinian: "The age of Justinian",
      iconoclasm: "The Iconoclast controversy",
      "triumph-orthodoxy": "The Triumph of Orthodoxy",
      "baptism-of-rus": "The Baptism of Rus",
      "great-schism": "The Great Schism",
      "kyivan-rus": "Kyivan Rus",
      "sack-of-constantinople": "The sack of Constantinople",
      hesychast: "The Hesychast renewal",
      "fall-of-constantinople": "The fall of Constantinople",
      "ottoman-period": "Under Ottoman rule",
      muscovite: "Muscovite Russia",
      "russian-empire": "The Russian Empire",
      "greek-independence": "Greek independence",
      "new-martyrs": "The New Martyrs",
      "soviet-persecution": "The Soviet persecution"
    }
  },
  texts: {
    title: "Texts",
    lede: "The primary sources this site cites in full: the saints\u2019 own writings, and the writings of those who knew them.",
    empty: "Nothing here yet.",
    // The saint the text is about, not necessarily its author — a source is
    // as often a life written of a saint (Athanasius on Antony, Jerome on
    // Paul) as a saint's own writing, and "by {name}" would misattribute the
    // first case.
    on: "on {name}"
  },
  about: {
    title: "About",
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
      heading: "What this site claims",
      /*
       * Brief §2's first principle, in the reader's words rather than the
       * repository's. The distinction it draws is the whole project: a
       * commemoration is a fact about a church, and this site reports those
       * facts rather than settling them.
       */
      attest: "This site never says that someone is a saint. It reports that a named church commemorates them, on a stated day, according to a source you can open. Where two churches differ, both are shown, and neither is corrected.",
      statesHeading: "Three answers, not two",
      /*
       * §2 again: collapsing "not venerated" into "undocumented" would
       * systematically flatter whichever tradition is better digitised, which
       * is the specific bias this project exists to avoid.
       */
      states: "For each church a figure is *venerated*, *not venerated*, or *undocumented*. The first two are findings and both require a citation; the third means only that we have not sourced it. Treating a gap in our reading as a refusal would quietly favour whichever church publishes most on the web.",
      datesHeading: "Dates are intervals",
      dates: "Every date is a range, and a date known exactly is a range whose ends meet. Where a life is uncertain the page says so rather than choosing a year - an undated saint is listed as undated, not omitted."
    },
    calendars: {
      heading: "The calendars",
      lede: "Fixed feasts are stored with the calendar they were given in and converted for display; they are never rewritten into one reckoning. Pascha and everything that moves with it are reckoned by the Julian computus in all four churches.",
      /** One line per church: which reckoning it keeps. */
      old: "Old Calendar - fixed feasts by the Julian reckoning, thirteen days behind the civil date until 2100.",
      new: "New Calendar - fixed feasts on the civil date."
    },
    sourcing: {
      heading: "Where it comes from",
      lede: "Each commemoration is taken from that church's own published calendar or synaxarion, and every saint's page links the page it was read from. These are the publications the corpus cites today.",
      /** "{count} commemorations from {host}" - the numbers are read, not typed. */
      fromHost: "{count} from {host}",
      lives: "The lives are written here from the sources each page names. They are in English only: they are paraphrase, and machine-translating a life would turn a sourced claim about a person into an unsourced one.",
      /* The map's own ground, credited here rather than on the map (author,
         2026-08-31). Natural Earth is public domain and asks for no
         attribution at all, so this is a courtesy and says so - and the
         sourcing section is where a reader who wants to know what the
         picture is made of will look. */
      map: "The map\u2019s coastline, rivers, lakes and terrain shading are Natural Earth, which is public domain and asks for no credit. It is named here because a reader is owed the provenance of a picture as much as of a date.",
      /* Points to the Texts page rather than duplicating its own lede here
         (2026-09-04). Kept out of the primary nav on purpose: the header's
         four-label budget is already the tightest fit the widest packs
         allow (`chrome.spec.js`, "the four pages hold one line in every
         pack") — a fifth broke it everywhere, so this is the door instead. */
      texts: "Some of these are reproduced in full on the {link} page."
    },
    /*
     * Export / Import (brief §11, Session 8's surviving third, 2026-08-29).
     * In the privacy section, because that is where the page explains what the
     * device holds - and taking it with you, or bringing it along, is the
     * other half of that explanation.
     */
    data: {
      heading: "Your data, portable",
      lede: "Everything above can be downloaded as one file, and a downloaded file can be brought to another device. Importing merges: the newer record wins, so bringing an old backup cannot undo what you did here yesterday.",
      exportButton: "Download your data",
      importButton: "Import a file",
      imported: "Imported. {count} records were newer than what this device held.",
      importedNone: "Imported. This device already held everything in the file, at the same age or newer.",
      importFailed: "That file is not an export from this site, so nothing was changed."
    },
    coverage: {
      heading: "How much is here",
      lede: "Counted from the corpus at the last build rather than stated from memory.",
      saints: "{count} saints",
      commemorations: "{count} commemorations across four churches",
      undated: "{count} with no date recorded",
      located: "{count} with a place we can point to",
      /*
       * The most honest line on the page, and the one that will date fastest.
       * Every attestation in the corpus is currently a *positive* finding: no
       * refusal and no sourced "we looked and found nothing" has been recorded
       * yet. Saying so is the difference between a coverage statistic and a
       * claim about the churches.
       */
      positiveOnly: "Every attestation recorded so far is a positive one. No refusal and no sourced absence has been entered yet, so a church missing from a saint's page means we have not read that church on them - not that it does not keep them.",
      built: "Counted {when}.",
      unavailable: "The coverage figures could not be loaded."
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
      heading: "Privacy",
      lede: "Nothing about you is collected, and there is no account to make. What this site remembers, it remembers on your own device, and it is only what it needs to give you back the page you left.",
      keepsHeading: "What is kept on your device",
      keeps: [
        "Where you were reading, and how far down the page you had got.",
        "The saints you have saved, and the saints you have opened recently.",
        "The church whose calendar you chose, and the light or dark setting.",
        "How you last left the All Saints page - cards or rows, and whether descriptions were shown."
      ],
      notHeading: "What is not done",
      not: [
        "No analytics, no tracking pixels, no advertising, and no cookies.",
        "Nothing you do here is sent to this site\u2019s makers or to anyone else.",
        "Nothing is shared or sold, because nothing is gathered to share or sell."
      ],
      clearing: "All of it stays in this browser, on this device, and clearing the site\u2019s data in your browser removes every trace of it. Nothing is kept anywhere else, so there is nothing to ask us to delete.",
      hosting: "Two honest footnotes. The files are served by GitHub Pages, and any web server sees the requests made to it; that is the host\u2019s doing, not this site\u2019s, and it is the same for every page on the internet. And the day\u2019s readings link out to Bible Gateway - following one takes you to a different site, with its own policy."
    }
  },
  notFound: {
    title: "Not found",
    body: "There is no page at this address."
  }
};
var fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));

// src/lib/calendar-page.js
var ERA_OBVIOUS = 1e3;
function withEra(text, iv) {
  if (!text || /\b(AD|BC)\b/.test(text)) return text;
  const bounds = [iv?.earliest, iv?.latest].filter((n) => typeof n === "number");
  if (!bounds.length || Math.max(...bounds) >= ERA_OBVIOUS || Math.min(...bounds) <= 0) return text;
  if (!/(\d|\bC\.)$/.test(text)) return text;
  return fill(STRINGS.dates.ad, { when: text });
}
function formatInterval(iv) {
  if (!iv) return STRINGS.dates.undated;
  if (iv.display) return withEra(iv.display.replace(/\bcentury\b/g, "C."), iv);
  const { earliest, latest } = iv;
  if (earliest === null && latest === null) return STRINGS.dates.undated;
  if (earliest === null) return withEra(fill(STRINGS.dates.before, { y: latest }), iv);
  if (latest === null) return withEra(fill(STRINGS.dates.after, { y: earliest }), iv);
  if (earliest === latest) return withEra(String(earliest), iv);
  return withEra(`${earliest}\u2013${latest}`, iv);
}
function formatLifespan(dates) {
  const birth = formatInterval(dates?.birth);
  const death = formatInterval(dates?.death);
  if (birth === STRINGS.dates.undated && death === STRINGS.dates.undated) {
    const flourished = formatInterval(dates?.floruit);
    if (flourished !== STRINGS.dates.undated) return fill(STRINGS.dates.flourished, { when: flourished });
    return STRINGS.dates.undated;
  }
  if (birth === STRINGS.dates.undated) {
    if (/^(before|after|under)\s/.test(death)) return fill(STRINGS.dates.repose, { when: death });
    if (/\bC\./.test(death)) return fill(STRINGS.dates.reposeInThe, { when: death });
    return fill(STRINGS.dates.reposeIn, { when: death });
  }
  return `${birth} \u2013 ${death}`;
}
function formatSubtext(card) {
  const life = formatLifespan(card?.dates);
  return card?.office ? `${card.office} \xB7 ${life}` : life;
}

// src/lib/hero-crop.js
init_define_import_meta_env();
var MAX_HERO_RATIO = 1.6;
var MIN_HERO_RATIO = 0.5;
function heroCrop(image) {
  if (!image?.w || !image?.h) return { height: 0, focus: "50% 0" };
  const tall = image.w * MAX_HERO_RATIO;
  const wide = image.w * MIN_HERO_RATIO;
  return {
    height: Math.min(Math.max(image.h, wide), tall),
    focus: image.h < wide ? "50% 50%" : "50% 0"
  };
}
function cardCrop(image) {
  const { height, focus } = heroCrop(image);
  if (!height) return { aspect: null, focus };
  if (height === image.h && image.aspect) return { aspect: image.aspect, focus };
  return { aspect: image.w / height, focus };
}

// src/views/index/modes.js
init_detail();

// src/lib/honorific.js
init_define_import_meta_env();

// src/lib/i18n.js
init_define_import_meta_env();

// src/lib/settings.js
init_define_import_meta_env();
var KEY = "gos-settings";
var DEFAULTS = {
  // 'light' | 'dark' once the reader has pressed the toggle; null until then,
  // which means "follow the system" (author, 2026-08-22 — it was three-way
  // with a 'system' value until then, and a stored 'system' reads as null).
  theme: null,
  // Which church the reader keeps (author, 2026-08-22): a church id from the
  // registry — russian, romanian or greek — or null until the reader has been
  // asked, which is a different state from having answered (lib/church.js).
  // `traditions` and `calendar` stood here for the cross-church build and went
  // with it; values left in a reader's storage from then are simply ignored.
  church: null,
  /*
   * The site's language (author, 2026-08-24): one of lib/i18n.js's five ids,
   * or null until the reader has been asked. Null *reads* as English —
   * i18n.js falls back to it and always did — so nothing about a first paint
   * changes; what the null buys is the difference between "English because
   * the reader chose it" and "English because nobody has said".
   *
   * It said 'en' outright until 2026-08-25 evening, on the reasoning that
   * English is an answer and not a question. The author reversed that: "same
   * as the message to choose which church, open the language options as well
   * for first time visitors to know they can change language" — the question
   * is not which language the site should be in, it is whether the reader
   * knows the site has five.
   */
  language: null,
  /*
   * Which coachmarks this browser has already been shown, by control id
   * (2026-08-27). It is a *seen* list and not an *answered* one, and that is
   * the whole point of it: the two marks were gated on `hasChosen()` and
   * `hasChosenLanguage()`, so a reader content with the guessed calendar and
   * with English never answered either question and was shown both marks on
   * every load, for ever. A coachmark that returns is not a coachmark.
   */
  coachSeen: [],
  defaultLocationKind: "death",
  riverSeed: null,
  // 'cards' — image above the name, box from the manifest's aspect ratio.
  // 'rows'  — name and dates first, a square thumbnail at the trailing edge.
  //
  // **null until the reader chooses**, since 2026-08-27, and that is the whole
  // point of it being null rather than 'cards': the author asked for cards on a
  // desktop and rows on a phone, and a stored value cannot say "whichever suits
  // the screen". A default here would have answered the question before
  // `defaultLayout()` in views/index/controls.js ever got to ask it — which is
  // exactly what happened the first time this was written, silently, because
  // 'cards' is a perfectly valid layout and nothing looked wrong.
  indexLayout: null,
  // Detailed (author, 2026-08-22): the matrix for the badge and a line of the
  // life on every card. Off until asked for, and remembered once it is.
  indexDetailed: false,
  /*
   * How *Also commemorated* is laid out on the Daily page (author, 2026-09-01:
   * "Cards by default, site remembers what you left it as").
   *
   * 'cards' rather than null, and the difference from `indexLayout` above is
   * worth stating because they look like the same decision. The Index needed
   * null because its answer depends on the screen — cards at a desk, rows on a
   * phone — and a stored default would have answered before the screen was
   * consulted. This one does not: the list is a list on a phone whatever is
   * stored here, because the toggle is a desktop control, so the stored value
   * only ever speaks about the surface it was set on.
   */
  registerLayout: "cards"
};
function readSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

// src/lib/i18n.js
var LANGUAGES = [
  /* `pack` is null until that language's chunk has landed, and every reader of
     it — `applyLocale` here, `allNames` in lib/saint-types.js — already treats
     null as "English", which is what an unloaded pack should read as. */
  { id: "en", code: "EN", tag: "en", name: "English", pack: null },
  { id: "ru", code: "RU", tag: "ru", name: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", pack: null },
  { id: "ro", code: "RO", tag: "ro", name: "Rom\xE2n\u0103", pack: null },
  { id: "el", code: "GR", tag: "el", name: "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC", pack: null },
  { id: "sr", code: "RS", tag: "sr", name: "\u0421\u0440\u043F\u0441\u043A\u0438", pack: null }
];
var LANGUAGES_BY_ID = Object.fromEntries(LANGUAGES.map((l) => [l.id, l]));
var clone = (value) => Array.isArray(value) ? value.map(clone) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)])) : value;
var BASE2 = clone(STRINGS);
function mergeInto(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object") {
      mergeInto(target[key], value);
    } else {
      target[key] = clone(value);
    }
  }
}
function pruneTo(target, shape) {
  for (const key of Object.keys(target)) {
    if (!(key in shape)) delete target[key];
    else if (target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
      pruneTo(target[key], shape[key]);
    }
  }
}
function applyLocale(id) {
  pruneTo(STRINGS, BASE2);
  mergeInto(STRINGS, BASE2);
  const pack = LANGUAGES_BY_ID[id]?.pack;
  if (pack) mergeInto(STRINGS, pack);
  formatters.clear();
}
var current;
function currentLanguage() {
  if (current === void 0) {
    const stored = readSettings().language;
    current = LANGUAGES_BY_ID[stored] ? stored : "en";
    applyLocale(current);
  }
  return current;
}
var formatters = /* @__PURE__ */ new Map();

// src/lib/honorific.js
var isCollective = (name) => /^The\s/.test(name);
var MONASTIC = ["monk", "hermit", "ascetic", "monastic", "abbot", "abbess", "stylite", "hieromonk", "recluse"];
var PRECEDENCE = [
  ["forefather", (t) => t.has("patriarch-of-israel")],
  ["great-martyr", (t) => t.has("great-martyr")],
  ["virgin-martyr", (t) => t.has("martyr") && t.has("virgin")],
  ["passion-bearer", (t) => t.has("passion-bearer")],
  ["equal-to-the-apostles", (t) => t.has("equal-to-the-apostles")],
  ["apostle", (t) => t.has("apostle")],
  ["prophet", (t) => t.has("prophet") || t.has("prophetess")],
  ["hieromartyr", (t) => t.has("hieromartyr")],
  ["venerable-martyr", (t) => t.has("venerable-martyr")],
  ["new-martyr", (t) => t.has("new-martyr")],
  ["martyr", (t) => t.has("martyr")],
  ["venerable", (t) => t.has("venerable") || MONASTIC.some((m) => t.has(m))],
  ["confessor", (t) => t.has("confessor")],
  ["blessed", (t) => t.has("fool-for-christ")],
  ["righteous", (t) => t.has("righteous")]
];
function rankKey(card) {
  const types = new Set(card?.types ?? []);
  for (const [key, test] of PRECEDENCE) if (test(types)) return key;
  return "honorific";
}
function rankLabel(card) {
  const key = rankKey(card);
  const forms = STRINGS.saints?.ranks?.[key] ?? STRINGS.saints?.ranks?.honorific;
  if (!forms) return "";
  return (card?.sex === "female" ? forms.f : forms.m) || forms.m || "";
}
var takesNoRank = (card, english) => card?.kind === "feast" || isCollective(english);
var alreadyPrefixed = (name) => /^(St\.?|Saint|Sf\.?|Св\.?|Άγ\.?)\s/.test(name);
function withHonorific(displayName, card = null) {
  const name = String(displayName ?? "");
  if (!name || takesNoRank(card, name)) return name;
  if (alreadyPrefixed(name)) return name;
  const label = rankLabel(card);
  return label ? `${label} ${name}` : name;
}
function saintName(card) {
  const english = String(card?.display_name ?? "");
  const local = card?.names?.[currentLanguage()];
  const name = local ? String(local) : english;
  if (!name || takesNoRank(card, english)) return name;
  return withHonorific(name, card);
}

// src/lib/markdown.js
init_define_import_meta_env();
var ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
var escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ESCAPES[c]);

// src/lib/name-lines.js
init_define_import_meta_env();
function nameLines(text, avail, ctx, max = Infinity) {
  if (!(avail > 0)) return 1;
  const space = ctx.measureText(" ").width;
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    const w = ctx.measureText(word).width;
    if (w > avail) {
      if (used > 0) lines += 1;
      lines += Math.ceil(w / avail) - 1;
      used = w % avail;
      continue;
    }
    const next = used === 0 ? w : used + space + w;
    if (used > 0 && next > avail) {
      lines += 1;
      used = w;
    } else {
      used = next;
    }
  }
  return Math.min(lines, max);
}

// src/ui/loop-scroll.js
init_define_import_meta_env();

// src/lib/motion.js
init_define_import_meta_env();
var reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// src/ui/loop-scroll.js
function loopSlice(list, buffer) {
  const n = list.length;
  if (!n) return [];
  const out = [];
  for (let i = -buffer; i < n + buffer; i++) out.push(list[(i % n + n) % n]);
  return out;
}
var MAX_INFLIGHT = 4;
var ON_SCREEN = 0;
var AHEAD = 1;
var BEHIND = 2;
function windowImages(track, { margin = 700, direction = () => 1, inflight = MAX_INFLIGHT } = {}) {
  if (typeof IntersectionObserver !== "function") {
    for (const img of track.querySelectorAll("img[data-src]")) img.src = img.dataset.src;
    return () => {
    };
  }
  const near = /* @__PURE__ */ new Set();
  let handed = 0;
  let running = 0;
  let pumping = false;
  let dead = false;
  const settle = (img) => {
    if (!img || !img.__cxRunning) return;
    img.__cxRunning = false;
    running -= 1;
    pump2();
  };
  const onSettle = (e) => settle(e.currentTarget);
  const start2 = (img, tier) => {
    img.__cxRunning = true;
    running += 1;
    img.addEventListener("load", onSettle, { once: true });
    img.addEventListener("error", onSettle, { once: true });
    img.fetchPriority = tier === ON_SCREEN ? "high" : "low";
    img.dataset.cxSeq = String(handed += 1);
    img.src = img.dataset.src;
  };
  const release = (img) => {
    if (!img.hasAttribute("src")) return;
    if (img.__cxRunning) settle(img);
    img.removeAttribute("src");
  };
  const pump2 = () => {
    if (dead || pumping) return;
    pumping = true;
    try {
      if (running >= inflight) return;
      const box = track.getBoundingClientRect();
      const heading = direction() < 0 ? -1 : 1;
      const waiting2 = [];
      for (const img of near) {
        if (img.hasAttribute("src") || !img.dataset.src) continue;
        const r = img.getBoundingClientRect();
        const onScreen = r.right > box.left && r.left < box.right;
        const ahead = heading > 0 ? r.left - box.right : box.left - r.right;
        const tier = onScreen ? ON_SCREEN : ahead >= 0 ? AHEAD : BEHIND;
        waiting2.push({ img, tier, ahead: Math.abs(ahead) });
      }
      waiting2.sort((a, b) => a.tier - b.tier || a.ahead - b.ahead);
      for (const w of waiting2) {
        if (running >= inflight) break;
        start2(w.img, w.tier);
      }
    } finally {
      pumping = false;
    }
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        for (const img of e.target.querySelectorAll("img[data-src]")) {
          if (e.isIntersecting) near.add(img);
          else {
            near.delete(img);
            release(img);
          }
        }
      }
      pump2();
    },
    { root: track, rootMargin: `0px ${margin}px` }
  );
  for (const card of track.children) io.observe(card);
  let frame = null;
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      pump2();
    });
  };
  track.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    dead = true;
    if (frame) cancelAnimationFrame(frame);
    track.removeEventListener("scroll", onScroll);
    io.disconnect();
  };
}
function loopScroll(track, count, { buffer = 12, speed = 26, startAt = null, wheelMax = 900, wheelGain = 1.4, wheelDecay = 0.94 } = {}) {
  let headSpan = 0;
  let bodySpan = 0;
  let lowerBound = 0;
  let started = false;
  let touchActive = false;
  let touchSettle = 0;
  let paused = false;
  let focused = track === document.activeElement || track.contains(document.activeElement);
  let raf = null;
  let pos = null;
  let lastWritten = -1;
  let currentSpeed = 0;
  let wheelVel = 0;
  let last = performance.now();
  let heading = 1;
  const headed = (delta) => {
    if (delta > 0.5) heading = 1;
    else if (delta < -0.5) heading = -1;
  };
  let pointerAt = -Infinity;
  let holdUntil = 0;
  let dragging = false;
  let dragFrom = 0;
  let dragLeft = 0;
  let dragMoved = 0;
  let dragId = null;
  let captured = false;
  function measure() {
    const first = track.children[buffer];
    const afterBody = track.children[buffer + count];
    const edge = track.children[1];
    const next = first && afterBody ? afterBody.offsetLeft - first.offsetLeft : 0;
    if (bodySpan && next && bodySpan !== next) {
      track.scrollLeft = track.scrollLeft * (next / bodySpan);
      lastWritten = track.scrollLeft;
      if (pos !== null) pos *= next / bodySpan;
    }
    bodySpan = next;
    headSpan = first ? first.offsetLeft : 0;
    lowerBound = edge ? edge.offsetLeft : 0;
    if (!started && headSpan) {
      started = true;
      const at = startAt ?? headSpan;
      track.scrollLeft = at;
      lastWritten = track.scrollLeft;
      pos = track.scrollLeft;
      wrap2();
      pos = track.scrollLeft;
    }
  }
  function wrap2() {
    if (bodySpan <= 0 || touchActive || performance.now() < touchSettle) return 0;
    const upper = headSpan + bodySpan;
    const at = track.scrollLeft;
    let delta = 0;
    if (at < lowerBound) delta = Math.ceil((lowerBound - at) / bodySpan) * bodySpan;
    else if (at > upper) delta = -Math.ceil((at - upper) / bodySpan) * bodySpan;
    if (delta) {
      track.scrollLeft = at + delta;
      lastWritten = track.scrollLeft;
    }
    return delta;
  }
  const onScroll = () => {
    if (Math.abs(track.scrollLeft - lastWritten) > 1) {
      const delta = track.scrollLeft - (pos ?? track.scrollLeft);
      if (!bodySpan || Math.abs(delta) < bodySpan / 2) headed(delta);
      pos = track.scrollLeft;
    }
    wrap2();
  };
  const onTouchStart = () => {
    touchActive = true;
    currentSpeed = 0;
    pos = null;
  };
  const onTouchEnd = () => {
    touchActive = false;
    touchSettle = performance.now() + 700;
  };
  const onWheel = (e) => {
    if (reducedMotion()) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!delta) return;
    e.preventDefault();
    if (pos === null) pos = track.scrollLeft;
    wheelVel = Math.max(-wheelMax, Math.min(wheelMax, wheelVel + delta * wheelGain));
    currentSpeed = 0;
  };
  const POINTER_HOLD = 2500;
  const onFocusIn = () => {
    if (performance.now() - pointerAt < 400) {
      hold();
      return;
    }
    focused = true;
    pos = null;
  };
  const onFocusOut = () => {
    focused = false;
  };
  const hold = () => {
    holdUntil = performance.now() + POINTER_HOLD;
    currentSpeed = 0;
  };
  const onPointerDown = (e) => {
    pointerAt = performance.now();
    dragMoved = 0;
    if (e.pointerType === "touch" || e.button !== 0) return;
    dragging = true;
    dragFrom = e.clientX;
    dragLeft = track.scrollLeft;
    dragId = e.pointerId;
    captured = false;
    wheelVel = 0;
    currentSpeed = 0;
    track.classList.add("is-dragging");
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragFrom;
    dragMoved = Math.max(dragMoved, Math.abs(dx));
    if (!captured && dragMoved > 4) {
      captured = true;
      track.setPointerCapture?.(dragId);
    }
    headed(dragLeft - dx - track.scrollLeft);
    track.scrollLeft = dragLeft - dx;
    lastWritten = track.scrollLeft;
    pos = track.scrollLeft;
    pos += wrap2();
    dragLeft = track.scrollLeft + dx;
  };
  const onPointerUp = (e) => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("is-dragging");
    if (captured) {
      captured = false;
      track.releasePointerCapture?.(e.pointerId);
    }
    hold();
  };
  const onClickCapture = (e) => {
    if (dragMoved > 4) {
      e.preventDefault();
      e.stopPropagation();
    }
    dragMoved = 0;
  };
  const onDragStart = (e) => e.preventDefault();
  track.addEventListener("scroll", onScroll, { passive: true });
  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", onPointerUp);
  track.addEventListener("pointercancel", onPointerUp);
  track.addEventListener("click", onClickCapture, true);
  track.addEventListener("dragstart", onDragStart);
  track.addEventListener("touchstart", onTouchStart, { passive: true });
  track.addEventListener("touchend", onTouchEnd, { passive: true });
  track.addEventListener("touchcancel", onTouchEnd, { passive: true });
  track.addEventListener("wheel", onWheel, { passive: false });
  track.addEventListener("focusin", onFocusIn);
  track.addEventListener("focusout", onFocusOut);
  const frozen = () => paused || touchActive || dragging || performance.now() < touchSettle || !track.clientWidth;
  const drifting = () => !focused && performance.now() >= holdUntil && !reducedMotion();
  function frame(now) {
    const dt = Math.min(now - last, 50);
    last = now;
    raf = requestAnimationFrame(frame);
    if (!started || !bodySpan) measure();
    if (frozen()) {
      currentSpeed = 0;
      wheelVel = 0;
      pos = null;
      return;
    }
    if (pos === null) pos = track.scrollLeft;
    if (drifting()) currentSpeed += (speed - currentSpeed) * 0.06;
    else currentSpeed = 0;
    if (wheelVel) {
      wheelVel *= wheelDecay ** (dt / 16.67);
      if (Math.abs(wheelVel) < 1) wheelVel = 0;
    }
    const velocity = currentSpeed + wheelVel;
    if (!velocity) return;
    headed(velocity);
    pos += velocity * (dt / 1e3);
    track.scrollLeft = pos;
    lastWritten = track.scrollLeft;
    pos += wrap2();
  }
  measure();
  raf = requestAnimationFrame(frame);
  const onResize = () => measure();
  window.addEventListener("resize", onResize);
  return {
    measure,
    /** Which way the row last moved: +1 forward, -1 back. See `heading`. */
    direction: () => heading,
    /*
     * **A gesture survives the rebuild that interrupts it** (2026-08-29). A
     * late repaint - the packing key moves when fonts or pictures settle -
     * destroys this loop and constructs a successor, and a wheel spun in that
     * window died with its loop: the reader's spin simply stopped, and the
     * suite's press-and-wheel test showed it as a row that never answered.
     * `handoff()` is what the old loop knows that the new one cannot ask the
     * DOM for; modes.js carries it across. The successor adopts the velocity
     * and the hold, and the reader never learns a rebuild happened - which is
     * the standard the focus latch already set at construction.
     */
    handoff() {
      return { wheelVel, holdUntil, pointerAt };
    },
    inherit(prev) {
      if (!prev) return;
      wheelVel = Math.max(-wheelMax, Math.min(wheelMax, prev.wheelVel ?? 0));
      holdUntil = prev.holdUntil ?? 0;
      pointerAt = prev.pointerAt ?? -Infinity;
    },
    pause() {
      paused = true;
      currentSpeed = 0;
      wheelVel = 0;
      pos = null;
    },
    resume() {
      paused = false;
      last = performance.now();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      window.removeEventListener("resize", onResize);
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", onPointerUp);
      track.removeEventListener("pointercancel", onPointerUp);
      track.removeEventListener("click", onClickCapture, true);
      track.removeEventListener("dragstart", onDragStart);
      track.removeEventListener("touchstart", onTouchStart);
      track.removeEventListener("touchend", onTouchEnd);
      track.removeEventListener("touchcancel", onTouchEnd);
      track.removeEventListener("wheel", onWheel);
      track.removeEventListener("focusin", onFocusIn);
      track.removeEventListener("focusout", onFocusOut);
    }
  };
}

// src/lib/store.js
init_define_import_meta_env();

// node_modules/idb/build/index.js
init_define_import_meta_env();
var instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
var idbProxyableTypes;
var cursorAdvanceMethods;
function getIdbProxyableTypes() {
  return idbProxyableTypes || (idbProxyableTypes = [
    IDBDatabase,
    IDBObjectStore,
    IDBIndex,
    IDBCursor,
    IDBTransaction
  ]);
}
function getCursorAdvanceMethods() {
  return cursorAdvanceMethods || (cursorAdvanceMethods = [
    IDBCursor.prototype.advance,
    IDBCursor.prototype.continue,
    IDBCursor.prototype.continuePrimaryKey
  ]);
}
var transactionDoneMap = /* @__PURE__ */ new WeakMap();
var transformCache = /* @__PURE__ */ new WeakMap();
var reverseTransformCache = /* @__PURE__ */ new WeakMap();
function promisifyRequest(request) {
  const promise = new Promise((resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener("success", success);
      request.removeEventListener("error", error);
    };
    const success = () => {
      resolve(wrap(request.result));
      unlisten();
    };
    const error = () => {
      reject(request.error);
      unlisten();
    };
    request.addEventListener("success", success);
    request.addEventListener("error", error);
  });
  reverseTransformCache.set(promise, request);
  return promise;
}
function cacheDonePromiseForTransaction(tx) {
  if (transactionDoneMap.has(tx))
    return;
  const done = new Promise((resolve, reject) => {
    const unlisten = () => {
      tx.removeEventListener("complete", complete);
      tx.removeEventListener("error", error);
      tx.removeEventListener("abort", error);
    };
    const complete = () => {
      resolve();
      unlisten();
    };
    const error = () => {
      reject(tx.error || new DOMException("AbortError", "AbortError"));
      unlisten();
    };
    tx.addEventListener("complete", complete);
    tx.addEventListener("error", error);
    tx.addEventListener("abort", error);
  });
  transactionDoneMap.set(tx, done);
}
var idbProxyTraps = {
  get(target, prop, receiver) {
    if (target instanceof IDBTransaction) {
      if (prop === "done")
        return transactionDoneMap.get(target);
      if (prop === "store") {
        return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
      }
    }
    return wrap(target[prop]);
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
  has(target, prop) {
    if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
      return true;
    }
    return prop in target;
  }
};
function replaceTraps(callback) {
  idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
  if (getCursorAdvanceMethods().includes(func)) {
    return function(...args) {
      func.apply(unwrap(this), args);
      return wrap(this.request);
    };
  }
  return function(...args) {
    return wrap(func.apply(unwrap(this), args));
  };
}
function transformCachableValue(value) {
  if (typeof value === "function")
    return wrapFunction(value);
  if (value instanceof IDBTransaction)
    cacheDonePromiseForTransaction(value);
  if (instanceOfAny(value, getIdbProxyableTypes()))
    return new Proxy(value, idbProxyTraps);
  return value;
}
function wrap(value) {
  if (value instanceof IDBRequest)
    return promisifyRequest(value);
  if (transformCache.has(value))
    return transformCache.get(value);
  const newValue = transformCachableValue(value);
  if (newValue !== value) {
    transformCache.set(value, newValue);
    reverseTransformCache.set(newValue, value);
  }
  return newValue;
}
var unwrap = (value) => reverseTransformCache.get(value);
var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
var writeMethods = ["put", "add", "delete", "clear"];
var cachedMethods = /* @__PURE__ */ new Map();
function getMethod(target, prop) {
  if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
    return;
  }
  if (cachedMethods.get(prop))
    return cachedMethods.get(prop);
  const targetFuncName = prop.replace(/FromIndex$/, "");
  const useIndex = prop !== targetFuncName;
  const isWrite = writeMethods.includes(targetFuncName);
  if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
  ) {
    return;
  }
  const method = async function(storeName, ...args) {
    const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
    let target2 = tx.store;
    if (useIndex)
      target2 = target2.index(args.shift());
    return (await Promise.all([
      target2[targetFuncName](...args),
      isWrite && tx.done
    ]))[0];
  };
  cachedMethods.set(prop, method);
  return method;
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
  has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
}));
var advanceMethodProps = ["continue", "continuePrimaryKey", "advance"];
var methodMap = {};
var advanceResults = /* @__PURE__ */ new WeakMap();
var ittrProxiedCursorToOriginalProxy = /* @__PURE__ */ new WeakMap();
var cursorIteratorTraps = {
  get(target, prop) {
    if (!advanceMethodProps.includes(prop))
      return target[prop];
    let cachedFunc = methodMap[prop];
    if (!cachedFunc) {
      cachedFunc = methodMap[prop] = function(...args) {
        advanceResults.set(this, ittrProxiedCursorToOriginalProxy.get(this)[prop](...args));
      };
    }
    return cachedFunc;
  }
};
async function* iterate(...args) {
  let cursor = this;
  if (!(cursor instanceof IDBCursor)) {
    cursor = await cursor.openCursor(...args);
  }
  if (!cursor)
    return;
  cursor = cursor;
  const proxiedCursor = new Proxy(cursor, cursorIteratorTraps);
  ittrProxiedCursorToOriginalProxy.set(proxiedCursor, cursor);
  reverseTransformCache.set(proxiedCursor, unwrap(cursor));
  while (cursor) {
    yield proxiedCursor;
    cursor = await (advanceResults.get(proxiedCursor) || cursor.continue());
    advanceResults.delete(proxiedCursor);
  }
}
function isIteratorProp(target, prop) {
  return prop === Symbol.asyncIterator && instanceOfAny(target, [IDBIndex, IDBObjectStore, IDBCursor]) || prop === "iterate" && instanceOfAny(target, [IDBIndex, IDBObjectStore]);
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get(target, prop, receiver) {
    if (isIteratorProp(target, prop))
      return iterate;
    return oldTraps.get(target, prop, receiver);
  },
  has(target, prop) {
    return isIteratorProp(target, prop) || oldTraps.has(target, prop);
  }
}));

// src/lib/offline.js
init_define_import_meta_env();
var BASE3 = define_import_meta_env_default?.BASE_URL ?? "/";

// src/views/index/state.js
init_define_import_meta_env();
var state = null;

// src/views/index/modes.js
var BASE4 = define_import_meta_env_default.BASE_URL;
var imageMargin = () => stacking() ? 1100 : 700;
var CAROUSEL_BUFFER = 12;
function applyMode() {
  const { el, mode } = state;
  const carousel = mode === "carousel";
  if (!carousel && state.loop) {
    state.carouselAt = el.querySelector("[data-carousel-track]").scrollLeft;
  }
  el.classList.toggle("is-carousel", carousel);
  el.classList.toggle("is-search", !carousel);
  el.querySelector("[data-carousel]").hidden = !carousel;
  el.querySelector("[data-grid]").hidden = carousel;
  paintModeLabel(carousel ? STRINGS.saints.modeToSearch : STRINGS.saints.modeToCarousel);
  if (carousel) paintCarousel();
  else {
    state.loop?.destroy();
    state.loop = null;
    state.carouselPrefetch?.();
    state.carouselPrefetch = null;
    state.carouselWindow?.();
    state.carouselWindow = null;
    state.carouselKey = null;
  }
}
var modeFade = null;
var modePending = null;
function paintModeLabel(word) {
  const label = state?.el.querySelector("[data-mode-label]");
  if (!label) return;
  if ((modePending ?? label.textContent) === word) return;
  clearTimeout(modeFade);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    modePending = null;
    label.textContent = word;
    return;
  }
  modePending = word;
  label.classList.add("is-fading");
  modeFade = setTimeout(() => {
    modePending = null;
    label.textContent = word;
    label.classList.remove("is-fading");
  }, 140);
}
function carouselCard(item, router, { cardWidth = 150, space = 0, pen = null } = {}) {
  const crop = cardCrop(item.image);
  const cap = item.image ? Math.round(pictureHeight(item, cardWidth, space || Infinity, pen)) : 0;
  const media = item.image ? `<span class="cx-media" style="aspect-ratio:${crop.aspect}${space ? `;--cx-cap:${cap}px` : ""}">
        <img data-src="${BASE4 + (item.image.card ?? item.image.src)}" alt="" style="object-position:${crop.focus}"
          width="${item.image.w}" height="${item.image.h}" decoding="async" />
      </span>` : "";
  const sub = escapeHtml(formatSubtext(item));
  const budget = Math.round(cardHeight(item, cardWidth, space || Infinity, pen));
  return `<a class="cx-card${item.image ? "" : " is-text"}" data-h="${budget}" href="${router.href(`/saints/${item.slug}`)}" data-prefetch="${escapeHtml(item.slug)}">
      ${media}
      <span class="cx-name">${escapeHtml(saintName(item))}</span>
      ${sub ? `<span class="cx-sub utility">${sub}</span>` : ""}
    </a>`;
}
function footUnder(track) {
  const own = getComputedStyle(track);
  const padding = (parseFloat(own.paddingTop) || 0) + (parseFloat(own.paddingBottom) || 0);
  const main = track.closest("main");
  const below = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
  return padding + below + 4;
}
function publishCarouselSpace() {
  const track = state?.el?.querySelector("[data-carousel-track]");
  const carousel = state?.el?.querySelector(".carousel");
  if (!track || !carousel) return 0;
  const top = track.getBoundingClientRect().top;
  const space = Math.max(200, Math.round(window.innerHeight - top - footUnder(track)));
  carousel.style.setProperty("--cx-space", `${space}px`);
  return space;
}
var carouselSpace = 0;
var STACK_SPACE = 460;
var stacking = () => !window.matchMedia("(min-width: 700px)").matches || carouselSpace >= STACK_SPACE;
function resolveWidth(carouselEl, prop, fallback) {
  if (!carouselEl) return fallback;
  const probe = document.createElement("span");
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:var(${prop})`;
  carouselEl.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width || fallback;
}
function captionPen(carouselEl) {
  if (!carouselEl || typeof document === "undefined") return null;
  const probe = document.createElement("span");
  probe.className = "cx-card";
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;left:-9999px";
  probe.innerHTML = '<span class="cx-name">x</span><span class="cx-sub utility">x</span>';
  carouselEl.append(probe);
  const nameEl = probe.querySelector(".cx-name");
  const subEl = probe.querySelector(".cx-sub");
  const face = (el) => {
    const cs = getComputedStyle(el);
    return {
      font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
      line: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35 || 17
    };
  };
  const name = face(nameEl);
  const sub = face(subEl);
  const gap = parseFloat(getComputedStyle(probe).rowGap) || 0;
  probe.remove();
  captionPen.canvas ??= document.createElement("canvas");
  const ctx = captionPen.canvas.getContext("2d");
  if (!ctx) return null;
  return { ctx, name, sub, gap, cache: /* @__PURE__ */ new Map() };
}
var captionFallback = (cardWidth) => cardWidth <= 200 ? 94 : 64;
function captionH(item, cardWidth, pen) {
  if (!pen || !item) return captionFallback(cardWidth);
  const key = `${item.slug}|${Math.round(cardWidth)}`;
  const seen = pen.cache.get(key);
  if (seen !== void 0) return seen;
  pen.ctx.font = pen.name.font;
  let h = nameLines(saintName(item), cardWidth, pen.ctx) * pen.name.line;
  const sub = formatSubtext(item);
  if (sub) {
    pen.ctx.font = pen.sub.font;
    h += pen.gap + nameLines(sub, cardWidth, pen.ctx) * pen.sub.line;
  }
  const out = Math.ceil(h) + CAPTION_SLACK;
  pen.cache.set(key, out);
  return out;
}
var CAPTION_SLACK = 4;
var CELL_GAP = 12;
var MIN_CAPTION = 20;
var STACK_MAX = 12;
var LOOKAHEAD = 48;
function cardHeight(item, cardWidth, space = Infinity, pen = null) {
  const caption = captionH(item, cardWidth, pen);
  if (!item.image) return caption;
  return pictureHeight(item, cardWidth, space, pen) + (pen?.gap ?? 0) + caption;
}
function pictureHeight(item, cardWidth, space = Infinity, pen = null) {
  const aspect = cardCrop(item.image).aspect || 1;
  return Math.min(cardWidth / aspect, Math.max(0, space - captionH(item, cardWidth, pen)));
}
function carouselCells(pool, { space = 0, cardWidth = 150, textWidth = cardWidth, pen = null } = {}) {
  if (!space) return pool.map((item) => [item]);
  const cells = [];
  const taken = new Array(pool.length).fill(false);
  const heightOf = (item, width) => cardHeight(item, width, space, pen);
  let cursor = 0;
  let sinceImage = 1;
  let imagesLeft = pool.reduce((n, item) => n + (item.image ? 1 : 0), 0);
  let dealt = 0;
  let columns = 0;
  let credit = 0;
  while (cursor < pool.length) {
    if (taken[cursor]) {
      cursor += 1;
      continue;
    }
    let seed = cursor;
    let seen = 0;
    const perColumn = columns ? dealt / columns : 4;
    const columnsLeft = Math.max(1, (pool.length - dealt) / perColumn);
    credit += Math.min(1, imagesLeft / columnsLeft);
    const owed = sinceImage >= 1;
    const want = owed || credit >= 1 && imagesLeft > columnsLeft / 2;
    const reach = owed ? pool.length : LOOKAHEAD;
    for (let i = cursor; i < pool.length && seen < reach; i += 1) {
      if (taken[i]) continue;
      seen += 1;
      if (Boolean(pool[i].image) === want) {
        seed = i;
        break;
      }
    }
    const picture = Boolean(pool[seed].image);
    const width = picture ? cardWidth : textWidth;
    const spend = (i) => {
      taken[i] = true;
      if (pool[i].image) imagesLeft -= 1;
    };
    const surplus = () => imagesLeft > columnsLeft / 2;
    const column = [pool[seed]];
    spend(seed);
    let used = heightOf(pool[seed], width);
    while (column.length < STACK_MAX) {
      const room = space - used - CELL_GAP;
      if (room < MIN_CAPTION) break;
      let pick = -1;
      let scanned = 0;
      const mayStack = surplus();
      for (let i = cursor; i < pool.length && scanned < LOOKAHEAD; i += 1) {
        if (taken[i]) continue;
        scanned += 1;
        if (pool[i].image && (!picture || !mayStack)) continue;
        if (heightOf(pool[i], width) <= room) {
          pick = i;
          break;
        }
      }
      if (pick < 0) break;
      spend(pick);
      column.push(pool[pick]);
      used += CELL_GAP + heightOf(pool[pick], width);
    }
    cells.push(column);
    dealt += column.length;
    columns += 1;
    const spent = column.reduce((n, item) => n + (item.image ? 1 : 0), 0);
    if (spent) credit -= 1;
    sinceImage = column.some((item) => item.image) ? 0 : sinceImage + 1;
  }
  return cells;
}
var isNameCell = (cell) => cell.every((item) => !item.image);
function paintCarousel() {
  const { el, router } = state;
  const track = el.querySelector("[data-carousel-track]");
  carouselSpace = publishCarouselSpace();
  if (state && !state.carouselResize) {
    let frame = null;
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        if (!state) return;
        carouselSpace = publishCarouselSpace();
        if (state.mode === "carousel") paintCarousel();
      });
    };
    window.addEventListener("resize", onResize, { passive: true });
    document.fonts?.ready?.then(onResize);
    state.carouselResize = () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
    state.cleanups.push(() => state.carouselResize?.());
  }
  const pool = state.shownCards.slice();
  if (!track || track.clientWidth === 0) return;
  const carouselEl = el.querySelector(".carousel");
  const cardWidth = resolveWidth(carouselEl, "--cx-w", 150);
  const textWidth = resolveWidth(carouselEl, "--cx-w-text", cardWidth);
  const pen = captionPen(carouselEl);
  const space = Math.floor(Math.max(0, carouselSpace) / 40) * 40;
  el.querySelector(".carousel")?.style.setProperty("--cx-fill", `${space}px`);
  const run = carouselCells(pool, { space, cardWidth, textWidth, pen });
  const key = run.map((cell) => cell.map((c) => c.slug).join("+")).join(",");
  if (key === state.carouselKey) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const first = state.carouselKey === null || state.carouselKey === void 0;
  if (!reduced && !first && track.children.length) {
    clearTimeout(state.carouselFade);
    track.classList.add("is-swapping");
    state.carouselFade = setTimeout(() => {
      if (!state) return;
      state.carouselKey = null;
      buildCarousel(key, run, { cardWidth, textWidth, space, pen });
    }, CX_FADE);
    state.cleanups.push(() => clearTimeout(state.carouselFade));
    return;
  }
  buildCarousel(key, run, { cardWidth, textWidth, space, pen });
}
var CX_FADE = 150;
function buildCarousel(key, run, { cardWidth, textWidth, space, pen }) {
  const { el, router } = state;
  const track = el.querySelector("[data-carousel-track]");
  if (!track) return;
  if (state.carouselKey !== null && state.carouselKey !== void 0) state.carouselAt = null;
  state.carouselKey = key;
  state.loopHandoff = state.loop?.handoff?.();
  state.loop?.destroy();
  state.loop = null;
  state.carouselWindow?.();
  state.carouselWindow = null;
  if (!run.length) {
    track.innerHTML = "";
    track.classList.remove("is-swapping");
    return;
  }
  const n = run.length;
  const paint = (buffer) => {
    track.innerHTML = loopSlice(run, buffer).map((cell) => {
      const names = isNameCell(cell);
      return `<span class="cx-cell${cell.length > 1 ? " is-stack" : ""}${names ? " is-names" : ""}" data-n="${cell.length}">${cell.map((item) => carouselCard(item, router, { cardWidth: names ? textWidth : cardWidth, space, pen })).join("")}</span>`;
    }).join("");
  };
  const reveal = () => requestAnimationFrame(() => track.classList.remove("is-swapping"));
  const cs = getComputedStyle(track);
  const gap = parseFloat(cs.columnGap || cs.gap) || 0;
  const contentWidth = run.reduce((w, cell) => w + (isNameCell(cell) ? textWidth : cardWidth) + gap, 0) - gap;
  const fits = track.clientWidth > 0 && contentWidth <= track.clientWidth;
  if (!fits) paint(CAROUSEL_BUFFER);
  else paint(0);
  track.classList.toggle("is-static", fits);
  state.carouselStatic = fits;
  if (fits) {
    state.carouselWindow = windowImages(track, { margin: imageMargin() });
    state.carouselPrefetch?.();
    state.carouselPrefetch = observePrefetch(track);
    reveal();
    return;
  }
  state.loop = loopScroll(track, run.length, {
    buffer: CAROUSEL_BUFFER,
    // Only where the row is the *same* row: a search that changes the pool has
    // no offset worth keeping, and the old one would land on other saints.
    startAt: state.carouselAt ?? null
  });
  state.loop.inherit(state.loopHandoff);
  state.loopHandoff = null;
  state.carouselWindow = windowImages(track, {
    margin: imageMargin(),
    direction: () => state.loop?.direction() ?? 1
  });
  state.carouselPrefetch?.();
  state.carouselPrefetch = observePrefetch(track);
  reveal();
}
var chosenMode = null;
var sessionMode = () => chosenMode;
function switchMode(next) {
  if (!state || state.mode === next) return;
  const { el } = state;
  state.mode = next;
  chosenMode = next;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    applyMode();
    return;
  }
  state.falling?.();
  el.classList.add("is-leaving");
  const land = () => {
    clearTimeout(timer);
    state.falling = null;
    el.classList.remove("is-leaving");
    applyMode();
    el.classList.add("is-arriving");
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-arriving")));
  };
  const timer = setTimeout(land, CX_MODE_FADE);
  state.falling = land;
}
var CX_MODE_FADE = 260;
export {
  applyMode,
  carouselCells,
  isNameCell,
  paintCarousel,
  publishCarouselSpace,
  sessionMode,
  switchMode
};
