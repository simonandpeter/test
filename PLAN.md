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
`dist/`. The corpus is 862 saints as of 2026-09-08, each a folder of its own.

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
duration, easing, type size or spacing value anywhere else is a defect. A raw
**width** is not — a column measure is a one-off and a token would be a name
for one use — but it is a defect for one to go *unwritten*: section 4's two
tables are the inventory of every named measure and every breakpoint, and
`tests/plan.test.mjs` reads them against the sheets in both directions
(author, 2026-09-12, reversing the blanket exemption this paragraph carried). That
rule is executable for three of the five: `tests/design-tokens.test.mjs` fails
on a raw easing, a sub-second raw duration or a raw `font-size` in a component
sheet. Spacing and colour turned out to need no sweep at all — both figures that said
otherwise were miscounts, and the sections below give the numbers. A
test is the reason this
section is worth writing: the old DESIGN.md said "200 ms standard, one easing"
for three weeks while the code grew to 17 durations and 7 easings, because a
document cannot stop a value being typed.

### The name

**The site is AGIOS**, one name in every language and on every surface
(author, 2026-09-12). It is a *mark*: the same five outlines whatever the
reader's pack, drawn to paths rather than set as text, so it is never
translated and never re-typed.

It is nonetheless written down in **fourteen places**, which is why this table
exists. The site carried three different names at once until 2026-09-12 - the
page said "Daily Dox", the browser tab said "The Orthodox Saint", and four
packs translated both - and nothing connected them, so each rename reached
some of them. **Change the name here and in all fourteen, in one commit.**

| # | where | what it sets |
| --- | --- | --- |
| 1 | `scripts/make_wordmark.py` `WORDS` | the drawn glyphs - **the only one a reader sees** |
| 2 | `scripts/make_wordmark.py` `LABEL` | the SVG's accessible name |
| 3 | `src/ui/strings.js` `site.name` | nothing; kept so the packs share a key set |
| 4 | `src/ui/locales/{el,ro,ru,sr}.js` `site.name` | nothing; same value in all four |
| 5 | `src/ui/strings.js` `site.tabName` | `document.title`, once the app boots |
| 6 | `src/ui/locales/*` `site.tabName` | the same, per pack |
| 7 | `index.html` `<title>` | the tab before any JavaScript runs, and the crawler |
| 8 | `public/site.webmanifest` `name` / `short_name` | the installed PWA |
| 9 | `capacitor.config.json` `appName` | the native app's display name |
| 10 | `capacitor.config.json` `appId` | **`com.agios.app`** - see below |
| 11 | `android/app/build.gradle` | `namespace` and `applicationId` |
| 12 | `android/app/src/main/res/values/strings.xml` | `app_name`, `title_activity_main`, and the URL scheme |
| 13 | `ios/.../project.pbxproj` + `Info.plist` | `PRODUCT_BUNDLE_IDENTIFIER`, `CFBundleDisplayName` |
| 14 | `src/lib/store.js` | the export's rejection message (the file format carries no brand) |

Plus `README.md` and `docs/APP.md`, which are prose. `npm run app:sync`
regenerates the copies under `android/app/src/main/assets/`; those are build
output and are never edited by hand.

**Four tests pin it**, and they are the reason a partial rename fails loudly:
`e2e/chrome.spec.js` (the mark's accessible name, and that the wordmark is not
live text), `e2e/pwa.spec.js` (the manifest), `tests/store.test.mjs` (the
export message).

**The bundle id is permanent.** `com.agios.app` was set on 2026-09-12 while no
binary had been built. Once a store listing exists it can never change - a new
id is a new app with no upgrade path for anyone who installed the old one. If
a domain is ever registered for this site, the id should have been its reverse
form; that is the one decision here still worth revisiting **before** the first
submission and never after.

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
| `--accent` | `#918770` | rules and marks; 2.84:1, **never a word** |
| `--bub` | `var(--field)` | the Daily sidebar's own surface |
| `--feast` | `#a67300` | the feast mark; 3.30:1 on gesso, 3.07:1 on the field |
| `--mount` | `#201917` | the mat a picture stands in — the other theme's surface |

