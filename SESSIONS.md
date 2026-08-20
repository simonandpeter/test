# Build sessions

## Amendments — read before starting Session 4a (recorded 2026-08-20)

**1. The quality floor is currently unenforceable, and it gates the ship.**
Brief §13 requires Lighthouse accessibility ≥ 95, zero axe-core violations,
FCP under 1.5 s on throttled 4G, responsiveness to 360 px and visible keyboard
focus — "verified before each phase is considered done". None of that can be
verified today: there is no Playwright, no axe-core, no Lighthouse in the
project, and an agent session has no browser at all. Every visual and
interactive claim made so far rests on inference from the data plumbing, not
observation.

*Therefore:* installing and wiring that tooling is the **first task of Session
4a**, not part of 4b. Playwright plus `@axe-core/playwright` plus Lighthouse CI
all run headless in GitHub Actions; once they do, the quality floor becomes a
CI gate that fails loudly like the manifest build does, rather than an
aspiration nobody can check. Until it exists, treat "Session 4b passed" as
unprovable, and do not let 4b claim the ship gate on inspection alone.

**2. Data acquisition is now the critical path, and must not be bulk-generated
unsupervised.** It was scheduled to open in Session 2 and has not started. The
corpus is 10 saints, so the calendar is empty on ~355 days a year, and Session
4b would otherwise "ship" a daily habit page that has nothing to show on almost
every day.

The temptation is to have an agent draft several hundred saints overnight.
**Do not.** This project's entire value is that each attestation is real and
cited; a few hundred plausible-looking but unverified feast days would do
damage that is invisible at review time and very expensive later — and the
model cannot tell its own confident guesses from its sourced facts. Note how
the existing ten handle this: where the Coptic Synaxarium date was not
verified, the entry says `undocumented` with a note rather than guessing.

*Therefore:* overnight data work should build the **pipeline and the review
workflow**, not the corpus. Ingest from a structured public-domain source with
citations attached, write every unverified field as `undocumented`, and flag
anything inferred for human review before it counts as sourced.

**3. CI is the source of truth, not the local test run.** The `.gitignore` bug
(commit 7512a5b) had `src/data/` untracked while every local test passed,
because the files sat on disk. Only a fresh CI checkout revealed it. After any
session that adds files, confirm CI is green before calling the session done —
a local pass proves nothing about what was actually committed.

**4. Live and deployed.** GitHub Pages now serves the Actions build at
https://simonandpeter.github.io/test/. Verified live: correct `/test/` base
path, all bundles and 12 font subsets resolving, manifest and saint files
serving, and the 404-fallback deep-link route returning the app shell so
client-side routing works. Cache-Control is a flat `max-age=600` on everything
including content-hashed assets; that is a Pages platform default, not worth
chasing before a custom domain.

**5. Watch the manifest budget.** Adding per-attestation `titles` moved the
5,000-saint projection from 717 KB to 864 KB against a 400 KB ceiling. Still
meaningless below ~200 saints (gzip has nothing to work with), but re-check it
once the corpus passes that mark, before considering the sharding the brief
defers.

**Still outstanding from earlier sessions:** the seven image licences need per-
image credit and source_url (live in production as 7 build warnings); the
Assyrian Church of the East's `paschal_computus` is unverified and flagged
`needs_sourcing` in the registry.


Working plan for delivering `saintsbuildplan.md`. The brief's phase gates are
binding: no session starts until the previous one's acceptance criteria pass.

Revised 2026-08-20 after a plan review. Five changes from the first draft, all
recorded here with their reasoning so the decisions don't have to be re-argued:

1. **Session 4 split into 4a and 4b.** Detail page, the whole IndexedDB store,
   two habit features, transitions and the full quality-floor audit was two
   sessions wearing one label — and the audit is the part that would have been
   squeezed, on the one session that ships. The audit now has its own sitting.
2. **Data acquisition starts during Session 2, not after Session 4.** Phase 1
   wants ~400 saints, one per feast day. Shipping at Session 4b with ten saints
   would ship a calendar that is empty on 355 days a year, which is the one
   thing the site exists to not be. The pipeline runs in parallel from Session 2.
3. **Pascha is per-church, and both computus rules ship in Session 1.** Catholic
   movable feasts key off Gregorian Easter; Orthodox and Oriental ones key off
   the Julian computus, and the two diverge by up to five weeks. A single
   `easter()` would have been silently wrong for most of the corpus. The church
   registry carries `paschal_computus`; both algorithms are implemented and
   tested in Phase 0.
4. **`region` is derived at manifest-build time.** Phase 2 filters on region but
   the schema has no region field, only coordinates. Derived at build from a
   coarse bounding-box table, three-state like everything else: a saint outside
   every box gets `null`, not `"other"`.
