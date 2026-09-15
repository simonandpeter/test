# STRUCTURE

What this site is, what it looks like, who owns which page, what is settled and
what is next. **Binding.** If the code disagrees with this file, the code is
wrong.

`CLAUDE.md` is the other half: how to work here, the test table, the traps.
`docs/CORPUS.md` is the protocol for adding a saint. History is in `git log`.

Three rules keep this file true, and all three exist because it rotted before:

1. **Present tense, and no self-correction.** A wrong claim is deleted, not
   annotated. "This paragraph said X until…" belongs in the commit that changed
   it.
2. **A number is generated or it is not written.** Anything a script can print
   is printed by one, inside a marked block. Hand-written numbers drift, and a
   test that catches drift is weaker than a document that cannot drift.
3. **Reasoning goes in the commit message**, which is append-only and already
   searchable.

---

## 1. The site

An Eastern Orthodox daily calendar and saints reference. Four churches —
Russian, Romanian, Greek, Serbian — and the reader chooses one. Five pages:
Daily, All Saints, Texts, Map, About. Five reading languages: English plus the
four churches' own.

Live at https://simonandpeter.github.io/test/, deployed by GitHub Actions from
`dist/`. The corpus is a folder per saint; `scripts/build-manifest.mjs` prints
its size.

**The subject is other people's devotion.** That sets the whole tone: the site
is a register, not a brochure. It states what is recorded and says plainly what
is not. Nothing is invented to fill a gap, and a gap is shown as a gap.

**The corpus is data and the site is code, and the break is clean.** A saint is
`saints/<slug>/{saint.json, life.md, images/}`, schema-validated and built into
`data/manifest.json`; the app only ever reads the manifest. No saint slug
appears anywhere in `src/` outside a comment, and a unit test sweeps for one.
`data/` is generated and gitignored — never hand-edited — and a wrong crop is a
data fix, not a CSS one.

**Tests must not name instances.** A hard-coded slug or date in a spec is why
adding saints goes red. Read the fixture from the manifest, assert the premise,
then the claim; `CORPUS`, `NO_RU_NAME` and `venerateUnion` in `e2e/helpers.js`
are the pattern.

**The vision is maximum cross-reference.** This corpus is a web of people who
knew each other, taught each other, died together and were buried by each other,
and every one of those threads that is written down should be walkable. A reader
who arrives at one saint should be able to leave by every door the sources
actually give them.

Everything else about the corpus — sources, what "correct" means per field, the
failure modes, the tools and what must never be automated — is
**`docs/CORPUS.md`**, which is binding for anyone adding to `saints/`.

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

## 3. The look

**The tokens in `src/styles/tokens.css` are the design.** A raw colour,
duration, easing, type size or spacing value anywhere else is a defect, and
`tests/design-tokens.test.mjs` fails on a raw easing, a sub-second raw duration
or a raw `font-size` in a component sheet.

A raw **width** is not a defect — a column measure is a one-off and a token
would be a name for one use — but it is a defect for one to go *unwritten*. The
measures inventory at the end of this section is every named measure and every
breakpoint, and `tests/structure.test.mjs` reads it against the sheets in both
directions.

**The four token tables below are printed from `tokens.css` by
`npm run tokens:table`, and the test fails if they are stale.** Do not edit them
by hand: a token's value and its meaning are both written on its own line in
that file, which is why a colour can no longer be declared and left out. The
prose around them is a ruling and is written by hand.

### The name

**The site is AGIOS**, one name in every language and on every surface. It is a
*mark*: the same five outlines whatever the reader's pack, drawn to paths rather
than set as text, so it is never translated and never re-typed.

It is nonetheless written down in **fourteen places**. The site carried three
different names at once until the table below existed, because nothing connected
them and each rename reached some of them. **Change the name here and in all
fourteen, in one commit.**