**Two colours carry meaning and nothing else may.** Rubric marks liturgical time
and the reader's place. Gold marks a finding about veneration — `--gold` where
it is decoration, `--gold-ink` where it is a word, and **`--feast` where it is
the one thing saying a day holds a feast**, which is why that third one takes a
3:1 floor the first does not (`tests/contrast.test.mjs`). The one sanctioned
exception is the fast's colour by kind (`--fast-strict/-fish/-free`), plus the
Random die.

`--accent` is the ground's own hue shifted away from itself, and it is the
rebuild's rule-and-mark colour: it sits under `--gold`'s exemption exactly, on
the exemption's own terms — it is a hairline, a border and a stepper's diamond,
and never text and never alone.

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
| `--dur-swap` | 620 | the whole page changing face: the two-layer stage |
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

**The theme change animates the tokens, not the boxes** (2026-09-10). The
fifteen colours the two themes declare independently are registered as
`<color>` in `tokens.css` and transitioned on `<html>` in one declaration at
`--dur-settle` on `--ease`, so every `var()` reading one recomputes each frame
and the whole page crosses as a single movement. Before that the fade was
`background-color` and `color` on `body`, `header` and `main` alone: 91 painted
things on Daily snapped at the first frame while 16 eased, and the 16 were the
ones with no colour of their own. Transitioning the boxes cannot be widened
into this, because `transition` is a shorthand and a universal rule either
loses to every component that declares one or stops that component's movement
mid-press. `e2e/chrome.spec.js` asserts the result on all six routes.

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

### The measures, and the widths they are cut to

**A one-off width is written down here or it is not written down at all**
(author, 2026-09-12, reversing this file's own exemption of `width` from the
token rule). The argument is not that a column measure wants a token: it is
that 240 px buried in 12,000 lines of CSS is invisible, and the same number as
a table row is something a reader can question. **Values live here; the
mechanism stays in a comment beside the code it constrains**, which is settled
and not to be re-proposed.

So the two tables below are not a scale. They are an inventory, and
`tests/plan.test.mjs` reads both directions of it: a measure declared in a
sheet and missing here fails, and a row here naming nothing fails.

**The named measures** — every custom property outside `tokens.css` whose
value carries a pixel. A property declared twice is two rows, because a base
value and the override that replaces it at a breakpoint are two decisions.

| measure | value | sheet |
| --- | --- | --- |
| `--page-max` | `2000px` | `base.css` |
| `--chrome-h-reserve` | `41px` | `base.css` |
| `--chrome-h-reserve` | `52.5px` | `base.css` |
| `--chrome-h-reserve` | `75.5625px` | `base.css` |
| `--td-side-w` | `clamp(240px, 21vw, 310px)` | `daily-sidebar.css` |
| `--tile-pic` | `120px` | `daily-tiles.css` |
| `--tile-pic` | `84px` | `daily-tiles.css` |
| `--row-pic-w` | `clamp(180px, 20vw, 300px)` | `daily-tiles.css` |
| `--row-pic-h` | `clamp(200px, 38vh, 420px)` | `daily-tiles.css` |
| `--row-flow-h` | `clamp(180px, 30vh, 380px)` | `daily-tiles.css` |
| `--cx-w` | `150px` | `index.css` |
| `--cx-w` | `clamp(150px, calc(var(--cx-max-h) * 0.58), 300px)` | `index.css` |
| `--cx-w-text` | `clamp(150px, calc(var(--cx-w) * 0.62), 190px)` | `index.css` |
| `--cx-max-h` | `240px` | `index.css` |
| `--cx-max-h` | `clamp(240px, var(--cx-space, 48vh), 520px)` | `index.css` |
| `--facet-font` | `13.5px` | `index.css` |
| `--facet-pad-y` | `3px` | `index.css` |
| `--facet-h` | `calc(var(--facet-font) * var(--facet-lh) + var(--facet-pad-y) * 2 + 2px)` | `index.css` |

**Two of those are the inventory earning its place on its first pass.**
`--chrome-h-reserve` is declared three times with three values, none of which
round to another — the header's reserved height at three widths, which is a
fact worth being able to see in one place. And `--facet-font: 13.5px` is a
**type size standing outside the type scale**, which `design-tokens.test.mjs`
cannot see: the rule it enforces is about `font-size` declarations and this is
a custom property that one then reads. Neither is changed here — changing a
measure is the overhaul's to do with the contact sheet in front of it — but
neither is invisible any more.

