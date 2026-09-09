# PLAN

What this site is, what it should look and feel like, what is already settled,
and what is next. **Binding.** If the code disagrees with this file, the code is
wrong.

`CLAUDE.md` is the other half: where things live and how to work. History lives
in `git log` — 430 commits of reasoning, searchable with `git log --grep`. Read
it only when someone says "it used to be…".

Two older documents survive in `docs/` because the code cites them as a
contract, sixty-four times between them: `saintsbuildplan.md` is the brief
("brief §13" is the ship gate, "§12" is offline) and `saintsplanaddendum.md`
wins where the two disagree. Where *this* file and the brief disagree, this file
is the later decision and wins.

---

## 1. The site

An Eastern Orthodox daily calendar and saints reference. Four churches —
Russian, Romanian, Greek, Serbian — and the reader chooses one. Five pages:
Daily, All Saints, Texts, Map, About. Five reading languages: English plus the
four churches' own.

Live at https://simonandpeter.github.io/test/, deployed by GitHub Actions from
`dist/`. The corpus is 862 saints, each a folder of its own.

**The subject is other people's devotion.** That sets the whole tone: the site
is a register, not a brochure. It states what is recorded and says plainly what
is not. Nothing is invented to fill a gap, and a gap is shown as a gap.

---

## 2. Voice and intent

### The two source materials

Everything visual descends from these, because they are the two things the site
actually is. Restraint is the register's; warmth is the panel's. Ornament would
read as costume, so there is none.

**The icon panel.** A traditional icon is painted on a board with a recessed
centre field — the *kovcheg*, "ark" — inside a raised integral border. The
ground is gold leaf burnished over a red-brown clay called *bole*, and where the
gold wears at the edges the bole shows through. So a saint on this site lives in
a panel: **a recessed field with an integral border, never a floating rectangle
with a drop shadow.** Depth comes from the field being slightly darker than the
page. `--field` is that field and `--gesso` is the board; vigil mode is the bole.

**The martyrology register.** A synaxarium is a ruled book organised by day: the
date, then the entries, one tradition's voice at a time, with red — the
*rubric* — marking what the reader must not miss. So a list on this site is a
register: ruled day-by-day columns, red for liturgical time, a rule only where a
register genuinely rules a line.

### Three sentences that decide most arguments

1. **A register, not a brochure.** Rules where a register rules. No ornament
   that is not a finding. Restraint is where the gravity comes from.
2. **Say what is known, and say what is not.** "Undated" is a finding, not a
   blank. A missing source is printed as a missing source.
3. **The reader causes the movement.** Nothing animates to explain itself.

### What we are deliberately not doing

The standing check against drifting back to AI-default looks:

- **No cream-and-terracotta heritage kit.** The ground is chalk gesso; the
  accents are liturgical red and reserved gold, each with a job. If a future
  nudge adds warmth to the ground, this is the check it must pass.
- **No near-black with an acid accent.** Vigil mode is warm bole, and the
  brightest thing in it is a saint's gold, never a neon.
- **No hairline-broadsheet costume.**
- **No decorative crosses, halos, illuminated capitals or blackletter.**
- **No spinners.** Skeletons at the final dimensions, so nothing reflows on
  arrival. A veil for the first load only.
- **Errors are prose**, in ink. Never a red banner — red belongs to the liturgy.

---

## 3. The design system

**The tokens in `src/styles/tokens.css` are the design.** A raw colour,
duration, easing, type size or spacing value anywhere else is a defect. That
rule is executable for three of the five: `tests/design-tokens.test.mjs` fails
on a raw easing, a sub-second raw duration or a raw `font-size` in a component
sheet. Spacing and colour turned out to need no sweep at all — both figures that said
otherwise were miscounts, and the sections below give the numbers. A
test is the reason this
section is worth writing: the old DESIGN.md said "200 ms standard, one easing"
for three weeks while the code grew to 17 durations and 7 easings, because a
document cannot stop a value being typed.

### Colour

Two themes, `day` and `vigil`. Dark is not an inversion and contains no pure
black.

