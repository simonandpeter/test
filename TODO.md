# Overnight queue

Work the author has queued but not watched. Each item says what it is, what it
costs, and what has already been checked — so whoever picks it up does not
re-measure what is written here.

Standing rule for everything below: **nothing is pushed** until the author says
we are finalising. Commit locally.

## 1. One church, more than one day

**The ask (2 October 2026):** "whats so hard about having the same saint profile
commemorated on 2 days".

The corpus holds *one feast to a church*, without exception — no folder among
the 5,232 carries two attestations for the same church. That rule is why one
saint kept twice in one calendar becomes two folders, each with its own life,
instead of one record saying "the Greek calendar keeps her on both days".

Two known cases, both already flagged in their own folders:

- `charitina-the-martyr-4-september` / `charitina-the-martyr-5-october` — the
  Greek synaxarion gives both the same verse and its 4 September entry asks
  whether the two are one. The September entry is a name and a guess; October
  is a full martyrdom in two calendars with an apolytikion and two kontakia.
- `matthew-the-apostle` — doxologia.ro keeps him on 30 iunie with the Synaxis of
  the Twelve *and* alone on 16 noiembrie with a life and a proper troparion. His
  note says the corpus can hold only one and leaves the question open. 16
  November is one of the blank Romanian days because of it.

**What was measured on 2 October, before anyone writes code:**

- `lib/feasts.js` `buildFeastIndex` already loops attestations and pushes one
  entry per feast. A second feast for the same church needs **no change there**.
- `schema/saint.schema.json` has no uniqueness constraint on `church`. The
  schema permits it today.
- The places that assume one attestation per church are few and named:
  - `views/saint.js:1027` — `new Map(attestations.map(a => [a.church, a]))`.
    **Last one wins**, so the veneration table would silently print one of the
    two days. This is the real break.
  - `views/daily/panel.js:1176` — `.find(a => a.church === churchId)` for the
    church's titles. First wins; harmless for titles, wrong in principle.
  - `lib/index-filters.js:98` — maps attestations to a church list; would
    produce duplicates that want deduping.
  - `views/index/search.js:67` — same shape, same question.

So the cost is a handful of readers, not a migration. What it is *not* is free:
each of the two cases above is a judgement about whether two commemorations are
one person, and that judgement belongs to the sources, not to the code. The
code change only makes it possible to record what a calendar actually prints.

**Do:** make the readers above handle more than one attestation per church, with
tests; then record Matthew's 16 November feast and give 16 November its saint.
Leave Charitina as two folders — the calendars keep two entries and so should we
— but link them (see item 2).

## 2. Lives that cross-reference in prose with no link

`charitina-the-martyr-4-september`'s life says "or she may be the Charitina of 5
October" and nothing in either record points at the other: neither folder has a
`related` entry. The reader has to search the name and hope.

**Do:** link the two both ways, then sweep the corpus for other same-name pairs
whose lives already name each other in prose without a `related` link.

## 3. The 44 lonely date-tags

