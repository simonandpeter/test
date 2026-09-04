# Cleanup plan — what can be simplified without losing anything

Author, 2026-09-02: "Audit the code and plan if there's anything that can be
cleaned, simplified, reduced without losing functionality or aesthetic, just
cleaning up the code and organising it. See if there's any redundant copies or
things that can be collapsed into one function. Just plan it for now."

**Items 1, 2 and 3 were done on 2026-09-05** (commits `9e8451d`, `a6998ad`);
each says so in its own section below. The same sitting removed 171 lines of
stylesheet the plan had not measured — fourteen class selectors with no
reference anywhere, three of them referenced *only* by e2e assertions that
they render nothing (`99a71ef`). Item 4 followed the same day. Items 5 and 6 remain a plan, and the
numbers in "the shape of the thing today" are the 2026-09-02 ones: `map.js`
was 4,473 lines by 2026-09-05 and `calendar.css` 3,309 before the dead rules
went.

Every item below is a measured finding with the numbers that make it worth
doing, an argument for why it is safe, and — where it matters — the reason it
might not be worth it after all. Nothing here changes what the site looks like
or what it does; anything that would is out of scope by the instruction's own
words.

The order is by *confidence*, not by size: the first three are mechanical and
provable, the last two are judgement calls that want the author's word before
anyone starts.

---

## The shape of the thing today

| | lines |
| --- | --- |
| `src/` total | 34,143 |
| `e2e/` total | 17,030 |
| largest generated file (`src/data/liturgical-days.js`) | 3,458 |
| largest hand-written file (`src/views/map.js`) | 3,386 |
| largest stylesheet (`src/styles/calendar.css`) | 2,935 |
| largest spec (`e2e/daily.spec.js`) | 5,004 |

Two things worth saying before the list, because they bound it:

- **The comments are not the fat.** This codebase argues its decisions in
  place, and that prose is what has repeatedly stopped a fix being made twice
  or a settled reversal being quietly re-reversed. Nothing below proposes
  removing a comment. Where an item moves code, the comment moves with it.
- **The corpus is not code.** `src/data/liturgical-days.js` is the largest
  file in the tree and is generated; it is not a cleanup target.

---

## 1. `reducedMotion` is defined eight times — done 2026-09-05

One definition, `src/lib/motion.js`, with the map's guard folded in; the
other seven import it. `9e8451d`.

**Measured.** Eight files declare their own copy, seven of them character for
character:

```
src/ui/coachmark.js:57      src/ui/roll.js:24
src/ui/fly.js:32            src/ui/shelf.js:180
src/ui/grain.js:39          src/views/daily/motion.js:9   (the one export)
src/ui/loop-scroll.js:53    src/views/map.js:275          (guarded variant)
```

`src/views/daily/motion.js` already **exports** one. The map's differs — it
checks `typeof matchMedia === 'function'` first — and that guard is the only
real variation in the set.

**Do:** keep one, in `src/lib/motion.js` or by re-exporting the existing
`daily/motion.js` one, with the map's guard folded in (it costs one comparison
and makes the helper safe to call from a module that might run without a
window). Delete the other seven; import instead.

**Why it is safe:** the value is read at call time in every copy, so there is
no captured-at-import trap of the kind `statusText` had in saint.js. A single
implementation is also the only way the reduced-motion rule stays one decision
— DESIGN.md §6 says removal, never shortening, and eight copies is eight
chances to get that wrong once.

**Cost:** eight files touched, no behaviour change. The suite already covers
reduced motion on several surfaces, so a mistake here goes red rather than
silent.

---

## 2. The scrollbar-hiding pair is written eight times — done 2026-09-05

One grouped rule in base.css ("scrollers that draw no bar"), no markup or
script touched: the pair costs nothing on an element that is not currently a
scroller, so none of the eight needed its own media query. `a6998ad`.