| # | where | what it sets |
| --- | --- | --- |
| 1 | `scripts/make_wordmark.py` `WORDS` | the drawn glyphs — **the only one a reader sees** |
| 2 | `scripts/make_wordmark.py` `LABEL` | the SVG's accessible name |
| 3 | `src/ui/strings.js` `site.name` | nothing; kept so the packs share a key set |
| 4 | `src/ui/locales/{el,ro,ru,sr}.js` `site.name` | nothing; same value in all four |
| 5 | `src/ui/strings.js` `site.tabName` | `document.title`, once the app boots |
| 6 | `src/ui/locales/*` `site.tabName` | the same, per pack |
| 7 | `index.html` `<title>` | the tab before any JavaScript runs, and the crawler |
| 8 | `public/site.webmanifest` `name` / `short_name` | the installed PWA |
| 9 | `capacitor.config.json` `appName` | the native app's display name |
| 10 | `capacitor.config.json` `appId` | **`com.agios.app`** — see below |
| 11 | `android/app/build.gradle` | `namespace` and `applicationId` |
| 12 | `android/app/src/main/res/values/strings.xml` | `app_name`, `title_activity_main`, and the URL scheme |
| 13 | `ios/.../project.pbxproj` + `Info.plist` | `PRODUCT_BUNDLE_IDENTIFIER`, `CFBundleDisplayName` |
| 14 | `src/lib/store.js` | the export's rejection message |

Plus `README.md` and `docs/APP.md`, which are prose. `npm run app:sync`
regenerates the copies under `android/app/src/main/assets/`; those are build
output and are never edited by hand.

**Four tests pin it**, which is why a partial rename fails loudly:
`e2e/chrome.spec.js` (the mark's accessible name, and that the wordmark is not
live text), `e2e/pwa.spec.js` (the manifest), `tests/store.test.mjs` (the export
message).

**The bundle id is permanent.** Once a store listing exists `com.agios.app` can
never change — a new id is a new app with no upgrade path for anyone who
installed the old one. If a domain is ever registered for this site, the id
should have been its reverse form; that is the one decision here still worth
revisiting **before** the first submission and never after.

### Colour

Two themes, `day` and `vigil`. Dark is not an inversion and contains no pure
black.

<!-- generated: colour — scripts/tokens-table.mjs -->
| token | day | vigil | means |
| --- | --- | --- | --- |
| `--gesso` | `#ece5d6` | `#1a1412` | the ground: primed gesso, not paper |
| `--ink` | `#221d19` | `#e1dbd3` | body text |
| `--ink-soft` | `#5c544d` | `#9b9187` | secondary text, coastlines, marks |
| `--rubric` | `#8a2e26` | `#bc7e74` | liturgical time and place only |
| `--gold` | `#a98237` | `#c79a4b` | a glyph, a border or a tint — never a word |
| `--gold-ink` | `#755925` | `#c79a4b` | gold where it has to be a word |
| `--rule` | `#c8c2b7` | `#3a2f29` | a register's rule |
| `--field` | `#e6ddca` | `#221a18` | recessed panel interior only — never a page background |
| `--veil` | `rgba(236, 229, 214, 0.8)` | `rgba(26, 20, 18, 0.8)` | the first-load scrim: gesso at 0.8 |
| `--fast-strict` | `var(--rubric)` | `var(--rubric)` | a strict fast — the rubric itself, a fast being liturgical time |
| `--fast-fish` | `#016392` | `#6390a1` | fish permitted; blue, so a mitigated day is never mistaken for gold |
| `--fast-free` | `#356038` | `#8fbe8a` | no fast |
| `--accent` | `#918770` | `#6e5f5a` | rules, hairlines and marks; never a word and never alone |
| `--bub` | `var(--field)` | `#201917` | the Daily sidebar's own surface |
| `--feast` | `#a67300` | `#a67600` | the one mark saying a day holds a feast; takes a 3:1 floor |
| `--mount` | `#201917` | `#908877` | the mat a picture stands in: the other theme's surface |
| `--button-face` | `#ffffff` | — | the one white surface on the site, and the one that is not themed |
| `--button-face-ink` | `#221d19` | — | fixed dark, so the white pill never inverts |
| `--ground-ink` | `#1a1613` | `#f4ede2` | the ground's own opposite: near-black on gesso, near-white on bole |
<!-- /generated -->

**Two colours carry meaning and nothing else may.** Rubric marks liturgical time
and the reader's place. Gold marks a finding about veneration — `--gold` where
it is decoration, `--gold-ink` where it is a word, and **`--feast` where it is
the one thing saying a day holds a feast**, which is why that third one takes a
3:1 floor the first does not (`tests/contrast.test.mjs`). The one sanctioned
exception is the fast's colour by kind, plus the Random die.

`--accent` is the ground's own hue shifted away from itself: a hairline, a
border and a stepper's diamond, never text and never alone.

Every text token is held to WCAG AA on both grounds in both themes by
`tests/contrast.test.mjs`, and axe runs over every route in both themes.

### Type

Three voices, two families.

- `--font-display` — GFS Nicefore, the masthead and nothing else.
- `--font-serif` — Literata. The reading voice: lives, prose, names.
- `--font-utility` — system UI. Apparatus: dates, counts, labels, chips.

