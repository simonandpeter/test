# Gallery of Saints — Build Plan

A brief for Claude Code. Read the whole document before writing any code. Build in the phase order given at the end; do not start a later phase until the previous one's acceptance criteria pass.

---

## 1. What this is

A static website (and installable app) for engaging daily with the saints of the Catholic, Eastern Orthodox and Oriental Orthodox churches. Thousands of entries. Four pages:

1. **Calendar** — the home page. Opens on today's saints.
2. **All Saints** — the full corpus, browsable and filterable.
3. **Map** — saints placed geographically, with a time dimension.
4. **About** — what this is, how it's sourced, FAQ, contact.

The daily calendar is the habit. Everything else is exploration. If a trade-off arises, the calendar page wins.

---

## 2. Non-negotiable principles

These constrain every implementation decision below.

**Attest, never adjudicate.** The site never asserts "X is a saint." It reports that X is venerated by named churches, with a source. A saint is one entity with *N* per-church attestations, never a merged row with a single truth. Some figures are venerated in one tradition and rejected in another; both must be displayable side by side without editorial resolution.

**Absence of data is not absence of veneration.** Distinguish *not venerated* (positively established) from *undocumented* (we haven't sourced it). Collapsing these would systematically flatter the better-digitised Western sources. This is a three-state problem everywhere it appears.

**No fake precision.** All dates are intervals. A precise date is an interval where earliest equals latest. There is one code path for dates; there is no null-date special case.

**Uncertainty is rendered, not hidden.** Wide bars, soft edges, explicit "undated" trays. Honest gaps are part of the aesthetic, not an embarrassment to be padded over.

---

## 3. Stack

Static site, no backend, no API keys, near-zero hosting cost. It must still work if left untouched for two years.

- **Build/dev:** Vite. Vanilla ES modules — no React, no framework. The app is data-heavy and interaction-light; a framework buys little and costs bundle size.
- **Manifest generation:** Node script, no dependencies beyond a YAML/JSON parser and a schema validator (`ajv`).
- **Search:** MiniSearch, index built at runtime from the manifest.
- **Map:** `d3-geo` orthographic projection over bundled Natural Earth TopoJSON, rendered to `<canvas>`. Deliberately not MapLibre or Mapbox — no tile provider, no key, no quota, no vendor to outlive the project, and canvas handles thousands of points where SVG will not.
- **Persistence:** IndexedDB via `idb`, with `localStorage` for settings only.
- **Deploy:** GitHub Pages or Netlify from a `dist/` build. GitHub Actions runs the manifest build on push.

---

## 4. Repository layout

```
/saints/
  /agnes-of-rome/
    saint.json          ← the only required file
    life.md             ← main text
    /sources/
      butler-1866.md
      prologue-ohrid.md
    /images/
      icon.jpg
      icon.meta.json    ← credit, licence, source URL
  /shenoute-of-atripe/
    ...
/data/
  manifest.json         ← GENERATED. never hand-edit.
  manifest.meta.json    ← GENERATED. counts, build time, schema version.
/schema/
  saint.schema.json
/scripts/
  build-manifest.mjs
  validate.mjs
  new-saint.mjs         ← scaffolds a folder from a template
/src/
  ...
index.html
```

**The contract:** adding a saint means adding one folder. No other file is ever edited by hand. The build script discovers folders, validates each against the schema, and regenerates the manifest. Folder name is the slug and the permanent ID; the script fails the build on duplicate or malformed slugs.

Build must fail loudly on invalid data, naming what's wrong and in which folder. Silent skipping is forbidden — a saint that quietly vanishes from the manifest is the worst failure mode this project has.

---

## 5. Data model

`saint.json` — full shape. Only `slug`, `display_name` and at least one attestation are required.

```jsonc
{
  "slug": "agnes-of-rome",
  "display_name": "Agnes of Rome",
  "names": [
    { "form": "Ἁγνή", "lang": "grc", "note": "Greek" },
    { "form": "Agnes", "lang": "la" }
  ],
  "sex": "female",              // "male" | "female" | "unknown"
  "types": ["martyr", "virgin"],

  "dates": {
    "birth":  { "earliest": 285, "latest": 295, "display": "c. 291", "basis": "inferred" },
    "death":  { "earliest": 303, "latest": 305, "display": "c. 304", "basis": "traditional" },
    "floruit": null
  },

  "attestations": [
    {
      "church": "roman-catholic",
      "feast": { "day": 21, "month": 1, "calendar": "gregorian" },
      "status": "venerated",     // "venerated" | "not-venerated" | "undocumented"
      "titles": ["Virgin and Martyr"],
      "source": { "text": "Roman Martyrology", "year": 2004, "url": "..." }
    },
    {
      "church": "eastern-orthodox-byzantine",
      "feast": { "day": 21, "month": 1, "calendar": "julian" },
      "status": "venerated",
      "source": { "text": "Synaxarion", "url": "..." }
    }
  ],

  "locations": [
    {
      "kind": "death",           // "birth" | "death" | "ministry" | "relics" | "see"
      "historical_name": "Roma",
      "modern_name": "Rome, Italy",
      "lat": 41.9028, "lon": 12.4964,
      "precision": "city",       // "exact" | "city" | "region" | "uncertain"
      "note": "Traditionally on the Via Nomentana."
    }
  ],

  "historicity": "attested",     // "attested" | "traditional" | "disputed" | "legendary"
  "related": ["emerentiana", "constantina"],
  "text": { "life": "life.md", "sources": ["sources/butler-1866.md"] },
  "images": [{ "file": "images/icon.jpg", "meta": "images/icon.meta.json" }]
}
```

### Dates

Every date is `{ earliest, latest, display, basis }`. `basis` is one of `attested`, `traditional`, `inferred`, `unknown`.

Where only an attestation bound exists (a name first appearing in a 6th-century martyrology), record `{ earliest: null, latest: 550, basis: "inferred" }` and note the reasoning. Only saints with no bound at all go to the undated tray.

Interval width drives rendering. A 2-year interval draws sharp; a 200-year interval draws soft and wide. Never render a midpoint as if it were a fact.

### Feasts

Store `(day, month, calendar)` and convert at render time. Never store a pre-converted date. Support:

- `gregorian` — fixed
- `julian` — offset applied at render (13 days for 1900–2099; implement the general rule, not the constant)
- `coptic`, `ethiopian` — their own calendars, converted at render
- `paschal` — a signed offset in days from Pascha, computed per year

A saint may hold a different feast in each tradition. This is normal and must display as such, not as a conflict.

### Churches

A registry file, `src/data/churches.js`, defines every church with `id`, `display_name`, `communion`, and `rite`. Communion is the authority that decides additions and deletions to a calendar; rite is the liturgical tradition a church inherits its calendar from. The two are independent — a Chaldean Catholic answers to Rome but keeps the East Syriac calendar it shares with the Assyrian Church of the East — so both are stored on every church, not just one.

- **Catholic:** `roman-catholic` (Latin), `eastern-catholic` (Byzantine, Alexandrian, Ethiopian, Armenian, West Syriac or East Syriac, per sub-church — do not flatten this to one rite)
- **Eastern Orthodox:** `eastern-orthodox` (Byzantine). Do not split Byzantine/Slavic — it is not an ecclesial division, only a cultural one, and it excludes Romanian and Georgian churches that are neither. All autocephalous Eastern Orthodox churches share one calendar-authority structure; they are one communion.
- **Oriental Orthodox:** `coptic` (Alexandrian), `armenian` (Armenian), `ethiopian-eritrean` (Ge'ez), `syriac-malankara` (West Syriac) — kept as four separate entries; do not merge Ethiopian/Eritrean and Syriac/Malankara into one, they have distinct calendars and a merge would misattribute Malankara's own saints to Syriac Orthodox and vice versa.
- **Church of the East:** `assyrian-church-of-the-east` (East Syriac). A fourth communion, not a branch of Oriental Orthodox — filing it under Oriental would make figures like Nestorius and Isaac of Nineveh unrepresentable. **Open decision for the author, not for you:** leave it configurable in the registry (an `enabled` flag), default on, and note the decision on the About page; do not silently omit it or fold it into another communion.

**Known simplifications, to state on the About page rather than hide:** Eastern Catholic is collapsed to one entry despite covering roughly two dozen sui iuris churches across every rite family — flag this as the coarsest cell in the registry, and treat it as the first candidate for splitting when sourcing allows. The Church of the East split into Assyrian and Ancient Church of the East bodies in 1968; treated as one entry for now. Anglican and Lutheran bodies, and non-canonical or contested jurisdictions (e.g. ROCOR before 2007), are out of scope for the launch registry — state the inclusion criterion plainly rather than leaving it implicit.

---

## 6. Build step

`scripts/build-manifest.mjs`:

1. Scan `/saints/*/saint.json`.
2. Validate each against `schema/saint.schema.json`.
3. Emit `data/manifest.json` containing **only card-level fields**: slug, display_name, sex, types, date intervals, attestation grid (church → status), feast days, primary location, historicity, thumbnail path.
4. Emit `manifest.meta.json` with counts by church, by century, and by historicity — the About page renders these, so coverage gaps are public rather than concealed.
5. Fail on: duplicate slug, missing required field, `latest` earlier than `earliest`, coordinates out of range, attestation naming an unregistered church.

Target: under ~400 KB gzipped at 5,000 saints. If it exceeds that, shard and load shards on demand — but do not build sharding before it's needed. *(Amended 2026-08-22, Addendum G5: when the trigger fires the shard is calendar-first — a per-year feast slice the calendar can paint from, with card data behind it — not by century. The habit page wins.)*

Run it on push via GitHub Actions so the author only ever commits a folder.

---

## 7. Loading architecture

**Two layers.**

- **On load:** fetch `manifest.json` only. One request. All filtering, sorting, searching and mapping then happen client-side with zero further round-trips. *(Clarified 2026-08-22, Addendum G1: `manifest.meta.json` is not part of this request — it belongs to the About page and loads there.)*
- **On open:** fetch that saint's `life.md`, sources and images from its folder.
- **Derived once.** Anything computable from the manifest alone — per-card filter and sort keys, the feast index for a year, the facet lists — is computed once when the manifest arrives and read thereafter, never recomputed per render or inside a comparator (Addendum G2–G3). Caches are bounded (G4).

**Loading states.** No spinners as the primary device. Use skeleton cards that match the final layout's dimensions so nothing reflows on arrival. The initial manifest fetch shows a full-page load state; every subsequent fetch is inline and non-blocking.

**Prefetch** the detail payload for a card on hover (desktop) or on entering the viewport (mobile), so opening feels instant. Cap in-flight prefetches at four and cancel on navigation.

**Transitions.** Use the View Transitions API where supported, with a CSS opacity/transform fallback. Page changes cross-fade; card→detail uses a shared-element transition on the saint's image and name. Target 200–300 ms. All of it gated behind `prefers-reduced-motion`, which must disable transitions entirely rather than shortening them.

---

## 8. The four pages

### 8.1 Calendar (`/`)

Opens on today, in the user's local date. Shows every saint with a feast today across all traditions, grouped by church, with the tradition's own name and title for each. *(Amended 2026-08-22, Addendum H8: the page shows one church's calendar at a time, chosen by the reader from those the site-wide tradition selection (H7) allows, so no day lists a saint twice or interleaves two traditions' feasts; the reader is asked which before the week or month is shown, and the choice is remembered.)*

- Horizontal week strip; tap or arrow-key to move day by day; a month view for longer jumps.
- Deep-linkable: `/calendar/2026-08-20`.
- Text is richly hyperlinked to other saints (`related`) and to source texts.
- Provide **Save** and a **Continue reading** shelf — the two things that turn a thirty-second visit into a habit. Build these on day one, not as a later addition.
- If the user's calendar preference is set to Julian or Coptic reckoning, respect it; default to Gregorian with the other reckonings shown alongside.

### 8.2 All Saints (`/saints`)

**Two explicit modes**, toggled, with no attempt to merge them.

- **River (default).** A horizontal, unsorted, shuffled stream of saints. No ranking, no ordinal numbers, no sort control. This mode exists to present equality of standing rather than a scholarly index, and its lack of ordering is the point. Implement with virtualised horizontal scroll, drag/wheel/trackpad support, arrow-key and Tab navigation, and a `Shuffle` control. Deep-link the seed so a river can be shared.
- **Index.** Conventional vertical virtualised grid. This is where all sorting and filtering live. *(Amended 2026-08-22, Addendum H1–H3: two layouts, Cards and Rows, chosen and remembered; a **Detailed** tick box beside them that swaps each card's communion badge for the rite × communion matrix and adds a short description drawn from the saint's own life text; a frameless **bookmark** on every card that is the Save of §11; and the saint's page carries an × that returns the reader to this grid exactly as they left it — filters, layout, scroll.)*

Filters (Index mode): church, feast month, date range, type, sex, region, historicity, breadth of veneration. Plus full-text search and `Random saint`.

**Date range semantics** — a visible toggle, defaulting to *Overlaps*:
- *Overlaps* — any saint whose interval touches the range.
- *Entirely within* — only saints whose whole interval sits inside it.

Filtered-out saints fade out over ~200 ms rather than vanishing; the result count animates. Never sort by breadth of veneration by default — it would read as a ranking of importance.

Virtualise both modes. Thousands of DOM nodes is not acceptable on mobile.

### 8.3 Map (`/map`)

- `d3-geo` orthographic globe, canvas-rendered, draggable to rotate, pinch/scroll to zoom. Bundle Natural Earth land and coastline TopoJSON locally.
- Dots are placed by a **location kind the user selects** — birth, death, relics, ministry — because one dot cannot honestly represent all four. Default to death/martyrdom; make the current kind visible in the legend at all times.
- Zoomed out: today's feast-day saints render first and brightest; the rest are dimmer. Zoom in to reveal more dots, then labels. Cluster below a density threshold; collide-detect labels and drop rather than overlap.
- Uncertain coordinates render with a soft halo proportional to `precision`. Never snap an uncertain place to a false point.
- Shares the same filter set as the Index mode.
- **Timeline strip** at the bottom: brush to pincer a period, or press play. Each saint fades in across their birth interval, holds while alive, and fades out across their death interval — so uncertainty reads as a dissolve rather than a snap. Pace by event density, not linearly, or the first four centuries will be empty and the last two a blur.
- An **Unlocated** tray shows the count of saints with no usable coordinates, openable as a list. They are never silently dropped.

### 8.4 About (`/about`)

Editorial policy stated plainly: the inclusion criterion, the attestation model, the calendar conversion rules, the coverage statistics from `manifest.meta.json`, the sourcing, the licence, and how to submit a correction. This page is the project's defence against the objection that it takes sides — write it as substance, not boilerplate.

---

## 9. The veneration mark

Two views of the same attestation data, at two different grains. Build the badge in Phase 1; the detail-page view is Phase 3+ and must not block launch.

### 9.1 The badge (Phase 1 — required)

A grid of small squares, one per **communion**: Catholic, Eastern Orthodox, Oriental Orthodox, Church of the East (omit the fourth column when the registry's `enabled` flag for the Assyrian Church of the East is off — the grid is generated from the registry, so it is exactly as wide as the communions currently in it, never a fixed size padded out with reserved cells). **Position encodes identity — colour never carries information alone,** and a church's column never changes between saints.

Cells are squares on a fixed pitch, each inset from its neighbours by a small gap (start at roughly 10% of the cell width; tune against real data before committing to a value) so the nine-or-fewer cells stay individually countable rather than fusing into a shape that depends on registry adjacency rather than on meaning.

Three states, visually distinct in greyscale:

- **Filled, full colour** — attested veneration, with a citation.
- **Filled, pale grey** — positively established as *not* venerated (a rejection, a removal from the calendar, a formal condemnation). Same cell, same weight as an attestation — a refusal is as much a finding as a veneration — distinguished by value alone, not by an outline or a smaller mark. Tune the grey against the attestation colour so the two stay clearly apart at both ends of the size ramp; do not let refusal creep toward the weight of attestation.
- **Small centred mark, low opacity** — undocumented. We have not sourced this tradition either way. Must never be visually confusable with a refusal; this is the three-state distinction from §2 and it is the one thing this component exists to get right.

Where a communion has more than one church in the registry (Catholic currently does, via `eastern-catholic`), the badge cell reflects the communion as a whole: filled if any church in it is attested, pale if the ones we've checked are all refused and none is attested, small mark if none is documented. The detail page (9.2) is where the individual churches inside that communion are shown separately.

Render as inline SVG. Below ~20 px the grid becomes mush, so implement a **family-level fallback**: one small vessel per communion, filled from the bottom to the proportion of that communion's churches attested, for map points and dense rows. The full grid appears on cards and detail pages. Every mark carries a text equivalent for screen readers — "Venerated in 3 of 4 communions: Roman Catholic, Eastern Orthodox, Oriental Orthodox" — and a tap/hover legend naming each cell.

### 9.2 The detail-page view (Phase 3+, deferred)

The badge's four communion-level cells are a rollup. On the saint's own page, render the full **rite × communion** table: rite (Latin, Byzantine, Alexandrian, Ge'ez, Armenian, West Syriac, East Syriac) across one axis, communion down the other, each occupied cell naming the specific church or churches it represents. This is where the history actually shows up — a Chaldean Catholic cell sits directly adjacent to the Assyrian Church of the East cell in the same East Syriac rite, so a figure like Nestorius or Dioscorus, accepted on one side of a union and refused on the other, is legible as the split it is. The communion-level badge cannot show this; it isn't a smaller version of this view, it's a genuinely coarser one, and that's by design — most saints don't need the detail, and the ones that do are exactly the ones worth a reader stopping on.

Do not attempt to merge 9.1 and 9.2 into one component at two sizes. They answer different questions and should be built, and can be revisited, independently.

*(Amended 2026-08-22, Addendum H1: the rite × communion view also appears on Index cards and rows when the reader ticks **Detailed** — at its standard pitch, unscaled, so the undocumented mark keeps its size. Off by default; the badge remains what a card shows unasked. Still two renderers, still one dataset.)*

---

## 10. Theming

Dark and light, with a third `System` option, defaulting to system. All colour through CSS custom properties on `:root` — no hard-coded values anywhere. Set the theme from an inline script before first paint to avoid a flash. Transition theme changes over ~300 ms on background and text colour only; never transition `all`. *(Amended 2026-08-22, Addendum H5: the control is a sun/moon two-way toggle; there is no `System` option — a reader who has never pressed it follows the system preference live, and the first press fixes a choice.)*

Dark mode is not an inversion. Icon imagery is gold-heavy and warm; the dark palette must be built so that images sit in it comfortably rather than glowing out of a flat black field.

---

## 11. Saving, bookmarks, accounts

**Local-first, and local is complete.** Everything works signed-out, forever. *(Amended 2026-08-22, Addendum H2: the Save control is drawn as a frameless bookmark — on every Index card's image and beside the name on the saint's own page — writing the same `saved` record below.)* IndexedDB stores:

```
saved:      [{ slug, savedAt }]
reading:    [{ slug, scrollPos, lastReadAt }]   // "Continue reading"
history:    [{ slug, visitedAt }]               // capped, clearable
settings:   { theme, calendarPreference, defaultLocationKind, riverSeed }
```

Design the store as a **sync-ready log now, without building sync**: every record carries `updatedAt` and a stable ID, and all writes go through a single `store.js` module with a documented interface. When accounts arrive, one adapter behind that interface handles the server; nothing else changes.

Ship **Export / Import as JSON** in Phase 3 — it gives real cross-device portability for zero backend, and it means the promise of accounts isn't load-bearing.

Do not build authentication. Do not add an account UI, a "Sign in" button, or a placeholder. When it's warranted, the right shape is a hosted auth provider with the local store as source of truth and the server as a mirror — note this in the code comments and move on.

---

## 12. App mode

A real PWA: web manifest, maskable icons, standalone display, offline shell.

Service worker caching strategy:
- App shell and `manifest.json` — stale-while-revalidate.
- Saint detail payloads — cache on read, so anything opened stays available offline.
- Saved saints — precached eagerly on save, so the saved shelf works fully offline.
- Images — cache-first with a size cap and LRU eviction.

Offline must degrade honestly: the calendar and anything cached work; uncached saints show a clear "Not available offline" state, not a broken card.

---

## 13. Quality floor

Non-negotiable, and verified before each phase is considered done:

- Responsive to 360 px.
- Visible keyboard focus on every interactive element; the river is fully keyboard-traversable.
- `prefers-reduced-motion` disables transitions, the timeline animation, and the shuffle animation.
- All colour information duplicated in text or shape.
- Lighthouse accessibility ≥ 95; no axe-core violations.
- First contentful paint under 1.5 s on a throttled 4G profile.
- No layout shift when data arrives — skeletons must match final dimensions.

---

## 14. Design direction

Do a design pass and produce `DESIGN.md` — a token system of 4–6 named colours, a display/body/utility type trio, a layout concept, and one signature element — **before writing component CSS**. Then build to it exactly.

Ground it in the subject's own materials: the liturgical calendar's red-and-black rubrics, the proportions and gold ground of an icon panel, the ruled columns of a martyrology, the register of a synaxarium. Restraint suits this content; ornament will read as costume.

Avoid the current AI-design defaults, which would make this look like every other generated site: cream `#F4F1EA` with a terracotta accent and a high-contrast serif; near-black with a single acid accent; broadsheet hairline rules with zero border-radius. Where the brief above pins something down, follow it. Where it leaves you free, spend that freedom on something specific to *this* subject.

Spend boldness in one place. The veneration badge (§9.1) is the strongest candidate for the signature element — it is unique to this project and carries real information. Let it be the memorable thing and keep everything around it quiet.

---

## 15. Phases

**Phase 0 — Foundations.** Schema, `build-manifest.mjs`, `new-saint.mjs`, validation, church registry, date-interval utilities, calendar conversion (Gregorian/Julian/Coptic/Ethiopian/Paschal) with unit tests. Ten hand-authored saints spanning all three families, including at least one disputed figure, one legendary figure, one with no coordinates, and one venerated on different days in different traditions.
*Done when:* adding an eleventh folder and running the build makes it appear with no other edit, and bad data fails the build with a useful message.

**Phase 1 — Calendar + detail.** Home page, saint detail, veneration badge (§9.1), dark/light, transitions, skeletons, IndexedDB store, Save and Continue reading. Roughly 400 saints, at least one per day.
*Done when:* this is a genuinely usable daily site on its own. It ships here.

**Phase 2 — All Saints.** River and Index modes, virtualisation, search, all filters, range semantics toggle, random.

**Phase 3 — Map.** Globe, clustering, labels, location-kind selector, timeline brush and play, unlocated tray. Then export/import. Add the rite × communion detail-page view (§9.2) once the map work is stable — it needs the `rite` field on every church, which should already be populated from Phase 0, but the render path itself is new work and does not block anything above it.

**Phase 4 — App mode.** Service worker, offline strategy, install prompt, About page coverage statistics.

Treat data acquisition as a separate, continuous workstream running alongside all of this. It will outweigh the engineering, and the app should be built so that it grows simply by folders arriving.

---

## 16. Do not build yet

Authentication. Sharding. Server-side anything. Comments or user contributions in the UI. Notifications. Multiple UI languages — but do keep all UI strings in one module so that stays cheap later.
