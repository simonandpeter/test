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
   the most important page in the repo**; thirty entries now, each recording
   something that cost real time to learn.

The first three now also live in `docs/`, copied there when this repo was
archived (2026-08-22), so the reasoning travels with the code: an archive that
loses the folder above it would otherwise lose the brief, the addendum and the
glyph reference together. The `../` paths still resolve in the author's own
working folder; `docs/` is the copy that survives a clone.

Do not re-litigate settled decisions. If something looks odd, assume there is a
recorded reason and search these documents before changing it.

## State as of 2026-08-26 (Amendment 41)

Live at https://simonandpeter.github.io/test/ — deployed by GitHub Actions from
`dist/`, **not** from the branch.

Complete: Phase 0 data foundations, the design pass, the app shell, the
calendar page, the saint detail page with the local store, All Saints in Index
mode, and an About page that explains the corpus. **The veneration glyph named
in several sections below no longer exists** — removed entirely at Amendment
25 — and the single-church chooser (`lib/church.js`, `ui/church-chooser.js`)
has since replaced the four-communion "plate" those same sections describe.
See "Two sections below are now history" just under this one before reading
them.

- 145 unit tests (`npm test`) — pure logic, no DOM.
- 342 browser tests (`npm run test:e2e`) — both counts verified by actually
  running them (2026-08-26, the sitting of Amendment 41), not carried
  over from a commit message. `npm run test:all` runs both; CI runs both on
  every push. They were 129 and 220 through Amendment 33.
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
  *Amendment 40 was pushed (`f6aaa2e`); 41 is committed on top and is not.*

**Corpus as of 2026-08-26: 708 saints**, every one with a life and four
attestation rows; **187 undated**, down from 239 in three audits (Amendments
39 and 41 — the second read the calendar entry lines and the reigns, not just
the lives, which is where most datings actually live); **the manifest now
carries each saint's name in the languages the corpus records one for** —
393 Russian, 240 Greek, 111 Serbian, 102 Romanian; 430 hymns; readings/fasting for 23 August – 19 September in
`src/data/liturgical-days.js` (the Greek 7–19 September still empty with a
note — saint.gr has not published that far out as of Amendment 31's check on
2026-08-24). 95 icons (88 from Wikimedia Commons with their file pages cited,
four added at Amendment 31). The generating pipeline is under `.tmp/w3/`
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


#### The queue, as of Amendment 34 (2026-08-24)

Open refinements, in the order they were raised. Each is small enough to pick
up cold; the two the author has to decide are marked.

- **A card's lifespan runs under the bookmark.** Index, Cards view: a long
  lifespan line truncates *behind* the bookmark icon rather than stopping
  short of it, so the ellipsis sits under the mark — "St Abraham the
  Industrious of the Kyiv Caves", "Entered eternal glory in the 12th–13th
  ce…". Probably new since Amendment 33: "Entered eternal glory in {year}"
  is a great deal longer than the "undated – 1779" it replaced, and every
  undated-birth saint now carries the longer line — 304 of 708. Amendment
  26's `a card lifespan is one line` test pins the ellipsis, not the
  clearance, so it passes. Raised by looking at a screenshot, 2026-08-24;
  the author queued it the same day.