5. **Thumbnails are verified by the build, generated by a separate step.** See
   the note in Session 1 below.

## Session 1 — Phase 0: data foundations — DONE (2026-08-20)

54 unit tests pass; the build produces 10 saints. What the session settled, and
what it turned up that the plan had not anticipated:

- **`rites` is a list, not a value.** The brief says both to keep
  `eastern-catholic` as one entry and not to flatten it to one rite. Those are
  only compatible if rite is plural, so every church carries a list — length one
  for all but Eastern Catholic, which carries six. This also gives §9.2's
  rite × communion table its multi-cell rows for free.
- **`centuryOf` and the region table both shipped wrong and were caught by
  tests.** Flooring an astronomical year puts 100 BC in the 2nd century BC, and
  a single Italy bounding box claimed Augustine of Hippo, whose city sits at
  Sicily's latitude and Sardinia's longitude. The Maghreb now needs three boxes
  to separate it from Sicily and from Iberia across the two straits.
- **Undocumented attestations are omitted from the manifest.** A church absent
  from a card means undocumented, which is exactly what an explicit entry meant,
  so this is lossless for rendering and cut the payload by a quarter. The
  distinction between "recorded as undocumented" and "never mentioned" survives
  in `manifest.meta.json`, where it is a data-quality signal rather than
  something a reader sees.
- **The size projection is over budget and should be ignored for now.** 717 KB
  projected at 5,000 saints against a 400 KB ceiling, but gzip has almost
  nothing to work with at ten saints. The build prints the caveat below 200
  saints and switches to a real warning above it. Revisit during the Session 2
  data workstream; do not build sharding before then.
- **Christopher is the case worth re-reading before Session 3.** His feast was
  removed from the General Roman Calendar in 1969, and he is still venerated.
  Recording that as `not-venerated` would have been wrong, and the badge must
  not tempt anyone into that shortcut later.

Carried into Session 2: `vite.config.js` does not exist yet, and it needs a
plugin to copy `saints/` and `data/` into `dist/` since both sit outside
Vite's `publicDir`. The Pages deploy job in `.github/workflows/build.yml` is
commented out pending it.

### Original scope



No UI. The entire data layer, tested, before any pixel exists.

- Repo layout per brief §4; `package.json` with `ajv` and Vite only.
- `schema/saint.schema.json` covering the full §5 shape.
- `src/data/churches.js` — id, display_name, communion, rites, paschal_computus,
  and the `enabled` flag on the Assyrian Church of the East.
- Date-interval utilities; one code path, no null-date special case.
- Calendar conversion — Gregorian, Julian (general rule, not the 13-day
  constant), Coptic, Ethiopian, Paschal (both computus rules) — with unit tests.
  This is the code most likely to be quietly wrong and least likely to be
  revisited, so it gets tested once, properly, here.
- `build-manifest.mjs`, `validate.mjs`, `new-saint.mjs`.
- Ten hand-authored saints: the seven existing, plus three chosen to cover the
  cases the brief requires (disputed, legendary, no coordinates, different feast
  days in different traditions).
- GitHub Actions workflow running the build on push.

**Thumbnails.** `make_thumbs.py` produces a blurred LQIP placeholder, not a card
thumbnail — worth keeping, but it needs Pillow, and the brief caps build
dependencies at a parser and a schema validator. So generation stays a separate
`npm run thumbs` step, and the manifest build *verifies* every declared image has
its placeholder, failing loudly if not. Nothing silently degrades; the dependency
stays out of the build.

**Done when:** adding an eleventh folder and rebuilding makes it appear with no
other edit, and each of the §6 failure classes fails the build with a message
naming the folder and the problem.

## Session 2 — Design pass, then app shell — DONE (2026-08-20)

`DESIGN.md` is the binding document; read it before touching any CSS. The
decisions that will govern every later session:

- **Gold appears only in the veneration badge; red only marks liturgical time
  and the reader's place.** These two sentences are the design. Any PR that
  uses gold for a flourish or red for an error has missed the point.
- **Dark mode is bole** — the red-brown clay under gold leaf — not inverted
  black, so the warm icon photography sits in the surface instead of glowing.
- **Type:** Literata variable (display and body via the optical-size axis),
  self-hosted WOFF2 subsets covering latin/greek/cyrillic incl. polytonic;
  utility voice is the system grotesque. `font-display: optional` — fallback
  stays on a cold slow first visit because zero layout shift outranks brand.
  Regenerate with `scripts/fetch-fonts.mjs`; no runtime Google dependency.
- Shell shipped: pre-paint theme script (light/dark/system on
  `gos-settings`), history router with Pages 404.html fallback, manifest
  loader, full-page veil, view scaffolds, all UI strings in `src/ui/strings.js`.
- The calendar scaffold already renders today's commemorations from the real
  feast index — the data path is proven end to end in the browser.