**Every `font-size` goes through a `--text-*` token.** Nine steps, plus
`--text-mast` and `--text-mast-wide` for the display voice, which is a mark
rather than a step in the reading scale.

<!-- generated: type — scripts/tokens-table.mjs -->
| token | px | for |
| --- | --- | --- |
| `--text-3xs` | `9` | the smallest mark on the site |
| `--text-2xs` | `12` | the map's atlas layer, the smallest apparatus |
| `--text-sm` | `13` | the utility voice: nav, chips, counts, captions |
| `--text-base` | `15` | apparatus at reading weight: labels, chips, subtext |
| `--text-lg` | `17` | the reading voice: lives, prose |
| `--text-lede` | `19` | a page's opening paragraph |
| `--text-xl` | `21` | h3 |
| `--text-2xl` | `26` | h2 |
| `--text-3xl` | `clamp(28px, 5vw, 40px)` | h1 |
<!-- /generated -->

### Space

`--space-1` 4px through `--space-16` 64px, doubling. `--radius-panel` 4px,
`--radius-cell` 1px. Spacing is ~97% governed; what is left raw is border
widths, hairlines and shadow offsets, which a scale should not govern.

**Corners are crisp.** Panels 4 px, badge cells 1 px, buttons 4 px. This is
deliberately near the broadsheet territory the brief bans, and it steps away
from it through warm materials, the recessed field and rules used sparingly —
not through softer corners.

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

The scale lives twice — `tokens.css` for CSS and `lib/motion.js`'s `DUR` and
`EASE` for JS — because a hand-rolled tween and a CSS transition are routinely
the same movement; `tests/design-tokens.test.mjs` fails if the two disagree.

<!-- generated: duration — scripts/tokens-table.mjs -->
| token | ms | for |
| --- | --- | --- |
| `--dur-answer` | `140` | a control acknowledging a press |
| `--dur-move` | `200` | the standard: a panel, a chip, a fade |
| `--dur-settle` | `300` | something arriving on or leaving the page |
| `--dur-travel` | `450` | a journey across the screen: a flight, a glide |
| `--dur-swap` | `620` | the whole page changing face: the two-layer stage |
| `--dur-linger` | `900` | content arriving with no gesture behind it |
<!-- /generated -->

<!-- generated: easing — scripts/tokens-table.mjs -->
| token | curve | for |
| --- | --- | --- |
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | the default: decisive, arrives calm |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | leaves at once, eases in to rest |
| `--ease-soft` | `cubic-bezier(0.4, 0, 0.2, 1)` | long fades: nothing decided |
| `--ease-spring` | `cubic-bezier(0.2, 0.9, 0.3, 1.2)` | the one overshoot |
| `--ease-turn` | `cubic-bezier(0.45, 0, 0.25, 1)` | the die: one symmetric turn |
<!-- /generated -->

A value outside the scale needs a line in one of these tables before it is
typed, and the test will say so. Loops — the veil's sweep, the skeleton's
breath, the coachmark's glow — state their own period and are exempt above one
second, being a different decision from a scale of response times.

**The theme change animates the tokens, not the boxes.** The fifteen colours the
two themes declare independently are registered as `<color>` in `tokens.css` and
transitioned on `<html>` in one declaration, so every `var()` reading one
recomputes each frame and the whole page crosses as a single movement.
Transitioning the boxes cannot be widened into this, because `transition` is a
shorthand and a universal rule either loses to every component that declares one
or stops that component's movement mid-press. `e2e/chrome.spec.js` asserts the
result on all six routes.

**`--ease-turn` is symmetric and every other curve here is not.** One full
rotation reads as a turn only if it accelerates and decelerates equally; a
movement that goes somewhere does not. It has one caller, the Random die.

**Both halves are fenced.** The test holds `DUR` and `EASE` to `tokens.css` and
fails on a `cubic-bezier` or a numeric `duration:`/`delay:` written anywhere in
`src/*.js`. It also fails on a `var()` reading a custom property nothing
defines — which is how two tokens were once deleted with thirteen call sites
still reading them, silently dropping the theme cross-fade while 902 browser
tests passed.

### Softness

One continuous function of one number, used identically wherever it appears:
map halos (`uncertainty_km`), timeline dissolves, and any date bar that returns.
`softness(p) = clamp(min · p^gamma, min, max)`, px at base scale — the three
constants are `--uncertainty-min/-max/-gamma` in `tokens.css`, pinned by
`tests/uncertainty.test.mjs` and implemented in `lib/uncertainty.js`. An
application may scale it linearly (map zoom) but never reshape it.

