# Daily page rebuild — implementation plan

> Written 2026-09-12 by a planning agent, against `carousel-mockup-c/index.html`.
> Reviewed below in **§11**; where §11 and §0–§10 disagree, **§11 wins**.

## 0. Scope, and what is explicitly not touched

**All Saints is not edited, at all.** No change to any of:
`src/views/saints.js`, `src/views/index/{state,modes,grid,controls,search,filter,count,sticky,place}.js`, `src/styles/index.css`, `src/ui/loop-scroll.js`, `src/lib/{index-filters,virtual-grid}.js`. Its render path, its `remembered` snapshot, its `sessionMode`, its `reflectSeed`, its `window`-scroll virtualiser and its `loopScroll` drift are all left exactly as they are. Everything the transition needs is done in the shell (`src/main.js` + `src/styles/base.css`) by *not calling* `saints.render()`/`saints.destroy()` a second time and by moving the element the shell already owns.

Also untouched: `src/views/saint.js`, `src/views/map*`, `src/views/texts.js`, `src/views/about.js`, `src/lib/saint-types.js` (see §4 on the fallback glyph), `src/ui/hymns.js` (`mergeForReading`/`hymnMarkup` are consumed as-is).

---

## 1. File-by-file change list

### New

| File | What |
| --- | --- |
| `src/views/daily/sidebar.js` | The standing sidebar: markup + a `paintSidebar(root, iso)` that computes every fact from `src/lib/*` (§2). Owns the month grid, the day label with `‹ ›`, the tags, the name-days block. |
| `src/views/daily/tiles.js` | `tileHTML(entry, data)`, `cardHTML(...)` — one `<article class="day-tile">` per saint of the day, the same element folded and open (§3). Holds the glyph table's *fallback* only; the five real marks come from `panel.js`'s `GLYPH_PATHS`, which moves here. |
| `src/views/daily/open.js` | The open-card state model: `rows`, `openIdx`, `openRow(i, {bring})`, the delegated click handler, and the DocumentFragment reorder. |
| `src/views/daily/lives.js` | Per-saint `loadDetail()` fan-out that fills the two-line preview, the "From the life" column and the two hymn columns after paint. Lifted from `panel.js`'s `fillRegisterLives` + `record.js`'s `fillSaintHymns`, merged. |
| `src/ui/face-stage.js` | The two-layer clipped stage and the 620 ms swap (§5). Pure shell; imports nothing from either view. |
| `src/styles/daily.css` | The rebuilt Daily page's whole stylesheet, ported from the mockup's `.today / .day-side / .td-scroll / .cal / .day-grid / .day-tile / .row-* / .tag / .names` block. |

### Edited

| File | What |
| --- | --- |
| `src/views/calendar.js` | Gutted from 1387 lines to ~180. Keeps: `title`, `destroy`, `render`, `select(iso)`, the `subscribeChurch` cleanup, `observePrefetch`. Emits the mockup's `.today > .day-side + .td-scroll > .day-grid` markup. Deletes `wireReckoning`, `wireGrainForWidth`, `wireChromeInHead`, `slotSwap`, `paintChrome`, `paintLiturgy`, `wireFastBubble`/`openFastBubble`/`place`/`closeFastBubble`, `paintRegisterView`, `paintGate`, the `makeGrain` month wiring, the `cal-bubble` markup and the four notches. |
| `src/views/daily/state.js` | Add `openIdx`, `rows`, drop `monthCursor`/`monthOpen`/`monthGrain`/`railAnchor`/`registerView`/`sizeTimer`. The singleton contract and the `open`/`close` writers stay. |
| `src/views/daily/format.js` | Unchanged code; gains one helper `relativeDayWord(iso)` → Today / Yesterday / Tomorrow / weekday name. |
| `src/views/daily/entries.js` | Unchanged. `allEntriesFor` / `entriesFor` / `dayRecordFor` / `reachInWords` are all still the right calls. |
| `src/main.js` | Routes unchanged. `show()` gains the pair-aware branch: when `route.nav` is `calendar` or `saints` **and** the previous nav was the other one **and** the viewport is ≥1024 px and motion is not reduced, run the stage swap instead of `startViewTransition`, and skip `saints.render()`/`saints.destroy()` when the saints layer is already mounted. |
| `src/styles/base.css` | Add the `.face-stage` / `.face-layer` block (§5). `data-fills-window` block is reused unchanged as the stage's height source. |
| `src/styles/tokens.css` | One new token: `--dur-swap: 620ms`. |
| `src/lib/motion.js` | `DUR.swap = 620` (required by `tests/design-tokens.test.mjs` and `tests/plan.test.mjs`). |
| `PLAN.md` | One row in the duration table for `--dur-swap`, plus the Daily page's description rewritten. `tests/plan.test.mjs` fails without the row. |
| `src/ui/strings.js` + `src/ui/locales/{ru,ro,el,sr}.js` | New keys: `calendar.yesterday`, `calendar.tomorrow`, `calendar.noGreatFeast`, `calendar.byJulian`, `calendar.fromTheLife`, `calendar.hymns.noEnglish`. Then `node scripts/locale-coverage.mjs` to 0. |