| token | day | means |
| --- | --- | --- |
| `--gesso` | `#ece5d6` | the ground: primed gesso, not paper |
| `--ink` | `#221d19` | body text |
| `--ink-soft` | `#5c544d` | secondary text, coastlines, marks |
| `--rubric` | `#8a2e26` | **liturgical time and place only** |
| `--gold` | `#a98237` | a glyph or border; 2.82:1, never a word |
| `--gold-ink` | `#755925` | gold as *text*, 4.59:1 |
| `--rule` | `#c8c2b7` | a register's rule |
| `--field` | `#e6ddca` | recessed panel interior — never a page background |
| `--veil` | gesso at 0.8 | first-load scrim |

**Two colours carry meaning and nothing else may.** Rubric marks liturgical time
and the reader's place. Gold marks a finding about veneration. The one sanctioned
exception is the fast's colour by kind (`--fast-strict/-fish/-free`), plus the
Random die.

Every text token is held to WCAG AA on both grounds in both themes by
`tests/contrast.test.mjs`, and axe runs over every route in both themes.

### Type

Three voices, two families.

- `--font-display` — GFS Nicefore, the masthead and nothing else.
- `--font-serif` — Literata. The reading voice: lives, prose, names.
- `--font-utility` — system UI. Apparatus: dates, counts, labels, chips.

**Every `font-size` goes through a `--text-*` token.** **Nine steps**, plus
`--text-mast`/`--text-mast-wide` for the display voice:

| token | px | for |
| --- | --- | --- |
| `--text-3xs` | 9 | the smallest mark on the site |
| `--text-2xs` | 12 | the map's atlas layer |
| `--text-sm` | 13 | the utility voice: nav, chips, counts, captions |
| `--text-base` | 15 | apparatus at reading weight: labels, subtext |
| `--text-lg` | 17 | the reading voice: lives, prose |
| `--text-lede` | 19 | a page's opening paragraph |
| `--text-xl` | 21 | h3 |
| `--text-2xl` | 26 | h2 |
| `--text-3xl` | `clamp(28px, 5vw, 40px)` | h1 |

It was **fourteen** until 2026-09-09 — the sizes the site happened to have,
named rather than chosen. 12.5 and 13.5 folded into 13, 14 and 16 into 15.
Nothing on the site distinguished half a pixel to a reader, and four of the
fourteen were decisions nobody had made.

Verified with the sheet, not by eye: all 48 tiles differ, since every page
carries type, and the two documented risks were checked directly. The nav row
(`nav.site-nav a`, once `--text-nav`) moved **down** half a pixel — the safe
direction — and fits on one row at 760 and 860 px in Romanian, Serbian and
Greek. All Saints' `white-space: nowrap` control chips took the +1 px and still
sit inside 560 px in the widest pack.

### Space

`--space-1` 4px through `--space-16` 64px, doubling. `--radius-panel` 4px,
`--radius-cell` 1px.

**There is no spacing sweep to do, and the figure that said otherwise was
wrong.** This section read "412 raw px values still live outside `tokens.css`
— the next sweep after type" until 2026-09-09. Measured: **310 declarations
already go through `var(--space-*)`** and 35 through a radius token, and the
component sheets hold **254** raw px values, not 412 — the larger number was
every `px` in `src/**`, comments and `tokens.css` included.

Of those 254, only **53** sit on a spacing property at all, and **4** of the 53
are on the scale. The rest of the 254 is `border` (45), `height` (30), `width`
(18), `border-radius` (13), `box-shadow` (12), `text-underline-offset` (11) —
and the two commonest values in the whole set are **1px (74) and 2px (43)**,
which are hairlines and shadow offsets. A scale should not govern those, and a
sweep that tokenised them would turn arbitrary numbers into arbitrary names.

Spacing is already ~97% governed. What is left unenforced is **colour**: three
raw hex values outside `tokens.css`. That is the sweep worth doing, and it is
small.

### Motion

**The intent, from which a duration is chosen rather than invented:**

- **Chrome answers; content settles.** A control the reader pressed responds at
  once and finishes fast. A page arriving takes its time.
- **One gesture, one movement.** A press produces a single legible change, not a
  sequence the reader has to parse. If two things move, they move together.
- **Nothing moves that the reader did not cause** — with one deliberate
  exception, the All Saints carousel's drift, which is the page saying "there is
  more here than you asked for".
