# The source-corruption flags, answered — 2026-09-12

Every flag raised by the rendering passes was a question about the **source
text**, and every hymn object carries `source.url`, so every one of them was
answerable by fetching the page it was scraped from and reading it.

**All twenty were checked against their source pages. Every one came back
"source confirms": not a single scrape corruption among them.** The oddities
are in the published sources themselves — saint.gr, doxologia.ro and
days.pravoslavie.ru each carry the corrupt reading the renderers had to guess
at. No `text` field was changed, and no `english` field was changed on account
of a flag.

That is a fact about the scraper as much as about the flags: on this sample of
twenty suspicious readings, it copied its sources exactly.

**How they were checked.** `python urllib` with a browser User-Agent reads
`doxologia.ro`, `saint.gr`, `days.pravoslavie.ru` and `pravoslavno.rs` without
trouble — the 403 noted in `CLAUDE.md` is `azbyka.ru` only, and no flagged hymn
is sourced there. Fetched on 2026-09-12; the scripts are in the session
scratchpad, not the repo.

| # | flag | source page | verdict |
| --- | --- | --- | --- |
| 1 | `kosmas-of-aetolia` · troparion · ro — «lumânarea» for *luminarea* | doxologia.ro/troparul-sfantului-sfintit-cosma-etolul | **source confirms** — the page reads "ai primit lumânarea Duhului". The corpus is faithful; "candle of the Spirit" stands. |
| 2 | `lawrence-of-kaluga` · kontakion · cu — «инее» is not a word | days.pravoslavie.ru/Days/20260810.html | **source confirms** — "инее убо от Христа дар чудес приимшему" is what the page prints. |
| 3 | `mamas-of-caesarea` · troparion · cu — «имели» for «имеяй» | days.pravoslavie.ru/Days/20260902.html | **source confirms** — "имели бо крепость Твою". The same site's Lawrence-of-Rome troparion on 20260810 prints the correct «имеяй бо крепость Твою», which is what the reading was based on. *(This hymn now carries Orloff instead of a site rendering — see below.)* |
| 4 | `macarius-the-protopsaltes` · troparion · ro — «tălmăciundu-le» | doxologia.ro/troparul-sfantului-cuvios-macarie-protopsaltul | **source confirms** — the typo is doxologia's. |
| 5 | `john-v-patriarch-of-constantinople` · kontakion · cu — plural, names all three patriarchs | days.pravoslavie.ru/Days/20260830.html | **source confirms, and answers the open question**: the page heads it «Кондак святителей Александра, Иоанна и Павла», a hymn of the three together. The corpus already files it under all three (`alexander-patriarch-of-constantinople`, `john-v-…`, `paul-the-new-…`). Nothing to fix. |
| 6 | `phoebe-the-deaconess` · troparion **and** kontakion · el — «ενδιαφέροντα» standing where a particle belongs | saint.gr/932 | **source confirms** — saint.gr prints «ενδιαφέροντα» in both hymns. It is the site's own corruption, not the scrape's. (The word is also a nav-menu label on every saint.gr page — «Ενδιαφέροντα κείμενα» — which is a plausible origin, but the hymn text on the page carries it, so nothing here is ours.) |
| 7 | `samuel-the-prophet` · troparion · 5 · cu — «сподобися» where the sense wants «сподобился еси» | days.pravoslavie.ru/Days/20260820.html | **source confirms.** |
| 8 | `three-virgins` (Menodora, Metrodora, Nymphodora) · both hymns · el — OCR-corrupt throughout: «τᾶς» for «τὰς», «συνδεδεμένος» for «-μένας», «ὅθεν προϊστάντι ἡμῶν» | saint.gr/2369 | **source confirms** — every one of those readings is on the page, character for character. |
| 9 | `mamas-of-caesarea` · troparion · 1 · el — «Μόρφου τὴ πάλει» for «τῇ πόλει» | saint.gr/927 | **source confirms.** |
| 10 | `nicetas-the-goth` · troparion · ro — the third member of the Glory doxology is not the standard one | doxologia.ro/troparul-sfantului-mare-mucenic-nichita-romanul | **source confirms** — "Slavă Celui Ce a mărit pururea cinstită pomenirea ta" is the page's own wording. |
| 11 | `mitrophan-of-voronezh` · troparion · cu — closes asking peace for "our land and thy city", not «спаси души наша» | days.pravoslavie.ru/Days/20260904.html | **source confirms** — "стране нашей и граду твоему в мире спастися". This is Mitrophan's proper troparion, not the Ch. X hierarch common it opens like. |
| 12 | `titus-the-apostle` · troparion · ro — the *common of apostles* in the plural, never naming Titus | doxologia.ro/troparul-sfantului-apostol-tit | **source confirms** — doxologia publishes exactly that fragment under the heading "Troparul Sfântului Apostol Tit". The corpus copied it correctly; the oddity is doxologia's editorial choice. **Now cited to Orloff** (below), which is what the text actually is. |
| 13 | `severian-of-sebaste` · troparion · el — `τᾶς` for `τὰς`, `παριδῶν` for `παριδὼν` | saint.gr/993 | **source confirms**, both readings. |
| 14 | `symeon-the-stylite` · troparion · el — `ἔλειπες` (itacism for `ἔλιπες`) | saint.gr/895 | **source confirms** — the reading "thou didst leave behind" stands as the only one that construes. |
| 15 | `symeon-of-thessalonica` · troparion · el — the non-standard closing formula «δόξα τῷ σὲ δοξάσαντι Χριστῷ … χορηγοῦντι … χάριν ἡμῖν καὶ ἔλεος» | saint.gr/2440 | **source confirms** — following it literally was right. |
| 16 | `theoctistus-of-palestine` · kontakion · ro — a stray second «și» and a feminine clitic `-o` | doxologia.ro/condacul-sfantului-cuvios-teoctist-din-palestina | **source confirms**, word for word. |
| 17 | `theodore-of-ostrog` · troparion · cu — «красен» read as archaic "comely", not "red" | days.pravoslavie.ru/Days/20260811.html | **source confirms** the word; the reading is the translator's and is unchanged. |
| 18 | `thaddeus-apostle-of-the-seventy` · troparion · cu — «страстей пременен» read from the Edessa narrative | days.pravoslavie.ru/Days/20260821.html | **source confirms** the word; reading unchanged. |
| 19 | `kosmas-of-aetolia`, the corpus-internal check — «lumânarea» found nowhere else in the corpus | — | superseded by row 1: the source page settles it. |
| 20 | `alexander-nevsky` · troparion · sr — the Archangel Michael's troparion, held out as wrong-saint | pravoslavno.rs/index.php?tropar=0912 | **source confirms the misfiling is upstream**: the page itself heads this text «Пренос моштију светог Александра Невског». Not a scrape error. See `scripts/hymn-wrong-saint.json`. |