358 display names carry a parenthesised day. For 115 of them a namesake in the
corpus carries one too, which is what the convention is for. **44 carry a day
with no namesake anywhere in the corpus by any spelling** — Abdas (8 July),
Aristonicus (19 April), Basilla (24 December), Felicity (8 March) and 40 more.
(The count already allows for namesakes distinguished another way, so "Adrian
(17 April)" is not counted while "Adrian of Nicomedia" exists.)

They are not necessarily wrong: a sourcer reading a calendar that listed three
Theodores may have tagged defensively, and the twin may be a saint not yet
added.

**Do:** check each of the 44 against its source calendar. Drop the day where the
name is genuinely unique in that calendar; keep it, with a note saying why,
where a namesake is real but unrecorded.

## 4. The ten icons Commons refused

Ten of the twenty rate-limited icons landed on 2 October; ten did not, because
two agents were pulling from Commons at once and the 429s came back through the
whole backoff ladder.

Still missing: `mary-of-egypt`, `nicholas-of-lesvos`, `nikon-of-sicily`,
`simeon-of-persia`, `sophronius-of-jerusalem`, `martin-pope-of-rome`,
`paul-of-ptolemais`, `theodore-of-sykeon`, `theophanes-of-sigriane`,
`zacharias-the-faster`.

**Do:** `PYTHONIOENCODING=utf-8 python scratchpad/geticon.py
.tmp/icon-drafts/ro-C.json --write` then `ro-D.json`, **one at a time, nothing
else touching Commons**, then `npm run thumbs && npm run build:manifest`.

## 5. The image programme, then the Russians

Romanian and Greek still lead with an imageless hero on most days; the Russian
reading wave (`days.pravoslavie.ru`, julian) has not started. Counts are in
HANDOFF.md and go stale — re-measure, do not quote them.

## 6. One search bar, with Advanced as an option, on both pages

**The ask (2 October 2026):** rebuild the search bar on All Saints and Prayer so
both carry an **Advanced** option, and the advanced panel is the same thing on
both pages. In-flight work already covers part of this (the Prayer page gaining
the facet chips and the shell); this item is the finish.

- Advanced is an *option*, not the default: the field alone is what a reader
  meets, and Advanced opens the facets. Same control, same wording, same place
  on both pages.
- The advanced panel itself must be one implementation. `facetGroups` is already
  shared; `wireControls` is being lifted off the All Saints state singleton.
- **Prayer keeps no Sort chip and no Detailed box** — its order is the book, and
  it has no grid to detail.

## 7. Prayer on a phone: no display-type selector

Remove the square/burger display-type selector from the Prayer page **on
mobile**. The saints beside a hymn draw the **All Saints row card** —
`card(item, router, { rows: true })` — at every width, so there is nothing for
the selector to switch between.

The obstacle is named in `views/prayer/asides.js`: an aside row is a *door* with
three cases (a button that opens the saint in place where the hymnal holds them,
a link to their own page past 1024 px where it does not, a disabled button below
that width). The shared row card has to take its door from the caller. Keep the
three cases and the `is-dim` mark: they are the ruling from
`docs/mockup-review/BRIEF.md` stage I and the author's instruction of
2026-09-17, after 84 of 116 names in those columns did nothing when pressed.

## 8. Related: the links between saints

**The ask:** the Related section under a profile — which the Prayer page also
draws — has to exist for the saints added in the recent waves, not only the
early ones.

**Measure first, then work.** How many folders carry a `related` array at all,
and how that splits between the early corpus and the Greek and Romanian waves.
Report the number before writing any.

A link is a claim: companions martyred together, a teacher and a disciple, a
translator of relics, two commemorations that may be one person (item 2). It
comes out of the saint's own life or the calendar's own line, never out of a
shared name or a shared day. A wrong link is worse than a missing one — the
corpus's known failure mode is the wrong-saint match (`b6dc41ab`).

Every link is two-way, or the reader meets a one-sided relation.

## 9. The Russians, for the full year, with their images

The Russian calendar covers **63 of 366 days** today, against 364 for the Greek
and 357 for the Romanian. Read `days.pravoslavie.ru` (Julian date in the path)
for the whole year, folder by folder, to the same standard as the Greek and
Romanian waves: the name in the calendar's own words, a life, the attestation
with its citation, hymns where the page prints them.

Then their icons, by `scratchpad/geticon.py`'s rules — the licence comes from
Commons' own `imageinfo` and a file Commons does not state as public domain or
a CC licence is refused, never warned about. One fetcher at a time: parallel
sourcers draw 429s through the whole backoff ladder.

## 10. Then the Serbians

**44 of 366 days.** The Ohrid Prologue at pravoslavno.rs, Julian, same standard,
then their icons. Only after item 9 is finished.

## 11. Cadence: push and read CI about every 8 hours

**The ask (2 October 2026):** aim to push and check CI roughly every 8 hours
rather than holding everything to the end.

This **replaces** the earlier "nothing is pushed until the author says we are
finalising" for overnight work: a run of eight hours is the unit, and the end of
one is a push. Within a run, commit locally as before.

- `bash scripts/push.sh` is the one step: it refuses a dirty tree, pushes,
  confirms the ref landed and prints the conclusion **and** the `flaky` line.
  Then `scratchpad/ci-flaky.py <sha>` for the test names under that line — a
  green run with `N flaky` holds a test that failed and passed on retry.
- A red CI is the run's next job, ahead of whatever was queued. Before calling
  anything a flake, measure its rate: the carousel flake was real at 1-in-6 and
  then masked a 16-of-16 regression.
- Never push a tree whose unit tests are failing. e2e that could not be *run*
  is a different thing from e2e that failed — say which in the commit or the
  handoff, never blur them.

## 12. Two suites nobody has run

`e2e/index-grid.spec.js` and `e2e/prayer.spec.js` were both rewritten on 2 October
and **neither has been run in a browser**: port 4173 was held by the preview the
author was reading, and `reuseExistingServer` is false. `npx vite build` is clean,
so imports and syntax are sound; nothing about the rendered page is verified.

`index-grid` is the check that All Saints did not move when `wireControls` was
lifted off its state singleton. `prayer.spec.js` is the one that changed most.

**Do this before any push**: stop the preview, run both, repair what they catch.
Say which failed and which could not be *run* — never blur the two.

Also waiting, and small: five dead `STRINGS.prayer` keys (`searchLabel`,
`searchPlaceholder`, `views`, `viewPlate`, `viewRows`) are still in `strings.js`
and the four packs, left because another agent was editing all five files.
`locale-coverage.mjs` must read 0 fallbacks after they go.
