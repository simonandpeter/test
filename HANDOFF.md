# Handoff — start here

> **This is the Eastern Orthodox project, seeded from the cross-church build
> and being stripped to it** (Amendments 25–30: the glyph is gone, the registry
> is four churches — Russian, Romanian, Greek, and the Serbian from Amendment
> 29 — the reader chooses one in
> place of the traditions and the plate, and since Amendment 30 every saint
> has a life written after a synaxarion, with its source linked). The tree at this repo's first commit is byte for byte
> the tree of the archived cross-church repo at its tag
> `archive/cross-church-2026-08` — 133 unit tests and 234 browser tests green
> here before anything changed. That archive was moved out of this working
> folder on 2026-08-22 and sits at `..\..\Agios Website Ex\main`, beside a
> bundle and a zip of the same thing; it stays untouched, and it is the backup,
> the reference, and the ambition the four-communion corpus comes back to once
> this one tradition has proven the shape. This folder was called `orthodox/`
> while the two stood side by side, which is the name `docs/HANDOFF-ORTHODOX.md`
> still uses for it.
>
> **Much of what is below still describes the cross-church build's controls**
> — the Amendments in SESSIONS.md say what has changed since. `docs/HANDOFF-ORTHODOX.md` is the briefing for
> what this project is, what carries over from that one and which design
> decisions are open again — read it first. Three of those decisions are the
> author's and are taken (2026-08-22): the glyph is removed; Old and New
> Calendar are the Julian and Revised Julian, one per church; the calendar-entry
> shape for feasts that are not saints is agreed and is the next work. DESIGN.md
> is inherited whole and amended in place, not replaced.

You are picking up the Gallery of Saints build. Nothing of the previous
conversations survives except the files in this repo, so this document is the
briefing.

**If your session is the one archiving this project and starting the Eastern
Orthodox one, read `../HANDOFF-ORTHODOX.md` first** (written 2026-08-22 at the
author's request): it says how to put this repo away as a backup, what of it
carries into the smaller project, and which design decisions are open again.
This file remains the accurate briefing for the code you will be copying.

## Read first, in this order

1. `../saintsbuildplan.md` — the brief.
2. `../saintsplanaddendum.md` — **supersedes the brief where they disagree.**
3. `../veneration-glyph-spec.md`, `../veneration-glyph.js`,
   `../veneration-glyph-proof.html` — the author's component spec and
   reference. **Treat its behaviour as binding.** It has been revised once
   mid-build; if it disagrees with anything below, it wins and the docs get
   rewritten. Check the file rather than trusting a summary of it, including
   this one.
4. `DESIGN.md` — binding. §5b is the calendar page, §6b the uncertainty curve,
   §7 the glyph.
5. `SESSIONS.md` — the delivery plan. **Its Amendments section at the top is
   the most important page in the repo**; forty-eight entries now, each
   recording something that cost real time to learn.
6. `CLAUDE.md` — added at Amendment 47, and not a substitute for any of the
   above. It carries no reasoning, only file-and-line pointers into the code
   for the areas sessions keep coming back to (the calendar chrome, the
   coachmarks, the Index cards, the icon pipeline), so a fresh session spends
   fewer tokens re-Grepping its way to places already found. Expect it to
   drift as the code moves; fix a wrong pointer in place rather than trusting it.

The first three now also live in `docs/`, copied there when this repo was
archived (2026-08-22), so the reasoning travels with the code: an archive that
loses the folder above it would otherwise lose the brief, the addendum and the
glyph reference together. The `../` paths still resolve in the author's own
working folder; `docs/` is the copy that survives a clone.

Do not re-litigate settled decisions. If something looks odd, assume there is a
recorded reason and search these documents before changing it.

## State as of 2026-08-28 (Amendments 50 to 59)

Live at https://simonandpeter.github.io/test/ — deployed by GitHub Actions from
`dist/`, **not** from the branch.

Complete: Phase 0 data foundations, the design pass, the app shell, the
calendar page, the saint detail page with the local store, All Saints in **both
its modes** — the drifting carousel it opens on and the Advanced search behind
the toggle (Amendment 53) — and an About page that explains the corpus. **The veneration glyph named
in several sections below no longer exists** — removed entirely at Amendment
25 — and the single-church chooser (`lib/church.js`, `ui/church-chooser.js`)
has since replaced the four-communion "plate" those same sections describe.
See "Two sections below are now history" just under this one before reading
them.

- 174 unit tests (`npm test`) — pure logic, no DOM.
- 527 browser tests (`npm run test:e2e`) — both counts verified by actually
  running them (2026-08-27, the sittings of Amendments 56 and 57), not carried
  over from a commit message. `npm run test:all` runs both; CI runs both on
  every push. They were 129 and 220 through Amendment 33, 163 and 376 through
  Amendment 46, and 163 and 384 through Amendment 47.
- **`COLD_FACE=1` before asking for a push, on anything that measures text**
  (2026-08-27). The runner draws different text: `font-display: optional` means
  a cold machine never gets Literata, so the 72ch column is 580 px not 678, and
  `system-ui` is DejaVu Sans rather than Segoe UI. Three tests were green here
  and red on CI for that reason alone — a scroll to a literal 1500 the runner's
  shorter page could not hold, a chip row that fits 580 in Segoe and needs 604
  in a wide face, and a name pinned at three lines that the runner's narrower
  fallback set in two. **The site was right in all three; the numbers in the
  tests were facts about this desk.** `COLD_FACE=1` (e2e/fixtures.js) refuses
  the webfont and forces Verdana, reproducing all of it in 60s against one
  spec. A number taken from rendered text belongs either to a forced face or to
  the page itself — never to the machine that wrote it down.
- **The full suite is a gate, not a loop** (2026-08-27). 510 tests is 372s of
  wall time and 2,073s of test work; a single test is 30s, one spec at one
  project 66s, and **~25s of every invocation is fixed cost** before a test
  runs (manifest build, `vite preview`, browser launch) — so batch by surface
  instead of firing single tests. `npm run test:e2e:desktop` and
  `test:e2e:mobile` take `playwright test` arguments after a `--`. Run
  *everything* before a commit that will be pushed, before asking a peer to
  push, after touching shared chrome or `src/lib`, and after a merge. CLAUDE.md
  §Tests carries the surface-to-spec map and the rule that a layout change
  iterates at **mobile-360**, not desktop, because that is the width that
  breaks.
- **Read Playwright's own exit code and its `N failed` line, never the passed
  count.** A run was reported green in Amendment 56's sitting off a `tail` that
  had cut the `6 failed` header off the top, with an `exit 0` beside it that
  belonged to `tail` at the end of a pipeline rather than to the suite — a
  pipeline's status is its last command's. Both halves of the mistake said the
  same reassuring thing. Write the run to a file and grep it.
- **Run both projects.** All six of those failures were on `mobile-360`;
  `desktop` was green throughout and would have shipped them. The two differ by
  more than width now — the Index opens on rows on a phone and cards at a desk
  (Amendment 56), so a test that assumes a layout has to ask for one.
- **A test whose subject is drawn from the Index's deal must name its subject**
  (Amendment 57). The Index opens in Random order with a fresh `Date.now()`
  seed, and only 128 of the 742 saints have an icon — so "a card with a
  picture is mounted" is a property of the deal. One test read both kinds off
  the opening screenful and failed on **7 of 20 deals at 360 and 2 of 20 at
  1280**, which is a red the suite shows you one run in three on a phone and
  one in ten at a desk. At 360 the mounted window can be a single card, so a
  threshold like `length > 3` on the unfiltered grid is the same bug wearing a
  number. Pin the saint by name and let the Index's own search mount him
  (`Anthony the Great` has an icon, `Christopher the Roman` has none), or fix
  the sort to Earliest or Name; and assert the pin's premise, so a saint who
  loses his icon fails loudly instead of turning two cases into one. **A green
  run is not evidence a test is deterministic** — three greens here and one red
  on a peer's machine was the whole of the information, and the greens were the
  less informative half.
- **The view split is done** (Amendment 55). `views/calendar.js` is 699 lines
  over seven modules in `src/views/daily/`; `views/saints.js` is 183 over nine
  in `src/views/index/`; the 9,308-line browser spec is six files by surface.
  **No behaviour changed** — the same suite asserts the same things about the
  same pages, which is the whole claim. Two things the audit got wrong and the
  code corrected: **the rail and the month cannot be separated from each
  other** (the month calls `buildRail`, `settle`, `travel`, `stepCursor`), and
  two documents the audit called archive are living specification, cited as
  `brief §N` and `Addendum X` in some thirty comments.
- **Save is on the saint's own page and nowhere else** (Amendment 59). The
  author withdrew the mark in three instructions across two days: the Index's
  rows, the Daily hero and the Daily register (2026-08-27), then the Index's
  cards and the Continue reading rows (2026-08-28). "From my own experience a
  'watch later' style bookmarking system is never actually revisited."
  **Two consequences worth knowing before touching this.** Nothing on the shelf
  page un-saves a saint any more — the Saved shelf's own rows never carried a
  mark, which corrects a claim made here on 2026-08-27 that the shelf's mark
  was "the only un-save"; it was the *Continue reading* row's. And the drop
  shadow in base.css that made a mark legible over an icon now matches nothing,
  because no mark on this site sits over a picture; it is kept as a comment
  where it stood.
- **All Saints shows the whole corpus, whatever calendar the header keeps**
  (Amendment 59). Every calendar is ticked on open; narrowing is *unticking*,
  and `onlyCalendar` in e2e/helpers.js is how a test makes a narrowed state now.
  The header still decides what the Daily page reckons by. `UNCALENDARED` is
  implemented in lib/index-filters.js and renders nowhere: all 742 saints carry
  a venerated attestation, so the option would select nobody, and it appears the
  day one does not.
- **The site's name is `BRAND` in ui/strings.js, not a pack key** (Amendment
  59). `site.name` still exists in all five packs and **nothing reads it**. The
  tab is the exception and still translates — Amendment 31's two-name split
  survives where a reader meets it in a tab or a bookmark. The stamp face is the
  only `font-display: swap` in the project, because `optional` was leaving a
  slow phone in the fallback for the life of the page.
