# Handoff — start here

You are picking up the Gallery of Saints build at **Session 4a**. Nothing of
the previous conversations survives except the files in this repo, so this
document is the briefing.

## Read first, in this order

1. `../saintsbuildplan.md` — the brief.
2. `../saintsplanaddendum.md` — **supersedes the brief where they disagree.**
3. `DESIGN.md` — binding. Written before any component CSS, per brief §14.
4. `SESSIONS.md` — the delivery plan. **Its Amendments section at the top is
   the most important page in the repo**; it records decisions that cost real
   time to learn.

Do not re-litigate settled decisions. If something looks odd, assume there is a
recorded reason and search these four documents before changing it.

## State as of 2026-08-20, 23:5x

Live at https://simonandpeter.github.io/test/ — deployed by GitHub Actions
from `dist/`, **not** from the branch.

Complete: Phase 0 data foundations, the design pass, the app shell, the
veneration badge, and the calendar page. Verified in a real browser: the
calendar renders, both traditions show their own titles and reckonings
(Anthony the Great appears on 30 January 2026 via Julian 17 January *and*
Coptic 22 Tobi), the badge paints three gold cells and one undocumented dot,
and there are zero axe violations at WCAG 2.1 AA.

- 75 unit tests (`npm test`) — pure logic, no DOM.
- 34 browser tests (`npm run test:e2e`) — 17 specs across desktop and 360 px.
- `npm run test:all` runs both. CI runs both on every push.

## Your sessions

### Session 4a — detail page, store, habit features

The tooling that Amendment 1 called for **is already installed and passing** —
that was done ahead of you specifically so this session does not start with a
risky dependency install. Playwright, `@axe-core/playwright`,
`playwright.config.js` and `e2e/quality-floor.spec.js` all exist and are wired
into CI. **Extend that spec as you build; do not rebuild it.**

Then, per the brief and DESIGN.md:

- **Saint detail page** at `/saints/:slug`: `life.md` rendered, sources linked,
  `related` saints hyperlinked, images with credits, the full badge, and date
  bars whose softness comes from `lib/uncertainty.js` (§6b) — the first
  consumer of that curve. Multi-script name forms go in `.names` (bounded
  line-height; see DESIGN.md §4 for why).
- **`src/lib/store.js` over IndexedDB** (`idb`): the four stores in brief §11
  (`saved`, `reading`, `history`, `settings`). Every record carries `updatedAt`
  and a stable id, all writes go through one documented interface, and the
  shape is sync-ready **without building sync**. Do not build authentication,
  an account UI, or a "Sign in" placeholder — brief §11 is explicit.
- **Save** and **Continue reading** on the calendar. Brief §8.1 calls these the
  two things that turn a thirty-second visit into a habit, and says build them
  on day one.
- **Shared-element transition** card→detail. The `view-transition-name` markup
  is already on hero image and names, so this should be mostly CSS.
- **Prefetch** detail payloads on hover (desktop) / viewport entry (mobile),
  capped at four in flight, cancelled on navigation.

*Done when:* a saint opens, saving persists across reload, Continue reading
reappears, and `npm run test:all` is green with new specs covering the store
and the detail page.

### Session 5 — All Saints, Index mode

Vertical virtualised grid, MiniSearch full-text search, and every filter in
brief §8.2: church, feast month, date range, type, sex, region, historicity,
breadth of veneration. The **Overlaps / Entirely within** toggle defaults to
*Overlaps* and both semantics already exist and are unit-tested in
`src/lib/dates.js` — use them, do not reimplement. Filtered-out saints fade
over ~200 ms; the result count animates; **never sort by breadth of veneration
by default**, it would read as a ranking of importance.

Virtualisation: feed exact per-item heights from each card's manifest
`aspect`; do not add a measurement pass (Addendum C2).

## House rules learned the hard way

- **CI is the source of truth, not your local run.** A `.gitignore` bug once
  left `src/data/` untracked while every local test passed. **Push and confirm
  CI is green before calling a session done. If CI is red, stop and fix it —
  do not start the next session on a broken base.**
- **Do not bulk-generate saint data.** Amendment 2 explains why at length. The
  corpus is 10 saints and the calendar is empty most days; that is a known,
  accepted state, not a bug for you to paper over with invented feast days.
  Where a date is unverified, the honest entry is `undocumented` with a note —
  see `saints/paul-of-thebes/saint.json` for the pattern.
- **Gold appears only in the veneration badge. Red marks only liturgical time
  and the reader's place.** These two sentences are the design (DESIGN.md §2).
  Errors are prose in ink, never a red banner.
- **Reduced motion removes animation, never shortens it.** There is a test.
- Adding a saint means adding one folder. Never hand-edit `data/`.

## Environment notes (Windows)

- `node --test` with no arguments discovers all unit tests; a quoted glob also
  works. Prefer the bare form.
- **PowerShell 5.1 writes a BOM** with `Set-Content -Encoding utf8`, which
  breaks `JSON.parse`. The manifest build strips BOMs defensively, but prefer
  the Write tool or `[System.IO.File]::WriteAllText` with `UTF8Encoding($false)`.
- Git Bash mangles leading-slash paths in arguments (`/test/x` becomes
  `C:/Program Files/Git/test/x`). Verify against live URLs, not local echoes.
- `npm run dev` must be backgrounded; it does not exit.
- CRLF warnings from git are noise on this repo.
- **The user's PAT lacks the `workflow` scope.** If a commit touches
  `.github/workflows/`, their push will be rejected — tell them, and note that
  browser-based sign-in avoids it. *(This handoff's own commit touches the
  workflow file, so that push will need the wider scope.)*

## Outstanding, needs the user — not you

- **Seven image licences.** Recorded as "Creative Commons" but every CC variant
  except CC0 requires attribution, so each needs a per-image `credit` and
  `source_url` in its `icon.meta.json`. Currently 7 live build warnings. Blocks
  publication; does not block your sessions.
- **Assyrian Church of the East `paschal_computus`** is unverified and flagged
  `needs_sourcing` in `src/data/churches.js`. Nothing renders a movable feast
  yet, so this is not urgent.
- **Manifest budget:** projects to 864 KB gzipped at 5,000 saints against a
  400 KB ceiling. Meaningless below ~200 saints — gzip has nothing to work
  with. Re-check past that mark; do not build sharding before then.