### Deleted

| File | Why |
| --- | --- |
| `src/views/daily/picker.js` (1060 ln) | Week rail and month picker. The mockup's sidebar month grid is a static painted grid with no drag, no swipe, no grain, no travel — it replaces both. |
| `src/views/daily/fullcal.js` (432 ln) | Full-screen calendar dialog; no place in the mockup. **See §11.4 — this deletion is refused.** |
| `src/views/daily/panel.js` (793 ln) | Hero + register. Replaced by `tiles.js`. `GLYPH_PATHS`/`glyphMarkup`, `registerOrder` and `fillRegisterLives` are salvaged into `tiles.js`/`lives.js` before deletion. |
| `src/views/daily/record.js` (113 ln) | **Conditional on the open question in §10.1.** Readings and feast hymns have no home in the mockup. If readings are dropped, this file goes; if kept, only `hymnsMarkup` goes and `readingsMarkup` moves into the sidebar's foot. |
| `src/styles/calendar.css` (4679 ln) | Replaced wholesale by `daily.css`. Do not edit in place — the file is 4.7 k lines of rules for boxes that will not exist. |

Retained-but-unused-by-Daily (do not delete; other pages use them): `src/ui/shelf.js`, `src/ui/swap.js`, `src/ui/grain.js`, `src/ui/grain-drag.js`, `src/lib/fast-grade.js` (still used by the sidebar's month grid — see §2).

---

## 2. How the sidebar's facts are computed

Every one is a call, verified present with its signature. `churchId = currentChurch()` from `src/lib/church.js:78`; `iso` is `state.selected`.

| Fact | Call |
| --- | --- |
| the day, stepped | `addDaysIso(iso, ±1)` — `src/lib/calendar-page.js:23`; `todayIso()` — `:20`; `parseIso(s)` — `:13` |
| day label word | new `relativeDayWord(iso)` comparing against `todayIso()`, falling back to `weekdayFmt(utc(iso))` — `src/views/daily/format.js:40,122` |
| date in print | `reckonedPlain(iso, reckoningInForce())` — `format.js:78`, i.e. `dayInWords(iso)` — `format.js:104` |
| the same day, Julian | `dateIn('julian', iso)` — `calendar-page.js:37` (which is `fromJdn('julian', toJdn(...))` under the hood, `src/lib/jdn.js:89,95`), rendered with `formatDate({day:'numeric',month:'long'})` from `src/lib/i18n.js`. **Not** `gregorianToJdn` by hand — `dateIn` is the site's own pivot and is unit-tested. |
| week after Pentecost | `liturgicalDay(iso, churchId).cycle` — `src/lib/liturgy.js:309` → `{key:'weekAfterPentecost', n}`; the words come from `cycleName(cycle, iso)` — `src/ui/cycle-name.js:57`. **Not** the mockup's own `CYCLE` table, which is a hard-coded English copy. |
| tone | `liturgicalDay(...).tone` (1–8 or null) — `liturgy.js:129` — with `fill(STRINGS.calendar.liturgy.tone, { tone })` |
| fast tag + colour | `liturgicalDay(...).fasting` → `{ kind: 'fast' \| 'fish' \| 'fast-free', reason, reasonKind? }` — `liturgy.js:156`. Class map `fast→.is-fast (--fast-strict)`, `fish→.is-fish (--fast-fish)`, `fast-free→.is-free (--fast-free)`. The reason is appended via `translateReason` (`src/lib/i18n.js`) and **suppressed when `reasonKind === 'greatFeast'` and `greatFeast()` answered** — that suppression rule already exists in `calendar.js`'s `paintLiturgy` and must be carried over, or the feast is named twice. |
| Great Feast tag | `greatFeast(iso, churchId)` — `liturgy.js:301`, returns a `STRINGS.calendar.feasts` key or `null`. `null` → `<span class="tag is-none">` with `STRINGS.calendar.noGreatFeast` and `border-style: dashed`. |
| month grid, per-day colour | for each `iso` in the month: `liturgicalDay(iso, churchId).fasting`, then `gradeForDay(fasting, dayRecordFor(iso, churchId)?.fastingNote)` — `src/lib/fast-grade.js:171`. This is the exact two-step `picker.js:162`'s `fastTone` does, and it is why the grid says *fish* where the calendar printed an allowance. The mockup's `LIT.fasting()`-only version is coarser. |
| month grid, cell dates | `daysInMonthOf(reckoningInForce(), {year, month})` — `calendar-page.js:83`; `isoOfDate(cal, {...})` — `:43`; numeral from `dateIn(cal, iso).day`. Monday-first lead from `weekOf(iso)` / the JDN weekday. |
| today's mark | `iso === todayIso()` → `.is-now`; `iso === state.selected` → `.is-today`. Two marks, as the mockup has them. |
| feast underline in the grid | `greatFeast(iso, churchId)` → `.is-feast` |
| name days | `nameDays(allEntriesFor(iso, data), { lang: currentLanguage(), locale: languageTag() })` — `src/lib/name-days.js:64`, returning `[{name, slug}]`; `slug` non-null links, null does not. `allEntriesFor` is `src/views/daily/entries.js:39`. Reuse `panel.js:768`'s `nameDaysMarkup` body verbatim — it already handles the link rule and the `headingToday` variant. |
| reckoning caption | `reckoningInForce()` — `src/lib/church.js:179`; `churchName(churchId)` — `:229` |

The mockup's bundled `liturgy.js` is a build artefact of exactly these modules and **is not copied**. The one thing worth lifting from it is the `@property --cx-cap-a` mask idea, which is CSS, not logic.

---

## 3. The tile → open-card state model

**Where it lives:** `src/views/daily/state.js`, on the same singleton every Daily module already imports. Two fields:

- `state.rows` — the live `HTMLElement[]` in the day's own calendar order, captured once per day paint.
- `state.openIdx` — index into `state.rows`, `-1` before the first paint.

**The element never changes shape by rebuild.** A saint is one `<article class="day-tile">` carrying *all* its parts from the first paint: `.row-media`, `.row-head` (name + sub), `.row-line` (two-line clamp), `.row-life`, `.row-trop`, `.row-kont`. Folded, CSS hides the last three (`display:none`) and shows `.row-line`. Open, `.is-open` flips it and `grid-column: 1 / -1` makes the article span the grid. Nothing is added, removed or re-fetched when a tile opens, so no picture reloads and no fade replays.

**Opening (in `open.js`):**

1. Click only. One delegated listener on `.td-scroll`; `e.target.closest('.day-tile')`; return early if it already has `.is-open`. **No scroll listener, no IntersectionObserver, no `scroll-snap` on the grid.** That is the author's explicit instruction and it is what makes the height stable under a reader.
2. Remove `.is-open` from `rows[openIdx]`, set `openIdx = i`, add `.is-open`.
3. Rewrite the order: build a `DocumentFragment`, append `rows[openIdx]` first, then every other row in the day's own order, then `tdStrip.appendChild(frag)`. Appending an already-parented node moves it; the nodes are never recreated.
4. `scroller.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' })`.

**On a day change** (`select(iso)`): repaint the grid, `rows = [...tdStrip.children]`, `openIdx = -1`, `scrollTop = 0`, then `openRow(0, false)` — the day always opens with its first saint open, and the first saint is chosen by the existing `pickHero(iso, entries, bySlug, churchId)` (`src/lib/calendar-page.js:100`) so the day still leads with a sung saint who has an icon.

**Which saint's parts arrive late:** the life preview and the hymns are not in the manifest. `lives.js` fires `loadDetail(slug)` (`src/lib/detail.js:90`) for every saint of the day on paint, and each resolution writes into its own tile's `[data-life]` and `[data-trop]`/`[data-kont]` boxes, guarded by `state.selected === iso` exactly as `record.js:101` guards today. The columns are drawn *before* the fetch with the "No English rendering recorded" line already in them, so the four columns never shift width as payloads land.

---

## 4. Tiles, cards and glyphs

**Tile** (`grid-template-areas: 'media head' / 'media line'`, `--tile-pic: 120px`): icon 120 px left; `saintName(card)` (`src/lib/honorific.js:227`) + `formatSubtext(card)` (`calendar-page.js:268`) right; then `firstParagraphText(life)` (`src/lib/markdown.js:153`) clamped to two lines. Grid is `repeat(auto-fill, minmax(300px, 1fr))` — roughly three across in the width the sidebar leaves.

**Crop:** `cardCrop(image)` (`src/lib/hero-crop.js:81`) → `{aspect, focus}`, written as `--ar` and `object-position`. Do not port the mockup's inline `cropOf()`; it is a hand copy of this function and rounds differently, which is the bug `hero-crop.js:81`'s own comment warns about.

**No icon → the glyph on a `--field` mat.** `typeGlyph(saint.types)` (`src/lib/saint-types.js:107`) returns one of `martyr | hieromartyr | venerable | hierarch | presbyter | prince`, or `null`. The paths are `panel.js:274`'s `GLYPH_PATHS`, which already match the `saints-sidebar.html` sheet line for line. **`typeGlyph` is not changed** — `tests/type-glyph.test.mjs:56` pins that an unmatched type returns no mark. The eight-pointed fallback is added in the *view*: `GLYPH_PATHS[typeGlyph(types) ?? 'saint']`, with a new `saint:` entry for the eight-pointed cross. The mat keeps `aria-hidden` and the row keeps `panel.js:319`'s `sr-only` type words, which is what makes the 1.41:1 contrast on `--rule` acceptable.

**Open card**, four columns `--row-pic-w | 1fr | 1fr | 1fr`, areas `'media life trop kont' / 'head life trop kont'`.
**No icon** → `.no-pic`: drop `.row-media` and `.row-head`, areas become `'life life trop kont'`, and `.row-life .td-flow { columns: 2 }` with `.row-name-in`/`.row-sub-in` revealed at the head of the first column.

**Hymns** (requirement 6): take `payload.saint.hymns`, filter to `h.church === state.calendar`, run `mergeForReading(hymns)` (`src/ui/hymns.js:146`), split by `h.kind` into `troparion` and `kontakion`. For each of the two columns: if a hymn exists **with an `english` block**, render it with `hymnMarkup(h)` — which already prints the English, the tone in the reader's words, and either `Text from {source}` or `Rendered for this site` (`hymns.js:113`), i.e. the translator credit comes free. If there is none, print `<p class="row-none">` with the new `STRINGS.calendar.hymns.noEnglish`. Life and hymn text both at `--text-base`; this is a change from the shipped `hymn-text` size and must be written into `daily.css`, not into `hymns.js`, so the saint page keeps its own scale.

**No search bar on Daily** (requirement 7): nothing to remove — Daily has never had one. The mockup's `body.today-on .search { max-height: 0 }` collapse is a mockup-only artefact of its single-page shell and is **not** ported.

---

## 5. The clipped two-layer stage, and how All Saints survives it

### DOM

Inside the existing `<main class="chrome"><div id="view">`, the shell mounts once, on the first navigation into either of the pair:

```
#view > .face-stage[data-face="saints|calendar"]
          .face-layer[data-layer="saints"]    <- views/saints.js renders here, once
          .face-layer[data-layer="calendar"]  <- views/calendar.js renders here, per day
```

Neither view knows it is in a layer: `show()` passes the layer element as the `el` argument it already passes today. The stage is torn down (and both layers with it) only when the reader leaves to a third route — Map, Texts, About, a saint — at which point the current behaviour returns unchanged and All Saints rebuilds from its own `remembered` snapshot exactly as it does now.

### CSS (`base.css`)

```
.face-stage { position: relative; }
.face-layer { transition: transform var(--dur-swap) var(--ease-soft); will-change: transform; }
.face-stage[data-face='saints']   .face-layer[data-layer='calendar'] { position:absolute; inset:0; transform: translateY(calc(-100% - 32px)); visibility: hidden; }
.face-stage[data-face='calendar'] { overflow: clip; height: 100%; }
.face-stage[data-face='calendar'] .face-layer[data-layer='calendar'] { position:absolute; inset:0; transform:none; }
.face-stage[data-face='calendar'] .face-layer[data-layer='saints']   { position:absolute; inset:0; transform: translateY(calc(100% + 32px)); }
.face-stage[data-swapping] { overflow: clip; height: 100%; }
.face-stage[data-swapping] .face-layer { position:absolute; inset:0; visibility: visible; }
```

Resting on All Saints the saints layer is `position: static` — in flow, driving document height, scrolled by the window, indistinguishable from today. The 32 px is the mockup's own gap so the two faces never touch mid-flight. `height: 100%` resolves against `#view`, which `base.css:1506`'s `data-fills-window` block already sizes to `calc(100dvh - var(--chrome-h))`.

### Why the carousel keeps its scroll position and its drift

1. **The saints layer is never removed from the document and never `display: none`.** `loopScroll`'s `ResizeObserver` (`src/ui/loop-scroll.js:772`) keeps reporting a non-zero `boxWidth`, its `requestAnimationFrame` loop keeps running, and `track.scrollLeft` is never reset. It keeps drifting while parked below.
2. **`saints.render()` is not called on the way back**, so `saints.destroy()` is not called either: no snapshot, no `closeState()`, no teardown of its `subscribeChurch` cleanup.
3. **The vertical page scroll** is the shell's existing `sectionScroll` map: `main.js:499` records `window.scrollY` under the *leaving* nav key before anything moves, and `main.js:605`'s `await restoreSection(returning)` puts it back on the way in.

### The swap sequence (in `src/ui/face-stage.js`)

**All Saints → Daily:**
1. `sectionScroll.set('saints', window.scrollY)` (already happens at `main.js:499`).
2. `pin = Math.max(0, window.scrollY - stage.offsetTop)`; set `saintsLayer.style.top = -pin + 'px'`.
3. `stage.dataset.swapping = ''` — both layers go absolute; the pinned `top` keeps the visible pixels identical, so nothing jumps.
4. `window.scrollTo(0, 0)`; `documentElement.dataset.fillsWindow = ''`.
5. `calendar.render(calendarLayer, …)` — Daily is always rendered fresh, because the date is a route param.
6. Next `requestAnimationFrame`: `stage.dataset.face = 'calendar'` → both transforms animate over `--dur-swap` on `--ease-soft`.
7. `transitionend` on the calendar layer: `delete stage.dataset.swapping`, `saintsLayer.style.top = ''`.

**Daily → All Saints:** the mirror, with two additions on landing —
7a. put the saints layer back in flow, `delete documentElement.dataset.fillsWindow`, and **in the same frame** `window.scrollTo(0, sectionScroll.get('saints'))`.
7b. `window.dispatchEvent(new Event('scroll'))` — `views/index/grid.js:338` listens on `window` and repaints its virtualised window from it.

`skipFade = true` is set for these navigations so `main.js:636`'s `startViewTransition` does not fire a cross-fade over the top of the slide. `main.js`'s `show()` also skips its own `window.scrollTo(0,0)` (line 581) when the stage is driving.

---

## 6. What is reused and what is replaced

**Reused unchanged:** `src/views/daily/entries.js`, `src/views/daily/format.js`, `src/views/daily/state.js`'s open/close contract, `src/ui/hymns.js`, `src/ui/cycle-name.js`, `src/lib/{liturgy,computus,jdn,name-days,calendar-page,fast-grade,hero-crop,honorific,saint-types,detail,markdown,church,i18n,motion}.js`, `main.js`'s `sectionScroll` and `--chrome-h`.

**Salvaged into new files, then their originals deleted:** `panel.js`'s `GLYPH_PATHS`/`glyphMarkup` → `tiles.js`; `panel.js`'s `nameDaysMarkup` → `sidebar.js`; `panel.js`'s `fillRegisterLives` and `record.js`'s `fillSaintHymns` → `lives.js`; `picker.js`'s `fastTone` two-step → `sidebar.js`'s month grid.

**Replaced outright:** the hero card, the register, the week rail, the month grain picker, the fast bubble, the reckoning dropdown, the `cal-bubble` with its four notches, `slotSwap`'s two-panel roll, the day-swipe, the Continue-reading shelves on Daily, and all 4679 lines of `calendar.css`.

---

## 7. Reduced motion, and narrow widths

**Reduced motion** (`reducedMotion()`, `src/lib/motion.js:18` — removed, not shortened, per PLAN):
- No stage slide. `show()` sets `stage.dataset.face` directly with the transition suppressed.
- `openRow`'s `scrollTo` uses `behavior: 'auto'`.
- The `--cx-cap-a` caption mask is disabled and pictures are `opacity: 1` from the start.
- The staggered image reveal queue is bypassed: every `img` gets `.is-loaded` on load.

**Below 1024 px:**
- **No stage.** The pair navigates by the shell's existing cross-fade.
- **The sidebar stops standing.** `.day-side` loses `position: absolute` and becomes the first block in the flow, full width; `.td-scroll` loses its left padding and scrolls the page rather than itself. Order is sidebar → tiles, which is also the reading order for assistive technology.
- `.day-grid` falls to one column; the open card's four columns collapse to one stacked run — icon, name, life, troparion, kontakion — and `.no-pic`'s two-column life goes to one.
- The name-days bottom mask is dropped: there is no "remaining height" to take when the sidebar is in flow, and a mask over a block that ends naturally reads as a rendering fault.

---

## 8. Tests that will break

### Unit (`npm test`)

| file:line | asserts now | why it breaks |
| --- | --- | --- |
| `tests/plan.test.mjs:103` | the duration table is `DUR` and `tokens.css` together | `--dur-swap: 620ms` must be added to the PLAN.md table **and** to `DUR` in `src/lib/motion.js` in the same commit |
| `tests/design-tokens.test.mjs:26` | no raw easing and no sub-second duration in any component stylesheet | a literal `620ms` or `cubic-bezier(...)` in `daily.css`/`base.css` fails; both must go through tokens |
| `tests/citations.test.mjs` | every `*.md` named in the source exists; a deleted document may only be mentioned in the past tense | `panel.js`/`picker.js` cite `docs/daily-desktop-visuals.md` throughout; surviving comments citing a section describing a box that no longer exists need rewording |
| `tests/type-glyph.test.mjs:22,56` | six marks answer to their names; anything else returns no mark | **passes only if `saint-types.js` is left alone** |
| `tests/hymn-merge.test.mjs` | `mergeForReading` collapses identical English | passes — `ui/hymns.js` is not edited |

### Browser (`npm run test:e2e`)

`e2e/daily-panel.spec.js` (4550 ln, ~90 tests) — **essentially the whole file.** 56 references to `.cal-date` / `.cal-liturgy` / `.day-panel` / `.cal-bubble` / `slot-viewport`. Named:

- `:51` hero + each tradition in its own reckoning — the hero is gone.
- `:97`, `:3866` hero geometry — no hero.
- `:290`, `:658` the `slotSwap` roll — deleted.
- `:320`, `:345`, `:370`, `:4095` the day-panel swipe — deleted.
- `:707` civil date, paschal cycle, tone, fast in its colour — **rewrite, do not delete.** Every fact survives; selectors move to `.day-date`/`.day-cycle`/`.tag`.
- `:810` readings link to Bible Gateway — depends on §10.1 / §11.2.
- `:834`, `:1701`, `:1736`, `:1759` hymn-language — `:1759` ("a Greek reader keeps the Greek") states the *opposite* of requirement 6; see §11.1.
- `:1154`–`:1351` the fast bubble, five tests — deleted control.
- `:2776`, `:2916`, `:3027`, `:3135`, `:3193`, `:3339`, `:3578`, `:3719`, `:4478` — every one measures the `cal-bubble` layout.
- `:2577` a returning Daily page lands where it was left — rewrite against `.td-scroll`.
- `:2486`, `:2538` chunk-splitting and boot-fetch — **keep, and re-verify**: deleting `picker.js` changes the entry bundle.

`e2e/daily-picker.spec.js` (2579 ln, ~48 tests) — **delete the file**, except `:1319` (no date carries a density dot; a fast or a feast carries its own) and `:1575` (the month's numerals wear the same colour as the rail's dots), which carry into a new `daily-sidebar.spec.js`.

`e2e/daily-register.spec.js` (868 ln, 13 tests) — **mostly delete.** Carry into a new `daily-tiles.spec.js`: `:83` name days link only the names one saint bears, `:130` name days in two columns, `:228` name days say *today* only on the day that is today, `:592` a row with no icon shows its type as a mark and says it in words.

Cross-spec collateral:
- `e2e/index-grid.spec.js:1040,1045` — `.day-panel .register .reg-name`.
- `e2e/saint.spec.js:1530,1543,1555` — `[data-shelves]`.
- `e2e/quality-floor.spec.js:192` — `.week-strip .day-marks`, "told apart by shape, not only by hue". **Must be rewritten, never dropped**: it is an accessibility floor and the month grid inherits the obligation.
- `e2e/chrome.spec.js:558,696,714,1657,2871,3083–3086`.

`npm run test:lighthouse` gates CI on accessibility and FCP — the day now fetches N per-saint payloads on paint instead of one hero's.

---

## 9. Ordered implementation steps

**Step 1 — tokens and strings.** `tokens.css` gains `--dur-swap: 620ms`; `lib/motion.js` gains `DUR.swap = 620`; `PLAN.md`'s duration table gains the row; the new keys go into `ui/strings.js` and the four packs; `npm test` and `node scripts/locale-coverage.mjs` to 0.
*Seam: touches only tokens/motion/PLAN/strings.*

**Step 2 — the stage, with Daily untouched.** Write `src/ui/face-stage.js` and the `.face-stage`/`.face-layer` block in `base.css`; wire the pair-aware branch in `main.js`. The *current* Daily page renders into the calendar layer unchanged — verifiable on its own.
*Seam: `main.js`, `base.css`, one new file. Does not open `views/calendar.js` or anything in `views/daily/`.*

**Step 3 — the sidebar.** `src/views/daily/sidebar.js` plus the `.day-side` / `.cal` / `.tag` / `.day-names` half of `daily.css`, behind a temporary flag.
*Seam: one new JS file, first half of one new CSS file. Deletes nothing.*

**Step 4 — tiles and the open card.** `tiles.js`, `open.js`, `lives.js`, and the `.day-grid` / `.day-tile` / `.row-*` half of `daily.css`.
*Seam: three new JS files, second half of `daily.css`. Must not touch `sidebar.js`.*

**Step 5 — rewire `views/calendar.js`, and delete.** Gut `render`, mount sidebar + grid, keep `select`/`destroy`/`subscribeChurch`, delete the dead files and the `calendar.css` import. Run `node scripts/extraction-check.mjs` (CLAUDE.md trap 6).
*Seam: the only step that deletes. Runs after 3 and 4 are both in.*

**Step 6 — the e2e suite.** See §11.7 — split into three.

**Step 7 — measure.** `node scripts/contact-sheet.mjs` across both widths, themes and languages; `tile-diff.mjs` against a kept baseline for All Saints specifically, to prove requirement 1 held; `npm run test:lighthouse`; then push.

---

## 10. Open questions — as the planning agent left them

1. The readings have nowhere to go. → **settled in §11.2.**
2. Hymns in a language that is not English. → **settled in §11.1.**
3. The reckoning control and the full-screen calendar. → **settled in §11.4.**
4. Continue-reading shelves. → **settled in §11.5.**
5. The parked carousel's cost. → **settled in §11.6.**
6. Days past the corpus's reach. → **settled in §11.3.**
7. The three faces. → **settled in §11.8.**

---

## 11. Review, 2026-09-12

Decided without the author, who is asleep; every one is reversible and every one is
listed in the morning report. Where this section and §0–§10 disagree, this section wins.

### 11.1 Hymns: the reader's language, and English alone when that language is English

Open question 2 is already answered by the author, in their own words on 2026-09-12:
**"When English is the language, I only want English hymns showing."** That is a
conditional, not a blanket. So:

- Reading English → English renderings only, translator credited, and where a hymn
  has none the column stays with the "No English rendering recorded" line.
- Reading Greek, Russian, Romanian, Serbian → that tradition's own text, exactly as
  `hymnMarkup` prints it today.

This keeps `e2e/daily-panel.spec.js:1759` **alive and passing** rather than deleted —
it is a recorded author decision from 2026-08-26 and nothing has overridden it. The
planning agent's proposed default was right; it just did not know the sentence existed.

The "no rendering" line therefore needs two forms, not one: `calendar.hymns.noEnglish`
and `calendar.hymns.noneInYourLanguage`.

### 11.2 The readings stay

Do not delete `record.js`. The readings and the day's feast hymns are hand-sourced
into `data/liturgical-days.js` — work that cannot be regenerated — and the mockup's
silence about them is an absence of design, not a decision to drop them. Take the
planning agent's own default: keep them at the foot of `.td-scroll`, below the last
tile, in the foot padding that is otherwise empty. `e2e/daily-panel.spec.js:810`
stays alive.

### 11.3 "Nothing recorded for this day" goes in the grid

Where the tiles would be, not in the sidebar. The sidebar always has something to
print because it computes; the grid is the thing that is empty, and the reader is
looking at the empty thing. Keep `reachInWords` (`entries.js:93`) and the existing
"beyond records" wording.

### 11.4 The full-screen calendar is not deleted, and the reckoning control comes back

The author asked for both by name on 2026-09-02. A mockup that does not draw a
feature is not an instruction to remove it, and deleting a requested feature while
the author is asleep is the one move here that is hard to undo by reading the diff.

- `fullcal.js` **stays on disk and stays reachable**: the sidebar's month caption
  becomes the opener. One line of wiring, and the 432-line dialog keeps working.
- The reckoning control returns on the sidebar's `.cal-cap` line, where the
  "Revised Julian · Romanian" caption already is in the mockup — that caption is
  exactly where a reader would press to change it.

If the author wants either gone, deleting them later is a two-line change. Restoring
them after a wholesale delete is not.

### 11.5 Shelves come off Daily

The mockup settles this one: the page is the day, and a "continue reading" rail is
another page's furniture. Drop from Daily, fix `e2e/saint.spec.js:1530`.

### 11.6 The parked carousel keeps drifting at every width the stage runs at

Requirement 8 says the carousel "parks below still drifting" and the stage is already
disabled below 1024 px, so there is no third case to invent. Not a pause-on-laptop.
But **Step 2 must measure it**: if the parked rAF loop costs more than ~2 ms a frame
on the Daily page, say so in the report rather than shipping it quietly.

### 11.7 Things the plan does not yet answer — these are gaps, not questions

**a. A tile is the only route to the saint's own page, and the plan removes it.**
Requirement 5 makes a click *open the card*, so the register row's link to
`/saint/<slug>` has nowhere left to live. Daily becomes a dead end, and
`e2e/index-grid.spec.js:1040` is testing exactly that path. **The open card's name
must be the link** — `<a href="#/saint/<slug>">` around `.row-name-in` / `.row-head`'s
name — with the tile itself still opening on click. This is a functional regression
if it is missed and nothing in the mockup would have caught it.

**b. Entering the pair from a third route.** The stage mounts on first navigation
into either face, but a deep link to `/calendar/2026-09-12`, or arriving from a
saint page, mounts only the entered layer. Specify: the other layer is rendered
lazily on the first swap towards it, and that first swap renders-then-slides
(there is no retained state to preserve, so there is nothing to lose).

**c. The Back button.** Popstate between the two faces must take the same path as a
click, or Back cross-fades while a click slides. State it explicitly and test it.

**d. `data-fills-window` on a cold Daily load.** The plan sets it on the way in and
clears it on the way out, but says nothing about a reader whose first paint is Daily.
It must be set at mount when the entered face is `calendar`.

**e. The image reveal.** The plan mentions bypassing the stagger under reduced motion
but never says whether the mockup's 200 ms queue is ported at all. Port it: with N
saints' icons on one screen it is the difference between a page that settles and a
page that flashes.

**f. First paint fetches N payloads.** `lives.js` firing `loadDetail` for every saint
of the day on paint is what puts the Lighthouse FCP budget at risk. Fetch the open
card's payload first and the rest on `requestIdleCallback`; the folded tiles need
only two lines of a life that nobody is reading yet.

### 11.8 Two faces, not three

The mockup's masthead tabs and its sideways Texts slide are mockup furniture. The
real site has a five-link nav and Texts is its own route. Do not port the tab row.
Confirmed against the brief, which named only Daily ↔ All Saints.

### 11.9 Sequencing and safety

- **Step 5's deletions go in their own commit**, separate from the new code, so the
  removal can be read and reverted on its own. The diff that deletes 4679 lines of
  CSS and three modules should not also contain the code that replaces them.
- **Step 6 is three steps, not one.** ~90 rewritten tests is not one agent's work:
  (6a) delete `daily-picker.spec.js` and cut `daily-register.spec.js` to the four
  carried tests; (6b) rewrite `daily-panel.spec.js`; (6c) write `daily-stage.spec.js`
  for requirement 8 and fix the five cross-spec references.
- **`quality-floor.spec.js:192` is rewritten before the week rail is deleted**, not
  after. It is the accessibility floor; there must be no commit in between where the
  obligation is untested.