- **A carousel track child is a cell, not a card** (Amendment 59) — one saint,
  or two wide-aspect ones stacked. `loopScroll` reads its period from the offset
  between children, so a cell keeps that arithmetic untouched; a two-row grid
  over the track would not, and the reason is in views/index/modes.js.
- **`dragstart` is refused on the carousel** and must stay refused. Every card
  is an `<a>` around an `<img>`; without it, pressing one and moving starts
  Chromium's native link-and-image drag, which swallows the pointer — and hangs
  a test harness outright rather than failing it.
- **19 saints who lead a day have no icon** (Amendment 59). Measured: 38 of 133
  day-and-church combinations led with an imageless hero, and preferring an
  imaged saint inside the sung pool took it to 27; the rest are days where
  nobody the church sings for has a picture. That is a data job — a licence
  someone has checked, one at a time — and never a bulk fetch.
- **A virtualised row's height does not have to be a constant** (Amendment 56,
  and the author asked the question that produced it). `nameLines()` in
  views/index/grid.js counts the browser's own greedy wrapping with canvas
  `measureText` — no layout, no render — so each row is laid out to what its
  name needs: 66, 83 or 104. Verified exact against the real wrapping over all
  734 names at both widths. If you touch the row's box, `ROW_NAME_LINES_MAX`
  and the `-webkit-line-clamp` in index.css are one decision in two files.
- **Run `node scripts/extraction-check.mjs` on every code move, before the
  build.** A green build says nothing about whether an extraction is complete:
  a bare reference to a name that never travelled is valid JavaScript until the
  line runs. `BASE` left behind cost 88 red tests, a stranded local called
  `asideNote` cost 116, and thirteen missing imports on the site's front page
  went unremarked by `✓ built`. The order that works is **cut, check, fix,
  build, suite** — the build is the least informative of the three gates. Use
  `--locals` when the thing being split is a function body rather than a file.
- **The first download is 133 kB of JavaScript, not 470** (Amendment 52). The
  day records and the four locale packs are their own chunks: `data/days.js`
  holds the seam for the first — started at boot, awaited *beside* the
  manifest, synchronous accessors that answer null until it lands — and
  `ensurePack`/`ensureAllPacks` in `lib/i18n.js` for the second. **Anything
  that subscribes to a language change must tolerate the manifest not being
  there yet**: the reader's pack is 20 kB against the manifest's 490 and lands
  first, which took every language-dependent test in the suite red once.
- **All Saints opens on a carousel** (Amendment 53). `state.mode` is
  `'carousel'` or `'search'`, remembered in `settings.indexMode`, and the page
  defaults to the first. **Almost every browser test that visits the Index was
  written about the other face**, so the suite stamps `indexMode: 'search'` in
  a `beforeEach` and in each of the 33 self-made contexts — conditionally, the
  way `ready` handles church and language, so a test that sets the mode itself
  still gets it. If you add an Index test, that default is already applied;
  reach for `carouselMode(page)` when you mean the other one.
- **The Index's search field is sticky, and the filters drop from it**
  (Amendment 54). Two rules there are load-bearing and neither is obvious:
  the *fold must not change layout height* — collapsing it silently shortens
  every remembered scroll by 69 px per visit — and the drop closes on the
  reader's **input**, not on the scroll event, because opening it makes the
  browser move the page by itself.

- **The carousel is a sample, not the corpus** — 48 saints, imaged first,
  drawn through the seeded shuffle. `ui/loop-scroll.js` carries the
  cross-church build's endless-scroll engine and its header says which parts
  are load-bearing. Do not "fix" it by rendering all 742.

- **The Index's Calendar facet is the page's only church narrowing**
  (Amendment 52). It opens ticked to the header's calendar and resets to it
  when that changes; the page no longer cuts to the reader's church before the
  filters run. Same predicate, so the opening set is unchanged — but a change
  to one of them now has to be made in the other.
- **A saint is named by rank now, not by "St."** (Amendment 50, author's
  instruction, reversing Amendment 32). `display_name` is the bare name;
  `office` is a field of its own on 246 records and is drawn on the subtext
  line; the rank comes from `types` through a precedence walk in
  `lib/honorific.js`, whose header writes the order out in words. "St" is the
  marked case, 58 of 742, and carries no stop in any of the five. **Never put
  a rank, an office or a death year back into `display_name`** — a unit test
  sweeps the whole corpus for all three, because that collision is what kept
  the site on a blanket honorific for three days.
- **A `CLAUDE.md` now stands beside this file** (Amendment 47): file-and-line
  pointers into the code — where the calendar chrome, the coachmarks, the
  Index cards and the icon pipeline actually live — kept short on purpose and
  expected to drift. Read it when you need *where*; this file and SESSIONS.md
  remain where *why* lives.
- **CI is the only place the header's width is honest** (2026-08-24). The
  chrome's utility face is the reader's system stack, so the same row is a
  different width on Windows (Segoe UI) and on the runner (DejaVu Sans), and
  the desktop header wrapped there for two amendments while every local run
  passed. Both the index foot (Amendment 24) and the header (Amendment 38)
  now force a known face before asserting. **If you add anything to the
  header row, the nav is what pays**: check the wide-face assertion, not the
  look on your desk. *Amended at Amendment 40:* the nav no longer pays — it
  has its own `auto` track and cannot be squeezed — so what pays is the
  **masthead**, which wraps to a second line rather than clipping. A control
  added to the row now shows up as a two-line site name in Russian, Greek and
  Serbian before it shows up anywhere else.

- **Amendments 34–39 are pushed.** The author pushed 34 (`7b7b10d`), then
  35–36 (`1df505b`) *mid-sitting* — the parallel-session pattern this file
  warns about, caught both times by fetching before committing rather than by
  luck — then 37 (`a2c56fa`), and 38–39 (`52178bf`, `e93e493`) before the
  evening sitting began. **Amendment 40 is committed on top and not pushed**:
  the agent session had no credentials, which is the usual state (see
  "Pushing happens outside this session" below). None of that is evidence
  that CI is green: this environment has no `gh` CLI to check the Actions run
  itself, so eyeball it on GitHub before building on top.
  *Amendments 40–44 are on the remote (`f6aaa2e`, `cf8a3e1`, `8e6c197`,
  `0e88192`, `55a0ffc`); 45 (`24dd14d`) and 46 are committed on top. The author
  pushes.*

  **Amendment 47 is split across two commits and one working-tree change.**
  `4ea0cad` (the crosshair withdrawn, the hero bookmark moved beside the
  name, today's own mark) and `e5e37da` (the coachmarks' wording and
  softened corners, Andrew the Stratelates, Name Days moved to the foot of
  the day panel) are both on the branch, both `Co-Authored-By: Claude`, from
  a session run alongside this one — a live example of the parallel-session
  pattern this file has warned about since Amendment 34, this time landing
  cleanly rather than caught mid-collision. *This paragraph used to say the
  lifespan-vs-bookmark fix and the Sozon crop were uncommitted; they landed as
  `2474a31` before the next sitting opened, which is what reading `git log`
  rather than trusting the prose turned up.* **Amendment 48's twelve files and
  `CLAUDE.md` itself are uncommitted as of this writing.** Check `git status`
  and `git log` before trusting either this paragraph or the state above it.