**Measured.** `scrollbar-width: none` appears in 7 places across the
stylesheets and `::-webkit-scrollbar { display: none }` in 8, always together,
always for the same reason (the author's "remove the scroll bar from the
columns", applied to each new scroller as it arrived): the Daily page's two
columns, the saint page's three, the carousel track, the map's search list,
the full calendar's body.

**Do:** one utility — `.no-scrollbar`, or a `@mixin`-shaped pair of rules in
`base.css` — and have each scroller take it.

**Why it is safe:** it is the same two declarations every time, with no
per-surface variation. The comment that argues it (the scrolling is untouched,
only the rule is gone) moves to the one definition and stops being restated.

**Watch for:** the class has to go on the element that actually scrolls, and
on two of these that element is chosen at runtime (`saint.js`'s `wireColumns`,
the register's cards/list toggle). This is a find-and-replace with three cases
that need reading, not eight.

---

## 3. The "this route does not scroll" block exists three times — done 2026-09-05

`html[data-fills-window]` in base.css, set by index.html before first paint
and by main.js on navigation; calendar.css and saint.css keep only their own
inner boxes. **The map keeps its block on purpose** — every width, and sized
from `--chrome-h-reserve` so it is right before JavaScript runs — which is
the one variation the plan's "identical declarations" had missed: by
2026-09-05 the three had diverged in viewport unit as well (`svh` against
`dvh`). The CLS gate stayed at its floor. `a6998ad`.

**Measured.** `calendar.css`, `saint.css` and `map.css` each carry a near
identical block: root and body to `height: 100%; overflow: hidden`, `main` to
`calc(100dvh - var(--chrome-h))`, then the view and the page's own box to
`height: 100%; min-height: 0`. The saint page's copy is a day old and was
written *from* the Daily page's, which is exactly how a third copy happens.

**Do:** one block in `base.css`, keyed off an attribute rather than a route
name — `html[data-fills-window]` — set by the same line in `main.js` that
already writes `data-route` and `data-view`. Each route opts in by name in one
place instead of by twenty lines in its own stylesheet.

**Why it is safe:** the three copies are already the same declarations; what
differs is only the selector. Doing it this way also removes the trap the
saint page hit — `data-route` could not name that page, because the Index
shares its `nav`, which is why `data-view` had to be added at all.

**Watch for:** `index.html` sets `data-route` before first paint precisely to
avoid a 0.21 CLS jump. Whatever attribute this uses has to be set in the same
place and at the same moment, or this "cleanup" reintroduces a layout shift
the §13 gate was built to catch. **This is the item most likely to cause a
regression, and the CLS assertion in `quality-floor.spec.js` is the thing that
would catch it.**

---

## 4. The two chooser controls are one control written twice — done 2026-09-05

`src/ui/panel-control.js` (`mountPanelControl(button, panel, { render, wire })`);
the two controls keep their button's words and their panel's contents. 420
lines became 387 — smaller than the 90–110 estimated, because the comments
that argued the flight and the outside press were counted twice in the
estimate and move once. `extraction-check.mjs` clean on both moves; chrome
spec green on both projects.

**Measured.** `src/ui/church-chooser.js` (216 lines) and
`src/ui/language-chooser.js` (148). Diffing `mountChurchControl` against
`mountLanguageControl` line by line: the open/close state, the flight
bookkeeping (`landFlight`, the `flight += 1` generation counter), the
`flyInto` call with `{ collapse: panel }`, the outside-press close, the
`aria-expanded` handling and the guarded hide-and-empty are **the same code**.
What genuinely differs is three things: which glyph and text the button
paints, what the panel is filled with, and what a press inside it does.

The language chooser's own comments say so out loud — "The same flight home
the calendar control makes, for the same reason" — and one of them carries a
bug report ("a test that changed calendar twice inside 160 ms hit a panel that
was open, empty and nought pixels tall") that applies to both and was fixed in
one.

**Do:** extract `mountPanelControl(button, panel, { paintButton, fill, onOpen })`
into `src/ui/panel-control.js`; leave both modules owning their own content and
strings. Expected reduction is roughly 90–110 lines with no change to either
control's behaviour.

**Why it is worth more than its size:** the two are already drifting. A fix
made to one is a fix the other silently does not have, and the panel-empty bug
above is proof that this class of bug is real here rather than hypothetical.

**Watch for:** `chrome.spec.js` covers both controls fairly thoroughly (the
panel's contents, `aria-expanded`, the flight, the outside press). Extract
first, run that spec, and only then delete the second copy.

---

## 5. `map.js` is 3,386 lines with three section headers

**Measured.** Every other surface on this site is a folder — `views/daily/` is
seven modules, `views/index/` is nine — and the map is one file with 41
top-level functions and three `/* ---- */` dividers in it. It is the largest
hand-written file in the tree by 2,200 lines.

The seams are already visible in the file and are named by its own comments:

| candidate module | what it holds |
| --- | --- |
| `map/paint.js` | `paintCanvas` and everything it calls — the tracing, the culling, the halo layer, the dot pass, the label pass |
| `map/timeline.js` | `wireTimeline`, the year buttons, the presets, the watched-year triangle |
| `map/motion.js` | `wireMotion`, playback, the speed selector, the glide/rail easing |
| `map/search.js` | `searchMatches`, `wireSearch` — already has its own header and is nearly free-standing |
| `map/chrome.js` | `wireZoom`, `wireFilters`, the corner controls |

**Do:** cut along those lines, in that order of confidence (search first, it is
the most self-contained; paint last, it is the one everything reads).

**Why it is only fourth in confidence:** the pure arithmetic is *already* out
(`lib/map-view.js`, `lib/map-labels.js`, `lib/map-track.js`, `lib/mercator.js`)
and unit-tested, which is where most of the value of splitting normally lies.
What is left is genuinely one canvas and the state it draws from — module
scope shared by the draw pass and every wiring function (`view`, `selected`,
`movement`, `dateFrom`/`dateTo`, `railAt`, `speed`). Splitting it means either
threading that state through explicitly or giving it a home of its own, and
**a half-done version of this is worse than not starting**: a `state.js` that
some modules read and others shadow is the bug the Index's own `place.js`
comment warns about.

**Precondition:** `node scripts/extraction-check.mjs` exists for exactly this
job (CLAUDE.md trap 6: "a green build says nothing about a code move"). Any
cut here runs it, with `--locals` when a function body is split.

---

## 6. The two largest specs could follow the rule the suite already has

**Measured.** `daily.spec.js` is 5,004 lines and `index.spec.js` 4,710 — 57%
of the browser suite between them. The suite was already split once, from one
9,308-line file into one file per surface (the note at the top of
`saint.spec.js` records it), and these two have since grown past what that
split was meant to fix.

**Do:** split by *surface within the page*, not by date — `daily.spec.js` into
the day panel, the picker (rail and month), and the register; `index.spec.js`
into the carousel, the search grid, and the controls.

**Why it is last:** it buys readability and nothing else. It does not make the
suite faster, and it touches the files where the provenance of every test lives
— each test carries the instruction that caused it, and a careless move loses
which round a test belongs to. The header note in `saint.spec.js` is the
template for doing it honestly ("the tests themselves are unchanged... what
moved is only which file it sits in").

---

## Considered and rejected

- **The 19 `escapeHtml as esc` imports.** That is the idiom, not duplication:
  one implementation, imported where needed. Nothing to collapse.
- **The four locale packs (2,534 lines together).** They are data, they are
  gated by `scripts/locale-coverage.mjs` at 0 fallbacks, and any "collapsing"
  of them is a translation decision rather than a code one.
- **The per-file `const BASE = import.meta.env.BASE_URL`.** Declared per file
  on purpose — the files say so — because it is a build-time constant rather
  than shared state.
- **Merging the three map `lib/` modules.** They are pure, separately
  unit-tested, and small. The split is what makes them testable without a
  browser; merging would trade that for one fewer file.

---

## If only one thing is done

**Items 1, 2 and 3, in one sitting.** They are mechanical, they touch no
behaviour, they remove three separate classes of "the next person copies the
block again", and between them they are perhaps 150 lines. Item 3 is the one
that needs the CLS assertion watched.

Items 4 and 5 are real but want a session of their own, and item 5 wants the
author's word first: it is the largest structural change proposed here, and
the file it touches is the one that has been under active instruction every
day for the last week.