**It never takes an editorial enum as input.** `basis` and `historicity` are
claims, not measurements; they may modulate *treatment* — a weight, a texture, a
rule style — but never geometry. A soft edge always means "we are unsure of the
number", never "we doubt the story."

**An open bound dissolves over extent, not radius.** 24 px of blur applied to an
8 px bar erases it, including the bound at the other end, which is often a real
finding ("no later than 1000"). One open end keeps the curve's sharp value and
fades to nothing over the last 45% of its length toward the unknown side.

### Materials

**The panel (card).** Recessed field on `--field`, 1 px `--rule` border, **no
drop shadow on the panel**; padding 16. Depth is the field being darker than the
page, never a cast shadow. Image, then the name, then whatever the mode puts
under it. On hover the border darkens toward `--ink-soft` and nothing moves or
lifts.

**The card box is derived, not fixed, everywhere a card is one of many** — the
manifest carries each image's aspect ratio and the card takes it, held between
1:1.6 and 2:1 by `lib/hero-crop.js`. That is the Index's cards, the carousel's
columns and the Daily register's. **The Daily hero past 1024 px is the one fixed
box**, 3:2 at `50% 34%`: one picture, alone, at the top of a page the reader
returns to daily, so its silhouette cannot change with the saint.

**The register (list).** A day heading in small caps with its date, one rule
under it, entries beneath, one tradition's voice at a time. **A row reads
name-first**, with its picture at the trailing end — a 48 px thumbnail has no
corner to spare.

**The bookmark stands at the image's top-right corner**, a frameless silhouette
over the picture: no frame, no field, the shape alone, in ink — gold would claim
a finding and red would claim liturgical time. One drawing everywhere, filled at
both states, half opacity until saved, `aria-pressed` carrying the state. It
takes no shadow.

**A shadow says *this is above the page*; a card is in it and gets its depth
from the field.** Every cast shadow on the site is on something over the page —
a panel that flies, a bar that has left the flow — and none is on anything
sitting in it. The inventory, held by `tests/structure.test.mjs`:

<!-- copied: shadows -->
| where | what |
| --- | --- |
| `.church-panel` | `0 6px 18px -8px rgb(0 0 0 / 0.4)` — the chooser, fixed over the page |
| `.fast-bubble` | `0 6px 20px rgb(0 0 0 / 0.14)` — the fast's note, over the liturgy line it points at |
| `.index-controls.is-stuck .index-row` | `0 6px 12px -10px rgb(0 0 0 / 0.5)` — the bar once it sticks |
| `.index-controls.is-stuck.is-filters-open .filter-drop-inner` | `0 8px 14px -12px rgb(0 0 0 / 0.5)` |
| `.reckoning-pop` | `0 6px 18px -8px rgb(0 0 0 / 0.4)` — the reckoning control's popover |
<!-- /copied -->

Not shadows, but in the same family: a scrim on `.hero-media`, the coachmark's
gold glow, and the map's focus ring, which uses `box-shadow` to draw two
concentric rings.

**All Saints has two faces and opens on the carousel**; Cards and Rows are the
register at card weight, chosen by the reader and remembered. The carousel's
cards show their pictures whole. **The search field follows the reader down the
register.**

### The measures

**A one-off width is written down here or it is not written down at all.** The
argument is not that a column measure wants a token: it is that 240 px buried in
12,000 lines of CSS is invisible, and the same number as a table row is
something a reader can question. **Values live here; the mechanism stays in a
comment beside the code it constrains.**

The two tables below are not a scale. They are an inventory, and
`tests/structure.test.mjs` reads both directions: a measure declared in a sheet and
missing here fails, and a row here naming nothing fails. Every custom property
outside `tokens.css` whose value carries a pixel is a row; a property declared
twice is two rows, because a base value and the override that replaces it at a
breakpoint are two decisions.

