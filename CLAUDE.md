# Agent notes for this repo

**Read `HANDOFF.md` first.** That's the actual briefing — current state, house
rules, the open queue, and the reasoning behind decisions. This file is a map,
not a summary: file/line pointers so a fresh session doesn't have to Grep its
way to the same places again. Line numbers drift as the code changes — if one
below is wrong, fix it here rather than trusting it silently. Nothing here
duplicates HANDOFF.md's reasoning; it only says *where*, not *why*.

## Where things live

**Calendar (Daily page)** — `src/views/calendar.js` + `src/styles/calendar.css`
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
- Bookmark component itself: `src/ui/save.js` (one implementation, rendered
  everywhere a saint appears — Index, calendar hero, saint page).

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
(sticky, the phone's four-across grid) is `header.chrome` / `nav.site-nav` in
base.css — the phone's `[aria-current]` override must stay **after** the base
one, same specificity.

**Strings / i18n** — `src/ui/strings.js` (English, the source of truth) +
`src/ui/locales/{ru,ro,el,sr}.js`. Touch all five together for any new or
changed UI string, then run `node scripts/locale-coverage.mjs` — it reports
which keys each pack still falls back to English for (should be 0 across the
board before calling a text change done).

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

- Unit: `tests/*.test.mjs`, run with `npm test`. Fast (~10s), 166 as of
  2026-08-26.
- Browser: everything lives in **one file**, `e2e/quality-floor.spec.js`
  (~7,600 lines, 422 tests as of 2026-08-26 across two projects). Grep for a
  selector, a class name, or a phrase from a test title before opening it —
  don't read it cold start to finish.
- Run one test while iterating: `npx playwright test -g "<part of the title>"`
- Full run: `npx playwright test` (~5 min: `desktop` + `mobile-360` projects,
  each running every test).
- **Two traps this file keeps paying for.** (1) The Index grid is virtualised
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
- House rule: every fix gets a browser test, and the test gets **backed out
  and confirmed to fail** before being restored. A test that doesn't actually
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
