# DESIGN.md — The Orthodox Saint (Gallery of Saints until 2026-08-23)

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

Revised 2026-08-22 for the Eastern Orthodox project, on the author's three
decisions, recorded where each sits with the superseded text marked rather than
removed: **the veneration glyph is removed** (§2, §5, §5b, §5c, §7, §8); **the
registry is local churches — Russian, Romanian, Greek, and the Serbian from
2026-08-23 — each on its own calendar, Julian or Revised Julian, with Pascha by
the Julian computus in all of them** (§5b); and **the site-wide selection is
one of those churches** in
place of the traditions and the plate (§5, §5b, §5c). What a calendar entry is
when it is not a saint is proposed to the author and not yet decided.

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

*Superseded (author, 2026-08-22, Eastern Orthodox project): **the veneration
glyph is removed.** In a one-communion corpus a mark that encodes which
communions venerate has one cell and says nothing, and the author chose to drop
it rather than re-aim it at the local churches. Gold is therefore spent nowhere
on the site for now: the `--gold` token stays in tokens.css, unused, against
the day a new signature element is chosen — the author's choice, not the
build's — and until then the page's restraint is the whole of its statement.
The discipline that gold carries a finding and nothing else is not repealed; it
has nothing to carry.*

*Reversed again by the author, 2026-08-25: "make the site icon gold colour
orthodox cross."* The favicon is `--gold` in both themes. So gold is spent in
exactly one place on this site, and that place is the site's own mark rather
than a finding about veneration — the discipline below is therefore **not**
literally true of the favicon, by instruction, and is true of every other
surface. The reasoning of the 2026-08-24 correction is kept underneath
because it is the argument the author overruled, and because if a signature
element is ever chosen the question returns with it.*

*Corrected (author, 2026-08-24): "spent nowhere" had one exception nobody had
noticed, and it was the site's own mark. The favicon was a single gold cell —
the badge's attested mark, put there when the badge was the signature element —
and it outlived the badge by three weeks and nine amendments. It is now the
eight-pointed Orthodox cross, **drawn in ink**, because a site mark is not a
finding about veneration. Gold is now genuinely spent nowhere. The lesson worth
keeping: the tokens.css audit that says where a colour is used does not reach
`index.html`, and the mark a reader sees before the page paints is the one
place a design rule can rot unread.*

A parallel discipline for red: **rubric marks liturgical time and the reader's
place, nothing else.** Today in the week strip, a feast marker, the current
page in the nav — the "red-letter day" idiom doing literal work. Red is never a
generic accent, an error colour (errors are ink, stated plainly in words), or a
decoration.

*Stands, and gains weight (2026-08-22): in the Orthodox calendar the red-letter
day is the typikon's own idiom — a Great Feast, a Sunday of the Triodion — and
rubric is where those entries will live once the entry shape is settled.*

**Amended 2026-08-24 (author): the fast of the day is the one sanctioned
exception, and it is a narrow one.** The Daily page's fast now carries its kind
as a colour — strict in `--fast-strict` (the rubric itself, because a fast *is*
liturgical time and needs no new hue), fish-permitted in `--fast-fish`, and
fast-free in `--fast-free`. Two new hues therefore exist outside gold and
rubric, and the two-colour rule of §2 is no longer literally true.

Three things keep the exception honest, and none of them is optional:

1. **The colour is never the only channel.** The line still says "Fast — the
   Dormition Fast", "Fast, fish permitted — …" or "No fast" in words. Remove
   every colour and the reader loses nothing; that is the §7 greyscale test
   applied to text rather than to the glyph.
2. **Fish-permitted is teal, deliberately not amber.** Amber at the contrast
   the ground needs lands within a few degrees of `--gold`, and a reader who
   has learnt that gold is a finding about veneration should never meet it on a
   line about herring. The hue was chosen to be unmistakably *not* gold.
3. **Both hues clear 4.5:1 on their ground in both themes** — 6.00 and 5.72 on
   gesso, 7.98 and 8.59 on bole — so the quality floor's contrast gate passes
   on the colour rather than in spite of it.

The discipline this does not repeal: gold still appears only in the veneration
badge, errors are still ink, and no *other* category anywhere on the site may
take a colour of its own by citing this entry. The fast earned it by being the
one datum a reader scans for daily and acts on the same morning.

## 3. Colour tokens

Six named colours, all drawn from the materials of panel and book. Every colour
in the CSS goes through these custom properties; hard-coded values are a defect.