<!-- copied: measures -->
| measure | value | sheet |
| --- | --- | --- |
| `--page-max` | `2000px` | `base.css` |
| `--chrome-h-reserve` | `41px` | `base.css` |
| `--chrome-h-reserve` | `52.5px` | `base.css` |
| `--chrome-h-reserve` | `75.5625px` | `base.css` |
| `--cal-peek` | `24px` | `calendar.css` |
| `--cal-peek` | `44px` | `calendar.css` |
| `--cal-gutter` | `calc(34px + var(--space-2) + var(--cal-peek))` | `calendar.css` |
| `--cal-gutter` | `calc(34px + var(--space-3) + var(--cal-peek))` | `calendar.css` |
| `--cal-row-h` | `51px` | `calendar.css` |
| `--card-h` | `calc(18 * 1.65 * 17px)` | `calendar.css` |
| `--card-pic` | `clamp(200px, calc((100% - var(--card-gap)) * 5 / 12), 40rem)` | `calendar.css` |
| `--hero-mat` | `14px` | `calendar.css` |
| `--notch` | `20px` | `calendar.css` |
| `--ox` | `10px` | `calendar.css` |
| `--ox` | `14px` | `calendar.css` |
| `--rail-fade` | `12px` | `calendar.css` |
| `--cx-w` | `150px` | `index.css` |
| `--cx-w` | `clamp(150px, calc(var(--cx-max-h) * 0.58), 300px)` | `index.css` |
| `--cx-w-text` | `clamp(150px, calc(var(--cx-w) * 0.62), 190px)` | `index.css` |
| `--cx-max-h` | `240px` | `index.css` |
| `--cx-max-h` | `clamp(240px, var(--cx-space, 48vh), 520px)` | `index.css` |
| `--facet-font` | `13.5px` | `index.css` |
| `--facet-pad-y` | `3px` | `index.css` |
| `--facet-h` | `calc(var(--facet-font) * var(--facet-lh) + var(--facet-pad-y) * 2 + 2px)` | `index.css` |
<!-- /copied -->

`--chrome-h-reserve` is declared three times with three values, none of which
round to another — the header's reserved height at three widths. `--facet-font`
is a **type size standing outside the type scale**, which
`design-tokens.test.mjs` cannot see: the rule it enforces is about `font-size`
declarations and this is a custom property that one then reads.

**The breakpoints.** Eleven values across six sheets, and the site has about
four boundaries: ~480–560, ~700–768, 900, and 1024.

<!-- copied: breakpoints -->
| breakpoint | sheets | what it divides |
| --- | --- | --- |
| `max-width: 480px` | `calendar.css`, `saint.css` | the shelf row's feast chip moves ahead of the date rather than wrapping to a third line |
| `max-width: 559.98px` | `base.css`, `calendar.css`, `index.css` | the first-visit choices close up; All Saints' head takes the phone's padding |
| `min-width: 620px` | `calendar.css` | the week rail's peek and gutter widen |
| `max-width: 619.98px` | `calendar.css` | the complement |
| `max-width: 699.98px` | `calendar.css` | the full-screen calendar drops to one column — seven columns stop holding a phrase |
| `min-width: 700px` | `calendar.css`, `index.css` | the full-screen calendar's weekday heads; the carousel's own card measure. `views/index/controls.js` opens on cards rather than rows at the same width |
| `max-width: 759px` | `calendar.css` | the day's own chrome gives up its gaps |
| `max-width: 759.98px` | `base.css` | the chrome line gives up its gaps rather than wrapping |
| `min-width: 760px` | `base.css`, `calendar.css`, `saint.css` | the complement: the masthead returns to the left, and `main.js` turns the nav strip at the same number |
| `min-width: 900px` | `calendar.css` | the full-screen calendar gains its periods column beside the month |
| `max-width: 1023.98px` | `calendar.css`, `saint.css` | the day's strip stops being its own scroller; the saint's columns take `pan-y` for the swipe |
| `min-width: 1024px` | `base.css`, `calendar.css`, `saint.css` | Daily's two columns, and every other desk arrangement |
<!-- /copied -->

**620 and 619.98, 759 and 759.98, are two numbers for one idea each.** The `.98`
spellings exist so a fractional window width falls in exactly one of a
`min`/`max` pair, and `calendar.css`'s bare `759px` is the odd one out in its own
neighbourhood. Recorded, not reconciled: a breakpoint moved is a layout changed,
and that wants the contact sheet in front of it.

**1024 is the one a module may not spell for itself.** `lib/viewport.js` holds
it for JavaScript, because two unrelated modules needed it and two copies of a
breakpoint is how a breakpoint drifts. The other two numbers JavaScript knows,
700 and 760, are still each written twice.

---

## 4. The pages

One block per route: what it owns, how its desktop and mobile layouts differ,
and what the two are required to share.

**Only Daily is written.** The rest arrive as each route is worked on — a
section nobody has checked against the page is worse than no section. Until
then, `CLAUDE.md`'s "Where things live" table and `docs/SRC-DECISIONS.md` are
what there is.

