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
Russian, Romanian, Greek, Serbian — and the reader chooses one. Six pages:
Daily, All Saints, Prayer, Texts, Map, About. Five reading languages: English
plus the four churches' own.

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
| `--ink-faint` | `#675f57` | `#8d837a` | citations and sources: apparatus about apparatus |
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
| `--text-nav` | `11` | the page bar at the foot of a phone |
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
| `.index-controls .facet > :not(summary)` | `0 10px 20px -12px rgb(0 0 0 / 0.6)` — an open filter panel, over the register |
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
| `--side-w` | `clamp(240px, 21vw, 310px)` | `base.css` |
| `--cal-peek` | `24px` | `calendar.css` |
| `--cal-peek` | `44px` | `calendar.css` |
| `--cal-row-h` | `51px` | `calendar.css` |
| `--card-h` | `calc(18 * 1.65 * 17px)` | `calendar.css` |
| `--card-pic` | `clamp(200px, calc((100% - var(--card-gap)) * 5 / 12), 40rem)` | `calendar.css` |
| `--hero-mat` | `14px` | `calendar.css` |
| `--mstep-h` | `24px` | `calendar.css` |
| `--mstep-h` | `32px` | `calendar.css` |
| `--saint-w` | `clamp(230px, 23vw, 360px)` | `calendar.css` |
| `--nav-bar-h` | `0px` | `base.css` |
| `--nav-bar-h` | `calc(52px + env(safe-area-inset-bottom, 0px))` | `base.css` |
| `--ox` | `10px` | `calendar.css` |
| `--ox` | `14px` | `calendar.css` |
| `--rail-fade` | `12px` | `calendar.css` |
| `--mpick-row` | `24px` | `calendar.css` |
| `--cx-w` | `150px` | `index.css` |
| `--cx-w` | `clamp(150px, calc(var(--cx-max-h) * 0.58), 300px)` | `index.css` |
| `--cx-w-text` | `clamp(150px, calc(var(--cx-w) * 0.62), 190px)` | `index.css` |
| `--cx-max-h` | `240px` | `index.css` |
| `--cx-max-h` | `clamp(240px, var(--cx-space, 48vh), 520px)` | `index.css` |
| `--facet-font` | `13.5px` | `index.css` |
| `--facet-pad-y` | `3px` | `index.css` |
| `--facet-h` | `calc(var(--facet-font) * var(--facet-lh) + var(--facet-pad-y) * 2 + 2px)` | `index.css` |
| `--hy-side-w` | `clamp(180px, 16vw, 250px)` | `prayer.css` |
<!-- /copied -->

`--chrome-h-reserve` is declared twice — the header's reserved height at the
two heights it has. One row at every width under 1024 px, measured at 41 px at
320, 360, 445 and 759; the doubled mark past it reserves 52.5.

`--facet-font` is a **type size standing outside the type scale**, which
`design-tokens.test.mjs` cannot see: the rule it enforces is about `font-size`
declarations and this is a custom property that one then reads.

**The breakpoints.** Eleven values across six sheets, and the site has about
four boundaries: ~480–560, ~700–768, 900, and 1024.

<!-- copied: breakpoints -->
| breakpoint | sheets | what it divides |
| --- | --- | --- |
| `max-width: 480px` | `calendar.css`, `saint.css` | the shelf row's feast chip moves ahead of the date rather than wrapping to a third line |
| `max-width: 559.98px` | `base.css`, `calendar.css`, `index.css` | the first-visit choices close up; All Saints' head takes the phone's padding |
| `min-width: 620px` | `calendar.css`, `feast-hero.css` | the week rail's peek and gutter widen; the hero's two columns, which a feast's third box has to be placed into by hand |
| `max-width: 619.98px` | `calendar.css` | the complement |
| `max-width: 699.98px` | `calendar.css` | the full-screen calendar drops to one column — seven columns stop holding a phrase |
| `min-width: 700px` | `calendar.css`, `index.css` | the full-screen calendar's weekday heads; the carousel's own card measure. `views/index/controls.js` opens on cards rather than rows at the same width |
| `max-width: 759px` | `calendar.css` | the day's own chrome gives up its gaps |
| `max-width: 759.98px` | `base.css` | the chrome line gives up its gaps rather than wrapping, and the pages are the bar at the foot of the window |
| `min-width: 760px` | `base.css`, `calendar.css`, `saint.css` | the complement: the masthead returns to the left, and the pages leave the bar at the foot of the window for a row in the header |
| `min-width: 900px` | `calendar.css` | the full-screen calendar gains its periods column beside the month |
| `max-width: 1023.98px` | `calendar.css`, `saint.css` | the day's strip stops being its own scroller; the saint's columns take `pan-y` for the swipe |
| `min-width: 1024px` | `base.css`, `calendar.css`, `prayer.css`, `saint.css` | Daily's four columns, Prayer's three, and every other desk arrangement |
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

**Daily and Prayer are written.** The rest arrive as each route is worked on — a
section nobody has checked against the page is worse than no section. Until
then, `CLAUDE.md`'s "Where things live" table and `docs/SRC-DECISIONS.md` are
what there is.

### Daily

`/` and `/calendar/:date?` · nav key `calendar` · entry `views/calendar.js`

- **Owns** `views/calendar.js`, `views/daily/*`, `styles/calendar.css`,
  `styles/feast-hero.css`
- **Reads** `lib/`: `calendar-page`, `liturgy`, `feasts`, `fixed-feasts`,
  `computus`, `church`, `viewport`, `date-display`, `hero-crop`
- **Specs** `daily-panel`, `daily-picker`, `daily-register`, `daily-stage`

#### Modules

| file | owns |
| --- | --- |
| `calendar.js` | the markup, **which day**, and **which saint**. Nothing in `daily/` calls back into it. |
| `daily/state.js` | the page's one mutable object. **Sole writer.** |
| `daily/entries.js` | who is commemorated on a day, in the chosen church |
| `daily/record.js` | the day's readings and hymns |
| `daily/panel.js` | paints the day into its panels: two below 1024 px, four above it |
| `daily/picker.js` | the week rail **and** the month grid — one control, two grains. The month is one drawing at both widths; the rail is the phone's alone |
| `daily/fullcal.js` | the full-screen calendar |
| `daily/format.js` | dates in the reader's language and reckoning |

#### The box chain

