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
20–30 September is read for all four churches. **1 October is half read:** the
Russian and Serbian columns (Julian 18 September) are done in two batches; the
**Greek and Romanian 1 October are not**, and B3 starts there, then 2 October.

**`main` is red on Lighthouse FCP alone, at `635553a`** (the Greek and Romanian
30 September): calendar populated 1504 ms (1357/1674/1504/1683/1355) and all
saints 1523 ms (1692/1445/1692/1519/1523) against a 1500 ms floor, a11y 100,
entry stylesheet unchanged; e2e 1044 passed, 6 known flakes. A re-run is the
author's call. **Three commits sit unpushed on top of it** — the two Russian 1
October batches and this handoff — and go out only once `main` is green: one
push each, by resetting `main` back and fast-forwarding a commit at a time.

What the Greek and Romanian 1 October hold, from `day-candidates.mjs` and not
yet read against the pages: saint.gr — Ananias the Apostle, Romanos the
Melodist, John Koukouzelis, Michael of Zobe and thirty-six venerable martyrs,
Domninus, Gregory the Domestikos, Sabbas of Vishera, with the Protection, the
Gorgoepikoos and Eleftherotria synaxes and two sidebar entries (Paisios,
Nicodemus) that are not the day's. doxologia.ro — Cyriacus and Joseph of
Bisericani, Romanos, John Koukouzelis, Ananias, Mirian and Nana, Sidonia of
Georgia, the Lord's Robe, and five icons. Grep for Romanos, Ananias and
Koukouzelis before drafting: a Julian 1 October has not been read, but another
day may hold them.

Open identities, each written into the folders: whether the Greek 30 September's
Two Women Martyrs are the two virgins the Romanian long life has die with
Gaiane; whether the Fifty Martyrs of Palestine are the Sretensky 151's burned
(they carry no Russian row); Gregory of Pelshma and Michael of Kyiv are Greek
one-liners that the Russian 30 September (civil 13 October) must read before
anyone calls them the Russian saints; the older open ones (Trophimus and
Dorymedon, Tryphon) stand.

Helpers in `.tmp/`: `mk30a.py` + `mk30a_up.py` and `mk1001a.py` (new folders and
upgrades in one) are a Russian and Serbian day; `mk1001b.py` a Russian-only
batch after azbyka; `mk30b.py` a Greek and Romanian day with Orloff commons and
doxologia hymns. A batch parked on a branch (`git branch -f hold-x HEAD; git
reset --keep <prev>`) lets two committed batches push one at a time, since
`push.sh` pushes HEAD. A life that names a church "of John the Theologian" or a
namesake "Mardonius of Nicomedia" links that saint; `cross-link-audit.mjs`
diffed against the last batch shows it.

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