| Token | Light ("day") | Dark ("vigil") | Material | Role |
|---|---|---|---|---|
| `--gesso` | `#E5E4DD` | `#1A1412` | gesso ground / bole clay | page and surface background |
| `--ink` | `#221D19` | `#EDE6DC` | walnut ink | text, icons |
| `--ink-soft` | `#5C544D` | `#A89C8F` | diluted ink | secondary text, captions |
| `--rubric` | `#8A2E26` | `#C05B4B` | cinnabar rubric | liturgical time, current place (§2) |
| `--gold` | `#A98237` | `#C79A4B` | burnished leaf | veneration badge only (§2) |
| `--rule` | `#C8C2B7` | `#3A2F29` | ruled line | separators, borders, skeletons |
| `--fast-strict` | `= --rubric` | `= --rubric` | cinnabar rubric | a strict fast (§2, 2026-08-24) |
| `--fast-fish` | `#1F5A6E` | `#7AB4C9` | verdigris | fish permitted (§2, 2026-08-24) |
| `--fast-free` | `#356038` | `#8FBE8A` | terre verte | no fast (§2, 2026-08-24) |

**The light ground is gesso, not paper** (author, 2026-08-22). It was
`#FBFAF7` — a near-white — until then, and is `#E5E4DD`: the tone of an actual
chalk ground, which is what the icon photography is sitting on. The gold in the
imagery now sits *in* the surface rather than glowing off a white page, which
is the argument vigil mode has always made for bole (below), applied to day as
well.

Three derived values moved with it, and each is written down because each was a
relationship the near-white ground had been holding up by accident rather than
by design. `--ink-soft` and `--rule` darkened by the amount that restores their
standing against the new ground; the recipe for `--field` did not change at all,
only the ground it derives from. None is a taste change and none is optional —
DESIGN.md §1's recessed field and integral border, and the AA floor, are what
each one is holding.

Derived surfaces (not new hues, just mixes of the six):
`--field` — the recessed card interior: in light, gesso darkened ~3%
(`#DFDCD1`); in dark, bole lifted ~4% (`#231A17`). The field is always *below*
the page tone, because a card is a kovcheg — it recesses, it does not stand
proud. Re-deriving it is not optional when the ground moves: the old `#F4F1EA`
is lighter than the present ground and would have inverted the panel silently.
(`#F4F1EA` is separately *banned* as a page colour by the brief, and the page
has never been it.)
`--veil` — `--gesso` at 80% alpha, for the loading veil.

**Dark is not an inversion.** Vigil mode's ground is bole — the warm red-brown
under gold leaf — because the icon photography is gold-heavy and warm, and it
must sit *in* the surface, not glow out of a black void. No pure black
anywhere; the darkest value in the system is `#1A1412`.

Contrast, computed against the shipping tokens on 2026-08-22 rather than
recalled — every figure in the previous version of this paragraph was wrong,
which is §6b's lesson about worked values arriving in the palette. Light:
ink/gesso 13.10:1, ink/field 12.16:1; ink-soft 5.82:1 on gesso and **5.40:1 on
the field**, which is the binding one, because secondary text sits inside cards;
rubric 6.59:1 on gesso, 6.12:1 on field. Dark, unchanged by this pass:
ink/gesso 14.71:1, ink-soft 6.78:1, rubric 4.20:1.

Two things that paragraph used to say and should not have. It claimed
ink-soft "≥ 5.4:1 both modes" while the value on the light *field* was 5.29:1 —
the ground moving is what surfaced it, and it is 5.40:1 now, so the claim is
true for the first time. And it called dark-mode rubric 5.1:1 and "safe for text
at any size": it is **4.20:1**, below the AA floor for normal text, and rubric
carries the current nav item and today's date. That is a live defect in vigil
mode, untouched by this pass and recorded in SESSIONS.md as outstanding — the
browser suite runs in light mode only, so nothing has been checking it.

`--rule` is not text and takes no AA floor, but it has to stay visible against
both surfaces it divides: 1.39:1 on gesso and 1.29:1 on the field, which is the
standing it held on the old ground (1.40 and 1.29) rather than a new target.
gold is **never used for text** and never carries information alone (§7).

