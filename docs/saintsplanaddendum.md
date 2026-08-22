# Gallery of Saints — Addendum A

Companion to `saints-build-plan.md`. Read both before writing code. **Where this document and the build plan disagree, this document wins** — it is newer.

Everything here falls into one of three buckets: corrections to stale text, schema decisions that must land before saint folders are authored, and design values that should be derived rather than hand-set.

---

## A. Corrections to the build plan

**A1. The veneration glyph is settled and is no longer a 3×3 dot grid.**

The current model is two-tier:

- **Tier 1 — communion badge.** A square-cell lattice of filled / hollow squares, one cell per communion. Ships in Phase 1. Hollow "not venerated" cells are full cell size, not inset. Reserved cells are hidden, not drawn empty. The lone Assyrian cell sits on a lattice row rather than being vertically centred.
- **Tier 2 — rite × communion matrix.** A fuller breakdown on the saint detail page. **Deferred to Phase 3+.** Do not build it in Phase 1, but do not model the data in a way that forecloses it.

If the copy of the plan you are working from describes §9 as "a 3×3 grid of dots" with hollow rings and faint ghost dots, that copy is superseded — request the current one before implementing. §5's church registry was revised in the same pass.

**A2. §14 is stale in one line.** It nominates "the nine-dot grid" as the signature element. The signature element is unchanged in role — it is the veneration badge — but the description must be updated to the square lattice.

**A3. Three states, unchanged.** Attested / positively-not-venerated / undocumented remain three distinct renderings, distinguishable in greyscale, per §2. Only the geometry changed.

---

## B. Schema decisions — these must land in Phase 0

Once saint folders exist, changing these means re-authoring data by hand. Settle them before the ten hand-authored saints.

**B1. Replace `location.precision` with a numeric radius.**

```jsonc
// was
"precision": "exact" | "city" | "region" | "uncertain"

// now
"uncertainty_km": 15        // radius in kilometres, number, required
```

Rationale: the map halo, the cluster threshold and label-drop logic all currently branch on a four-value enum. As a number they become one continuous function of one field, and there is no enum to extend later when a fifth case appears. Suggested authoring defaults, to be recorded in the About page: pinpointed site `1`, city `15`, region `150`, "somewhere in this province" `500`. Authors may write any value.

Validation: positive number, finite, fails the build above `20000`.

**B2. `basis` and `historicity` stay enums.** These are editorial claims, not measurements, and must not be made parametric. They may modulate *treatment* — weight, texture, a rule style — but never geometry. Geometry is reserved for things with a real numeric substrate, so that a soft edge always means "we are unsure of the number" and never "we doubt the story."

**B3. Dates are unchanged** — `{ earliest, latest, display, basis }` already carries its own numeric substrate. Interval width in years is the parameter.

---

## C. Derived values

**C1. Emit image dimensions from the build step.**

`build-manifest.mjs` reads each saint's primary image and emits into the manifest:

```jsonc
"thumb": { "path": "images/icon.jpg", "w": 900, "h": 1200, "aspect": 0.75 }
```

Cards then set `aspect-ratio` from data, so the box is reserved before the image loads. This satisfies §13's no-layout-shift rule at the source rather than by hand-matching skeleton dimensions to a fixed card box.

While the file is open, emit a dominant colour (or a tiny blur placeholder) for the skeleton fill. It is nearly free at this point and it is the difference between a grey box and something that reads as intentional.

**Sanctioned dependency exception to §3:** use a metadata-only reader such as `image-size`, which parses headers without decoding. This is an accepted addition to the "parser plus ajv" rule. Do not pull in a full image pipeline.

**C2. Variable card heights are compatible with virtualisation.** A virtualiser needs sizes known *before* layout, not identical sizes. Since the manifest now carries every saint's aspect ratio, feed exact per-item heights in and skip any measurement pass.

**One exception: the River normalises to a single card box.** Equal size is doing the equality-of-standing work that mode exists for (§8.2). Index mode and the calendar may vary.

**C3. Derive line-box height from font metrics.**

Extract cap height and ascender/descender from the font files at build time (capsize-style) and emit the resulting line box as CSS custom properties. Changing typeface then recalculates rather than forcing a re-measure of both virtualisers.

Give the `names` array its own class with a bounded line-height, so fallback substitution for Greek, Cyrillic, Coptic, Armenian, Syriac and Ge'ez cannot push the box. **Script coverage is a hard requirement, not a nicety** — the multi-script name forms are how §2's "attest, never adjudicate" principle actually appears on screen. State the chosen stack and its coverage in `DESIGN.md`.

