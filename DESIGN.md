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

**The hero.** The day opens on one saint, large: image at manifest aspect,
name in display voice at h1 scale, the badge beneath the name at full grid
size, then that day's other commemorations as a register below. The pick is
deterministic from the date and the day's slugs — the same day shows every
visitor the same saint, so a shared link means a shared page — preferring
saints that carry an image, never advertising the preference. **As the day
turns** — midnight, or the reader stepping the strip — the hero changes with a
slot transition: the old panel's content rolls out vertically and the new rolls
in, direction following the direction of travel through time, 260 ms, opacity
ramping with the movement. Under reduced motion the swap is instant. The image
and name carry `view-transition-name` from day one so the card→detail
shared-element transition in Phase 1's close is markup already in place.

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
colour never carries it alone), theme control as a labelled text button. No
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

**An open bound dissolves over extent, not radius** (settled in Session 4a,
the curve's first consumer). `softness(null)` is the 24 px clamp, and 24 px of
blur applied to an 8 px date bar erases it — including the bound at the other
end, which is often a real and citable finding ("no later than 1000"). So a
bar with one open end keeps the curve's sharp value and fades to nothing over
the last 45% of its length toward the unknown side. Same reading, same "we do
not know where this ends", expressed the only way that leaves the end we *do*
know legible. Bounded intervals are unchanged: the curve alone.
Worked values: 1 year → 0.75 px (sharp); 30 years → 4.9 px; 100 years →
9.4 px; 200 years → 13.7 px; 500 years and above → 24 px. A precise date draws
crisp; two centuries of doubt draw as a visible dissolve; nothing ever snaps.

## 7. The signature element: the veneration badge (spec for Session 3)

A square-cell lattice, one cell per **communion**, generated from the registry
— exactly as many cells as communions enabled; reserved or disabled cells are
hidden, never drawn empty. Position encodes identity; a communion's cell never
moves between saints; colour never carries information alone. (Addendum A
settled the geometry: filled / hollow squares. The brief's earlier pale-grey
refusal fill is superseded.)

- Cells on a fixed pitch, inset from neighbours by ~10% of cell width (tune
  against real data before freezing). The lattice flows row-major; a partial
  row keeps its cells on lattice positions, left-aligned — a lone cell sits on
  its row, never floated to visual centre.
- **Attested:** filled `--gold` — the only gold in the product (§2).
- **Refused:** a hollow square at **full cell size** — stroked in `--ink-soft`,
  no fill, the stroke ~12% of cell width so it holds weight at card size. Same
  cell, same footprint as an attestation: a refusal is a finding, not an
  absence, and hollowness reads as "examined and found empty."
- **Undocumented:** a small centred dot, `--ink` at 25%, diameter ~22% of cell
  width. Must never be confusable with refused; this three-state distinction is
  the component's entire reason to exist.
- Greyscale check: filled block ≈ mid-value mass, hollow ≈ an outline with a
  void, undocumented ≈ a faint point — three states distinct with colour
  removed, and distinct by *shape*, which survives worse than value does.
- Below ~20 px: family-level fallback, one small vessel per communion filled
  from the bottom by proportion attested.
- Every badge carries a text equivalent ("Venerated in 2 of 4 communions:
  …; refused by …; 5 undocumented") and a hover/tap legend naming each cell.
- The artwork is one inline-SVG component; the cell→communion mapping lives in
  `churches.js`, not in the drawing, so squares could become tesserae without
  a byte of data moving.

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
