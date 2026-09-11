import io

p = 'src/ui/hymns.js'
s = io.open(p, encoding='utf-8').read()

# ---- the merge, and the citation list it produces --------------------------
anchor = """/**
 * Every hymn the corpus has for one saint, as a section, or '' where there
 * are none"""

added = '''/**
 * **One hymn sung in two calendars is one hymn** (author, 2026-09-12: "If
 * there is a troparion in Russian and Greek, they should be the same when
 * translated to English … No double ups. If they are completely different,
 * just cite this as a Greek source, and this as a Russian source").
 *
 * A saint's apolytikion is very often the same text in Greek, Church
 * Slavonic and Romanian — the corpus holds 33 hymns that appear in more than
 * one tradition — and each tradition cites its own book for it. In their own
 * tongues those are three different things to read and all three belong on the
 * page. **In English they are one text printed three times**, which reads as
 * the site not knowing it has repeated itself.
 *
 * So the collapse happens here, at the reading, and never in the data: the
 * folder keeps every tradition's own hymn with its own citation, because that
 * is what is true and what a Greek or Russian reader is shown. What English
 * gets is one text carrying every source that published it.
 *
 * **Keyed on the rendered English, not on the tone or the saint.** Two hymns
 * that translate to the same words are the same hymn whatever their headings
 * say, and two that do not are two — which is the author's own second clause,
 * and it needs no rule of its own because different text simply does not
 * collide. Whitespace is normalised because the sources punctuate their line
 * breaks differently; nothing else is touched.
 */
export function mergeForReading(hymns, language = currentLanguage()) {
  const all = hymns ?? [];
  if (language !== 'en') return all;
  const key = (h) => (h.english?.text ?? '').replace(/\\s+/g, ' ').trim().toLowerCase();
  const out = [];
  const byText = new Map();
  for (const h of all) {
    const k = key(h);
    // No English yet: it cannot collide with anything, and it is shown in its
    // own tongue exactly as before.
    if (!k) {
      out.push(h);
      continue;
    }
    const seen = byText.get(k);
    if (!seen) {
      const copy = { ...h, alsoIn: [] };
      byText.set(k, copy);
      out.push(copy);
      continue;
    }
    // The second and later tradition to sing it: the text is already on the
    // page, so what this one adds is its church and its book.
    seen.alsoIn.push({ church: h.church, source: h.english?.source ?? h.source });
  }
  return out;
}

''' + anchor

assert s.count(anchor) == 1, 'anchor'
s = s.replace(anchor, added)

# ---- hymnMarkup prints every church and every book -------------------------
old = """  const head = [
    H[h.kind] ?? h.kind,
    toneNo ? fill(STRINGS.calendar.liturgy.tone, { tone: toneNo }) : h.tone,
    h.model,
    withChurch && h.church ? churchName(h.church) : null,
  ]"""
new = """  /*
   * Every calendar that sings it, where the page is naming calendars at all.
   * `mergeForReading` puts the others in `alsoIn`, so a hymn the Greek and the
   * Russian share reads "Greek · Russian" over one text rather than appearing
   * twice under one name each.
   */
  const churches = withChurch && h.church
    ? [h.church, ...(h.alsoIn ?? []).map((a) => a.church)].map(churchName).join(' · ')
    : null;
  const head = [
    H[h.kind] ?? h.kind,
    toneNo ? fill(STRINGS.calendar.liturgy.tone, { tone: toneNo }) : h.tone,
    h.model,
    churches,
  ]"""
assert s.count(old) == 1, 'head'
s = s.replace(old, new)

old = """  const own = rendering !== h && rendering.rendered === 'site';
  const src = rendering.source?.url
    ? `<a href="${esc(rendering.source.url)}" rel="noopener noreferrer">${esc(rendering.source.text)}</a>`
    : esc(rendering.source?.text ?? '');
  const foot = own
    ? esc(H.renderedHere)
    : fill(H.source, { source: src });"""
new = """  const own = rendering !== h && rendering.rendered === 'site';
  const cite = (o) =>
    o?.url
      ? `<a href="${esc(o.url)}" rel="noopener noreferrer">${esc(o.text)}</a>`
      : esc(o?.text ?? '');
  /*
   * **And every book that printed it.** A merged hymn carries the citation of
   * each tradition that published the text, in the order the page names the
   * calendars, because "cite this as a Greek source, and this as a Russian
   * source" is the whole of what the merge owes the reader. A rendering made
   * here has no book to name and says so instead, exactly as before — the
   * sources of the originals it was made from are one press of the language
   * control away, on the same page.
   */
  const src = [rendering.source, ...(own ? [] : (h.alsoIn ?? []).map((a) => a.source))]
    .filter(Boolean)
    .map(cite)
    .join('; ');
  const foot = own ? esc(H.renderedHere) : fill(H.source, { source: src });"""
assert s.count(old) == 1, 'foot'
s = s.replace(old, new)

# ---- the saint page reads through the merge -------------------------------
old = """export function saintHymnsSection(hymns, church) {
  const all = hymns ?? [];
  if (!all.length) return '';
  const ordered = [...all].sort((a, b) => (b.church === church) - (a.church === church));
  const spans = new Set(all.map((h) => h.church)).size > 1;"""
new = """export function saintHymnsSection(hymns, church) {
  const all = mergeForReading(hymns ?? []);
  if (!all.length) return '';
  const ordered = [...all].sort((a, b) => (b.church === church) - (a.church === church));
  // Counted after the merge and across what each row now names, so a merged
  // row still asks for its label: it is the one row that most needs it.
  const spans = new Set(all.flatMap((h) => [h.church, ...(h.alsoIn ?? []).map((a) => a.church)])).size > 1;"""
assert s.count(old) == 1, 'section'
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('hymns.js')

# ---- the Daily page reads through it too ----------------------------------
p = 'src/views/daily/record.js'
s = io.open(p, encoding='utf-8').read()
s = s.replace(
    "import { hymnMarkup } from '../../ui/hymns.js';",
    "import { hymnMarkup, mergeForReading } from '../../ui/hymns.js';",
)
s = s.replace(
    "<div data-feast-hymns>${feastHymns.map(hymnMarkup).join('')}</div>",
    "<div data-feast-hymns>${mergeForReading(feastHymns).map((h) => hymnMarkup(h)).join('')}</div>",
)
s = s.replace(
    "box.innerHTML = hymns.map(hymnMarkup).join('');",
    "box.innerHTML = mergeForReading(hymns)\n        .map((h) => hymnMarkup(h))\n        .join('');",
)
assert 'mergeForReading' in s, 'record.js'
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('record.js')
