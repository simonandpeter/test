import { recordsReach } from '../../data/days.js';
import { dayRecordFor } from './entries.js';
import { bibleUrl, refInLanguage } from '../../lib/bible.js';
import { loadDetail } from '../../lib/detail.js';
import { currentLanguage } from '../../lib/i18n.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { hymnMarkup, mergeForReading } from '../../ui/hymns.js';
import { STRINGS, fill } from '../../ui/strings.js';
import { dayInWords } from './format.js';
import { state } from './state.js';

/**
 * What a church's own calendar printed for a day: the readings, and the hymns
 * of the feast.
 *
 * Both are transcribed by hand into `data/liturgical-days.js` and fetched
 * beside the manifest, so both answer null until that chunk lands and both say
 * so in prose rather than by disappearing — past the end of the records there
 * is nothing below to be the feast's own, and the page says which.
 */

/**
 * The day's readings, where the chosen church's calendar has been read and
 * recorded (author, 2026-08-22): each reference a link to Bible Gateway, and
 * the page it was read from named. Nothing is printed for a day nobody has
 * recorded — an absence is not a claim.
 */
/**
 * A reading's label in the reader's language, keeping whatever the calendar
 * put in brackets after it. The data's labels are the church's own — "Epistle
 * (Прор)", "Απόστολος", "Јеванђеље" — and it is the *kind* that translates:
 * the qualifier names which commemoration the reading belongs to and is a
 * quotation, so it is passed through exactly as printed.
 */
function readingLabel(label) {
  const R = STRINGS.calendar.readings;
  const text = String(label ?? '');
  // Greedy from the first bracket to the last, because a qualifier can carry
  // brackets of its own: days.pravoslavie.ru prints «за понедельник и за
  // вторник (под зачало)», and a pattern that refuses a nested bracket finds
  // no qualifier at all and leaves the kind untranslated.
  const qualifier = text.match(/\s*(\(.*\))\s*$/)?.[1] ?? '';
  const base = qualifier ? text.slice(0, text.length - qualifier.length).trim() : text;
  const kind =
    /^(epistle|apostol|απόστολος|апостол)$/i.test(base) ? R.epistle
    : /^(gospel|evanghelie|ευαγγέλιο|јеванђеље)$/i.test(base) ? R.gospel
    : base;
  return qualifier ? `${kind} ${qualifier}` : kind;
}

export function readingsMarkup(iso, churchId) {
  const rec = dayRecordFor(iso, churchId);
  if (!rec?.readings?.length) {
    /*
     * Past the end of the day records the page used to simply stop (found in
     * review, 2026-08-27). The computed lines hold for any date, so a day in
     * March 2027 printed its fast, its tone and its week and looked whole,
     * with the half that is read off a calendar silently absent.
     *
     * Only *past* the horizon. Inside it, a day with no readings is a day
     * whose calendar prints none - saint.gr publishes about a fortnight ahead
     * and those days carry a note of their own - which is a different fact and
     * must not be told in these words.
     */
    const reach = recordsReach();
    if (!reach || iso <= reach) return '';
    return `<p class="beyond-records utility">${esc(
      fill(STRINGS.calendar.beyondRecords, { until: dayInWords(reach) }),
    )}</p>`;
  }
  const R = STRINGS.calendar.readings;
  const language = currentLanguage();
  const items = rec.readings
    .map(
      (x) =>
        `<li><span class="reading-label">${esc(readingLabel(x.label))}</span> ` +
        `<a href="${bibleUrl(x.ref, language)}" rel="noopener noreferrer">${esc(refInLanguage(x.ref, language))}</a></li>`,
    )
    .join('');
  const src = rec.source?.url ? `<a href="${esc(rec.source.url)}" rel="noopener noreferrer">${esc(rec.source.text)}</a>` : esc(rec.source?.text ?? '');
  return `<section class="day-readings" data-readings>
    <h2 class="register-heading">${R.heading}</h2>
    <ul class="readings utility">${items}</ul>
    <p class="readings-source utility">${fill(R.source, { source: src, bible: R.bible })}</p>
  </section>`;
}

/**
 * The day's hymns, with the saint's own already in them where the caller has
 * them (author, 2026-10-03: "load ALL THE HYMNS IN ONE GO AND THEN THE NAME
 * DAYS SO THAT NOTHING HAS TO MOVE").
 *
 * `saintHtml` is the second half of this section and it arrives from its own
 * fetch, because a saint's hymns cannot be asked for until the day's saints
 * are known. A caller that has waited for it passes it here and the section is
 * drawn at its final height; a caller that has not passes nothing and fills
 * `[data-saint-hymns]` later through `fillSaintHymns`, which is what the desk
 * does, where the hymns are a column of their own with nothing under them to
 * move.
 */
export function hymnsMarkup(iso, churchId, saintHtml = '') {
  const rec = dayRecordFor(iso, churchId);
  const feastHymns = (rec?.hymns ?? []).filter((h) => h.church === churchId);
  const empty = !feastHymns.length && !saintHtml;
  return `<section class="day-hymns" data-hymns${empty ? ' hidden' : ''}>
    <h2 class="register-heading">${STRINGS.calendar.hymns.heading}</h2>
    <div data-feast-hymns>${mergeForReading(feastHymns).map((h) => hymnMarkup(h)).join('')}</div>
    <div data-saint-hymns>${saintHtml}</div>
  </section>`;
}

/**
 * The saint's own hymns as markup, for a caller that means to draw the section
 * once rather than grow it. Resolves to the empty string for a saint with
 * none, and for a failed load — the day is still a day without them, and a
 * rejected promise here would take the name days down with it.
 */
export function saintHymnsHtml(slug, iso) {
  return loadDetail(slug).then(
    (payload) => {
      if (!state || state.selected !== iso) return '';
      const hymns = (payload?.saint?.hymns ?? []).filter((h) => h.church === state.calendar);
      return hymns.length ? mergeForReading(hymns).map((h) => hymnMarkup(h)).join('') : '';
    },
    () => '',
  );
}

export function fillSaintHymns(panel, slug, iso) {
  loadDetail(slug).then(
    (payload) => {
      if (!state || state.selected !== iso) return;
      const box = panel.querySelector('[data-saint-hymns]');
      if (!box) return;
      const hymns = (payload?.saint?.hymns ?? []).filter((h) => h.church === state.calendar);
      if (!hymns.length) return;
      box.innerHTML = mergeForReading(hymns)
        .map((h) => hymnMarkup(h))
        .join('');
      panel.querySelector('[data-hymns]').hidden = false;
    },
    () => {},
  );
}
