# Handoff — archive the cross-church build, start the Eastern Orthodox one

For the next chat. Nothing of the previous conversations survives except the
files, so this is the briefing. It has two jobs, in this order: **put the
cross-church Gallery of Saints away as a backup**, and **start a smaller
project — Eastern Orthodox saints and calendars only — on the same design and
structure**, so the larger corpus can come back to a proven shape later. The
author wants to see how much of the built thing can be repurposed; §3 is that
inventory, measured rather than guessed.

Read in this order: this file; `main/HANDOFF.md` (the cross-church project's
own briefing, still accurate for the code you will be copying); `main/DESIGN.md`
(binding for the old project, mostly right for the new one — §6 of this file
says where it is not); the Amendments at the top of `main/SESSIONS.md`
(twenty-three entries, each something that cost real time — they apply to the
new project word for word because it is the same code). Then the brief and its
addendum in this folder, which the new project will want its own version of.

---

## 0. Where things stand (close of 2026-08-22)

- The cross-church build lives in `main/` — a git repo, deployed by GitHub
  Actions to https://simonandpeter.github.io/test/ from `dist/`, not from the
  branch. Last commit `031add2`. Working tree clean.
- **Two commits were unpushed at the close**: `f9a1308` (Phase 1: Detailed
  Index, the bookmark, the ×, the desktop head) and `031add2` (Phase 2: the
  header's two controls, the site-wide selection, one calendar at a time).
  `git log origin/main..HEAD` is the authority — check it first. Pushing
  happens in a separate session of the author's; agent sessions have no git
  credentials. **Do not build on top of either until the author confirms the
  GitHub Actions run is green.**
- 133 unit tests (`npm test`), 234 browser tests (`npm run test:e2e`, desktop
  and 360 px). `npm run test:all` runs both and was green at the close.
- The documents the repo's HANDOFF points at with `../` — `saintsbuildplan.md`
  (the brief), `saintsplanaddendum.md` (Addenda A–H, the author's decisions),
  `veneration-glyph-spec.md`, `veneration-glyph.js`, `veneration-glyph-proof.html`
  — sit in **this** folder, outside the repo. An archive that loses this folder
  loses the reasoning. §1 step 2 fixes that.
- Also in this folder: `Saints/` and three Python scripts (`crop_saints.py`,
  `render_v3_saints.py`, `blur_downscale.py`) — the author's image
  preparation, not part of the build; `main/make_thumbs.py` is the one the
  build uses.

## 1. Archive the cross-church build — do this first

The archive is the repo, self-contained, tagged, with an offline copy. Leave
the live site serving it. Nothing is deleted and no history is rewritten.

1. **Ask the author to push** `f9a1308` and `031add2` and to confirm Actions
   is green. Everything below waits on that.
2. **Make the repo self-contained.** Copy the five documents from this folder
   into `main/docs/` — `saintsbuildplan.md`, `saintsplanaddendum.md`,
   `veneration-glyph-spec.md`, `veneration-glyph.js`,
   `veneration-glyph-proof.html` — and add one line to `main/HANDOFF.md`'s
   "Read first" list saying they now also live in `docs/`. Commit:
   "Archive: the brief, the addendum and the glyph reference travel with the
   repo". Do not move the originals; the author's own copies stay where they
   are.
3. **Mark the repo archived.** At the top of `main/HANDOFF.md`, one paragraph:
   frozen at this commit on this date, successor project at `../orthodox/`
   (or wherever §2 puts it), do not build here. Commit.
4. **Tag it**: `git tag -a archive/cross-church-2026-08 -m "Cross-church
   Gallery of Saints, frozen before the Eastern Orthodox project"`. Tags need
   pushing too — `git push --tags` is the author's, like every push.
5. **Offline copy**, from this folder in Git Bash:
   `git -C main bundle create agios-cross-church-2026-08.bundle --all` (the
   whole history in one file; `git clone x.bundle` restores it), and a zip of
   `main/` without `node_modules/`, `dist/`, `test-results/`, `shots/`, `.tmp/`
   — in PowerShell, `Get-ChildItem main -Exclude node_modules,dist,test-results,shots,.tmp | Compress-Archive -DestinationPath agios-cross-church-2026-08.zip`.
   Put both somewhere other than this disk if the author has somewhere.
6. **Leave GitHub Pages as it is.** The new project gets its own repo and its
   own Pages site; the archive stays readable at its URL.

What not to do: do not `git push` (credentials); do not touch
`.github/workflows/` (the author's PAT lacks the `workflow` scope and their
push would be rejected); do not "tidy" the archive — a backup that has been
improved is not a backup.

## 2. The new project, and how to start it

**What it is.** Eastern Orthodox saints and the Eastern Orthodox calendar,
only. Same design (gesso and bole, ink and rubric, Literata, the register and
the panel), same structure (manifest from folders, calendar as the habit page,
Index, saint page, local-first store). The cross-church corpus — four
communions, rite × communion, attest-never-adjudicate across churches — comes
back later, onto this shape once it has proven itself on one tradition.

**Start by copying, not by starting.** The code is the reuse; a fresh `vite`
project would re-derive two days of hard-won decisions. From this folder:

```
cp -r main orthodox          # then, inside orthodox/:
rm -rf .git node_modules dist test-results shots .tmp
git init && npm install && npm run test:all      # green: it is the same code
git add -A && git commit -m "Seeded from the cross-church archive at 031add2"
```

Keep `main/` untouched beside it. The new repo's first real commits are the
*removals* in §3 — strip, don't rebuild — and every removal should leave the
suite green or be accompanied by the test it retires.

**The first things to decide with the author, before code**, because the
codebase forks on them (§6 has the reasoning):

1. **What the glyph means in a one-communion corpus** — DESIGN.md §7's
   "one bold thing" is the mark of veneration across communions. Drop it,
   or re-aim it at the autocephalous churches' calendars? The machinery
   fits either; the semantics are the author's.
2. **Old Calendar / New Calendar** (Julian vs Revised Julian for fixed
   feasts; Pascha Julian everywhere) — a reader setting, two registry
   entries, or both? This is the withdrawn "reckoning toggle" coming back
   as the first question an Orthodox reader actually asks.
3. **What a calendar entry is.** The cross-church build's calendar entry is
   a saint with a feast. The Orthodox calendar is also Sundays of the
   Triodion and Pentecostarion, the Great Feasts of the Lord and the
   Theotokos, fasts — entries that are not saints. The hero and the
   register assume a saint behind every entry. This is the largest piece of
   genuinely new work.

## 3. What carries over — the inventory

Measured from the tree at `031add2`: 14,195 lines across `src/`, `scripts/`,
`tests/` and `e2e/`. The verdicts below are mine from building it; the author
decides the ones marked *decide*.

### Keep as is (or within a line or two)

| Piece | Lines | Notes |
|---|---|---|
| `src/styles/tokens.css`, `base.css`, `fonts.css`, `metrics.css`; `scripts/fetch-fonts.mjs`, `font-metrics.mjs` | ~870 | The whole design system. Literata with Greek polytonic and Cyrillic is exactly the face an Orthodox corpus needs (Ἀντώνιος, Мойсей already render). Gold only in the glyph, red only for liturgical time — the red-letter idiom is literally the typikon's. |
| `src/lib/router.js`, `src/main.js`, `index.html` | ~260 | App shell, history router, app-owned scroll (Amendment 22), the theme script, the header. |
| `src/lib/theme.js` | 84 | Two-way sun/moon, system read not offered (Amendment 23). |
| `src/lib/store.js`, `settings.js` | ~300 | IndexedDB saved/reading/history, localStorage settings, sync-ready records. `settings.traditions` and `settings.calendar` may be repurposed or dropped. |
| `src/ui/swap.js`, `grain.js`, `grain-drag.js` | ~340 | The one swap primitive (Amendment 20) and the track under each calendar grain. River mode and the timeline were meant to reuse them; so can anything here. |
| `src/ui/save.js`, `shelf.js` | ~170 | Bookmark and text Save, Continue-reading and Saved shelves. |
| `src/lib/markdown.js`, `detail.js`, `manifest.js`, `virtual-grid.js`, `dates.js`, `regions.js`, `uncertainty.js`, `licence.js`, `ui/datefacts.js` | ~900 | Lives, the second loading layer with its prefetch budget, the measurement-free virtualiser, date intervals, the uncertainty curve (still no shipping consumer). |
| `src/lib/jdn.js`, `src/lib/computus.js` | ~220 | **Essential for Orthodox work**: Julian↔Gregorian by Julian Day Number, and the Julian computus (Pascha). Both unit-tested. |
| `src/views/saints.js` + `index.css`, `lib/index-filters.js` | ~1,500 | The Index: virtualised cards/rows, Detailed, facets, search, sort, the bookmark, the remembered position. Facets want retuning (below), the rest stands. |
| `src/views/saint.js` + `saint.css` | ~800 | The saint page: head with bookmark and ×, intro grid, dates-and-places register, life, sources, related, reading position. |
| `src/views/calendar.js` + `calendar.css` | ~1,600 | Week strip and month grid on tracks, drag, the unfurl, peeks instead of chevrons, the hero and its slot roll, density dots, the register, shelves. The selection/gate parts are the ones to rethink (below). |
| `scripts/build-manifest.mjs`, `validate.mjs`, `new-saint.mjs`, `shot.mjs`; `make_thumbs.py`; `schema/saint.schema.json` | ~700 | The one-folder contract, the build that fails loudly, the screenshotter. The schema's `church` values come from the registry — change the registry and the validator follows. |
| `e2e/quality-floor.spec.js`, `playwright.config.js`, `.github/workflows/` | ~2,700 | The quality floor as a gate — axe, keyboard, reduced motion, 360 px, overflow — and the house method of one test per fix. Many individual tests are design-specific and retire with what they pin; the harness and ~half the tests carry. |
| `tests/*.test.mjs` | ~1,900 | Unit tests for everything above; `badge`, `matrix`, `tradition`, parts of `build` go with the decisions below. |

### Keep, with a change the decisions force

| Piece | Change |
|---|---|
| `src/data/churches.js` (the registry) | Today eight churches in four communions with `rites`. For Orthodox-only: either one entry (`eastern-orthodox`, `default_calendar: julian`, `paschal_computus: julian` — already there), or one entry per autocephalous church if the glyph is re-aimed (§6). Everything downstream — the badge's columns, the facets, the validator, the plate — is generated from this file, which is why this is the first edit and why the tests tell you what it breaks. |
| `src/lib/feasts.js`, `src/data/calendars.js` | Fixed feasts in `gregorian`/`julian` and `paschal` feasts as a signed offset from Pascha **already resolve** (`feastOccurrences`, `formatFeast` prints "N days after Pascha"). No saint in the corpus exercises the paschal path and nothing renders a movable feast, so it has unit tests and no screen. Drop the Coptic and Ethiopian month tables; keep the shape. The Revised Julian calendar is "fixed feasts on Gregorian dates, Pascha by the Julian computus" — two fields the registry already holds independently (the EO entry's note says exactly this). |
| `src/ui/strings.js` | Prune the tradition-filter, communion and rite strings; keep the rest. Every user-facing string is here and nowhere else — keep it that way. |
| `src/lib/tradition.js`, `src/ui/traditions.js`, `src/ui/plate.js`, `plate.css` | The site-wide selection, its chooser and the plate. With one church they have nothing to select. With autocephalous churches they are the local-church filter almost unchanged (the plate becomes church × calendar-style, say, instead of rite × communion). *Decide.* |
| The calendar's first-visit question, gate and "which calendar" prompt | Built for "one church's calendar at a time" out of eight. Orthodox-only has one — or two, Old and New, which is where this mechanism could go: `settings.calendar` holding a calendar *style* rather than a church. *Decide* (§6). |
| The three silences (`STRINGS.calendar.silence`) | Collapse to "the corpus has nothing" plus whatever the calendar-style decision adds. |
| Index facets (`index-filters.js`) | Church → jurisdiction or glorifying church; feast month, type, sex, region, historicity, dates stand; breadth of veneration is meaningless with one communion — drop it or redefine it as "in how many local calendars". |
| Saint page veneration register | Today one row per church with titles, feast in its own reckoning, source, refusal note, undocumented note. Orthodox-only: one row, or one per local church, or one per source (Synaxarion / Prologue / Menaion) — the row shape holds titles and sources already. |
| About | Explains the mark with real renderers; rewrite with the glyph decision. The editorial-policy prose is still a placeholder (Session 9). |

### Drop (unless the glyph is re-aimed)

`src/ui/matrix.js` (rite × communion, the decomposition invariant, 13 cells),
the coarse Eastern Catholic handling in `badge.js` and `plate.js`, the rite
columns, the communion rows, the Assyrian `paschal_computus` flag, the Coptic
and Ethiopian calendars, `tests/matrix.test.mjs`, the matrix-shaped parts of
`tests/badge.test.mjs` and `tests/tradition.test.mjs`, and about forty browser
tests that pin the plate, the selection and the communion rows. If the glyph
becomes per-local-church, `badge.js`'s `cellMark`, `rollupStates`, `badgeLabel`
and `renderBadge` carry unchanged — they are generated from the registry and
hold no colour or count of their own.

### New — what an Orthodox calendar needs that this build does not have

1. **Movable feasts rendered.** The data path exists (`calendar: "paschal"`,
   `offset`, `computus`), the computus is tested, the formatter prints it.
   Missing: a saint with a paschal feast to exercise it, and a screen — the
   Triodion and Pentecostarion Sundays, Pascha itself, Ascension, Pentecost,
   and the fixed Great Feasts, on the strip and in the day. The hero logic
   (`pickHero` prefers saints with images, deterministic per day) assumes
   the entry is a saint; a feast of the Lord is not one. Decide the entry
   shape before writing the renderer.
2. **Calendar style as a reader setting** — Old (Julian) or New (Revised
   Julian). `lib/jdn.js` and `data/calendars.js` still convert; the UI that
   offered a reckoning was withdrawn on 2026-08-21 (Amendments 16, 17, 19)
   because in a four-communion site it was noise beside the tradition
   question. In an Orthodox-only site it *is* the question. Worth reviving,
   and the "one calendar at a time" gate is the natural place.
3. **Typikon rank** (vigil / polyeleos / great doxology / six stichera /
   simple) as a field — it is what the red-letter idiom and the density dots
   are for in this tradition, and it is a real editorial datum with sources.
4. **Church Slavonic and Greek name forms** — `names[]` with `lang` exists
   and the saint page prints them; Literata covers Greek polytonic and
   Cyrillic including the `cyrillic-ext` subset. Verify Church Slavonic
   combining marks render before promising them.
5. **Sources and the sourcing discipline.** Amendment 2 stands: build the
   pipeline and the review workflow, never bulk-generate saints. The
   Orthodox sources are structured and public — synaxaria, the Prologue of
   Ohrid (already cited in this corpus), the Menaion, the OCA and GOARCH
   daily calendars — and "at least one commemoration per day" (Phase 1's bar)
   is reachable from the menologion alone, which is precisely why the smaller
   project is the better proving ground.

## 4. The corpus you are starting with

Ten saints, hand-authored, every attestation cited. Their Eastern Orthodox
standing, from the manifest:

| Slug | EO | Feast (Julian) |
|---|---|---|
| anthony-the-great | venerated | 17 January |
| athanasius-of-alexandria | venerated | 18 January |
| augustine-of-hippo | venerated | 15 June |
| christopher | venerated | 9 May |
| john-chrysostom | venerated | 13 November |
| john-the-long-suffering | venerated | 18 July |
| moses-the-hungarian | venerated | 26 July |
| paul-of-thebes | venerated | 15 January |
| dioscorus-of-alexandria | **not venerated** | — |
| nestorius | **not venerated** | — |

Eight seed the new project. Each folder carries attestations for every
church; with a one-church registry the validator will refuse the others —
strip them from the eight `saint.json` files (that is authoring, and allowed;
`data/` is generated and never hand-edited), and keep the two refused figures
in the archive only. Seven images carry `example.invalid` source URLs — the
licence is settled (Public Domain Mark 1.0), the provenance is not; the build
warns and should go on warning until real URLs are recorded.

## 5. House rules that carry, because it is the same code

Unchanged from `main/HANDOFF.md`, abbreviated; the long forms and the
reasons are there and in the Amendments.

- **Render it and look at it** (`scripts/shot.mjs`) **and measure** — one fix
  looked right in a screenshot while being 15% wrong.
- **Every fix gets a browser test, and the test gets backed out** — seen to
  fail, restored, said so. The last three rounds' backouts found two tests
  that read only half of what they claimed.
- **The quality floor is a gate.** It has caught a 360 px overflow, a 5 px
  row shift, a 2.1:1 contrast fade and a shadowed import that silently broke
  every fade. It has not yet been wrong.
- **Say when a request contradicts DESIGN.md**, record the reversal as an
  amendment, mark the superseded entry where it sits.
- **Commit, don't push.** CI is the truth, not the local run. A `.gitignore`
  bug once left `src/data/` untracked while every local test passed.
- **Never bulk-generate saint data.** Where a date is unverified the honest
  entry is `undocumented` with a note.
- **Reduced motion removes, never shortens.** A JS wait with no animation
  behind it is the same bug.
- **Two copies in the DOM for the length of an animation must say which is
  current** — `swap.js` is the one home for that.
- **Fade with a mask, not an opacity** — opacity on a colour is a new colour
  and axe reads it.
- **A proportion applied in two places multiplies; a worked value nobody
  executes is a comment.**
- Windows: PowerShell 5.1 writes a BOM; Git Bash rewrites leading-slash
  arguments (`export MSYS_NO_PATHCONV=1`); **never leave a `vite preview`
  running on :4173** (Playwright refuses a server it did not start — kill
  by PID via `netstat`); **large heredocs through the Bash tool truncate at
  about 100–120 lines** — write files with the Write tool, patch with short
  Python scripts, verify every scripted replacement matched;
  `font-display: optional` makes absolute layout assertions flaky on a cold
  load; the author's PAT lacks the `workflow` scope.

## 6. Design decisions to take again for Orthodox-only

Each of these is settled in `main/DESIGN.md` for four communions and is open
again for one. Take them with the author, record them in the new repo's
DESIGN.md, and mark the old entry as superseded rather than deleting it.

- **§2 / §7 — the one bold thing.** Gold is spent only on the veneration
  mark, and the mark encodes *which communions* venerate. With one communion
  the badge is one cell and says nothing. Either the signature element is
  re-chosen, or the cells become the autocephalous churches (commemorated /
  not in that church's calendar / undocumented — the same three states, the
  same greyscale argument, the same registry-driven rendering, and a real
  finding: saints glorified by one local church and not yet received by
  another are exactly the "attest, never adjudicate" case inside Orthodoxy).
  The second keeps 700 lines and the About page; the first frees them.
- **§5b — one calendar at a time, the first-visit question, the gate.** With
  one church these are trivially true and the prompt has nothing to ask.
  Either remove them, or make the question Old or New Calendar, which is the
  withdrawn reckoning toggle (Amendments 16–19) returning with a reason to
  exist. Note the reason it was withdrawn: beside the tradition question it
  was a second question about the same thing. Here there is no first.
- **§5 — Select Tradition** in the header: drop, or the local-church filter.
- **§5 — the Index's facets**, especially breadth of veneration.
- **The hero's text Save button** is still the one text Save on the site
  (everything else is the bookmark). Outstanding from 2026-08-22; one line.
- **Vigil mode's rubric is 4.20:1 on bole** (Amendment 21) and the browser
  suite runs in light mode only. Carry the defect and the gap; fix it when
  the palette is next opened, or add a dark-scheme project to Playwright.

## 7. A first session, concretely

1. §1 steps 1–6: push confirmed, docs into `docs/`, HANDOFF marked, tag,
   bundle and zip.
2. §2: copy to `../orthodox/`, `git init`, `npm install`, `npm run test:all`
   green, seed commit.
3. `src/data/churches.js` → the Orthodox registry the author chooses. Run
   the suites; they name everything that depended on the other seven
   churches. Strip the eight folders' non-Orthodox attestations; the build
   is green again when the validator is.
4. Take the three decisions in §2 with the author. Write them into the new
   DESIGN.md before touching `badge.js`, the calendar's gate or the hero.
5. Then the first genuinely new thing: a movable feast on the strip.

What this was all for, said once: the cross-church site is the ambition and
the Orthodox site is the proof. Keep the one-folder contract, the quality
floor and the amendments discipline exactly as they are, because they are the
part that will make the big corpus possible when it comes back.