**C4. One uncertainty curve, used everywhere.**

Softness is a continuous function, not a lookup table. It appears in exactly three places and must be the same function in all three:

- date-interval bars — parameter is interval width in years
- map halos — parameter is `uncertainty_km`
- timeline fade-in / fade-out — parameter is the birth and death interval widths

Implement as a tuned power curve with the constants exposed as tokens:

```css
--uncertainty-min: …;    /* softness at a 1-year / 1-km interval */
--uncertainty-max: …;    /* clamp, so a 500-year interval stays legible */
--uncertainty-gamma: …;  /* curve shape */
```

**Parametric substrate, hand-tuned curve.** Fully derived values are impossible to art-direct because nothing is a number anyone can nudge. The three constants above are the nudge, and they live in `DESIGN.md` as named tokens alongside the palette.

---

## D. Design sequencing

`DESIGN.md` is still gated ahead of component CSS (§14). It must contain: 4–6 named colours in light and dark, the display/body/utility trio plus the multi-script stack, the layout concept, the signature element, and the three uncertainty constants.

**Required before Phase 1 ships**

1. Colour tokens, both modes. The dark palette must host gold-ground icon imagery rather than making it glow out of a flat field (§10).
2. Type trio and script coverage — blocks C3.
3. The uncertainty curve, at minimum for date bars.
4. Card box and skeleton, now derived per C1.
5. Calendar page: week strip, and how a day with twelve saints across four traditions reads against a day with one.
6. **Saint-of-the-day hero.** Large, prominent, with a slot-machine transition as the day turns. This is a requirement and is currently missing from §8.1 entirely — add it there.
7. Motion spec: 200–300 ms cross-fade, shared-element on image and name, all of it fully disabled under `prefers-reduced-motion` rather than shortened.

**Add `view-transition-name` to card and detail DOM in Phase 1 even if the shared-element transition lands later.** It is a line of markup now and a retrofit across two components afterwards.

**Deferrable to the phase that needs it**

- River rhythm, scroll physics, shuffle animation — Phase 2.
- Globe palette, dot brightness hierarchy, cluster mark, canvas label type, legend, timeline strip — Phase 3. Halo and dissolve *inherit* from C4 and are application, not new design.
- Offline "Not available" state, app icon and maskable set, the About page glyph diagram — Phase 4. Decide then whether the badge doubles as the app mark.

---

## E. What remains freely swappable

Do not over-engineer for change in these. They are cheap by construction and should stay that way:

- **The whole palette.** All colour is already CSS custom properties on `:root` by mandate. Repaletting is a token-file edit.
- **The glyph artwork.** Inline SVG in one component, with the cell→church mapping in `churches.js` rather than in the drawing. Squares, dots or tesserae: the component swaps and no data moves. Keep it that way.
- **Radii, rules, ornament.**

The things that are *not* cheap are dimensions and enums — which is what B and C above are for.

---

## F. Trays and gaps

§2 calls honest gaps part of the aesthetic. That only holds if the undated tray and the Unlocated tray are actually styled as deliberate — a designed, labelled state with its count from `manifest.meta.json`, not an unstyled fallback list. Treat an empty or partial state as an invitation to look, and never let it read as breakage.

---

## G. Efficiency — where derived work lives (added 2026-08-22)

From a structural review of the built code after Session 5. None of it is urgent at ten saints; all of it is cheaper settled before the corpus grows than after. These are rules for where computation sits, in the spirit of C: derive once, in one place, and never inside a hot loop.

**G1. §7's "one request" holds, and `manifest.meta.json` is not part of it.** The meta file is the About page's (§8.4) and loads when About renders, in Phase 4. It must not be fetched at boot. The shell as built fetches both before the router starts; that is a drift from §7 to correct, and it is the only first-paint saving available before sharding.

**G2. Per-card derived keys are computed once, never inside a comparator.** Breadth of veneration, the life interval used for range filtering and date sorts, and the set of venerating churches are each a function of the card alone. Derive them once per card when the manifest loads — one module, one pass — and have every filter, sort and facet read the key. As built, `breadthOf` and `lifeInterval` are recomputed inside the sort comparator and the facet pass, which is n log n registry walks per keystroke; invisible at ten, tens of milliseconds at five thousand. Emitting the keys from the build instead is allowed only if measured against §6's budget — the life interval is already derivable from fields the manifest carries, so prefer load-time derivation and keep the manifest lean.

