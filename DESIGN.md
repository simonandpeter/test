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

**Amended again 2026-08-26 (author): gold is spent, on two marks, and both are
findings.** "Gold is almost unused. Your design rules reserved it, and the
favicon spends it. One gold hairline under the date heading, or gold for the
feast-day marker on the week strip, would give the page the one warm accent
it's missing." Both were built, and the pair is deliberate:

* **the feast marker on the week strip** — a dot under a date whose own record
  carries the day's hymns, which is the rank cross that calendar printed. That
  is a finding about the day, sourced, and it is the nearest thing this site
  has to what the veneration badge was for. Gold is doing the work §2 reserved
  it for, on a different datum.
* **a short hairline under the date heading** — which is *not* a finding, and
  is the concession. It is 2.5 em of 1 px rule under one heading on one page:
  a warm accent, admitted as such rather than dressed up as a claim. If the
  rule "gold carries a finding and nothing else" is ever wanted back whole,
  this is the line to remove.

A third mark takes gold at one remove: the coachmarks' border and glow (§5b),
which is chrome shown once on a first visit and gone. It is named here so the
tokens.css audit finds three users of `--gold` and not one.

The greyscale test still holds on both: the feast dot is named in the day
button's accessible label, and the hairline says nothing at all.

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
rubric 6.59:1 on gesso, 6.12:1 on field. Dark: ink/gesso 14.71:1, ink-soft
6.78:1, rubric **5.54:1 on gesso and 5.18:1 on the field**.

Two things that paragraph used to say and should not have. It claimed
ink-soft "≥ 5.4:1 both modes" while the value on the light *field* was 5.29:1 —
the ground moving is what surfaced it, and it is 5.40:1 now, so the claim is
true for the first time. And it called dark-mode rubric 5.1:1 and "safe for text
at any size": it was **4.20:1**, below the AA floor for normal text, on the
token that carries the current nav item and today's date.

*Fixed 2026-08-28, Session 4b.* Dark `--rubric` was `#C05B4B` and is `#CB7769`
— lifted 8% in HSL with hue and saturation held, so it is the same cinnabar at a
value words can be read at. The defect had stood since 2026-08-22 because
nothing measured it: the browser suite ran in light mode only, and it took
Lighthouse — whose headless Chrome asks for dark — to say so out loud. Every
figure in this paragraph is now recomputed from `tokens.css` by
`tests/contrast.test.mjs`, which fails if this document and the palette disagree,
and holds every text token in **both** themes to 4.5:1 rather than trusting a
number typed into a paragraph. `--gold` is 2.78:1 on light gesso and takes no
floor, because it is never text; `--gold-ink` is the one that carries words and
is gated instead.

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

**All Saints has two faces, and opens on the carousel** (author, 2026-08-27).
The page as it opens is a search field and a drifting horizontal row of saints
beneath it; a chip beside the heading — naming *the mode it goes to* — swaps it
for the filters, the counts and the grid, and back. The change of face is a
fall and then a fade: what is on screen drops, staggered, and the mode that
replaces it comes up.

The two modes answer different questions, which is why both exist rather than
one being a tidier version of the other. The carousel is for a reader with no
particular saint in mind — it is a way of *meeting* people by looking at them,
and it is the reason the row draws a sample with the icons first rather than a
flat slice of a corpus that is 83% pictureless. Advanced search is the register:
everything, counted, filterable, and honest about what the corpus does and does
not hold. Neither is allowed to pretend to be the other, and the toggle is one
press either way.

**The carousel's cards show their pictures whole** (author, 2026-08-27). A
fixed 150 px column, and whatever height the icon's own proportions make —
never a crop. Each card is a grid whose picture row takes the row's slack, so
the icons stand on one line and the captions start on one line without anything
being resized to arrange it; a picture tall enough to reach the 240 px ceiling
is scaled to fit, which is the one case where a card is narrower than its
column and still shows the whole image. Under the name go the office and the
dates — the same subtext the Index's cards carry, because a face in a row of
faces is worth placing.