### Daily

`/` and `/calendar/:date?` · nav key `calendar` · entry `views/calendar.js`

- **Owns** `views/calendar.js`, `views/daily/*`, `styles/calendar.css`
- **Reads** `lib/`: `calendar-page`, `liturgy`, `feasts`, `computus`, `church`,
  `viewport`, `date-display`, `hero-crop`
- **Specs** `daily-panel` (87 tests), `daily-picker` (48), `daily-register` (13),
  `daily-stage` (14)

#### Modules

| file | owns |
| --- | --- |
| `calendar.js` | the markup, and **which day**. Nothing in `daily/` calls back into it. |
| `daily/state.js` | the page's one mutable object. **Sole writer.** |
| `daily/entries.js` | who is commemorated on a day, in the chosen church |
| `daily/record.js` | the day's readings and hymns |
| `daily/panel.js` | paints both panels: hero + register into `main`, readings + hymns + name days into `side` |
| `daily/picker.js` | the week rail **and** the month grid — one control, two faces |
| `daily/fullcal.js` | the full-screen calendar |
| `daily/format.js` | dates in the reader's language and reckoning |

#### The box chain

```
html[data-route~='calendar'][data-fills-window]
└ body
  └ main.chrome                      100dvh − --chrome-h, overflow hidden (≥1024)
    └ #view                          height 100%
      └ .cal                         grid: minmax(0,1fr) var(--side-w)  (≥1024)
        ├ .cal-main [data-col=main]
        │ ├ .cal-head                ◂ prev · h1.cal-date · next ▸
        │ ├ p.cal-liturgy
        │ ├ .slot-viewport[data-slot=main] > .day-panel.day-main
        │ │                          hero (picture, name, dates, places, lede)
        │ │                          then the register
        │ └ .shelves                 Continue reading
        └ .cal-bubble                grid item and positioning context;
          │                          the four corner crosses are drawn outside the clip
          └ .cal-bubble-fill         the fill and the clip-path, nothing else
            ├ .cal-bubble-head       relocated chrome controls (≥1024 only)
            └ .cal-bubble-scroll     the right column's scroller
              ├ .cal-controls        .cal-jump (month button)
              │                      .cal-span → .cal-week (.week-strip) | .cal-month (.month-grid)
              └ .cal-side [data-col=side] > .slot-viewport[data-slot=side] > .day-panel.day-side
                                     name days, readings, hymns
```

`ui/face-stage.js` puts a second view in `#view` beside this one for the length
of a page swap.

#### Desktop — 1024 px and up

- **Two columns, and they are two boxes.** The day is painted into two panels,
  each in its own roll viewport, stepped together. A single panel spanning both
  could only move, scroll and grow as one.
- **The left column takes all the slack; the right is fixed.** `--side-w` is a
  rem, never a percentage — a percentage column with reflowing text feeds back
  into its own scrollbar appearing and disappearing.
- **The page gives up its scroll** (`data-fills-window`) and each column keeps
  its own. Two scrolling columns and a scrolling page are one scrollbar too many.
- **The right column is one filled box** with a square notch bitten from each
  corner and a cross of the fill standing in each bite. No `overflow: hidden` on
  it anywhere — the chooser panels open downward and are allowed to overrun the
  bottom edge; the notches are the only clipping it does.
- **The picker is the month grid**, forced open on arrival, and the week rail is
  hidden.
- The date sits between two stepper buttons, each half a cross.
- Name days lead the right column, above readings.
- The site's controls relocate into `.cal-bubble-head`.

#### Mobile — below 1024 px

- **One column.** Every wrapper dissolves to `display: contents` and `order`
  decides what is seen: picker 0, date 1, liturgy 2, day panel 3, side panel 4,
  shelves 5.
- **The markup order is the phone's reading order**, which is why `.cal-bubble`
  follows `.cal-main` in the document — ahead of it, the readings and hymns would
  be announced before the day they belong to. The cost is the month button's
  place in the tab order, which is the cheaper of the two.
- **The picker is the week rail.** The month closes behind it rather than being
  left open under a button that says shut.
- **A phone is Gregorian throughout, fasts included** (`lib/church.js`
  `calendarFor`): below 1024 px the chosen reckoning is not read, so an Old
  Calendar reader is shown the Dormition Fast on 1–14 August where the desk
  shows them 14–27. One branch to reverse if it ever reads wrong.

  **A test that asserts a church's own calendar therefore has to stand above
  1024 px**, through `desk()` in `e2e/helpers.js`. Twelve do. Re-dating one to
  make it pass at 360 would be asserting the bug.