- `vite.config.js` serves `saints/` and `data/` in dev (with a
  directory-confinement guard; note Vite's stock dev server intentionally
  serves repo-root files in dev — that is not a deploy concern, `dist/` holds
  only built output) and copies both into `dist/` at build. Pages deploy job
  enabled in CI; **the repo's Pages setting must be flipped to "GitHub
  Actions" once, by hand, before the deploy job can succeed.**
- Bundle: 6.2 KB JS + 2.2 KB CSS gzipped before fonts. The FCP budget has
  plenty of headroom for Sessions 3–4.
- Image meta updated: licence family recorded as Creative Commons per the
  author (2026-08-20); build now warns until variant + credit + source_url are
  recorded per image, since every CC variant except CC0 requires attribution.

**Data workstream opens here** and runs continuously from now on.

## Session 3 — Addendum A + veneration badge + calendar page — DONE (2026-08-20)

**Addendum A landed first** (it supersedes the brief where they disagree):

- `location.precision` is gone; coordinates now require a numeric
  `uncertainty_km` (positive, ≤ 20000; authoring defaults 1 / 15 / 150 / 500).
  All ten saints migrated by script. Enums stay for `basis` and `historicity`,
  which modulate treatment, never geometry.
- The manifest's `image` field is now an object — src, lqip, w, h, aspect —
  read at build time by `image-size` (the sanctioned metadata-only dependency
  exception). Cards reserve their box from data; the blurred placeholder is
  the skeleton fill. `titles` also now travel with venerated attestations,
  because the calendar renders each tradition's own style from the manifest
  alone.
- `scripts/font-metrics.mjs` parses the committed WOFF2s (no dependency —
  node:zlib does Brotli) and emits `src/styles/metrics.css`: cap 0.700,
  ascent 1.177, descent 0.308, natural line box 1.485 em. `.names` bounds its
  line-height below that so script-fallback substitution can never move
  layout. `npm run fonts` regenerates files and metrics together.
- The uncertainty curve (DESIGN.md §6b) exists as tokens + `lib/uncertainty.js`;
  date bars consume it in Session 4a, halos and the timeline inherit it later.
- Badge refusal geometry per A1: **hollow at full cell size**, superseding the
  brief's pale-grey fill. Partial lattice rows left-align on the lattice.

**Then the session proper:**

- `ui/badge.js` — pure string-returning SVG, fully unit-tested without a DOM:
  registry-generated lattice, three states distinct by shape (filled / hollow
  / faint dot), disabled communions hidden not drawn, text equivalent naming
  churches not colours, per-cell titles, and the vessel fallback for dense
  rows.
- The calendar page in full: deterministic saint-of-the-day hero (FNV over the
  ISO date; image-bearing saints preferred silently; shared link = shared
  page), slot transition on day change (260 ms, direction follows travel,
  instant under reduced motion), Monday-framed week strip with density dots
  and arrow-key stepping, month view with year-crossing cursor, deep links
  via replaceState (no history spam), the day in Julian/Coptic/Ethiopian
  reckonings alongside, church-grouped register with each tradition's titles
  and feasts in their own reckoning, and the empty day as a designed state.
- `view-transition-name` markup is on hero and register names now, per
  Addendum D, so Session 4a's shared-element transition is CSS only.
- 75 tests pass. Bundle: 10.1 KB JS + 3.0 KB CSS gzipped.

Deferred knowingly: the calendar-preference *setting UI* (the default
Gregorian-with-reckonings-alongside rendering is in); hover-legend beyond
native SVG titles; date-bar rendering (4a, where the detail page needs it).

## Session 4a — Phase 1b: detail page, store, habit features

Detail page with `life.md` and linked sources; `store.js` over IndexedDB with
the §11 stores, every record carrying `updatedAt` and a stable id behind one
documented interface; Save and Continue reading; View Transitions with fallback;
prefetch capped at four.

## Session 4b — Ship gate

Full §13 audit: 360px, keyboard focus, reduced-motion, Lighthouse ≥ 95, axe
clean, FCP < 1.5s throttled, no layout shift. Fix what it finds. Deploy.

## Session 5 — Phase 2a: Index mode
## Session 6 — Phase 2b: River mode
## Session 7 — Phase 3a: globe
## Session 8 — Phase 3b: timeline, export/import, rite × communion table (§9.2)
## Session 9 — Phase 4: PWA, offline, About page statistics

## Deploy change, from Session 1 onward

`data/manifest.json` is generated and gitignored, built by CI. The site stops
being "commit static files to a branch" and becomes "Actions builds, Pages
serves the artifact". This also removes the prototype's runtime dependency on
the GitHub API for listing the saints folder — the manifest is the listing now,
so new saints no longer need a push before they are visible locally.