**The search field follows the reader down the register** (author,
2026-08-27). Past the head of the page it holds the line under the chrome, and
the filters ride with it: away while scrolling, down over the register when the
cursor goes into the field, away again at the next turn of the wheel. It is the
one control both of the page's faces share, and it does not move or fade when
they change — a control that is in the same place before and after has not
happened to the reader, and animating it would say it had.

**A row reads name-first.** The picture stands at the trailing end of the row,
just inside the bookmark, and a saint with no icon keeps the slot rather than
closing it up. So every name begins at the same left edge down a scrolling
register and the marks stay in one column — which is what the 2026-08-26
instruction ("print the text all the way to the left margin of the card") was
reaching for, and gets for all 742 rather than only for the pictureless ones.

### 5b. The calendar page

The habit page, so its shape is specified here rather than improvised.

**The hero.** The day opens on one saint, large: image in a fixed box
(author, 2026-08-21 — it took the manifest's aspect until then; a square from
then until 2026-08-26 and a 3:2 band since, see "the hero image" below),
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
typika.

*Trimmed further (author, 2026-08-26).* Two sentences went out of the bubble —
"including on a Wednesday or Friday", and "This calendar prints no finer rule
for the day" — on the ground that a reader looking at today is owed today; the
second was the site talking about its own silence rather than about the day.
And **a quotation that says nothing the label did not is no longer printed**:
where the calendar's note carries no allowance («Post», «Νηστεία», «Пост
(означен у календару)»), the citation stands alone. The note is shown exactly
when a grade was read out of it, which is exactly when it says more than the
line above.

*Amended (author, 2026-08-25 evening): "the fasting text should say which type
of fast is required."* The finer allowance is now printed — **where the
church's own calendar printed it**, and nowhere else. The rule above is not
repealed, and the distinction is the whole of the design: `lib/liturgy.js`
still refuses to *compute* an allowance, because that is the typikon's and
jurisdictions keeping the same fast differ. `lib/fast-grade.js` *reads* one,
matching the calendar's own words against a closed vocabulary — xerophagy,
cooked without oil, oil and wine, fish, dairy — so what the line says is a
quotation resolved, never a derivation. ~~A day whose calendar named no
allowance still says only which fast it is, and the bubble on it says what
every fast sets aside and stops.~~

*Reversed (author, 2026-08-26 evening): "For the fasting labels, change to
show the types directly … That means, 'Fast - Friday' becomes 'Strict
Fasting', and tool tip shows 'Vegan; set aside meat, animal products, cooking
oils and alcohol.'"* The struck sentence was the honest silence and it had a
cost the author saw on the screen before this file did: **only
days.pravoslavie.ru prints an allowance**, so of the 144 day records, 67
Romanian, 59 Greek and 62 Serbian fast days carry no note at all and never
named a type. Three of the four calendars were silent, and the reader's
question — what may I eat today — went unanswered on the days it is asked.

So the silence is filled, and the two halves of the rule are now different
rules rather than one:

* **What a calendar printed is still a quotation resolved.** Nothing about
  `gradeFromNote` changed. The five printed grades still outrank everything,
  in the looser direction as well as the stricter, and the calendar's own
  words are still quoted in the bubble with the page cited — but only where
  the grade was read *out of* them, which is unchanged and is why «Post» and
  «Νηστεία» are still not quoted back.
* **What no calendar printed now defaults, and defaults strict.** The
  direction is the point: strict cannot mislead a reader into eating
  something their church set aside. On an ordinary Wednesday or Friday — the
  author's own example — it is the plain typikon rule in all four churches.

**Where the default is wrong it is wrong knowably, and the fix is data, not a
cleverer rule.** A Saturday or Sunday inside the Nativity Fast reads Strict
Fasting in the Romanian calendar while doxologia.ro prints *dezlegare la
pește* on its own site, because this corpus never captured that note; the
Russian calendar, whose notes *were* captured, shows those same days in fish.
The two months sit side by side in the screenshots of Amendment 48. Capturing
the Romanian, Greek and Serbian notes closes it; `lib/liturgy.js` still
refuses to compute an allowance, and this default is not a computation of one
— it is what the site says when it has been told a day is a fast and nothing
more.

