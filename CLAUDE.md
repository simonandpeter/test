# Agent notes for this repo

**Read `HANDOFF.md` first.** That's the actual briefing — current state, house
rules, the open queue, and the reasoning behind decisions. This file is a map,
not a summary: file/line pointers so a fresh session doesn't have to Grep its
way to the same places again. Line numbers drift as the code changes — if one
below is wrong, fix it here rather than trusting it silently. Nothing here
duplicates HANDOFF.md's reasoning; it only says *where*, not *why*.

## Where things live

**Calendar (Daily page)** — `src/views/calendar.js` + `src/styles/calendar.css`
- **`src/views/daily/` is the half that answers "what is today"**, split out
  on 2026-08-28. calendar.js keeps the half that answers "which day" — the
  roll, the rail, the month, `render` and `select`.
  - `state.js` — the page's state, and the only file that writes it
    (`open`/`close`); everything else reads the live binding.
  - `format.js` — the four Intl formats and `utc`.
  - `entries.js` — the feast index, `entriesFor`/`countFor`, and how far the
    corpus reaches.
  - `record.js` — the readings and the feast's hymns, as markup.
  - `panel.js` — the hero, the register and the three silences. It exports
    `paintDay` and nothing else.
  - `picker.js` — the rail *and* the month, which are one control and not two.
    It calls `state.select` rather than importing `select`, because the page's
    navigation funnel stays in calendar.js and an import would run backwards.
  - `motion.js` — `reducedMotion`, asked by three of the page's parts.
  - calendar.js is down to ~700 lines: `render`, `select`, the day roll, the
    liturgy line and the fast bubble. Imports run one way — format and motion
    at the bottom, then entries and record, then panel and picker, with
    calendar.js importing from all of them. **Nothing in `daily/` calls back into
    calendar.js**, which is what keeps that true.
- **The rail and the month are one seam, not two.** The month calls
  `buildRail`, `settle`, `travel`, `stepCursor` and `dayAt`; DESIGN.md says why
  ("the month is the week grown taller"). The separable half is the *day* —
  the panel, the readings and hymns markup, the feast index and the reach
  helpers — which calls nothing in the roll, the rail or the month.
- `render()` (L119) builds the page shell: `.cal-controls` (the jump button +
  week/month), `.cal-date` heading, the day panel.
- The week rail (scrolling day strip): `wireRail()` (L967) is the drag/coast/
  snap mechanics; `dayButton()` builds one day's markup; CSS is the
  `.week-strip` block in calendar.css.
- Month grid: `paintMonth()` (L1361) / `paintMonthInto()` (L1386).
- `.cal-jump`/`--cal-row-h`: top of calendar.css (`.cal-controls`, L13) — one
  button (month toggle) fills the row's full height; the old second button
  (jump-to-today) is gone, replaced by the today-bubble ring on `.day-num`.
- Day panel (hero, register, readings, hymns, name days): `paintDay()`
  (L1519). **Order is deliberate** — name days render last, immediately before
  the `Continue reading` shelf that follows outside `.cal-body`.
- Fast bubble: `openFastBubble()` (L564) / `closeFastBubble()` (L673) in
  calendar.js; styles at `.fast-bubble` (calendar.css L1469).
- The line under the date (fast chip, allowance, feast chip, cycle) is one
  function, `paintLiturgy()` (L336); the Great Feast it names comes from
  `greatFeast()` in `src/lib/liturgy.js`, styles at `.feast-chip`
  (calendar.css L1330). Gold there is the border and the tint only — see the
  rule's own comment before giving it the text.
- Today's ring: `.week-strip .is-today .day-num::before` (calendar.css L400)
  and the month's copy of it below; the bottom edge is `0` on purpose, so it
  lands on the selected day's underline.
- Gold hairline under the date: `.cal-date:has(+ .cal-liturgy...)`
  (calendar.css L1252) and its `::after` (L1258) — full column width, not a
  fixed em measure.
- Hero bookmark: lives in `.name-line` beside the saint's name (not over the
  image) — `.hero .name-line > .bookmark` in calendar.css. It is **pinned**
  (`margin-inline-start: auto`) and inset by `--space-1`, which is
  `.reg-card`'s own padding, so it shares a column with the register's marks.
  `.name-line`'s flex mechanism holds the mark's *width* only; it does not
  place it.
