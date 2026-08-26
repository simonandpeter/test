# Addendum: rank-first naming

Read `HANDOFF.md` and `DESIGN.md` first as usual. This addendum wins where it
disagrees with `docs/saintsbuildplan.md`. It changes one thing — how a saint's
name is printed — and it is mostly a data migration, not a rendering change.

## What changes, and why

Today every name is drawn as `St. <display_name>`, decided in
`src/lib/honorific.js` (author, 2026-08-24). On screen that gives
`St. Moses the Ethiopian`, `St. Damon`, `St. Hezekiah the Righteous`.

Neither major English-language Orthodox calendar names saints that way. OCA
prints *Venerable Moses the Ethiopian of Scete*, *Righteous Anna the
Prophetess*, *Righteous Hezekiah* — the rank is part of the name, not a
category beside it. GOARCH carries it too, appended (*Autonomos the Martyr*).
"St." and stop is a third convention, and it is the one that reads Western.

So: **print the rank where there is one, and "St." only where there is not.**
The rank is already in `types` on every record. Over the corpus that resolves
to roughly:

| prefix | count |
|---|---|
| Martyr | 253 |
| Hieromartyr | 156 |
| Venerable | 121 |
| **St.** | **67** |
| Venerable Martyr | 37 |
| Righteous | 26 |
| collectives (unchanged) | 22 |
| Confessor, Virgin Martyr, Apostle, New Martyr, Great Martyr, Blessed, Prophet, Prophetess, Passion-bearer | 32 |

"St." becoming the marked case — hierarchs, bishops, theologians — is correct
and matches OCA (*Saint Savva of Pskov*, *Saint John Chrysostom*).

## The order is not negotiable

**Data first, naming second.** Doing it the other way round produces
`Hieromartyr Alexander (Lyubimov), Presbyter, Hieromartyr (1918)` on a third of
the corpus, because `display_name` currently holds name + office + rank + year
in one string. **239 of the 720 non-collective names already contain the rank
word.** That is why "St." works today: it is the one prefix that cannot
collide with what is already in the name.

---

## Step 1 — split `display_name` (the real work)

`display_name` becomes the **bare name**. Everything else moves out.

- **Office** → a new `office` field on `saint.json`: `"Presbyter"`,
  `"Bishop of Sardis"`, `"Metropolitan of Moschonisia"`, `"Archpriest"`,
  `"Hierodeacon of Zilantov"`. Schema addition, optional string.
- **Rank word** → deleted from the name. It is already in `types`; that is
  where it will be read from.
- **Trailing year** → deleted from the name. **Verified: all 179 names ending
  in a bracketed year already carry that year in `dates.death`, with zero
  mismatches.** No new field, no information lost. Confirm this yourself before
  deleting anything.

Shape of the migration: of the 239 colliding names, **238** have the rank in a
trailing comma-segment or a `the <Rank>` tail, so a script lifts it out.
**Exactly one needs a human eye: `Kosmas the Hermit and Confessor`** — the rank
is load-bearing inside the name there.

Watch for parentheticals that are not years and must be kept or rehomed
deliberately, e.g. `Cyril, Nikon and Macarius (Serbian calendar, 30 August)`
and `Nicholas the Presbyter, Hieromartyr (1937, 4 September, ...)`. Decide what
those become; do not let the year-stripper eat them.

**`life.md` moves in lockstep.** A unit test pins each `life.md`'s `# heading`
to its `display_name`, and all of them currently match exactly. Every folder
whose `display_name` changes needs its heading changed in the same commit or
`npm test` goes red across hundreds of files at once.

Write the migration as a script, run it, then **read the full diff of the
resulting names before committing** — 250 folders is too many to spot-check.

## Step 2 — tag the nine untagged monastics

Nine records carry `monk` / `hermit` / `ascetic` / `monastic` but not
`venerable`, so they would fall through to "St.":

    Anthony the Great · Paul of Thebes · John the Long-Suffering
    Moses the Hungarian · Joachim of Osogovo · Raphael of Banat
    Seridos of Gaza · Roman the Venerable · Irene the Empress, the nun Xenia

Three of those are among the seven saints who actually have icons, so the
mistake would be visible immediately. OCA prints *Venerable Anthony the Great*.

Either add `venerable` to those records, or have the resolver treat the
monastic types as implying it. Prefer the resolver — it also covers monastics
added later whose author forgets the tag.