**The breakpoints.** Eleven values across six sheets, and the site has about
four boundaries: ~480–560, ~700–768, 900, and 1024. Most of the rest is one
boundary spelled differently in different sheets.

| breakpoint | sheets | what it divides |
| --- | --- | --- |
| `max-width: 480px` | `saint.css` | the shelf row's feast chip moves ahead of the date rather than wrapping to a third line |
| `max-width: 559.98px` | `base.css`, `index.css` | the first-visit choices close up; All Saints' head takes the phone's padding |
| `max-width: 699.98px` | `daily.css` | the full-screen calendar drops to one column — seven columns stop holding a phrase |
| `min-width: 700px` | `daily.css`, `index.css` | the full-screen calendar's weekday heads; the carousel's own card measure. `views/index/controls.js` opens on cards rather than rows at the same width |
| `max-width: 759.98px` | `base.css` | the chrome line gives up its gaps rather than wrapping |
| `min-width: 760px` | `base.css`, `saint.css` | the complement: the masthead returns to the left, and `main.js` turns the nav strip at the same number |
| `max-width: 767.98px` | `daily-tiles.css` | a folded tile's picture drops from 120 px to 84 |
| `min-width: 900px` | `daily.css` | the full-screen calendar gains its periods column beside the month |
| `max-width: 1023px` | `daily-sidebar.css` | the sidebar stops standing and becomes the first block in the flow |
| `max-width: 1023.98px` | `daily.css`, `saint.css` | the day's strip stops being its own scroller; the saint's columns take `pan-y` for the swipe |
| `min-width: 1024px` | `base.css`, `daily.css`, `saint.css` | Daily's two columns, and every other desk arrangement |

**760 and 767.98 are two numbers for one idea, and so are 1023 and 1023.98.**
The `.98` spellings exist so a fractional window width falls in exactly one of
a `min`/`max` pair; `daily-sidebar.css`'s bare `1023px` and
`daily-tiles.css`'s `767.98px` are each the odd one out in their own
neighbourhood. Recorded, not reconciled: a breakpoint moved is a layout
changed, and that wants the contact sheet in front of it.

**1024 is the one a module may not spell for itself.** `lib/viewport.js` holds
it for JavaScript, because two unrelated modules needed it on 2026-09-12 — the
Daily page's full-screen opener and `lib/church.js`'s reckoning — and two
copies of a breakpoint is how a breakpoint drifts. The other two numbers
JavaScript knows, 700 and 760, are still each written twice.

**Corners are crisp.** Panels 4 px, badge cells 1 px, buttons 4 px. This is
deliberately near the broadsheet territory the brief bans, and it steps away
from it through warm materials, the recessed field, and rules used sparingly —
not through softer corners.

**The panel (card).** Recessed field on `--field`, 1 px `--rule` border, **no
drop shadow on the panel**; padding 16. Depth is the field being darker than
the page, never a cast shadow. Image, then the name, then whatever the mode
puts under it — dates, a description, the Detailed matrix. On hover the border
darkens toward `--ink-soft` and nothing moves or lifts. **The card box is
derived, not fixed, everywhere a card is one of many** — the manifest carries
each image's aspect ratio and the card takes it, held between 1:1.6 and 2:1 by
`lib/hero-crop.js`. That is the Index's cards, the carousel's columns and the
Daily register's, and it is the author's rule of 2026-09-01 and 2026-09-02.

***The Daily page's own hero, past 1024 px, is the one fixed box** (author,
2026-09-10: the main saint card takes the reference's cropping aspect ratio,
"faces at 2/3 of the height of the image crop"). It is 3:2 at `50% 34%`,
measured off the reference rather than off the sentence. This paragraph read
"derived, not fixed" without qualification until then, and the reason the
exception is the hero rather than a change of rule is that the hero is not one
card of many: it is one picture, alone, at the top of the page, on a page the
reader returns to daily — so a shape that changes with the saint changes the
page's whole silhouette from one day to the next, which is what a habit page
cannot afford. A grid of cards has the opposite need and keeps the derived
rule. docs/daily-desktop-visuals.md §10.23 has the whole of it, and §10.1 is
the decision it reverses.*

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
bookmark's shadow, asserted without counting. There were six, found by
`scratchpad/colour-audit.py` on 2026-09-09, and there are three: the Daily
page's rebuild (2026-09-12) took `.fast-bubble` with the liturgy line it
pointed at, and the reckoning control's popover came back in
`daily-sidebar.css` with a hairline instead of a shadow — it stands against the
column rather than over the page, which is the rule below deciding its own
case:

| where | what |
| --- | --- |
| `.church-panel` | `0 6px 18px -8px rgb(0 0 0 / 0.4)` — the chooser, fixed over the page |
| `.index-controls.is-stuck .index-row` | `0 6px 12px -10px rgb(0 0 0 / 0.5)` — the bar once it sticks |
| `.index-controls.is-stuck.is-filters-open .filter-drop-inner` | `0 8px 14px -12px rgb(0 0 0 / 0.5)` |

Not shadows, but in the same family: a `rgb(0 0 0 / 0.45)` scrim on
`.hero-media`, the coachmark's gold glow, and the map's focus ring, which uses
`box-shadow` to draw two concentric rings rather than a shadow.

**Read together they are a rule, not an inconsistency.** Every one is on
something *over* the page — a panel that flies, a bar that has left the flow,
the drop under it — and none is on anything sitting in it. So the panel rule
holds exactly as written, and the working principle is sharper than "no drop
shadows": **a shadow says this is above the page; a card is in it and gets its
depth from the field.**

*This table listed `.chrome`, `.month-grid button`, `.hero-more`,
`.index-name:hover` and `.index-desc` until `tests/plan.test.mjs` was written
on 2026-09-09 and disagreed with it on its first run. The values and the count
were right and every selector was wrong: the grep behind them required a
selector at column 0, so an indented rule inside a media query fell through to
whatever unindented one came before it. The bookmark's shadow, which this
section once called the only one on the site, is still not among them and has
never existed.*

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

### Related saints

**A saint named in a life gets a hyperlink and a `related` row on the page whose
life names them.** `lib/cross-link.js` makes the link; `related` in
`saint.json` carries the row.

**`related` is reversed** (author, 2026-09-09). A saint named in another's life
appears on *both* pages: in the list of the life that names them, and in a
"mentioned in" list of their own. The reverse is a real finding — that this
person is remembered inside somebody else's story — and the site's job is to
show what is recorded.

**The vision is maximum cross-reference.** This corpus is a web of people who
knew each other, taught each other, died together and were buried by each
other, and every one of those threads that is written down should be walkable.
A reader who arrives at one saint should be able to leave by every door the
sources actually give them.

**`node scripts/link-coverage.mjs` is the number, and it trends.** Quote it
from the script, never from here — this table said "520 saints with no link in
either direction" for a day and the true figure was 768.

Measured 2026-09-09, before the sweep and after it:

| | before | after |
| --- | --- | --- |
| `related` edges | 73 | **574** |
| lives that name someone | 66 | **330** |
| saints a life names | 39 | **286** |
| a link in either direction | 94 of 862 | **379 of 862** |
| **isolated** | 768 | **483** |
| folders `cross-link.js` can match at all | 375 of 862 | 375 of 862 |
| hand-written links in lives | 532, across 285 lives | unchanged |

**The whole of that gain was already written down.** The 532 links a hand had
put in the lives were the corpus's real cross-reference layer, and nine of them
were in `related`; the two prose tiers that had done all the work until then
could see 86 links and proposed nothing new on the whole corpus. Reading all
510 distinct ones turned up no dedication and no wrong person. The lesson is
about instruments rather than about saints: `related-from-links.mjs` stripped
every markdown link on its first line, so the strongest claim in the corpus was
the one thing it was structurally unable to see.

**The dedication rule survives the reversal and constrains it.** A church,
lavra, chapel, feast or ship named for a saint is not an association with them,
so a reverse index built from raw links would put six twentieth-century martyrs
on Alexander Nevsky's page. The reverse must be built from the *filtered*
relation, never from every hyperlink.