- **The liturgical cycle line still speaks English in every language**
  (Amendment 36's recorded seam). "13th week after Pentecost" is composed as
  an English sentence inside `lib/liturgy.js`; giving it to the packs means
  restructuring the generator to return shape ({kind, n, weekday}) and
  formatting per language — four languages of ordinal grammar. The fast
  *reasons* are already translated through each pack's `reasons` map; the
  cycle line is the remaining English on a translated Daily page. The
  author's call whether it is worth the restructure.

- **English hymn texts: begun from Hapgood, and the rest is a rights
  decision** (Amendment 41; raised at 37 and 40). Asked for outright on
  2026-08-26 and answered from the source the author chose: **Isabel Hapgood's
  1906 Service Book, public domain.** Her book holds no menaion of per-saint
  troparia — of the 132 saints here with hymns it names none — so what landed
  is the Great Feasts falling inside the corpus's four weeks: the
  Falling-Asleep, the Nativity of the Birth-giver of God, the Elevation of the
  Cross. **Five texts, twelve hymn objects.** The mechanism is in (`english`
  on a hymn; `ui/hymns.js` prefers it when the reader reads English), so any
  further text is data rather than code.

  What is still open is the other 403, and the reason has not changed.

  **The 415 hymns in this corpus are the original texts** — Greek, Church
  Slavonic, Romanian, Serbian — centuries out of copyright, which is why
  transcribing them from saint.gr and days.pravoslavie.ru was sound. **An
  English translation is a modern work with a living author.** The OCA prints
  English troparia and kontakia for much of this calendar and marks them its
  own; copying 415 into a published site is a decision only the author can
  take. `WebFetch` declines to reproduce them verbatim for the same reason.

  Two paths remain, both the author's call: **another public-domain
  translation** with wider per-saint coverage than Hapgood's, or **permission**
  from a modern translator or publisher. Whichever it is, the work is
  transcription into `english` blocks with a citation each — no code.

- **Dating the remaining 187** (Amendment 41). Three audits have taken this
  from 239: the third read the calendar entry lines and the reigns and
  councils the lives name, not just the prose, and dated 43. The 187 that
  remain are **not** unread sources — their lives say "That is the whole of
  the Prologue's notice" and "the Greek synaxarion … says it has no details of
  his life". Dating them means consulting sources this corpus has not cited,
  saint by saint, which is a sourcing commission. Read Amendment 41 before
  scoping it: four of the 47 mechanical proposals were thrown out because a
  parenthesis in a life is often about somebody else, and the Russian
  calendar's parenthesis dates *the commemoration*, which for a relics entry
  is centuries after the man.

- **Icons for the 613 saints without one** (Amendment 40, asked for
  outright). 95 of 708 have an `images/icon.jpg`, and every one of those
  carries a *placeholder* `source_url` on an unresolvable reserved domain —
  the build warns while it stands. So this is 613 sourcing decisions each
  carrying a rights question, not a fetch loop: a file, a licence, a credit
  and a real source URL apiece. Bulk-fetching images and guessing at their
  licences is the failure mode `lib/licence.js` and the build's warnings
  exist to refuse. Wikimedia Commons supplied the 88 that are cited properly
  and is the obvious well; the work is per-saint verification.

- **Six months of liturgical days across four churches** (Amendment 40, asked
  for outright). `src/data/liturgical-days.js` holds **28 days**, 23 August to
  19 September 2026, transcribed by hand from four calendars. Six months is
  roughly 180 days × 4 = **720 day-records** of readings, fasting notes, feast
  titles and hymns. Two things make it more than volume: three of the four
  sources publish only a fortnight or so ahead — saint.gr's absence for 7–19
  September is already *in* the data as a recorded absence rather than filled
  in — so the later months cannot be transcribed before the sources print
  them; and the fasting notes are now load-bearing in a way they were not,
  because `lib/fast-grade.js` reads the day's allowance off them.

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
- **Rank stays out of `display_name`, by deliberate choice (Amendment 32).**
  The author asked for rank to read as "a category in the profile, not in the
  name" — already true via `types`, printed on the saint page's facts line —
  but stripping rank out of the ~200 new-martyr names was surveyed (226
  distinct trailing segments, no safe mechanical split) and left undone,
  because for namesakes sharing a forename and year the rank and year are the
  only disambiguator. Revisit only if the author asks again with a rule for
  telling disambiguator from decoration.
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
- **Search reaches display names only.** The MiniSearch index is built from the
  manifest, which carries `display_name` but not the `names` array, so Ἀντώνιος
  and Ⲁⲛⲧⲱⲛⲓⲟⲥ find nothing. Fixing it costs manifest bytes — author's call.
- **The Index sits in the standard 72ch content column** (DESIGN.md §5), which
  is two cards wide on a desktop. Widening it for that one page is a design
  decision.
- **The uncertainty curve has no shipping consumer.** The date bars were its
  first and were withdrawn on 2026-08-21; the map halo and the timeline
  dissolve are still to come. `tests/uncertainty.test.mjs` pins its three
  constants directly in the meantime, so they cannot drift unnoticed.