- **Reduced motion removes, never shortens.** `prefers-reduced-motion: reduce`
  disables the whole mechanism; the end state arrives immediately.

**The scale**, replacing 17 ad-hoc durations and 7 easings (2026-09-08). It
lives twice — `tokens.css` for CSS and `lib/motion.js`'s `DUR` for JS — because
a hand-rolled tween and a CSS transition are routinely the same movement;
`tests/design-tokens.test.mjs` fails if the two disagree.

| token | ms | for |
| --- | --- | --- |
| `--dur-answer` | 140 | a control acknowledging a press |
| `--dur-move` | 200 | the standard: a panel, a chip, a fade |
| `--dur-settle` | 300 | something arriving on or leaving the page |
| `--dur-travel` | 450 | a journey across the screen: a flight, a glide |
| `--dur-linger` | 900 | content arriving with no gesture behind it |

| token | curve | for |
| --- | --- | --- |
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | the default: decisive, arrives calm |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | leaves at once, eases to rest |
| `--ease-soft` | `cubic-bezier(0.4, 0, 0.2, 1)` | long fades, nothing decided |
| `--ease-spring` | `cubic-bezier(0.2, 0.9, 0.3, 1.2)` | the one overshoot |
| `--ease-turn` | `cubic-bezier(0.45, 0, 0.25, 1)` | the die: one symmetric turn |

A value outside the scale needs a line in one of these tables before it is
typed, and the test will say so. Loops — the veil's sweep, the skeleton's
breath, the coachmark's glow — state their own period and are exempt above one
second, being a different decision from a scale of response times.

**`--ease-turn` is symmetric and every other curve here is not.** One full
rotation reads as a turn only if it accelerates and decelerates equally; a
movement that goes somewhere does not. It has one caller, the Random die, and
that is the whole of its job.

**Both halves are fenced.** `lib/motion.js` exports `DUR` and `EASE`; the test
holds them to `tokens.css` and fails on a `cubic-bezier` or a numeric
`duration:`/`delay:` written anywhere in `src/*.js`. It also fails on a `var()`
reading a custom property nothing defines — which is how `--dur-slot` and
`--dur-theme` were deleted from `tokens.css` on 2026-09-08 with thirteen call
sites still reading them, silently dropping the theme cross-fade and every slot
movement while 902 browser tests passed.

### Softness

One continuous function of one number, used identically wherever it appears:
map halos (`uncertainty_km`), timeline dissolves, and any date bar that returns.
`softness(p) = clamp(min · p^gamma, min, max)`, px at base scale — `min` 0.75,
`max` 24, `gamma` 0.55, pinned by `tests/uncertainty.test.mjs` and implemented
in `lib/uncertainty.js`. An application may scale it linearly (map zoom) but
never reshape it.

**It never takes an editorial enum as input.** `basis` and `historicity` are
claims, not measurements; they may modulate *treatment* — a weight, a texture, a
rule style — but never geometry. A soft edge always means "we are unsure of the
number", never "we doubt the story."

Worked values: 1 year → 0.75 px, 30 → 4.87, 100 → 9.44, 200 → 13.82, 500 →
22.88. The clamp does not bind until about 757 years, and an unknown parameter
is the clamp itself. **An open bound dissolves over extent, not radius**: 24 px
of blur applied to an 8 px bar erases it, including the bound at the other end,
which is often a real finding ("no later than 1000"). One open end keeps the
curve's sharp value and fades to nothing over the last 45% of its length toward
the unknown side.

---

## 4. Layout

The geometry the overhaul inherits. Where a number here and the code disagree,
this file is the decision — but check the contact sheet before changing one,
because several of these were tuned against real content.

**Space and measure.** 4 px base, steps 4/8/12/16/24/32/48/64 (`--space-1`
through `--space-16`). Content column `72ch` max, centred; reading text `65ch`.

**Corners are crisp.** Panels 4 px, badge cells 1 px, buttons 4 px. This is
deliberately near the broadsheet territory the brief bans, and it steps away
from it through warm materials, the recessed field, and rules used sparingly —
not through softer corners.

