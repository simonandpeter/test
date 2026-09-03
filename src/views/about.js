import { CHURCHES } from '../data/churches.js';
import { churchName } from '../lib/church.js';
import { loadManifestMeta } from '../lib/manifest.js';
import { formatDate } from '../lib/i18n.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import * as store from '../lib/store.js';
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

/**
 * The editorial page. Until 2026-08-22 it also explained the veneration mark,
 * with every circle drawn by the glyph's own component; the mark is removed
 * from this project (DESIGN.md §2, §7) and the section went with it.
 *
 * **The policy is written as substance now** (brief §8.4, 2026-08-29). It is
 * "the project's defence against the objection that it takes sides", so every
 * sentence on it was checked against the thing that would make it false — the
 * three states against the schema, the calendars against the church registry,
 * the counts against `manifest.meta.json`.
 *
 * **Nothing here states a number.** The coverage section reads them at render
 * time from `manifest.meta.json`, which is where `loadManifestMeta()` finally
 * gets its caller: a statistic typed into a sentence is stale the next time a
 * folder is added, and this page is the one place where a stale number would
 * read as a claim rather than as a bug.
 *
 * The privacy statement below is not a placeholder either (author,
 * 2026-08-24). It is short because the truth is short: the site keeps four
 * things, all of them on the reader's own device, and does nothing else.
 */
export function render(el, { router } = {}) {
  const A = STRINGS.about;

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
        CHURCHES.filter((c) => c.enabled !== false).map(
          (c) =>
            `<strong>${esc(churchName(c.id))}</strong> - ${esc(
              c.default_calendar === 'julian' ? A.calendars.old : A.calendars.new,
            )}`,
        ),
      )}
    </section>

    <section aria-labelledby="sourcing">
      <h2 id="sourcing">${esc(A.sourcing.heading)}</h2>
      <p>${esc(A.sourcing.lede)}</p>
      <div data-sources></div>
      <p>${esc(A.sourcing.lives)}</p>
      <p>${esc(A.sourcing.map)}</p>
      <p>${fill(esc(A.sourcing.texts), {
        link: `<a href="${router ? router.href('/texts') : `${import.meta.env.BASE_URL}texts`}">${esc(STRINGS.texts.title)}</a>`,
      })}</p>
    </section>

    <section aria-labelledby="coverage">
      <h2 id="coverage">${esc(A.coverage.heading)}</h2>
      <p>${esc(A.coverage.lede)}</p>
      <div data-coverage></div>
      <p>${esc(A.coverage.positiveOnly)}</p>
    </section>

    <section class="privacy" aria-labelledby="privacy">
      <h2 id="privacy">${P.heading}</h2>
      <p>${P.lede}</p>

      <h3>${P.keepsHeading}</h3>
      ${list(P.keeps)}

      <h3>${P.notHeading}</h3>
      ${list(P.not)}

      <p>${P.clearing}</p>

      <h3>${esc(A.data.heading)}</h3>
      <p>${esc(A.data.lede)}</p>
      <p class="data-controls">
        <button type="button" data-export>${esc(A.data.exportButton)}</button>
        <button type="button" data-import>${esc(A.data.importButton)}</button>
        <input type="file" accept="application/json,.json" data-import-file hidden />
      </p>
      <p class="utility" data-import-note aria-live="polite"></p>

      <p class="utility">${P.hosting}</p>
    </section>

    <section class="contact" aria-labelledby="contact">
      <h2 id="contact">${C.heading}</h2>
      <p>${C.lede}</p>
      <p><a href="${ISSUES}" rel="noopener noreferrer">${C.open}</a></p>
      <p class="utility">${C.note}</p>
    </section>
    </div>
  `;

  fillCounted(el);
  wireDataControls(el);
}

/**
 * Export / Import (brief §11): the whole log as one JSON file, and back.
 *
 * The export is an <a download> minted on the press - a static site has no
 * endpoint to download *from*, so the file is built in memory and the URL
 * revoked once the click has gone through. The import announces its result in
 * an aria-live note rather than an alert, and says how many records were
 * actually newer - "imported" with nothing taken is a different fact from
 * "imported", and the store's merge answer is worth the sentence.
 */
function wireDataControls(el) {
  const A = STRINGS.about;
  const note = el.querySelector('[data-import-note]');
  const file = el.querySelector('[data-import-file]');

  el.querySelector('[data-export]').addEventListener('click', async () => {
    const dump = await store.exportData();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    // The date in the name, so two backups on one desk stay tellable apart.
    a.download = `daily-dox-${dump.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  el.querySelector('[data-import]').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    // The same file twice must fire change twice; a picker that remembers is
    // a second press that silently does nothing.
    file.value = '';
    try {
      const taken = await store.importData(JSON.parse(await chosen.text()));
      note.textContent = taken
        ? fill(A.data.imported, { count: taken })
        : A.data.importedNone;
    } catch {
      note.textContent = A.data.importFailed;
    }
  });
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