**Theme is two-way — light or dark — and the system is read, not offered**
(author, 2026-08-22, Addendum H5; it was three-way with a *System* option
until then). A reader who has never touched the control follows their system
preference, live, including a change of it later; the first press fixes a
choice, which is kept from then on whatever the system does. The inline script
before first paint reads the stored choice or, absent one, the system, so the
first frame is already right; a stored `system` from before this change reads
as no choice. Theme changes transition background and text colour over 300 ms;
nothing else transitions on theme change, and `transition: all` is banned
everywhere.

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
actually appears on screen. **Reversed in part, 2026-08-24:** the author
instructed "remove the 'Also called' section from each saint profile," which
was exactly this passage's own on-screen evidence — the alternate-form block
(`views/saint.js`'s `.names`, headed by the "Also called" label) no longer
renders anywhere, so a saint's *other* name forms (Ἀντώνιος, Ⲁⲛⲧⲱⲛⲓⲟⲥ) go
unseen; the requirement stands unreversed for a saint's *display* name, which
still sets in Literata wherever the corpus writes it in its own script (Мойсей
on the Index, e.g.). Flagged to the author in the same sitting; the
reversal is theirs to revisit — the data is untouched, so restoring the line
costs nothing. Coverage as shipped: Literata carries Latin,
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

**A bookmark stands at the image's top-right corner** (author, 2026-08-22):
the Save of brief §11 as a frameless silhouette over the picture — no frame,
no field, the shape alone. "Filled when saved and outlined when not" is
superseded (author, 2026-08-23): the shape is filled at both states now,
half-opacity when not saved and full when it is, with `aria-pressed` carrying
the state regardless. It is ink precisely because of where it sits: over a
picture, gold would claim a finding and red would claim liturgical time (§2).
A row puts it at the trailing edge, because a 48 px thumbnail has no corner to
spare; a card without an image puts it in the card's own corner.

*The hairline of gesso under the shape is removed (author, 2026-08-24):
"there are two bookmark visuals… remove the outline version completely."* The
halo was there so the mark would read on gold ground and dark ground alike,
and it did — but over a dark icon it was the **only** part that read, so the
site had an outlined bookmark on cards with a picture and a filled one
everywhere else, which is two renderings of a control this section opens by
calling one. There is now one path, at half opacity until saved. What the halo
was defending is defended instead by a drop shadow, applied only where a
picture is actually underneath: a shadow is the ground's own darkness pushed
away from the shape, not a second shape drawn around it, so the mark stays one
drawing in every place it appears.

**The Index has two layouts**, chosen by the reader and remembered (added
2026-08-21). *Cards* is the panel described above: image at the manifest's
aspect ratio, name and glyph beneath. *Rows* is the register at card weight —
a square 48 px thumbnail at the left, the name and its glyph to the right of
it, dates below, on a fixed 66 px pitch. Rows exist because a corpus is
something you scan as well as something you look at, and because a fixed pitch
is the tightest a virtualised list can honestly be. Both are exact heights
known before render; neither measures.

**And one grain, Detailed** (author, 2026-08-22): a tick box beside the layout
control, remembered with it. Ticked, each card or row carries the rite ×
communion matrix in place of the badge — at the matrix's own pitch, see §7c —
and a short description under the name with the dates it already had: the
opening paragraph of the saint's own life, clamped to three lines on a card
and two on a row, in a box reserved before the text arrives so every height
the virtualiser is fed stays exact. It is derived from the author's text, not
authored a second time, and fetched per card as the card comes into view
rather than carried by the manifest (Addendum H1 records the budget reasoning).
A saint with no life shows its types in the box instead.

*Revised (2026-08-22): with the glyph gone, Detailed is the description alone —
the matrix it swapped in for the badge no longer exists, and the name line
carries the name.*

**The Index keeps the reader's traditions** (author, 2026-08-22, Addendum H7):
a saint venerated in none of the selected churches is not on the grid, a line
under the count says how many are set aside and where to widen it, and the
search and the facets apply within what remains. The Map will read the same
set.

*Revised (author, 2026-08-22, Eastern Orthodox project): the set is one church
— Russian, Romanian or Greek (§5b) — and the line under the count names what
that church's calendar does not keep. The mechanism is unchanged.*

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
name (§7), then that day's other commemorations as a register below.
*Superseded for the register (author, 2026-08-24): "display the saint card row
layout instead of the text only." Also commemorated is now a column of the
**Index's own rows** — square thumbnail, name, the church's title for the day
where there is one, lifespan, and the same bookmark every other card carries —
so the Daily page and All Saints read as one register rather than two ideas of
one. The register's line between entries went with it: a card has its own
panel edge, and the rule that removed that line the same morning is moot here.
The register voice survives where a register still is one — the saint page's
related list and the Saved shelf.*

**The shelves, and the swipe that clears one** (author, 2026-08-24). Continue
reading wears the same row dress as the register above it, with the bookmark
centred on the row's height at the trailing edge and **no × over it**: a row
is cleared by swiping it across, mouse or finger alike, past 40% of its own
width — under that it springs home, which is what tells a reader the gesture
exists and did not take. Vertical movement wins outright, because the shelf
sits in a scrolling page and stealing a scroll to dismiss something the reader
was only scrolling past is the one failure this gesture can commit; reduced
motion keeps the dismissal and removes the travel.

*Revised (author, 2026-08-25): the × returns **on a hovering pointer only**,
to the right of the bookmark rather than above it. A mouse has the swipe too,
but a visible control is the faster hand where there is a cursor to aim it;
touch keeps the swipe alone. It is the same button in both worlds — always in
the markup, named in full for a screen reader — and only a `(hover: hover) and
(pointer: fine)` query lets it out of its clip.*

**A gesture is never the only way to a thing**, which is this section's own
rule about the peeks ("the peek is the swipe's affordance for anyone who
cannot swipe") applied where the affordance had been removed by instruction.
The removal survives as a button that is clipped to a pixel until it takes
focus, then stands at the row's trailing edge naming the whole action —
"Remove Moses the Hungarian from Continue reading". A keyboard and a screen
reader reach it; a mouse and a finger never see it. That is the shape to reuse
wherever a visible control is traded for a gesture. The pick is
deterministic from the date and the day's slugs — the same day shows every
visitor the same saint, so a shared link means a shared page — preferring
saints that carry an image, never advertising the preference. **As the day
turns** — midnight, or the reader stepping the strip — the hero changes with a
slot transition: the old panel's content rolls out vertically and the new rolls
in, direction following the direction of travel through time, 260 ms, opacity
ramping with the movement. Under reduced motion the swap is instant. The image
and name carry `view-transition-name` from day one so the card→detail
shared-element transition in Phase 1's close is markup already in place.
*Revised (2026-08-22): no badge beside the name — the glyph is removed (§2).*

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

*Superseded for the week (author, 2026-08-24, Amendment 35): **the week's
edges are not buttons any more, because they are not copies any more.** The
strip is a rail — one continuous scrolling run of days — and what shows in the
inset at each edge is the neighbouring day itself, a real button in full ink,
clicked to be selected like any other. The affordance the peek-as-button
existed to preserve (a mouse's way through the weeks) is preserved better: the
mouse drags the rail directly, and the arrow keys and S/D step the day from
anywhere on the page. The month's edges are unchanged — it still travels a
month at a time, so its peeked columns still need to be clickable. This
paragraph and the three below it stand in full for the month.*

**The peeked day sits on the line the days beside it sit on.** It is not
inside a day button, so it inherits neither that button's one transparent
border nor its `--space-1` of padding, and without them it printed 5 px high —
which read as the edges belonging to a different row (author, 2026-08-21). The
month's column never had the fault: its cells take the grid's own classes.

**The fade is a mask, never an opacity.** A flat wash over `--ink-soft` is
2.1:1 against gesso and the quality floor fails it on sight, which is the right
answer: text a sighted reader might try to read has to clear 4.5:1 wherever it
is legible at all. The ink stays at full strength and the dissolve happens over
the outer half of the peek, where there is no longer a glyph to read. *Restored for the week (author, 2026-08-25): the rail's edges fade again, so a
half-cut column reads as the grain continuing rather than as a clipped
mistake, and the days sit 2 px apart instead of 4 so the edge day's own name
is whole before the dissolve begins. The mask is still a mask and not an
opacity, and it still dims no glyph a reader might try to read: it works on
the outer 12 px, inside the peek inset. The month grid follows the same 2 px,
because the two grains share their columns to the pixel.* *For the
week, moot from Amendment 35 (2026-08-24) until then: the rail's edge days are
ordinary buttons at full strength with no mask at all — the contrast problem the mask
solved only existed because the edge was a decorated copy. The month's peeks
keep the mask, and this paragraph keeps its force there and for anything else
that fades text.* **Picking a date does not close the month**;
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

*Superseded for the week (author, 2026-08-24, Amendment 35), in three of its
claims. The unit of travel: the rail scrolls freely and settles on **any
day**, not a week at a time — a Wednesday can lead the strip. The mouse: **a
mouse drag on the rail is a gesture now**, by instruction; the old text's
reason ("a drag across a date grid is a selection") loses nothing here because
the rail holds numerals in buttons, no selectable prose, and clicking is
untouched. The keyboard: the arrow keys — with **A/S and D** as their
off-hand twins (A joined S the same evening, at the author's instruction: a
hand resting on WASD expects A to be "left") — step the day **from anywhere on
the page**, not from inside the strip, guarded so they never fire while the reader is typing and never
override a modifier chord. Touch is unchanged in behaviour and simpler in
mechanism: the browser's own scroll, snapped by CSS. What still stands: a day
is chosen by clicking it, scrolling is never selecting, and the swallowed
click at the end of a mouse drag. The month keeps every word of the paragraph
above.*

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
moves two ways, and they are deliberately the same movement. *(Since
Amendment 35, 2026-08-24, this and the four paragraphs after it describe the
**month alone**: the week left the track for a native scroll container — no
copies, no `swap.js` flight, no transform — because a rail that actually
scrolls does not need machinery for pretending to. `ui/grain.js` remains the
month's, and River mode should still weigh both shapes: the track where
content must move a fixed span at a time, the rail where it should rest
anywhere.)*

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

**Serbian added** (author, 2026-08-23, Amendment 29). The registry is four
local churches: the Serbian Orthodox Church joins the three below, on the
Julian calendar like the Russian, Pascha by the Julian computus like all of
them. The paragraph that follows stood as written until then; its "for now"
was its own caveat, and nothing else in it changes — one church chosen, the
calendar following the church. The Serbian is sourced from the Православни
подсетник (pravoslavno.rs), not the Patriarchate's own site.

**Russian, Romanian or Greek** (author, 2026-08-22, Eastern Orthodox project;
three until 2026-08-23, see above).
The registry is three local churches and the reader chooses one: the Russian
Orthodox Church, which keeps the Julian calendar; the Romanian Orthodox Church
and the Church of Greece, which keep the Revised Julian — fixed feasts on
Gregorian dates, Pascha by the Julian computus, which all three share. *Julian
and Revised Julian* are the two calendars the site reckons in (the author's
second decision), and which one a reader sees is not asked separately: it
follows the church. The choice is the site's, as the traditions were — the
calendar page shows that church's calendar, the Index keeps that church's
saints, the saint's page reads that church's register first — made once on a
first visit and changed from the header, where the chooser offers the three by
name and nothing else: no communions, no rites, no plate. "For now": the
registry grows by one entry per church added, and everything downstream is
generated from it. An attestation names its church and states its own calendar
— `julian` or `revised-julian` — so a church that changed its reckoning would
change its rows, not the code. `settings.church` holds the choice, in place of
`traditions` and `calendar`.

*The four paragraphs below — the traditions, the plate, its cells and its
shape — are superseded by this one (2026-08-22) and kept as the record of the
cross-church control.*

**The page is *Daily*, and under its date stands the liturgical day** (author,
2026-08-23; the site itself is *The Orthodox Saint* from the same day — the
route `/calendar` and the settings key are unchanged so nothing breaks).

*Superseded in two parts on 2026-08-24 (author). The strip no longer carries
the calendar's name, a "Change calendar" control, or the day in the church's
own reckoning — that whole line is gone. **The Daily page prints the civil
date and only the civil date**: two dates for one day was read as confusion
rather than as precision, which is the opposite of what the own-date line was
added to do. The calendar is named and changed in the header, which has
offered both since Amendment 23, so nothing is lost but the duplication. The
superseded reasoning — that Old and New Calendar readers are looking at the
same day under different names — is true and is why the register still prints
each attestation's feast in its own calendar on the saint's page; it simply
does not earn a second date under the strip.*

Under the h1, one utility line: where the day stands in the paschal cycle, the tone of
the week, and whether it is a fast for this church and why — computed from
Pascha and the church's calendar (`lib/liturgy.js`), which is why two churches
disagree about the same civil day. Fasting is stated as fast, fish permitted
or no fast with its reason, never the finer allowances, which differ between
typika. Under the day's saint — or the empty note — the readings the church's
own calendar printed for the day, each a link (Bible Gateway, NKJV for now)
with the page named, printed only where a day has been recorded; and the
hymns of the day, a feast's recorded with the day and a saint's from the
saint's folder, in the chosen church's own language and only that church's.
The hero prefers the saint the chosen church has hymns for, then the saints
with images, then the date's hash: a church's hymn is its principal
commemoration of the day. Rubric is still spent nowhere here; the feasts that
will earn it are the next work.

**The reader's traditions, not the reader's reckoning** (author, 2026-08-21,
reversing the same day's decision twice over). A row of four calendars —
Gregorian, Julian, Coptic, Ethiopian — used to stand under the strip and print
the day in whichever the reader chose. It is withdrawn, and so is the line
beside it. What stood there from 2026-08-21 to 2026-08-22 was one button,
*Filter by Catholic/Orthodox/Oriental/Assyrian*, opening the **plate** — the
rite × communion lattice at full size, every position a switch, every position
named — on the calendar page itself. **The plate is the site's control now**
(author, 2026-08-22, Addendum H7): it opens from *Select Tradition* in the
header, under *(advanced)*, beneath four communion switches, and what the
calendar page asks instead is which one calendar to show (below).

Deselect a church and the site stops showing what it keeps — everywhere, at
once: this calendar's days, the Index, the saint page's register — and on this
page the hero, the register beneath it and the density dots under every date
at both grains, because all three count the same entries. A communion's name
turns its whole row and a rite's turns its whole
column, which is how a reader reaches "everything Byzantine" without hunting
cells. **A church is one switch however many cells it holds**: Eastern
Catholic's six dots answer together, are railed together and are named once,
because they are one registry entry and six switches would be six findings
where the registry has one (§7b).

**The plate's cells are deliberately not the veneration mark.** Gold appears in
exactly one place on this site and that place is a finding about a saint (§2),
so a control shaped like the lattice is drawn in the register's own two values
— ink for on, rule for off — and `aria-pressed` carries the state for anyone
not reading them. About draws the same layout with the *real* marks in it, so
the page cannot teach a shape the filter does not have and the filter cannot
drift from the mark.

**The shape holds at every width.** Below the width the lattice needs, the
plate scrolls sideways inside its own region rather than rearranging into a
list: a grid that becomes a register at 360 px is a second diagram to learn,
and the shape — rite across, communion down, empty positions empty — is the
thing being taught. The communion's name stays stuck to the edge as the lattice
moves under it. About's region takes a tab stop and a name of its own because it
holds nothing focusable; the filter's does not, because it holds thirteen
buttons.

**An empty day says which silence it is** — three of them, redrawn on
2026-08-22 for one calendar at a time: the corpus has nothing for the day;
this calendar has nothing but commemorations fall today in other calendars the
reader's traditions keep (and the way to them is named); or the reader's
traditions hold nothing at all, because nothing is selected. Different facts,
each stated as the fact it is. Prose in ink, never a banner.

*Revised (2026-08-22): two silences — the corpus has nothing for the day, or
this church's calendar has nothing where another of the three does, and the way
to it is named. The third, nothing selected, cannot arise: a church is always
chosen.*

**A first visit is asked which traditions it keeps** (author, 2026-08-21;
revised 2026-08-22). Four communions as four buttons, and *(advanced)* —
small, unframed — unfolding the plate for a church-by-church answer, in a
panel that stands in the page's flow above the strip: a question, not an
obstacle. Asked once: pressing a communion is the answer and takes the
question off the page; pressing cells in the plate answers too, and *Done*
closes it. A reader who scrolls past has answered nothing, keeps every
tradition, and is asked again next visit. *Show all of them* is withdrawn
(the 2026-08-21 text made it the answer that stopped the asking; what stops
the asking now is any answer, and everything is what an unanswered reader
already has). The set it writes is the site's, not the calendar's — the
header's *Select Tradition* changes it afterwards (§5), and the Index and the
saint's page read the same set. It is still the one deliberate exception to
the fold rule: on that visit at 360 px the question and its answers clear the
fold and the hero does not.

*Revised (author, 2026-08-22, Eastern Orthodox project): one question, not two
— which church, Russian, Romanian or Greek — and it is the calendar's question
and the site's at once, because the calendar follows the church. Three buttons,
no (advanced), no plate. Asked once; a reader who scrolls past has chosen
nothing and is asked again; the header changes it afterwards. The fold
exception stands.*

**One calendar at a time** (author, 2026-08-22, Addendum H8). The calendar
page shows a single church's calendar — never two traditions interleaved,
never one saint listed twice because two churches keep him on the same day
(30 January used to list Anthony under Eastern Orthodox and again under
Coptic). Which one is a separate choice from the traditions: **before the week
or the month can be seen the reader is asked which calendar**, from those the
selected traditions allow, and the answer is remembered (`settings.calendar`).
Exactly one allowed calendar is chosen without asking — a question with one
answer is not a question. The chosen calendar names itself under the strip
with the way to change it, which opens the same prompt in place; a selection
that no longer allows it asks again. The density dots, the hero and the
register all count that one calendar, and the register needs no church
heading because there is only one church in it.

*Stands, simplified (2026-08-22): the one calendar is the chosen church's, so
there is no second choice to remember and nothing can fail to allow it.*

The strip and the grid stay in the civil calendar the URL is in.

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

**Chrome** (author, revised 2026-08-22): one quiet header — site name in
display voice at utility size, the four pages as utility links (current page
in `--rubric`, plus an underline so colour never carries it alone), and in the
corner two controls. **Select Tradition**, a text button, opens the tradition
chooser beneath the header (§5b): four communion switches and *(advanced)*,
which unfolds the plate for a church-by-church answer. Beside it the **theme
toggle**, a frameless sun/moon icon whose accessible name says what a press
does. Today's date stood under the theme control from 2026-08-21 until
2026-08-22 and is withdrawn; the text theme button with its three stacked
labels went with it, and the bar's vertical padding returns to what it was
before the date arrived. No footer ceremony; About holds the editorial matter.
Header collapses to a wrapping row at 360 px; no hamburger — four links fit.
**The row's width is a budget, and it is nearly spent** (2026-08-24, after
CI). `--font-utility` is the reader's own system stack, so this row is a
different width on every machine: in Segoe UI it had 6 px of slack at the 72ch
column, and in DejaVu Sans — a bare Linux runner's face — it was 20 px over
and the nav wrapped, making the bar 76 px instead of 61. The gaps are
`--space-4` and the two control boxes stand `--space-2` apart because that is
what fits; the nav sits in the `1fr` column, so the slack the wider gaps used
to hold simply stays inside the nav's column and nothing looks tighter.
**A control added to this row costs the nav its line** — the language control
in Amendment 36 is what spent the margin, and nobody saw it for two
amendments because the desk that built it runs a narrower face. The quality
floor now measures this row in a wide face on every machine.

*Known and not fixed: in Russian, Greek and Serbian the desktop row does not
fit one line at all* — the translated nav ("Сегодня · Все святые · Карта · О
сайте") needs 65–75 px more than English, which is more than the whole gap
budget. Those languages wrap to a second row, which is legible and overflows
nothing; making them fit would mean shortening nav labels or moving a control,
both the author's call, not a build's.

*Superseded again (author, 2026-08-25): narrow, the header is **one line of
chrome and one row of pages** — the calendar control at the left, the site
name between, the language and theme toggles at the right, and the four pages
centred beneath. "Make sure they remain in one line across all screen sizes"
is the requirement, and it holds to 320 px in all five languages: the name is
the elastic part and gives up size, then its tail, before any control gives up
its label. The arrangement below stood for one day.*

*Superseded (author, 2026-08-24): narrow, the header is three rows rather
than a wrapping one — the site name **centred across the top**, the language
and theme toggles under it at the right, and the nav on the last line with
**the calendar control at its right end**, in line with the four links and
under the toggles. Still no hamburger, and the wide header is untouched: the
calendar control simply left the corner's flex box for one of its own, so the
two can part company below 560 px. What the old wrapping row cost was the
name — crowded on one line beside a control whose label is a church's name in
five languages («Румынская»), it had nowhere to go.*

*Revised (2026-08-22): the text button names the church — Russian, Romanian or
Greek — and opens a chooser of the three; the switches and the plate are gone
with the traditions.*

*Revised again (author, 2026-08-24): the control is **a calendar mark and the
church's name** — "Romanian", not "Romanian calendar". The word was being said
twice once the mark was beside it, and the header's widest control was reading
as a sentence where everything around it is a label. The mark is the calendar
page's own month toggle at 15 px, so a reader learns one drawing rather than
two. **The accessible name went the other way, and deliberately:** an icon says
nothing to a screen reader, and the `aria-label` had been swallowing the
church's name while the visible text carried it, so a screen-reader user was
told the control existed and never which calendar it was set to. It now names
the church and what a press does.*

*The chooser the button opens lost its explanatory paragraph the same day
(author): it named the four churches and their two calendars in prose,
immediately above four buttons each printing exactly that. Four lines of
delay between a question and its answer, and the answer said it better.
`STRINGS.church.lede` is deleted rather than left dark.*

*A third control (author, 2026-08-24, Amendment 36): **the language**, a
globe mark and the current code — "EN" — between the calendar control and the
theme toggle, opening the five languages in the same panel dress. Each
language names itself in its own tongue, because the reader who needs the
control is the one who may not read the site's current language. The chrome
translates whole (`src/ui/locales/`); the corpus stays English plus the
source-language material already on the page — the boundary and its two
accepted seams are Amendment 36's entry and `lib/i18n.js`'s header.*

### 5c. The saint's page

Revised 2026-08-22 at the author's direction; until then the page had no
section of its own here and its shape lived in `saint.css` alone.

**The head is one line: the name, its two controls, and the mark.** Beside the
name stand a **bookmark** — the same Save the Index cards carry — and an
**×** that closes the page back into All Saints *as the reader left it*:
filters, search, sort, layout, Detailed, open facets and scroll position. Then
the rite × communion matrix, pinned to the margin as §7d says. Both controls
are frameless icon buttons in ink with accessible names; the Save text button
this page carried until now is gone. The × goes to the Index's remembered
position however the reader arrived; a reader who came by a deep link gets the
top of the Index.

*Revised (2026-08-22): the name and its two controls; the mark is gone (§2),
and the line no longer reserves the margin for it.*

**Every ordinary navigation lands at the top of the page it opens, and the
Index is the one view that puts the reader back.** The app owns scroll
restoration for that reason: the browser's own `auto` mode restores before a
virtualised grid has been re-rendered and so restores into nothing, and
without a reset anywhere a reader who had scrolled the Index was landing 696 px
down the saint's page at 360 px. Found measuring the ×, fixed with it.

**The veneration register reads the reader's traditions first** (author,
2026-08-22, Addendum H9): the churches in the site-wide selection stand at the
top and the rest wait behind *See other traditions*, which reveals them for
that page only — the next saint opened hides them again. The glyph beside the
name is untouched: it is a finding about the saint and shows every church
whatever the reader keeps; only what is read below it filters. Nothing is
asserted by any of this — the reader is choosing what to read, which is the
opposite of adjudicating.

*Revised (2026-08-22): the chosen church stands at the top and the other two
wait behind See other churches; the glyph this paragraph calls untouched no
longer exists.*

**On desktop the image and the register stand side by side.** At 760 px and
above the image takes a 200–260 px column, the dates-and-places register fills
the rest of the line beside it, and the body — veneration church by church,
the life, the sources, related saints — runs the full content width beneath
both. Until 2026-08-22 the whole body sat in the register's column beside the
image and spent the width of the page on one column of text. Below 760 px the
order is image, register, body, as before.

*Amended (author, 2026-08-23, Amendment 30): **every saint has a life.** Each
is written after the synaxarion of a church that keeps the saint — the Sretensky
calendar's lives for the Russian, the Ορθόδοξος Συναξαριστής for the Greek, the
Viețile Sfinților for the Romanian, the Ohrid Prologue for the Serbian — or the
nearest equivalent that could be read, and each closes with one italic line
that names and links the source and says when it was read. The life is the
author's paraphrase, never the source's text. The "no life has been written"
line stays in the strings for a saint added without one; no saint in the corpus
shows it.*

*Amended (author, 2026-08-23, Amendment 31): **the calendars' days are the
corpus.** Every name the four calendars print for a day is a folder — 708 for
23 August to 19 September 2026 — with the day's hymns, readings and fast
recorded from the calendar that prints them, and icons from Wikimedia Commons
with the file page cited on the credit line. Feasts and synaxes are not
folders; their hymns travel with the day. Where a calendar has not yet
published a day's readings the record says so (`readings: []` and a note)
rather than borrowing another church's.*

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

*Superseded in full (author, 2026-08-22, Eastern Orthodox project): the glyph
is removed — §2. This section is kept whole as the record of the cross-church
mark, which returns with the corpus it was built for; nothing in it is built
here. `badge.js`, `matrix.js`, the plate and About's legend go with it.*

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
| Index card / row, **Detailed** ticked | 17 px | 42 px | 53.55 x 30.6 | 4.74 / 1.68 | **Matrix, by the reader's choice** (author, 2026-08-22). Unscaled — the h1's pitch, fitting the 42 px line box — so the dot is the 1.68 px it is beside the h1. What this table feared for a card was a matrix *scaled* to 17 px type. |

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

**Detailed** (author, 2026-08-22; Addendum H1) lets a reader ask a card for
the §9.2 view. It does not change what a card shows unasked, it is still two
renderers over one dataset, and the decomposition invariant is what makes it
safe to offer: a card showing the matrix and a card showing the badge agree by
construction.

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

On the saint's own page two controls stand between the name and the mark —
the bookmark and the × (§5c) — as items of that same line: the name still
shrinks and wraps within itself, the glyph still holds the margin, and the
controls travel with the name rather than with the mark. Visual order only:
the DOM keeps the name and its mark adjacent, as the register rows do, and the
controls follow the mark there.

## 8. What we are deliberately not doing

The brief names the AI-default looks; this section is the standing check
against drift back toward them.

- No cream-page-and-terracotta heritage kit. The page is chalk gesso / bole
  brown; the accents are liturgical red and reserved gold, each with a job.
  The ground darkened to `#E5E4DD` on 2026-08-22 and that moves it *toward*
  this line rather than away from it, so the test is worth stating precisely:
  what is banned is cream — a yellowed page — beside terracotta. `#E5E4DD`
  carries eight points of warmth across its channels and is a chalk grey, and
  the accents it sits under are cinnabar and leaf gold, neither of which is
  terracotta. If a future nudge adds warmth to the ground, this is the check
  it has to pass.
- No near-black-with-acid-accent. Vigil mode is warm bole, and the brightest
  thing in it is a saint's gold, not a neon.
- No hairline-broadsheet costume. Rules appear only where a register rules.
- No decorative crosses, halos, illuminated capitals, blackletter, or other
  costume ornament. The subject's gravity comes from restraint.
- No gold anywhere but the badge — and, since 2026-08-22, no badge, so no gold
  anywhere until a new signature element is chosen. No red anywhere but
  liturgical time and place. These two sentences are the design.