- The day turns by swiping anywhere on the page (`touch-action: pan-y` on `.cal`,
  dragged by `onGrainDrag`), so there are no day steppers beside the date.
- The reckoning control and the month steppers are not drawn.
- The rail's cells carry `tabindex="-1"`; the desk's month cells do not, and are
  35 of the desk's 82 tab stops.

#### Shared

The two widths are free to diverge except here.

- **The day cells** — the week rail's and the month grid's — are one drawing:
  the same box, numerals, feast mark and fast colour.
- **The hero and the register rows** are the same components at both widths;
  only their measure changes.
- **The tokens.** No raw colour, duration, easing, type size or spacing value in
  `calendar.css`.
- **The derived card box**, per §3's materials rule, with the hero as its one
  exception past 1024 px.

#### Drives

| property | where | decides |
| --- | --- | --- |
| `--side-w` | `html[data-route~='calendar']`, ≥1024 | the right column's width. On the route and not on the box, because the site's bar measures itself against this column from outside the grid. |
| `--day-gap` | same rule | the gap between the columns |
| `--day-cols` | `.cal`, ≥1024 | `minmax(0, 1fr) var(--side-w)` |
| `--cal-peek`, `--cal-gutter` | `calendar.css` | the month's peeked neighbour columns and the gutter they need |
| `--cal-row-h` | `calendar.css` | a month row |
| `--card-h`, `--card-pic`, `--card-gap` | `calendar.css` | the register's card face |
| `--hero-mat`, `--hero-band`, `--hero-band-focus`, `--hero-r` | `calendar.css`, and inline per saint | the hero's mat and crop |
| `--notch` | `calendar.css` | the bubble's corner bite |

The rest — `--ox`, `--rail-inset`, `--rail-fade`, `--peek-fade`, `--headgap`,
`--rulegap`, `--lede-lines`, `--bub-inset` — are local to one control and are
read where they are declared.

| attribute | set by | read by |
| --- | --- | --- |
| `data-route~='calendar'` | `main.js`, `ui/face-stage.js` | **82 rules** in `calendar.css`. It is a **set, not a value** — face-stage writes both faces into it for the length of a swap, so every rule is `[data-route~=]`. A rule written `[data-route=]` works everywhere except the one second a reader is watching the two faces move. |
| `data-fills-window` | `index.html` before first paint, `main.js` on every navigation | `base.css`, at 1024 px and up |
| `data-fullcal='open'` | `daily/fullcal.js` | 2 rules |

**Known coupling.** Those 82 rules are the root deciding what one view's own
boxes look like — `html[data-route~='calendar'] .hero-media img`. Scoping the
inner ones to `.cal` would make the two faces independent by construction, and
shorten 82 selectors by ~20 bytes each. Specificity is the risk
(`.cal .hero-figure` is (0,2,0) against (0,2,1)), so it is a read of each block,
never a sweep.

#### Breakpoints

| px | what turns |
| --- | --- |
| 1024 | **the layout break** — one column ↔ two, page scroll surrendered, week rail ↔ month grid, Gregorian ↔ the chosen reckoning |
| 900 | the full-screen calendar's body |
| 760 | the hero's lede and its *more* control |
| 700 | the full-screen calendar's weekday names |
| 620 | the hero's picture goes beside its text |
| 560 | the picker's control row, the register's ask, the page's own padding |
| 480 | register rows that are not cards |

### All Saints, Saint, Map, Texts, About

Not written. See `CLAUDE.md`'s "Where things live".

---

## 5. Settled — do not re-propose

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

**All Saints' carousel row**
- **Do not virtualise it.** `content-visibility: auto` with an exact
  `contain-intrinsic-size` is already on `.cx-cell`, so off-screen cells are
  already skipped and a JS virtualiser would re-implement one CSS line. Holding
  the row at 63 cells instead of 200 was measured and saves nothing.
- **Do not write `scrollLeft` only on whole pixels.** It was tried: the style
  recalculation count fell from 82,000 to 101 and the time did not move, because
  the counter counts the browser's check and not work. It coarsens the drift and
  buys nothing.

---

## 6. Now

The open work, in order. An item leaves this list when it is done, not when it
is discussed.