**A dedication is not a relation.** A church, lavra, chapel, feast or ship named
for a saint is not an association with them — 23 of the 86 links the corpus
produces are exactly that, and taken unread they make Alexander Nevsky the
associate of six twentieth-century martyrs. The test is **adjacency, not
proximity**: a dedication runs straight into the name, at most through "of",
"of the", "of St".

**Where no rule catches it, a table holds it by hand with its reason.**
`REFUSED` in `scripts/related-from-links.mjs` — a warship whose mutiny a saint
calmed, a saint's words quoted seven centuries later. Rules do not catch those
and are not stretched until they do.

`related-from-links.mjs` proposes and never writes. **Every row is read before
it lands.**

### The naming contract

Four fields, and the split is what makes the rest possible. `display_name` held
name, office, rank and death year in one string until 2026-08-27 — "Gorazd,
Bishop of Bohemia and Moravia-Silesia, Hieromartyr (1942)" — and every naming
rule since rests on having taken it apart.

- `display_name` — the bare name. **Never** a rank, an office or a year; a unit
  test sweeps for all three.
- **Kinship and companionship clauses stay.** "son of Bassa", "mother of the
  Theotokos", "with 28 martyrs", "disciple of Babylas" — about sixty of these.
  They are not offices and not decoration: they are how the source names the
  person, and stripping them to reach a "bare name" loses the name.
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

**Two published renderings may be copied, and they are named**: Orloff's
*General Menaion* (1899) and Hapgood's *Service Book* (1906), both long in the
public domain. A modern translation is a living author's work and needs their
permission.

**Nassar's *Book of Divine Prayers and Services* (1938) is refused.** It is the
obvious candidate — a full English menaion, served openly on archive.org — and
its copyright status is unresolved: a 1938 American publication is public domain
only if its copyright was not renewed, no renewal record was found either way,
and archive.org's own record carries "This material may be protected by
copyright law". **A licence that cannot be established is not a licence, and
this repository does not guess at them.**

**No kontakion in the corpus has ever been matched against Orloff's commons**,
and he prints one in every general service. A citation beats a rendering
wherever one exists, so that pass comes before translating anything further.
As counted on 2026-09-08: 383 hymn objects have no English; 140 saints of 862
carry any hymn at all, 427 hymn objects between them (Russian 143, Greek 149,
Romanian 117, Serbian 18); 256 troparia and 171 kontakia. **These are dated
rather than pinned** — a test that held them would go red every time a hymn was
added, which is the failure this file warns about two sections down.
`node scripts/locale-coverage.mjs` recounts them.

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

In order. The four items struck off on 2026-09-09 — the contact sheet, the token
scales, the map's tests and the type collapse — are in `git log`, along with the
two whose stated reason turned out to be wrong.

1. **The visual overhaul** — desktop first. Section 4 is the brief, section 2 is
   the argument beneath it. The loop is `contact-sheet.mjs --still`,
   `tile-diff.mjs snapshot`, change, `--still`, `compare`: 80 s a pass over 48
   tiles, and a comment-only edit must come back pixel-identical.

   **The comment rewrite rides inside it, per file.** `calendar.css`,
   `index.css` and `base.css` carry 2,923 comment lines across 6,299 and the
   overhaul has to open all three; clearing each file's narrative in the same
   pass costs one visit rather than two. A constraint stays, a quantity or a
   mechanism needs a test or an admission that it is unverified.

   **Two decisions waiting for the sheet.** The five cast shadows in section 4 —
   which stay. And `.carousel`'s top margin, which has been 0 since the carousel
   came back because `index.css` asked for a `--space-5` that has never existed;
   it is written out as `0` rather than guessed at.

