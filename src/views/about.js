import { CHURCHES } from '../data/churches.js';
import { churchName } from '../lib/church.js';
import { loadManifestMeta } from '../lib/manifest.js';
import { formatDate, languageTag } from '../lib/i18n.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { STRINGS, fill } from '../ui/strings.js';

export const title = () => STRINGS.about.title;

const P = STRINGS.about.privacy;

/*
 * Contact goes to the repository's issue tracker (author, 2026-08-25), which
 * is the "built-in affordance" that keeps a reader's message in the project
 * rather than in anyone's inbox: no address is printed, no form is posted
 * anywhere, and a static site needs no server to receive it. The label is
 * prefilled so an issue arrives already sorted.
 */
const ISSUES = 'https://github.com/simonandpeter/test/issues/new?labels=contact';

const C = STRINGS.contact;

const list = (items) => `<ul class="plain-list">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;

/** "Russian and Serbian" in the reader's own language. */
const names = (churches) =>
  new Intl.ListFormat(languageTag(), { style: 'long', type: 'conjunction' }).format(
    churches.map((c) => churchName(c.id)),
  );

const enabled = () => CHURCHES.filter((c) => c.enabled !== false);

/**
 * The editorial page. Until 2026-08-22 it also explained the veneration mark,
 * with every circle drawn by the glyph's own component; the mark is removed
 * from this project (STRUCTURE.md) and the section went with it.
 *
 * **The policy is written as substance now** (brief §8.4, 2026-08-29). It is
 * "the project's defence against the objection that it takes sides", so every
 * sentence on it was checked against the thing that would make it false — the
 * three states against the schema, the calendars against the church registry,
 * the counts against `manifest.meta.json`.
 *
 * **Nothing here states a number**, which includes how many churches there
 * are: the registry is asked for that too, so enabling a fifth cannot leave a
 * sentence saying four. The coverage and licence figures are read at render
 * time from `manifest.meta.json`, which is where `loadManifestMeta()` finally
 * gets its caller — a statistic typed into a sentence is stale the next time a
 * folder is added, and this page is the one place where a stale number would
 * read as a claim rather than as a bug.
 *
 * **It is also the app's privacy policy and its content-rights answer**
 * (2026-10-03, for the store listings — `docs/APP.md` points both consoles at
 * this page). Three things follow: the privacy section answers for the app by
 * name and not only for the website, the pictures say where they come from
 * and under what licence, and a sentence about a page this build does not
 * ship is not printed — the app carries Daily, Saints, Prayer and About, so
 * `router.has` decides the Texts and map paragraphs rather than a reader
 * meeting a link to nothing.
 *
 * **Export and import are gone** (author, 2026-10-03: "Is it legally
 * required? If not, get rid of it"). It is not: a portability right is a
 * right against whoever holds your data, and nothing here is held by anyone
 * - it is in the reader's own browser, where clearing the site's data is the
 * whole of the control. `store.exportData` and `importData` stay in
 * `lib/store.js`, tested and uncalled, because the next caller for them is a
 * settings page rather than a policy.
 */
export function render(el, { router } = {}) {
  const A = STRINGS.about;
  // Without a router — a test mounting the view bare — the website's own set
  // is the honest assumption: it is the build this file ships in.
  const has = (path) => (router ? router.has(path) : true);

  const old = enabled().filter((c) => c.default_calendar === 'julian');
  const revised = enabled().filter((c) => c.default_calendar !== 'julian');

  /*
   * **One box around the page** (author, 2026-09-02: "Make the formatting of
   * the text on the About Page a bit more aesthetic"). It carries the measure
   * and the rhythm — about.css — where the page was a run of bare sections
   * against the window's left edge, which at 1440 px was a column of prose
   * with two thirds of the screen empty beside it.
   */
  el.innerHTML = `
    <div class="about">
    <h1>${esc(A.title)}</h1>
    <p class="about-lede">${esc(STRINGS.site.tagline)}</p>

    <section aria-labelledby="policy">
      <h2 id="policy">${esc(A.policy.heading)}</h2>
      <p>${esc(A.policy.attest)}</p>
      <p>${esc(A.policy.affiliation)}</p>

      <h3>${esc(A.policy.statesHeading)}</h3>
      <p>${emphasise(A.policy.states)}</p>

      <h3>${esc(A.policy.datesHeading)}</h3>
      <p>${esc(A.policy.dates)}</p>
    </section>

    <section aria-labelledby="calendars">
      <h2 id="calendars">${esc(A.calendars.heading)}</h2>
      <p>${esc(A.calendars.lede)}</p>
      <!--
        Read from the registry rather than restated here: default_calendar is
        the field the rest of the site converts feasts by, so a church whose
        reckoning changed would change this paragraph with it. A second copy in
        prose is a second thing to keep true.
      -->
      ${list(
        [
          old.length ? fill(esc(A.calendars.old), { churches: `<strong>${esc(names(old))}</strong>` }) : '',
          revised.length ? fill(esc(A.calendars.new), { churches: `<strong>${esc(names(revised))}</strong>` }) : '',
        ].filter(Boolean),
      )}
    </section>

    <section aria-labelledby="sourcing">
      <h2 id="sourcing">${esc(A.sourcing.heading)}</h2>
      <p>${esc(A.sourcing.lede)}</p>
      <div data-sources></div>
      <p>${esc(A.sourcing.lives)}</p>
      ${has('/map') ? `<p>${esc(A.sourcing.map)}</p>` : ''}
      ${
        has('/texts')
          ? `<p>${fill(esc(A.sourcing.texts), {
              link: `<a href="${router ? router.href('/texts') : `${import.meta.env.BASE_URL}texts`}">${esc(STRINGS.texts.title)}</a>`,
            })}</p>`
          : ''
      }
    </section>

    <section aria-labelledby="pictures">
      <h2 id="pictures">${esc(A.pictures.heading)}</h2>
      <p>${esc(A.pictures.lede)}</p>
      <p data-licences class="utility"></p>
      <p>${esc(A.pictures.unsettled)}</p>
    </section>

    <section aria-labelledby="coverage">
      <h2 id="coverage">${esc(A.coverage.heading)}</h2>
      <p>${esc(A.coverage.lede)}</p>
      <div data-coverage></div>
      <p>${esc(A.coverage.positiveOnly)}</p>
    </section>

    <section class="privacy" aria-labelledby="privacy">
      <h2 id="privacy">${esc(P.heading)}</h2>
      <p>${esc(P.lede)}</p>

      <h3>${esc(P.keepsHeading)}</h3>
      ${list(P.keeps.map(esc))}

      <h3>${esc(P.notHeading)}</h3>
      <p>${esc(P.not)}</p>

      <p>${esc(P.clearing)}</p>
      <p class="utility">${esc(P.hosting)}</p>
    </section>


    <section class="contact" aria-labelledby="contact">
      <h2 id="contact">${esc(C.heading)}</h2>
      <p>${esc(C.lede)}</p>
      <p><a href="${ISSUES}" rel="noopener noreferrer">${esc(C.open)}</a></p>
      <p class="utility">${esc(C.note)}</p>
    </section>

    <p class="built-with">${esc(A.builtWith)}</p>
    </div>
  `;

  fillCounted(el);
}

/**
 * `*word*` to emphasis, and nothing else.
 *
 * The three states read as a list of terms and want marking as such, but this
 * is one paragraph in five packs — reaching for `renderMarkdown` would put a
 * block parser behind a phrase, and putting `<em>` in the packs would put
 * markup in a translator's way. The string is escaped first, so the only tags
 * that can reach the page are the ones this line makes.
 */
const emphasise = (text) => esc(text).replace(/\*([^*]+)\*/g, '<em>$1</em>');

/**
 * The numbers, read rather than written.
 *
 * Failure is quiet and says so: the file is off the boot path on purpose
 * (`loadManifestMeta`), so the page is already complete and readable without
 * it. An error note where a table would be is the honest thing — a page that
 * silently omits its coverage section is a page that looks like it has none.
 */
async function fillCounted(el) {
  const A = STRINGS.about;
  const coverage = el.querySelector('[data-coverage]');
  const sources = el.querySelector('[data-sources]');
  const licences = el.querySelector('[data-licences]');
  let meta;
  try {
    meta = await loadManifestMeta();
  } catch {
    if (coverage) coverage.innerHTML = `<p class="utility">${esc(A.coverage.unavailable)}</p>`;
    return;
  }
  // The reader may have left the page while the file was in flight.
  if (!coverage?.isConnected) return;

  const commemorations = Object.values(meta.by_church ?? {}).reduce((n, c) => n + (c.venerated ?? 0), 0);
  const rows = [
    fill(A.coverage.saints, { count: meta.total ?? 0 }),
    fill(A.coverage.commemorations, { count: commemorations }),
    fill(A.coverage.undated, { count: meta.by_century?.undated ?? 0 }),
    fill(A.coverage.located, { count: (meta.total ?? 0) - (meta.unlocated ?? 0) }),
  ];
  coverage.innerHTML =
    list(rows.map(esc)) +
    `<p class="utility">${esc(fill(A.coverage.built, { when: formatDate({ day: 'numeric', month: 'long', year: 'numeric' }, new Date(meta.built_at)) }))}</p>`;

  /*
   * The licence tally in two families, which is the shape of the obligation
   * rather than the shape of the data: a public-domain file owes nobody
   * anything, and everything else on the page owes a named author, which
   * `ui/credit.js` prints under the picture itself. `by_licence` arrived with
   * this section; a manifest built before it simply leaves the line out.
   */
  if (licences?.isConnected && meta.by_licence) {
    const entries = Object.entries(meta.by_licence);
    const pd = entries.filter(([k]) => /public domain/i.test(k)).reduce((n, [, v]) => n + v, 0);
    const cc = entries.filter(([k]) => !/public domain/i.test(k)).reduce((n, [, v]) => n + v, 0);
    licences.textContent = fill(A.pictures.counts, { summary: fill(A.pictures.summary, { pd, cc }) });
  }

  /*
   * The publications the corpus actually cites, counted at build time
   * (`by_source` in build-manifest.mjs) rather than restated from the
   * registry's prose — the registry names the source each church's *daily
   * calendar* comes from, and that is not always the publication the
   * attestations were read from. Both are true; this is the one the reader is
   * asking about.
   */
  if (sources?.isConnected && meta.by_source) {
    sources.innerHTML = list(
      CHURCHES.filter((c) => meta.by_source[c.id]?.length).map((c) => {
        const cited = meta.by_source[c.id]
          .map((s) => fill(A.sourcing.fromHost, { count: s.count, host: `<a href="https://${esc(s.host)}/" rel="noopener noreferrer">${esc(s.host)}</a>` }))
          .join(', ');
        return `<strong>${esc(churchName(c.id))}</strong> - ${cited}`;
      }),
    );
  }
}
