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
- The PAT is at `C:\Users\matei\Documents\Agios Website Ex\update git.txt`.
  `bash scripts/push.sh` pushes and reads the CI run in one step.

---

## In flight

**The corpus run (`scratchpad/corpus-plan.md` §5) is in Phase B.** Civil
20 September – 1 October is read for all four churches. **2 October is not
read** for any church; B3 starts there.

What `day-candidates.mjs 2026-10-02` prints, not yet read against the pages:
the Russian 19 September (12 lines — the afterfeast of the Cross, Trophimus,
Sabbatius and Dorymedon, Theodore of Smolensk with David and Constantine,
Alexis of Zosimova, Zosimas the hermit, Igor of Chernigov, and five new
martyrs of 1918–1939), the Serbian 19 September (3; Trophimus's company and
Zosimas), saint.gr 2 October (12) and doxologia.ro (4). Its UPGRADE block names
eight folders the corpus holds on the menologion 19 September — Trophimus,
Sabbatius, Dorymedon, Theodore of Yaroslavl with David and Constantine,
Theodore of Tarsus, Amphilochius of Patmos — so the Julian columns are mostly
upgrades, and the name "Theodore" there is not yet Theodore of Smolensk. The Serbian
list misses Prologue entries; read the page.

Open identities, each written into the folders: whether the Greek 30 September's
Two Women Martyrs are the two virgins the Romanian long life has die with
Gaiane; whether the Fifty Martyrs of Palestine are the Sretensky 151's burned;
Gregory of Pelshma, Michael of Kyiv (30 September) and Sabbas of Vishera
(1 October) are Greek one-liners the Russian 30 September and 1 October (civil
13 and 14 October) must read before anyone calls them the Russian saints; John
Koukouzelis carries a 1118–1433 death because the Greek and Romanian pages put
him centuries apart. The older open ones (Trophimus and Dorymedon, Tryphon)
stand.

The empty-range test reads `emptyRange()` from the manifest since `f476223`;
no untouched year is left between 1 and 2002, and the gate prints the range it
finds.

Helpers in `.tmp/`: `mk1001a.py` (Russian and Serbian, new folders and
upgrades), `mk1001b.py` (Russian-only after azbyka), `mk1001c.py` with
`mk1001c-text.json` (Greek and Romanian, hymns pulled off the cached pages by
label, lives and English kept in the JSON), `fetch.mjs` (cached, polite),
`lookday.mjs` (the rendered day per church and language), `daycount1001.mjs`
(the back-out's day count). Two committed batches go out one at a time by
parking the second (`git branch -f hold-x <sha>; git reset --keep <first>`),
pushing, then `git merge --ff-only hold-x`.

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