**Gold is spent on one control, and it is the only one** (author, 2026-08-26
evening: "make the icon gold to draw attention"). §2 gives gold to a finding
about veneration and to nothing else, and the Index's Random die is the first
piece of chrome to wear it. The cost is stated rather than absorbed: --gold on
gesso is 2.78:1, under the 3:1 asked of a meaningful non-text graphic, and axe
does not check icon contrast — so the browser test allows the die **by name**
and fails a second gold anywhere. The rule is not loosened; one exception is
written into it.

**The header is sticky, and on a phone the four pages are a row of their own**
(same evening): equal widths edge to edge, shorter than the links they
replaced, the current one carried by weight and a field rather than by the
underline the wide layout uses. Colour never carries it alone there either —
`aria-current` says it, and so does the weight.

**The Daily button reads Today when the reader has left today**, and only on
the Daily page (same evening). It is an offer of what that page can give, so
it is withdrawn on every other. In the four packs whose word for Daily is
already their word for Today the label does not change; the control is
unaffected and the fix, if the author wants one, is a distinct base label in
those packs.

**Every control on the Index is a chip** (author, 2026-08-26 evening, five
instructions). Sort and View print their *answer* where a filter chip prints
its question — "Random order", "Cards" — with the control's own word carried
`sr-only` beside it, so the row reads as settings rather than as labels and
values. Random is a die at the end of the filter row, its word kept as its
accessible name. Detailed came up to join Sort and View on one line, and stays
a box rather than a third option inside View: Addendum H1's axes are unchanged.

**The hero is square on desktop and a 3:2 band on a phone** (same evening),
which is the morning's band kept exactly where its own reason applies. From
620 px the picture has a column beside the body and the hero's height is the
taller column, so the band bought the register nothing there and cost a third
of every icon; below 620 px the picture *is* the card's height and the band
still earns its keep.

**An Index card's mark is in the card's corner, whatever the card holds**
(same evening), reversing the imageless card's `top: 50px` twice recorded —
once for the veneration glyph that held that corner, once for the long name
that would run under it. The name's reason is paid for with a reserve rather
than argued away.