**The panel (card).** Recessed field on `--field`, 1 px `--rule` border, **no
drop shadow on the panel**; padding 16. Depth is the field being darker than
the page, never a cast shadow. Image, then the name, then whatever the mode
puts under it — dates, a description, the Detailed matrix. On hover the border
darkens toward `--ink-soft` and nothing moves or lifts. **The card box is
derived, not fixed** — the manifest carries each image's aspect ratio and the
card takes it.

**The register (list).** A day heading in small caps with its date, one rule
under it, entries beneath, one tradition's voice at a time.

**A row reads name-first**, with its picture at the trailing end — a 48 px
thumbnail has no corner to spare, so the row's bookmark goes at the trailing
edge rather than over the image.

**The bookmark stands at the image's top-right corner**, a frameless silhouette
over the picture: no frame, no field, the shape alone, in ink — gold would claim
a finding and red would claim liturgical time. One drawing everywhere, filled at
both states, half opacity until saved, `aria-pressed` carrying the state.

*This paragraph ended "and where a picture is underneath it takes a drop
shadow" until 2026-09-09. **It does not** — there is no `drop-shadow` or
`box-shadow` on the bookmark anywhere in the CSS. The old DESIGN.md proposed
one as the replacement for a gesso hairline that was removed on 2026-08-24, and
either it was never built or it went later. What defends the mark over a dark
icon today is only its own ink. Whether it needs anything more is the
overhaul's to decide.*

**"That is the one shadow on the site" was written here on 2026-09-08 and is
false** — an extrapolation from the old DESIGN.md's justification of the
bookmark's shadow, asserted without counting. There are six, found by
`scratchpad/colour-audit.py` on 2026-09-09:

| where | what |
| --- | --- |
| `.chrome` | `0 6px 18px -8px rgb(0 0 0 / 0.4)` — the sticky header over scrolling content |
| `.month-grid button` | the same shadow |
| `.hero-more` | `0 6px 20px rgb(0 0 0 / 0.14)` — the Read more pill |
| `.index-name:hover` | `0 6px 12px -10px rgb(0 0 0 / 0.5)` |
| `.index-desc` | `0 8px 14px -12px rgb(0 0 0 / 0.5)` |

Not shadows, but in the same family: a `rgb(0 0 0 / 0.45)` scrim on
`.hero-media`, the coachmark's gold glow, and the map's focus ring, which uses
`box-shadow` to draw two concentric rings rather than a shadow.

None of the five is on a *panel*, so the rule above holds as written — a card
still has no cast shadow. But "no drop shadows" as a blanket claim does not,
and a sticky header lifting off scrolling content is a defensible thing to do
on purpose. **The overhaul should decide which of the five stay and say so
here.** The bookmark's, which this section used to call the only one, is not
among them and never existed.

**All Saints has two faces and opens on the carousel**; Cards and Rows are the
register at card weight, chosen by the reader and remembered. The carousel's
cards show their pictures whole.

**The search field follows the reader down the register.**

**Two columns past 1024 px on Daily**, `display: contents` below it.

---

## 5. Content and code

**The corpus is data and the site is code, and the break is clean.** No saint
slug appears anywhere in `src/` outside a comment. A saint is
`saints/<slug>/{saint.json, life.md, images/}`, schema-validated, built into
`data/manifest.json` by `scripts/build-manifest.mjs`. The app only ever reads
the manifest.

**Keep it that way.** In particular:

- Never hand-edit `data/manifest.json`.
- A wrong crop is a data fix, not a CSS one.
- **Tests must not name instances.** 85 hard-coded saint slugs and dates
  currently live in the e2e specs, and they are why adding saints goes red. Read
  the fixture from the manifest, assert the premise, then the claim — the
  pattern already exists as `CORPUS`, `NO_RU_NAME`, `venerateUnion`.

### Content rules

- **Nothing in the corpus is invented.** Lives are written after a named
  synaxarion and close with the source they were read from.
- **The lives stay English**, by decision. The source-language material a reader
  of that language wants — hymns, quoted calendar lines, name forms — is on the
  page in the original.
- **One reversal, for hymns only**: a hymn's `english` is either a citation to a
  published rendering or says `rendered: "site"`, and the page prints "Rendered
  for this site". That condition is the whole worth of the reversal; do not add
  a rendering without it.
- **A saint is named by rank, not "St."** `display_name` is the bare name;
  `office` is its own field. Never put rank, office or death year in
  `display_name`.