### What Amendment 46 changed about how the site behaves (2026-08-26)

Sixteen instructions in one message; SESSIONS.md has the whole of it. Four
things here because they change assumptions the rest of this file rests on:

* **There is no first-visit gate.** The calendar no longer asks which church
  before showing anything. `defaultChurch()` guesses from the reader's browser
  language and **never writes it**, two coachmarks point at the header's two
  controls, and `hasChosen()` still means "the reader has answered". Anything
  written against `[data-ask]`, `[data-gate]` or `[data-cal-body]` is gone.
* **`currentChurch()` and `chosenChurch()` are different questions.** The first
  always answers (the guess included) and is the Daily page's; the second is
  null until the reader chooses and is the Index's, the saint page's and the
  map's. Reach for `chosenChurch` unless the thing genuinely cannot exist
  without a calendar. Getting this wrong filtered All Saints down to 426 of 742
  on a first visit, and eleven browser tests said so.
* **The day's hero and its register sit on the ground.** No `.panel`, and no
  hairline either — the hairline broke 2026-08-24's "one company, not a ruled
  ledger". The shelves keep their panel on purpose: "genuinely secondary
  things" is the author's own scoping.
* **Gold is spent again**, on the week strip's feast marker (a finding, sourced
  from the day's own hymns) and on a hairline under the date heading (an accent,
  admitted as such). DESIGN.md §2 carries the argument.

Two audit scripts came out of the round and are worth knowing about:

    node scripts/locale-coverage.mjs    which strings each pack falls back to
                                        English for. All four are 288 of 288
                                        as of 2026-08-26; a new key in
                                        ui/strings.js shows up here first.
    node scripts/cross-link-audit.mjs   every link the automatic cross-linker
                                        would make across all 742 lives. Run it
                                        whenever the corpus grows or a rule in
                                        lib/cross-link.js is loosened, and
                                        *read the list*: a wrong link says two
                                        people are one person.

**Day records as of 2026-08-26: 144 days**, 23 August 2026 – 13 January 2027,
russian and romanian throughout, greek and serbian for the first four weeks
only (Amendment 44).

**Corpus as of 2026-08-26: 742 saints**, every one with a life and four
attestation rows — 708 from the four weeks of days, and **21 added at
Amendment 43 from the Greek calendar's 20 September**, which is past the end of
the day records and therefore in the corpus but on no Daily page; **162
undated**, down from 239 in four audits (Amendments
39, 41 and 42 — the third read the calendar entry lines and the reigns rather
than only the lives, and the fourth read saint.gr's *per-saint* pages, which
are a different document from its day index); **the manifest now
carries each saint's name in the languages the corpus records one for** —
393 Russian, 240 Greek, 111 Serbian, 102 Romanian; 430 hymns, **49 of whose
objects carry a published English rendering** (12 Hapgood, 37 Orloff); readings/fasting for 23 August – 19 September in
`src/data/liturgical-days.js` (the Greek 7–19 September still empty with a
note — saint.gr has not published that far out as of Amendment 31's check on
2026-08-24). **128 icons** — 95 through Amendment 31, and 33 added at
Amendment 42 from the Menologion of Basil II, all public domain with their
Commons file pages cited. The generating pipeline is under `.tmp/w3/`
(untracked).

**Since Amendment 31 was written up, seven more amendments landed the same
day (2026-08-24) — read them in SESSIONS.md, this is only the headline:**

