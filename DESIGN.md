# DESIGN.md — Gallery of Saints

The binding design document, written before any component CSS, per the brief
(§14). Where this document pins a value, build to it exactly. Where it is
silent, decide in its spirit and record the decision here.

Revised 2026-08-20 for Addendum A, which supersedes the brief where they
disagree. The visible changes: refusal cells in the badge are hollow at full
cell size (the brief's pale-grey fill is superseded); the uncertainty curve and
its three constants are pinned here (§6b); cards derive their box from
manifest-carried image dimensions rather than a fixed frame (§5); the calendar
gains a saint-of-the-day hero with a slot transition (§5b); and line boxes are
derived from font metrics at build time so script fallback cannot move layout
(§4).

---

## 1. The concept: panel and register

Two source materials govern everything, because they are the two things this
site actually is.

**The icon panel.** A traditional icon is painted on a board with a recessed
centre field (the *kovcheg*, "ark") surrounded by a raised integral border. The
ground is gold leaf burnished over a red-brown clay called *bole*; where the
gold wears at the edges, the bole shows through. Saints on this site live in
panels: a card is a recessed field with an integral border, not a floating
rectangle with a drop shadow.

**The martyrology register.** A martyrology or synaxarium is a ruled book
organised by day: the date, then the entries, one tradition's voice at a time,
with red — the *rubric* — marking what the reader must not miss. Lists on this
site are registers: ruled day-by-day columns where red marks liturgical time.

Restraint is the register's; warmth is the panel's. Ornament would read as
costume, so there is none.

## 2. The one bold thing

**Gold appears in exactly one place: the veneration badge.**

In an icon, gold ground is not decoration — it marks sanctity, and nothing else
gets it. Here, the gold token is reserved for attested-veneration cells in the
badge (§7). No heading, link, button, border, hover state or flourish may ever
use it. The badge is the signature element precisely because it is the only
place the palette's most precious material is spent. Everything around it stays
quiet on purpose; that quiet is the badge's frame.

A parallel discipline for red: **rubric marks liturgical time and the reader's
place, nothing else.** Today in the week strip, a feast marker, the current
page in the nav — the "red-letter day" idiom doing literal work. Red is never a
generic accent, an error colour (errors are ink, stated plainly in words), or a
decoration.

## 3. Colour tokens

Six named colours, all drawn from the materials of panel and book. Every colour
in the CSS goes through these custom properties; hard-coded values are a defect.

| Token | Light ("day") | Dark ("vigil") | Material | Role |
|---|---|---|---|---|
| `--gesso` | `#FBFAF7` | `#1A1412` | gesso ground / bole clay | page and surface background |
| `--ink` | `#221D19` | `#EDE6DC` | walnut ink | text, icons |
| `--ink-soft` | `#6B6259` | `#A89C8F` | diluted ink | secondary text, captions |
| `--rubric` | `#8A2E26` | `#C05B4B` | cinnabar rubric | liturgical time, current place (§2) |
| `--gold` | `#A98237` | `#C79A4B` | burnished leaf | veneration badge only (§2) |
| `--rule` | `#DCD5C9` | `#3A2F29` | ruled line | separators, borders, skeletons |

Derived surfaces (not new hues, just mixes of the six):
`--field` — the recessed card interior: in light, gesso darkened ~3%
(`#F4F1EA` is *banned* as a page colour by the brief; as a barely-different
inset on gesso it reads as depth, not as the cream-site cliché — the page
itself is never this colour); in dark, bole lifted ~4% (`#231A17`).
`--veil` — `--gesso` at 80% alpha, for the loading veil.

**Dark is not an inversion.** Vigil mode's ground is bole — the warm red-brown
under gold leaf — because the icon photography is gold-heavy and warm, and it
must sit *in* the surface, not glow out of a black void. No pure black
anywhere; the darkest value in the system is `#1A1412`.

Contrast (checked): ink/gesso 15.6:1 light, 13.1:1 dark. ink-soft ≥ 5.4:1 both
modes. rubric on gesso 8.8:1 light, 5.1:1 dark — safe for text at any size.
gold is **never used for text** and never carries information alone (§7).

Theme is three-way — light / dark / system, defaulting to system — set by an
inline script before first paint. Theme changes transition background and text
colour over 300 ms; nothing else transitions on theme change, and `transition:
all` is banned everywhere.

## 4. Type: three voices, two families

| Voice | Face | Use |
|---|---|---|
| **Display** | Literata, optical size high, weight 500, tracking −1% | page titles, saints' names, day headings |
| **Body** | Literata, text optical size, weight 400 | lives, sources, all reading text |
| **Utility** | system grotesque: `system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | nav, filters, counts, labels, buttons |

Literata is a serious book face made for long reading on screens, with real
Greek (including polytonic) and Cyrillic — this corpus contains Ἀθανάσιος and
Мойсей on page one, so script coverage is a requirement, not a nicety. It is a
variable font, so one file per style covers display and body through the
optical-size axis. Self-hosted WOFF2, subset to latin + greek + cyrillic;
scripts beyond those (Coptic, Syriac, Ge'ez name forms) fall through to system
fonts by design. `font-display: optional` — on a cold slow load the fallback
stack (`"Iowan Old Style", "Palatino Linotype", Georgia, serif`) renders and
*stays*, because zero layout shift outranks brand on first visit; the webfont
arrives from cache on every visit after.

The utility voice is deliberately the reader's own system stack: chrome should
feel native and cost zero bytes, and it keeps the serif meaningful — Literata
is the voice of the *content*, and only the content. Dates and counts set
`font-variant-numeric: tabular-nums`.

**Script coverage is a hard requirement, not a nicety** — the multi-script name
forms (Ἁγνή, Мойсей, Ⲁⲛⲧⲱⲛⲓⲟⲥ, ܢܣܛܘܪܝܘܣ) are how "attest, never adjudicate"
actually appears on screen. Coverage as shipped: Literata carries Latin,
Latin-ext, Greek including polytonic, and Cyrillic. Coptic, Syriac, Armenian
and Ge'ez fall through the stack to system fonts (Windows: Segoe UI Historic;
macOS/iOS and Android: their Noto equivalents) — rendered, always, even where
the face is not ours to choose.

Because fallback faces have their own vertical metrics, any line containing
them could grow. Two defences, both build-derived rather than hand-tuned:
line-box custom properties are extracted from the actual font files by
`scripts/font-metrics.mjs` (capsize-style: cap height, ascent, descent as
em-ratios, emitted to `src/styles/metrics.css` — changing typeface recalculates
instead of forcing a re-measure), and the `names` array renders in a `.names`
class with `line-height` bounded so substitution can never push the box.

Scale (px at default root): body 17/1.65 with `max-width: 65ch`; caption/utility
13.5/1.45; h3 21, h2 26, h1 `clamp(28px, 5vw, 40px)`. Small caps
(`font-variant-caps: small-caps`, letterspaced 6%) for register headings — the
month name over a day column, a church's name over its entries.

## 5. Layout

**Space:** 4 px base; steps 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Content column
`72ch` max, centred; reading text `65ch`.

**Corners:** crisp. Panels 4 px radius, badge cells 1 px, buttons 4 px. (The
brief bans the broadsheet *combination* — hairlines everywhere + zero radius +
that palette. We are near that territory, deliberately, and step away from it
through warm materials, the recessed field, and rules used only where a
register genuinely rules a line: under a day heading, between traditions.)

**The panel (card):** recessed field on `--field`, 1 px `--rule` border,
**no drop shadows** — depth comes from the field being slightly darker than
the page, as a kovcheg is. Padding 16. Image, then name in display voice, then
the badge. Hover: border darkens toward `--ink-soft`; nothing moves or lifts.

**The Index has two layouts**, chosen by the reader and remembered (added
2026-08-21). *Cards* is the panel described above: image at the manifest's
aspect ratio, name and glyph beneath. *Rows* is the register at card weight —
a square 48 px thumbnail at the left, the name and its glyph to the right of
it, dates below, on a fixed 66 px pitch. Rows exist because a corpus is
something you scan as well as something you look at, and because a fixed pitch
is the tightest a virtualised list can honestly be. Both are exact heights
known before render; neither measures.

**The card box is derived, not fixed.** The manifest carries each image's
pixel dimensions; the card sets `aspect-ratio` from that data, so the box is
reserved before a byte of image arrives and the no-layout-shift rule is
satisfied at the source. The skeleton fill inside the reserved box is the
image's own blurred placeholder (`icon-thumb.jpg`), not a grey rectangle —
already intentional, already the right colours. Variable heights are fine
everywhere except the River, which normalises to a single card box: equal size
is doing that mode's equality-of-standing work.

**The register (list):** a day heading in small caps with the date, a single
rule beneath it, entries grouped by church with the church's name in small-caps
utility and each tradition's own title for the saint in body italic. Today's
date is set in `--rubric` — the red-letter day, literally.

### 5b. The calendar page

The habit page, so its shape is specified here rather than improvised.

**The hero.** The day opens on one saint, large: image in a square box
(author, 2026-08-21 — it took the manifest's aspect until then; see "the hero
image is a square" below),
name in display voice at h1 scale, the badge immediately to the right of the
name (§7), then that day's other commemorations as a register below. The pick is
deterministic from the date and the day's slugs — the same day shows every
visitor the same saint, so a shared link means a shared page — preferring
saints that carry an image, never advertising the preference. **As the day
turns** — midnight, or the reader stepping the strip — the hero changes with a
slot transition: the old panel's content rolls out vertically and the new rolls
in, direction following the direction of travel through time, 260 ms, opacity
ramping with the movement. Under reduced motion the swap is instant. The image
and name carry `view-transition-name` from day one so the card→detail
shared-element transition in Phase 1's close is markup already in place.

**The chrome** (author, revised 2026-08-21). Two icon buttons stand at the left
edge, stacked: a recentre mark for today, a calendar mark for the month. The
week or the month fills the rest of the row, and **the month replaces the week
rather than opening beneath it** — they answer the same question at two grains,
and both on screen at once was two date pickers competing for the same click.
The month toggle stays lit while the month shows, because with the week gone
nothing else says which grain you are in.

**There are no chevrons** (author, revised 2026-08-21). What stands at each
edge is the grain itself, continuing: the day before the week and the day after
it, the column of dates that runs off each side of the month, set on the same
lines as the days between them and dissolving toward the margin through a mask.
The hint that there is more either way is the more, showing — and the peek is
the swipe's affordance for anyone who cannot swipe.

They are still buttons, and that is not a compromise: the swipe is touch and
pen only by design (§5b, below), so an edge with nothing to click would strand
every reader with a mouse. What went is the glyph, not the affordance. The two
edges hold the same column and the same top at either grain, both derived from
one `--cal-peek`, so nothing moves sideways as the two swap; the month's edge
is taller because it is a column where the week's is a day, which is the one
thing that legitimately differs.

**The peeked day sits on the line the days beside it sit on.** It is not
inside a day button, so it inherits neither that button's one transparent
border nor its `--space-1` of padding, and without them it printed 5 px high —
which read as the edges belonging to a different row (author, 2026-08-21). The
month's column never had the fault: its cells take the grid's own classes.

**The fade is a mask, never an opacity.** A flat wash over `--ink-soft` is
2.1:1 against gesso and the quality floor fails it on sight, which is the right
answer: text a sighted reader might try to read has to clear 4.5:1 wherever it
is legible at all. The ink stays at full strength and the dissolve happens over
the outer half of the peek, where there is no longer a glyph to read. **Picking a date does not close the month**;
only the toggle does, so a reader comparing days is not reopening it between
each one.

**The month is the week grown taller** (author, revised 2026-08-21), not a
panel that replaces it. It carries no frame of its own and takes the strip's
seven columns, its gap and its left and right edges, so the day names sit in
exactly the same place at either grain — same column centres, same top, to the
pixel — and what the reader sees toggle is rows arriving, which is the only
thing that actually differs between the two. **The month prints its name in
the gutter**, under the jump stack, where it costs the row no height; it used
to sit centred above the grid, which spent a line of every date's height on a
label the week manages without. **Abbreviated** — "Aug 2026" — because the
gutter stops where the peeked column starts and a full month name reached
across into it. A date row is one numeral
and is set to match: the body's reading leading around it was most of why the
month stood 278 px tall against 171 now.

The chevrons flanking the week move a **week**; a day is chosen by clicking it.
Arrow keys inside the strip still move a day, which is how a keyboard reaches
one without tabbing across all seven. **Both grains also take a horizontal
swipe**, in the same direction at either grain: a flick left is forward in
time. Touch and pen only — a mouse drag across a date grid is a selection, not
a gesture — and the click that would otherwise land at the end of the flick is
swallowed once. The row does not wrap — wrapping would
drop the jump buttons off the left edge, which is the arrangement — so at
narrow widths the chevrons and day cells give up width instead; seven days plus
both controls fit 360 px and the quality floor's overflow check holds it.

The page opens on this row rather than on a heading, so it takes a heading's
worth less air beneath the site header than every other view.

**The month unfurls**, over `--dur-month` (420 ms) — deliberately slower than
the day roll, because five rows arriving between two frames is a jolt and there
is far more of it arriving. The two grains share one cell, so the week fades
out exactly where the month fades in and the dates grow downward out of the
day-name line the week already holds; folding back into it is the same
movement reversed. The row is as tall as whichever grain is currently taller,
which is what carries the page below down with the growth instead of jumping it
the moment the button is pressed. Reduced motion drops both transitions through
the global rule in base.css, and the JS skips the matching wait rather than
holding a blank row for 420 ms with no animation behind it: removed, not
shortened.

**A grain travels sideways, edges included, and it can be dragged.** Each
grain sits on a **track** inside a viewport, and the track is what moves. It
moves two ways, and they are deliberately the same movement.

*Travel* — a peeked edge, an arrow key off the end of the strip, the jump to
today. The state changes first and the live row is repainted to where it has
arrived, so the heading and the day panel never lag the chrome; then the track
is thrown back to where the reader last saw it and glides home over
`--dur-slot`, with the grain being left standing beside it for the trip.

*A drag* (author, 2026-08-21). The reader holds the grain and slides it, and it
lets go into whichever grain it is nearest. Far enough to have meant it is **a
finger's worth of travel, 36 px** — a flat distance and not a fraction of the
grain, because a finger is the same size on a phone as on a tablet and the
grain is not; short of it, the grain they started in is still the nearest one. Both neighbours are painted and parked a width either side
before the first frame moves, so there is something to drag into view in either
direction without a repaint mid-gesture. The state does not move while the
reader is still holding it: what is under the finger is the chrome, and the day
changes when they let go somewhere. **Touch and pen only, still** — a mouse
drag across a date grid is a selection, not a gesture — which is the same
reason the peeked edges have to stay buttons.

**Both grains' edges travel with them** (author, 2026-08-21): what moves is the
whole row — leading peek, dates, trailing peek — because the peek is the grain
continuing, and an edge that repaints in place while the dates between the two
of them slide reads as the edges switching rather than as the grain moving. The
week got this first and the month could not have it, because the month's peeked
column could not travel while the day names above it sat inside the same
button. **The day names moved to a line of their own** above the body so that
it could — a row of seven with a peek-wide gap at each end, holding the same
column centres and the same top the week strip holds them at. What that cost:
the month's peek *button* now starts under the day-name line rather than at the
row's top, so the two grains' edges no longer share a top. They still share the
column, and the peeked cell still shares the grid's first row, which is where
the ink actually has to line up.

For the length of any move the document holds two or three of every date, so
the copies say what they are: `.grain-side`, `aria-hidden`, out of the tab
order, and out of reach of the pointer — a copy is laid over the live row and
would otherwise swallow the click that moves the grain again.

Reduced motion removes the animation and never shortens it: a travel is a
repaint, and a drag still follows the finger — direct manipulation is not an
animation — but lets go into place with nothing to sit through. What decides it is the movement and not the
gesture: picking a day inside the week already showing has nowhere to travel to
and simply repaints. A month takes its height with it as it goes, because a
five-row month arriving where a six-row one was would shunt the whole page up
between two frames.

**The reckoning is the reader's** (author, 2026-08-21). A row of four under the
strip — Gregorian, Julian, Coptic, Ethiopian — chooses which calendar the day
is shown in, and the choice is remembered in `settings.calendarPreference`
alongside the theme. It replaces the line of equivalencies that used to print
all three non-civil reckonings at once between the title and the image: three a
reader did not ask for, where one they did is enough.

**The chosen date stands beside the buttons that choose it** (author,
2026-08-21, reversing the same day's decision that put it directly above the
hero image inside the day panel). It sits on the reckoning row's own line,
pinned to that row's trailing margin so it holds one column whichever of the
four is lit, and at 360 px it takes the line under them rather than squeezing
four buttons into three. It is the chrome's now rather than the day's, so it
repaints when the day changes instead of rolling with it.

**And it no longer names its calendar** (author, 2026-08-21): "22 Tobi 1742",
not "Coptic · 22 Tobi 1742". It named itself while it stood in the day
panel, where nothing else on the page said which reckoning was being printed
and a bare "22 Tobi" was legible only to a reader who already knew which
calendar counts in Tobi. Beside the four buttons the lit one is that answer,
and printing it twice on one line was the reckoning saying its own name back to
the reader who had just chosen it. The **year stays**: Coptic 1742 and
Gregorian 2026 are the same day, and the year is the half of a reckoning a
reader is least able to supply for themselves.

What is left of the double reading is smaller, and it is between the line and
the `h1` rather than inside the row: with Gregorian chosen the line reads
"30 January 2026" under an `h1` reading "Friday, 30 January 2026". Dropping
Gregorian from the four remains the standing fix, and it remains the author's
call.

The strip and the grid stay in the civil calendar the URL is in. Choosing a
reckoning relabels the day; it does not move the reader to a different one.

**The hero image is a square** (author, 2026-08-21), cropped from the centre
across and hard against the top, so what a tall icon loses is its lower half
rather than the face. On the habit page every day's saint is asked to sit in
the same box: an icon three times as tall as it is wide spends the fold on a
frame, and the day after it does not. The index still varies its card heights
from the manifest's aspect ratios, because there the varying box is the corpus
showing its own shape. The box is still reserved before the image decodes — a
square is as structural a guarantee against layout shift as a measured ratio
was — and the blurred placeholder is anchored the same way, or it paints a
differently-framed image under the one arriving.

**The hero image takes 85% of the width it took** (author, 2026-08-21) — the
column narrows from 260 to 221 where the panel gives the image a column, and
the image narrows within the panel where it does not. A tall icon at full width
was pushing the saint's own name below the fold at 360 px, which is the one
thing a hero cannot do. The reduction is applied **once**, in whichever place
actually holds the box: applying it in both took 15% twice. Where the image
does not fill its container it is centred in it.

**The image opens the saint**, like the name beside it. It is hidden from the
accessibility tree and out of the tab order on purpose — the name already links
to the same page, and a second link with no text of its own would be either an
unnamed link or the same one announced twice.

**Dense against sparse.** A day with twelve commemorations across four
traditions and a day with one must both read as composed. Density lives in the
register, never the hero: one saint's day is a hero and nothing else — the
register simply isn't there, and the page is a quiet portrait. A twelve-saint
day keeps the hero at exactly the same scale and stacks the rest as
church-grouped register rows beneath it; the hero never shrinks to make room.
The week strip shows a small dot-count under each day (one dot per
commemoration, capped at five) so density is legible before arrival.

**An empty day is a designed state, not a fallback** (this holds for every
tray and gap in the product — the undated tray, the unlocated tray, an
uncached page offline). Labelled in the register voice, counted honestly,
phrased as an invitation to look elsewhere — never an unstyled hole that reads
as breakage.

**Chrome:** one quiet header — site name in display voice at utility size, the
four pages as utility links (current page in `--rubric`, plus an underline so
colour never carries it alone), theme control as a labelled text button, and
**today's date abbreviated beneath it** (author, 2026-08-21): "Fri 21 Aug",
right-aligned to the control's own edge, never wrapped, with the machine form
on `datetime`. It is stamped once at load — a page left open across midnight
shows yesterday, which is cheaper than a timer something would have to own. The
corner became a two-line stack for it and the bar's own vertical padding paid
for the line, so the header is no taller with the date than it was without it. That
button reserves the width of its longest label ("Theme: System") by rendering
all three stacked in one grid cell with only the current one visible, so
cycling the theme cannot change the header's width, wrap it, or change its
height. A width guessed in `ch` would be a guess about a font we do not choose. No
footer ceremony; About holds the editorial matter. Header collapses to a
wrapping row at 360 px; no hamburger — four links fit.

## 6. Motion and states

- Durations: 200 ms standard, 260 ms the hero slot roll, 300 ms theme change,
  easing `cubic-bezier(0.2, 0, 0, 1)`.
- Page changes cross-fade via the View Transitions API where present; CSS
  opacity fallback where not. Card→detail shared-element transitions arrive in
  Session 4a; the `view-transition-name` markup on card image and name is
  present from Phase 1.
- **The first render is never a transition** (Session 5). There is no previous
  page to cross-fade from, and `startViewTransition` defers its callback to the
  next rendering opportunity — which a browser need not offer promptly to a page
  it is not painting, a background tab most of all. Gating the first paint on it
  was reproducibly a second of blank page in a headless browser, and would be
  worse in a tab opened in the background.
- `prefers-reduced-motion: reduce` **disables all of it** — transitions,
  skeleton shimmer, the later timeline and shuffle animations. Disabled means
  removed, not shortened.
- **Loading:** no spinners. The initial manifest fetch shows a full-page veil:
  the site name in display voice over `--veil`, with a thin `--rule` line that
  fills to `--ink-soft` (opacity only under reduced motion). Everything after
  first load is inline: skeleton blocks on `--rule` at 50%, shimmering in
  normal motion, static under reduced motion, always sized to the final
  layout's dimensions so nothing reflows on arrival.
- **Errors are prose.** Ink-coloured sentences saying what failed and offering
  retry — never a red banner (red belongs to the liturgy, §2).
- Focus: every interactive element shows `outline: 2px solid var(--rubric);
  outline-offset: 2px` on `:focus-visible`.

## 6b. The uncertainty curve

Softness is one continuous function of one number, used identically in the
three places it appears — date-interval bars (parameter: interval width in
years), map halos (parameter: `uncertainty_km`), timeline dissolves
(parameter: birth and death interval widths). It is never a lookup table, and
it never takes an editorial enum as input: `basis` and `historicity` are
claims, not measurements, and they may modulate *treatment* — a weight, a
texture, a rule style — but never geometry. A soft edge always means "we are
unsure of the number" and never "we doubt the story."

The curve is a clamped power law. `softness(p) = clamp(min · p^gamma, min,
max)`, in px at base scale; applications may scale it linearly (map zoom) but
never reshape it.

```css
--uncertainty-min: 0.75;  /* px of softness at a 1-year / 1-km interval */
--uncertainty-max: 24;    /* clamp, so a 500-year interval stays legible */
--uncertainty-gamma: 0.55;/* curve shape */
```

These three constants are the art direction — parametric substrate, hand-tuned
curve — and live here, alongside the palette, as the only sanctioned nudge.

**The date bars are withdrawn** (author, 2026-08-21). They were the curve's
first and only shipping consumer; the saint page now prints the dates and the
places instead, as one register keyed by the `kind` a date and a location
share. The curve is unchanged and stays here: the map halo and the timeline
dissolve are its remaining consumers, and `tests/uncertainty.test.mjs` pins its
three constants directly now rather than through a component. The paragraph
below is kept because it is the reasoning the timeline will need again.

**An open bound dissolves over extent, not radius** (settled in Session 4a,
the curve's first consumer). `softness(null)` is the 24 px clamp, and 24 px of
blur applied to an 8 px date bar erases it — including the bound at the other
end, which is often a real and citable finding ("no later than 1000"). So a
bar with one open end keeps the curve's sharp value and fades to nothing over
the last 45% of its length toward the unknown side. Same reading, same "we do
not know where this ends", expressed the only way that leaves the end we *do*
know legible. Bounded intervals are unchanged: the curve alone.
Worked values, corrected against the running curve on 2026-08-21 and pinned by
a test: 1 year → 0.75 px (sharp); 30 years → 4.87 px; 100 years → 9.44 px; 200
years → 13.82 px; 500 years → 22.88 px; **the 24 px clamp does not bind until
about 757 years**, and `softness(null)` — an unknown parameter — is the clamp
itself. This section read "200 years → 13.7 px" and "500 years and above →
24 px" until then; both were wrong, and nothing executed them. A precise date
draws crisp; two centuries of doubt draw as a visible dissolve; nothing ever
snaps.

## 7. The signature element: the veneration glyph (spec for Session 3)

Two views over one dataset, per the author's `veneration-glyph` spec §1 and
brief §9.1/§9.2: the **badge**, one row of communion cells, and the **matrix**,
the rite x communion lattice. §7a is the badge, §7b the matrix, §7c which
contexts take which and why.

### 7a. The badge

A lattice of **circles** on a fixed pitch, one cell per **communion**,
generated from the registry — exactly as many cells as communions enabled;
reserved or disabled cells are hidden, never drawn empty. Position encodes
identity; a communion's cell never moves between saints; colour never carries
information alone.

**Cells are circles, not squares.** Spec §4 states it twice and the reference
draws nothing but `<circle>`. Any other shape is a spec violation rather than
an interpretation.

**Geometry settled 2026-08-21** by the author's `veneration-glyph` spec. Three
drafts are now superseded and are recorded so none is reintroduced by someone
reading an older document: the brief's pale-grey square *fill*; Addendum A1's
hollow square outline; and the square lattice this repo shipped between
2026-08-21 morning and evening, built from an earlier revision of the spec
whose §4 read "cells are squares on a fixed pitch". All three were protecting
the same thing — three states that survive greyscale — and the shipping form
does it with **value** for refusal and **radius** for silence.

If a future revision of the reference disagrees with this section, the
reference wins and this section gets rewritten — that has now happened twice.

- Circles centred on a fixed pitch, `cx`/`cy` at each cell's midpoint, never
  corner-anchored. The gap is not a separate constant: it is what the pitch
  leaves over once a circle of 0.62 pitch diameter is centred in it, which is
  enough that adjacent marks never fuse into a shape depending on registry
  adjacency rather than on meaning. The lattice flows row-major; a partial row
  keeps its cells on lattice positions, left-aligned — a lone cell sits in
  column 0 of its row, never floated to visual centre.
- **Attested:** radius **0.31 x pitch** in `--glyph-attested`, which is the
  gold, and gold is spent nowhere else in the product (§2).
- **Refused:** the *same radius* in `--glyph-ink` at `--glyph-refused-opacity`.
  Same circle, same footprint as an attestation: a refusal is a finding, not an
  absence, and it is told apart by **value**. Do not let that opacity drift up
  toward an attested cell's, whatever `--glyph-attested` resolves to on a given
  theme.
- **Undocumented:** radius **0.11 x pitch** — a visibly smaller circle, not the
  same one at a lower opacity — in `--glyph-ink` at `--glyph-undoc-opacity`.
  Told apart by **size** as well as value. This is the one thing in the
  component that must never be simplified: refusal and silence are different
  findings, and a reader has to see which is which without trusting a hue.
- Greyscale check: a full-value disc, a pale disc of the same radius, and a
  small faint dot — three states still distinct with colour removed, two by
  value and the third by size.
- **No colour literal appears in the component.** Every fill reads one of four
  custom properties — `--glyph-attested`, `--glyph-ink`,
  `--glyph-refused-opacity`, `--glyph-undoc-opacity` — defined in tokens.css
  for both themes. A repalette or a third theme is a token change, never a code
  change.
- Below ~20 px: family-level fallback, one small vessel per communion filled
  from the bottom by proportion attested.
- Every badge carries a text equivalent ("Venerated in 2 of 4 communions:
  …; refused by …; 5 undocumented") and a hover/tap legend naming each cell.
- The artwork is one inline-SVG component; the cell→communion mapping lives in
  `churches.js`, not in the drawing, so the mark could change again without a
  byte of data moving. It has.

### 7b. The rite x communion matrix

**Adopted 2026-08-21 at the author's direction**, from `renderDetail` in the
`veneration-glyph` reference. Rows are communions, columns are the rites some
enabled church actually holds: a 7 x 4 lattice with **13 occupied positions**
and 15 empty ones. An empty position is not drawn — not faintly, not at all.
There is no Ge'ez-rite Church of the East, and a mark there would invent a body
that does not exist.

The 13 is derived, never a constant: Catholic holds all seven rites, Eastern
Orthodox one, Oriental Orthodox four, the Church of the East one. Disable a
communion and the row goes; the columns recompute.

- **Same circles, same lattice, same three states as the badge.** Both
  renderers call one `cellMark()` and one `rollupStates()` in `badge.js`, so a
  change to what a refusal looks like, or to what counts as one, cannot land on
  one view and miss the other. At the same pitch the two views draw the same
  mark. No colour literal here either.
- **The matrix is a decomposition of the badge, never a second dataset.** Roll
  a row up by the badge's rule and you get that communion's badge cell, for
  every possible input. `decomposesToBadge()` in `matrix.js` states it and two
  unit tests assert it — exhaustively over the registry, and over every saint
  in the corpus. The two views appear on different pages for the same saint; if
  they ever disagreed a reader would have no way to tell which was lying.
- **One text equivalent, not two.** Spec §5. `badgeLabel()` serves both, over
  whichever cells it is given: four communions counted by name for the badge,
  thirteen cells counted bare for the matrix. A church holding six cells is
  named once, not six times.
- Each cell's own legend names its church and rite.

**The open question, and the decision (2026-08-21).** The reference assumes one
`rite` per church and splits Eastern Catholic into six — Byzantine Catholic,
Coptic Catholic, and so on. This registry deliberately does not: brief §5 says
keep `eastern-catholic` as one entry *and* do not flatten it to one rite, which
is only possible if `rites` is a list (SESSIONS.md, Session 1). So the six
non-Latin Catholic cells all read from one entry. Two options were open: fill
all six from it, or leave them undocumented until the entry is split.

**Fill all six**, and mark them coarse in the cell legend. Three reasons:

1. Leaving them blank breaks the decomposition. A saint attested or refused
   *only* in Eastern Catholic would give a badge cell that no cell of its
   matrix row agrees with.
2. It erases the one adjacency the brief says this view exists for. §9.2's
   worked example is Nestorius: the East Syriac column holds Eastern Catholic,
   which refuses him, directly above the Assyrian Church of the East, which
   venerates him. That is real corpus data today, and blank cells lose it.
3. The reference's own count of 13 only reconciles with this registry under
   this option. Under the other, six of the thirteen would be permanently dark.

The cost is real and is recorded here rather than hidden: the cell claims for
every Eastern Catholic church of that rite what one entry says about all of
them. It over-claims the day a saint is attested in only some of them — the
spec's own Josaphat Kuntsevych case. **No saint in this corpus does that**;
every `eastern-catholic` finding here is `not-venerated` or `undocumented`, and
a communion-wide refusal is the case where one entry is least wrong. The first
`eastern-catholic: venerated` attestation is the signal to split the entry, and
the registry already flags it `coarse: true` for exactly this.

### 7c. Sizes, and which view each context takes

The matrix is four rows tall where the badge is one, so it cannot sit beside a
name at the scale a one-row strip did. **The matrix ships at pitch 7.65** —
53.55 x 30.6 px. **The badge ships at pitch 10.2** — 40.8 x 10.2 px for four
communions. Both are 15% down on the sizes first shipped (author, 2026-08-21).

Measured in the shipping build, both viewports:

| Context | Type | Line box | Glyph | Disc / dot | Verdict |
|---|---|---|---|---|---|
| Saint page `h1` | 40 px desktop, 28 px at 360 | 50 px / 35 px | 53.55 x 30.6 | 4.74 / 1.68 | **Matrix.** Sits inside the line box at both widths. |
| Calendar hero `h2` | 26 px | 33 px | 53.55 x 30.6 | 4.74 / 1.68 | **Matrix.** Inside the natural line; nothing moves. |
| Index card / row name | 17 px | 42 px | 40.8 x 10.2 | 6.32 / 2.24 | **Badge.** A matrix here needs a sub-1.5 px dot. |
| Register and shelf rows | 17 px | 73–77 px | 40.8 x 10.2 | 6.32 / 2.24 | **Badge.** Same arithmetic, and these are the dense lists §9.1 is for. |

**The undocumented dot on the matrix is now 1.68 px**, below the 2 px floor
recorded here before the 15% reduction. That floor was about legibility at 1x,
where a sub-2 px circle is a smudge rather than a mark; at 2x and above — which
is most readers — it is 3.4 device pixels and reads cleanly. It is recorded
rather than quietly rewritten, because it is the size distinction that carries
the third state through greyscale, and it is the first thing to give if the
glyph is asked to shrink again.

One thing worth knowing: the matrix takes **less** horizontal room than the
badge it replaced on those two contexts, so the cost of the extra rows is
vertical only. At 360 px the glyph sits flush to the content edge with the name
wrapped within itself; there is no horizontal page overflow at 360 or at 320,
and a browser test pins that.

This split is the brief's own: §9.1 is "cards, map, dense lists", §9.2 is "one
saint's own page", and §9.2 says in terms not to merge the two into one
component at two sizes. The two views showing different grain for the same
saint is the design, not an inconsistency — which is why the decomposition
invariant above has to hold.

### 7d. Where the glyph sits

**Where it sits** (author's instruction, 2026-08-21): on the line of the
saint's name, wherever a name appears — the calendar hero, the saint's own
page, an index card, a register or shelf row — at a pitch scaled to the type it
accompanies, and in whichever of the two forms §7c gives that context.

**Pinned to the right margin of that line, not trailing the name** (author,
revised 2026-08-21). Position encodes identity, and a mark that ranges in and
out with the length of each name spends that meaning on nothing: down a
register or an index the glyphs now hold one column. A register row pins it
*after* the feast date rather than before, because the date is what holds that
row's margin — visual order only, the DOM keeps the name and its mark adjacent.
Below 480 px the date takes a line of its own, so there the glyph pins to the
right of the name's line instead of following the date down.

The name and its mark are one line and that line never
wraps: the name shrinks and wraps within itself instead, because a glyph on a
line of its own has lost the name it belongs to. On the saint's own page this
replaces the standalone badge that used to head the veneration register; the
same mark printed twice on one page is not emphasis.

## 8. What we are deliberately not doing

The brief names the AI-default looks; this section is the standing check
against drift back toward them.

- No cream-page-and-terracotta heritage kit. The page is gesso white / bole
  brown; the accents are liturgical red and reserved gold, each with a job.
- No near-black-with-acid-accent. Vigil mode is warm bole, and the brightest
  thing in it is a saint's gold, not a neon.
- No hairline-broadsheet costume. Rules appear only where a register rules.
- No decorative crosses, halos, illuminated capitals, blackletter, or other
  costume ornament. The subject's gravity comes from restraint.
- No gold anywhere but the badge. No red anywhere but liturgical time and
  place. These two sentences are the design.