```
html[data-route~='calendar'][data-fills-window]
└ body                               padding-bottom --nav-bar-h (<760), for the page bar
                                     --nav-bar-h is 0 past 760; the bar's own min-height
                                     is the same token, so the reserve cannot outgrow it
  └ main.chrome                      100dvh − --chrome-h, overflow hidden (≥1024)
    └ #view                          height 100%
      └ .cal                         grid: --side-w --saint-w minmax(0,1fr)
        │                            --side-w, full bleed   (≥1024)
        ├ .cal-main [data-col=main]   column 1, laid out by `order`
        │ ├ .cal-head                p.cal-today · ◂ prev · next ▸
        │ │                          h1.cal-date under them (≥1024)
        │ ├ p.cal-liturgy
        │ ├ .slot-viewport[data-slot=main] > .day-panel.day-main
        │ │                          the phone's whole day; not drawn ≥1024
        │ ├ .shelves                 Continue reading
        │ ├ .cal-controls            .cal-jump (month button)
        │ │                          .cal-span → .cal-week | .cal-month
        │ └ .cal-side [data-col=side] > .slot-viewport[data-slot=side]
        │                              > .day-panel.day-side
        │                            readings, name days; hymns below 1024
        ├ .cal-saint [data-col=saint]  column 2, ≥1024 only
        │ └ .slot-viewport[data-slot=saint] > .day-panel.day-saint
        │                            the chosen saint's picture, its credit, and
        │                            Life / Hymns / Writings (a tablist)
        ├ .cal-read [data-col=content] column 3, ≥1024 only
        │ └ .slot-viewport[data-slot=content] > .day-panel.day-content
        │                            name and dates (pinned), then the one
        │                            section chosen: the whole life, the hymns
        │                            or the writings (three tabpanels)
        └ .cal-bubble                 column 4, a plain column
          └ .cal-bubble-scroll       the shelf's scroller
            └ .slot-viewport[data-slot=shelf] > .day-panel.day-shelf
                                     the rest of the day; not drawn below 1024
```

**The document order is the phone's reading order and may not be rearranged
for the desk.** Every wrapper above dissolves to `display: contents` below
1024 px, so a screen reader hears `.cal-main`'s five children in the order they
are written — the date, the day's own saints, Continue reading, the picker,
then the readings and the name days. The desk's arrangement of those five is
`order` in `calendar.css` and costs the document nothing. This is why the
picker and the church's own record are the *last* two children of `.cal-main`
rather than the first two, and why Continue reading stays at the foot of the
day's column instead of joining the register in the shelf.

`ui/face-stage.js` puts a second view in `#view` beside this one for the length
of a page swap.

#### Desktop — 1024 px and up

**Four columns: the day, the saint, what is being read of them, and the rest of
the day.** Choosing a saint in the shelf fills the middle two and moves nothing
else.

- **Each column is its own box and its own scroller**, with `min-height: 0`. A
  grid item's default floor is its content, so without it the box grows to fit
  the day and the page scrolls instead of the column. The mockup this page is
  drawn from records what it costs to miss: a tightening pass left two of its
  four columns at `overflow: visible`, and a thousand pixels of saints had no
  way to be reached. **Inside columns two and three the `.slot-viewport` is
  `flex: none`**: it is a flex item of the scroller, and let shrink it clipped
  the life and the hymns in a box that never scrolls while the column had
  nothing to scroll (`../mockup-review/REVIEW.md` finding 12). Each scroller
  pays its own bottom padding, `--space-4` in the day's column and `--space-6`
  in the other three, so the last line never sits on the column's foot.
- **The page gives up its scroll** (`data-fills-window`). Four scrolling
  columns and a scrolling page are one scrollbar too many.
- **The reading column takes all the slack.** The other three are a width
  apiece and it is `minmax(0, 1fr)`, so the window is spent on the prose.
- **The mockup's tracks** (`../mockup-review/REVIEW.md` finding 5): the two
  outer columns are one width, `--side-w`, and the saint is `--saint-w`, both
  clamps on `vw` — the window rather than the grid, so neither can feed back
  into a scrollbar appearing and disappearing. `--side-w` is base.css's because
  the saint page's search column reads it too.
- **Edge to edge, no gutter.** The four stand shoulder to shoulder with a
  hairline at the leading edge of columns 2–4, and the page's `--page-pad` is
  paid inside the two outer columns rather than around the grid. The grid runs
  the laid-out page's width, which on a desk is the window less the reserved
  scrollbar gutter, so the reading column is that much narrower than the
  mockup's.
- **The day is painted into five panels and rolled as five.** `main` and `side`
  are the phone's pair; `saint`, `content` and `shelf` are the desk's and are
  not painted below 1024 px. A day change steps every panel in the document on
  one animation — a panel left unrolled is a yesterday under a today.
- **The shelf lists the whole day, and the saint in the card leaves it** while
  it is being read: hidden, not dropped from the paint, so nothing is rebuilt
  by a press and no picture is fetched twice. This is the mockup's own
  treatment of a chosen tile and not a stand-in for one.
- **A shelf row is a plate of the saint above their name**, the mockup's
  `day-grid` tile: 3:2 whatever shape the icon is, cropped at 34% of its
  height, a hairline above each tile and none between them, the dates at
  `--text-2xs` and three lines of the life at the same size. **A saint with no
  icon gets no box at all** — the mockup hides the media span in this face and
  draws the type mark only where there is a mount to draw it in, which here is
  the expanded face; the type is still said in words by `registerRow`
  (`../mockup-review/REVIEW.md` findings 7 and 16). It is the `is-cards` face —
  the stored setting keeps the name it had before any of the redraws.
- **The tile chooses; it does not open.** Past 1024 px the name is a
  `<button>` and not a link to the saint's own page, so every part of the tile
  does the one thing — the mockup's "a tile chooses; it does not open". Below
  1024 px there is no column to move a saint into and the name is the row's
  only door, so it is the anchor it has always been; `registerRow` branches on
  `chosen`. The way to a saint's own page from the desk is the chosen saint's
  own column.
- **The column is named by a label, not a heading**: `.register-heading` in the
  shelf head is 12 px of the utility voice, uppercase and tracked 0.08em, which
  is the mockup's `.lbl`. The sidebar's section headings keep the serif.
- **One tile, drawn once.** The plate's declarations carry two selectors — the
  shelf's own `li.reg-card`, which has the register's base rules to outrank,
  and a bare `.day-tile` for anything else that wants the same drawing. The
  second selector has no reader today: Prayer's side lists took it until
  2026-10-02 and now draw All Saints' row card instead (§4 Prayer), which is
  the drawing the author ruled they should share.
- **The head is pinned and carries one rule across the column**, at its own
  bottom edge, which is the edge the saints go under. The shelf's
  `.slot-viewport` takes `overflow: clip` for it: `hidden` would make that box
  the scrollport and the head would stick to a thing that never scrolls.