- Both header panels fly: `src/ui/fly.js` holds `flyInto` (closing) and
  `flyOutOf` (opening), one `journey()` between them. Either returns its
  `finish`; a caller starting one direction must land the other first, or the
  rect it reads is a box mid-flight.

**Coachmarks (first-visit tooltips)** — `src/ui/coachmark.js` + `.coachmark`
in base.css (L605)
- Exactly two marks, by design (see the file's own header comment) —
  `layout()` (coachmark.js L228) handles collision between exactly two and
  does not generalise to a third.
- The max-width formula (base.css, near L617) and the collision-cascade math
  (`layout()`) are both load-bearing together: two marks at max width need to
  actually fit a 360px screen with the gap between them. If either changes,
  re-check at 360px.

**Index / All Saints** — `src/views/saints.js` (`card()`, L785) +
`src/styles/index.css`
- `.index-card` (index.css L309), `.index-dates` (L390).
- Bookmark positioning is **two rules** since 2026-08-26 evening: every
  non-row card uses `.index-card > .bookmark` (the card's own corner), and a
  row uses `.index-card.is-row > .bookmark` (a static flex sibling). An
  imageless card reserves the mark's 40 px out of its name line and its dates
  so neither runs under it — that reserve is what the single corner cost.
- The Index's controls: seven facet chips plus the `.random-die` in `.facets`;
  Sort, View and Detailed in `.index-foot`. Sort and View are `.facet-choice`
  disclosures built by `choiceGroup()` in views/saints.js, read with
  `currentChoice()` and written with `setChoice()` — **both, always**, or the
  chip advertises an order the grid is not in.
- **The search field sticks** (`.index-controls` is the sticky element — a
  sticky box can only travel inside its containing block, and this one is a
  direct child of the view). `--chrome-h` is published from a ResizeObserver in
  `main.js`; `wireSticky()` handles the stuck state and the filter drop.
  **The fold must never change layout height**: the band keeps its height and
  the filters translate up behind the row. Collapsing it instead takes 69 px
  out of the document, which scroll anchoring hides from the eye and which
  silently shortens every remembered scroll position by the same amount on the
  next visit. The stuck hairline is reserved (transparent) for the same reason
  at 1 px.
- **The drop closes on reader *input*** (wheel/touch), not on the scroll event:
  opening it makes the browser move the page ~33 px to compensate, which no
  stopwatch or distance test can tell from a real scroll.
- **Two modes since 2026-08-27, and the page opens on the carousel.**
  `state.mode` is `'carousel'` or `'search'`, remembered in `settings.indexMode`;
  `applyMode()` toggles `is-carousel`/`is-search` on the *view root* and
  `switchMode()` runs the fall-then-fade between them. Nothing is rebuilt to
  change face — the filters keep their DOM and the reader's choices survive the
  trip. The `--facet-*` custom properties live on those two root classes (not
  on `.index-controls`) because the mode toggle is a chip outside the controls.
- **Read a hidden element's `scrollLeft` before you hide it.** `display: none`
  reports 0 and ignores writes — which is how the carousel lost its offset on
  every mode switch. `applyMode()` reads it first, deliberately.
- **`ui/loop-scroll.js` decides whose scroll it was by position**, not by
  whether a frame is scheduled: the drift writes every frame, so "no frame
  pending" is never true and a reader's own drag was being discarded.
- **The carousel**: `paintCarousel()` fills `[data-carousel-track]`, and
  `src/ui/loop-scroll.js` is the endless-scroll engine (clone buffer, wrap by
  one period, measure real offsets, never write `scrollLeft` mid-touch). Its
  header says which parts came from the cross-church build and why each is
  load-bearing. The track draws a **sample** — `CAROUSEL_POOL`, imaged saints
  first — not the whole corpus.
- **The row does not stop for the pointer** (2026-08-27) — a cursor over a
  full-bleed row is where a desktop cursor simply is. A touch and a focus still
  stop it; `still()` is the list.
- **`windowImages()` hands out the `src`es**, a few cards either side of the
  track, and takes them back after. Cards are never removed — the loop's
  arithmetic is read from real offsets and removing one moves every offset
  after it. This is only free because each `<img>` carries `width`/`height`:
  those give the box an `aspect-ratio`, so it is exactly as tall empty as
  full. **Drop the attributes and every scroll becomes a reflow.**
- **The wheel is capped velocity, not a target** — `wheelMax` px/s however hard
  it is spun, `wheelDecay` for how far one hand's worth carries. The cap is
  what turns `windowImages`' fixed distance into a guaranteed decode time, so
  the two numbers are a pair. It `preventDefault`s, so over the row the wheel
  drives the row and not the page.
- **`loopScroll` re-measures from its own frame until the geometry is real.**
  A `measure()` that runs before the track is laid out reads every offset as 0,
  which leaves `bodySpan` 0, `wrap()` disabled and `started` unlatched — the
  row drifts off the end of the clone buffer with no period to correct
  against. That was survivable only by accident until 2026-08-27: every `<img>`
  had a `load` listener that re-measured, so the first picture to arrive
  repaired it. `windowImages` stopped the pictures loading on their own and the
  accident stopped happening (the row opened at 62 px, unwrapped). Card widths
  are `--cx-w` and no picture can change them, so nothing re-measures on load
  any more and nothing needs to.
- **The card's size is `--cx-w`/`--cx-max-h` on `.carousel`**, one place rather
  than the four copies of `150px` that `.cx-card`, `.cx-media`, `.cx-name` and
  `.cx-sub` each held. 240 px past 700 px wide, 150 below it (2026-08-27, "at
  least 1.5x on desktop" — 1.6). 700 and not the chrome's 560: at 240 a 560 px
  screen holds barely two cards.
- A **row** reads name-first since 2026-08-27: `.row-body`, then the picture,
  then the mark (`order: 1/2/3`). An imageless row keeps a blank 48 px slot
  (`.index-media.is-blank`) so the marks stay in one column.
- Bookmark component itself: `src/ui/save.js` (one implementation, rendered
  everywhere a saint appears — Index, calendar hero, saint page).
- The die's roll is `src/ui/roll.js` — a fixed copy of the die over a faded
  view, then the navigation, then the reveal.

**Saint detail page** — `src/views/saint.js` + `src/styles/saint.css`
- The `.name-line` pattern (name shrinks and wraps within itself; a sibling
  control holds its own width via `flex: none` from `.icon-button`) is
  defined once in base.css and reused by the saint page's `h1`+tools, the
  calendar hero's name+bookmark, and Index cards. Look there before adding a
  bespoke flex layout for "name beside a control."

**Tokens** — `src/styles/tokens.css`: colours, spacing (`--space-1`…`--space-8`
etc.), radii (`--radius-panel` = 4px, deliberately close to square — a softer
bubble like `.coachmark`/`.fast-bubble` overrides it locally rather than
changing the shared token). Two theme blocks (light, then dark) — a colour
change needs both, and dark mode isn't covered by the axe/contrast browser
tests (they run light-mode only).

**Chrome / nav** — `src/main.js` renders the four nav links; the Daily one
carries a `[data-nav-label]` span whose word swaps to *Today* while the reader
is on the Daily page looking at another day. The Daily view announces the day
with a `gos:day` CustomEvent from `select()`; main.js listens. Header layout
(the phone's four-across grid) is `header.chrome` / `nav.site-nav` in
base.css — the phone's `[aria-current]` override must stay **after** the base
one, same specificity. **The sticking is on `.chrome-bar`** (index.html), which
wraps the header and both chooser panels so the panels travel with it
(2026-08-27); `header.chrome` keeps its own `position: sticky` so the bar's top
is still the header's own box.

**Strings / i18n** — `src/ui/strings.js` (English, the source of truth) +
`src/ui/locales/{ru,ro,el,sr}.js`. Touch all five together for any new or
changed UI string, then run `node scripts/locale-coverage.mjs` — it reports
which keys each pack still falls back to English for (should be 0 across the
board before calling a text change done).

**Boot and payload** — `src/main.js`'s `boot()` awaits three things together:
the manifest, `readyDays()` from `src/data/days.js` (the 293 kB day records, a
dynamic chunk), and `ensurePack(currentLanguage())` from `lib/i18n.js` (that
one language's pack, ~20 kB). `data/liturgical-days.js` is imported *only* by
days.js; import it anywhere else and it goes back into the entry chunk.
`ensureAllPacks()` is for the search index, which needs every language at once.

**A view transition suspends rendering while its callback runs.** Anything
awaited inside `startViewTransition`'s callback must not wait on
`requestAnimationFrame`: the browser will not run a frame until the callback's
promise settles, so a frame-await in there deadlocks both ways and the
transition never finishes — leaving the page at the top of the new view.
Timers keep running and a layout read is still honest, so poll with
`setTimeout`. `restoreSection` says this at the point of use.

**Where the reader was** — `sectionScroll` in `src/main.js` keeps a scroll
position per nav section and `restoreSection` is **awaited inside** the
transition callback — `swap` is async and `startViewTransition` does not
snapshot the new state until the promise settles, so the fade is captured with
the page already in place. It waits (bounded, on a timer) for the view to be
tall enough, because a view is not its final height synchronously: the Daily
page grows 508 px when `fillSaintHymns` lands, and a scroll applied against the
shorter page clamps short. `settleLate` is the net for a load slower than the
wait, and fires only if the page is still exactly where the wait left it. Pressing the current section's nav button forgets the position and
eases to the top over a fixed 300 ms (`animateScrollToTop`).

**Names** — `src/lib/honorific.js` decides the rank in front of a name
(precedence walk over `types`, written out in the file's header);
`src/lib/saint-name.js` chooses which recorded form to print per language and
strips the source calendar's own honorific and rank, leading *and* — in Greek —
appositional. The rank words live in `ui/strings.js` under `saints.ranks`, two
forms each. `office` is a field on `saint.json`, drawn on the subtext line by
`formatSubtext()` in `lib/calendar-page.js`, never in the name.

**Saint data** — `saints/<slug>/saint.json` + `life.md`. Never hand-edit
`data/manifest.json` — it's generated by `npm run build:manifest` (also runs
as part of `npm run build`/`npm run dev`). A `display_name` or life-heading
change needs both files kept in sync (a unit test pins life.md's `# heading`
to match `display_name`).

**Icons** — `saints/<slug>/images/icon.jpg` + `icon.meta.json` + a generated
`icon-thumb.jpg` (blur+downscale, recipe in `make_thumbs.py` — 4px Gaussian
blur, resize ÷4, JPEG quality 45). If an icon's crop is wrong (shows margin/
caption instead of the saint), it's a data fix on the file itself, not a CSS
fix — the hero's `object-position: 50% 0` top-crop just takes whatever the
top of the file is.

## Tests

- Unit: `tests/*.test.mjs`, run with `npm test`. Fast (~10s), 171 as of
  2026-08-28. One file per `src/lib` module, named for the module.
- Browser: `e2e/`, **one file per surface** since 2026-08-28 — 496 tests across
  two projects.
  - `daily.spec.js` — the rail, the month, the day panel, readings, the fast.
  - `index.spec.js` — the carousel, the grid, the facets, search, the counts.
  - `saint.spec.js` — the register, the life, the hymns, the licence.
  - `chrome.spec.js` — the header, its two choosers, the coachmarks, the
    shelf, the theme, the section scroll.
  - `quality-floor.spec.js` — the brief's §13 gate: axe, overflow, focus,
    console. It keeps the name because that is what the gate is called.
  - `helpers.js` — the shared fixtures (`ready`, `openChooser`, `leaders`,
    `facet`, `chooseSort`, `aDayThatIsNotToday`, `swipe`, …). **Every spec
    file repeats the `searchMode` `beforeEach`**; it was one `beforeEach` over
    one file, and a spec that drops it hands its tests the carousel instead.
  - It was a single 9,308-line file until then, filed by the sitting each test
    was written in, so finding a feature's tests meant knowing when it was
    built. The tests themselves did not change in the move: each still carries
    the instruction that caused it and its date, which is where the
    provenance lives.
- Run one test while iterating: `npx playwright test -g "<part of the title>"`
- Full run: `npx playwright test` (~5 min: `desktop` + `mobile-360` projects,
  each running every test).
- **Four traps this suite keeps paying for.** (1) The Index grid is virtualised
  *and* absolutely positioned, so the mounted set is not the corpus and DOM
  order is not screen order — assert order through `leaders()`, which sorts by
  geometry, and never off `.first()`. (2) A width measured in the native
  utility face is a measurement of one machine: CI's system-ui is wider than
  Arial. Assert layout either by *order* (face-independent) or inside a test
  that blocks the webfont and forces Arial, as the foot and filter-row budget
  tests do. **This includes anything that depends on where a row wraps** —
  a line count, a box's x or y, a height taken from a flex line. The Random
  die went red on CI three times running (2026-08-26) on three different
  face-dependent assertions about the same row, the third being a *test's own
  precondition* that the row was on one line. Where a wrap is the thing under
  test, force it with the column (`.facets { max-width: 40px }`) rather than
  with a font, and the state is the same on every machine.
- **A fourth, and it made a test pass that was pinning nothing (2026-08-27).**
  `locator.click()` scrolls its target into view first. Press a control that
  lives in the **sticky bar** that way and Playwright carries the page back to
  the top on its own — so any assertion about a *scrolled* page taken after
  such a press is measuring the top of the document. Backing the fix out is
  what found it: the panel test passed against a non-sticky bar. Dispatch the
  press (`page.evaluate(() => el.click())`) and assert the scroll position is
  still where you put it before measuring anything else.
- **A third trap, and it cost a red CI run on 2026-08-27.** Anything that
  depends on *what day the machine thinks it is* is a measurement of one
  clock. The Daily button reads **Today** on a day that is not today and its
  own name on today, so an assertion about either word, on a hardcoded date,
  is a test that fails on exactly one day of the year — and CI ran on that day,
  hours after the four packs were given a base word distinct from their word
  for Today, which is what made the two states tell apart at all. Navigate
  through `aDayThatIsNotToday(page)` (top of the spec) rather than a literal,
  or assert a word that does not move.
- **A fourth trap, and it is the least obvious: a green `npm run build` says
  nothing about whether a code move is complete.** Splitting views/calendar.js
  on 2026-08-28 left `BASE` behind — a module-scope const rather than an
  import, so the tool carrying the imports never looked at it — and the build
  was perfectly happy while 88 browser tests went red. A bare reference to a
  name that never travelled is valid JavaScript until the line runs, and
  reading the diff does not catch it either. `node scripts/extraction-check.mjs
  <before.js> <moved.js...>` asks the one question that does: which names did
  the original declare, rather than import, that a new file uses without
  having? Run it on every extraction. **It exits 1 with names outstanding**, so
  it works as a pre-commit or CI step and not only by eye.
- House rule: every fix gets a browser test, and the test gets **backed out
  and confirmed to fail** before being restored. **That applies to a tool as
  much as to a fix**: extraction-check.mjs was written, reported "clean", and
  was only shown to be broken by deleting `BASE` again and watching it stay
  silent. Twice, for two different reasons. A test that doesn't actually
  reproduce the defect when the fix is reverted isn't pinning anything —
  several tests in this repo's history looked right and weren't.

## Commands

- `npm run build` — manifest + vite build (needed before `npm run preview`
  reflects a change; `preview` serves whatever is already in `dist/`).
- `npm run preview` — serves `dist/` on :4173 (or the next free port).
  **Kill it when done** — check `netstat -ano | grep LISTENING` on Windows —
  or a stray one left over from a previous session makes the next
  `npx playwright test` fail confusingly (it starts its own and refuses to
  reuse one it didn't start).
- `node scripts/shot.mjs <name> <url> [width] [steps...]` — screenshot a
  running preview into `shots/` (gitignored). Steps: `click:<sel>`,
  `wait:<ms>`, `key:<key>`, `scroll:<px>`, `lang:<id>`, `church:<id>`.
- `node scripts/locale-coverage.mjs` — which strings each locale pack falls
  back to English for.
- On Windows, prefer the Write/Edit tools or short Python one-liners over
  PowerShell heredocs for anything that must not gain a BOM (breaks
  `JSON.parse`) — see HANDOFF.md's "Environment notes" for the full list of
  Windows-specific gotchas (Git Bash path rewriting, `font-display: optional`
  flakiness, etc.).

## Workflow rules (condensed from HANDOFF.md — read it for the reasoning)

- **Render every visual change and look at it.** Screenshot via `shot.mjs` or
  a quick ad hoc Playwright script; don't infer correctness from the CSS
  alone. More than one bug in this codebase's history was invisible in the
  diff and obvious on screen (a proportion applied twice, a fade that failed
  contrast, a today-marker overlap that only showed up at exactly 360px).
- **CI, or a full local `npx playwright test` run, is the source of truth** —
  not one test passing in isolation, and not a local pass in general (a
  `.gitignore` bug once shipped untracked data files while every local run
  was green).
- **`git status` before anything destructive; never `git add -A`.**
