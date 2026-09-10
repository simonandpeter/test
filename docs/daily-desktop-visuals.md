# Daily, desktop — the visual rebuild

**Status**: **built, 2026-09-10.** Every numbered step of §8 as revised by
§10.12 is on `main`; **[§10.20](#1020-sitting-e-what-landed-what-was-measured-what-is-still-the-authors)
is the closing record** — what landed, what was measured and refused, and the
five things still the author's. The document is kept whole rather than trimmed
because the reasoning is what makes any of it reversible.

Written 2026-09-10, reviewed against the source the same day,
then decided. **Read [§10](#10-decisions-taken-2026-09-10) first** — it
overrides everything above it wherever they disagree, and it closes the review's
open questions. The sections before it are the reasoning, not the instruction.
The reference is `../../mockup-scratch/daily-sidebar.html` (outside the repo,
beside it), which renders the finished design in both themes at 1240×820. Open
that file first; every number below is taken from it, and where this document
and the mockup disagree, **the mockup is right**.

The mockup is outside the repository, so it is not backed up by this repo and
`tests/citations.test.mjs` cannot see it — that test walks `src`, `e2e`,
`tests`, `schema`, `scripts` and three loose files, and never `docs/`. **Do not
cite the mockup's path from a source comment**: it would point a future reader
at a file their checkout does not contain, and nothing would catch it. Cite this
document instead.

This is a desktop-only change (`min-width: 1024px`, and `html[data-route='calendar']`
— the route attribute is set before first paint by `index.html`'s inline script,
so scoping to it costs no flash). The phone keeps the week rail, the full-width
chrome bar and the compact register exactly as they are. Nothing here touches
Saints, Saint, Map, Texts or About except through shared tokens, and those
changes are additive.

---

## 0. The shape of it

The page becomes a left reading column and a right **sidebar bubble**: a filled
box, 19rem wide, with a square notch bitten out of each corner and a cross of
the fill colour standing in each bite. The bubble carries the chrome controls at
its head, the month grid, and the readings, hymns and name days beneath.

The left column carries the nav, the date between two half-cross marks, the
liturgy line, the day's saint, and the register.

A new `--accent` takes the gold rule's place under the date: the ground's own
hue shifted away from itself.

*This section read "Gold is retired from everything except the feast mark" and
that is too broad by four call sites.* `var(--gold)` is spent in sixteen places
and only two of them are on this page's desktop: `.mark-feast` (the week rail's
dot, `calendar.css:607`) and `.cal-head:has(+ .cal-liturgy:not(:empty))::after`
(`calendar.css:2353`) — **the gold rule under the date, which is the one this
change actually retires**. The others stay and are not this plan's to touch:
`.feast-chip` and `.fullcal .fc-feast` on Daily; `.coachmark` and
`.random-die` elsewhere; the favicon, which is gold *by instruction* (author,
2026-08-25); and `--gold-ink` on
`nav.site-nav a[aria-current='page'] .nav-label.is-today` (`base.css:857`),
which is gold **as words** by instruction (author, 2026-08-27: "print 'Today'
in gold whenever it is showing") and is pinned by `chrome.spec.js:2033`. The
nav moves into the left column in §2.2; that rule moves with it unchanged.

---

## 1. Tokens (`src/styles/tokens.css`)

**Every value here also goes into `PLAN.md`'s colour table in the same commit.**
`tests/plan.test.mjs` reads that table and asserts every token it names is
declared in `tokens.css` with the same light value. **It does *not* read the
reverse for colour** — the both-directions check exists for type, durations and
easings, not colours, so a token added to `tokens.css` and left out of the table
passes. This plan claimed otherwise. Write both rows anyway: the reason the
table exists is that prose rots, and the test not catching it is an argument for
care rather than against the row.

The table has no vigil column, so the six changed vigil values need no PLAN row.
`tests/contrast.test.mjs` is what holds them, and it reads `tokens.css` directly.

### New

| token | light | vigil | what it is |
| --- | --- | --- | --- |
| `--accent` | `#918770` | `#6e5f5a` | the ground shifted 34.5 in L\* away from itself at its own hue, chroma +5. **2.84:1 on gesso and 2.64:1 on the field; 2.99:1 on bole and 2.84:1 on `--bub`** — measured, not quoted. Rules-and-marks colour; **never text**. |
| `--bub` | `var(--field)` | `#201917` | the sidebar's own surface. In light it is the field; in vigil it is a step below it, so the bubble reads without shouting. |

*The mockup's own comment names the vigil accent `#705e58` and its code sets
`#6e5f5a`.* The code wins, by this document's own rule. The two are 2.98 and
2.99:1 — the difference is not visible and not worth a second look, but the
comment should not be copied across with the value.

### Changed

| token | from | to | why | verified |
| --- | --- | --- | --- | --- |
| `--fast-fish` (light) | `#1f5a6e` | `#016392` | chroma 20.7 → 34 and hue 235° → 260°: it reads as a blue rather than a grey-teal. | **5.23:1 gesso, 4.86:1 field** — clears the 4.5 floor. It is a *drop* from 6.10/5.67, so this token has less headroom after the change than before. |
| `--ink` (vigil) | `#ede6dc` | `#e1dbd3` | vigil sat at 14.71:1 against light's 13.31; matched, then chroma to 82%. | **13.25:1 gesso, 12.43:1 field.** |
| `--ink-soft` (vigil) | `#a89c8f` | `#9b9187` | 6.78 → 5.89, against light's 5.92. | **5.89:1 gesso, 5.53:1 field.** |
| `--rubric` (vigil) | `#cb7769` | `#bc7e74` | luminance held; chroma 38.2 → 31.4. | **5.53:1 gesso, 5.19:1 field** (5.54 → 5.53, which is rounding). |
| `--fast-fish` (vigil) | `#7ab4c9` | `#6390a1` | 7.98 → 5.23, against light's 5.23. | **5.23:1 gesso, 4.91:1 field** — the tightest margin in the set, 0.41 over the floor. |
| `--field` (vigil) | `#231a17` | `#221a18` | chroma 5.4 → 4.3. | grounds every figure above. |

**All twelve compositions clear 4.5:1. `tests/contrast.test.mjs` passes on this
set unchanged** — that was this plan's largest open question and the answer is
that there is nothing to do. Computed with the test's own sRGB luminance
function, not with a colour picker.

`--fast-free` is **not** in the set and is left at `#356038` / `#8fbe8a`, which
is 8.59:1 on bole against light's 5.81 — the one role the vigil rebalance did
not solve back. Either fold it in or say plainly that the rebalance covered the
four roles that were measured and not the fifth; do not leave the section
implying it was all of them.

### The feast mark

Light `#ac7700`, vigil `#a67600`. One hex could not serve both grounds and still
read as gold — that is the same wall `--gold-ink` exists for.

**Measured**: light is **3.11:1 on gesso and 2.89:1 on the field**; vigil is
**4.30:1 on `--bub`**. The mockup's comment claims 6.62:1 for vigil, but that
figure belongs to `#c79a4b`, a hex its code does not use. Correct it or drop it.

**Make these a token pair, not a literal.** This plan said "not a token; a
literal in `calendar.css`", and that contradicts PLAN §3's opening sentence —
"a raw colour, duration, easing, type size or spacing value anywhere else is a
defect" — and walks the wrong way down PLAN's own colour sweep, which counts
**three** raw hexes outside `tokens.css` today and calls closing them "the sweep
worth doing". This change would take three to seven (two feast values, two mount
values in §4.1). Nothing enforces it — `design-tokens.test.mjs` has no colour
check — which is exactly why it needs deciding rather than drifting.

So: `--feast: #ac7700` / `#a67600`, one PLAN row, and `.mark-feast`
(`calendar.css:607`) takes it too — the week rail's dot and the month's cannot
be different golds, and today the rail's is `var(--gold)` at 2.62:1 on the field,
which is *worse* than the value this plan proposes.

---

## 2. The shell (`src/styles/calendar.css`, `src/views/calendar.js`)

### 2.1 Column width

`--day-cols: minmax(0, 1fr) 28rem` → **`minmax(0, 1fr) 19rem`**
(`calendar.css:1063`).

The comment above it (`calendar.css:1043–1047`) explains the 28rem floor in
terms of the week rail: "Seven day buttons, two shoulders and the month toggle
need about 400 px, and at 330 the rail showed six days **and the month grid
would not unfurl at all**."

**Read the second half of that sentence before changing the number.** 19rem is
304 px — *below* the 330 px at which the comment records the month grid failing.
It works in the mockup only because the month there is a different component:
no `.peek-prev` / `.peek-next` columns, `padding: 1px 0`, `gap: 1px`. Measured
in the rendered mockup: 304 px of column, 272 px of grid, 38 px cells.

Two consequences:

- **Rewrite the comment, don't just change the number**, and say what actually
  makes 19rem safe (the peek columns going, and the cell padding).
- **The month redesign (§8 step 6) has to land with or before the narrowing
  (§8 step 3)**, or three commits ship a month grid crushed into 304 px. §8
  claims each step leaves `main` coherent; in the order as written, it does not.

### 2.2 The nav moves into the left column

Today `.chrome-bar` is a sticky full-width header. On Daily at ≥1024 px it
becomes the left column's own head: `padding: var(--space-2) 0`, a `--rule`
bottom border, wordmark at **22px** mixed 74% toward the ground
(`color-mix(in oklab, var(--ink) 74%, var(--gesso))`), links unchanged.

Three things about that sentence, checked:

- **The colour works.** The masthead is an SVG (`ui/wordmark.js`, generated),
  and its one path is `fill="currentColor"`, so a `color` on `.site-name`
  reaches it. The mix computes to `#504a44`, 6.97:1 on gesso and 7.15:1 on bole.
- **The size does not, as written.** The mark is sized in `em` off
  `.site-name`'s `font-size`, which at ≥1024 is `var(--text-mast-wide)` = 34px
  (`base.css:1122`). 22 is not on the scale. A third `--text-mast-*` token
  **fails `tests/plan.test.mjs`** — its reverse check exempts exactly
  `--text-mast` and `--text-mast-wide` by name and nothing else. Either add a
  PLAN type-table row for it, widen that exempt set with a reason, or scope the
  existing token's value inside the Daily media query. Prefer the last: it is
  one declaration and no new name.
- **Scope it to Daily or break a pinned number.** `--chrome-h-reserve: 52.5px`
  (`base.css:1129`) is the wide header's declared height and
  `chrome.spec.js:2658` pins it at 360/900/1440 — **on `/saints`**, so a
  Daily-scoped change never reaches it and a global one goes red at 1440.

**`nav.site-nav` needs no change at all.** This plan said it "gains Texts and
loses Calendar"; both halves are wrong. `main.js:123` is
`NAV_KEYS = ['calendar', 'saints', 'texts', 'map', 'about']` — Texts has been
there since 2026-09-05, and `calendar` is the *key* of the Daily link, whose
label is `STRINGS.nav.calendar`, which reads `'Daily'`. The nav already prints
Daily · Saints · Texts · Map · About, which is exactly the mockup's row.
**Delete §8 step 2's "Texts in, Calendar out"**; what is left of that step is
the wordmark's size and fade. And do not touch the five keys: PLAN §6 settles
"five real links … never cloned, and never reordered in the DOM".

#### The controls — decided

The plan offered (a) re-draw the controls in the sidebar from shared handlers
and (b) move them out of the header wholesale, and preferred (a). **(a) as
written is not workable, and there is a third route that is.**

What (a) runs into, all of it checked:

- **`#church-open`, `#lang-open` and `#theme-toggle` are named by ID in 55
  places across the browser suite** (35 / 13 / 7). A second element with the
  same ID is invalid markup and turns every one of those locators into a strict
  -mode violation. Distinct IDs are possible but are 55 call sites of churn.
- **`initTheme(button)` (`lib/theme.js:56`) closes over one `choice` and one
  button.** Called twice you get two independent states and two `media`
  listeners; a press on one mount leaves the other's label stale. It would have
  to take a list, or publish a subscription.
- **`mountPanelControl(button, panel)` (`ui/panel-control.js`) keeps its own
  `open` flag and flight token per call.** Two mounts pointed at one panel
  fight over it. `mountLanguageControl` also adds a `panel.addEventListener('click')`
  per call, so a language choice would fire twice.
- **Two files hardcode the IDs**: `ui/coachmark.js:89–90` targets
  `'church-open'` / `'lang-open'`, and `ui/panel-control.js:164` decides what
  counts as an *outside* press with the selector
  `'.church-panel, #church-open, #lang-open'` — so a second mount would be
  "outside" and pressing the sidebar's church button while its own panel stood
  open would close it.

**(c) Relocate the live nodes, do not re-draw them.** On entering Daily at
≥1024 px, `views/calendar.js` `appendChild`s the existing `.chrome-calendar`,
`.chrome-corner` and both `.church-panel` elements into the sidebar head, and
puts them back on teardown. They are the same DOM objects, so every listener,
every ID, every piece of `mountPanelControl` state and both coachmark targets
ride along. Nothing forks, nothing is wired twice, and the 55 locators keep
working. `.chrome-bar` keeps the wordmark and the nav and takes
`padding-right: calc(19rem + var(--space-8))` under
`html[data-route='calendar']` at ≥1024, which is how it is constrained to the
left column against the same `--page-max` / `--page-pad` measure the grid uses.

Two things (c) does not solve and this plan must settle before step 4:

1. **Where do the chooser panels open?** They are full-width bands that open in
   the flow under the header, and they fly into and out of their button
   (`ui/fly.js`). Inside the bubble they would be clipped twice over — by
   `clip-path` on `.bev` and by the scroller. Either the bubble's head sits in
   an overflow-visible, unclipped wrapper and the panels open over the page from
   there, or the controls in the sidebar are triggers for panels that still open
   in the left column, which reads as a press in one column answered in the
   other. Decide this, then build it; do not discover it in step 4.
2. **The two heads must be level.** In the mockup the nav rule and the control
   row's rule land on one line because the nav is inside the grid's first
   column. In the app `.chrome-bar` is a sibling of `main.chrome`, above the
   whole grid, so the bubble would start *below* the nav. The honest fix is a
   negative `margin-top` on `.cal-side` of the bar's own height — `--chrome-h`
   is already published from a `ResizeObserver` (`main.js:664`) for exactly this
   kind of arithmetic, and `--chrome-h-reserve` is the pre-paint value to size
   from so nothing grows into place. This is the fiddliest geometry in the
   change and it is worth its own commit.

One thing that makes all of this cheaper than it looks: **on Daily the sticky
bar is already inert.** The route sets `data-fills-window`, the page gives up
its scroll and the two columns keep their own, so there is nothing for the bar
to stick to. And `chrome.spec.js:1689`'s `position: sticky` assertion runs at
900 px on `/saints` — below this change's breakpoint and on another route. It
does not break, and this plan was wrong to expect it to.

### 2.3 The date and its two marks

The `‹ Yesterday` / `Tomorrow ›` buttons lose their words. In their place, one
mark either side of the date, each **half a cross**:

- a 1px stem in `--accent` running the height of the block, diamond-capped top
  and bottom (5px, rotated 45°);
- one 1px arm reaching out from the middle — left on the back button, right on
  the forward one — with a diamond at its tip;
- no background, no border. The box is 24px wide and is only a hit area.

Geometry that matters: the stem sits at a **whole-pixel offset from the box's own
left edge** (`--ox: 14px` back, `10px` forward) and the boxes land on a 4px grid.
At 125% and 150% display scaling a 1px line placed at `50%` lands on a different
subpixel phase in each button and one reads visibly heavier — this was measured,
not guessed.

The marks span from the nav rule to the rule under the date, with 5px clearance
at each end, driven by `--headgap: 8px` and `--rulegap: 8px` so the three move
together.

***In the mockup they do not move together, and the port must fix that.***
`--headgap` and `--rulegap` are declared on `.arw` itself, while `.nav`'s
`margin-bottom` and `.rule`'s `margin` read them from an ancestor that never
sets them and fall through to their literal `8px` fallbacks. Hoist both onto
`.cal` (under the route, inside the breakpoint) and the sentence becomes true.

`calendar.js:226` and `:228` already give both buttons `aria-label` from
`STRINGS.calendar.prevDay` / `nextDay` (the `<nav class="day-step">` opens at
225), so nothing is lost for a screen reader by dropping the text — but **add
`title`** so pointer users keep the words.

The `.cal-head` rule this replaces is `calendar.css:1104`, and its comment
explains `align-items: baseline` — "so the words sit on the heading's own line
however the h1's clamp resolves". The marks are stretched rather than aligned to
a baseline, so that comment goes with the words it describes.

### 2.4 The two rules

Both the nav's bottom border and the rule under the date are `--rule`. The gold
rule — `.cal-head:has(+ .cal-liturgy:not(:empty))::after`, `calendar.css:2353` —
is gone. Its `:has()` guard exists so the rule never draws over an empty liturgy
line; whatever replaces it needs the same guard or a day with no liturgy line
grows a stray rule. Spacing: 8px above the date block, 8px below it.

The wrapper `.cal-head` was introduced *for* that gold rule (`calendar.js:216`'s
comment says so, in as many words). With the rule gone the comment is history
and the wrapper now exists for the flex row; rewrite it rather than leaving a
justification for something that is no longer there.

### 2.5 The date carries the weekday

"Wednesday, 9 September". `lib/date-display.js` composes the date in the reader's
language; add the weekday there, not in the view. `tests/date-display.test.mjs`
is the unit test that will need the new case, and it is where the five languages
get checked without a browser.

The cycle line never names the weekday (it names the *week*), so nothing is
duplicated — the weekday appears in the fast's `reason`, which the chip carries.

### 2.6 The liturgy line

`calendar.js:889` currently composes **four** pieces, not three:
`[fastHtml, occasionHtml, feastHtml, cycle · tone]`. The fast chip moves last.
Its text is unchanged — `calendar.fastModal.grades`, e.g. "Oil, Wine and Fish
Allowed" — and it keeps taking its colour from the **grade**, not the kind.

**Where `occasionHtml` and `feastHtml` go is not settled.** The mockup's day has
neither, so it cannot answer. The order it does show is cycle · tone · fast; the
plausible reading is `[occasion, feast, cycle · tone, fast]`, but that is an
inference and the line is one of the busiest on the page in Russian and Greek.
Shoot a day that carries all four on the contact sheet before choosing.

---

## 3. The sidebar bubble

### 3.1 The box

```css
.day-side-bubble {
  --n: 20px;                      /* the bite */
  background: var(--bub);
  padding: var(--space-4);
  clip-path: polygon(var(--n) 0, calc(100% - var(--n)) 0,
    calc(100% - var(--n)) var(--n), 100% var(--n),
    100% calc(100% - var(--n)), calc(100% - var(--n)) calc(100% - var(--n)),
    calc(100% - var(--n)) 100%, var(--n) 100%,
    var(--n) calc(100% - var(--n)), 0 calc(100% - var(--n)),
    0 var(--n), var(--n) var(--n));
}
```

Four crosses, one per bite, drawn in `--bub` on the page ground: 20×20 boxes at
the corners, bars 3px thick, inset 2px. They are the box's own substance turned
inside out.

**The column still scrolls itself.** `.cal-side` already carries
`overflow-y: auto` with the bar hidden (`calendar.css:1078–1097`, author
2026-09-01: "Remove the scroll bar from the Daily page columns"). The bubble is
the scroller's backdrop, so its corners must not scroll away: the clipped,
cross-bearing wrapper has to be a *new* box and the scrolling has to move inside
it. `.cal-side` keeps `min-height: 0` or the grid item's content floor puts the
scroll back on the page.

**In vigil the whole device nearly disappears.** `--bub` `#201917` against gesso
`#1a1412` is a 1.09:1 step; the notch and its four crosses are all but invisible
in the rendered mockup. That is the design as drawn and it may be the intent —
but it means the bubble's shape is a light-theme finding only, and the sheet
should be read in both themes before the corner work is called done.

### 3.2 The control row at its head

A three-cell grid, `1fr auto 1fr`, `padding-inline: 26px`: language at the start,
**the church control centred by the grid** (so the pair at the end can never pull
it off centre), theme switch at the end. Bottom padding **13px** so its rule
lands on the nav rule — verify by measurement, not by eye; the wordmark's size
decides it.

The theme control is a pill: 31×17 with a `--rule` hairline, track `--gesso`
(the page ground, so it reads as a hole cut in the bubble), knob 11px in
`--ink-soft`, left for day and right for vigil. It is sized to the language
control's **text run** (30.8×17.0), not to its box — the box is a grid cell and
stretches.

**The mockup's `transition: left 180ms ease` on the knob fails two tests.**
`design-tokens.test.mjs` rejects a raw easing *and* a sub-second raw duration in
a component sheet. Use `var(--dur-answer)` (140ms — this is a control
acknowledging a press) and `var(--ease)`. And the knob is a `left` transition,
which is not composited; `translateX` is the same movement for free.

Note that the *existing* theme toggle is a sun/moon icon button with a real
`aria-label` written by `lib/theme.js:64`. A pill with a knob still needs that
label, and if the pill is not a `<button>` it needs `role="switch"` and
`aria-checked` — the icon button carried its state in its glyph and its label;
the pill carries it in a position, which is nothing to a screen reader.

### 3.3 The month, in place of the week rail

At ≥1024px the picker opens as the **month grid**; the week rail is the phone's.

`picker.js` really does draw both — `paintMonth`, `paintMonthInto`,
`growMonthBody`, `moveMonth`, and `toggleMonth` at `picker.js:677` cross-fading
between them. `state.monthOpen` starts `false` (`calendar.js:93`), so this is a
change of default and not a new component, as the plan says.

`calendar.css:1067–1071` — not 1063 — is what puts the month in the grid's first
row: `grid-template-rows: auto minmax(0, 1fr)` with a comment that says exactly
why ("the month grows row 1, row 2 shrinks under it, and a box spanning the pair
keeps its top"). PLAN.md says nothing about the rail being the desktop default,
so this is not re-opening a settled decision.

**This is the largest test cost in the change and the plan understated it by an
order of magnitude.** Every spec runs in both projects (`desktop` 1280 and
`mobile-360`). `e2e/daily-picker.spec.js` is 43 tests; it presses `[data-month]`
**25** times and names `.week-strip` **39** times, and a rail that is not showing
reports zero geometry and cannot be clicked (trap 7, and `picker.js:260–270`
says so in its own comment). Flipping the default inverts the meaning of every
one of those presses on the desktop half of the run. Budget a real rewrite of
that spec, not an edit; it is plausibly the single biggest piece of work here.
Trap 12 applies to anything that presses the month steps in a loop.

Additions to the month cell:

- **The feast mark**, which the month has never had: a 5px diamond by
  `clip-path` (never a rotated square — a rotated 5px square measures 7.07px
  corner to corner and would push its row; this is `.mark-feast`'s own reasoning
  at `calendar.css:608–611`), in the cell's top-right corner, from the same
  `dayRecordFor(iso, church)?.hymns?.length` the rail uses. Take `--feast` from
  §1, and change `.mark-feast` to it in the same commit so the two grains say
  one thing — `picker.js`'s own comment on the fast tone gives the rule: "the
  two grains cannot say different things about one day."
- **The days either side of the month**, numbered and marked, tinted 38% toward
  the field with `color-mix` — a tint, never an opacity.

  **This replaces `.peek-prev` / `.peek-next`**, which the plan never mentions
  and which are the reason the month needed 400 px. Today `paintMonthInto`
  paints the previous month's Sundays and the next month's Mondays as
  `.peek-cell` spans in two columns *outside* the seven-column grid, under
  `aria-hidden="true"`. Deleting them is what buys 19rem; say so.

  **And the tint is a real accessibility risk, measured.** On the light field
  the out-days land at **2.43:1** (ink), **1.85:1** (rubric, i.e. a fast day)
  and **1.71:1** (fish); in vigil, 2.60 / 1.75 / 1.71. These are visible
  numerals. `npm run test:lighthouse` gates CI on accessibility 100 and axe runs
  every route in both themes; axe's contrast rule fires on text. The peek cells
  escape it today only because they are `aria-hidden`. So: **keep the out-cells
  `aria-hidden="true"` and non-interactive** (the mockup draws them as `<b>`,
  not `<button>`, which is half of it), or lift the tint until they clear 4.5:1.
  Choosing the first is defensible — they are not this month — but it is a
  choice and it has to be made deliberately, not inherited from the mockup.
- Cells lose their padding (`padding: 1px 0`, `gap: 1px`), which takes about
  40px off six rows.

The month's head: a hairline in `--accent` closed by a diamond on each side,
running out to within 9px of the month's words; the month name; the reckoning in
brackets — **(Julian)**, **(R. Julian)** or **(Gregorian)**, from the church's
own `default_calendar` in `data/churches.js`; and a fullscreen control to the
right of it. `align-items: center`, **not baseline** — an inline-flex box takes
the baseline of its first item, and the two steppers have different first items,
which put their hairlines on different subpixels.

The `[data-month]` toggle has no place left on the desktop head. Decide whether
it is hidden past 1024 px or removed from the desktop markup, and what then
happens to `toggleMonth`, `revealSelected` and the rail's drag/flick machinery
on that width — a control nothing can reach is dead weight, and a rail nothing
can see still runs its scroll bookkeeping.

*Two comments name a `--dur-month` that `tokens.css` does not define —
`picker.js:39` ("Matches --dur-month in tokens.css") and `calendar.css:273`.
Both are prose, not a `var()`, so no test sees them. The cross-fade actually
runs on `DUR.travel`. Fix them in passing; this is precisely CLAUDE.md's rule
about a mechanism nobody measured.*

### 3.4 Sections

Readings, Hymns, Name days keep their content and order. Their headings become
**serif** (`--font-serif`, 17px = `--text-lg`, full `--ink`, over a `--rule`
border), and "Also today" becomes 19px = `--text-lede`.

This is a **deliberate departure from `main`**: `base.css:1134–1144` sets
`.register-heading` in the utility face, all-small-caps, tracked, at
`--ink-soft` and `--text-base`. The author chose the serif after seeing both.
`.register-heading` is used by Daily, Saint and All Saints, so change the rule in
`base.css` only if the same change is wanted on all three; otherwise scope it to
Daily and leave a comment saying which decision this is.

---

## 4. The day's saint

### 4.1 The picture

- **A fixed 3:2 on the desk.** The reference here was wrong in a way that
  matters: `.hero-media` is *already* `aspect-ratio: 3 / 2` at
  `calendar.css:1761`, and has been since 2026-08-26; that is the base rule and
  it is what a phone gets. What the desk gets is the override at
  `calendar.css:1834`, inside `@media (min-width: 620px)`:
  `aspect-ratio: var(--hero-shape, 1 / 1)`, written per saint by
  `daily/panel.js:412` from `heroCrop`. So the edit is **deleting the 620px
  override**, not porting a ratio up from the phone.

  **This contradicts PLAN and deletes a tested author instruction. Say so out
  loud before doing it.** PLAN §4: "**The card box is derived, not fixed** — the
  manifest carries each image's aspect ratio and the card takes it." The rule
  behind it is the author's, 2026-09-01: "don't crop the main saint image on
  Daily page unless it exceeds an aspect ratio of 1:1.6, that's the maximum
  height … widest would be 2:1", and it is executed three times over —
  `tests/hero-crop.test.mjs` (`MAX_HERO_RATIO`, `MIN_HERO_RATIO`, and `focus`
  pinned to `'50% 0'` and `'50% 50%'`), `daily-panel.spec.js:96` ("the hero
  image is shown whole up to 1:1.6 on desktop, and a 3:2 band on a phone"),
  and `daily-panel.spec.js:3334`. **PLAN is binding.** Either the author
  reverses it and PLAN §4 changes in the same commit, or the hero keeps its
  derived box and the mockup's 3:2 is read as one saint's shape rather than as
  a rule. Do not land this on the strength of a mockup.

- `object-position: 50% 34%` for the reference icon. Per-saint this is
  **`heroCrop` in `src/lib/hero-crop.js`**, published as `--hero-focus` by
  `daily/panel.js:396–412`. *There is no `heroFocus` in `daily/panel.js`* — the
  only occurrence of that name anywhere is a stale comment at
  `calendar.css:1763`, which this plan copied. Fix the comment while you are in
  the file. Changing the focus rule from "top for a tall icon, centre for a wide
  one" to "put the faces on the upper third" is a change to
  `tests/hero-crop.test.mjs`'s two pinned focus strings, which are an author
  instruction quoted verbatim — same caveat as above.
- **A mount, not an outline.** No border anywhere on a picture. The frame is a
  14px mat the photo stands inside; the register's mats are 6px.
- **The mount takes the other theme's surface**: `#201917` on the gesso page,
  `#908877` on the bole. The pale version was tried and is too bright — it
  became the lightest thing on the dark page. **Tokenise these too** (`--mount`,
  light `#201917` / vigil `#908877`) — the light value is literally vigil's
  `--bub`, so a literal here would be the same colour written twice under two
  names. Same PLAN §3 argument as the feast mark.
- Column: 340px, and the mat fills it. (An earlier draft had a 340px mat in a
  360px column, which put 44px between picture and text where the design says
  24.) 340px is a raw width and is fine — PLAN's spacing section is explicit
  that `width` is not what the scale governs.

### 4.2 The text beside it

Lifted 8px so the saint's cap-height sits just under the mount's top edge —
optical, not geometric alignment. The name's ink sits ~14px below its own box
(6.75 of half-leading at 27/40.5, plus Literata's ascender-to-cap gap); 8 is the
value that looked right, not 14.

If the name snaps from 27 to `--text-2xl` (26 — see §7), that arithmetic moves
by half a pixel and the 8 does not need rederiving; it was chosen by eye anyway.

`Continue reading ›` loses its chevron for a 5px diamond. It is the last chevron
on the page — on *this* page: the register's own controls and the picker keep
theirs.

---

## 5. The register

### 5.1 Compact (the default)

- Two columns, mats up from 34×44 to **48×62 inside a 60px mat** (6px padding).

  **48:62 is a fixed 3:4, and the register's thumb is derived today**:
  `aspect-ratio: var(--reg-aspect, 1)` at `calendar.css:2146`, held to the
  hero's own two limits by author instruction (2026-09-02: "apply the same
  aspect ratio limitations to crop any saint card display") and pinned by
  `daily-register.spec.js:318`. Same decision as §4.1 and it should be taken
  once, for both.

- **The mockup puts the picture at the *leading* edge, and PLAN §4 says it goes
  at the trailing one**: "**A row reads name-first**, with its picture at the
  trailing end — a 48 px thumbnail has no corner to spare, so the row's bookmark
  goes at the trailing edge rather than over the image." PLAN is binding. Either
  that paragraph is scoped to the row faces it was written for and this new
  two-column compact shape is outside it, or the mockup is reversing a settled
  decision. **Get this answered before step 8.**

- **A type glyph where there is no icon.** Keyed off `types`, which is on 853 of
  862 saints; six marks cover most of the vocabulary — martyr (cross),
  hieromartyr (cross on a bar), venerable (schema cross on steps), hierarch
  (mitre), presbyter (chalice), prince (crown) — drawn in `--rule` at 30px so a
  real icon always wins the row. Martyr alone is 307 of the type counts, so
  repetition is expected and is not a defect: a cross reads as a category mark,
  not as a picture that failed to load.

  `--rule` is **1.41:1 on the light field and 1.33:1 on `--bub`**, and in the
  rendered mockup the glyphs are close to invisible. If the glyph is decorative
  that is the right weight; if it is a *finding* — "we know what kind of saint
  this is, and we have no picture" — then PLAN §2's second sentence applies and
  it needs to be legible. `--ink-soft` at 5.5:1 is the other end of that choice.
  Decide which it is; do not leave it at "a real icon always wins", which is an
  argument about hierarchy and not about whether the mark can be seen.

- **One line of life**, clamped to two lines, under the existing subtext. The
  register says who else is commemorated; this makes it say who they were.

  Note `daily-register.spec.js:159` sorts the register "tallest picture first,
  imageless last". A fixed mat makes the first half of that sort meaningless;
  the test will need to say what the order now is.

### 5.2 Expanded

A second face, reached by a control beside "Also today": **the day's card
repeated** — 340px mount at 3:2 in the same mat colour, name at 21px, dates, the
full lede, its own "Continue reading". Imageless entries show the type glyph at
56px in a 240px-tall mount.

**The mockup shows two states and this plan describes three, and they cannot
both be right.** `state.registerView` today is `'cards' | 'list'`, initialised
at `calendar.js:100` from `store.getSettings().registerLayout` (default
`'cards'`, `lib/settings.js:73`), written at `calendar.js:264–266`, and *read*
at `panel.js:451` — the plan's "panel.js:451 already keeps a registerView state"
has the line right and the ownership backwards; `panel.js` only reads it. The
control it draws (`panel.js:452–461`) is **two word-buttons**, "Cards" and
"List", each carrying `aria-pressed`. The mockup's toggle has exactly two marks,
compact and expanded, and no list. So either:

- this is a **third** mode, the control grows a third mark, and `settings.js`
  gains a third legal value; or
- expanded **replaces** list, which drops a face the author asked for and which
  `daily-register.spec.js:221` pins ("Also commemorated opens as cards in
  columns, and remembers a reader who wants a list").

The mockup answers "two", this plan answers "three", and this document's own
rule says the mockup wins. That rule was written for pixel values, not for
deleting a reader's remembered choice. **Ask.**

### 5.3 The control

One object, two states, replacing the current pair of word-buttons:

- **compact** — four 5px diamonds standing in the shape of a larger one, in a
  13px box;
- **expanded** — that larger diamond whole, 11px;
- whichever is live is `--accent`, the other `--rule`.

*The plan said this replaces "the four-corner 'expand' icon (which was identical
to the calendar's fullscreen icon)". There is no such icon on the register* —
the four-corner mark is the fullscreen **calendar** control (`[data-fullcal]`),
which the mockup keeps in the month head. What is being replaced is the
Cards/List pair.

**The words go, so the labels have to arrive.** Two unlabelled marks at
`--accent` 2.84:1 and `--rule` 1.41:1, distinguished by shape and colour alone,
is the case PLAN and `picker.js` both write about — "a dot is nothing to a
screen reader and a hue is nothing to a reader who cannot separate these two".
Keep `role="group"`, keep `aria-pressed` per state, and give each mark the word
it lost as its accessible name (`STRINGS.calendar.viewCards` / `viewList` are
the existing precedent; two new keys go in all five packs, then
`node scripts/locale-coverage.mjs` to 0 fallbacks).

---

## 6. Spacing

| where | value |
| --- | --- |
| nav padding | `var(--space-2)` top and bottom |
| nav rule → date | 8px (`--headgap`, hoisted to `.cal` — see §2.3) |
| date → its rule | 8px (`--rulegap`, likewise) |
| rule → liturgy line | `var(--space-2)` |
| liturgy → hero | `var(--space-6)` |
| hero → "Also today" | `var(--space-6)` |
| heading → cards | `var(--space-3)` |

Nothing enforces spacing and PLAN says explicitly that a sweep would be wrong,
so the mockup's raw values are not defects. Still, three of them are a step off
a token and a reader cannot tell: `padding-inline: 26px` on the control row
(`--space-6` is 24), `gap: 9px` on the view toggle (`--space-2` is 8), and the
month head's 9px shoulder. Snap those; keep the ones that are derived from the
design rather than chosen — the 14px and 6px mats, the 13px head padding that
lands the rule, and every `--ox`.

---

## 7. Tests, and what will break

Run the surface, then the suite. `npm test` first (it is ~2 s), then
`daily-panel`, `daily-picker`, `daily-register`, then `chrome.spec.js` because
the header changes, then the full run before pushing. `COLD_FACE=1` on anything
that measures text.

What each test actually demands, checked rather than guessed:

- **`tests/contrast.test.mjs`** — **passes unchanged.** It holds `ink`,
  `ink-soft`, `rubric`, `gold-ink` and the three `fast-*` to **4.5:1** against
  `--gesso` and `--field` in both themes, and it holds nothing else. There is no
  3:1 graphic floor anywhere in this repo, and `--gold` is *explicitly* exempt
  with its reasoning written out ("never text and never carries information
  alone"). So neither `--accent` at 2.84/2.99 nor the feast dot at 2.89 on the
  light field is blocked by anything. **That means the decision is editorial and
  has to be made rather than discovered.** The honest reading: `--accent` fits
  the `--gold` exemption exactly — it is a rule and a border and never a word.
  The feast dot does not: it is the *only* thing saying a day carries a feast,
  which is the "carries information alone" case the exemption excludes. 3.11:1
  on gesso is fine; 2.89:1 on the field, where it actually sits, is not. Either
  darken it until it clears 3:1 on `--bub` in light, or record the exception in
  `tokens.css` beside `--gold`'s, in the same voice, with the number in it.
  The same question applies to `.mgrid b.on`'s `--accent` border, which is the
  only mark separating the selected day from an ordinary fast day.
- **`tests/design-tokens.test.mjs`** — every `font-size` in a component sheet
  must contain `var(--text-…)`. The scale is **nine steps: 9, 12, 13, 15, 17,
  19, 21, 26, `clamp(28px, 5vw, 40px)`**, plus `--text-mast` and
  `--text-mast-wide` (34). The mockup uses **11, 12, 13, 14, 15, 17, 19, 21, 22,
  27, 38**. Six are already on the scale. The five that are not:

  | mockup | where | do this |
  | --- | --- | --- |
  | 38 | the date | `--text-3xl` is `clamp(28px, 5vw, 40px)`, which resolves to **40** at any width past 800px — not 38. Take the 40; two pixels on an h1 is not a decision. |
  | 27 | the hero name | snap to `--text-2xl` (26). |
  | 22 | the wordmark | see §2.2 — scope `--text-mast-wide` inside the Daily query rather than adding a third mast token. |
  | 14 | month numerals, hymn text, name days | **13 or 15, never 14.** PLAN records 14 and 16 being folded into 15 on 2026-09-09, deliberately, with the sheet open. Reintroducing 14 reopens a settled decision. |
  | 11 | weekday initials, `(R. Julian)` | snap to `--text-2xs` (12). |

  Also: the theme knob's `180ms ease` fails the raw-easing *and* raw-duration
  checks (§3.2), and every custom property a sheet reads must be one something
  defines — so `--accent`, `--bub`, `--feast`, `--mount`, `--n`, `--ox`,
  `--headgap`, `--rulegap` all need a declaration or a `var(--x, fallback)`.
- **`tests/plan.test.mjs`** — the colour table gains `--accent`, `--bub` and
  whatever §1 tokenises, with their **light** values; the check is one-way for
  colour (see §1). The type table's reverse check is *not* one-way: any new
  `--text-*` in `tokens.css` that is not a row and is not literally
  `--text-mast` / `--text-mast-wide` fails. The shadow inventory compares the
  table against every `box-shadow` with an `rgb(0 0 0 / …)` in the sheets — this
  change adds none, and must not: PLAN §4's rule is that a shadow says "above
  the page" and a card is in it.
- **`e2e/daily-picker.spec.js`** — the big one. 43 tests, both projects, 25
  `[data-month]` presses and 39 `.week-strip` references. See §3.3.
- **`e2e/daily-panel.spec.js`** — 79 tests. The hero shape is pinned at :96 and
  :3334, and the fixed 3:2 breaks both by design (§4.1).
- **`e2e/daily-register.spec.js`** — 7 tests. :159 (the sort), :221 (cards/list
  is remembered), :318 (the register crops to the hero's limits) are all in the
  path of §5.
- **`e2e/chrome.spec.js`** — the sticky assertion at :1689 and the reserve table
  at :2658 both load `/saints`, so a Daily-scoped change leaves them alone. What
  *does* need watching there: :292 (the controls keep their places at both
  widths), :525 and :638 (the coachmarks point at the two controls), :2033 (the
  Daily label wears `--gold-ink`), :2342 (the panels travel with the bar).
- **`e2e/daily-picker.spec.js:1712`** — the full-screen calendar hangs from
  `.chrome-bar`'s own bottom edge and shares `main.chrome > #view`'s left and
  right margins, asserted to within 3px, on Daily at ≥1024. **A bar constrained
  to the left column moves both of those numbers.** This is the assertion the
  chrome change actually breaks, and this plan named the wrong one.
- **`tests/citations.test.mjs`** — if a source file names this document the
  reference must resolve; it does. The test does not read `docs/`, so nothing
  checks this file's own references — see the note at the top about the mockup's
  path.
- **`tests/plan.test.mjs`'s slug check** — the mockup hard-codes four saint
  slugs in `ICON()`. Obvious, and it would fail loudly, but worth not pasting.
- **`npm run test:lighthouse`** gates CI on accessibility 100 and FCP under
  1500 ms (currently 1356–1376, so there is ~130 ms of headroom). The out-month
  tint (§3.3) and the unlabelled view control (§5.3) are the two things here
  that axe can see.

**Every fix gets a test, backed out and confirmed to fail before it is believed.**
A shape assertion that would pass against the old layout is not a test of this
change.

---

## 8. Order of work

Each step is a commit that leaves `main` coherent, so a stop between any two is
safe. Reordered from the draft, because the draft's order did not hold that
promise.

1. **Tokens and rules.** `--accent`, `--bub`, `--feast`, `--mount`, the six
   changed values, PLAN.md's table. Both rules to `--rule`, the gold rule out
   (keeping its `:has()` guard). `.mark-feast` onto `--feast` in the same
   commit. No layout change yet — the tiles should differ only in colour.
2. **The wordmark.** Size scoped inside the Daily query, the 74% fade. (The nav
   itself needs nothing: Texts is already there and `calendar` *is* Daily.)
3. **The month, redesigned in place** — peek columns out, cells tightened,
   feast mark in, out-days in, the reckoning label, the stepper marks, the
   fullscreen control. Still at 28rem, still opened by the toggle. This is the
   step that makes 19rem possible, so it comes before it.
4. **The month as the desktop default**, and the `daily-picker` spec rewritten
   with it. Expect this to be the longest step.
5. **Column width and the bubble.** 19rem, the notch, the four crosses, the
   scroller moved inside the clipped wrapper.
6. **The controls into the bubble's head.** Route (c) in §2.2 — relocate the
   live nodes; and settle where the chooser panels open *before* starting.
7. **The date block.** Weekday in the date, the two half-cross marks, the
   spacing variables hoisted, `title` attributes.
8. **The hero** — only if §4.1's contradiction with PLAN has been answered.
9. **The register.** Mats, glyphs, the line of life, the serif headings, the
   view control, the expanded face — only after §5.1's leading/trailing and
   §5.2's two-or-three questions are answered.
10. **The sweep.** `node scripts/contact-sheet.mjs` at 1280 and 1440, both
    themes, all five languages — this is the step that finds what four invented
    saints could not: a day with twenty saints, a day with no icon, and Russian
    or Greek text where "15th week after Pentecost" runs much longer. Snapshot
    with `tile-diff.mjs` before step 1 so every step after it has a baseline.

---

## 9. What this plan does not settle

- **The sidebar's foot.** On a light day about 300px of empty field sits below
  Name days, because the bubble is sized to the grid row. Visible in the
  rendered mockup. Either it hugs its content or the space earns its keep. Not
  decided.
- **The imageless expanded entry.** A 240px mount holding one 56px glyph is a
  lot of empty mount, and most days are mostly imageless — the vigil frame of
  the mockup shows exactly how much.
- **The corpus.** 130 icons across 862 saints is the real constraint behind half
  the decisions here. The durable fix is an `icon-candidates.mjs` in the family
  of `place-candidates.mjs` — propose, never write.
- **Whether the bubble reads at all in vigil** (§3.1).
- **The three PLAN contradictions in §4.1, §5.1 and §5.2**, which are the
  author's to resolve and not the executing agent's.

---

## Reviewer's notes

Read before starting. Everything here is either a decision this plan cannot
take by itself or a thing that will bite in the middle of a step.

**Three things contradict `PLAN.md`, which is binding. Do not build them on the
strength of the mockup.**

1. **The hero's fixed 3:2** (§4.1) against PLAN §4's "the card box is derived,
   not fixed", an author instruction of 2026-09-01, and three tests.
2. **The register mat's fixed 3:4** (§5.1) against the same rule and
   `daily-register.spec.js:318`.
3. **The picture at the leading edge of a register row** (§5.1) against PLAN
   §4's "a row reads name-first, with its picture at the trailing end".

A fourth, softer: **the expanded face may be replacing the List face** (§5.2), a
reader's remembered choice pinned by `daily-register.spec.js:221`.

**Decisions the executing agent must make, with the facts already gathered:**

- **The feast dot's 2.89:1 on the light field.** No test blocks it. `--gold`'s
  exemption in `contrast.test.mjs` does not cover it, because the dot is the
  sole carrier of "there is a feast here". Lift it or record the exception with
  its number, in `tokens.css`, beside the one that already exists.
- **The out-of-month tint** at 1.71–2.60:1 on visible numerals (§3.3). Keep them
  `aria-hidden` as the peek cells are today, or lift the tint. Lighthouse
  accessibility 100 gates CI.
- **Where the chooser panels open** once their buttons are in a clipped,
  scrolling bubble (§2.2). Settle it before step 6, not during it.
- **Whether the type glyph is decoration or a finding** (§5.1). `--rule` is
  1.41:1 and in the render it nearly vanishes.
- **Where `occasionHtml` and `feastHtml` go in the liturgy line** (§2.6). The
  mockup's day carries neither, so it cannot answer.

**Watch for:**

- **Duplicate IDs.** 55 e2e locators name `#church-open`, `#lang-open` and
  `#theme-toggle`. Relocating the nodes (route c) keeps all of them; re-drawing
  them (route a) breaks all of them.
- **`initTheme` is not re-entrant** (`lib/theme.js:56`) and neither is
  `mountPanelControl`. Neither can be called twice without a refactor.
- **`daily-picker.spec.js` is the schedule risk**, not the CSS. 43 tests, 25
  `[data-month]` presses, both projects.
- **`daily-picker.spec.js:1712`** is the geometry assertion the chrome change
  breaks, at ≥1024 on Daily. `chrome.spec.js:1689` and `:2658` are not — both
  run on `/saints`.
- **Reintroducing a 14px step** would reopen the type collapse of 2026-09-09.
- **Raw hexes**: this change wants four (two feast, two mount) where PLAN counts
  three in the whole codebase and calls closing them the sweep worth doing.
- **The comment rewrite rides inside this** (PLAN §7 item 1). `calendar.css` is
  3,139 lines and this change opens most of it; a comment-only edit must come
  back pixel-identical under `tile-diff.mjs`.
- Six comments this review found already stale and worth fixing in passing:
  `calendar.css:1763` (`heroFocus`, which does not exist), `picker.js:39` and
  `calendar.css:273` (`--dur-month`, which `tokens.css` does not define),
  `calendar.js:216` and `calendar.css:1043` (both justify things this change
  removes), and the mockup's own `#705e58` / 6.62:1 figures.

**Scope.** This is not one sitting. Steps 1–3 are a sitting; step 4 alone is
probably another; steps 5–7 are the geometry and are a third. Steps 8 and 9 are
blocked on the author. Push at every numbered step — `bash scripts/push.sh`,
and read the run *and* its `flaky` line — rather than at the end.

---

## 10. Decisions taken, 2026-09-10

Written after the review, before any code. **These override §§0–9 wherever they
disagree**, and they are what the executing agents build. The reasoning is here
so a later reader can reverse any one of them on its own merits.

Three of the review's "blocked on the author" items turned out not to need the
author, because **the mockup is compatible with PLAN once you read the rule
rather than the render.**

### 10.1 The hero keeps its derived box

`calendar.css:1834`'s `aspect-ratio: var(--hero-shape, 1 / 1)` **stays**, and so
does `hero-crop.js`, its two pinned focus strings, and
`daily-panel.spec.js:96` / `:3334`. Nothing in §4.1's first two bullets is built.

The reference saint renders at 3:2 — 1.5 wide, which sits *inside* the author's
own limits ("maximum height 1:1.6, widest 2:1", 2026-09-01). So the mockup was
never showing a fixed ratio; it was showing one saint whose derived box happens
to be 3:2. The visible change on the hero is **the mount**, not the shape.

`object-position: 50% 34%` likewise: that was a hand-crop of one reference
image. `heroCrop` keeps deciding focus. Do not touch `tests/hero-crop.test.mjs`.

### 10.2 The register mat keeps its derived box

Same argument. `--reg-aspect` at `calendar.css:2146` stays; 48×62 is 1.29 tall,
inside the same clamp. Fix the mat's **width** at 60px (48 + 6px padding either
side), let the height derive within the clamp, and let the row's height be the
tallest in it. `daily-register.spec.js:318` and `:159` both stay green, and the
sort keeps meaning something.

### 10.3 The register row keeps its picture at the trailing edge

PLAN §4 wins here, and its reason is load-bearing: the bookmark has nowhere to
go over a 48px thumbnail, so it takes the trailing edge — move the picture there
and the two collide. The mockup's leading-edge mat is **not built**. This is the
one place the shipped page will visibly differ from the render, and it is
deliberate. If the author wants it reversed, the bookmark's position has to move
in the same commit and PLAN §4 changes with it.

### 10.4 The register grows a third face, it does not lose one

`registerView` becomes `'cards' | 'expanded' | 'list'`; `settings.js` gains the
third legal value; the control in §5.3 carries **three** marks, not two —
compact, expanded, list — each with `aria-pressed` and the word it stands for as
its accessible name. `daily-register.spec.js:221` stays green and the reader's
remembered choice survives.

The mockup shows two marks because it was showing two faces at once, one per
theme frame. It was never an argument for deleting List.

### 10.5 The feast mark is lifted to clear 3:1

`--gold`'s exemption in `contrast.test.mjs` is for a mark that "never carries
information alone", and this dot is the *only* thing saying a day holds a feast.
So it takes the graphic floor even though no test asks for it.

Darken the light value at constant hue until it clears **3.05:1 on both
`--gesso` and `--field`** (`#ac7700` is 3.11 and 2.89 — it is the field that
fails). Compute with `contrast.test.mjs`'s own sRGB luminance function, not a
picker, and put the two numbers in the token's comment. The vigil value
(`#a67600`, 4.30:1 on `--bub`) is already clear.

Add the same floor to `contrast.test.mjs` as a real assertion, backed out and
watched to fail first.

### 10.6 Out-of-month cells stay `aria-hidden`

They follow the peek cells' existing precedent: faded, `aria-hidden`, not
focusable, not clickable. The tint then carries no information and its
1.71–2.60:1 is not a finding to a reader or to axe. Lighthouse stays at 100.

**Corrected while building it, 2026-09-10: the second half of that is false,
and the tint did not ship.** `aria-hidden` does not put text beyond axe —
axe's colour-contrast rule matches on `isVisibleOnScreen`, not on whether a
screen reader can reach the node. The five tinted numerals raised **128
violations across four `quality-floor` runs at 1.71–2.61:1**, in both themes,
and `npm run test:lighthouse` gates CI on accessibility 100 besides, where a
spec-level exclusion could not have reached anyway.

The peek cells escape axe on merit and not on `aria-hidden`: they are
`--ink-soft` at full strength with a *mask* over the outer half, and
`calendar.css` says why in as many words — "text a sighted reader might try to
read has to clear 4.5:1 wherever it is legible at all", written when a flat 50%
wash was tried there and the quality floor caught it.

So the out-days ship with the rest of §10.6 intact — `aria-hidden`, spans not
buttons, unreachable — and **`--ink-soft` in place of the 38% tint**, which is
5.92:1 on gesso and 5.53:1 on the field. They carry **no fast tone and no feast
mark**, which the peeked columns they replace never carried either, and that
absence is what tells the two months apart now that luminance cannot: **a
coloured numeral is this month's**. `e2e/daily-picker.spec.js` asserts the
4.5:1 by name, so the next reach for a tint here is stopped by a sentence
rather than by an axe dump.

The mockup's tinted out-days are therefore not built, and §3.3's second bullet
is superseded by this paragraph.

### 10.7 Four tokens, no raw hexes

`--accent`, `--bub`, `--feast`, `--mount`, all light+vigil, all in `tokens.css`,
all with a PLAN colour row carrying the light value. The count of raw hexes
outside `tokens.css` stays at three. `--mount`'s light value and `--bub`'s vigil
value are the same colour, so `--mount` light is written as `var(--bub)`'s hex
with a comment saying why they match rather than as a second literal.

### 10.8 Type sizes

40 for the date (`--text-3xl` resolves there past 800px), 26 for the hero name
(`--text-2xl`), 12 for weekday initials and `(R. Julian)` (`--text-2xs`), **13**
for month numerals and **15** for hymn text and name days. No 14 anywhere — that
step was folded into 15 on 2026-09-09 with the sheet open. The wordmark's 22 is
`--text-mast-wide` scoped inside the Daily query; no third mast token.

The theme knob's `180ms ease` becomes existing duration and easing tokens.

### 10.9 The chooser panels

The bubble does **not** get `overflow: hidden`. Only the inner month-and-sections
wrapper scrolls; the control row sits in the head, above it. The panels open
downward from their buttons exactly as they do now and are allowed to overrun
the bubble's bottom edge, at a `z-index` above it. The corner notches are the
only clipping, and no panel opens in a corner.

Verify with a screenshot of each panel open at 1280 and 1440 before calling
step 6 done. If a panel is clipped anyway, the fallback is to position it
against the button's viewport rect rather than its offset parent — not to move
the buttons back.

### 10.10 The type glyph is decoration backed by words

Keep it at `--rule`, as the mockup has it, and mark it `aria-hidden`. Its
1.41:1 is then not a legibility failure because it is not the carrier: make sure
the entry's accessible text names the saint's type in words, and add it if it
does not. If the 1x contact sheet shows the glyphs vanishing rather than reading
as a quiet mark, step them to
`color-mix(in oklab, var(--ink-soft) 45%, var(--field))` and no further.

### 10.11 Left alone

The liturgy line keeps `calendar.js:889`'s four-piece composition unchanged —
restyled, not recomposed; `occasionHtml` and `feastHtml` stay where they are.
The bubble stretches to its grid row rather than hugging its content; a short
sidebar beside a long column reads as a mistake. `--fast-free` is not in the
vigil rebalance: it covered the four roles that were measured, and this is the
fifth, said plainly rather than implied away.

### 10.12 Order, revised

Ten steps as in §8, with 8 and 9 no longer blocked and 1–3 unchanged. Split
across sittings so no agent runs out of room mid-step:

| sitting | steps | |
| --- | --- | --- |
| A | 1 tokens · 2 wordmark · 3 the month redesigned in place | done |
| B | 4 the month as the desktop default, and its spec | already built (§10.13) |
| C | 5 width and bubble · 6 controls (route c) · 7 the date block | done |
| D | 8 the hero mount (§10.1 shrinks this to the mat) · 9 the register (§§10.2–10.4) | done |
| E | §2.2's chrome bar · the contact sheet's themes · 10 the sweep | done, §10.20 |

Push at every numbered step — `bash scripts/push.sh` — and read the run **and**
its `flaky` line before moving on.

### 10.13 Ruled during sitting A

- **The fullscreen control becomes an icon in the month head.** At 19rem the head
  will not hold "Open Fullscreen" as words, and the author drew it as a
  four-corner icon there twice on 2026-09-10 ("Add a make fullscreen icon button
  to the left of the Month Name", then "Put the make full screen button to the
  right of the month and Reckoning"), which is later than the 2026-09-02
  instruction naming it. **The words survive as its accessible name and its
  `title`** — `daily-picker.spec.js:1686` moves from asserting visible text to
  asserting the accessible name, and says in the assertion why.
- **Step 4 is already built** and comes out of the order. The month has been the
  desktop default since 2026-09-02: `.cal-jump` and `.cal-week` are
  `display: none` at ≥1024 and `wireGrainForWidth` (`calendar.js:506`) forces the
  grid open. §3.3's "change of default" framing is wrong; nearly every month test
  calls `phone(page)`, so only the five desktop tests at `daily-picker.spec.js`
  1663, 1795, 1851, 1907 and 2000 sit in this change's path.
- **§10.6 was decided on a false premise and sitting A corrected it in place.**
  `aria-hidden` does not put text beyond axe — its contrast rule matches on
  `isVisibleOnScreen`, and the 38% tint raised 128 violations across four
  `quality-floor` runs. Out-days ship at `--ink-soft`, with no fast tone and no
  feast mark: the peeks' own treatment, and still a fade against `--ink`.
- **`contact-sheet.mjs` renders the vigil tile in day colours on `/calendar`.**
  Found, not investigated. Sitting E cannot check dark mode through the sheet
  until this is fixed, and dark mode is half of this design — so fixing it is
  part of sitting E, before the sweep rather than after it.
- **Three failures on this desk are not this work's**, confirmed against a
  stashed tree: `index-grid.spec.js:1533` under `COLD_FACE=1`,
  `map.spec.js:3580` (6/6 alone in 13.6 s — a budget under parallel load), and
  Lighthouse FCP at 1519–1853 ms locally where CI's own run passes. Do not chase
  them inside a sitting; they are a separate errand.

### 10.14 Ruled during sitting C

- **The bubble goes *after* `.cal-main` in the document, not before it.** Column
  two is one run of markup either way — that is what lets the picker live inside
  the bubble — and the only question is which side of the day's saint it lands
  on. Below the breakpoint every one of the bubble's wrappers is
  `display: contents`, so `order` decides what a sighted reader sees and the
  document decides what assistive technology hears; ahead of `.cal-main` the
  readings, hymns and name days would be announced before the day they belong
  to, on the phone, which is this page's primary surface. What it costs is the
  month button's place in the tab order — a control rather than content. The six
  `order` values are unchanged and were measured to still yield picker, date,
  liturgy, saint, readings, shelf.
- **The fullscreen control became a mark in step 5, not step 3.** §10.13 ruled
  it, and the narrowing is what forced it: at 19 rem the head is 272 px, the
  words took about a hundred of them, and the two steppers either side collapsed
  to zero width — `daily-picker.spec.js`'s "the desktop month steps from the two
  marks in its own head" failed on `.mstep-next` being unclickable, which is how
  this was found rather than argued.
- **`.cal-controls`'s desktop `--cal-peek`, `--cal-gutter`, `--rail-inset` and
  `gap` are gone.** All four fed boxes the desktop does not draw: the peeked
  columns went in step 3, the rail and its toggle on 2026-09-02, and
  `.month-name` is `position: static` here.
- **A window narrow enough to cut the hero's first paragraph is 1060 px now,
  not 1100.** The 144 px the right column gave up went to the left one, and
  `daily-panel.spec.js`'s fading-tail test lost its premise silently. The
  premise is asserted in words there now.
- **The Saint page's grid follows Daily to 19 rem.** `saint.css` said the 28 was
  "what the Daily page's week rail needs, and this column would have been happy
  with less", and told whoever moved either one to look at the other rather than
  drag it. Looked at: the rail went on 2026-09-02, so the number this was
  matching no longer exists, and the 2026-09-01 instruction is one instruction
  and not two — the life takes Daily's left column *and* the search takes "where
  the right column would be on Daily Page". `saint.spec.js:1087` measures the
  two pages against each other on purpose ("a hard-coded 929 px would pass on
  the day it was written and say nothing afterwards") and it is the assertion
  that found this. Rendered at 1440 with the results column full before it was
  kept: a long name wraps to a second line and nothing else changes.

### 10.15 Ruled during step 6

- **The two chooser panels do not move, and that is what settles §10.9.** Past
  1024 px `.church-panel` is already `position: fixed` (base.css, author
  2026-09-02: on a desktop the panel floats over the page rather than pushing it
  down), so where it sits in the document decides nothing about where it draws —
  and leaving both in `.chrome-bar` keeps them outside the bubble's `clip-path`
  by construction rather than by argument. Only the number they hang from moves:
  `--cal-head-b`, the head's own foot in viewport coordinates, published from a
  `ResizeObserver` the way `--chrome-h` is and for the same reason. Screenshot
  at 1280 and 1440, each panel: it opens flush under the head, right-aligned to
  the bubble's edge, unclipped, over the bubble. Route (c)'s "and both panels"
  is therefore not built and does not need to be.
- **Only the three buttons are relocated, not `.chrome-calendar` and
  `.chrome-corner`.** The head is a `1fr auto 1fr` grid and the language control
  and the theme switch have to be in different cells; they are siblings inside
  the corner. Same nodes, same listeners, and the corner's own order is restored
  on the way back — asserted by pinning a `data-` attribute on each while it
  stands in the head and reading it in the bar.
- **The theme switch is 54 px by the head row's own height, not §3.2's 31×17.**
  That pill was sized to a mockup where the control beside it was a stretched
  grid cell; here it stands beside a 29 px button and the author asked for the
  language control's size. The height is `align-self: stretch`, so it tracks;
  the width is measured (52–56 px across five packs and two faces) and the test
  says which of the two is derived and which is not. `.icon-button`'s explicit
  `32px` height had to be undone for the stretch to take, which the equality
  found.
- **`daily-picker.spec.js:1712` did not break, and was not rewritten.** §7
  expected it to, on the reading that the controls moving would constrain
  `.chrome-bar` to the left column. It does not: the header keeps
  `--chrome-h-reserve` as its `min-height`, so losing three controls moves
  neither the bar's box nor `--chrome-h`, and the full-screen calendar still
  hangs from the same edge and shares the same margins. Constraining the bar and
  levelling the two heads is §2.2's second open question — one geometry, one
  commit — and it is still open.
- **What did break was `chrome.spec.js`'s four-route header comparison**:
  `.chrome-corner` is an empty box on Daily now and collapses to a point, so the
  assertion moved from its whole rect to its right edge, which is the header's
  own content edge and the number that line always stood for.
- **A resize across the breakpoint hides the three for at most one frame.** The
  head is `display: none` below 1024 by stylesheet, and the nodes go back on a
  `matchMedia` listener a task later. Found by a test that polled the head's
  visibility and read the controls still parented to it; the test polls the move
  instead. It is a resize, not a reading state, and it is recorded rather than
  fixed.

### 10.16 Ruled during step 7

- **§2.5 is already built, and it names the wrong file.** The Daily heading has
  carried the weekday since before this plan — `headingFmt` and
  `reckonedHeading` in `views/daily/format.js` ask `Intl` for
  `weekday: 'long'`, and the reckoned heading replaces the weekday field alone
  so that a Wednesday stays a Wednesday in every reckoning. `lib/date-display.js`
  is the *corpus's* recorded dates and has nothing to do with the page's own
  heading. Nothing was added and nothing needs a new unit case. What the mockup
  drops is the **year**, not the weekday, and dropping it was not asked for.
- **Both rules were already `--rule`** — step 1 did it, `:has()` guard intact —
  and the date is already `--text-3xl`, which resolves to 40 past 800 px. There
  is no 14 anywhere in `calendar.css`.
- **`--headgap` and `--rulegap` are hoisted to the route, not to `.cal`.** §2.3
  says `.cal`, and `.cal` cannot reach the box the first gap actually lives in:
  the nav here is the site's bar, outside the grid, so "nav rule → date" is
  `main.chrome`'s own top padding and `.cal` is *inside* that. The route element
  is the one ancestor both are under.
- **`--rulegap` is 4 px, not §6's 8.** The author asked for that gap closer on
  2026-08-26 ("make the gold line on daily page ... closer to the date not so
  far down"), which took it from 8 to 4, and `daily-panel.spec.js` has pinned it
  at 4 since. The mockup's 8 is measured from a heading with its own leading and
  is not the same distance. An instruction in words beats a number read off a
  redraw. The marks' clearance is written as `calc(5px - var(--gap))` at both
  ends, so it stays 5 px whatever either gap becomes.
- **`.chrome h1` beats `.cal-date`.** base.css sets this heading's
  `margin-bottom` with one more selector than a bare class, so `margin: 0` on
  `.cal-date` lost and the row grew 8 px nobody declared — the marks' clearance
  was right and the rule sat 8 px low. `.cal-head > .cal-date` fixes it.
- **The `<nav class="day-step">` wrapper is gone.** A landmark named "Week"
  holding two marks says less than two buttons that name themselves, and the two
  buttons have to be direct children of `.cal-head` for the grid to put one
  either side of the date.

### 10.17 The gate that went red, and what it found

**Step 6's CI run failed the Lighthouse floor** — three routes at 1505–1524 ms
of FCP against 1500, where step 5 had measured 1357–1374. Accessibility was 100
throughout. A re-run on the identical sha put `saint detail` back at 1356 and
left the other three at ~1510, which is the tell: **+150 ms is exactly the run's
own round-trip time**, and the bundle had been sitting on a congestion-window
boundary where a 490-byte diff decides which side it lands on.

**The cause is not step 6 and it is worth more than this rebuild.** An HTML
comment inside a template literal is *string content*, so it is the one kind of
comment in this codebase the minifier cannot take: **33 of them, 23.5 kB raw and
9.8 kB gzipped inside a 100 kB bundle**, a tenth of the JavaScript every first
paint on every route waits for, none of it for the reader. `vite.config.js`
strips them at transform time — in dev as well as in build, so dev and preview
stay the same document — and the main chunk goes from **100.43 kB to 90.82 kB
gzipped**. `tests/ship-no-prose.test.mjs` holds the plugin to that and to
nothing else, and also holds every markup comment in the source to living inside
`src/views/`, which is what makes the plugin's scope safe.

**Measured, and what could not be measured.** The bundle figures are measured.
Whether they buy CI's round trip back is not: this desk's own Lighthouse run is
1670–1996 ms with the plugin and 1670–1996 without it, identical to the noise —
the local FCP is CPU-bound and the instrument cannot resolve a 9.6 kB transfer
change. CI arbitrates.

**And the headroom is the standing finding.** 1357 of 1500 is 9%, and a runner
150 ms slower than the last one spends all of it. Sitting E should read the
figure as a range rather than a number, and PLAN item 7's blocking caption pack
is the one real saving still on the table.

### 10.18 The CSS that every route waits for

**§10.17's diagnosis was wrong and the correction is worth more than it was.**
Taking 9.8 kB of prose out of the JavaScript did not move CI at all: the script
is deferred and was never on the first-paint path. The path is the *stylesheet*,
and `main.js` concatenates nine of them into one render-blocking sheet that
every route waits for.

Measured, on this desk and on CI, and the numbers agree:

| entry stylesheet | CI FCP | this desk |
| --- | --- | --- |
| 73.89 kB (step 5) | 1357–1374 | 1535–1796 |
| 75.14 kB (step 6) | 1505–1524 | — |
| 75.89 kB (step 7) | 1507–1526 | 1686–1993 |
| 75.89 kB, `map.css` emptied | — | 1534–1841 |
| 67.53 kB (`map.css` split out) | — | 1604–1916 |

The step is one 150 ms round trip and it lands between 73.9 and 75.1 kB. Three
things were ruled out by measurement rather than by argument: **it is not the
runner** — step 5's own run, re-run on 2026-09-10 on a fresh runner, measured
1357–1374 again; **it is not the JavaScript** — 9.6 kB out of the bundle moved
nothing; and **it is not the transfer encoding** — the preview serves the sheet
uncompressed where GitHub Pages sends 14.5 kB gzipped (verified with `curl -I`
against the live site), and making the preview compress moved nothing either.
That last one is still a true statement about the instrument and is left here
for whoever tightens the floor: **the gate measures a 75 kB download that no
reader performs.**

**`map.css` now loads with the map**, dynamically, which is the arrangement the
map's own coastline data has had since it shipped. The entry sheet drops to
67.53 kB — below where it was before this sitting — and the map's 8.4 kB
arrives as its own chunk beside the boot.

**`index.css` is 71 kB and `saint.css` 27 kB, and both are still in the entry.**
Splitting them the same way is the standing saving, and it is larger than
anything else on this page's list. Sitting E should take it before the sweep,
because the floor has ~9% of headroom and every step of this rebuild spends
some of it.

### 10.19 Read before step 8, found before the pause

Sitting D read the whole path and was stopped before it edited anything. These
are conclusions from reading, not measurements, and each is worth checking as
you build on it — but each was arrived at against the source.

- **A flat 340px hero column breaks the author's half-window rule.**
  `daily-panel.spec.js:3780` holds `.hero-media` height ÷ `window.innerHeight`
  to ≤ 0.51 at five window sizes. At 340 with a 14px mat the picture is 312
  wide, so a 1:1.6 icon draws 499 — 71% of a 700px window. The shape that keeps
  both: `clamp(200px, calc(var(--card-h) / var(--hero-r, 1) + 28px), 340px)`.
  340 replaces the old `42%` / `30rem` ceiling and the `--card-h` term survives
  as the cap. Checked arithmetically against all five sizes.
- **Three hero tests need editing and two are not `:96` / `:3334`.** "the hero
  image fills its column" asserts `.hero-media` width equals the grid track
  (becomes track − 28) and picture height equals card height (becomes
  card − 28); "the card ends where the picture does" asserts a gap under 4
  (becomes ~28). `fitLede`'s budget should become `figure.bottom − body.top`,
  which is unchanged below 1024 and correct above it.
- **`daily-register.spec.js:221` cannot stay green unedited** — it asserts
  `pictureAbove` and `pictureWidth > 100` for the cards face, and §10.3's
  trailing 60px mat contradicts both. Its *columns* claim survives if the
  compact grid is `repeat(auto-fill, minmax(340px, 1fr))`: two columns at 1280
  and 1440, one at 1024, which is what "fewer columns in a narrower window"
  needs. A fixed `1fr 1fr` fails it. **§10.4 said this test stays green
  untouched; that was wrong** — what it protects is the remembered *choice*,
  and that part does stand.
- **Keep `.reg-thumb` as the outer element**, put the picture in a new inner
  `.reg-pic`. `:41` and `:221` both `querySelector('.reg-thumb')` on entries
  that may be imageless, so renaming the blank span breaks them. `:318` then
  measures the mat rather than the picture, and still catches what it was
  written for.
- **`font-size: 0` cannot hide the chevron** — `design-tokens.test.mjs:81`
  rejects any `font-size` without a `--text-` token. Move the `›` out of
  `panel.js` into an `::after { content }` so the Daily scope can swap it.
- **§10.10 is not a no-op.** Only `office` — 337 of 862 — puts a type in the
  visible subtext, so imageless entries whose subtext lacks the word need an
  `sr-only` span.
- **One new string key, not two.** Compact and list keep `viewCards` and
  `viewList`; only `viewExpanded` is new across the five packs.
- **Lighthouse runs mobile at 360**, so a desktop-gated per-entry life fetch
  costs the FCP gate nothing. The added entry-stylesheet bytes are the only
  exposure, against ~6.4 kB of room below §10.18's 73.9 kB step.
- The stale `heroFocus` comment has moved to **`calendar.css:2249`**; the doc's
  `:1763` is out of date. The name is `heroCrop`.

**The next edit** is the step-8 hero block: a new `min-width: 1024px` /
`html[data-route='calendar']` section carrying `--hero-mat: 14px`, the `--mount`
mat on `.hero-figure`, the clamped column above, `margin-top: -8px` on
`.hero-body`, `--text-2xl` on `.hero-name`.

### 10.20 Sitting E: what landed, what was measured, what is still the author's

**The plan is done.** Every numbered step of §8 as revised by §10.12 is built
and on `main`. What follows is the sitting's own record, and the last part of
it is the list nobody after this should have to rediscover.

#### The chrome bar into the left column (§2.2's last open piece)

Past 1024 px on Daily the bar's *box* is the left column's — the same
`--page-max` / `--page-pad` measure the grid uses, with the sidebar and the
gutter taken off the right — so its rule stops where the column does; and the
sidebar rises into the band the bar leaves so its own head's rule lands on that
line. Measured level at **52.5 px in all five packs at 1280 and 1440 in a
forced wide face**.

Three things worth keeping:

- **§2.2's proposed mechanism does not work.** A negative `margin-top` on the
  bubble is cut off: `main.chrome` is `overflow: hidden` at this width
  (base.css, `data-fills-window`). `main` takes the whole glass instead, up
  under the bar by `--chrome-h-reserve`, and `.cal-main` pays the offset back
  as a top margin — so the date and everything under it do not move, which the
  test states as a number because it is the whole claim.
- **The two halves had to land together.** A bubble raised under a bar still
  spanning the page puts a sticky `z-index: 20` box over three live controls.
  Geometry cannot see that, so the test asks `elementFromPoint` what is on top
  of the church control.
- **`daily-picker.spec.js:1712` did not break this time either.** The bar's
  *bottom* and `main.chrome > #view`'s left and right margins are all
  unchanged; only the bar's own left and right edges moved, and the full-screen
  calendar hangs off none of them. §7 named this line twice and it has now
  survived both changes it was expected to fail.
- **What did break was the four-route header comparison**, deliberately, and it
  now asserts Daily's difference as a derivation rather than excusing it: the
  row ends at its own column's right edge, and the distance back to where the
  other three end is exactly the sidebar and the gutter. A bar that merely lost
  336 px would pass a constant and fail that.

#### The contact sheet was never shooting dark mode (§10.13)

Not `/calendar`'s bug, which is where sitting A saw it: **every** vigil tile of
every contact sheet, on every route, at every width, for as long as the tool
has existed. The seed wrote `theme: 'vigil'` — the design's word, not a value
`localStorage` may hold — so index.html's first-paint script read "this reader
has never pressed the toggle" and followed the machine's own preference, which
is light in a headless browser. `scratchpad/nav-shots.mjs` carried the same
literal.

`lib/settings.js` now owns the translation (`THEMES`), `scripts/shoot-settings.mjs`
owns the seeding, and there are two guards because a value check alone would
not have caught it: a unit test that runs index.html's own script text against
the *opposite* system preference — the old seed draws correctly on a machine
that happens to agree — and a per-tile check in the sheet that the class on
`<html>` is the theme the row claims.

#### The sweep

`node scripts/contact-sheet.mjs` at 1280 and 1440, both themes, all five packs,
against days chosen from the corpus rather than invented: **22 September**
(36 saints, 3 icons), **26 August** (15 saints, no icon anywhere on the page),
**21 September** (the Nativity of the Theotokos — a fast chip, a feast chip and
the cycle on one line), and **20 August** (no record at all).

**One defect, fixed:** the month's selected day was invisible inside the
bubble. `background: var(--field)` against a `--bub` fill that *is* `--field`
measured **1.00:1** on the rendered page, leaving a `--rule` hairline at 1.31:1
on a numeral already wearing the fast's colour. §7 asked this exact question of
this exact mark. It is the mockup's own `border-color: var(--accent)` and no
background now — 2.64:1 / ΔL* 31.8 in day, 2.84:1 / ΔL* 32.1 in vigil — and
§10.15's `--gesso` answer was measured and refused rather than copied: a gesso
fill is 1.08:1 and ΔL* 2.8 here, fainter than the hairline it would replace.

**§10.10 is settled: the fallback is not taken.** The glyphs are `--rule` on
`--field`, which is **1.31:1 and ΔL* 9.7 in day against 1.32:1 and ΔL* 10.3 in
vigil** — the two themes within half a step of each other, and vigil the
marginally *stronger* of the pair. Read at 1x in both they are a quiet mark
rather than an absence, which is sitting D's judgement confirmed by a number
instead of a second eye. The vigil crop *looks* fainter; that is the surround,
not the mark, and it is written down here so the next reader does not overturn
a measurement by squinting at it.

**Sound, and recorded rather than changed:** the head holds level in all five
packs at both widths under a forced Verdana, with the month's two steppers at
18–41 px (Russian and Serbian the narrowest, non-zero and clickable — §10.14's
failure was zero); both chooser panels open flush under the head, right-aligned
to the bubble's edge, unclipped and over it, in both themes at both widths; the
theme switch is 54 px against the language control's 55–56 in every pack, with
the knob left in day and right in vigil; all three register faces draw what
they should and no glyph has leaked into the list face; and the Saint page at
19 rem wraps a long result name to two lines and changes nothing else.

#### The first-paint gate: measured, and not spent

The entry stylesheet is **72.38 kB** with this sitting's three commits in it,
against §10.18's known-green 73.89 and known-red 75.14 — and step 1's own CI
run went green at 72.26, so the headroom is confirmed rather than inferred. The
sweep's fixes cost 119 bytes. **The room was not needed and the split was not
taken.**

The saving is measured, so the next sitting does not have to: taking
`index.css` and `saint.css` out of the entry the way `map.css` went takes it
from **72.38 kB to 54.31 kB** (13.93 → 10.74 kB gzipped). That is the largest
single saving on this page's list and it is worth taking when something needs
it.

**But it is not the same change `map.css` was, and that is why it is still
here.** A dynamic `import()` from the view starts the fetch at boot and blocks
nothing, which costs the map nothing because the map is a canvas with almost no
styled content before its data lands. All Saints and a saint's page are text
and pictures from the first frame, so the same arrangement lets the site's two
busiest routes paint before their own stylesheet arrives. The safe form is to
export the promise from the view and have the router await it before mounting —
no flash, and the sheet is still off the first paint of the other four routes —
and that is a change to the boot path rather than a line in a stylesheet. It
wants its own sitting and its own measurement of what the wait costs when the
reader lands on `/saints` cold.

#### Still open, and the author's

- **The sidebar's foot (§9), still undecided and now measured.** At 1280×900
  the bubble ends **235 px** below the last of Name days, Readings and Hymns on
  an ordinary light day (5 September), **661 px** below the month on a day with
  no record at all (20 August), and scrolls with no foot on a crowded one.
  §10.11 settled that the bubble stretches to its grid row; whether that space
  earns its keep is the half that was never answered, and it is an editorial
  question rather than a defect.
- **The imageless expanded entry (§9), drawn as the mockup draws it.** A
  340×240 `--mount` slab holding one small glyph, and on 26 August that is
  fifteen of them down a light page. The mockup's own `.bimg.gly` is that
  slab, so this ships as drawn rather than being redesigned in a sweep — but
  the same "no picture" state is quiet in the compact face (a `--field` mat)
  and loud in this one, and the inconsistency is the thing to look at if it is
  reopened.
- **The nav's place in the bar.** The mockup's `.nav` is a flex row with the
  wordmark pushing everything else to the column's right edge; the app's header
  is a five-track grid shared by every route, where the nav sits next to the
  masthead and the slack falls between it and the (now empty) corner. Nothing
  is wrong with it and nothing about it is Daily's alone, so it was not touched
  — but it is the one place the shipped head visibly differs from the render.
- **The weekday names are `Intl`'s `short`, not the mockup's initials**, and
  deliberately: single letters are an English convenience that does not survive
  Пн/Пт or Δευ/Δεv. Not a divergence to close.
- **The liturgy line's order is §10.11's**, fast chip first, where the mockup
  puts it last. Recorded because it reads as an oversight and is not one.

### 10.21 Reversed and added by the author, 2026-09-10 (after §10.20)

Three instructions arrived after the plan was closed. They override §§0–10.20
where they disagree.

- **One masthead size everywhere.** §2.2, §10.8 and §7's type table all called
  for 22 px on Daily, scoped as `html[data-route='calendar'] { --text-mast-wide:
  22px }` — read off the mockup, argued from the page's new shape, and built in
  sitting A. The author reversed it in words: "Match the Daily page's site title
  to its size on every other route… one size everywhere." The scoping is gone
  and the token is 34 px on all six routes.
  **What survives of §2.2 is the ink**, which was a second decision and was not
  reversed: Daily's masthead is still 74% of the way from the ground to the ink.
  `chrome.spec.js`'s four-route header comparison asserts the mark's whole rect
  again, where §10.15 had narrowed it to the left edge to allow the difference.
- **The wordmark is AGIOS.** The mockup's own `.nav b` is `Agios` in
  `--disp` — `'GFS Nicefore'`, the same `--font-display` this site already
  ships and preloads nowhere, at `src/fonts/gfs-nicefore.woff2`. So the
  conversion is the one this repo already does:
  `scripts/make_wordmark.py` draws the glyphs to paths from that file, and only
  its `WORDS` changed. **`Agios` and `AGIOS` are the same five outlines** — the
  face is a titling one and its lowercase codepoints map to the capital glyphs,
  `a` and `A` sharing a glyph and an advance — so the mockup's mixed case and
  the author's caps are not a choice to make.
  **The accessible name stays "Daily Dox"** (author: "Keep the SVG's accessible
  name"), which is what the PWA manifest, `README.md`, `docs/APP.md`, the export
  format and Amendment 31's `<title>` split all still say. `LABEL` in the
  generator is separate from `WORDS` and says why.
  **Measured, because an outlined mark can be large**: the SVG is 2,628 bytes
  against the two-word one's 3,378, so five glyphs cost **750 bytes less** than
  eight. `vite.config.js` inlines it into both of index.html's slots, so the
  served HTML drops 1,500. None of it touches the entry stylesheet, which is
  where §10.18's first-paint step actually is.
- **The sidebar stands off the ceiling.** §2.2's levelling put the bubble at
  `top: 0`, in the band the bar leaves. It now has `--bub-inset: var(--space-4)`
  — the same 16 px `main.chrome` already pays at the foot — and the fill gives
  up exactly that much of its own top padding, so the head's band and the rule
  at its foot do not move. **The levelling is an identity rather than a
  coincidence**: inset + (`--space-4` − inset) + (`--chrome-h-reserve` −
  `--space-4`) is `--chrome-h-reserve` whatever the inset is, and
  `chrome.spec.js` asserts the margin and the level line in one test because
  either can be satisfied by breaking the other.

**Proved by shooting, not by reading the CSS**, which is what the instruction
asked for: the mark's rect is `32, 14.45, 103.23, 30.59` on all six routes at
1280 and at 1440 in both themes — 24 readings, one rect. The drawn pixels are
identical on four of the six; `/map` and `/about` differ by 441 and 338
subpixels of 39,936, all of them on the curves of the final **S**, where the
mark's fractional right edge (103.23 px, 206.46 device px at 2×) falls inside
the last column. It is rasterisation and not position: a shift would light up
every stem, and the mask lights one glyph.

### 10.22 The first-paint cliff, measured to the byte — and §10.18 corrected

`22dd125` went red on the Lighthouse floor: FCP 1506/1506/1507/1526 ms
against 1500, accessibility 100 throughout, deploy skipped. The cause was not
the outlined wordmark, which is **750 bytes smaller** than the mark it
replaced and took index.html from 15.94 kB to 14.44. It was the entry
stylesheet, at **73,688 bytes where the commit before it was 73,629 and
green**.

**Fifty-nine bytes, and the proof is a control rather than an argument.** The
three declarations that differ between the red and the green build are all
inside `@media (min-width: 1024px)`, and `scripts/lighthouse-floor.mjs`
measures mobile at 360 px — so none of them can reach the paint being timed.
So the green tree was rebuilt with **57 bytes of CSS added that match no
element on any page**, and Daily's FCP moved **1610 ms to 1757** on this desk,
twice. The step is the size and nothing else.

**§10.18's "between 73.9 and 75.1 kB" is therefore not where the step is, and
was never wrong when it was written.** The threshold is a fact about the whole
first-paint download — HTML, entry sheet, preloaded faces together — and that
sum has moved twice since: `map.css` came out of the entry, and this sitting's
wordmark took 1.5 kB out of the HTML. A number of this kind is only ever true
of the build it was measured on, which is the argument for re-measuring it
with the 57-byte method rather than nudging it to fit a run.

**The bytes came off where they were spent.** The cross-fade's fifteen
`@property` registrations and its one `html.theme-anim` rule are 1.42 kB that
no reader needs until they press the toggle; they are `src/styles/theme-fade.css`
now, imported dynamically by `lib/theme.js`. It is the `map.css` arrangement,
and it is safe here for a reason the map's is not: registering a custom
property late is a style recalculation and no repaint, because every value
involved is the one already on the page. The only cost of losing the race is
a toggle pressed in the first few hundred milliseconds crossing at once
instead of over 300 ms. **The entry sheet is 72.28 kB** — below the 72.38 this
sitting started from, so the fade and the wordmark together now cost the first
paint less than nothing.

**And the gate says it early now.** `ENTRY_CSS_CEILING` in
`scripts/lighthouse-floor.mjs` is 73,000 bytes — ~600 below the cliff — and
the size is printed on every run, passing or failing, beside the FCP numbers.
A run that goes red on FCP alone says "somewhere, something"; this one names
the file and the number, and it fires before the four routes do. Backed out to
72,000 and watched to print `**OVER**` and exit 1.

§10.20's index.css/saint.css split (72.28 → 54.31 kB) is still unspent, and
still needs the router to await the view's sheet rather than a bare dynamic
import.