**G3. One feast index per year, memoised once, read by every view.** The calendar, the Index's feast-month facet, and later the map's "today first" rule (§8.3) all need ISO date → entries for a year. It is built in one place (`lib/feasts.js`) and cached there by year. As built, the calendar caches its own copy and the Index rebuilds the whole index on every visit; two computations of one fact. The same rule covers the facet lists (`facetsOf`): computed once per manifest, not per render.

**G4. Every cache is bounded.** The feast-index cache is keyed by year and cannot grow meaningfully. The detail-payload cache (§7's second layer) can — a long session that opens many saints keeps every life text in memory — so it takes a small LRU (on the order of fifty payloads). Prefetch budgets already bound the in-flight side.

**G5. The manifest stays on the critical path until §6's trigger fires, and the shard shape is decided now.** The whole app waits for the manifest; at projected sizes that is the FCP budget (§13). §6 and §16 still hold — do not shard before the budget is exceeded — but when it is, the shape is *calendar-first*: a small per-year feast slice (date, slug, church, feast) loads first and the calendar paints from it, and card data arrives behind. The habit page wins (§1), so the split is by what the habit page needs, not by century.

**G6. Fonts: `font-display: optional` stands; preloading is compatible and is the author's call.** DESIGN.md's choice — fallback stays on a cold slow load because zero layout shift outranks brand — is unchanged. Preloading the two Latin subsets makes the face arrive inside `optional`'s window on most loads without reintroducing shift. It costs a small build step (Vite hashes font filenames, so the preload link needs the resolved name) and it is perceived quality, not correctness; decide it at the ship gate (Session 4b), not before.

**What is deliberately not in this list:** splitting the JS bundle by route (31 KB gzipped, search already lazy — a loading state on every route for ten kilobytes), splitting the CSS (27 KB, one request), and tuning per-day paints on the calendar (a correct cost model for forty cells). The brief's own restraint applies: optimise what will be measured, and measure first.

---

## H. Two refinement rounds from screen review (added 2026-08-22)

The author's instructions of 2026-08-22, in two phases. **Phase 2 does not
start until Phase 1 has been reviewed and the go given.** Where these
contradict the build plan or DESIGN.md, these win; each contradiction is named
here and marked where it sits, per the house rule that a reversal is recorded
rather than absorbed.

### Phase 1 — the Index and the saint's page

**H1. The Index gains a *Detailed* option.** A tick box beside View
(Cards | Rows), remembered like the layout. Ticked, every card or row carries
the rite × communion matrix (§9.2's view) in place of the communion badge, and
a short description of the saint beneath the name, with the dates it already
carried.

- It is the reader's choice, off by default; §9.1 still governs what a card
  shows unasked, and the two views remain two renderers (§9.2's "do not merge"
  stands). What §9.2 loses is only "the detail view lives on the saint's own
  page": it now also appears wherever the reader asks for detail.
- The matrix ships on cards at its standard pitch, 7.65, and is not scaled to
  the 17 px type it sits beside. DESIGN.md §7c ruled the matrix out of cards
  because a matrix *scaled to that type* needs a sub-1.5 px undocumented dot;
  at the standard pitch the dot is the same 1.68 px it is beside the h1, and
  the 30.6 px mark fits the card's 42 px name line. §7c's table gains the row.
- **The description is derived, never authored twice.** It is the opening
  paragraph of the saint's own `life.md`, fetched per card as the card enters
  the viewport (the same second-layer fetch §7 already prefetches), shown in a
  box reserved at a fixed line count so the card's height is still known
  before render (C2). It is *not* emitted into the manifest: §6's card-level
  rule and budget stand, and a lede per saint is ~15–20% of the manifest at
  scale. A saint with no life shows its types instead. The moment to revisit
  is the moment G5's sharding trigger fires — the same measurement decides
  both.

**H2. Save is a bookmark.** A frameless bookmark silhouette — no button frame,
the shape over the image — at the top-right of each card's image; on a row, at
the row's trailing edge (a 48 px thumbnail has no corner to spare); on a card
with no image, the card's own corner. On the saint's page the *Save* text
button becomes the same bookmark, beside the name. Same `saved` record, same
store (§11); `aria-pressed` carries the state, a filled shape shows it, and it
is ink — never gold, never red (DESIGN.md §2). The calendar hero's Save button
was not in the instruction and is unchanged; recorded as an open inconsistency
for the author.

**H3. The saint's page closes back into the Index.** An × beside the bookmark
returns the reader to All Saints *as they left it* — filters, search, sort,
layout, Detailed, open facets, scroll. The Index snapshots its state when left
and restores it when returned to by the × or by the browser's own back; the
nav link still opens it fresh. Measuring this found two standing defects: no
scroll reset existed anywhere, so at 360 px a reader arriving from a scrolled
Index landed 696 px down the saint's page, and browser-back to the Index lost
the position at every width. Both are fixed with the ×: the app owns scroll
restoration, lands every ordinary navigation at the top, and the Index
restores itself.

**H4. The saint's page head, on desktop.** At ≥ 760 px the image and the
dates-and-places register stand side by side — image left, register right —
and the body (veneration, life, sources, related) runs the full content width
beneath both, instead of the whole page sitting in one column beside the
image. Below 760 px the order is unchanged: image, register, body.

### Phase 2 — the header, the selection, one calendar at a time

Scoped on 2026-08-22 after Phase 1, go given the same day with the five
answers recorded at the end of this section. Each item names what it
reverses.

**H5. Theme becomes a two-way toggle, sun/moon.** The *System* option goes;
the system preference is read once, at first load, and is the theme the site
opens in, after which the control is light ⇄ dark. Reverses §10 ("with a third
System option, defaulting to system") and DESIGN.md §3/§5 (three-way; labelled
text button; the stacked-labels width trick, which an icon makes moot). The
pre-paint inline script still reads the stored value, and a stored `system`
from before this change is treated as unset.

**H6. The date leaves the header.** Reverses the 2026-08-21 addition (DESIGN.md
§5 "today's date abbreviated beneath it"; SESSIONS.md Amendment 16) and
retires the browser tests that pin it.

**H7. A site-wide *Select Tradition* control in the header's corner**, where
the space is. It filters the Calendar, the All Saints page and the Map
(Session 7) from one place, and is the same selection the first-visit
question sets — `settings.traditions`, which lib/tradition.js already owns
(SESSIONS.md Amendment 20 left this door open). The question loses *Show all
of them* and gains *(advanced)*, small and unframed, opening the plate.
Reverses DESIGN.md §5b's "show all is an answer and stops the asking" —
what stops the asking now is any answer.

**H8. The Calendar shows one calendar at a time.** The page's own choice is
separate from the site-wide selection: before the week or the month can be
seen the reader is asked **which calendar**, from those the selected
traditions allow — one church's calendar, the grain at which no day lists a
saint twice or interleaves two traditions' feasts — and the answer is
remembered (`settings.calendar`). Exactly one allowed calendar is chosen
without asking. Reverses §8.1 ("every saint with a feast today across all
traditions, grouped by church") and Amendment 19's multi-tradition plate *on
the calendar page* — the plate survives as the site-wide control.

**H9. The saint's page respects the selection.** The church-by-church
veneration register lists the selected traditions first and hides the rest
behind *See other traditions*, which reveals them for that page only and
resets on the next saint opened. The glyph beside the name is a finding about
the saint and is expected to keep showing every church; only the register
filters. Attest-never-adjudicate is untouched: nothing is asserted, the
reader is choosing what to read.

**The author's answers (2026-08-22), which fixed the work:**

1. H8: the calendar is a separate selection — the page prompts for one of the
   calendars the selected traditions allow, and nothing weekly or monthly
   shows until one is chosen. (Built: a reader who has not answered the
   traditions question has every tradition and is offered every calendar; a
   selection allowing exactly one calendar is not asked.)
2. H7: the selection is a set of churches, edited by four communion switches
   *as well as* by the plate — the switches first, the plate under
   *(advanced)*.
3. H9: confirmed — the glyph beside the name stays whole.
4. H5: confirmed — untouched, the toggle follows the system live; touched, the
   choice holds.
5. H2: the question was not understood; the calendar hero's text *Save*
   button is unchanged and is the one text Save left on the site. It stands
   until the author says otherwise.

Two wording consequences recorded rather than absorbed: the first-visit
question reads *Which traditions do you keep?* now that a second question
asks which calendar to *see*; and its lede no longer offers "show all of
them". Both are one line each in `src/ui/strings.js` and the author can
reword either.