## Step 3 — the naming function

Only now touch `honorific.js`. It becomes a precedence walk over `types`,
falling back to `St.`:

    Virgin Martyr        (martyr + virgin)
    Great Martyr
    Passion-bearer
    Equal-to-the-Apostles
    Apostle
    Prophet / Prophetess
    Hieromartyr
    Venerable Martyr
    New Martyr
    Martyr
    Venerable            (also: any monastic type, per Step 2)
    Confessor
    Blessed              (fool-for-christ)
    Righteous
    St.                  (everything else: hierarch, bishop, theologian, …)

The precedence order is an editorial choice, not a lookup — record the
reasoning in the file's header comment the way the current one does, and put
the list somewhere a non-coder can read it.

Two things that must not change:

- **The collective test stays.** `/^The\s/` catches all 22 collectives in the
  corpus with no misses — checked. `The Thirty-three Martyrs of Heraclea` takes
  no prefix.
- **Add a feast opt-out now, before the Great Feasts work starts.** When a
  feast becomes a folder, the current function will emit
  `St. Dormition of the Theotokos`, and `St. Mary` if the Theotokos ever gets an
  entry of her own. An explicit kind or flag that opts out, sitting beside the
  collective test.

## Step 4 — where each part is drawn

- **Name line:** rank + name. `Hieromartyr Gorazd`
- **Subtext line:** office, then dates. `Bishop of Bohemia and Moravia-Silesia · reposed 1942`

Rank in the name; office in the subtext — not the other way round. The rank is
short and it is how the saint is named; the office is long and it is a fact
about them. The long half belongs on the line that can truncate without losing
the identity.

This makes displayed names **shorter**, not longer, which is the opposite of
what it sounds like. Measured over all 742: median rendered length 32 → 29,
names over 32 characters 49% → 32%, longest 74 → 65. The cards that truncate
mid-word today are exactly the ones that collapse:

    St. Gorazd, Bishop of Bohemia and Moravia-Silesia, Hieromartyr (1942)
      → Hieromartyr Gorazd

    St. Alexander (Lyubimov), Presbyter, Hieromartyr (1918)
      → Hieromartyr Alexander (Lyubimov)

(Those figures come from a rough strip run to estimate the shape. Treat them as
the reason to proceed, not as a spec.)

Three surfaces need the office added to their subtext, which today shows dates
alone: the Index card (`index-dates`, `views/saints.js`), the Daily's *Also
commemorated* register rows, and the Daily hero. The saint page's facts line
already prints types and should now print `office` instead of the raw type
slugs where an office exists.

## Step 5 — the other four languages

English first. `sex` is populated on all 742 records (633 male, 89 female, 20
unknown, and the unknowns are essentially the collectives that take no prefix
at all), so the gendered forms are a table rather than a grammar — but it is
roughly 17 labels × gender × 4 locales, where `St.` was one abbreviation.

Ship English, add the keys to all five packs per the house rule, and let
`node scripts/locale-coverage.mjs` report the gaps rather than guessing at
Greek and Romanian rank vocabulary. A locale falling back to English on a rank
label is a known gap, not a bug — but say so in the coverage report.

## Verification

Normal house rules, and they matter more than usual here because the blast
radius is 250 folders:

1. `npm run validate` and `npm run build:manifest` clean, no new warnings.
2. `npm test` — the `life.md` heading test is the canary; if it is green, the
   lockstep held.
3. A browser test for the new naming, **backed out and confirmed to fail**
   before being restored.
4. Render and look: the Index at desktop and 360 px, the Daily register on a
   day with several commemorations (28 August on the Greek calendar gives six),
   and a saint page. Check truncation on the longest survivors —
   `Venerable Martyr Theodosius (Alexandrov), Hierodeacon of Zilantov` is the
   worst case at 65 characters.
5. Spot-check against OCA for 28 August: the corpus and their list share Moses
   the Ethiopian, Anna the Prophetess and Hezekiah. All three should now read
   the way OCA prints them.

## What not to do

- Do not put the rank in the subtext and leave `St.` on the name. That fixes
  the missing information and none of the naming, and it leaves the office and
  year sitting in `display_name` where they will keep causing this.
- Do not hand-edit `data/manifest.json`.
- Do not start at Step 3.