- **`BRAND` is never translated.** The masthead is an SVG of the stamp face's
  outlines, not live text.

### The naming contract

Four fields, and the split is what makes the rest possible. `display_name` held
name, office, rank and death year in one string until 2026-08-27 — "Gorazd,
Bishop of Bohemia and Moravia-Silesia, Hieromartyr (1942)" — and every naming
rule since rests on having taken it apart.

- `display_name` — the bare name. **Never** a rank, an office or a year; a unit
  test sweeps for all three.
- `office` — "Archbishop of Constantinople". Its own field, drawn on the line
  under the name.
- `types` — the closed slug list the Index filters on.
- `names` — the saint's own script forms. **Not** the search index, which is
  also called `names`; the two are different things.

A saint is printed with the **rank** their sources give — *Venerable Moses the
Ethiopian*, *Prophet Zacharias* — and "St" is the marked case for the ones with
no distinctive rank, which is how OCA and the Greek calendars print them.
`lib/honorific.js` is the precedence walk, `lib/saint-name.js` chooses which
recorded form to show.

A folder is a saint unless it says otherwise; the one alternative is a feast,
flagged in `saint.json` so the naming function opts out rather than guessing
from the name — "St. Dormition of the Theotokos" is what a blanket honorific
would print. Nothing carries the flag yet.

### Hymns: the next pass, before any more translation

**No kontakion in the corpus has ever been matched against Orloff's commons**,
and he prints one in every general service. A citation beats a rendering
wherever one exists, so that pass comes before translating anything further.
383 hymn objects have no English. 140 saints of 862 carry any hymn at all, 427
hymn objects between them (Russian 143, Greek 149, Romanian 117, Serbian 18);
256 troparia and 171 kontakia.

---

## 6. Settled — do not re-propose

Each of these was decided, and several were tried the other way first. Reopen
one only if the author asks.

**The map**
- A flat 2D Mercator, not a globe.
- The page is the map and its timeline — no lede, Places list, tray, facets or
  footer.
- A press on a dot **selects**; `Profile ›` is the way to a saint's page. A dot
  is not a door.
- A bare wheel zooms, no Ctrl; touch belongs to the map always.
- Dots merge at real coordinates (`mergeDots`); they do not fan into rings.
- A crowd's scatter is relaxed-random, not concentric.
- There is no whole-world terrain raster; the tile grid is the only source.
- The atlas layer is not an obstacle and its city names sit **left** of their
  marker.

**The chrome**
- Below 760 px the nav is an endless centred strip; at 760 and above, a plain
  row.
- The strip is five real links rotated by flex `order` — **never cloned**, and
  never reordered in the DOM.
- The strip's glide starts on the press and that press skips the page
  cross-fade; every other navigation still fades.

**Names and pages**
- No "Also called" multi-script block on a saint page.
- Sex is a facet on All Saints and is not on a saint's heading line.
- The hero icon is not pinned; it scrolls with its column.
- A chosen reckoning renames the day and moves nothing.
- Offices, attestation titles and lifespan displays all read in the reader's
  language.

---

## 7. Next

In order, revised 2026-09-08 after the numbers behind the old order were
re-measured.

1. ~~**Contact sheet**~~ — done. `node scripts/contact-sheet.mjs`.
2. ~~**Token scales**~~ — done for type, motion and easing, in CSS *and* JS.
   Space is named but unenforced; colour is unenforced. Those two are the
   remaining half of section 3 and belong to the overhaul.