**A panel arrives the way it leaves** (author, same evening: "the exact
reverse"). The flight home has taught where the answer lives since
2026-08-25; the way out taught nothing, because the panel simply appeared and
the page under it jumped down by its whole height in one frame. Both
directions are one journey now — `ui/fly.js`'s `journey()` gives the same
offset and the same floor-scaled size to `flyInto` and `flyOutOf` — over the
same 160 ms, with the in-flow band opening under the panel as it closes behind
it. Reduced motion removes both, as §6 requires.

**The line is chips now, and each says one thing** (author, same evening).
The fast's own chip is the grade alone — *"Don't mention the event for fasting
in the fasting label, e.g. the Beheading of the Forerunner, or Dormition"* —
and the occasion it used to trail stands beside it in a chip of its own
(*"Mention The Beheading of the Forerunner in a second separate bubble tag
like the feast tag but different colour"*), in **rubric**, which §2 spends on
liturgical time and which a fast's occasion is. The gold chip beside it is a
finding about veneration; both are edge and tint with ink words, because
neither hue clears AA as text. The allowance printed under the chip from that
morning is **withdrawn** (*"Remove the explanation of the fasting under the
bubble tag"*) and the bubble is its home again, which is what the (i) has
always promised.

An occasion that a chip beside it already names is not printed twice: where
`greatFeast()` names the day and the fast's reason is only that feast's name
— 25 December, 6 January, 15 August, 14 September, "a Great Feast on a
Friday" — the occasion chip is dropped. The Beheading and the Eve of Theophany
keep theirs, being outside the Twelve and named nowhere else.

**And the fast's colour follows the allowance, not the kind** (same evening:
"I dont see any blue labels in the Romanian calendar as i do in the Russian
calendar"). `lib/liturgy.js`'s `kind` and the resolved grade disagreed on
thirteen Russian days — «разрешается рыба» printed beside a day whose `kind`
is a plain `fast` — so the chip read "Oil, Wine and Fish Allowed" in the
rubric of a strict day. One helper, `fastTone`, now decides for all three
places a day wears the colour: the rail's dot, the chip, and the month's
numerals. **The month's numerals are new** (same evening: "in monthly view,
make the text colour of each day match the fasting dot colour for that day")
and they are named as well as coloured — the fast goes into each button's
accessible name, because the month had no words at all until it took a hue,
and §2's rule is that the words say which. Under the day's saint — or the empty note — the readings the church's
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

*Superseded outright (author, 2026-08-26): **the question is not asked.***
"Replace the language and calendar pop-ups on first opening with a fade-in
glowing tool tip with an arrow pointing to each of the two buttons, explaining
you can select your church from here, and language from here. Text as minimal as
possible."

What the gate was for was not decoration and is worth restating: a calendar with
no church chosen is the site picking one and not saying so, which is why the
page below waited. That argument is **answered rather than dropped**, on three
legs:

1. the guess is `defaultChurch()` — the reader's own browser language, the only
   thing about them this site knows and does not ask for, falling through to
   Russian, which is a corpus fact (426 of 742 folders, day records running
   furthest) and not a preference;
2. it is **never written to settings**, so `hasChosen()` still means "the reader
   has answered", the marks return next visit, and nothing downstream mistakes a
   guess for a choice;
3. the header has **named the church on every page since 2026-08-24** — the
   control that did not exist when the gate was designed — and a mark under it
   says which control changes it.

The guess is confined to the one page that cannot open without a calendar. The
Index still keeps the whole corpus until the reader has chosen, a saint's page
still shows all four churches, and the map still counts as the Index does
(`chosenChurch`, lib/church.js). A guess is allowed to *show* a calendar; it is
not allowed to set 316 saints aside.

**The fold exception goes with it**, and that is the stronger claim: a first
visit now gets the day *and* is told where the two controls are, and the saint's
own name clears the fold on that visit as on every other. The marks fade in,
glow twice in `--gold`, and leave by any of four doors — the ×, a swipe on a
touch screen, the second scroll input either way, or opening the control they
point at.

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

*Joined by a second question (author, 2026-08-25 evening): "same as the
message to choose which church, open the language options as well for first
time visitors to know they can change language."* The two are deliberately not
the same kind of question, and the difference is kept. The calendar has no
default and the page below waits for it; the language has one — English, which
the reader is already reading — so that half is an offer rather than a gate,
and answering the calendar alone opens the whole site. `settings.language`
gains a null "not asked" state to tell "English because the reader chose it"
from "English because nobody has said"; null reads as English, so no first
paint changes.

**And an answered panel flies home.** Each block shrinks and fades into the
header control that changes it from now on — the calendar question into the
calendar control, the language question into the globe — because the site
hides both answers behind two small controls and a reader who answers without
seeing where the answer went has to hunt for it next time. The same flight
closes both header disclosures. It is a teaching gesture, not decoration,
which is why under reduced motion it is **removed** rather than shortened
(§6): the lesson survives in the controls' accessible names, which say the
whole sentence.

The strip and the grid stay in the civil calendar the URL is in.

**The hero image** (author, 2026-08-21) is a fixed box, cropped from the centre
across and hard against the top, so what a tall icon loses is its lower half
rather than the face. On the habit page every day's saint is asked to sit in
the same box: an icon three times as tall as it is wide spends the fold on a
frame, and the day after it does not. The index still varies its card heights
from the manifest's aspect ratios, because there the varying box is the corpus
showing its own shape. The box is still reserved before the image decodes — a
square is as structural a guarantee against layout shift as a measured ratio
was — and the blurred placeholder is anchored the same way, or it paints a
differently-framed image under the one arriving.

*Superseded (author, 2026-08-26): **a 3:2 band**, not a square.* "Change the
daily saint image crop from square to a horizontal rectangle, focusing on the
top third of the image where the saint's face is most likely to be. This is to
reduce the height of the card to show more of what's below in the also
commemorated section." Everything above holds except the number: one box for
every day's saint, reserved before the image decodes, anchored to the top so
what a tall icon loses is its lower half. A 3:2 shows a square source's top two
thirds and is a third of the height back, which is what the register below it
gains. One case it does not serve, and it is worth writing down rather than
discovering twice: a *whole scanned page* — Sozon of Pompeiopolis's icon is
555x1707, mostly margin — has its figure below any sensible top crop. That is a
fault in the image, not in the ratio, and the fix is to crop the file.

**The hero image takes 85% of the width it took** (author, 2026-08-21) — the
column narrows from 260 to 221 where the panel gives the image a column, and
the image narrows within the panel where it does not. A tall icon at full width
was pushing the saint's own name below the fold at 360 px, which is the one
thing a hero cannot do. The reduction is applied **once**, in whichever place
actually holds the box: applying it in both took 15% twice. Where the image
does not fill its container it is centred in it.

*Superseded (2026-08-26) on the narrow layout, where the 15% was.* Both halves
of it were bought by the square: the reduction kept a tall icon's name above the
fold, and the 3:2 band does that on its own — Anthony at 360 px now clears it by
a third of a screen. The centring was a frame's habit, and with the panel gone
(below) an inset picture over a full-measure name reads as a mistake rather than
as a margin. The wide layout is untouched: the 221 px track was the *column's*
measurement and the image still fills it.

**The day's saint sits on the ground, with no panel** (author, 2026-08-26):
"Too many boxes. Language panel, day card, each commemorated saint, filters —
all outlined and inset. Let the main saint sit directly on the ground with the
icon as the strongest element, and keep the recessed panel for genuinely
secondary things."

This is a real exception to §4's card, and it is scoped: the hero and the *Also
commemorated* rows come off `--field` and lose their border; the shelves keep
theirs, because Continue reading and Saved are exactly the "genuinely secondary
things" the instruction names. A bordered box around a bordered icon was two
frames arguing, and the gesso ground behind an icon is the wall a panel hangs
on.

What replaces the register rows' edge is **nothing** — not a hairline. That was
the obvious substitute and it stood for one build, until the browser suite
caught it against the older instruction it breaks: on 2026-08-24 the author
asked that Also commemorated "read as one company, not a ruled ledger". Frames
and rules are the same answer to the same question. Space separates the rows;
the row lighting under the pointer says it is a target.

It also settles a margin the author had to ask about twice in one day — first
"move the bottom edge of the card higher" (Amendment 45), then "the margin on
the bottom of the Daily saint card is still too much" in the round after it.
With no frame there is no foot.

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

*Reversed (author, 2026-08-25 evening): "remove the dots under each date in
the calendar."* The dots are gone at both grains. What survives is the
**count**, in each day button's accessible name, and that divergence is
deliberate rather than an oversight: a reader who cannot glance at the
register has no other way to learn a day's weight before opening it, and the
number is the day's own rather than a description of a mark that no longer
exists.

*Two marks return on 2026-08-26, and they are not those dots* (author: "Dots on
the week strip for fast and feast days would let someone plan the week at a
glance"). The distinction is the whole justification: the density dot said a day
was **busy**, which is a fact about our corpus; these say a day is a **fast** or
a **feast**, which are facts about the calendar that a reader plans a week
around. Each has a source — the fast from `lib/liturgy.js` in that church's own
reckoning, the feast from the day's record carrying hymns, which is the rank
cross the calendar itself printed. A fast-free day carries none, which is what
makes a run of them legible. Week strip only, where a week is planned; the month
is unchanged. Both are named in the day button's accessible label, because a dot
says nothing to a screen reader and colour says nothing to a reader who cannot
separate hues.

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

**Fixed, and the author made the call** (2026-08-25 evening): "the buttons for
Daily, All Saints, Map and About pages go into two rows because the content
column on the screen is too narrow. Make sure this never displays like that."
The arithmetic above stands and is why there was no third option — at the 72ch
column the one-line row needs 678 px in Russian, 695 in Greek and 672 in
Serbian, where 580 exist. So *something* gives, and the decision is which:
**the nav wins and the masthead pays, in lines rather than letters.** The four
pages are how the site is used; the masthead is a constant a reader learns
once and can read across two lines — «Ορθοδοξία / Καθημερινά», every word
intact. Clipping it to «Правосла…» would have satisfied the letter of the
instruction and left the site unnamed.

Mechanically: five tracks rather than four, the nav's `auto` so it is never
given less than it needs, the slack moved to a spacer before the corner, and
the name's `minmax(0, auto)` — the only track a shortfall can come out of.
`nav.site-nav` lost `min-width: 0`, which is the line that actually did the
work: a grid `auto` track will not shrink a child below its min-content, and
`min-width: 0` overrides exactly that floor. `flex-wrap: nowrap` and
`white-space: nowrap` on the labels are the belt to those braces, so a wrapped
nav fails as overflow the quality floor catches rather than quietly returning.

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

*Both seams closed, 2026-08-26, and the boundary moved with them.* The
**paschal cycle line** was one: `lib/liturgy.js` composed "13th week after
Pentecost" as an English sentence, which put it beyond the packs' reach. It
returns a key and a number now (`cycleOf`), and `ui/cycle-name.js` renders it
— Holy Week and Bright Week as tables of seven rather than templates, because
three of the five languages decline the adjective for the weekday's gender.

The **saints' names** were the other, and that one was not a seam at all but
a thing overlooked. "The corpus stays English" was true of the *lives* and
false of the names: every folder has carried a `names` array of forms in
Russian, Greek, Romanian and Serbian since the corpus was built, transcribed
from the same calendar entries the attestations were read from. The saint page
printed them under "Also called" until Amendment 38 removed that block, and
nothing has read them since. They are chosen at build time now
(`lib/saint-name.js`) and printed wherever a name is drawn. **Nothing is
translated; a recorded form is selected.** The lives stay English, which is
the part of this boundary that stands.

What remains of the fast reasons — English strings the packs map through
`reasons` — is the last of the seam, and is smaller than either of these.

*And the hymns crossed too, but only where somebody else had already carried
them* (author, 2026-08-26). A hymn may hold an `english` block: a **published**
rendering of that same hymn, with its own citation, preferred when the reader
reads English. The sources must be ones this site may copy — a modern
translation is a living author's work and needs their permission, which is a
decision for the author of this site and not for a build.

*Two are in, and between them they say what kind of gap this is* (extended
2026-08-26, second sitting). **Isabel Hapgood's 1906 Service Book** is the
fixed services and the Great Feasts, and has no per-saint troparia at all:
five texts, twelve objects. **N. Orloff's General Menaion (London, 1899)** is
the *common* services — one troparion for any martyr, any hierarch, any
prophet — which is what a good part of this corpus sings for its
lesser-known saints: ten texts, thirty-seven objects. Neither is a menaion of
propers, because no public-domain English one has been found.

49 of 495 hymn objects, then, and every other hymn an English reader meets is
still the source's own tongue — the state of the corpus rather than a gap in
the code, and asserted as such by a test that keeps the plural martyrs'
troparion in Slavonic because Orloff does not print it.

**The rule that nothing here is translated by this build is untouched, and is
the reason the block carries a citation of its own.** Its two corollaries are
worth stating because both were live decisions: a rendering is matched to a
hymn by the *hymn*, never by the saint's type — several propers here open with
the common troparion's words and then diverge — and the source's text is
quoted as printed, so Orloff's "(mentioned by name)" and Hapgood's 1906
petitions stand where a modern book would have the saint's name.

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

**The life leads the page; the veneration register follows it** (author,
2026-08-27). The page is about a person, and the prose that says who they were
is what a reader came for. Veneration led from the first build until then,
which put four skeleton rows and a table of feast dates between the name and
the first sentence of the life — the apparatus in front of the thing it
supports. Sources stay with the life they document, above the register.

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

*Amended again (author, 2026-08-26, Amendment 44): **the day records and the
saints no longer cover the same span, and the page says so.** The Russian and
Romanian calendars publish months ahead, so their day records run to 13 January
2027 and 31 December 2026 respectively — 144 days in all — while the saints are still the
four weeks plus the Greek's 20 September. A day can therefore carry its
readings, its fast and its hymns and have no folder for any saint of it; the
Daily page names that as its own kind of silence (`dayWithoutSaints`), distinct
both from a day the corpus has nothing for and from a day this church keeps and
another does not. The hymns that travel with such a day are cut to each
calendar's own top rank — the Russian's T6, the Romanian's rank cross —
because this module is imported eagerly and the whole harvest would be half a
megabyte in every visitor's first download; what is cut is banked, not
discarded.*

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