- **Amendment 31's own loose ends, closed:** the browser suite run and watched
  green against 708 saints, four more Commons icons sourced and cited, one
  Russian pericope-pair label fixed. Still open: Greek readings past
  6 September (saint.gr hasn't published them) and the ~200 new-martyr lives
  still sourced from azbyka.ru, which is now returning 403 to direct fetches.
- **Amendment 32, six author instructions, four of them reversals:** the
  own-reckoning line under the strip is gone entirely (the Daily page prints
  the civil date alone; the header is the only place the calendar is named and
  changed); the fast is now coloured by kind — the one sanctioned exception to
  the two-colour rule, three conditions attached (DESIGN.md §2); the weekday
  was dropped from the liturgical title line (already in the h1); the hero's
  bookmark moved to the image's corner, matching an Index card; and every name
  now renders with "St" before it (`lib/honorific.js`, applied at render, never
  written to data). Rank deliberately stays out of `display_name` — for the
  new-martyrs it is the disambiguator between namesakes.
- **Amendment 33, three more:** "Also commemorated" lost its row rule; a life
  with a known death and no birth now reads "Entered eternal glory in {year}"
  rather than "undated – {year}" (`formatLifespan`, one place, reaches every
  view); and "Continue reading" now wears the Index's own row-card markup
  rather than the plain register.

- **Amendment 34, seven of a batch of nine:** the loading veil now reads
  "Orthodoxy Daily" like the header; the favicon is the eight-pointed Orthodox
  cross **in ink** — it had been a gold cell from the veneration badge, which
  was removed nine amendments earlier, so §2's "gold is spent nowhere" was
  untrue the whole time and is corrected in place; the calendar chooser lost
  its explanatory paragraph; the header's control is a calendar mark plus the
  church's name ("Romanian", not "Romanian calendar") with the church now in
  its accessible name too; About carries a privacy policy written from
  `settings.js` and `store.js`; the Index defaults to **Earliest** and
  **Latest now runs descending** — both date orders were ascending and
  differed only in which bound they keyed on, so Latest read as a control that
  did nothing; and there is a seeded **Random** order. The other two of the
  nine — the week strip's rework and site translations — were confirmed by
  the author the same day and became Amendments 35 and 36.

- **Amendment 35, the rail:** the week strip is a native scroll container of
  121 real day buttons — free horizontal scroll snapping to *any* day, mouse
  drag on desktop, arrow keys and S/D stepping the day from anywhere, the
  masked peek buttons replaced by the neighbouring days themselves in full
  ink. Four §5b decisions reversed, each marked in place in DESIGN.md; the
  month keeps its track and `ui/grain.js` untouched. The rail's columns are
  the month grid's to the pixel, so "the month is the week grown taller"
  survived. Fourteen browser tests rewritten as heirs; two were caught
  asserting nothing and got real failure modes to pin.

- **Amendment 36, five languages:** EN, RU, RO, GR, RS from a globe control in
  the header — the full chrome hand-translated in `src/ui/locales/`, dates
  through a per-language `Intl` cache, `<html lang>` honest at last. The
  corpus stays English plus its existing source-language material, by
  decision (Amendment 2: no invented content). Two recorded seams: the
  liturgical cycle line is composed in English by `lib/liturgy.js`, and fast
  reasons are English data strings — a per-pack `reasons` map translates the
  recurring ones and passes the rest through.

- **Amendment 37, weight and honesty:** a released mouse drag on the rail now
  coasts against friction and hands off to the settle (reduced motion gets no
  coast; a still hold then release is not a throw — that freshness rule was a
  real defect the old drag test caught); and a translated page now says under
  the Hymns heading that the hymns stay in the church's own tongue on purpose
  — the corpus holds no English hymn texts, by decision, and the line shows
  exactly when the site's language is not the hymns' language.

- **Amendment 38, nine refinements in one list:** the "A" key beside S; the
  Daily heading in the abbreviated month ("28 Aug 2026"); centuries as
  "3rd C."; **"Also called" removed** from the saint page (which reverses
  DESIGN.md's script-coverage passage — the multi-script name forms are now
  shown nowhere, recorded in place, corpus untouched); **Random as the Index's
  default order**, reversing the same morning's Earliest default with a fresh
  seed per visit; Continue reading cleared by **swiping a row across** with
  its × gone and a focus-revealed button keeping the keyboard's way in; Also
  commemorated as a column of the Index's own **row cards**; the **narrow
  header** rearranged into three rows (name centred on top, toggles under it,
  calendar control on the nav's line); and **one bookmark drawing** at last —
  the gesso halo is gone, a drop shadow carries legibility over a picture.
  Five pre-existing test defects were found and fixed on the way; see the
  amendment for the `leaders()` helper and why DOM order stopped being screen
  order. **CI then caught a sixth**: the desktop header had been wrapping on
  the runner since Amendment 36 put the language control in the corner —
  76.13 px against a 64 px assertion, invisible on a Windows desk. Fixed by
  tightening the row's gaps, and pinned by measuring the header in a forced
  wide face on every machine. Russian, Greek and Serbian still wrap the
  desktop row and cannot be made to fit at any gap; recorded in DESIGN.md §5
  as the author's call.

**Pushing happens outside this session** unless your own session has been
given credentials — check before assuming otherwise. Agent sessions
historically have none: `git push` fails with "could not read Username" from
both shells. Commit, say the commit is ready, and ask for confirmation that
the GitHub Actions run is green before building on top of it. Do not treat a
local pass as evidence about what was committed or pushed.

### What Amendment 47 changed (2026-08-26, seventh sitting)

The headline only — SESSIONS.md's own entry has the reasoning and is worth
reading before touching any of this again. Today's date carries its own ring
in the week rail and the month grid now, independent of which day is
selected, and the button that used to recentre the rail on today is gone —
the toggle beside it stretches into the row's full height instead. The hero's
bookmark moved off the image and into the name line, beside the saint's own
name, using the same "name shrinks, control holds its width" mechanism the
saint's own page already used. The two first-visit coachmarks read as plain
instructions now ("Pick your church calendar.", "Pick your language.") and
both they and the fasting bubble have softened corners. Andrew the
Stratelates lost his "(31 August)" disambiguator, and Name Days moved to the
foot of the Daily page, just before Continue Reading. Two smaller, older
queue items closed alongside all of that: a card's lifespan text no longer
truncates behind the Index bookmark, and Sozon of Pompeiopolis's icon is
cropped to the figure rather than the scanned page it sat on. See "Pushing
happens outside this session" above for exactly what of this is committed.

### What Amendment 48 changed (2026-08-26, eighth sitting)

Four instructions, all of them the Daily page's top line. Today's ring is a
soft rectangle whose bottom edge lands on the selected day's underline instead
of a pill hanging three pixels past it and clipping the dot below — measured at
8× before and after, not eyeballed. Name Days reads **"Today's name days" only
on the day that is today**, because the page is a day browser and the word
would be false on the other 143 days in the records. The fast chip names the
**type** of fast on every day of every calendar — Strict Fasting, Oil and Wine
Allowed, Oil Wine and Fish Allowed, No Fast — with `xerophagy` and `no-oil`
merged under one label, the calendar's own words still quoted verbatim in the
bubble underneath, and **a fast whose calendar printed no allowance now
defaulting to strict** (DESIGN.md §5b carries that reversal in place). The
fast's colour follows what the day *allows* rather than liturgy.js's `kind`,
from one helper the rail's dot, the chip and the month all read, and **the
month's numerals wear it too**, named in each button's accessible label. The
line under the date is **three chips and a cycle line** now: the fast's grade
alone, the occasion in rubric beside it, the Great Feast in gold, and the
allowance back behind the (i) where it was before that morning. The hero's
bookmark is **pinned** to the register's own column rather than trailing the
name, and the two header panels **arrive the way they leave** — one journey,
both directions, `ui/fly.js`. On the Index, **Sort and View are chips that
print their answer**, Random is a die at the end of the filter row, Detailed
shares their line, *Sex* is *Gender*, and a card's mark is in the card's own
corner whether or not it has a picture. The Daily hero is **square on desktop**
and keeps the 3:2 band on a phone. And a
**Great Feast is now named beside the fast**, from a nine-key table in
`lib/liturgy.js` reckoned in the church's own calendar, in a gold-edged chip
whose *words are ink* because `--gold` on gesso is 2.78:1.

**Two things the author should decide, both flagged rather than taken:**

* **The rail's gold dot and the feast chip are still different findings, and
  the author has now seen the seam** (2026-08-26: "Why is Mon 31 and Tue 32
  gold dot in Romanian calendar but no tag for feast day?"). Measured: **44
  day/church pairs on 35 civil dates** in the 144 records carry hymns without
  a Great Feast to name them — 21 Romanian, 14 Russian, 7 Greek, 2 Serbian —
  and most are commemorations of a particular icon of the Theotokos or a local
  synaxis rather than feasts the chip is failing to name. Three ways to close
  it, none a display fix: name the 35 dates by hand in five languages (a
  sourcing commission, and the only one that loses nothing); narrow the dot to
  the Twelve (throws away the source's own rank judgement); or leave them
  different findings and say so. **Left as it stands, for the author.**

* ~~Three of the four calendars will still mostly say plain "Fast."~~
  **Answered by the author the same evening and reversed** — this was flagged
  after the first build of the labels and the answer was that "Fast - Friday"
  should read "Strict Fasting". What remains of it is a known wrong case, and
  it is a *data* gap rather than a design one: **a Saturday or Sunday inside
  the Nativity Fast reads Strict Fasting in the Romanian calendar while
  doxologia.ro prints *dezlegare la pește*.** The Russian calendar shows those
  same days in fish because its notes were harvested and the Romanian's were
  not. Harvesting the Romanian, Greek and Serbian fasting notes closes it and
  is ordinary ingestion work — `.tmp/ruro_harvest.py` already reaches the
  pages.
* **The rail's gold feast dot and the new feast chip are different findings.**
  The dot means "this day's record carries hymns for this church" (19 Russian
  days in range), the chip means "the day is one of the Twelve Great Feasts"
  (5). A day can wear the dot and no chip. Both are honest; whether they should
  be one mark is a design call.

Also of note: the four labels and the feast names are hand-translated into all
four packs, which are **299 of 299** with no English fallbacks.

### What Amendment 49 changed (2026-08-26, ninth sitting)

Ten instructions. The Index prints **one** count line — "Of 742, 127 saints are
in the Romanian calendar", the lead-in a step back in `--ink-soft` because the
literal midpoint of gesso and ink is 3.09:1 and cannot carry text — and the
tweened count speaks only when a filter gives it something that line does not.
The Random die takes the chips' own height and **wears gold, the first control
on the site to**; the browser test allows it by name and still fails a second
gold anywhere. The header is **sticky** and 8 px shorter, and on a phone the
four pages are equal buttons edge to edge with the current one bold in a field.
The Daily button reads **Today** while the reader is on the Daily page looking
at another day. Today's ring sits 3 px higher. The Gender facet's third option
is "Unrecorded". And a month stepping to another of the same height no longer
moves the page — `moveMonth` was measuring the height it was leaving before
releasing what a grow still had pinned, which only showed inside the 420 ms a
grow takes.

**One thing the author should decide:** in Russian, Romanian, Greek and
Serbian the nav's word for *Daily* is already that language's word for
*Today*, so the new label does not visibly change there. The control works —
pressing it returns to today — but the change of state is invisible. Giving
those four packs a distinct base label is the fix; it is theirs because it
changes a reviewed label and because those words are longer, which is the
320 px chrome line's whole budget.

## Two sections below are now history, not the current UI

This section and "The glyph, because it has moved twice" just after it were
accurate when written and are kept for the reasoning they carry, but two of
the mechanisms they describe are gone: the veneration glyph (badge and matrix
both — `badge.js` no longer exists) was removed whole at Amendment 25, and the
four-communion "plate" / *Select Tradition* control this section describes
(`lib/tradition.js`, also gone) was replaced by the single-church chooser at
Amendments 27 and 29 — one church at a time, `lib/church.js`,
`ui/church-chooser.js`. Amendment 32 (2026-08-24) then removed the own-date
line this section's last-but-two bullet describes: the Daily page now prints
the civil date alone, and the header is the only place the calendar is named
and changed. For what the calendar page and the veneration UI actually look
like today, read DESIGN.md's current text (it is kept live, superseded
passages marked in place) and SESSIONS.md's Amendments 25, 27, 29 and 32
rather than trusting the bullets below.

## The calendar chrome, because it moved three times on 2026-08-21

The habit page is the screen the author has been reviewing hardest, and it now
looks nothing like the code an older document would lead you to expect. Read
DESIGN.md §5b in full before touching it. In short:

- **There are no chevrons.** What stands at each edge of the week and of the
  month is the grain continuing — the day either side of the week, the
  neighbouring month's column of dates on the grid's own rows — dissolving
  toward the margin through a **mask**, not an opacity. Both travel with the
  grain they belong to. They are still buttons
  on purpose: the swipe is touch and pen only by design, so an edge with
  nothing to click strands every reader with a mouse. Removing the glyph was
  the instruction; removing the way through the weeks would be a different
  change.
- **The month is the week grown taller**, not a panel that replaces it. It
  carries no frame, takes the strip's seven columns and gap, and the day names
  sit in the same place at either grain — same column centres, same top, to the
  pixel at 1280 and at 360. A browser test measures the *text*, not its box:
  the two boxes legitimately differ where the glyphs do not.
- **The month names itself in the gutter**, abbreviated — "Aug 2026" — under
  the jump stack, stopping where the peeked column starts.
- **Toggling the month unfurls it** out of the day-name line over
  `--dur-month`, and the row is as tall as whichever grain is taller, so the
  page below follows the growth instead of jumping. Height is set in pixels by
  the JS for the length of the change, because there is no transitioning to
  `auto` — and a forced layout sits between the two values, or the browser
  coalesces them and there is no transition to run.
- **A grain steps sideways.** Week or month, by any means — the movement
  decides it, not the gesture. Picking a day inside the week already showing
  has nowhere to travel to and simply repaints.
- **The reckoning toggle is gone entirely** (author, 2026-08-21) and so is the
  date line that went with it. Nothing on the site prints a day in Julian,
  Coptic or Ethiopian reckoning any more. **The plate is the site's control now**
  (author, 2026-08-22, Amendment 23): it opens from *Select Tradition* in the
  header, under *(advanced)*, beneath four communion switches, and the
  selection it writes is read by the calendar, the Index, the saint's page and
  the Map's placeholder through `lib/tradition.js`, which announces changes.
  **Its cells are drawn in ink and rule, never in the glyph's three states** —
  gold is a finding about a saint, not a control. A **first visit is asked**
  which traditions it keeps, once — four communions and *(advanced)*, no *Show
  all* — and then **which calendar to see**: the calendar page shows **one
  church's calendar at a time**, asked for before the week or month is shown
  from those the traditions allow, remembered in `settings.calendar`, and
  chosen without asking when only one is allowed. It names itself under the
  strip with *Change calendar*. Amendments 19 and 23.
- **The hero image takes 85%** of the width it took, applied **once** — in the
  column where the panel gives it a column, in the image where it does not. It
  opens the saint, hidden from the accessibility tree because the name beside
  it already links there.
- **The hero image is a square**, cropped from the centre across and hard
  against the top (author, 2026-08-21). It took the manifest's aspect until
  then; the Index still does, deliberately. The `<img>` and the blurred
  placeholder under it are anchored together or the crop is wrong twice.
- **Each grain sits on a track, and the track is what moves.** A peeked edge
  travels it; the reader can also **hold and slide** it, and it lets go into
  whichever grain it is nearest past a third of a width (touch and pen only —
  DESIGN.md §5b's reasoning is unchanged, and it is still why the edges are
  buttons). **Both grains' edges travel with them** now, which is why the
  month's day names moved to a line of their own above the body: they must not
  travel, and the peeked column must. `.month-view` is gone, `.month-body` is
  the month's viewport, and `src/ui/swipe.js` is now `src/ui/grain-drag.js`.
  For the length of any move the document holds a second copy of every step
  button, laid over the live one — `aria-hidden`, out of the tab order and
  `pointer-events: none`. Amendment 18. The track mechanism itself is
  `src/ui/grain.js` now (Amendment 20), and the copy-marking comes from
  `src/ui/swap.js`; River mode and the timeline should reuse both.

## The glyph, because it has moved twice

Read DESIGN.md §7 in full before touching it. In short:

- **Circles, not squares.** Attested and refused share radius 0.31 × pitch;
  undocumented is 0.11 × pitch — a visibly smaller circle, not the same one
  faded. Marks are centred on their cell. The repo shipped squares for half a
  day from an earlier revision of the spec; do not reintroduce them.
- **Two views over one dataset.** `renderBadge` (four communions, one row) in
  lists and on cards; `renderMatrix` (rite × communion, 13 occupied cells of a
  7 × 4 lattice) beside a saint's own name and the calendar hero. Both call one
  `cellMark()` and one `rollupStates()` in `badge.js`.
- **The matrix is a decomposition of the badge.** `decomposesToBadge()` states
  it; two unit tests assert it exhaustively and across the corpus. If you touch
  either renderer, that invariant is the thing to protect.
- **Eastern Catholic is one registry entry holding six rites**, so it fills six
  matrix cells and each says so in its legend. DESIGN.md §7b explains why that
  beats leaving them blank, and names the cost.
- **Sizes:** badge pitch 10.2, matrix pitch 7.65. The matrix's undocumented dot
  is 1.68 px, under the 2 px legibility floor §7c records. It reads at 2× and
  above. It is the first thing that gives if the glyph shrinks again.
- The glyph is **pinned to the right margin** of its line, not trailing the
  name. Register rows pin it after the feast date; below 480 px they don't.

## Your work, in order

### First: refinements

The author reviews screen by screen and will keep going. Expect short, specific
requests, several at a time. What that has looked like so far, so you can match
the standard:

- **Render it and look at it.** `scripts/shot.mjs` exists for exactly this.
  Several fixes were things no test would catch and no amount of reading the
  code would reveal — and one recent one *looked* right in a screenshot while
  being 15% wrong, so measure as well as look.
- **Every fix gets a browser test, and the test gets checked.** Back the fix
  out, confirm the test fails, put it back, and say that you did. This is not
  ceremony: the last round's eight backouts found one test of mine that read
  only half of what it claimed to check.
- **The quality floor is a real gate and it has caught real regressions** — a
  360 px overflow, a 5 px row shift, and a 2.1:1 contrast failure on a fade
  that was meant to be decorative. When it fails, fix the cause. It has not yet
  been wrong.
- **Say when a request contradicts DESIGN.md or SESSIONS.md**, and record the
  reversal rather than absorbing it quietly. Four settled decisions went that
  way on 2026-08-21 alone — where the month prints its name, how it arrives,
  the chevrons, and the date bars. Each is written up with the reasoning, and
  the superseded entry is marked as such where it sits.


#### The queue, as of Amendment 47 (2026-08-26)

Open refinements, in the order they were raised. Each is small enough to pick
up cold; the two the author has to decide are marked. This heading used to
say Amendment 34; nothing below had been swept for staleness in the three
weeks since until this pass — read each item as a claim to re-check, not as
settled fact, the way "Entered eternal glory" turned out to be gone entirely
by the time someone finally chased down the bug it was blamed for.

- ~~A card's lifespan runs under the bookmark.~~ **Done, Amendment 47.**
  Index, Cards view: a long lifespan line was truncating *behind* the
  bookmark icon rather than stopping short of it. The wording this item
  blamed ("Entered eternal glory in {year}") had itself been replaced by
  plain "Reposed {when}" the day after Amendment 33 introduced it — a stale
  premise in this very item, caught only while fixing it — but the underlying
  bug was real: a full two-date lifespan or a long "Reposed under {ruler}"
  line still reaches the card's own padding edge, exactly where the mark
  stands. `.index-dates` now reserves the mark's width; pinned with Placilla
  the Empress, a real saint whose recorded death is long enough to overflow.

- **The liturgical cycle line still speaks English in every language**
  (Amendment 36's recorded seam). "13th week after Pentecost" is composed as
  an English sentence inside `lib/liturgy.js`; giving it to the packs means
  restructuring the generator to return shape ({kind, n, weekday}) and
  formatting per language — four languages of ordinal grammar. The fast
  *reasons* are already translated through each pack's `reasons` map; the
  cycle line is the remaining English on a translated Daily page. The
  author's call whether it is worth the restructure.

- **English hymn texts: 49 of 495, and the public-domain well is dry**
  (Amendments 41 and 42; raised at 37 and 40). Two public-domain books have
  now been worked through, on the author's instruction "try public-domain
  translation".

  **Hapgood's 1906 Service Book** gave 12 objects: it is the fixed services
  and the Great Feasts, and holds no menaion at all. **Orloff's General
  Menaion (London, 1899)** gave 37: it is the *common* services, one troparion
  per order of saint, which is what a real part of this corpus sings for its
  lesser-known people. Neither is a menaion of propers, because no
  public-domain English one was found.

  **The one that would finish the job is Seraphim Nassar's Book of Divine
  Prayers and Services (1938), and its status is unresolved.** It is a full
  English menaion and it is served openly on archive.org. A 1938 American
  publication is public domain only if the copyright was not renewed; no
  renewal record was found either way, and archive.org's own record for one
  copy says "This material may be protected by copyright law". **Settling that
  is a real, bounded piece of work** — the Catalog of Copyright Entries for
  1965–66 is digitised — and it is worth doing before anything else, because
  it would take the remaining ~440 objects in one source. It is a rights
  question, so it is the author's.

  Otherwise the paths are as before: **permission** from a modern translator
  (the OCA prints English for much of this calendar and marks it its own), or
  another public-domain menaion nobody has found yet. The mechanism is done
  either way — `english` on a hymn, `ui/hymns.js` prefers it for an English
  reader — so anything further is transcription with a citation each, no code.

- **Dating the remaining 157** (Amendment 42). Four audits have taken this
  from 239. The fourth opened two seams and then established, rather than
  assumed, that they are exhausted.

  **saint.gr's per-saint pages** are a different document from the day index
  every earlier audit had read, and they do date some people the index does
  not. All 152 that this corpus cites were fetched. **44 carry no biography at
  all, 15 say in as many words that no details of the life survive, and of the
  75 silent about time only 11 so much as name a ruler.** The Greek synaxarion
  does not date these people; that is a finding, and the undated tray's test
  now records it.

  So what is left needs sources this corpus has not cited — saint by saint,
  a sourcing commission. **Read Amendment 42 before scoping it.** A name is
  not evidence: a Wikidata search returned Pushkin for "Alexander, companion
  of Susanna", Damon Hill for "Damon the hieromartyr" and Callista Gingrich
  for Callista of Nicomedia. Everything that landed came from an article
  chosen by hand and checked. And read Amendment 41 too, for why four of its
  47 mechanical proposals were thrown out: a parenthesis in a life is often
  about somebody else.

- **The saints of the four new months — 20 September is done, the rest is not**
  (Amendment 45, at the author's instruction: "Cant you make them folders?"…
  "okay do what you would do").

  The day records run to January and the saints stop on **20 September**, so
  every day after it prints its readings above a line saying its saints are not
  folders yet. That line is honest and it is also the largest visible gap in
  the site.

  Measured: the Russian names **658** distinct commemorations across its 116
  days and the Romanian **445** across its 103; the week of 20–26 September
  alone is 145 Russian names and 28 Romanian. The union cannot be taken by
  machine, so the real figure is somewhere between **600 and 1,100 folders** —
  roughly doubling the corpus.

  **Two things learned on the first day that the next day must not relearn:**

  * **Dedupe on the feast date, never on the name.** Of 21 people on 20
    September, 8 were already in the corpus, built from the Greek and Romanian
    calendars whose 7 September is a different civil day. Name matching found
    none of them and produced false pairs; a feast-date scan found all eight.
    Five would otherwise have become silent duplicates.
  * **`Life/idNNNN.htm` is an index, not a life, and it is windows-1251 with no
    declaration.** Both are handled in `.tmp/ruro_harvest.py` now; a fresh
    harvester must not reintroduce either.

  The pipeline is `.tmp/week_saints.py` (harvest, cached),
  `.tmp/ru0920_decisions.py` (the editorial half, typed) and
  `.tmp/ru0920_folders.py` (the mechanical half). A day is roughly a sitting.

- **The Greek and Serbian saints, banked and waiting for their days**
  (Amendment 43, at the author's instruction: "dont put them in the calendar
  yet, but at least get the Saint Profile pages and hymns for the saints
  sorted from that content so all we need to do once we get the calendar
  information is link it to the Daily Page").

  Untracked, under `.tmp/`, and re-runnable from cache:

  * `gr_harvest.json` — **463 Greek entries for 20 September – 31 October**,
    every one with its biography, 98 with hymns (**183 texts**) carrying tone
    and automelon.
  * `sr_harvest.json` — **182 Serbian days, October 2026 – March 2027, 312
    saint entries**, plus the 94 days the month grid marks as fast.

  **21 folders were built from the first day of it** (20 September), which is
  the worked example. The rest is editorial work at roughly the rate a person
  reads, and *that was tested rather than assumed*: the corpus holds 331 saints
  with both a Greek form and an English display name, and a careful
  transliterator reproduced **17** of them. A display name here is a chosen
  English form, often carries an epithet the Greek never prints, and one entry
  naming a household becomes four folders. **Do not try to generate these.**

  Scale, so it is scoped honestly: 42 days of the Greek calendar hold 463
  distinct entries, 460 of them new. Six months is about **2,000 Greek
  entries** before the Serbian adds any, against a corpus of 729.

- **Icons for the 580 saints without one** (Amendments 40 and 42, asked for
  outright). **128 of 708** now have an `images/icon.jpg`. Amendment 42 added
  33 from the **Menologion of Basil II** (Vat. gr. 1613, c. 985): Commons
  holds 494 of its miniatures, 492 of them public domain, and it depicts
  exactly the Byzantine martyrs this corpus is thickest in.

  **What Amendment 42 settled is the method, and it is not a fetch loop.** A
  general Commons search by name, probed over eighteen saints, offered
  Callista Gingrich for Callista of Nicomedia, Julian Assange for the martyr
  Julian and Rodin's *Ève* for the abbess Eve. What works is harvesting a
  *known corpus* of icons whole and matching the corpus against it, with every
  pairing read by hand — the refusals in Amendment 42 include two the corpus's
  own life texts caught after the matcher had passed them.

  **Next wells, in order of promise**, both named at Amendment 31 and neither
  yet worked: the **1903–1911 Жития Святых engravings** on Commons, which
  cover the Russian calendar's saints as the Menologion covers the Greek; and
  the per-saint **"Category:Icons of …"** trees, which are already
  hand-curated by subject and so carry the matching that a filename cannot.

  Seven of the 95 older icons still carry a *placeholder* `source_url` on an
  unresolvable reserved domain and the build warns while it stands. **These
  are the author's to fix, not a successor's**: their note reads "Author
  reports these are public-domain works", so the files came from the author
  and only the author knows where from.

- **DONE for the two calendars that publish, at Amendment 44; what remains is
  the other two and the year 2027.** `src/data/liturgical-days.js` holds
  **144 days, 23 August 2026 to 13 January 2027** — russian 144 days / 535
  readings, romanian 131 / 272, greek and serbian unchanged at 28.
  **The site no longer runs dry on 19 September.**

  What is left of this item, and it is not blocked on us:

  * **2027, for the Russian and Romanian.** Neither site publishes it yet —
    five URL forms probed, none exists. `python .tmp/ruro_harvest.py
    2027-01-14 2027-07-14` then `python .tmp/ruro_emit.py --write` is the whole
    job when they do. The ingestion is re-runnable and cached precisely for
    this.
  * **The Greek and Serbian day records**, which wait on saint.gr's fortnight
    and pravoslavno.rs's thirty days, or on the author reversing the 2026-08-26
    decision not to take last year's paschal-equivalent readings.
  * **The hymns that did not ship.** 1,203 were harvested for the new months
    and **131 ship** — only the days each calendar gives its own top rank
    (Russian T6, Romanian rank cross). The rest are whole in
    `.tmp/ruro_harvest.json`. They were cut for weight: this module is imported
    eagerly and every byte is in every visitor's first download. **Load it
    lazily and the cut can be reversed** — that is the real fix and it is a
    separate job.

  This entry used to say "three of the four sources publish only a fortnight or
  so ahead". That was generalised from saint.gr's known gap without testing the
  others. Measured at Amendment 43, and the Romanian line corrected again at 44
  — a page existing is not the same as a *future* date being published:

  * **Russian** — days.pravoslavie.ru's URL carries the year and 25 December
    2026 is served *now*. 2027 is a 404, so it is a year at a time.
  * **Romanian** — doxologia.ro returns readings for 12 November and 4
    February. *"The whole year is up" was wrong — corrected at Amendment 44.*
    The URL carries no year and the site keeps one calendar year: `/4-februarie`
    is **4 February 2026**, already past. The horizon is **31 December 2026**.
  * **Greek** — saint.gr really is a short window; 25 December and 15 March
    carry no Αναγνώσματα block.
  * **Serbian** — pravoslavno.rs says it itself: readings 30 days ahead. Its
    *month calendar* of saints has no such limit.

  **So the Russian and Romanian day records could be written, and they are the
  two that stop the Daily page going dark.** Done at Amendment 44 — four
  months, not six, because that is all either source has.

  The other half is settled: the calendars repeat. Two civil dates at the same
  slot in the paschal cycle give byte-identical readings (2026-09-02 and
  2025-09-10, both Wednesday of the 14th week after Pentecost). So for the
  Greek and the Serbian, last year's page at the paschal-equivalent date holds
  this year's readings — **but the author declined that route** (2026-08-26):
  taking them would be an inference rather than a transcription. Their day
  records wait for the sources to publish, and their *saints* were banked
  instead, which is the entry below.

  Note also that the fasting notes are load-bearing now, because
  `lib/fast-grade.js` reads the day's allowance off them.

- **The saints' names in each language — done, 2026-08-26, and the entry
  above it was wrong.** This said there was "no source in this repository that
  gives them in four languages". There was: every folder carries a `names`
  array of forms with their language, transcribed from the same calendar
  entries the attestations were read from, shown on the saint page under "Also
  called" until Amendment 38 removed that block. They are chosen at build time
  now (`lib/saint-name.js`) and printed wherever a name is drawn — nothing
  translated, a recorded form selected. **The lesson is the general one:
  before reporting that the corpus cannot do something, read what it holds.**

  What is left is small and countable: **44 saints have an attestation in a
  church whose language records no name form for them** — 12 Russian, 13
  Greek, 6 Romanian, 13 Serbian. The entry line for those does carry a name,
  but in the genitive («Мч. Христофора»), and putting a genitive in a name
  field is grammar this build should not be doing. A nominative apiece, by
  hand, closes it. Everything else falls back to English because that church
  does not keep that saint, which is not a gap.

- **eBiblia.ro has no linkable passage URL** (Amendment 39). The author asked
  for the Romanian readings to open there; its reader is a JavaScript
  application whose own navigation is `javascript:app.…` calls, so Romanian
  opens Bible Gateway's Cornilescu instead, which opens the passage. One line
  in `lib/bible.js` changes it if eBiblia ever exposes one.

- **Eutychius, Bishop of Rome 275–283, is not in the corpus** (Amendment 39).
  The five Eutychius/Eutychian entries are other men. Adding him is an
  ordinary sourcing task — a synaxarion entry, a life, attestations — not a
  display fix; the display half of that report *was* fixed, and the calendars'
  own titles now print on the info line.

- **The lives, hymns-labels and data displays stay English by decision**
  (Amendments 2 and 36) — "5th century", the register's quoted lines, the
  `display` strings in dates. If the author ever wants per-church-language
  lives, the affordable shape remains citation, not translation: the source
  text already exists in that language at the cited URL for most of the
  corpus.

  *Asked for outright at Amendment 46* ("The saint profile pages do not have
  russian, greek, serbian or romanian translations. We need to add them") and
  answered as far as it honestly can be. Everything on that page that is the
  **site's own words** now translates — three real defects were found and fixed
  doing it, see Amendment 46 — and the reader is told, once and in their own
  language, that the life itself is English. **The 742 lives are still English
  and this build will not translate them**: machine translation is Amendment 2's
  invented content, and a mistranslated clause in a hagiography is a false claim
  about a person and about a source the entry cites by name. Two shapes remain
  affordable if the author wants more: linking each attestation's cited source,
  which is already in that language, and the same for the `note` fields, which
  are the site's prose sitting in the data rather than in the packs (742 x 4
  rows, template-generated, so translatable by pattern rather than by hand).

- **`saints.keptAll` is dead in all five packs.** views/saints.js hides the
  count line rather than printing the whole-corpus wording, and has since before
  Amendment 46. Harmless; noted so the next person to grep for it does not go
  looking for the caller.

- ~~One icon is a scanned page rather than a picture.~~ **Done, Amendment 47.**
  `sozon-of-pompeiopolis/images/icon.jpg` was 555×1707 and mostly margin
  (Amendment 46 raised it), so the hero's 3:2 top crop showed the paper and
  not the saint. Cropped to the figure alone, 555×1410 — margin and printed
  caption removed, nothing else touched — with the crop and its reasoning
  recorded in `icon.meta.json`; the original scan is still at its
  `source_url` for anyone checking provenance. Confirms the general
  lesson still holds: this was a data fix, not a CSS one.

**The round of 2026-08-22 is Addendum H** in `../saintsplanaddendum.md`, in two
phases, both built. Phase 1 — the Index's *Detailed* option, the bookmark that
is Save, the saint page's × back into the Index as the reader left it, and the
desktop head with the register beside the image — is Amendment 22. Phase 2 —
the two-way sun/moon theme toggle, the date out of the header, a site-wide
*Select Tradition* control with four communion switches and the plate under
*(advanced)*, the Calendar showing one church's calendar at a time behind a
prompt, the Index and the saint's page respecting the selection — is Amendment
23, built on the author's five answers recorded at the end of Addendum H.
What it leaves for the author is listed under "Outstanding" below.

### Then: Session 4b, the ship gate — still outstanding

Skipped by instruction, not by accident. What the executable quality floor
already covers — axe at WCAG 2.1 AA, keyboard focus, reduced motion, 360 px, no
layout shift — is green on every route. What 4b still owes: **Lighthouse
accessibility ≥ 95** and **first contentful paint under 1.5 s on a throttled 4G
profile**. Neither has tooling in the project yet.

Note before claiming the gate: 4b's own criterion is "a genuinely usable daily
site on its own", and the corpus is ten saints, so the calendar is empty on
~355 days a year. That is a data question, not an engineering one, and whether
to ship against it is the author's call rather than yours.

### Then: Session 5b — the structural efficiency pass

Addendum G (in `../saintsplanaddendum.md`, added 2026-08-22) and the Session 5b
entry in SESSIONS.md, which lists the five items. In short: `manifest.meta.json`
off the boot path; per-card filter and sort keys derived once at manifest load
rather than inside comparators; one memoised feast index in `lib/feasts.js`
shared by every view; an LRU on the detail cache; and the `daysInMonth` loop
condition hoisted. Pure-function changes, each with a unit test; the browser
suite must pass unchanged because nothing the reader sees moves. Do this
*before* the River — it reuses the Index's filter pipeline and the grain track,
and giving it derived keys and a shared index once is cheaper than retrofitting
two views.

### Then: Session 6 — River mode

The horizontal, unsorted, shuffled stream (brief §8.2). The mode toggle belongs
above the Index's controls; `views/saints.js` needs no restructuring for it.
Addendum C2's one exception: **the River normalises to a single card box** —
equal size is doing that mode's equality-of-standing work — where the Index
varies card heights from the manifest's aspect ratios. Deep-link the shuffle
seed; `settings.riverSeed` already exists in the store.

The Index's View control (cards / rows) is a different axis from the mode
toggle and stays beside Sort. The River takes neither: no sort control by
design, and its single card box is the point of the mode.

### After that

Session 7 — Phase 3a, the globe. Session 8 — timeline, export/import. Session 9
— PWA, offline, About page statistics (the About page now has a "Reading the
mark" section; the editorial policy prose is still a placeholder awaiting that
session). SESSIONS.md has each in full.

## House rules learned the hard way

- **CI is the source of truth, not your local run.** A `.gitignore` bug once
  left `src/data/` untracked while every local test passed. Confirm CI is green
  before calling a session done. If CI is red, stop and fix it.
- **A count in the DOM is not a count in the corpus.** The Index is
  virtualised: at 360 px it renders one card of ten. Assert what the page
  claims, not what happens to be mounted.
- **Do not bulk-generate saint data.** Amendment 2 explains why at length. The
  corpus is 10 saints and the calendar is empty most days; that is a known,
  accepted state. Where a date is unverified the honest entry is
  `undocumented` with a note — see `saints/paul-of-thebes/saint.json`. The same
  discipline applies to tests: if no saint exercises a feature, say so rather
  than inventing one that does. Two features have no browser coverage for
  exactly this reason.
- **Gold marks a finding about veneration, never anything else — and since the
  glyph's removal (Amendment 25) it is spent nowhere on the site, on purpose,
  against the day a new signature element earns it.** Rubric marks liturgical
  time and the reader's place, nothing else. Amendment 32 added the one
  sanctioned exception — the fast of the day is coloured by kind: strict in
  the rubric itself, and two new hues for fish-permitted and fast-free, chosen
  specifically not to be mistaken for gold. DESIGN.md §2 states the three
  conditions that keep the exception honest. Read §2 before giving any other
  category a colour of its own: this one does not generalise. Errors are still
  prose in ink, never a red banner.
- **Reduced motion removes animation, never shortens it.** There is a global
  CSS rule and a test. Where JS waits for a transition, it must skip the wait
  under reduced motion too — a 420 ms pause with no animation behind it is the
  same bug wearing a different hat.
- **Anything that holds two copies of a thing in the DOM for the length of an
  animation must say which copy is current.** A bare `querySelector` cannot.
  That was Amendment 9, and it was invisible until someone clicked faster than
  the designer did. Since Amendment 20 the rule has one home — `src/ui/swap.js`
  (`setAside`/`restore`, `beginSwap`/`landSwap`) — and every animated swap goes
  through it. Do not grow a fifth implementation beside it.
- **A decorative fade is still text.** `opacity` on a colour is a new colour,
  and axe reads it: a 50% wash over `--ink-soft` is 2.1:1 on gesso and a
  serious violation. Fade with a `mask-image` instead, so the ink keeps its
  value wherever there is still a glyph to read (Amendment 16).
- **A proportion applied in two places multiplies.** "85% of the width" put on
  both the image and its column took 15% off 15%. Both rules read correctly in
  isolation; the only thing that caught it was a test measuring the rendered
  width against the used grid track (Amendment 16).
- **A worked value nobody executes is a comment.** Two of the five worked
  values for the uncertainty curve in DESIGN.md §6b had been wrong since the
  day they were written, and were only found when the curve got a test file of
  its own. If a document pins a number, pin it in a test too.
- Adding a saint means adding one folder. Never hand-edit `data/`.

## Environment notes (Windows)

- `node --test` with no arguments discovers all unit tests. Prefer the bare
  form.
- **PowerShell 5.1 writes a BOM** with `Set-Content -Encoding utf8`, which
  breaks `JSON.parse`. Prefer the Write tool, or patch files with short Python
  scripts — that is what recent sessions have used and it has been reliable.
- **Git Bash rewrites a leading-slash argument into a Windows path**, so
  `node scripts/shot.mjs x /calendar/2026-01-30` navigates to
  `C:/Program Files/Git/calendar/…`. `export MSYS_NO_PATHCONV=1` first, and
  verify anything path-shaped against a live URL.
- `scripts/shot.mjs <name> <url> [width] [click:sel|wait:ms …]` screenshots a
  running preview into `shots/`, which is how the house rule about rendering a
  change and looking at it gets honoured. Not part of the suite; `shots/` and
  `.tmp/` are gitignored.
- `npm run dev` must be backgrounded; it does not exit.
- **Never leave a `vite preview` running.** Playwright's config does not reuse
  a server it did not start, so a stray one on :4173 fails the run loudly. Note
  that killing the npx wrapper does not always kill the vite child — check
  `netstat` for a LISTENING port and kill by PID.
- **`font-display: optional` makes absolute layout assertions flaky.** A cold
  load keeps the fallback face, whose wider metrics wrap rows differently — 31
  px of difference on the index. Assert things that measure the same in either
  face; the utility stack is safer to measure than the serif.
- Large heredocs through the Bash tool truncate or fail to parse
  unpredictably; write source files with the Write tool and patch them with
  short Python scripts. Verify a scripted string replacement actually matched —
  one silently did not, and the CSS it was meant to write went missing.
- CRLF warnings from git are noise on this repo.
- **The author's PAT has the `workflow` scope** (author, 2026-08-22; it lacked
  it until then, and older notes here and in SESSIONS.md say so). A commit that
  touches `.github/workflows/` can be pushed.

## Outstanding, needs the author — not you

- **Confirmation that CI is green** for whatever was pushed last. Pushing
  happens in a separate session; what is owed here is the green run before
  anything is built on top.
- **Two browser tests have started flaking, and they want their own sitting.**
  `a thrown rail coasts to a halt` and `the Index opens shuffled` fail
  intermittently in a full run and pass 6 of 6 in isolation, which points at
  machine load rather than at the pages. They were left alone through the whole
  view split on purpose: guessing at a timing failure in the middle of a
  refactor is how a real regression gets buried in a sleep. Worth deciding
  whether to make them deterministic or to accept a retry.
- **Nothing shows a day in a non-civil reckoning any more, and it is now
  further from doing so than it was.** A brief window (2026-08-23) had the
  Daily page print the chosen church's own-reckoning date under the strip;
  Amendment 32 (2026-08-24) removed that line outright, the author's reason
  being that two dates for one day read as confusion. `lib/jdn.js` and
  `data/calendars.js` still convert, and the saint page still prints each
  attestation's own feast in its own calendar, but the habit page itself now
  states only the civil date. Whether a non-civil reading belongs somewhere —
  the saint page, About, a line under the hero — is the author's call, made
  twice now in the negative for the calendar page specifically.
- **Athanasius of Alexandria reads *Confessor Athanasius of Alexandria***
  (Amendment 50). His types are `bishop, theologian, confessor`, and Confessor
  outranks the "St" fallback, so the precedence walk is doing as it was told —
  but both major calendars print Athanasius the Great as a hierarch, and he is
  one of the seven saints who have an icon, so it is a visible result. The fix,
  if one is wanted, is data (drop `confessor` from that record) and not code.
- **Seven image source links.** Licence is settled — Public Domain Mark 1.0,
  which obliges no attribution — but each `icon.meta.json` still wants a real
  `source_url` in place of the `example.invalid` placeholder, because
  provenance is how a reader checks that claim. 7 live build warnings. Blocks
  publication, not your work.
- **Manifest budget:** projects to 864 KB gzipped at 5,000 saints against a
  400 KB ceiling. Meaningless below ~200 saints. Re-check past that mark; do
  not build sharding before then. When the trigger fires the shape is settled
  (Addendum G5): calendar-first — a per-year feast slice the calendar paints
  from, card data behind it — not by century.
- **Font preload** (Addendum G6): `font-display: optional` stands; preloading
  the two Latin subsets would make Literata actually show on most cold loads
  without reintroducing layout shift, at the cost of a small build step for
  the hashed filenames. Perceived quality, not correctness — your call, at the
  ship gate.
- **Search does not reach the historical name forms.** It reaches every
  language's display form — `card.names` in the manifest is `{ru: "Авдий",
  el: "Αβδαίος…"}`, present on 665 of 742 and indexed since 2026-08-26. But
  `saint.json` has a *different* field of the same name, an array of script
  forms (`{form: "Ἀντώνιος", lang: "grc"}`, `Ⲁⲛⲧⲱⲛⲓⲟⲥ`, `Antonius`), and that
  one is not in the manifest, so those find nothing. **Two fields called
  `names` holding unrelated things** is worth knowing before reading either.
  Carrying the array costs manifest bytes — author's call.
- **The Index sits in the standard 72ch content column** (DESIGN.md §5), which
  is two cards wide on a desktop. Widening it for that one page is a design
  decision.
- **The uncertainty curve has no shipping consumer.** The date bars were its
  first and were withdrawn on 2026-08-21; the map halo and the timeline
  dissolve are still to come. `tests/uncertainty.test.mjs` pins its three
  constants directly in the meantime, so they cannot drift unnoticed.