## What changed in the corpus

Nothing on account of a flag. Two other changes were made in the same sitting:

- **Four wrong-saint hymn objects deleted** — the Beheading of the Forerunner's
  Romanian troparion and kontakion, filed under both
  `alexander-patriarch-of-constantinople` and
  `paul-the-new-patriarch-of-constantinople`. Both texts are present under
  `john-the-baptist` (differing only in punctuation and in
  *repejunele*/*repejunile*, two doxologia pages of one hymn), so nothing was
  lost. `scripts/hymn-wrong-saint.json` now holds one entry, not five.
- **The fifth held object was kept**: the Archangel Michael's troparion under
  `alexander-nevsky` (row 20). The Archangel has no folder in the corpus and
  the text appears nowhere else in it, so deleting it would destroy the only
  copy. It stays held, with no English, and the hold file records why.

## Orloff and Hapgood

Both books were read in full and matched against the 391 hymn objects carrying
a rendering made here.

- **Orloff, *The General Menaion* (1899)** — the PDF the corpus already cites
  (`ponomar.net/data/orloff_general_menaion.pdf`, 237 pages) extracts cleanly
  with `pypdf`, and its 27 chapters were indexed by their troparia. It contains
  **only the commons**, so only a hymn that *is* a common can match, and the
  earlier sittings had already found nearly all of them: 35 objects were
  cited before this pass.
- **Two more were found and replaced**, both cases where one language of a
  saint's own hymn carried Orloff and another carried a site rendering, so the
  page was printing one hymn as two:
  - `mamas-of-caesarea` troparion · cu → Chapter XIV, the general service to
    one martyr (its Greek and Romanian twins were already cited).
  - `titus-the-apostle` troparion · ro → Chapter IX, the service common to two
    or many apostles (its Slavonic twin was already cited).
- **Checked and rejected**, each because the corpus text only *opens* like the
  common and then diverges: `mitrophan-of-voronezh` and `joasaph-of-belgorod`
  against Chapter X (one hierarch); `pitirim-of-perm` against Chapter XXV
  (hiero-confessor); `gleb-prince-and-passion-bearer` against Chapter XIV.
- **Checked and absent from Orloff**: the eight «Мученицы Твои, Господи» /
  "Thy martyrs, O Lord" objects — Orloff's Chapter XV troparion for two or many
  martyrs is a *different* hymn ("Through the sufferings of Thy saints…"). Also
  absent: «Слез твоих теченьми» and «Пустынный житель и в телеси Ангел», the
  two venerables' troparia the corpus uses most; neither is in the 1862
  Slavonic General Menaion this translates.
- **Hapgood, *Service Book* (1906)** — the archive.org scan
  (`servicebookofhol00orth_0`) has a clean OCR text. It carries the fixed
  services and the **great feasts only**; there is no menaion of troparia in
  it. The only great-feast hymn anywhere in the corpus is the Nativity of the
  Theotokos under `anna-the-righteous` and `joachim-the-righteous`, and both
  already cite Hapgood p. 164. **Nothing further to take from it.** In
  particular «Τῶν δικαίων Θεοπατόρων σου Κύριε», the 9 September apolytikion of
  the Ancestors under those same two saints, is not in Hapgood and stays a
  site rendering.

So: 37 cited before, 39 after. The remaining 389 renderings have no published
English in either book, and saying so is now a checked statement rather than an
assumption.