1. **The Daily desktop redesign.** The live question, and the author has not yet
   given the design. A rebuild was made without one and reverted (`eae39cd`);
   the page is back to `f31520a` and this is the next thing to do, now from a
   known baseline. The method, from the author: build it on the live site with
   `npm run dev`, no standalone mockup; show options as override CSS in
   `mockups/` through `contact-sheet.mjs --css=a.css,b.css`; open the page and
   press things before calling it done.

2. **The entry stylesheet has ~57 bytes of headroom** (73,343 of a 73,400
   ceiling). The next CSS anyone writes trips `npm run test:lighthouse`, and it
   presents as four routes failing FCP rather than as a file being too big. Two
   ways out, and they are the same list: the coupling item below, or taking
   `index.css` and `saint.css` off the entry (72.28 → 54.31 kB), which needs the
   router to await the view's sheet rather than a bare dynamic import.

3. **Scope the Daily page's 82 root-attribute rules to `.cal`.** §4's known
   coupling. It makes the two faces independent by construction and is ~1.6 kB
   off the entry sheet, which pays for the item above.

4. **A roving tabindex on the month grid.** 35 of 82 focusable elements on a
   desk are the month's day cells. Invisible to touch; it bites a keyboard and,
   more sharply, a screen reader. `picker.js:968` is the line that omits it.

5. **The shelf-swipe test flakes about 1 run in 8.** The author ruled that the
   swipe behaves correctly, so the page is right and **the test is wrong** — it
   asserts a gesture it cannot reliably perform and should drive the drag at a
   fixed velocity instead of eight `mouse.move` steps. Until then CI retries
   hide it, which is how a flake here once masked a 16/16 regression.

6. **201 of 211 feast hymns in `src/data/liturgical-days.js` have no English.**
   The saints' hymns are done, 428 of 428; that is the whole of what "the hymns
   are translated" means today.

   **The two books are exhausted for troparia and not for kontakia.** Orloff's
   *General Menaion* (1899) and Hapgood's *Service Book* (1906) were both read
   in full against the renderings made here; Orloff's 27 chapters were indexed
   **by their troparia only**, and he prints a kontakion in every general
   service. So the kontakia are the pass that remains, and a citation beats a
   rendering wherever one exists. Hapgood carries the great feasts alone and
   has nothing further to give.

7. **Raise the cross-linker's ceiling.** `lib/cross-link.js` can match 375 of the
   corpus's folders; the rest have name forms too short or ambiguous to be safe.
   The way past it is better *name forms in the data*, not looser rules. Both
   other mechanical tiers are exhausted, so the remaining work is writing links
   into lives by hand — `node scripts/link-coverage.mjs --isolated` prints the
   list.

8. **Make `test:lighthouse` usable locally.** It costs eight minutes and fails
   FCP on all four routes on this desk *identically on an unmodified tree*. The
   number a session actually needs is the entry sheet's size, which is a build
   and a `stat`. A flag that checks the sheet and skips the Lighthouse passes.

9. **`scripts/state.sh` should report who holds 4173, 5173 and 5174.** A stray
   server from an earlier sitting makes Playwright refuse to start with no hint
   who holds the port, and makes `contact-sheet.mjs` quietly shoot the wrong
   tree.

10. **Tie a test's name to the prose about it.** `tests/citations.test.mjs`
    checks that a named file exists and that a named path exists, but not that a
    named *test* does, so a renamed test leaves stale headings in
    `docs/SRC-DECISIONS.md`. Asserting that every `### …` heading there resolves
    to a symbol that exists is the same instrument, in two seconds.

11. **`docs/PROBES.md` is the last document with no owner.** 250 lines
    describing four debug scripts, and its table is a hand-copy of
    `package.json`'s own script names. Either generate it or fold it into
    `CLAUDE.md` beside the traps it serves.

### Recorded, deliberately not done

- **Above a 1983 px window** the Daily hero's 40rem ceiling binds and the 5:7
  proportion falls to 0.690 — the top 2% of the range. Recorded, not tuned.
- **41 hymns cite Orloff (1899) or Hapgood (1906).** The other renderings have no
  published English in either book — checked, not assumed. Someone with the
  physical books could still improve on much of this.

---

## 7. Ship scope

**There is no build split yet**, and this section is a goal rather than a record
until there is: `npm run app:sync` is `npm run build && cap sync`, one build,
all five languages and all six routes.

What the app is to ship with: **Romanian and English only**, and **Daily, All
Saints, Prayer, Texts and About** — the Map stays out until it is further
developed. The Prayer tab does not exist yet.

`docs/APP.md` is the store-submission procedure for both shells.
