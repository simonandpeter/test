# Handoff

**State and what is in flight, and nothing else.** What the site is and what is
next are `STRUCTURE.md`; how to work here is `CLAUDE.md`. Finished work is in
the commit message — `git log --grep` searches it. `CLAUDE.md`'s "Which
document takes it" is the rule this file obeys.

**Verify anything here before you build on it**, and **read a number from the
run rather than from this file**. It was 573 lines once, nine tenths of it
narratives of finished sittings, and the trim that cut it kept a "known and
unfixed" list on the strength of its heading — one of whose four items had been
fixed three days earlier.

---

## State

`bash scripts/state.sh` is the truth about what has landed — `git status` lies
here, because a PAT push never updates `origin/main`.

- `npm test` for the unit count, `node scripts/locale-coverage.mjs` for pack
  gaps, `scripts/build-manifest.mjs` for the corpus size. None of them is
  written down here.
- **A full browser run fails about four of ~1,040 at six workers, and it is a
  different four each time.** Treat them as this desk until `--repeat-each=6`
  alone says otherwise — that comparison is what separated three real defects
  from the noise on 2026-09-15. The shelf-swipe flake is the known one and is
  the test's fault, not the page's (`STRUCTURE.md` §6).
- **Two of them are not flakes and repeat every time**, on the unmodified tree
  as well, so a run that shows these two and nothing else is a clean run:
  `saint.spec.js` "a saint page is the Daily page's two columns", and
  `index-grid.spec.js` "Also commemorated is a column of saint cards", which
  expects six saints under 1 September 2026 in the Russian calendar where the
  corpus now holds seven. The second is a test naming an instance — exactly what
  `STRUCTURE.md` §1 says a spec must not do — and is a two-line fix nobody has
  made.
- The PAT is at `C:\Users\matei\Documents\Agios Website Ex\update git.txt`.
  `bash scripts/push.sh` pushes and reads the CI run in one step.

---

## In flight

**The document cut, uncommitted.** Six documents are gone — the old plan, the
old to-do, the reverted rebuild's two, and the scratchpad's three — and every
citation to them has been retired from `src/`, `e2e/`, `tests/` and `scripts/`.
`STRUCTURE.md` is what replaced the first two. The plan's test is now
`tests/structure.test.mjs`, the saint-slug guard moved to
`tests/corpus-break.test.mjs`, and `scripts/tokens-table.mjs` prints §3's four
token tables from `tokens.css`. `git log` has the rest; nothing is pushed.

**`/prayer` is finished and unpushed.** The hymn reader is complete through the
plan's seventh stage — the route, `lib/prayer-order.js`, the card and its fade,
the two asides, the field with its own MiniSearch, the phone, and the sixth nav
link — and `scratchpad/prayer-plan.txt` is spent. `STRUCTURE.md` §4 Prayer
describes the page that is there. `scratchpad/strip-throttle.mjs` is the
instrument that settled the nav strip's gap budget at six links and is worth
keeping for the seventh.

**`index.css` and `saint.css` are off the render-blocking entry sheet, and
unpushed.** `src/ui/sheets.js` loads them per route and `main.js` awaits a
view's `styles()` before it renders. The entry sheet's byte gate passes with
room; **`npm run test:lighthouse` is still red on FCP**, which it also is on an
unmodified tree on this desk (`STRUCTURE.md` §6 item 7) — every route improved
by roughly the 150 ms round trip and none reached 1500 ms here.

**The Daily desktop redesign is in two stages and the first has landed.** The
frame and the four columns are done (`STRUCTURE.md` §4 Daily describes the page
that is there). **Stage two is the shelf's own face**: the tile faces in
`.cal-bubble`, the picture/rows view toggle, and the selected-state styling.
What stage one left there is the register's existing two faces, re-placed into
a `--side-w` column, with the chosen row hidden and marked `aria-current`.

---

## Three things git cannot tell you

**`android/app/src/main/assets/public/` holds a built copy of the site from
2026-09-05** — before the rename and before the rebuild, so its masthead reads
"Daily Dox" and its Daily page is the week rail. It is **gitignored and
untracked**: the only copy of that state outside git, and `npm run app:sync`
would overwrite it.

**Visual baselines exist under `shots/`, which is gitignored, so nothing else
records that they are there. Never re-shoot one.**

- `baseline-before-daily-rebuild` — 16 tiles of `/saints` from before the
  rebuild.
- `baseline-new-daily-2026-09-15` — 4 tiles of `/` at 360 and 1280 in both
  themes, the rebuilt page as it stood the moment before the revert.
- `baseline-before-daily-desktop-2026-09-16` and
  `baseline-after-daily-desktop-2026-09-16` — 18 tiles either side of the
  four-column Daily desktop, plus `baseline-noise-2026-09-16`, which is the
  same build shot twice and came back identical on all 18.

```bash
MSYS_NO_PATHCONV=1 node scripts/contact-sheet.mjs --still --routes=/,/saints,/texts   --widths=360,768,1280 --themes=day,vigil --langs=en
```

- `baseline-before-css-split` and `baseline-after-css-split` — 8 tiles either
  side of `index.css` and `saint.css` leaving the entry sheet. Two tiles differ
  between them, and the unmodified tree shot against the same baseline differs
  by the same 3,984 px on the same two, so nothing in that pair is a finding.

```bash
MSYS_NO_PATHCONV=1 node scripts/contact-sheet.mjs --still   --routes=/saints,/saints/anthony-the-great --widths=360,1280 --themes=day,vigil --langs=en
```

**`tile-saints-1280-day-en` moves by ~3,980 px between any two sittings and is
not a finding.** A 20 × 200 px strip at the carousel's left edge; the
unmodified tree shot against the same baseline moves it by exactly the same
number. Two shots in one sitting are identical, so the instrument's own floor
does not see it.

```bash
MSYS_NO_PATHCONV=1 node scripts/contact-sheet.mjs --still --routes=/saints \
  --widths=360,768,1280,1440 --themes=day,vigil --langs=en,ru
node scripts/tile-diff.mjs compare before-daily-rebuild
```

`MSYS_NO_PATHCONV=1` is not optional: without it every shot fails and
`tile-diff` archives stale tiles as the baseline. That happened twice and both
times the output read as success.

**`4983e72` is titled as a docs fix and also carries 3,400 lines of spec
deletions**, swept in by a bare `git commit` after `git add`. The tree is right,
the history is not. It is unpushed, so a rebase would still tidy it.