2. **All Saints' boot.** Two defects, both found by measuring and neither the
   one this item named for three days.

   **The caption pack was fixed on 2026-09-09 and this item went on describing
   it until 2026-09-12.** It read "the All Saints row measures all 862 saints'
   captions (~9,600 canvas calls) in one blocking task before it can paint a
   column", which the `CX_PREFIX` work below had already closed — and `HANDOFF.md`
   repeated it. A defect struck off in one paragraph and left standing in the
   paragraph above it is how a fixed thing gets fixed twice; the next reader
   went looking for the pack, could not find the cost, and measured instead.

   **What it found was next door, and is fixed as of 2026-09-12 — unverified.**
   `update()` runs before `applyMode()`, so the *grid* laid out all 862 names
   through `nameLines` and mounted a screenful of cards before the carousel
   hid it: a face nobody had asked for, built twice per boot, because the
   hiding provokes its own resize observer. `paintGrid` now returns early while
   the mode is `carousel` and `applyMode` calls `state.layoutGrid()` once the
   `hidden` attribute is off — after, because a hidden element measures 0
   (trap 7). The row's DOM size is untouched, which "Do not virtualise the row"
   below still says is right.

   The mechanism has been read in the diff and holds. **The numbers have not
   been re-measured by anyone but the agent that made the change**, and it
   reported two different sets for the same quantity — 394–606 ms of grid
   layout before the first card in the code's own comment against 367–403 in
   its commit message, and blocking before the first card falling to ~1,750 ms
   in one and to 1,537–1,590 in the other. Both are at 10× CPU through
   `scratchpad/phase-cost.mjs`. Treat the direction as established and the
   magnitude as unsettled until someone runs it.

   **Measured 2026-09-09, controlled** — same route, same data, only the face
   differing, at 10× CPU (`node scratchpad/throttle-probe.mjs pack`). This is
   the caption pack, and the table is the record of what it cost before the
   prefix closed it:

   | mode | ready | longest task | tasks > 50 ms |
   | --- | --- | --- | --- |
   | carousel | 2,924 ms | **1,517 ms** | 14 |
   | search | 1,284 ms | 520 ms | 5 |

   So the row costs about a second of blocking time and 1.6 s to first paint.
   The figure moves a lot between runs on this desk — 975, 992, 1,128, 1,517 —
   so treat ~1,200 ms as the centre rather than the number.

   Two earlier attempts to attribute this were wrong and are worth not
   repeating: comparing All Saints against Daily is uncontrolled, since Daily
   fetches day records and hymns of its own; and a run with `indexMode: 'grid'`
   measures the carousel twice, because the two faces are `carousel` and
   `search` and anything else falls back to the first.

   **Half done on 2026-09-09, and the profile says why only half.** Profiled at
   10× with `scratchpad/cpu-profile.mjs` against the dev server, where the
   function names survive:

   | | ms |
   | --- | --- |
   | `(program)` — native parse, style, layout | **2,293** |
   | `frame` + `onScroll` (`loop-scroll.js`) | 673 |
   | `greedyLines` + `nameLines` + `captionH` — the caption pack | 675 |

   So **this item named a third of the bill.** The pack is real, but the row
   also puts the whole corpus into `innerHTML`, and that native cost dominates.
   The grid next door is virtualised; the row is not.

   Measured at 1440 px with `scratchpad/dom-cost.mjs`, *not* inferred — an
   earlier note here said "886 cells" from arithmetic (862 + a 12-cell buffer
   each end, one cell per saint) and a cell holds about six:

   | | |
   | --- | --- |
   | cells in the DOM | **166** |
   | cells on screen | **6** |
   | card links | 1,011 |
   | nodes in the track | 3,499, of 3,898 in the document |
   | track width | 47,822 px against a 1,440 px viewport |
   | `<img>` elements / loaded | 150 / **11** |

   **The row is 90% of the page's DOM and 96% of it is off screen.** Images are
   already windowed by `windowImages`, so the network half of this was solved
   and the layout half was not.

   **Done:** the first paint packs `CX_PREFIX` (180) saints and the rest
   arrives on `requestIdleCallback`. Measured three runs each side on one build
   cycle: ready **2,829 → 1,959 ms** median, longest task **1,244 → 866 ms**,
   at the cost of more shorter tasks (14 → 21). The whole corpus still reaches
   the row — 60 cells at first paint growing to 200 — and the rebuild is a case
   `loop-scroll.js` already handles, since `handoff()`/`inherit()` exist for
   exactly the late repaint a settling font or picture causes.

   **Do not virtualise the row.** It was proposed here as the biggest prize
   left and the premise was wrong, checked 2026-09-09 before starting:

   - **`content-visibility: auto` is already on `.cx-cell`**, with an exact
     `contain-intrinsic-size`. Off-screen cells are already skipped; a JS
     virtualiser would re-implement one CSS line.
   - **Holding the row at 63 cells instead of 200 saves nothing measurable** —
     ready 1,771 ms against 1,730, longest task 809 against 913, median of
     three each at 10× (`scratchpad/dom-size-cost.mjs`). The whole cost of the
     full row is ~100 ms, and it is spent in idle time after the reader has
     content.

   "The row is 90% of the DOM and 96% of it is off screen" is true and does not
   imply a cost. That inference is what made this look like the prize.

   **Where the time goes, by category** (`scratchpad/boot-breakdown.mjs`, from
   the engine's own counters, production build, 10×, median of three):

   | | |
   | --- | --- |
   | Task total | 5,720 ms |
   | Script | 1,138 ms |
   | RecalcStyle | 1,392 ms |
   | Layout | 427 ms |
   | V8 compile | 2 ms |

   So about **2.8 s of the 5.7 is none of those** — native work the counters do
   not name. Script, style and layout together are half the bill and no one of
   them is a target on its own.

   **A tried and reverted fix, so it is not tried again.** The counters showed
   **82,000 style recalculations**, and the drift writes `scrollLeft` 60 times a
   second to move 26 px — 0.43 px a frame, most of them invisible. Writing only
   on a whole pixel took the count from 82,000 to **101** and changed the time
   by nothing (Task 5,720 → 5,515 ms, inside this desk's noise; RecalcStyle
   actually rose). The recalculations were each free — the counter counts the
   browser's check, not work. It also coarsens the drift from sub-pixel every
   16 ms to 1 px every 38 ms, so it costs something and buys nothing.

   The lesson is the one this file keeps learning: a count is not a cost.

   **Five waits in the browser suite exist because of this half-done state,
   and every one of them should return instantly once it lands**: `the carousel
   drifts on its own` waits for the row to have somewhere to drift, and four
   more go through `packedRow` in `index-carousel.spec.js`, which waits for the
   idle repack to put the whole run in the track.

   **What the half-done state costs is that the row's membership is not the
   row's membership until the repack.** Measured directly on 2026-09-11
   (`scratchpad/row-reads-probe.mjs`), at the instant `.cx-card` becomes
   visible against after the repack: **60 cells against 198, 40 pictures
   against 147, and a different first ten slugs in 12 of 12 passes** — and
   *identical at 1×, 6×, 10× and 20×*. It is not a slow-machine race that load
   makes likelier; the prefix is what is there when the first card paints,
   always. Three tests were reading it and passing on the gap between the read
   and the repack. The two obvious waits both measured as useless first: the
   row is already wider than its viewport at 60 cells, and "two consecutive
   equal readings" settles on the prefix. `packedRow` carries the table.

3. **The nav strip breaks under an aggressive swipe** — `keepEndless` writes
   `scrollLeft` inside a live gesture. Known defect.

4. **Sweep for cross-references, to the vision in section 5.** In order of
   what each is worth:

   - ~~Reverse the edges that already exist~~ — **done 2026-09-09.** A saint
     shows whose lives name them; the reverse index is derived in
     `build-manifest.mjs` and never stored in a folder.
   - ~~Run `related-from-links.mjs` over the whole corpus~~ — **done
     2026-09-09**, all 542 rows read. 73 edges became 574 and the isolated
     count 768 → 483. The tool now has a third and strongest tier, `written`.
   - **Raise the linker's ceiling.** `lib/cross-link.js` can match 375 of 862
     folders; the other 487 have name forms too short or ambiguous to be safe,
     and six forms are shared by two saints. The way past it is better *name
     forms in the data*, not looser rules — the rules were narrowed until every
     proposed link was right and that trade stands. It is now the *only*
     mechanical route left: both other tiers are exhausted.
   - **The 483 isolated saints are the work list**, and the way to shorten it
     is to write links into lives — every hyperlink a hand adds is now two rows
     on two pages. `node scripts/link-coverage.mjs --isolated` prints them.

5. **A phone-sized card derivative** — a phone draws a 150 CSS px card from a
   560 px file; the first screenful of All Saints is 579 kB and could be ~189.