3. ~~**Map tests down to units**~~ — done on 2026-09-09, and **the diagnosis in
   this item was wrong**, which is worth keeping. The claim was that
   `map.spec.js` re-asserts arithmetic `lib/map-*` already exposes purely. It
   does not much: those modules carry 1,438 lines of unit tests against 1,561
   lines of source, and the file's 78 tests are mostly things only a browser
   answers.

   The cost was a wait. Measured: the file was 18% of the suite's tests and
   **54% of its wall time**, 16.8 s a test against 2.9 s elsewhere, under a
   30 s timeout — so its tests were not intermittently wrong, they were
   intermittently too slow, which is the whole of "40 of the 61 failures".
   `waitUntil: 'networkidle'` sat through `warmTerrainTiles` fetching the whole
   158-file, 6 MB tile grid, 76 times over: **2,648 ms against 192 ms** for the
   `data-land="ok"` wait that 51 of those tests made on the next line anyway.

   Against the unmodified tree, same desk, same command: **15 failures in
   4.7 min → 2 in 3.5 min, and that 3.5 covers both projects rather than one.**
   Three openers now say which readiness a test means, six workers no longer
   pull the grid concurrently (`saveData`, the code's own switch), the zoom
   climb bursts instead of settling twenty-five times, and the file takes a
   minute a test because a minute is what its subject costs.

   Two tests still fail here and fail identically at `HEAD`, so they are older
   than any of this: `the map opens on the coarse coastline…` and `the land
   keeps its own ink when a terrain tile never arrives`. Both are about the
   terrain loaders, both pass alone, and the second now fails on its own claim
   rather than the clock — which makes it the better one to look at first.
4. ~~**Type: collapse the scale**~~ — done 2026-09-09. Fourteen steps to nine.
   The loop it was waiting for is now measured: **48 tiles in 80 s**, against
   ~40 s for a single surface through a rebuilt preview before. `tile-diff.mjs`
   is the other half — per-tile differing-pixel counts and a mask showing where,
   so "pixel-identical" stops being something somebody says after looking.
5. **The visual overhaul** — desktop first, section 4 is the brief. The loop:
   `contact-sheet.mjs --still`, `tile-diff.mjs snapshot`, change,
   `--still` again, `tile-diff.mjs compare`. 80 s a pass over 48 tiles.
6. **Comments: rewrite, do not move.** `src` is 34,533 lines at **48% comment**
   and that part is solid. The **68% narrates history** figure is not: it counts
   a whole block as history when any one line in it carries a cue, and at line
   level the same instrument reads **9%**. Measured properly, only **59 lines**
   sit in blocks that are *mostly* history. So there is almost no narrative to
   lift out wholesale, and "move it to a `*.notes.md`" is really "rewrite 866
   comment blocks by judgment", which is a much larger and riskier job than the
   old target of ~23,000 lines at ~23% implied.

   Do it per file, worst first, each file its own commit with a `*.notes.md`
   for what was cut. The mass is concentrated: `views/map/paint.js` (1,302
   comment lines, 58%), `styles/calendar.css` (1,293), `views/index/modes.js`
   (933, 69%), `styles/index.css` (875), `styles/base.css` (755) — five files
   are a third of it. **The three stylesheets go before the overhaul** because
   the overhaul has to read them; the rest goes after, or never.
7. **Carousel: pack lazily.** The All Saints row measures all 862 saints'
   captions (~9,600 canvas calls) in one blocking task before it can paint a
   column. Pack enough for the screen plus the loop's buffer, paint, finish in
   idle time. Worth most of a ~1,200 ms startup task at 10× CPU.

   **It is also the last source of test flake.** With the map's tests fixed,
   `index-carousel.spec.js` was the whole of what remained — flaking on two
   consecutive CI runs while passing 24 of 24 alone, because the drift test's
   4 s budget was being spent on this blocking pack under six workers. The test
   now waits for the row to be packed before it times the drift, so the flake
   is gone, but the wait is a measurement of this defect and should shrink to
   nothing when it is fixed.
8. **The nav strip breaks under an aggressive swipe** — `keepEndless` writes
   `scrollLeft` inside a live gesture. Known defect.
9. **A phone-sized card derivative** — a phone draws a 150 CSS px card from a
   560 px file; the first screenful of All Saints is 579 kB and could be ~189.
10. **The carousel's top margin is 0 and has always been.** `index.css` asked
    for `--space-5`, a step the scale has never had. Written out as `0` on
    2026-09-08 rather than guessed at; decide it with the sheet open.
11. **Colour needs no sweep either, and the shadows need a decision.** There
    are **zero** raw hex colours in a declaration: every `#000` is a
    `mask-image` stop, where only alpha matters and the hue is arbitrary, and
    the two greys this list previously named live in comments. What is genuinely
    untokenised is **seven `rgb(0 0 0 / α)` values**, all shadows or scrims (see
    section 4) — and the question there is which of them should exist at all,
    not what to call them.