- **The right column is a plain column** on the page's own ground: no fill, no
  corners (`REVIEW.md` finding 7's container). Its pinned head stands on
  `--gesso` so the saints pass under it.
- **The picker is the month grid**, forced open on arrival, and the week rail is
  hidden. It stands in the day's own column, on the page's own ground.
- **The saint column's picture is the column's width in the icon's own
  shape** (`../mockup-review/REVIEW.md` finding 3): `columnCrop`, which is
  `cardCrop` cut to A4 at the tallest, capped at half the window (the
  author's 2026-09-01 ceiling, where the mockup takes 58vh), drawn from the card
  derivative, no mat, with the credit under it. A saint with no icon has no
  box.
- **Life, Hymns and Writings stand under the picture's credit, and the reading
  column shows the one chosen** (findings 6 and 13): the mockup's `.toc`, over
  one rule, the chosen line in ink with the rubric at its edge and a section
  the saint lacks in `--rule` and not pressable. A vertical tab pattern —
  `role="tablist"` in column 2, a `tabpanel` per section in column 3, all
  three painted and two `hidden`; arrows move and choose, skipping the empty
  ones and wrapping, Home and End go to the ends. **Life is the whole life**,
  rendered as the saint page renders it, with no "Continue reading". Hymns are
  the day's and the saint's, as before. Writings are the folder's
  `text.sources` (Anthony the Great and Paul of Thebes), which the manifest
  does not carry, so that line is disabled until the payload says otherwise and
  a source is fetched only when chosen. The choice is `state.readTab`: kept
  across saints and days, not stored, and a saint without it sends it back to
  Life — the mockup's `pick`. The rubric is the chosen line's `border-left`,
  hung `--space-3` outside the words so the words keep the picture's edge, so
  **column two's `.slot-viewport` is pulled `--space-3` into the column's
  padding and puts its content back with the same padding**: the clip box
  stands on the bar instead of cutting it (`../mockup-review/REVIEW-2.md` N1), and the picture,
  the list and the column keep their widths. The leaving panel is positioned
  against that box and is inset by the same `--space-3`, or a day's roll would
  widen the picture while it ran.
- **The name and its dates head the reading column, pinned** (finding 4): a
  sticky head on `--gesso` over one rule, the life scrolling under it. Its
  `.slot-viewport` is `overflow: clip` for the shelf's reason. The `--space-3`
  between the rule and the first line is the head's margin and paints nothing,
  so the head covers it with a band of `--gesso` (`../mockup-review/REVIEW-2.md` N4): closing
  the gap instead would carry the rule down the column.
- **The day's column in the mockup's order** (findings 2 and 14): the day's own
  name at `--text-2xs`, uppercase and tracked, with the two stepper buttons —
  each half a cross, 24 × 32 — together at the top right of that same line;
  the date under them at `--text-lg`, on one line, from the column's own edge
  to the margin between the columns; the cycle, then the fast; the month; the
  readings; the name days last, in two columns at `--text-sm`. The head scrolls
  with the column and is not pinned.
  **Two of the mockup's type sizes are taken here and nowhere else**: the name
  days' 13 px ("The left sidebar Name Days are meant to be smaller font as per
  the mockup") and the date's 17 px, ruled 2026-09-18 on `REVIEW-2.md`'s
  finding 14. The date wants 254 px spelled in full and the column's measure is
  246 at 1440 and 213 at 1280, so past 1024 px the month is abbreviated as it
  is on a phone; between 560 and 1023.98 px, where the day panel is the width
  of the window, it is still spelled out. The word over the date is *Today*,
  *Yesterday*, *Tomorrow* or the day's own weekday name
  (`daily/format.js`'s `relativeDayWord`), and it is drawn past 1024 px only.
- **The site's header is the same as on every other route** (author,
  2026-09-17): full width, with the calendar, language and theme controls in
  it. `main` takes no top padding here, and the four columns start `--headgap`
  under the bar. The page still does not scroll.

**The view toggle is two marks and no words**: a square for the pictures and
four lines for the other face, drawn at one size so the pair reads as one
control, the live one in `--accent` and the other in `--rule`. The ink is on
the button and the marks are strokes reading `currentColor`. Each button keeps
the word it stands for as an `sr-only` child, which is what actually says which
face is showing.

**The four lines stand for `expanded`, which is the day's own card repeated
rather than a face of rows.** The mockup's pair is a plate face and a 56 px
stamp row face; this page's pair is the plate and the repeated card, and
redrawing the second was not asked for. Said plainly rather than left looking
intentional.

#### Mobile — below 1024 px

- **One column.** Every wrapper dissolves to `display: contents` and `order`
  decides what is seen: picker 0, date 1, liturgy 2, day panel 3, side panel 4,
  shelves 5. The desk's three columns are `display: none` and are not painted.
- **The markup order is the phone's reading order**, which is the constraint the
  desk's column assignments are built around — see the box chain above.
- **The picker opens on the week rail.** The month closes behind it rather than
  being left open under a button that says shut, and the toggle on the row's
  left edge is what swaps them. Past 1024 px there is no choice to make: the
  month is the only grain and the toggle is not drawn.
- **The month, once open, is the desk's month** (author, 2026-10-03: "Mobile
  monthly and desktop monthly: one implementation, one look"). Same cells, the
  same leading and trailing days filling the grid's corners in `--ink-soft`,
  the same feast diamond in the cell's corner, the same accent border on the
  day being read, the same whole month name. What differs is a cell's padding
  and gap (2 px against the desk's 1) and the height of a step (32 px against
  24), because a thumb is not a pointer.
- **A phone is Gregorian throughout, fasts included** (`lib/church.js`
  `calendarFor`): below 1024 px the chosen reckoning is not read, so an Old
  Calendar reader is shown the Dormition Fast on 1–14 August where the desk
  shows them 14–27. One branch to reverse if it ever reads wrong.

  **A test that asserts a church's own calendar therefore has to stand above
  1024 px**, through `desk()` in `e2e/helpers.js`. Twelve do. Re-dating one to
  make it pass at 360 would be asserting the bug.
- The day turns by swiping anywhere on the page (`touch-action: pan-y` on `.cal`,
  dragged by `onGrainDrag`), so there are no day steppers beside the date.
- **There is one hero and it is the page's own choice**: no row is a choosing
  surface, and the hero is filtered out of the register rather than hidden in
  it.
- The reckoning control is not drawn. The month's two steps are: they are the
  month's only stepping at either width since 2026-10-03.
- The rail's cells carry `tabindex="-1"`; the desk's month cells do not.

#### Shared

The two widths are free to diverge except here.

- **The day cells** — the week rail's and the month grid's — are one drawing:
  the same box, numerals, feast mark and fast colour. The feast mark skips
  Sundays at both grains (author, 2026-10-03): every Sunday carries
  resurrection hymns, so a mark drawn on hymns alone lands on all of them.
- **The month is one drawing at both widths, and the week rail is the phone's
  alone.** The two grains no longer share column centres: the month gave up the
  peeked columns that used to inset it to the rail's seven, so its grid runs
  the full width of the control while the rail keeps `--rail-inset` at each
  edge for its half-cut neighbours.
- **The month is stepped up and down** (author, 2026-10-03: "from Oct to Sep is
  an arrow or swipe up above the Oct 2026 print, and conversely an arrow down
  underneath it"). The step up stands above the month's name and the step down
  below it, each a hairline closed by a diamond pointing away from the month it
  leaves. **It is a spinner**: the month before arrives from below, which is
  the only arrangement in which the arrow above the name and a swipe up agree
  while the grid still follows the finger. `SPIN` in `daily/picker.js` is the
  one place that sign is written, and `makeGrain`/`onGrainDrag` take an `axis`.
  `.cal-month` therefore takes `touch-action: pan-x`, so an open month below
  1024 px does not hand the page a vertical scroll; the rail keeps `pan-y`.
- **The hero and the register rows are the same components at both widths.**
  Past 1024 px the hero is taken apart at one seam — its picture into the saint
  column, `heroIdentity` into the reading column's pinned head — and nothing is
  drawn twice to do it. `heroOpening`, the lede and its way in, is the card's
  below 1024 px only; past it the reading column prints the whole life. The register row is one element with one set of classes at
  both widths: what the desk's plate changes is the boxes the same `.reg-card`,
  `.reg-thumb`, `.reg-pic` and `.reg-body` are laid into, inside
  `@media (min-width: 1024px)` and nowhere else. Nothing is rendered twice and
  no phone rule is touched.
- **A feast of the Lord, of the Theotokos or of the angels leads the day over
  every saint of it, and is not clickable.** Eight fixed feasts are records in
  `src/data/feasts-fixed.js` rather than folders in `saints/`, because the
  corpus holds persons: `lib/fixed-feasts.js` resolves each one onto the civil
  day its church keeps it and ranks it above `pickHero`'s answer, and
  `daily/panel.js` prints it as the hero with the saint hero's own classes and
  no anchor — no link, no *continue reading*, no route. Nothing in that file
  reaches the manifest, so no count of saints and no row of the All Saints
  register changes. `styles/feast-hero.css` is the difference in the drawing
  and the only sheet outside `calendar.css` this page wears.

  **It is the day's main card at both widths and it offers nothing to press.**
  The phone paints it as one hero and the desk takes it apart at the hero's own
  seam - icon in the saint column, name, the lede and what the day sings in the
  reading column - which is exactly what a saint's hero does, and the picture
  is measured the same box. What a reader *sees* in place of a way in is the
  line under the name: a saint's prints the office and the years, a feast's
  prints what it is. There is no anchor, no press state and no *continue
  reading* on either width, and the credit under the picture is the one link a
  feast article carries, which leaves the site.

  **A Great Feast with no record of its own is a different day.** Only eight
  have records; the Meeting and the Exaltation are the two of 2026 that do not,
  and on those `emptyDayNote`'s feast sentence still speaks - a note about the
  folders, not about the day. That branch stays and is tested.
- **The tokens.** No raw colour, duration, easing, type size or spacing value in
  `calendar.css`.
- **The derived card box**, per §3's materials rule, with the hero as its one
  exception past 1024 px.

#### Drives

| property | where | decides |
| --- | --- | --- |
| `--side-w` | `:root` in base.css, ≥1024 | the day's column and the shelf; the saint page's search column |
| `--saint-w` | `html[data-route~='calendar']`, ≥1024 | the chosen saint's column |
| `--day-cols` | `.cal`, ≥1024 | the five tracks |
| `--cal-peek` | `calendar.css` | the rail's own inset, which is what shows the days either side half-cut |
| `--cal-row-h` | `calendar.css` | the picker's control row |
| `--mstep-h` | `calendar.css` | the month step's target: 32 px, 24 past 1024 |
| `--card-h`, `--card-pic`, `--card-gap` | `calendar.css` | the register's card face |
| `--hero-shape`, `--hero-focus` | inline per saint, `daily/panel.js` | the hero's crop: `heroCrop` below 1024, `columnCrop` (the icon's own shape, no taller than A4) past it |
| `--hero-mat`, `--hero-r` | `calendar.css`, and inline per saint | the register's expanded mat; the hero's column between 620 and 1024 |

The rest — `--ox`, `--rail-inset`, `--rail-fade`, `--headgap`, `--rulegap`,
`--lede-lines` — are local to one control and are read where they are
declared.

| attribute | set by | read by |
| --- | --- | --- |
| `data-route~='calendar'` | `main.js`, `ui/face-stage.js` | most rules in `calendar.css`. It is a **set, not a value** — face-stage writes both faces into it for the length of a swap, so every rule is `[data-route~=]`. A rule written `[data-route=]` works everywhere except the one second a reader is watching the two faces move. |
| `data-fills-window` | `index.html` before first paint, `main.js` on every navigation | `base.css`, at 1024 px and up |
| `data-fullcal='open'` | `daily/fullcal.js` | 2 rules |
| `data-choose` | `daily/panel.js`, on each shelf row ≥1024 | `calendar.js`'s one delegated press. Not `data-pick`: the reckoning popover's four rows had that name first. |
| `data-read-tab`, `data-read-pane` | `daily/panel.js` `paintReading`, ≥1024 | `calendar.js`'s delegated press and arrow keys, and `showReadTab` |
| `data-slot` | `views/calendar.js` | the five panels, by name, in `calendar.js`'s roll and in `calendar.css` |

**Known coupling.** The route's own rules are what decide one view's inner
boxes — `html[data-route~='calendar'] .hero-media img` — and their specificity
is load-bearing rather than incidental: a rule scoped to a new column and
written `.cal-saint .hero.has-media` is (0,3,0) against the route's (0,3,1) and
silently loses. Scoping the inner ones to `.cal` would make the two faces
independent by construction, but it is a read of each block, never a sweep.

#### Breakpoints

| px | what turns |
| --- | --- |
| 1024 | **the layout break** — one column ↔ four, page scroll surrendered, two grains and a toggle ↔ the month alone, Gregorian ↔ the chosen reckoning, one hero ↔ a shelf to choose from |
| 900 | the full-screen calendar's body |
| 760 | the hero's lede and its *more* control |
| 700 | the full-screen calendar's weekday names |
| 620 | the hero's picture goes beside its text |
| 560 | the picker's control row, the register's ask, the page's own padding |
| 480 | register rows that are not cards |

### Prayer

`/prayer` · nav key `prayer` · entry `views/prayer.js`

- **Owns** `views/prayer.js`, `views/prayer/*`, `styles/prayer.css`,
  `lib/prayer-order.js`
- **Reads** `lib/`: `prayer-order`, `index-filters`, `feasts`, `church`,
  `detail`, `hero-crop`, `honorific`, `calendar-page`, `motion`, `markdown`;
  `ui/`: `hymns`, `grain-drag`, `search-field`, `sheets`, `strings`;
  `views/index/`: `controls` (the shell), `grid` (the row card), `filter`,
  `search`
- **Specs** `prayer.spec.js`, and `index-grid.spec.js` for the shared row

**The whole advanced search is All Saints' own, not a second one** (author,
2026-10-02: "explain to me again why dont we have advanced search in the Prayer
view… And display the same as All Saints page… SSOT"). There was never a
decision behind the difference: `views/index/controls.js` read the All Saints
`state` singleton, so the shell could not be mounted anywhere else. It takes
its host as an argument now, and `views/prayer/find.js` mounts it over this
page's state — the same field, the same six facet chips, the same date range,
the same die, the same `.filter-drop`, and `index.css` loaded for it through
`ui/sheets.js`.

**And it opens with Advanced off, as All Saints does** (author, 2026-10-03: "we
need the exact same search function as saints except the carousel mode is just
normal mode i.e. Advanced search OFF… instead of Saints it says Prayer as the
text at the top"). All Saints has two faces and the word beside its heading
names the one a press would take you to; its off face is the carousel, and
`index.css` folds `.filter-drop` away under `.is-carousel` so that face is the
field and nothing else. **"Just normal mode" is that off face on a page with no
carousel in it**: the hymnal itself, with the facets folded behind one word.

So the fold is one rule for both pages — `find.js`'s `paintAdvanced` writes All
Saints' own `is-carousel` / `is-search` onto the view's box — and the word is
one word: `saints.modeToSearch`, "Advanced search". Only the way back needed a
string of its own, `saints.modeToNormal`, because "Carousel mode" names
something this page does not have. **The panel keeps its DOM folded**, as All
Saints' does: the facets are the filter set's source of truth, so folding is not
clearing, and Clear filters stands outside the fold.

**The page's own name is drawn**, in All Saints' `.index-head` with that word
beside it. It is still the `h1` `main.js` moves focus to; it is no longer
`sr-only`.

**What Prayer's shell deliberately lacks** is the Sort chip and the Detailed
box. The order *is* the book, so a sort control here would mean reordering the
hymnal — `find.js`'s `narrowed` uses `applyFilters`' matched set as a
membership test over the book rather than as an ordering, which is why
`filters.sort` is never read — and there is no grid to detail. The one control
in `.index-foot` is the View chip, which is the face the two asides are listed
in.

**The filters narrow the book, they do not filter a list beside it.** The
arrows step through what is left and the count line says how much that is, so a
reader who has narrowed is reading a shorter hymnal. A name in a margin that
the narrowing excludes is still reachable: the press widens the page back
through the shell's own Clear filters, because a relation is a fact about the
saint and not about the search.

What the two still do *not* share is the index behind the field: All Saints runs
the corpus through `views/index/search.js`, Prayer its own MiniSearch over the
hymnal, handed to `applyFilters` as its `matchesQuery`. The field itself is
`ui/search-field.js` and `styles/search-field.css`, imported by `index.css` and
by `prayer.css` so it cannot depend on which route's sheet a reader loaded
first (author, 2026-09-17: "the search bar should be the exact same as the All
Saints page, not any different. SSOT, repeating designed elements"). Below 1024
px it keeps the taller dress it shipped with — the one exception, and it lives
in the component's own sheet.

**The book opens at the saint of the day** (author, 2026-10-03: "the default
opening page is saint of the day"), which is Daily's own hero — `pickHero` over
the reader's church and today's civil date, read from `lib/calendar-page.js`
rather than restated, so the two pages never disagree about whose day it is.
`lib/prayer-order.js`'s `openingAt` is the rule and carries the measurement
behind its two fallbacks: a hero the hymnal has no hymn for hands the day to the
first saint of it that it does hold, and a day it holds nobody for at all opens
the book at its first page. It opened at that first page until this ruling.

**The page is the saints the corpus has a hymn for, one at a time.** A card
keys `hymned: [...churches]` and the hymn text stays in the saint's own folder,
so the page's whole corpus is `cards.filter(c => c.hymned?.length)` and the text
is a fetch per saint. `scripts/build-manifest.mjs` prints how many that is.

#### Modules

| file | owns |
| --- | --- |
| `prayer.js` | the markup, the two arrows, the swipe, and the wiring between the other three |
| `prayer/state.js` | the page's one mutable object. **Sole writer**, except `detail`, which `asides.js` writes when the payload lands |
| `prayer/card.js` | the saint in hand: the picture, the name, the hymns, the fade, and which arrows are live |
| `prayer/asides.js` | both columns, their two faces, and the rows in them |
| `prayer/find.js` | the field, its index, the count line, and the face switch |
| `lib/prayer-order.js` | pure: `hymnedSaints`, `stepOrder`, `neighboursAt`, `relatedFor`, `sameDayFor` |

#### The box chain

```
html[data-route~='prayer'][data-fills-window]
└ body                             padding-bottom --nav-bar-h (<760), for the page bar
  └ main.chrome                    100dvh − --chrome-h, overflow hidden (≥1024)
    └ #view                        height 100%
      └ .hymnal                    flex column; height 100%, full bleed (≥1024)
        │                          touch-action: pan-y — the swipe
        ├ .index-head              All Saints' head row, drawn since 2026-10-03
        │ ├ h1                     the page's name, and the route's focus target
        │ └ button[data-mode-toggle]  the one word that opens the facets; no
        │                          Shuffle beside it, there being no sort here
        ├ .sticky-sentinel         All Saints' own, and inert here: this page
        │                          does not scroll past its own shell
        ├ .index-controls          All Saints' advanced search, mounted whole
        │ │                        (`views/index/controls.js`, `index.css`);
        │ │                        this sheet sets only `flex: none` and the
        │ │                        page's own side gutter
        │ ├ .index-row             the field and Clear filters
        │ │ └ input.search-field   `[data-query]` (`ui/search-field.js`)
        │ └ .filter-drop           **folded unless Advanced is on**, by
        │                          `index.css`'s own `.is-carousel` rule.
        │                          .facets — Calendar, Feast month, Type,
        │                          Gender, Region, Historicity, Dates, the die
        │                          — and .index-foot, which holds **only** the
        │                          View chip: no Sort, because the order is the
        │                          book, and no Detailed, because there is no
        │                          grid to detail
        ├ p#hy-count               aria-live: what the filters left
        └ .hy-body                 grid: --hy-side-w minmax(0,1fr) --hy-side-w
          │                        (≥1024); a plain block below it
          ├ .hy-view#hy-view       row 1, column 2. The positioning context
          │ │                      for the arrows, and the two dividers are its
          │ │                      own inline borders
          │ ├ button#hy-prev       ≥1024 only
          │ ├ .hy-hold#hy-hold     the box the fade animates; the card is
          │ │ │                    rewritten inside it
          │ │ └ article.hy-saint   grid: 4fr 6fr (≥1024); data-slug
          │ │   ├ .hy-pic          picture, its credit (≥1024), name, dates,
          │ │   │                  the life's first line clamped to
          │ │   │                  --hy-lede-lines
          │ │   └ .hy-hymns        `ui/hymns.js`'s markup; the only scroller
          │ │                      for the text at the desk
          │ └ button#hy-next       ≥1024 only
          ├ aside#hy-related       row 1, column 1 — by placement, not source
          └ aside#hy-sameday       row 1, column 3
```

**The document order is the phone's reading order**, as it is on Daily, and
this page pays less for it: the field, the saint, who they are recorded with,
who shares their day is both the reading order and the source order, so the
phone needs no `display: contents` and no `order`. What the desk does is move
`#hy-related` back into column 1 by hand. Dissolving the wrappers below 1024 px
was tried and `prayer.spec.js`'s five readings at that width were identical
with it and without, so the rule is not there.

`ui/face-stage.js` is not involved: `main.js`'s `faceOf` returns null for this
view, so Prayer is never one of the two faces that share `#view` during a swap.
It still reads `[data-route~=]` and never `[data-route=]`, because face-stage
writes two tokens into that attribute for the length of a swap between the other
two.

#### Desktop — 1024 px and up

**Three columns: who the saint is recorded with, the saint, who shares their
day.** The middle is the page and the two outside it are its margins.

- **Each column is its own box and its own scroller**, with `min-height: 0`,
  and the page gives up its scroll (`data-fills-window`, a ≥1024 rule in
  `base.css`). The wheel belongs to the hymn: at prayer, a troparion longer
  than its box is the one moment the reader is certain to be scrolling. The
  hymn box is `tabindex="0"` and a named region, because a scroller a keyboard
  cannot reach is one nobody can read to the end of.
- **All three are placed on row 1 by hand.** Naming only a column leaves grid
  auto-placement to the rows, and it never goes backwards: the saint takes row
  1 column 2 and the aside that follows it in the document and wants column 1
  is put in row 2, with the same-day column after it. The page then reads as
  the saint above two lists.
- **The dividers are the middle column's own `border-inline`**, so neither
  aside has to know it has a neighbour.
- **The two asides are one width apiece and the saint takes the slack** —
  `--hy-side-w` either side of `minmax(0, 1fr)`, a clamp on `vw` so neither can
  feed back into a scrollbar appearing and disappearing.
- **Edge to edge, no gutter**, as on Daily and for the same reason. `.hymnal`
  runs the laid-out page's full width — `margin-inline: calc(var(--page-pad) *
  -1)` against the padding `#view` pays on every route — and `--page-pad` is
  paid inside the two asides and inside the find row instead, once. That puts
  the asides' content and the field's left edge on one line, which is where the
  mockup puts them. The laid-out page on a desk is the window less the reserved
  scrollbar gutter, so the middle column is that much narrower than the
  mockup's, exactly as Daily's reading column is.
- **The pair inside the card is 4 / 6**, picture to hymns: the hymn is what the
  reader came for and the icon is what they are looking at while they read it.
- **The hymn is set at `--text-lede`, italic** — the mockup's 19 px
  (`REVIEW-2.md` finding 17, ruled 2026-09-18), against the site's 17 px
  upright reading voice, because on this page the hymn is not prose among
  prose but quoted song with a reader standing in front of it. The same
  `.hymn-text` on the saint's page, in Daily's Hymns tab and on a phone keeps
  the reading voice: the rule is `html[data-route~='prayer'] .hy-hymns`'s and
  lives inside the 1024 px query.
- **The arrows are absolute inside the middle column**, over the content, at
  its two edges. In the flow they would take a line of every screen.
- **Each aside's heading is sticky at the top of its own column**, on
  `--gesso`, over a rule. Sticky only here, because only here is the aside a
  scroller of its own.

#### Mobile — below 1024 px

- **One column, in the source's own order**: the field, the saint, recorded
  with, kept the same day. Nothing is reordered and nothing dissolves.
- **The find row is two lines.** The count and the two marks are fixed and the
  field is whatever is left, which on one line at 360 px is too few characters
  for a reader to see what they typed — `prayer.css` has the measurement. So
  the field takes the first line and the count and the marks take the second.
- **The arrows are not drawn.** They are absolute inside a column that is not a
  box at this width. The page turns by being swiped, which is Daily's answer to
  the same question and the same primitive (`ui/grain-drag.js`).
- The three regions keep the page's own scroll: `data-fills-window` is a ≥1024
  rule, so there is one scrollbar and it is the window's.

#### Shared

The two widths are free to diverge except here.

- **The life's opening keeps its height before it arrives.** It is filled from
  the saint's own folder a moment after the card is drawn, into a flex column
  whose picture is allowed to shrink — so a lede growing from nothing took
  338 px off the icon above it and moved the card, the columns and everything
  in them. It is clamped to `--hy-lede-lines` — four on a phone and six past
  1024 px, the mockup's own depth (`REVIEW-2.md` N2) — and given that height
  from the start, and the asides are drawn once, when the folder answers,
  rather than twice: on a phone they stand under a card that fills from the
  same fetch, so drawing them early bought nothing and cost a jolt. **The
  picture's credit keeps its line the same way**: it is Daily's column-2
  credit, the same `ui/credit.js` line, drawn empty above the name whenever the
  card has a picture and filled from the folder with the life (`REVIEW-2.md`
  N3). It is drawn past 1024 px only, as the mockup's is.
- **The saint changes by a fade and nothing travels.** It is a Web Animations
  fade whose `finished` drives the swap — not a CSS transition and not a timer.
  A transition was measured on this desk and did not start at all on one press
  in six, and the fallback timer a missing start needs can catch a late one
  mid-flight and redraw the card at a third of its opacity, which is the
  mockup's own bug. **Reduced motion removes the fade, never shortens it** (§3).
- **The swipe is bound at both widths** and turns the page in the same
  direction Daily turns a day: leftward is onward. `onGrainDrag` answers touch
  and pen and refuses a mouse, so a desk without a touchscreen never reaches it.
  The whole shell is excluded by name — a finger dragging through the field is
  selecting text in it, and a facet panel is a sheet to scroll.
- **The rows in the two asides are All Saints' row card** (author, 2026-10-02:
  "The 'Recorded with' and 'Kept the same day' rows should have the same design
  as the all saints entries advanced search mode row cards. Dont know why they
  are so different. SSOT"). `views/index/grid.js`'s `card()` draws them, in its
  row shape and its card shape, and the face chip in the shell is that page's
  View chip over the same two words — so the two faces here *are* All Saints'
  two faces and there is one drawing rather than the three there were.
  `index.css` is loaded by this route for it (`ui/sheets.js`).
- **The row and its door are two elements.** An All Saints row wraps the name
  in a link to the saint's own page; a row here is a door into the hymnal, so
  `card()` takes the door from the caller and `asides.js` supplies it. The
  `<li class="index-card">` carries `data-slug`; the `.index-name` inside it is
  the `<button data-go>`, the `<a href>` past 1024 px, or the disabled button
  below it. `.index-name::after` covers the card, so the press is still the
  whole row and there is still one keyboard stop per saint.
- **The card face is the row card detailed**: a cropped plate, the name, the
  line, and three lines of the life behind `[data-desc]`. **No picture, no
  box** — the shared card emits no media at all for a saint with no icon, where
  this page used to paint a `--mount` block under every one of them.
- **The line under the name is the day in the same-day column and the dates in
  the recorded-with one**: one column is a day and says so, the other is a
  relation and says who they were. `Intl` formats the day, so there is nothing
  new in the packs.
- **Below 1024 px the page opens on the names**, which is a reading of the
  corpus and not a preference — only about a seventh of the corpus carries an
  icon and these columns name saints from the whole of it, so a Pictures face
  of empty mats reads as a page that failed to load. A row whose saint has no
  icon keeps its plate at that width for the same reason.
- **Every name opens something past 1024 px.** A saint the hymnal holds is a
  `<button>` carrying `data-go` and opens here, in place; one it does not is an
  `<a>` to their own page. Two doors, two elements, and `data-go` still says
  only "this page can reach them". **Below 1024 px a row the hymnal does not
  hold is still the inert button it shipped with** — §6 carries that half.
- **A saint the hymnal does not hold is dimmed, and the dim is legible.**
  `opacity: 0.65` on the row, and its two small lines take `--ink` inside it:
  the mockup's 0.45 is affordable on an inert tile and not on a live one —
  `--ink` at .45 is 2.69:1 in day and 3.60:1 in vigil, and `--ink-soft` clears
  4.5:1 at no useful depth. The author ruled on 2026-09-18 that the mockup's
  value be taken if the floor allowed it; it does not, so the page stands at
  the lowest hundredth that passes both themes.
  **The ground is `--field`, not `--gesso`** (2026-10-03): these rows became
  `.panel` cards on 2026-10-02 and a panel stands on `--field`, which is darker,
  so .64 fell to 4.46:1 in day and the value is .65 — **4.59:1 in day and
  5.96:1 in vigil**, printed by `prayer.spec.js`'s own arithmetic.
- **The field narrows the book itself**, so the arrows step through what the
  query left and the count line is that book's length. It searches the names,
  the line of office and dates, and the names of whoever the corpus records the
  saint with — never the hymn text, which would be a fetch per saint in the
  hymnal to answer one keystroke. A name pressed in an aside that the query
  excludes clears the field rather than refusing the press.
- **The shown saint, its two neighbours, and — past 1024 px — the saints the
  two margins name**, through `lib/detail.js`'s `loadDetail` and `prefetch`.
  The third group is the tile's three lines of life, four requests at a time
  and none of it below 1024 px, which is the same arrangement and the same
  ceiling Daily's shelf uses for the same drawing. Lighthouse's own run is a
  360 px phone, so the gate never sees it.
- **The tokens.** No raw colour, duration, easing, type size or spacing value in
  `prayer.css`.

#### Drives

| property | where | decides |
| --- | --- | --- |
| `--hy-side-w` | `.hy-body`, ≥1024 | both asides' width — wide enough for a name over two lines, never wide enough to compete with the saint |
| `--hy-aspect`, `--hy-focus` | inline per picture, from `lib/hero-crop.js` | the icon's clamped shape and where it is cropped, the same silhouette the Daily rows and the Index's cards give it |

| attribute | set by | read by |
| --- | --- | --- |
| `data-route~='prayer'` | `main.js` | every rule in `prayer.css`. A **set, not a value** — see the box chain |
| `data-fills-window` | `index.html` before first paint, `main.js` on every navigation | `base.css`, at 1024 px and up. `index.html`'s pre-paint classifier **names this route**, so the first frame is not laid out as the calendar |
| `data-slug` | `card.js` on `article.hy-saint`, `asides.js` on every row | `prayer.spec.js`, and the card's own staleness check |
| `data-go` | `asides.js`, on a row this page can reach | `prayer.js`'s one delegated press. Two attributes and not one, so "who is named here" and "where can this go" are separate questions. A row without it carries an `href` instead past 1024 px |
| `data-desc` | `views/index/grid.js`'s `card()`, on a detailed row's description box | `asides.js`'s `fillLives` here, which fills it from the saint's folder four at a time under the page's generation guard and leaves it `hidden` if nothing arrives; All Saints' own `fillDescription` there |
| `data-iso` | `asides.js` on `#hy-sameday` | the civil day the aside resolved, for the year it resolved it in |
| `data-query`, `data-clear`, `data-random`, `name="layout"` | `views/index/controls.js` | the shell's own field, Clear filters, the die and the View chip. `find.js` reads none of them directly — `wireControls` is handed this page's state and calls back |
| `data-mode-toggle`, `data-mode-label` | `views/prayer.js`'s own markup | `find.js`'s `paintAdvanced`. All Saints' own two attributes, wired here rather than through `wireControls`'s `modeToggle`: that one calls `switchMode`, which is the other page's two faces and its state singleton |

#### Breakpoints

| px | what turns |
| --- | --- |
| 1024 | **the layout break** — one column ↔ three, page scroll surrendered, the arrows drawn, the find row on one line, the asides become scrollers with sticky heads, and the margins take Daily's tile, the day under the name and a door on every row |

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
- Below 760 px the pages are a **bar fixed to the foot of the window**, six
  equal cells in the site's own order; at 760 and above, a plain row in the
  header. The header is one row at every width.
- One real link per page — **never cloned**, and never reordered in the DOM.
- `body` reserves the bar's height below 760 px, so no page ends under it.

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

2. **Scope the Daily page's 82 root-attribute rules to `.cal`.** §4's known
   coupling. It makes the two faces independent by construction, and it is
   ~1.6 kB off the entry sheet as well.

3. **Prayer's margins below 1024 px still hold inert names.** Every name opens
   something past 1024 px (§4 Prayer, stage I of the mockup review), because
   the review, the mockup and the author's instruction are all the desk and the
   standing rule for that pass was that mobile does not move. The phone's own
   half is therefore open: a saint the hymnal does not hold is a `<button
   disabled>` painted `--rule`, which is 84 of 116 names over the twelve saints
   the review walked. The fix is the same ruling applied at that width and the
   dim it needs to be legible; it will move the phone's pixels, which is why it
   is an item and not a side effect.

4. **A roving tabindex on the month grid.** 35 of 82 focusable elements on a
   desk are the month's day cells. Invisible to touch; it bites a keyboard and,
   more sharply, a screen reader. `picker.js:968` is the line that omits it.

5. **The shelf-swipe test flakes about 1 run in 8.** The author ruled that the
   swipe behaves correctly, so the page is right and **the test is wrong** — it
   asserts a gesture it cannot reliably perform and should drive the drag at a
   fixed velocity instead of eight `mouse.move` steps. Until then CI retries
   hide it, which is how a flake here once masked a 16/16 regression.

6. **No hymn has a rendering in Russian, Romanian, Greek or Serbian.** English
   is complete in both halves of the build — the corpus's own hymns and the
   feast hymns of `src/data/liturgical-days.js` — and the other four packs get
   the source's own tongue, which is theirs only where the source happens to be
   in it. `node scripts/hymn-language-sweep.mjs` prints the size of it per
   calendar and per language, and **Church Slavonic is not Russian and not
   Serbian** (author, 2026-09-17), so a Slavonic original is a fallback for
   both.

   **A rendering beats a citation** (author, 2026-10-02: "I just want to get
   rid of Orloff and use the English translations of the Romanian, Greek,
   Russian or Serbian hymns"). The rule ran the other way while the corpus had
   few renderings of its own, and it put Orloff's *General Menaion* (1899)
   under 50 hymns: a book of **general** services, whose text is the common of
   apostles or hieromartyrs rather than the hymn beside it, and which prints
   "(mentioned by name)" where the saint's name belongs — 40 of the 50. The
   folders' own originals name the saint outright, so every one of the 50 is
   now rendered from the text it stands beside. Hapgood's *Service Book* (1906)
   keeps its 2, being the hymn itself rather than a common.

7. **Done, 2026-10-02: the 40 "(mentioned by name)" renderings are gone**,
   with the other 10 Orloff citations beside them. They were his placeholder
   for the name a general service leaves to the server, and a reader meeting
   "O holy apostle (mentioned by name)" was being shown the rubric rather than
   the hymn. All 50 are rendered from each folder's own original — Greek 13,
   Romanian 21, Church Slavonic 15, Serbian 1 — in the register that language's
   existing renderings use. `grep -ri orloff saints/` returns nothing.

8. **Raise the cross-linker's ceiling.** `lib/cross-link.js` can match 375 of the
   corpus's folders; the rest have name forms too short or ambiguous to be safe.
   The way past it is better *name forms in the data*, not looser rules. Both
   other mechanical tiers are exhausted, so the remaining work is writing links
   into lives by hand — `node scripts/link-coverage.mjs --isolated` prints the
   list.

9. **Make `test:lighthouse` usable locally.** It costs eight minutes and fails
   FCP on all four routes on this desk *identically on an unmodified tree*. The
   number a session actually needs is the entry sheet's size, which is a build
   and a `stat`. A flag that checks the sheet and skips the Lighthouse passes.

10. **`scripts/state.sh` should report who holds 4173, 5173 and 5174.** A stray
   server from an earlier sitting makes Playwright refuse to start with no hint
   who holds the port, and makes `contact-sheet.mjs` quietly shoot the wrong
   tree.

11. **Tie a test's name to the prose about it.** `tests/citations.test.mjs`
    checks that a named file exists and that a named path exists, but not that a
    named *test* does, so a renamed test leaves stale headings in
    `docs/SRC-DECISIONS.md`. Asserting that every `### …` heading there resolves
    to a symbol that exists is the same instrument, in two seconds.

12. **`docs/PROBES.md` is the last document with no owner.** 250 lines
    describing four debug scripts, and its table is a hand-copy of
    `package.json`'s own script names. Either generate it or fold it into
    `CLAUDE.md` beside the traps it serves.

13. **A church may keep a saint on two days, and the corpus has not finished
    saying so.** The code half is done (2026-10-03): the schema never forbade a
    second attestation for one church and `buildFeastIndex` always looped them,
    so what was wrong was four readers, and all four read
    `lib/church.js`'s `attestationsIn` / `attestationsByChurch` /
    `churchStatus` now. The saint page's veneration table keeps one row per
    church and puts the second day on it, with its own note and its own
    citation.

    What is left is the corpus pass, and it is larger than the three apostles
    it was first described by. Where a church kept a second day the sourcer
    recorded it as a *note* on the first row, and nothing renders on the
    second. The three apostles of the Synaxis of the Twelve are written —
    Matthew's Romanian 16 noiembrie, Andrew the First-Called's 30 noiembrie and
    Philip's 14 noiembrie — and **33 attestation notes still carry a second day
    that renders nowhere**, which `grep -rl "one feast to a church" saints/`
    finds. They are not all the apostles' shape: some are a translation of
    relics against a repose, some are a second day on the saint's own page, and
    a few are the Greek day of a saint whose Romanian day is already doubled.
    Every note names the day and the saint, so nothing has to be re-read — but
    the day's own page is the citation and is read before it is written, and the
    first row's note is corrected in the same commit, because it states the dead
    premise that the corpus keeps one feast to a church.

14. **Six e2e fixtures still narrow as the Russian and Serbian reading waves
    fill the calendar; the three that died are made rather than found.** The
    sweep of 2026-10-03 replaced every e2e premise selected by *proxy* — a
    literal naming a slug, or a pixel read where a state was meant. What it
    could not replace was a *computed* fixture whose search runs out, and three
    of those needed a church that kept **nobody** on a civil day, which no
    calendar will have once the waves finish.

    **Done, 2026-10-03, before the wave rather than during it.** All three now
    make the silence with `withoutSaintsOn`, which withholds a day's saints from
    the manifest the page is served: `dayOneChurchKeeps` became
    `dayOneChurchKeepsMade`, which takes a saint one church keeps and no other
    calendar does and leaves the rest of the day to the caller to withhold;
    `dayOneElsewhereMade` no longer asks the day to be empty for the reader's
    church, because its own withholding makes it so; and
    `dayKeptOnlyElsewhere`, which the second of those superseded, is deleted
    with its last caller gone. `withoutSaintsOn` moved from
    `daily-panel.spec.js` into `e2e/helpers.js`, since `chrome.spec.js` needs it
    too, and all four fixtures answer for all four churches now where two of the
    old argument pairs already threw.

    What remains is the half that only narrows, and none of it lies when it runs
    out — each throws rather than hand back a premise of the wrong shape:
    `notKeptBy` (an `undocumented` row *and* exactly one venerating church, both
    halves eroded at once), `WITHOUT_HYMNS`, `dayWithoutHymns`, `NO_RU_NAME`,
    `SPARSE_DETAIL` and `feastWithoutFolders`. A saint without a hymn or without
    a Russian name cannot be made by withholding — it wants the card itself
    rewritten — so the repair for these is to serve a doctored card when the
    search finally fails, and until it fails the search is the better premise.

### Recorded, deliberately not done

- **2 hymns cite Hapgood (1906).** Everything else the corpus prints in English
  is its own rendering of the text beside it. Orloff's 50 were replaced on
  2026-10-02; the reasoning is under the hymns rule above.

---

## 7. Ship scope

**There is no build split yet**, and this section is a goal rather than a record
until there is: `npm run app:sync` is `npm run build && cap sync`, one build,
all five languages and all six routes.

What the app is to ship with: **Romanian and English only**, and **Daily, All
Saints, Prayer and About** (author, 3 October 2026) — the Map and Texts both
stay out of the first release.

**About answers for the app, not only for the site.** It is the privacy policy
both consoles are pointed at and the content-rights answer both ask for, so it
carries: that the project is not affiliated with any church it reports on;
where the pictures come from and under which licences, counted from the
corpus; and a privacy section that names the app beside the website.
`tests/about-claims.test.mjs` pins the two sentences that are claims about
what the corpus does *not* hold, because no number on the page can keep those
true.

**Export and import are gone, and brief §11 is overruled** (author, 3 October
2026). Nothing requires them: a portability right runs against whoever holds
the data, and the reader's own browser holds all of it. `store.exportData` and
`importData` stay in `lib/store.js`, tested and uncalled. The libraries'
notices moved to `public/third-party-licences.txt`, which is what MIT and ISC
ask for - the notice travels with the software, not on a page.

**A paragraph about a page the build does not ship is not printed.** The Texts
sentence and the map's own credit are asked of `router.has`, so dropping a
route is the only edit the split will need on this page.

**Nothing ships until all four calendars are filled** (author, 4 October
2026). `scripts/ship-gate-days.mjs` is the gate's own instrument and the only
number anyone should quote, because a day is covered by *either* a venerated
attestation carrying a feast day or one of the eight records in
`data/feasts-fixed.js` - those eight cannot be saint folders, their subject is
not a person who lived on earth, and `lib/fixed-feasts.js` makes the feast lead
its day over any saint of it. A count taken from `saints/` alone reports the
Nativity, Theophany, Annunciation, Transfiguration, Dormition, the Theotokos's
Nativity and Entry and the Synaxis of the Archangels as empty days, which is
how the first figures written here came to be wrong by eight.

Measured on the evening of 4 October, after the first corpus batches:

| church | days carrying somebody | empty |
| --- | --- | --- |
| romanian | 366 of 366 | **0 - closed** |
| greek | 365 of 366 | **1** |
| russian | 115 of 366 | 251 |
| serbian | 84 of 366 | 282 |

Greek's one is **29 February**, which no civil year in Daily's runway prints;
saint.gr/02/29 exists for whoever wants to close it. The two Slavic calendars
are the work, and they are corpus work rather than image work -
`heroless.mjs` reports almost nothing imageless for them only because they have
so few days to lead. `docs/CORPUS.md` is the protocol; the gate script prints
each church's remaining days in that church's own reckoning, Julian for the
Russian and the Serbian.

`docs/APP.md` is the store-submission procedure for both shells.
