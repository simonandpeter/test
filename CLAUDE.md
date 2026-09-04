# Agent notes

Map, not a briefing. `HANDOFF.md` has state and rules; `SESSIONS.md` has the
reasoning. Line numbers drift — fix a wrong pointer rather than trusting it.

## Where things live

**Daily page** — `src/views/calendar.js` + `src/styles/calendar.css`
- `src/views/daily/` is "what is today": `state.js` (sole writer), `format.js`,
  `entries.js` (feast index, reach), `record.js` (readings/hymns markup),
  `panel.js` (hero, register, silences), `picker.js` (rail *and* month — one
  control). `reducedMotion` is `src/lib/motion.js` (2026-09-05; it was
  `daily/motion.js`, and seven other files carried a copy of the line).
- calendar.js keeps "which day": `render`, `select`, the roll, liturgy line,
  fast bubble. Nothing in `daily/` calls back into it.
- **Two columns past 1024 px** (author, 2026-09-01), and since the second pass
  that day they are **two real boxes rather than one panel split in half**:
  `.cal-main` holds the date, the liturgy line, the left day panel and the
  shelves; `.cal-side` holds the right day panel; `.cal-controls` sits between
  them in the document. `calendar.js` paints a day into a *pair* of panels and
  `slotSwap` rolls both. Three instructions forced that shape and none of them
  is possible with one panel: only the right column moves when the month opens
  (the left spans both grid rows, so growing row 1 cannot move it), the two
  scroll independently (each column is its own scroller and the route gives up
  the page's), and Continue reading belongs to the left. The name days went to
  the right, under the hymns. On a phone `.cal-main`/`.cal-side` are
  `display: contents` and `order` puts the six children back in reading order.
  **Known gap**: the desktop page no longer scrolls, so main.js's section
  scroll restoration has nothing to remember there — a return lands at the top
  of both columns. Anything that watched `window` scroll had to learn to watch
  whatever scrolled instead (`ui/coachmark.js`, the fast bubble in
  `calendar.js`), which is the shape of bug this change produces.
- The measure: `main` takes the window on every route (`--page-max`, base.css)
  rather than 72ch, which is what lets the header line up with the columns;
  the **right** column is what is held (`clamp(25rem, 28%, 30rem)`) and the
  left takes all the slack. The picker's floor is what sets
  the right column's: seven days, two shoulders and the month toggle need
  ~400 px, and at 330 the rail showed six days and the month would not unfurl.
  It also takes the phone's own 24 px `--cal-peek` **and its gaps** — copying
  the peek without the gaps put the month's columns 3 px off the week's.
  Two consequences worth knowing: the month now unfurls *beside* the day
  rather than pushing it down (so the tests measure `.slot-viewport`, not the
  h1), and the h1's gold rule spans the left column rather than the page.
  Three more things about it:
  (1) below the breakpoint both boxes are `display: contents`, so the phone is
  document order and unchanged — except that the name days now follow the
  register rather than the hymns, which is the price of the left column being
  a *single* grid item (a spanning item hands its height to the rows it
  crosses, and a long day of hymns drove the name days to the foot of the
  page); (2) `Continue reading` is outside the day panel — the panel is
  replaced wholesale on every day change — so `.cal` and `.day-panel` are two
  grids sharing one `--day-cols`, which only line up because nothing between
  them adds horizontal padding; (3) **the widening is set in index.html before
  first paint**, not only by main.js, or the page paints at 72ch and jumps —
  0.08 and 0.11 of CLS, blamed on `main.chrome`, reproducible only under load.
  That is the map's own 0.21 lesson, learnt twice.
- **The hero icon is shown whole up to 1:1.6** (same day), cropped from the
  bottom past it. The shape is computed per saint in `panel.js` from the
  manifest's own dimensions and passed as `--hero-shape`, because only the
  data knows one icon from another and the box must still be reserved before
  the image decodes. The author also asked for a cap at twice the square's
  height; it is never the binding one — the square's height is its own width,
  so that is 2w against the ratio's 1.6w — and `panel.js` says so rather than
  writing a `min()` term that can never be reached. Below 620 px the 3:2 band
  stands: there the image is full width and *is* the card's height.
- **The card is at least 18 lines of its own preview tall, and the picture's
  column is derived from that** (author, same day). `--lede-lines` is the one
  number the `min-height` and the lede's clamp both read. The column is
  `min(42%, 30rem, --card-h / --hero-r)` — the third term is what stops a
  wider column making *portrait* icons enormous while it makes landscape ones
  right (662 px of Lupus over a 505 px card was the version that asked for
  it), and `--hero-r` is the icon's own drawn ratio, written per saint.
  Because it is a *minimum*, the browser test pins the resolved `min-height`
  rather than the rendered height: the card is usually taller, so an
  at-least assertion would pass with the rule deleted.
- **`.hero-more` is the way into the life** — "…continue reading ›", bottom
  right of the text column at both widths, `margin-top: auto` in a flex
  column being what puts it at the bottom rather than merely after the text.
  Unlike the hero image beside it, it is *not* hidden from a screen reader:
  the image is a wordless second link to a page the name already opens, this
  has words and a different promise, and it carries an aria-label naming the
  saint.
- **The chrome doubles and spans the window past 1024 px** (same day, in
  base.css): 34px masthead, 27px nav and controls, `max-width: none`. The
  theme toggle is deliberately not doubled — it is a box around a glyph, and
  64 px of it beside 27 px type reads as an escaped button. `--chrome-h-reserve`
  gains a third value (58.1406px) and `chrome.spec.js` pins all three; note
  that test **cannot** catch the doubling being backed out, because the
  reservation is a `min-height` and holds the bar open regardless — `the
  chrome doubles and spans the window on a wide screen` is the one that does.
- **A chosen reckoning renames the day; it moves nothing** (author, 2026-09-04,
  reversing the 2026-09-02 decision this bullet used to describe — DESIGN.md
  and SESSIONS.md record both). Today is today whichever calendar names it:
  `allEntriesFor`, `dayRecordFor` (daily/entries.js) and `recordsReach`
  (daily/record.js) — the only places that fetch a day, everything else reads
  through them — take the civil `iso` directly and unconditionally. There is
  no `churchDayFor` any more; it existed for one day (2026-09-02 to
  2026-09-04) and substituted a different civil day's saints once a reckoning
  was chosen, on reasoning lib/church.js's own comment records and retracts.
  **`calendarFor` is the one place a reckoning still reaches content, not only
  a label**: which calendar's fixed dates govern the fast and the Great
  Feasts (lib/liturgy.js), on the *unmoved* civil day. The naming is
  `gridCalendar()` in picker.js and fullcal.js (the numerals),
  `reckonedHeading`/`reckonedPlain`/`reckonedMonth` in daily/format.js (the
  words), and the reckoning button's own printed word (`calendar.js`'s
  `wireReckoning`) reads `reckoningInForce()` — `calendarFor(currentChurch())`,
  `lib/church.js`, 2026-09-05 — rather than each of these keeping its own
  `storedReckoning() ?? 'gregorian'`. That per-view fallback is why "Follow my
  church" used to print "Gregorian" and quietly fast by Julian underneath at
  once (author: "'Follow my church' doesnt work as it implies but just goes
  to Gregorian"): `calendarFor` already read the church's own default
  correctly for the fast, `reckoningInForce` is that same answer read
  everywhere else too. Gregorian is also now an explicit third `RECKONINGS`
  choice rather than only ever an implicit fallback.
  **The weekday always comes from the civil day** and the numerals from
  the reckoned one: two `Intl` passes with one field swapped, because gluing
  two formatted dates together invents punctuation Greek and Russian do not
  use. `restateIso`, `dateIn`, `isoOfDate` and `daysInMonthOf` are the
  arithmetic, in lib/calendar-page.js and unit-tested — including the Julian
  29 February of 2100, which the other calendars do not have and which
  therefore stays where it is. **These are unchanged**; only `churchDayFor`'s
  use of `restateIso` to substitute a day is gone, not the labelling math.
- Every `data-iso` is a civil date whatever is chosen, so URLs, links and deep
  links never move. Only what is printed does.
- The rail and month are one seam. The *day* half is separable.
- A day steps three ways: click a rail/month day, the arrow/A-D keys anywhere
  on the page (`wireDayKeys`), or a touch swipe on the day panel itself
  (`wireDaySwipe`, `picker.js`, 2026-08-31), reusing the week/month's own
  `onGrainDrag` gesture primitive rather than a bespoke listener. Unlike the
  week or month there is no neighbour parked beside the panel to drag into
  view — a day is a whole hero and register, not a cheap cell, and
  pre-rendering both neighbours on the chance of a swipe would be real work
  paid on every visit for a gesture most visits never make. So `move` follows
  the finger with a plain `transform` on the live panel alone (direct
  manipulation, the same standing `grain.js` gives its own drag — it runs
  under reduced motion too), and only past `SETTLE` does a real day change
  happen. **The roll itself is vertical by default and sideways for a swipe**
  (`slotSwap`'s `swipeDx` parameter, calendar.js): a click or a keypress still
  gets the original fade (`slot-out`/`slot-in`, translateY); a swipe gets a
  sideways pair (`.slot-viewport.swipe`, `slot-out-x`/`slot-in-x`) instead,
  continuing smoothly from wherever the live drag let go via an inline
  `--drag-x` rather than snapping back to centre first — a swipe already told
  the reader which way the day moved, so the picture answers on the same axis.
- Also-commemorated is `.reg-card`, the register's own row, not the Index's.
- Hero carries no bookmark. Liturgy line: `paintLiturgy`; Great Feast from
  `lib/liturgy.js`. Both header panels fly: `src/ui/fly.js`.

**All Saints** — `src/views/saints.js` (composition only) + `src/styles/index.css`
- `src/views/index/`: `state.js`, `modes.js` (carousel + toggle), `sticky.js`,
  `count.js`, `filter.js` (no DOM), `grid.js` (layout, reconcile, mounted
  window, `wireGrid`), `controls.js`, `search.js`, `place.js` (snapshot).
- Two faces: carousel (default on every load) and search. `state.mode`;
  `applyMode` toggles classes on the view root. Nothing is rebuilt to swap face.
- Carousel: `paintCarousel` fills `[data-carousel-track]`; `ui/loop-scroll.js`
  is the endless-scroll engine. Cells are columns of 1–4 saints packed by
  height (`carouselCells`). Size is `--cx-w`/`--cx-max-h`, driven by
  `--cx-space` published from `modes.js` on resize. A run that fits does not
  loop (`is-static`). Imageless saints render no media box.
- Cards and rows size to their name's line count (`cardHeights`, `rowHeights`,
  `nameLines`). `ROW_NAME_LINES_MAX` and the CSS `-webkit-line-clamp` are one
  decision in two files.
- Grid is virtualised *and* absolutely positioned: mounted set ≠ corpus, DOM
  order ≠ screen order. Use `leaders()`; never `.first()`.
- Bookmark is on the saint page and shelves only.
- **The facet chip is drawn by two views, so its four metrics are on `:root`**
  (`--facet-font`, `--facet-lh`, `--facet-pad-y`, `--facet-h`, index.css). They
  sat on `.is-carousel, .is-search` until 2026-09-02, which put them out of
  reach of the saint page's own `.side-facets` — and an undefined custom
  property is not a smaller chip: `font-size: var(--facet-font)` is invalid at
  computed-value time and *inherits*, so the chips came out at the life's 17 px
  with their padding gone. It hid because arriving from All Saints leaves the
  mode class on the element the saint page renders into, so that one road was
  right by accident.

**Saint page** — `src/views/saint.js` + `src/styles/saint.css`. The `.name-line`
pattern (name shrinks, sibling control holds width) is defined once in base.css.
Everything below the life sits in `[data-late]`, hidden until the payload lands:
it appends rather than reserving, because a life's height is unknowable.
The right column (`.saint-side`, desktop only) is the reader's own search from
All Saints — the Index's own chips and rows, borrowed rather than copied, which
is why anything scoped to the All Saints view root can go missing there.

**`.search-field` needs its own `flex: none` inside `.side-body`** (2026-09-05
fix, `saint.css`, `@media (min-width: 1024px)`), or the search box on this
page occasionally loads up filling the whole column's own height. The rule it
was inheriting (`index.css`'s `.search-field { flex: 1 1 220px; }`) is written
for a horizontal row on All Saints, where `220px` is a sane basis; nested
instead inside `.side-body`'s `flex-direction: column`, the same rule reads as
"grow to fill the column," and nothing else in that column had a competing
`flex-grow` to contest it. `.side-results` carries `flex: 1 1 auto` now — it
is the box that is actually meant to grow and scroll.

**The hero image is unpinned again** (2026-09-05, reversing 2026-09-04's own
sticky fix — author: "revert to when the saint image wasn't pinned, because
very tall images like St Moses the Hungarian completely cover the veneration
info. Make the image scrollable again"). `.saint-aside .saint-media-col` no
longer carries `position: sticky` at all; the icon is ordinary in-flow
content in the column now, same as the register and veneration beside it.
The sticky version had its own bug history worth knowing if this is ever
revisited — its containing block was `.saint-intro`, not the scrollport, so
it un-stuck early rather than late — but the underlying design (a box scaled
to fit the column so it never grows past what a reader can see past) was
never going to work for a portrait with no shorter shape to scale to, which
is what the report names. `saint.spec.js`'s `the icon scrolls with the
apparatus column, not pinned above it` pins the new, opposite invariant.

**Map** — `src/views/map.js` + `src/styles/map.css`.

> **The 2026-08-31 reshaping is the biggest single change this view has had.**
> Gone: the `Map` h1 drawn on the picture (now `.sr-only` — the heading still
> exists for screen readers and for `the heading takes focus on navigation`),
> the four Died/Born/See/Relics kind buttons, the `Whole world` button, and
> the `Whole span` button. Arrived: a saint-and-place **search**
> (`wireSearch`, `data/places.js`), **typed year boxes with BC/AD** on the
> timeline's two ends, a **preset period list** (`data/periods.js`) where
> `Whole span` stood, **leader-lined label clusters** (`lib/map-labels.js`),
> and **one dot per saint chosen by date** (`pointAt`) in place of the kind
> selector. Later the same day the **footer went too** (the Natural Earth
> credit and the scroll hint; the credit is on About now), the timeline's
> **`x/y shown` readout** went with it, and the dot learned to **move along a
> dated track** (`lib/map-track.js`). Sections below are current; anything
> elsewhere describing kind buttons, a map footer or a timeline readout is
> stale.

A flat Mercator on canvas,
not §8.3's globe (author, 2026-08-29). No runtime dependency: `lib/mercator.js`
is the whole projection and `tests/mercator.test.mjs` pins it against named
places. `src/data/land.js` is generated by `scripts/make-land.mjs` from
`world-atlas`; `src/data/water.js` (lakes and rivers, 2026-08-31) by
`scripts/make-water.mjs`, which fetches Natural Earth's own GitHub mirror
directly since no npm package carries rivers/lakes the way `world-atlas`
carries land — **neither is hand-edited**, and `world-atlas`/`topojson-client`
are dev-only. Both moved from Natural Earth's 110m tier to 50m on 2026-08-31
(more real coastline/water detail, not finer coordinate rounding, which was
still `PRECISION` at a tenth of a degree, ~11 km); the pair loads in
parallel, dynamically, off the boot path. `PRECISION` itself was raised to a
hundredth of a degree (~1.1 km) on 2026-09-01, alongside doubling `MAX_SCALE`
(`lib/map-view.js`) — the reader wanting to prise apart the crowd of saints
at Constantinople was, this time, also asking to see the ground there
properly, so the two moved together rather than the zoom outrunning the data
again. Combined the pair is now ~433 kB gzipped, up from 211 kB — a second
deliberate weight-for-precision trade, on top of the one 110m→50m already
made.

**A terrain layer sits under the coastline, drawn from tiles — there is no
whole-world raster any more** (author, 2026-09-03, the tile grid narrowed to
the map's only terrain source 2026-09-04). `scripts/make-terrain.py` cuts
Natural Earth's own 50m shaded-relief and hypsometric-tint sources into a
`TILE_COLS`x`TILE_ROWS` grid of lon/lat cells at *native* resolution
(30 px/degree — the same density `land.js`/`water.js` already draw the
coastline at), pre-projected into `lib/mercator.js`'s Mercator space so the
canvas only ever scales and translates a tile, never reprojects it
(`src/data/terrain-tiles/`, indexed by `terrain-tiles.js`'s plain bounds).
Each tile ships as *data*, not a picture — one channel is a green↔sand index
read from the colour raster's own hue, the other is the relief raster's
luminance — because the map's whole palette is two tokens (`--gesso`,
`--ink-soft`) and a baked-colour asset would be exactly the hard-coded colour
`tokens.css` calls a defect. `buildTint` (`lib/map-terrain.js`) turns a
channel pair into ink at a per-pixel alpha, cached per theme and rebuilt only
on a theme change, never per frame. **Green darkens the ink and sand lightens
it, in both themes** — which end of the pair does that flips per theme
(`TERRAIN_A_LO`/`_HI`), because ink is the dark token against gesso in the
light theme and the light token against gesso in the dark one: one alpha
curve driven by greenness alone read backwards in the dark theme, desert
came out dark and forest came out light, before the two constants were split
by theme rather than shared. The wash is deliberately subtle — a small,
indicative difference between green and sand, not a coloured map — while the
relief channel keeps real ridgeline definition; both were tuned by eye
against the palette, not computed from a formula with a stated target.

**There used to also be a whole-world wash** (`src/data/terrain-green.webp`/
`terrain-relief.webp`, one ~2000px-wide raster covering the whole map, faded
out again as the reader zoomed in so it never had to stretch past what it
held) **under the tile grid below `TERRAIN_FADE_START`/`_END`, and it is
gone** (2026-09-04, author: "remove the fully zoomed out raster completely
and only keep the medium and high res ones"). A single image light enough to
ship was only a few pixels per degree — thin enough that a coastline, a
mountain edge or a grass/sand boundary read as a real, systematic lightening
against the tile grid it faded into, not sampling noise, exactly the kind of
thing "8x zoom, all terrain" would show and the honest area-average
resampling fix below could not reach, because the mismatch was the wash's
own resolution, not how it resampled. The map now fades the flat `inkSoft`
fill directly into the tile grid — `zoomFade`, `TILE_FADE_START`/`_END`
(`views/map.js`) — with nothing raster underneath at low zoom at all;
`make-terrain.py` only ever writes the tile grid, and the two whole-world
files and the script's own wash-generation code went with it.

**Past `TILE_FADE_START`, the tile grid fades in** (author, 2026-09-03,
`ensureTerrainTiles`): the map fetches only the cells the reader's own view
overlaps — one further step of the "a reader who never opens the map never
pays for it" reasoning `ensureFine` already applies to the fine coastline.
Visibility is a plain rectangle test in projected space (`visibleTiles`,
`lib/map-terrain.js`): a lon/lat cell's projected corners are still
axis-aligned, since `project`'s `x` depends only on `lon` and `y` only on
`lat`, so no real reprojection is needed to ask "does this tile overlap the
screen." Tiles fade in over the flat fill as `zoomFade` rises, and a tile
that has not arrived yet is simply not drawn — the flat fill is what shows
through the gap, so a slow network reads as *plainer*, never as broken.

**The flat fill is the land itself and is drawn unconditionally; the tile
grid is ink added over it** (2026-09-04, and this cost a real bug the same
day). The wash-era code drew the fill only while the terrain layer above it
was under full strength, which was harmless then because that expression
(`1 - tileFade`) still fell below 1 at full tile strength. Collapsing it to
`tileStrength` on the wash's removal inverted exactly that case: past
`TILE_FADE_END` the base stopped being drawn, and measured at 40× over
Constantinople mean canvas ink fell from **98.8 to 70.5** — a fifth of the
map's ink gone at one zoom threshold, which is the "all the terrain goes
lighter" report the wash removal existed to end, reintroduced by its own fix.
Sharper still: `tilesReady` counts an *errored* tile as settled, so a tile
that 404s drove the fade to full and left that cell with neither tile nor
fill — the continent drawn as open sea. `the land keeps its own ink when a
terrain tile never arrives` (map.spec.js) pins it by refusing tile fetches
and comparing coverage against an allowed run; **it took three attempts to
become a real test** — `page.route` never fires for these (the tiles go
through `fetch`, and the service worker bypasses route interception), and the
tile error path records the failure without repainting, so the first two
versions measured a stale frame and passed against the bug they were written
for. **`TILE_FADE_START` sits at 8** (2026-09-04, author: "have them fade
into view at 8x zoom not 2x as on mobile its a bit laggy currently") —
starting the tile grid's own fetch-and-decode work this late means a phone
panning at a modest zoom is never asking several tiles to arrive at once for
a layer it is barely stopped on — **and `TILE_FADE_END` was widened well past
its old 12** the same day the wash went, so the grid still eases in over many
zoom levels rather than the four the old wash-to-tile crossfade used, with no
second raster underneath any more to hide a quicker rise behind.
**`TILE_FADE_END` (20) must stay below `HR_FADE_START` (24)** — nothing
enforces it but `fadeBetween`'s own comment, and crossing it runs the
flat→50m and 50m→10m handovers at once, which is the three-layer
cross-dissolve dip this map has already paid for twice.

**The 50m grid starts fetching and decoding before the reader ever crosses
`TILE_FADE_START`** (`warmTerrainTiles`, `views/map.js`, 2026-09-04 — author:
"very heavy load at start of map page with raster images, make them load
silently in the background ... but dont show still at full zoom"). Left to
`ensureTerrainTiles` alone, nothing is fetched until the reader is already
past 8× — which is fine for a slow, manual zoom, but a reader whose first
real move is a search flight straight past that threshold asks for every
tile the flight lands on all at once, the fetch-and-decode burst
`TILE_FADE_START`'s own move to 8 was written to spare a *panning* reader
from. `warmTerrainTiles` is kicked off once `drawWhenReady`'s own coastline
has landed and fills `canvas.__tileState` a tile at a time, each one
scheduled only once `requestIdleCallback` reports the browser has spare time
(Safari has never shipped it, so a bare `setTimeout` stands in) — "silently"
was the ask, not merely "eventually", so this must never compete with
whatever the reader is actually doing. It costs nothing a reader can see on
its own: `paintCanvas`'s own `tileStrength` gate is untouched, reads 0 at 1×
regardless of what has been decoded, and is the only thing that ever decides
whether a tile is drawn. It shares `ensureTerrainTiles`'s own manifest-load
guard (`__tileMetaPending`) rather than a second copy of it — two independent
loaders racing to decide `__tileMeta` was still empty would each start
fetching, and whichever finished last would hand the canvas a second, empty
`__tileState`, silently orphaning every tile the other had already warmed
into the first one. Skipped outright under `navigator.connection.saveData`:
this is work a reader may never need, and the one case prefetching is worse
than waiting is spending it on a connection they have explicitly asked the
browser to go easy on. The 10m tier is left to `ensureTerrainTiles`'s own
on-demand fetch, since it is a small, deliberately narrow set of cells near a
located saint and only past a much deeper zoom (`HR_FADE_START`) — not the
first heavy moment this answers.

**Per-frame housekeeping in the paint path** (2026-09-04 cleanup, all of it
measured against the same picture rather than guessed): `visibleTiles`
filters the whole 72-cell manifest and was being run twice a frame — once
inside `ensureTerrainTiles` and once in `paintCanvas` — so it is computed
once now and passed in (`ensureTerrainTiles` no longer takes `frame` at all).
The land outline is traced **once** into a `Path2D` shared by the fill and
the tile layer's clip, rather than walking the fine tier's ~1,400 rings twice
a frame; `tracePath` grew an optional sink argument for that, since `Path2D`
takes the same `moveTo`/`lineTo`/`closePath` calls a context does. An earlier
attempt reused the context's *current* path implicitly instead, which is
equivalent right up until the fill stops running — backing the fill out
clipped every tile away, so the sink is explicit on purpose. Each tile's two
corners were also being `project`ed twice (once per axis). `fadeBetween`
replaces the two hand-written clamped ramps. **`data-terrain` is gone**: it
was written and never read, never cleared once set — so it latched to `ok`
and still said `ok` at 1× with no terrain on screen — and cost a scan of
every visible tile per frame to maintain, which is this file's own "ask what
an instrument would look like if it were doing nothing" rule failing in
place. `tintFor` takes one object now, both callers having passed the tile
twice since the wash's caller went.

**A third tier, 10m, for the ground this corpus actually stands on**
(2026-09-04): `make-terrain.py` also regenerates whichever cells fall within
1000 km of a located saint (`data/manifest.json`, so `npm run build:manifest`
has to run first) at 60 px/degree — twice the 50m tier's density — as
`t-{col}-{row}-green-hr.webp`/`-relief-hr.webp`, and marks that cell `hr: true`
in the manifest. China, India, the continental US and Australia are excluded
from *triggering* an HR cell even where a located saint sits inside them —
the 10m tier is four times the pixels of the 50m one per cell, and nothing in
the corpus falls inside any of the four today, so this is a ceiling on the
file this script writes as the corpus grows rather than a live cut. Fetched
only for `hr: true` cells, only once `HR_FADE_START` (24 — the author's own
first number, "around 24x or 30x if 24x is too soon" — untested against a
real screen at the time of writing) is reached, and only for cells the view
actually overlaps; crossfades over the 50m tile the same way the tile grid
crossfades over the flat fill, per tile rather than for the whole picture, so
a reader panning across the edge of an HR cell sees one image change, not all
of them.

**A tile once read lighter than the wash for the same ground — twice fixed,
the second time honestly, and then the wash it was fixed against was removed
entire** (2026-09-04). The first pass patched around it with a flat alpha
bias (`TILE_DARKEN_BIAS`, `lib/map-terrain.js`) rather than fixing the actual
cause, and the author reported the gap was still there. Decoding both
rasters' own bytes at several real cities (not reading a screenshot) found
why: the wash's own resampling was nearest-neighbour at roughly a 10x
decimation — one lucky-or-unlucky native pixel standing in for a
ten-pixel-wide patch, noise rather than a bias — and a constant correction
calibrated for that noise left a *worse* mismatch (0.08–0.14, the wrong
direction) once an honest fix (a true area average via a summed-area table,
used for the wash only — a tile was already near-native density, under 2x
decimation, so nearest-neighbour there was never the problem) landed the same
day. `TILE_DARKEN_BIAS` was removed rather than retuned, and the area-average
path went with the wash itself when *that* was removed later the same day —
there is no whole-world raster left for a tile to be measured against.

**A discrete zoom step eases now rather than jumping** (2026-09-04, author:
"make the map zooms smooth"): the `+`/`-` buttons, the keyboard equivalents
and Home/`0` all go through `flyTo` — the same cubic-ease-out flight a saint
selection already used — instead of `set(zoomAbout(...))` applied instantly.
`flyTo` itself gained an explicit `max` parameter for this (default
`MAX_SCALE`, the desktop ceiling): its own per-frame `clampView` call needs
the *window's* ceiling (`ceilingOf`), not the desktop one, or every eased
zoom step on a narrower-than-desktop window silently capped at 240x mid-flight
regardless of what `maxScaleFor` actually allows there. **The coastline, lakes
and rivers cross-fade between tiers too**, on the same ask: `paintCanvas`
tracks the previous tier's own geometry (`__detailFadeFrom`) for `DETAIL_FADE_MS`
(280ms) after `fine` flips either way, drawing it — flat ink only, not the
full terrain treatment, since this is a brief transition — under the new tier
fading in, both multiplied into the fill/cut/stroke alphas that already
existed rather than layered on top of them (`ctx.globalAlpha` does not
compose across nested `save`/`restore`, so each alpha site is multiplied by
`detailT` explicitly rather than wrapped in one outer scope). **The outgoing
tier stays at its own full opacity for the whole transition rather than
fading out in step** (2026-09-04, author: "make sure the low res coastlines
remain underneath until the high res are fully loaded otherwise theres a dip
in brightness"): it was `1 - detailT`, linearly cross-dissolved against the
incoming tier's `detailT` — and cross-dissolving two *different* shapes
(coarse and fine trace different edges) is not the same as fading one
shape's own opacity, since a pixel only one tier covers is only ever as dark
as that tier's own partial alpha, which is a real dip, not an illusion.
Holding the outgoing tier at full strength until the incoming one finishes
rising means the picture is never thinner than "coarse, fully inked"; it
disappears in the one frame the incoming tier completes rather than a fade
the reader can watch dip.

**`DETAIL_AT` briefly stopped carrying its own number, and now carries two**
(2026-09-04, then reversed 2026-09-05). It had been a flat 5 since the
coastline tiers shipped; the first move made it read `LABELS_AT` directly
(author: "change load in for detailed coastlines to 2.7x, or whatever it is
for loading the names of the saints" — the real answer, checked rather than
typed back, was `LABELS_AT`, 2.5, not the guessed 2.7), on the reasoning that
a reader zoomed in enough to see whose dot is whose is zoomed in enough to
spend the fine coastline's own cost. Living with that showed the two were
never really the same question — a phone's 5 exists for the 50m tier's own
point count against a narrow window's own frame budget, and 2.7 was always
the author's *desktop* guess at where the names should arrive, not a claim
about a phone at all — so the next day's message ("make it 2.7x on desktop
and whatever it used to be on mobile") split them back apart: `detailAt()`
(no longer a plain constant) returns `DETAIL_AT_DESKTOP` (2.7) or
`DETAIL_AT_MOBILE` (5, the original number, restored) by `isDesktop()`'s own
760px check — the same boundary `calendar.css`/`saint.css` already switch
their two-column layouts on, read live via `matchMedia` rather than latched
once at open, the same "ask again every frame" shape `ceilingOf` already
uses for a kindred question. `LABELS_AT` itself never moved through any of
this — it was only ever DETAIL_AT borrowing its number for one day.

**The terrain-reading code itself lives in `lib/map-terrain.js`, not here —
and that split is load-bearing, not tidiness** (2026-09-03). `views/map.js`
is *statically* imported by `main.js`, unlike `land.js`/`water.js` which are
data, dynamically imported: anything written directly in map.js ships in the
app's own entry bundle on *every* route, calendar and saint pages included.
Writing the tile system straight into map.js measured out to ~150ms added to
every route's own first paint on CI's throttled-4G gate — caught only because
that gate exists, not by inspection — and about two-thirds of that was a
second trap layered on the first: `new URL(\`...${col}-${row}...\`,
import.meta.url)`, a *dynamic* template literal, which Vite cannot resolve to
one asset at build time and instead inlines a lookup table for every file
that could ever match (all 144 tile halves) into whichever chunk contains the
call site (`tileUrl`, now in `lib/map-terrain.js` for exactly this reason).
`buildTint`/`tintFor`/`visibleTiles`/`loadTerrainChannel` moved for the first
reason, `tileUrl` for the second; map.js keeps only the thin, cached dynamic
`import('../lib/map-terrain.js')` and the per-frame `ctx` calls that cannot
live anywhere else. The general rule this leaves behind: a *lazy* data import
inside an *eagerly* bundled view buys nothing if the code reading that data
sits in the eager module too.

**The page is the map and its timeline, nothing else** (author, 2026-08-30
for the reading — lede, facets, Places, tray — and 2026-08-31 for the footer
that survived it). Natural Earth requires no attribution, so the coastline
credit was never owed; it is on the About page's sourcing section as a
courtesy (`about.sourcing.map`). What is left of that strip is
`.map-note` — a box floating on the picture, `hidden` until the coastline
*fails* to load, so it costs the map no height at all on an ordinary visit.

**One dot per saint, and by default it does not move.** The kind of place is
chosen by where the timeline's upper handle stands (`pointAt`, 2026-08-31) —
past the death year the relics or death place, during the life a see or
birthplace, before the birth the birthplace — **but only when the reader ticks
`Movement`** (author, 2026-09-01). Unticked, which is how the map opens, every
saint sits at their resting place and the timeline only dims. That is the
simplification: a reader dragging the years is asking which saints belong to a
period, and walking sixty-nine dots around the picture answered a question they
had not asked. The box is opt-in for a second reason — the line a dot takes
between two recorded places is nobody's finding, and behind a named box that is
a mode rather than a claim the map makes on its own.

**Above them both is `Filters`** (`wireFilters`, `.map-filter`, 2026-09-01),
a button opening a panel with two boxes: saints already dead, and saints not
yet born. Both start unticked, and **neither ever removes anything** — "even
with these boxes unticked, you still see a dot" (author). Unticked, a saint
outside the reader's span keeps their dot and loses the two things that are a
*claim* about them, their name and their halo; ticked, they read as any saint
the range reaches. The panel says so in a line of its own, because a reader
who ticked a box expecting new dots would otherwise have to work it out from
an unchanged picture. This generalises the hard-coded rule the unborn had
carried since 2026-08-31 rather than inventing a second one.

**Beside it is a play button** (`wireMotion`, `.map-corner`, bottom left) which
walks the *upper handle* from the low end of the reader's own span to the high
end at a year a second (`PLAY_MS_PER_YEAR`, read as a rate off
`performance.now()`, so a dropped frame costs frames and not years). It is
disabled until `Movement` is ticked, and any touch on the timeline stops it
(`wireTimeline`'s returned `onTouch`). Playback moves one handle and invents no
second notion of "now", so the year buttons, the dimming and the dots keep
reading the one pair of numbers they always have — and the map lights up
through the centuries as it goes. Pausing leaves the handle where it stopped,
which really is the range now: the next press plays the span as it then stands.
 `pointAt` also returns the
`state` the draw pass dims by — `live` inside the range, `past` after a
life (greyed), `future` before one (greyed twice as far, and no halo, since
a halo is a claim about a place someone *was*). **The timeline therefore
dims rather than removes**, which reverses how it shipped: every located
saint is drawn on every paint. **The `{from}-{to}: {shown}/{total} shown`
readout is gone** (author, 2026-08-31) and nothing replaced it — the range is
what the two year buttons print, and the count stopped meaning "dots on the
picture" the day dimming replaced removing. `map.spec.js`'s own
`timelineReadout` helper reads those two channels instead.

**Which side of the range a life falls on is `lifeBounds`, not `overlaps`**
(`lib/map-track.js`, 2026-08-31). The difference is one case and it was a
reported bug: `lifeInterval` keeps an open bound open, and `overlaps` reads an
open *start* as reaching back forever — so Moses the Hungarian, whose birth
the corpus records only as "before 1000", was lit at full strength in the
fourth century. `lifeBounds` falls back to the bound that *is* stated. For a
saint with no birth at all this reads their death year as the first year they
can be placed, which is stricter than the truth and still the honest bound
this corpus holds. **And a saint not yet born gets a dot and no name** (same
day): `future` dots are kept out of `layoutLabels` entirely rather than drawn
faintly, so the room goes to the saints the reader's range actually reaches.

**A saint may carry a `track`, and then the dot moves along it.** This is the
second half of the author's "tracker", and it needed data before it needed
code: a `track` is an *ordered, dated* list of stays in the saint's own
`saint.json` (`schema/saint.schema.json`'s `waypoint`), which `locations` —
unordered kinds with no dates at all — could never be. `lib/map-track.js` (pure, unit-tested) is the whole reading: `progressAt`
turns a year into a place on the track — `i` is "at stay `i`", `i + f` is
"`f` of the way along the leg out of it" — and `pointOn` turns that into a
position. **The legs wander rather than running straight** (`pointOnLeg`,
`WANDER` a sixteenth of the leg, 2026-08-31): nobody recorded the road, and a
straight line says so no better than a curve while also reading as a claim to
have flown. The wobble is two harmonics under a `sin(pi t)` envelope, seeded
from the leg's own endpoints so it is the same road every frame, and it is
computed in lon/lat so it bends the same way at every zoom. `trackPath` is
what `paintCanvas` strokes, and `pointOn` is where the dot rides — the same
curve, not two that meet at the ends.

**A moving dot glides toward its year rather than snapping to it** (`railAt`,
`glideTo` along a track, `glidePoint` between two plain places — and
`glideStep` returns 1 outright when `Movement` is off, so the resting map has
no easing in it at all). The rail is far coarser than the road it scrubs: 1872 years over
a few hundred pixels is six years a pixel, more than Moses's whole flight
from Poland, so one pixel of drag was a dot teleporting across Europe. Easing
runs in *progress* space, not position, or it would cut the corners instead
of taking them; `dt` is capped at two frames because the map paints only when
something happens and an uncapped step closes the whole gap at once. Only a
saint with a track eases — a saint without one does not travel between their
own places, they are simply recorded at each. Reduced motion arrives instead.

**The legs are drawn, not sourced**, and each waypoint's own `note` says so.
Moses the Hungarian is the one saint who carries a track today: Hungary until
1000 (his birth interval's own latest, the only bound the corpus states about
him before 1015 — the year he left is unrecorded and the crossing to Rus' is
drawn over the years that follow), Kyiv 1015–1018 (the three years of hiding
with Predslava after Boris was killed on the Alta), Poland 1018–1025, the
Caves from about 1033. He was freed in 1025 and at the Caves for the ten
years before a death in about 1043, and the eight years between are what the
dot is seen crossing. `build-manifest.mjs` carries
coordinates and years into the card and leaves the place names and notes in
the folder, the same rule `locations` keeps.

Zoom and pan live in `lib/map-view.js` — pure, unit-tested; `MAX_SCALE` is 240
(2026-09-01, doubled from 120, prompted by the crowd of saints at
Constantinople) matched this time to a coastline precision doubled the same
day rather than left behind by it: `PRECISION` (`make-land.mjs`) went from a
tenth of a degree to a hundredth, so 240 — ten times the old honest ceiling
of 24 — is itself the new one, not a knowing overshoot of it. Past 240 the
same objection from §6b would apply again: the coastline is a visibly coarse
polygon past its own honest ceiling, because the reason to zoom this far is
prising apart two saints who died in the same town, and
`declutter`'s spread is a fixed number of screen pixels. **A bare wheel
zooms** (same author instruction, reversing the old only-Ctrl rule: with
nothing below the stage there is no page to scroll past), touch is the map's
always (`touch-action: none`), and the route cannot scroll (`overflow:
hidden`; the flex column through `#view` fits the window exactly).

**A wheel briefly trailed a target instead of applying at once (2026-09-04),
and it was backed out the same day as a real bug rather than kept as the
asked-for smoothness.** The first request was "smooth/slightly lazy zooming
in/out on desktop", answered with a `wheelTarget` a `requestAnimationFrame`
loop eased `view` toward each frame. It read as a wobble rather than a lag:
`zoomAbout` couples a zoom's centre to its scale through a `1/scale` term, so
the point under the pointer is only held still by moving `cx`/`cy` and
`scale` together along that *one* curve — easing them independently toward
their own targets, a straight line each, does not retrace it, and the anchor
visibly drifted mid-transition. The author's own follow-up named the actual
ask: "the scroll up and down is what I should have said should be slightly
lazy, so theres a tiny bit of drag, not the zoom." The wheel is direct again
(`setThrottled(zoomAbout(...))`, one call per event) — `exp(-deltaY *
0.002)` was already smooth by construction for a continuous gesture, which
is what "smooth" asked for in the first place, and a discrete mouse notch
applying at once is the directness the correction wants back.

**A mouse drag trails its own target instead, which carries none of that
risk.** `panBy` only ever shifts `cx`/`cy` — nothing else depends on where
they land mid-frame, so `wireZoom` keeps a `panTarget` and a
`requestAnimationFrame` loop (`stepPanEase`) chases it at `PAN_EASE` (0.4) of
the remaining distance each frame, the same shape the wheel's own trail was,
just moved to a translation instead of a scale. `pointerType === 'mouse'`
gates it: a touch finger keeps tracking 1:1, since a lag between a finger and
the land under it reads as the map fighting the reader rather than as a
desktop nicety. `panTarget` is dropped — not merely left to finish — by a
fresh `pointerdown` and by `set()` (the one choke point every other flight on
the map, button through search, already funnels through), the same
independence the wheel and a pan already kept from each other before this
round, now extended to a drag racing its own trailing tail. **`release`
(`pointerup`/`pointercancel`) snaps straight to `panTarget` rather than
letting the trail keep running** — found live, the same day: a test read
`data-dots` right after a drag ended and clicked the position it found there,
and the ease was still a couple of frames from catching up to it, landing
the click on the *next* dot over. Coasting on past the gesture that was
driving it is its own surprise regardless of what a test happens to read —
"a tiny bit of drag" was asked for while the pointer is still moving, not as
momentum once it has stopped. Skipped entirely under `prefers-reduced-motion`
— reduced motion removes the animation, never merely shortens it.

**Two fingers pan and zoom at once, not one gesture at a time** (`wireZoom`'s
two-pointer branch, `views/map.js`, 2026-09-05 — author: "is there a way to do
both scroll and zoom on mobile at the same time, measuring the distance
between fingers as zoom and average movement as scroll?"). `spread(active)`
(the distance between the two pointers) still drives `zoomAbout`; a new
`pinchMid`, the two pointers' own midpoint compared frame to frame, now also
drives `panBy`, and the two compose in one `set()` per frame rather than
racing each other. **Both reads are deferred to a single `requestAnimationFrame`
callback (`pinchFrame`/`flushPinch`)** rather than applied straight from
`pointermove` — found live, not guessed: two fingers moving in one physical
gesture still arrive as two separate DOM `pointermove` events (one per
`pointerId`), and reading `spread`/`midpoint` off `active` between the first
event and the second was reading a half-updated Map, which could push the
scale past its own ceiling and clamp asymmetrically for one frame. Deferring
the whole read to the next frame, after both pointers' events have landed,
removes the race rather than papering over its symptom. Tested through CDP
`Input.dispatchTouchEvent`, the only route that produces two genuinely active
pointers a browser will hand to `setPointerCapture` (trap 11).

Labels arrive past 2.5×, laid out by **`lib/map-labels.js`** (pure, unit-tested):
it single-linkage-clusters the dots, gives a lone dot the space beside it,
and stacks a *whole* cluster into a column with a leader line each — deciding
per cluster rather than per dot, because trying side placements first let one
label take the space the column needed and dropped two of five (a test caught
that, not a screenshot). **A column is placed as one block** (2026-08-31):
held inside the picture, and slid up or down a row at a time (`SHIFTS`, up to
eight) until every name in it fits, before any row is dropped. Both halves
were one report — on a phone at full zoom two of the five saints at
Constantinople could not be read, one because its row met the neighbouring
Nicomedia column and one because the widest name ran off the right edge.
A dot that is itself off the picture is still never named, or the clamp would
draw a leader line out of the frame to a name pointing at nothing. **A lone
dot prefers the side that fits the whole name** to the side that merely
touches the picture (2026-08-31): right-then-left with no such preference put
a long name off the edge whenever the right was so much as grazed, and the
chosen saint's `Profile ›` button hangs off the end of their name.

**The columns only run past `LEADERS_AT` (29×)**;
below it `layoutLabels` is called with `leaders: false` and behaves as the
pass that shipped before them — beside the dot or not at all. The author
asked for that on seeing the columns everywhere ("the name display worked
better before"), and density is why: at 3× nearly every dot is within
`CLUSTER_PX` of another, so the corpus collapses into one or two clusters
and the column becomes thirty names with thirty lines fanning across the
Mediterranean. Past 29× a cluster is a few saints in one town, which is the
case the column was built for. They fade in and out over 300ms rather than popping
(`stepLabelOpacity`, `labelState`, `labelLastAt`) — which label wins can flip
frame to frame during a pan, and popping read as flicker where easing reads
as the map settling.

**A press chooses a saint; it stopped being a door on 2026-08-31.** It was
one from 2026-08-30 (Amendment 77) and the reversal is the author's: a press
under 5 px of travel — on the dot *or on the name*, which is by far the
larger target — flies the map to that saint (`choose`/`flyTo`, cubic
ease-out over 450 ms, an instant arrival under reduced motion), and only when
the flight lands do they become `selected`.

**The flight frames their whole rail, and then the dot walks it** (author,
2026-09-01: "it centres you gently over its whole rail instead of one
position", and "the dot goes over the rail smoothly over 5s"). `fitBounds`
(`lib/map-view.js`) takes the track's extent and hands back the view that
holds all of it with a margin, capped at `RAIL_FIT_MAX` (30) so a short rail
does not slam the picture to 240×; **`flyTo` therefore eases the scale as
well as the centre**, geometrically, clamping every frame — which a
constant-scale flight never needed, two views having valid views between them
only while the scale holds still. A saint with no rail keeps the reader's own
scale and the pressed pixel as the anchor, exactly as before. The walk
(`railPlay`, `RAIL_PLAY_MS` 5000, smoothstepped) is **not the `Movement`
mechanic and reads neither it nor the timeline**: one saint, their whole
track end to end, once, on the press that chose them. It ends by handing the
glide the rail's far end, so ticking `Movement` afterwards eases from where
the walk finished. Reduced motion skips it — the rail is drawn whole either
way, so it removes an animation and no information.

**And everyone else falls back while one saint is chosen** (`SELECT_DIM`,
0.35 — author, 2026-09-01: "when selected, the other saints become less
prominent"). It multiplies the dimming a dot already carries rather than
replacing it, so the timeline's three states still read against each other
underneath; halos take it on their own layer, so the single `GLOW_MAX`
composite still bounds the whole of it. Selection does three things: the
saint's `track` is drawn as a dashed rail, and **only theirs** — every rail
at once would be a second kind of mark nobody asked a question to get; their
name is laid out whatever the zoom, and *first*, so the layout seats it with
the picture still free; and a real `<button>` `Profile ›` is placed beside
that name, which is now the way from the map to a saint page (whose × still
returns to `/map`, saint.js wireBack). A press that finds nobody, or Escape,
lets go. The button is in the document rather than drawn, because the canvas
is one opaque image a screen reader cannot be tabbed into a word of; it sits
beside the name on the far side from the dot, or **under** the name when
neither side has room, which on a phone is the ordinary case rather than the
edge one. The flight centres the world point under the *pressed pixel*, not
the saint's own coordinate, so `declutter`'s fan does not leave the dot a
ring's radius off centre.

The canvas publishes `data-labels`, `data-named` (which slugs, in paint
order, so the last is the name drawn over the others), `data-dots` (each
mark's `state`, `n` and the `alpha` the paint used), `data-selected`,
`data-rails`, `data-rail` (the stroked rail's px box), `data-walking`,
`data-land` and `data-water` for the suite, written by the draw pass so
doing-nothing reads 0 or empty. `data-rail` exists because the rail is dashed
rubric and so is every dot: a test that read the framing off the ink measured
the dots too, and passed with the framing backed out. A label is kept as long as any part of its rect is on
screen, dropped only once the whole of it has left the box (2026-08-31,
`map-labels.js`) — its far edge crossing the boundary used to hide the whole
name outright; the canvas already clips whatever is drawn past its own
bounds, so there was nothing this needed to do but stop refusing to try.
**Saints at one identical coordinate are spread into a tight crowd, in
degrees** (`spreadShared`, `SPREAD_DEG` 0.0167° ≈ 1.8 km — author,
2026-09-01: "spread the dots around as coordinates on the map if they're
stacked ... still pretty tightly spaced when zoomed in fully to communicate
proximity"). **The unit is the whole difference from the fan below**: a
ground offset is sub-pixel with the world on screen, so `mergeDots` still
collapses the group into one honest mark, and it opens into a constellation
only as the reader goes in — ~10 px between neighbours at 240× on a 900 px
picture.

**The packing inside that spread changed from concentric rings to a relaxed
random scatter on 2026-09-04** (author: "draw blobs around them" led with a
standalone mockup, `scatter-mockup/index.html`, comparing four candidates
against the shipped rings at the Nicomedia martyrs' own count — rings +
jitter, Poisson-disc rejection, a phyllotaxis spiral, and random-start
min-separation relaxation, which is the one chosen). `relaxLayout`
(`lib/map-view.js`) seeds `n` points at random inside a disc sized to
`sqrt(n)` — the ring layout's own reason twenty-four martyrs sat inside three
rings rather than a wheel three times as wide, kept — then runs sixty passes
pushing any pair closer than `radiusDeg` apart; the RNG (`scatterRand`, a
local mulberry32 seeded by an FNV-1a hash of the group's own `lon,lat`) is
what keeps this from being a fresh roll every paint, since `paintCanvas` calls
it every frame of a drag. **Computed once, on the group's own coordinate, not
in screen pixels** — capacity-constrained k-means below shares this reasoning
explicitly, but it is already true here: a uniform scale and translation
(what panning and zooming are) cannot reorder relative distances, so the
scatter a group settles into does not need recomputing as the reader moves.
The latitude of the *result* is still multiplied by `cos(lat)` before it
reaches `lon`/`lat`, exactly as the ring did, so the crowd still draws round
under Mercator rather than as an ellipse — `relaxLayout` itself works in an
idealised, unsquashed unit for exactly this reason, and `spreadShared` applies
the correction once, at the end. This reverses, deliberately, the "identical
coordinates never separate" rule written hours before the ring shipped; the
map tests that pinned the ring's own exact geometry (every point at one
shared radius from centre) no longer describe what is drawn and were rewritten
rather than merely renamed — the bounds they check (small at rest, resolved
by the ceiling, round on the picture, growing as the square root) are
unchanged in *kind*.

**A coordinate with more than `BLOB_MAX` (8) saints is partitioned into blobs
of at most that many, and only the one under the screen's own centre is
named** (2026-09-04, the same sitting, following the mockup's own
`scatter-mockup/blobs.html`: "only do this blob function wherever there are
more than 8 saints, at which point you will have 2 blobs — no point in
having a single blob, the function of the blob is for large clusters"). The
mockup went through two shapes before this one: the first tried giving each
blob its *own* scattered sub-position, offset from the shared coordinate at a
coarser radius than the members inside it — reversed the same sitting
("dots exactly as they were scattered, and the blobs are drawn around that
scattering") once the author asked to see the group's *actual* relaxed
scatter with hulls drawn around subsets of it, not a second layout invented
on top. `capacitatedGroups` (`lib/map-view.js`, pure, unit-tested) is that
subset-finder: nearest-centroid-with-a-free-seat, sorted by distance and
reassigned across a handful of Lloyd passes, so no group ever exceeds the cap
even where the geometry is lopsided. **Read on the group's *actual scattered*
positions, not its pre-scatter coordinate** — the opposite of `relaxLayout`'s
own invariance above, and the fix for a real bug (2026-09-04): partitioning
used to run in `views/map.js` before `spreadShared` moved `lon`/`lat`, on
points that — before the move — were all still identical, which makes a
nearest-centroid split spatially meaningless. Every blob still ended up
uniformly smeared across the *whole* cluster once `relaxLayout` later spread
them, guaranteeing heavy hull overlap ("the blobs are overlapping each other
... that ruins the point of clarifying and organising visually"). Moving the
call inside `spreadShared`, after `relaxLayout` runs, fixed it — `capacitatedGroups`
now partitions ground the members are actually standing on.

**A partition alone still overlaps**, since `capacitatedGroups` only assigns
members to sub-groups and never moves anyone — the sub-groups inherit
whatever footprint the whole crowd's own scatter had, which routinely leaves
two groups' hulls interleaved rather than side by side. `separateGroups`
(`lib/map-view.js`, pure, unit-tested) is the second half of the fix: it
treats each sub-group as a circle — radius the furthest member from its own
centroid — and relaxes the group centroids apart over 60 passes until every
pair clears `radii[i] + radii[j] + gap` (`gap` is `radiusDeg`, the same
spacing a pair of ordinary dots is held to), returning one offset per group
that `spreadShared` applies rigidly to that group's own already-scattered
points. Two coincident centroids never separate (the push direction is
`dx/d, dy/d` and both are zero when `d` is zero) — not a concern in practice,
since two sub-groups of a real relaxed scatter essentially never land on the
exact same point, but worth knowing if a future caller ever feeds it two
identical groups on purpose.

Each blob's outline is `convexHull` of its members, inflated (`inflateHull`,
16 px) and traced as a rounded shape rather than a polygon with corners — a
cheap "blobify a hull" trick, each edge's own midpoint standing in for a
curve anchor. **Which blob is open persists across paints** (`activeBlobId`,
alongside `selected` and `focus`), decided by `pointInHull`/`distToHull`
against the screen's own centre with `BLOB_HYSTERESIS_PX` (20) of margin
before a different blob takes over — without it, a reader whose drag stops
near two blobs' shared edge would watch the names swap on every further
pixel. **A hovering mouse previews a blob without becoming the sticky choice**
(2026-09-04, author: "on desktop only, when you hover your mouse over a blob,
its the same function as moving the centre of the screen over the blob").
`activeBlobId` answers only to the screen-centre rule above, never to
`hoveredBlobId` — a separate, per-frame `openBlob` (`hoveredBlobId &&` the
blob it names, falling back to the centre's own choice) is what a paint
actually draws open, so the moment the pointer leaves the picture returns to
exactly what the centre already had rather than the hover having quietly
overwritten it. `hoveredBlobId` is set only from a `pointerType: 'mouse'`
`pointermove`, cleared on `pointerleave`, so a touch resting on a blob (no
`pointerup` yet) never opens it. `blobAt` is checked in that `pointermove`
handler *whether or not `dotAt` also answers* — a blob's own hull is mostly
its members' dots, so gating the check on "no dot found" the way the cursor
and the click do would mean hovering the blob almost never fires. Only ink,
never gold, for the open/closed distinction itself: which blob is open is a
fact about where the reader is looking, not a veneration finding, and §7
gives gold to that alone.

**A click on a blob frames it the way a press on a rail's dot frames the
rail** (2026-09-04, same author message: "when you click on a blob it
centres you onto it smoothly as it centres you when you click a dot with a
life rail and it centres you over the rail"). `chooseBlob` borrows `choose`'s
own `fitBounds` + `flyTo`, but not `RAIL_FIT_MAX`: a rail spans a real
ground distance, so capping how far *in* framing it goes is the only bound
that ever binds, while a blob is only reachable at all once its own members
have separated far enough to resolve (`readyBlobs`) — `fitBounds`'s honest
answer for "fill the frame with just these dots" is routinely *tighter* than
the zoom the reader is already standing at, and capping it down the way a
rail's flight does would zoom back out of the resolution that made the blob
clickable, un-blobbing it the instant it is pressed (found live, on a
phone's narrower ceiling: clicking closed a blob it had just opened).
`Math.max(fitted.scale, view.scale)` is the fix — never asked to zoom out to
fit something already on screen, only ever in. **A click at a blob's own
centre still has to open the blob and not one member dot standing near it**
— trap 14, above, in "Traps": `wirePress`'s `pointerup` now only lets a dot
win over its own blob when that blob is the one already open (`openBlobId`),
since a closed blob's members carry no name on screen to have been aimed at.
No saint is selected by any of this — a blob is a grouping of several real
saints rather than one of them, so `chooseBlob` never touches `selected` or
`focus`.

A blob that has not yet fully separated into individually-visible dots — the
whole coordinate is still one `mergeDots` mark, or partway there — is left
exactly as that mark already draws; there is no clean outline to draw around
dots that have not resolved into real positions yet. The closed blobs print
`STRINGS.map.blobCount` ("+{count}") at their own outline, bare rather than
led by a name the way `andMore` is — a blob is not a collapsed mark standing
in for a saint too close to separate, it is a *readable* group of real,
individually-drawn dots the picture is choosing not to name right now, so
there is no one of them to lead the count. `data-blobs`, `data-blob-open` and
`data-blob-counts` publish the state for the suite, and `data-dots` carries
each dot's own `blobId`, the same "the pass that draws is the pass that
knows" rule every other canvas instrument on this page already keeps.
Constantinople (5) and the Caves (2) are both under `BLOB_MAX` and never
partition at all — the corpus's only coordinate over it today is Nicomedia's
27, which is why the mockup built its case there.

**A blob's own count label follows the same "can run off the picture rather
than pull back onto it" rule a saint's name already did, and did not until
2026-09-05** (`layoutBlobLabels`, `lib/map-labels.js`) — a real, reported gap:
Nicomedia's own blob sits hard against the map's right edge (its own ground
runs into Anatolia's own coast there), and `layoutBlobLabels` alone still
clamped its count's box to stay fully on screen and dropped it once no
position could, where `layoutLabels` had already been fixed to let a label
run off frame rather than either clamp or drop. `tests/map-labels.test.mjs`
pins a blob hard against the edge the same way the saint-name fix is pinned.

**Dots the reader cannot tell apart are one mark, at a real coordinate**
(`mergeDots`, `lib/map-view.js`, pure, unit-tested; 2026-09-01). This
replaced `declutter`, which fanned them into concentric rings a fixed number
of *screen* pixels wide, and the author's report is what retired it: "the
clustering at full zoom doesn't work: the saint dots in constantinople
stretch out into the black sea. Make it so more dots are revealed as you zoom
in and are actual coordinates on the map not scaling clusters." Every
position in that fan was invented, it covered more country the further out
the reader went — across the Bosphorus and into the Black Sea — and it never
resolved, the ring being the same size at 1× as at 240×. Now every mark sits
on a coordinate a saint is actually recorded at (the representative's own),
a mark standing for more than one carries `n` and prints `{name} +{count}`,
and members separate into marks of their own as zoom pushes them past
`MERGE_PX` (10) — so **more dots really are revealed going in**. Saints at an
*identical* coordinate (twenty-four martyrs at Nicomedia, John the
Long-Suffering and Moses the Hungarian at the Kyiv Caves) never separate at
any zoom, so they stay one mark that says how many; **a second press on a
mark steps to the next saint under it**, which is the only way those are
reachable and is why the press cycles rather than refusing.

**Which name a crowd prints is `rankOf` (map.js) over `dailyRank`
(`lib/map-labels.js`)** — author, 2026-09-01: "favour the saints that are
main saints on the daily page and the also commemorated in order when
deciding which name to print over the others when zoomed out". `dailyRank`
borrows `pickHero`'s own precedence, a saint some church sings for above one
with an icon above the rest; the two tiers above it are the chosen saint and
**a saint whose dot is moving** ("if a saint moves along its rail, make their
name print over others while its moving"). A rail breaks a tie inside a tier
and is never a tier of its own — it is what makes Moses rather than John the
mark at the Caves, the two being equal on everything else. The same order
seats the labels (best-ranked laid out first, against a free picture) and
paints them (best-ranked last, so it lands on top).

The old `keyOf` note is gone with the fan it described. **This does not make
every dot followable to the full 240×** — a wheel spun without the pointer
ever re-centring can still out-run a dot on a window that has shrunk to a
sliver of a degree, which is a limit of anchor-preserving zoom at a high
ceiling more than of any one bug.

**Halos are composited on their own layer and laid down once at `GLOW_MAX`
(0.5)** — author, 2026-08-31: the glow "never exceeds 50% opacity". Capping
each halo separately cannot hold that line: alpha compositing is
`1-(1-a)^n`, so three halos at 0.45 already reach 0.83 and a cluster is
effectively opaque. One layer, merged however the halos like, then a single
`drawImage` at 0.5, means the darkest pixel the coastline can ever see is
exactly 0.5 whether one saint is under the pointer or forty. The halo
*radius* cap came down at the same time (`min(w,h)/8`, was `w/2`): `w/2` was
chosen when `MAX_SCALE` was 12 and never bound; at 120 every halo became a
640 px disc and capping alpha could not help, because 50% of a saturated
wash is still a saturated wash.

**A timeline bar sits under the picture** (author, 2026-08-30 evening),
drawn on the stage per Amendment 77's promise rather than printed below it:
two overlaid native `<input type="range">` over one rail, reading each
card's `lifeInterval` (from `lib/index-filters.js`, same semantics as the
Index's own date facet). Undated cards are never dimmed — there is nothing
to judge them against — so they always show at full strength. **That is also
a claim, and on 2026-09-02 it read as a false one**: `pointAt` returns
`state: 'live'` for an undated life, so Sergius of Radonezh was lit, haloed
and named at 66 AD (author: "any saint who is on the map for longer than 100
years as alive may need a check"). Eleven located saints were in that state
and not one of them had a *wrong* date — the corpus takes its years from
days.pravoslavie.ru, and these were saints the Russian calendar does not
keep. Five were datable and now are; the six that remain are named in
`tests/map-span.test.mjs`, which holds that list and the author's
hundred-year threshold so a twelfth cannot arrive unnoticed. Shortening it
means finding a source: saint.gr prints no year for any of them, and a
martyrdom placed only by naming a persecution is not a date.
`dateFrom`/`dateTo` are held at module scope, for the visit and not
persisted. The highlighted span between the two handles is a third grab
target (`wireTimeline`, on `.map-timeline-fill`): dragging it slides both
handles together and holds their width, clamped as one unit against either
bound. **Each end is a fixed-width button that opens a panel** carrying the
number and a BC/AD select (2026-08-31; it was a bare box and select for one
build, and the author asked for the button). Fixed width is the point:
sized to content, the rail between the two ends jumped every time a year
gained a digit. The button prints the year as read — `431 BC`, `1917 AD` —
the typed number is always positive and the era carries the sign, and
`change` rather than `input` means the ends do not swap mid-keystroke.
Typing an earlier year on the right **swaps the two ends** rather than
refusing — the same sorted-pair rule `commit` has always applied to the
handles. Both are clamped to the corpus's own span, since the rail cannot
represent a year outside it (so a BC year currently clamps to 66, the
earliest located saint — the control is right, the corpus has no ground
below it yet). The outside-press listener that closes the panels is on
`document` and so is registered in `cleanups`, which `destroy` drains. **`Whole span` became a preset list** (`data/periods.js`,
`.map-timeline-preset`) and survives as that list's own first entry: a
`period` is used as written, an `event` is read as its year ±
`EVENT_MARGIN` (50, the author's number, applied in one place).

**A saint-and-place search sits where the legend did** (`wireSearch`,
`.map-search`, 2026-08-31), replacing the kind buttons. One box over two
corpora — the located saints and `data/places.js`'s hand-written gazetteer —
because "where is Anthony" and "where is Alexandria" are the same question
asked of a map. The gazetteer is hand-written on purpose: a modern
populated-places set would miss Constantinople, Nicomedia, Carrhae and
Thebes, which are the places this corpus is *about*. It is a real combobox
(`role`, `aria-expanded`, `aria-activedescendant`) because the accessible
behaviour of a listbox is not light to rebuild, and it **moves the map
rather than navigating** — a dot is already the door to a saint. It flies
through `wireZoom`'s own returned `set`, so the zoom readout moves with the
picture; assigning `view` directly left the chrome saying 1.0×. The flight
is announced into an `aria-live` box, since the canvas is one opaque image
to a screen reader. **`type="search"` (2026-09-04)**, matching the All
Saints field (`index/controls.js`): the platform's own clear "×" at the
field's own right edge, offered for free rather than built and wired to
`close()` by hand. `input.map-search-input` in `map.css`, not the bare class
— `index.css`'s generic `input[type='search']` rule is an element-plus-
attribute selector, which outweighs a bare class on specificity regardless of
load order, and would otherwise have handed this field the Index's own
smaller font size and tighter padding the moment the attribute made it match.

**A faint historical atlas layer is drawn under everything else, unconditionally,
whether or not the search has ever been opened** (`HISTORICAL_LABELS`,
`data/historical-labels.js`, `paintCanvas`, 2026-09-05 — author: "add a faint
layer of text with the location names, the main locations, Alexandria,
Damascus, Antioch, Constantinople, Nicomedia, Laodicea, Cappadocia, Anatolia,
Rome, Italy, old cities and regions as well"). **Deliberately a separate file
from `data/places.js`**, even where a coordinate repeats: that one is read
only in answer to what the reader types, this one is drawn on every paint the
way a printed historical atlas names a region across the ground it covers
whether or not anyone asked. It is drawn *before* the saints loop computes a
single dot, so it never competes with a saint's own name for space — a city
keeps a small marker of its own, faint ink at low alpha, so its name has
something to sit beside once a saint's own dot lands on the same coordinate;
a region has no one point that is "it" and is centred type alone, in capitals,
the way an atlas sets a region apart from a city on the same page. **A region
fades out by `HIST_REGION_FADE_END` (14×) and a city fades in by
`HIST_CITY_FADE_END` (2×) and stays** — a region is a claim about broad
ground, which a deep zoom has already left, where a city is a real place worth
naming at exactly the zoom a reader is there to read a saint's own name at
too. `canvas.dataset.historical` publishes which names actually landed this
frame, the same "the pass that draws is the pass that knows" rule
`data-dots`/`data-labels` already keep. **Positioned once, drawn in two
batches by kind** rather than one pass alternating between them: `ctx.font`
re-parses its string on every assignment, and this layer's own seventeen
entries would otherwise be up to seventeen of those a frame on top of
everything else already painted — batched down to two.

**The zoom controls are a scale readout plus, on a pointer device, `+`/`−`**
(author, 2026-08-31). `Whole world` is gone at every width — Home and `0`
still do it from the keyboard, which is what `map.spec.js` now uses. The
buttons hide under `@media (any-pointer: coarse)`, which asks whether a
finger is available rather than guessing from width, so a small desktop
window keeps them and a large tablet does not.

The density-paced *brush* §8.3 describes stays deferred — 69 of 851 located
saints still cannot demonstrate a pacing algorithm, which is a different bar
from the label layout and the dot declutter above, both of which the corpus
can already exercise.

**The dot's own rail is only drawn for the chosen saint**, so the tracker
and the selection are one feature rather than two: `paintCanvas` collects
`rails` from `pointAt`'s returned `track` and keeps only `selected`'s.

**The rest view is `defaultView`, not `lib/map-view.js`'s own `HOME`**
(map.js, 2026-08-31, fixing a real bug rather than a preference). `HOME`'s
`cx`/`cy` of 0.5 is the equator and the prime meridian — mid-ocean, nowhere
this corpus has a saint — and every zoom the + button and the keyboard do is
anchored on the screen's own centre (`zoomAbout(view, …, 0.5, 0.5, …)`,
deliberately predictable). A reader who opened the map and pressed + a few
times without first panning was therefore zooming toward empty sea and away
from every dot: reproduced with Martha of Diveyevo, gone off the top of the
screen by the second press. `defaultView` centres the rest view on the mean
of every located point's own projected position instead (the mean, not the
bounding box's midpoint, so one outlying saint cannot drag the centre toward
ground the rest of the corpus is nowhere near) — computed once from
`withPlace`, not `visible()`, so the timeline narrowing what is drawn does
not also swing the frame around. It is what "Reset" and the keyboard's `Home`
return to as well, held in module-scope `homeView` beside `view` itself. This
does not, and cannot, guarantee every dot survives arbitrarily deep zoom from
a fixed anchor — only that the ordinary case, a few presses with no panning,
still shows a map with saints on it. `map.spec.js` pins the ordinary case.

**And it waits for a box** (`settleHome`, 2026-08-31). `render` can run
before this canvas has been laid out — the router calls it inside a view
transition's update callback, where the document's rendering is suppressed
and a freshly written element measures 0 by 0 — and `coverFractions(0, 0)` is
0/0 on both axes. A NaN frame makes a NaN centre and `toScreen` then puts
*every* dot at NaN for the rest of the visit: an empty picture, and
`createRadialGradient` refusing a non-finite radius sixty-nine times a paint.
So the rest view is computed on the first frame there is a real box for,
through `applyView` (which becomes `wireZoom`'s own `set` once that has run),
and only if the reader has not already moved the map themselves. Until then
the map looks at plain `HOME`.

**Painting is throttled, and the split matters.** `land.js`/`water.js`'s
50m tier roughly tripled the picture's own point count, and painting
synchronously on every raw pointer event a drag or a wheel spin produces —
several a frame — was most of what made the map feel laggy once that data
landed. `render`'s own `schedulePaint` coalesces those into one
`requestAnimationFrame`-scheduled repaint; `view` and the chrome (zoom level,
disabled buttons) still update the instant an event arrives, only the canvas
redraw itself waits a frame. **Only continuous gesture handlers use it** —
the map's own wheel/pinch/pan, and the timeline fill's pointermove
(`refresh(true)`, 2026-08-31). A button, a key, or a kind press paints
synchronously through the same code path they always did: each happens once,
so coalescing buys nothing, and `map.spec.js`'s "Reset comes home" test —
click, then immediately read the canvas — is a real caller a frame of added
latency would have made flaky (caught on `mobile-360`; the fix was to split
`set`/`setThrottled` rather than throttle everything alike). Per-frame cost
itself is cut two more ways: `paintCanvas` skips a land/lake/river shape
entirely once its own lon/lat box cannot overlap the visible frame — cheap at
rest (the whole world is on screen, nothing culled) and large once zoomed
into the corpus's own corner of it, which is where a reader actually spends
their time — and every dataset draws as one path (one `fill`/`stroke` call)
rather than one per shape, which a bug of the same age had made 878 separate
`ctx.stroke()` calls for the rivers alone, and — worse — a fresh
`ctx.beginPath()` per lake ring meant only the *last* of 457 lakes was ever
actually cut from the land.

**The stage is the window, not a card** (author, 2026-08-29), which costs two
things worth knowing. `main` gives up its column on `html[data-route='map']`,
and that attribute is set by **index.html before first paint** as well as by
main.js on navigation — set only in JS it is a 0.21 layout shift. And the world
*covers* a box of any shape (`coverFractions`), so one axis is cropped rather
than the picture being stretched; the painter must size its backing store from
the box, never from `ASPECT`.

Cluster-aware labelling (`lib/map-labels.js`) and the dot-level `declutter`
both shipped once the corpus gave them something to demonstrate (69 of 851
saints located, 2026-08-31; see Map above). Only the density-paced brush —
§8.3's fuller fading-by-crowding vision — is still deferred, and for the
corpus-size reason, not the effort.

**Tokens** — `src/styles/tokens.css`. Two theme blocks; a colour change needs
both, and **both are now checked**. The light ground is `--gesso: #ECE5D6`
since 2026-09-01 (author: "replace the background colour on light theme with
gesso #ece5d6"), warmer *and* lighter than the `#E5E4DD` it replaced, so
every text token gained contrast rather than needing re-tuning; `--field` and
`--veil` were re-derived with it — the veil *is* gesso at 0.8, and a field
left behind would be a grey panel let into a cream page. Three places print
those figures and all three are held to the palette:
`tests/contrast.test.mjs` (DESIGN.md's paragraph), and
`index.spec.js`'s `the day ground is gesso` (the shipped `rgb()` and the
recessed-field relationship). `tests/contrast.test.mjs` recomputes every
text token against both grounds in both themes and holds DESIGN.md's printed
figures to the palette, and `quality-floor.spec.js` runs axe over every route in
vigil mode as well as light. That gap let a WCAG AA failure stand from
2026-08-22 to 2026-08-28 with DESIGN.md recording it the whole time.

**Chrome** — `src/main.js` renders the nav. Sticking is on `.chrome-bar`. The
masthead is an SVG wordmark: `scripts/make_wordmark.py` generates
`src/ui/wordmark.js`, a Vite plugin injects it into both slots in index.html.

**The app owns scroll, and the browser's own competing opinions are turned
off one at a time as they are found** (DESIGN.md §5c). `router.js` already
set `history.scrollRestoration = 'manual'` for this — the platform's back/
forward restore fires before a virtualised grid has re-rendered and restores
into nothing. **`overflow-anchor: none` on `html` joined it 2026-09-04**,
found chasing "a restored section never touches zero on the way" failing in
CI at 1235 instead of 1200: traced with a monkey-patched `window.scrollTo`,
`main.js`'s own `restoreSection` was landing exactly on 1200, the *only*
`scrollTo` call made — so what moved the page afterwards was never a script.
Chromium's own scroll anchoring was reacting to the Daily page's late-arriving
content (the hero's hymns; `restoreSection`'s own comment already names the
shape of this — "a cold `loadDetail` can outlast the wait") growing the page
*above* the restored position and nudging `scrollY` to hold the visible
content still. `settleLate`, the safety net for a restore that fell short,
was never going to catch this: its own guard (`landedAt >= y`) reads landing
exactly on target as nothing left to fix, which is true of the scripted
restore and not of a target the browser then quietly moves out from under it.

**Strings** — `src/ui/strings.js` (source of truth) + `src/ui/locales/{ru,ro,el,sr}.js`.
Touch all five, then `node scripts/locale-coverage.mjs` (0 fallbacks before
done). `BRAND` is the site name and is never translated.

**App mode** — `public/sw.js` (hand-written, four caches, one per §12
strategy) + `lib/offline.js` (registration, and Save's eager precache). Every
cache match ignores `Vary`, the shell's own assets are precached at install by
parsing index.html, and nothing non-ok is ever cached. The worker runs under
the whole e2e suite via `vite preview`; `e2e/pwa.spec.js` is the offline
claims. Icons: `scripts/make-app-icons.py` (committed output in `public/`).
**A carousel rebuild hands its live gesture to its successor**
(`handoff`/`inherit` in loop-scroll) — the worker shifts when fonts settle, and
a wheel spun on a dying loop used to die with it.

**Boot** — `boot()` awaits manifest + `readyDays()` + one locale pack.
`data/liturgical-days.js` is imported only by `days.js`. `manifest.meta.json` is
off the boot path and **the About page is its one reader** (`loadManifestMeta`).

**About** — `src/views/about.js`. The editorial policy, written as substance
(brief §8.4). **It states no number and no source name of its own**: coverage is
read from `manifest.meta.json` at render time, the calendars come from
`data/churches.js`, and the cited publications from that file's `by_source`,
which the build counts from the saints' own files. Anything typed in here goes
stale the next time a folder is added.

**Texts** — `src/views/texts.js`, `src/lib/texts.js`, `data/texts.json`
(2026-09-04). Not a new content-rendering path: a saint's own primary source
already reads in full on their own page (`views/saint.js`'s `sources()` /
`wireSources()`, a closed `<details>` fetched only on open); this route is the
index across every saint who has one, each row a door to that page. `texts.json`
is built by `scripts/build-texts.mjs` (wired into `build`/`dev` beside
`build:manifest`) from every saint's own `text.sources` — the one further fact
the manifest deliberately does not carry, since which saints have a source is
almost never asked. **Never `by {name}` — always `on {name}`** (`STRINGS.texts.on`):
a hagiography's byline is its subject, and Athanasius's Life of Antony is *about*
Anthony, not *by* him.

**Names** — `lib/honorific.js` (rank precedence), `lib/saint-name.js` (which
recorded form to print). `office` is a field, drawn on the subtext line.

**Saint data** — `saints/<slug>/saint.json` + `life.md`. Never hand-edit
`data/manifest.json`. Icons: `images/icon.jpg` + `icon.meta.json` + generated
thumb. A wrong crop is a data fix, not a CSS one.

## Tests

- Unit: `tests/*.test.mjs`, `npm test` (~15s, 264).
- Browser: `e2e/`, one file per surface, 724 across two projects —
  `daily`, `index`, `saint`, `chrome`, `map`, `pwa`, `quality-floor`, plus `helpers.js`.
  Every spec repeats the `searchMode` `beforeEach`.
- `npm run test:lighthouse` is the §13 pair Playwright cannot reach —
  accessibility and FCP on throttled 4G. It builds and serves its own preview,
  takes a median of three, and gates CI.

**Full suite at four moments only**: before a commit that will be pushed, after
touching shared chrome or `src/lib`, after a merge, at a milestone. Otherwise
run the surface you touched.

| touched | run |
| --- | --- |
| `views/index/*`, `index.css`, `lib/index-filters.js`, `lib/virtual-grid.js` | `index.spec.js` |
| `views/daily/*`, `calendar.js`, `calendar.css`, `lib/liturgy.js`, `feasts.js`, `computus.js`, `fast-grade.js` | `daily.spec.js` |
| `views/saint.js`, `saint.css`, `lib/detail.js`, `licence.js`, `cross-link.js`, `ui/hymns.js` | `saint.spec.js` |
| `ui/*`, `main.js`, `base.css`, `tokens.css` | `chrome.spec.js` + the surface |
| `views/map.js`, `map.css`, `lib/mercator.js`, `lib/map-view.js`, `lib/map-labels.js`, `lib/map-track.js`, `data/places.js`, `data/periods.js` | `map.spec.js` |
| `ui/strings.js`, `ui/locales/*` | `locale-coverage.mjs`, then the full run |
| `lib/*`, `data/`, `build-manifest.mjs` | `npm test`, then the surface |

~25s of every invocation is fixed cost, so a whole spec beats three single
tests. Iterate at **mobile-360** for layout — that is the width that breaks.
Scoped runs take `playwright test` args after `--`.

### `COLD_FACE=1` — rehearse the runner

The runner draws different text: `font-display: optional` means it never gets
Literata, and `system-ui` is DejaVu Sans. `COLD_FACE=1` refuses the webfont and
forces Verdana + Times, harder than the runner does. Run it on anything that
measures text before pushing.

    COLD_FACE=1 npm run test:e2e:desktop -- e2e/index.spec.js

It prints what it measured every run — a rehearsal that silently failed to apply
would also be green. Two tests opt out and say why in their comments.

**The fixture only decorates the injected `page`.** 42 tests open their own
context; `coldFace(page)` and `COLD` are exported for those, and a test using
one should assert the treatment took.

**One test fails under the rehearsal and only under it** (2026-09-02):
`the two left columns scroll independently of each other and of the page`
(saint.spec.js) leaves the life column's `scrollTop` at 0 with `COLD_FACE=1`,
while claiming a moment earlier that the column has something to scroll. It
does the same on the unmodified tree, and it is green in the ordinary suite in
both projects and on CI. Not diagnosed — recorded so the next run of the
rehearsal on this spec knows it is not theirs.

### Traps

1. **Mounted ≠ corpus, DOM order ≠ screen order.** Assert by geometry.
2. **A width measured in the native face is a fact about one machine.** Assert
   by order, force the face, or force the wrap with the column.
3. **`locator.click()` scrolls its target into view**, so pressing something in
   the sticky bar carries the page to the top. Dispatch the press instead.
4. **Anything depending on today's date** fails on exactly one day a year. Use
   `aDayThatIsNotToday`.
5. **A card read off the opening screenful is one shuffle.** Pin the saint by
   name; assert the pin's premise.
6. **A green build says nothing about a code move.** Cut →
   `node scripts/extraction-check.mjs` → fix → build → suite. `--locals` when
   splitting a function body.
7. **A hidden element reports 0 and ignores writes** — `scrollLeft`,
   `clientWidth`. Read before hiding; guard measurements on `clientWidth > 0`.
8. **`loopScroll` is not measurable until it says so.** Wait for the track to be
   past 0 before writing a position into it.
9. **A custom property does not compute.** `getPropertyValue('--x')` returns the
   literal `clamp(...)`; resolve it with a probe element.
10. **CPU throttling reproduces what parallel load cannot.**
    `Emulation.setCPUThrottlingRate` via `newCDPSession`. Set it **after** the
    `goto` — it does not survive a navigation — and prove it bit with a timed
    loop; the achieved ratio is neither what you asked for nor stable.
11. **A dispatched `PointerEvent` ignores `touch-action`.** It arrives at the
    listener whatever the CSS says, so a swipe test built from `dispatchEvent`
    passes on ground where the browser claims the drag as a scroll and a real
    thumb finds nothing. Two bugs in two days — the saint page's columns and
    the Daily page's date, both signed off by a green probe. Assert the
    *effective* `touch-action` as well: it does not inherit, so reading it off
    the target answers `auto` however the page is written — walk to the
    nearest declared ancestor value, which is the intersection the browser
    performs. Or drive the gesture through CDP `Input.dispatchTouchEvent`,
    which goes through hit-testing and does respect it. **The same gap breaks
    `setPointerCapture`** (2026-09-04, map.spec.js's own drag tests): a
    handler that captures the pointer it just saw go down throws outright for
    a `dispatchEvent`-only one (`No active pointer with the given id is
    found`) — a synthetic event was never registered as an *active* pointer
    in the first place, which real input, or CDP's own emulation of it, is.
    Any gesture whose handler calls `setPointerCapture` needs the CDP route,
    not merely the touch-action one.
12. **A loop of zoom presses without `settledZoom` between them measures the
    machine, not the map.** Presses ease since 7ce2195 and a press mid-flight
    re-targets from wherever the view has reached, so a tight loop travels a
    timing-dependent distance. `map.spec.js`'s zoom-*out* loop was missed when
    that helper was added to the zoom-*in* loop beside it, and sat at 2 failures
    in 5 at mobile-360 — a real flake blamed first on CI load, then on a
    terrain change, before the diff that introduced it was found. Any assertion
    landing near a threshold (`detailAt()`, 5 on mobile since restored — see
    "Where things live") will read as a product bug.
13. **`page.route` does not see a service worker's requests**, and this suite
    runs with the worker registered. A route pattern that matches nothing
    fails *open*: the test passes having intercepted nothing. Count the
    interceptions and assert the count, or stub `window.fetch` in an init
    script instead.
14. **A click aimed at a group can land on one of its own members.** A blob's
    members are real, individually-positioned dots (2026-09-04) — only their
    *names* are withheld while closed — and a press at their averaged centre
    routinely falls inside one member's own 12 px hit-radius, since that is
    where a tightly-packed group is densest. `wirePress`'s `pointerup`
    checked `dotAt` before `blobAt` unconditionally, so a click meant for the
    group instead silently selected whichever anonymous dot the average
    happened to land near — and because that dot had no name on screen to
    have been aimed at, the failure read as "the blob just doesn't open" (a
    5-second `expect.poll` timeout, `data-blob-open` stuck at `""`), not as
    "the wrong thing got clicked." Passed in isolation and failed in a batch
    at first, which was a red herring: `otherId`'s member set is a `Map`
    read straight off that paint's own `data-dots`, so which id is "other"
    can differ run to run without any of it being flaky in the load-sensitive
    sense trap 10 means — chasing worker contention here would have been the
    wrong hunt. The fix is priority, not hit-radius: a dot only wins over its
    own blob when that blob is the one already open (`openBlobId`, mirroring
    `drawnDots`/`drawnBlobs`) — a name on screen is what makes a dot a valid
    target on its own account, and a closed blob's members have none.

**Every fix gets a browser test, backed out and confirmed to fail before being
restored** — against a *rate* where the subject is load-sensitive. That applies
to a tool as much as a fix. **Backing out is not optional and not a formality**:
on 2026-09-04 two successive versions of one terrain test passed with the fix
removed — the first intercepted nothing (trap 13), the second measured a frame
painted before the state under test existed, because the tile error path
records a failure without repainting. Both looked like careful tests.

**When you add an instrument, ask what it would look like if it were doing
nothing.** Four things in one day read as evidence and were not.

## Commands

- `npm run build` — manifest + vite build.
- `npm run preview` — serves `dist/` on :4173. Kill it when done.
- `node scripts/shot.mjs <name> <url> [width] [steps...]` — screenshot into
  `shots/`. Steps: `click:`, `wait:`, `key:`, `scroll:`, `lang:`, `church:`.
- `node scripts/locale-coverage.mjs`, `cross-link-audit.mjs`,
  `extraction-check.mjs`, `sessions-index.mjs`, `python scripts/make_wordmark.py`.
- `node scripts/date-audit.mjs [--list <finding>]` — which saints the corpus
  dates badly, worst first: `open` (an interval null at one end, which reaches
  to infinity and which `lifeBounds` has to paper over), `wide`, `loose-basis`
  (`attested` and a century wide — one of the two is wrong), `undated`,
  `no-death`, `no-birth`. **Reports rather than gates**, on purpose: a missing
  birth year is the ordinary condition of a fourth-century martyr, and a build
  that refused one would push authors into inventing years.
- `node scripts/place-candidates.mjs [--place X] [--limit N]` — unlocated
  saints whose *own life* names a place the repository can already put a
  coordinate on, with the sentence it was found in. **Proposes; never
  writes.** Reading is the work: it offered Edessa in Mesopotamia for a saint
  of Edessa in Macedonia, and Nicomedia for five martyrs the Prologue says
  died on the road out of it.
- `node scripts/make-land.mjs` — regenerates the map's coastline. By hand only;
  the output is committed so the build never needs `world-atlas`.
- `python scripts/make-terrain.py` — regenerates the map's terrain tile grid
  (50m, every cell) and the 10m HR pairs for cells near a located saint
  (`src/data/terrain-tiles/`, `terrain-tiles.js`). No whole-world raster any
  more — removed 2026-09-04, see the Map section below. By hand only, output
  committed; see the script's own header. Needs `data/manifest.json` built
  first (`npm run build:manifest`) for the HR pass. `--skip-hr` to keep the
  50m grid but skip the 10m pass.

## Workflow

- **CI is the source of truth and you have to look.** A local run is evidence
  about this desk. Read the run's `flaky` line as well as its conclusion.
- **Push your own commits** — PAT location in HANDOFF.md.
- Render every visual change and look at it.
- `git status` before anything destructive; never `git add -A`.
- On Windows prefer Write/Edit or short Python over PowerShell heredocs (BOM
  breaks `JSON.parse`); `export MSYS_NO_PATHCONV=1` before any leading-slash
  argument or env var in Git Bash.
