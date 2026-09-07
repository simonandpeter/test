/**
 * The number behind a tone as its own source writes it.
 *
 * A hymn's `tone` is quoted from the calendar it was read out of, so it
 * arrives in that calendar's own language and notation — «глас 4» from the
 * Slavonic, `Glasul 3` from doxologia.ro, `Ἦχος πλ. α´` from saint.gr. Until
 * 2026-09-07 the saint page printed that string as it stood, beside a heading
 * and a church name in the *reader's* language, so a reader in Greek met a
 * Romanian troparion labelled `Glasul 3` (author) and a reader in English met
 * `глас 4` (HANDOFF's own open item, left to the author twice).
 *
 * Reading the number out is what lets the page say it in the reader's own
 * words. It is a number and not prose: the Octoechos has eight tones and a
 * hymn is sung in one of them, so `Ἦχος πλ. α´` and «глас 5» and `Glasul 5`
 * are three spellings of one fact, and translating between them edits no
 * quotation. Where the string cannot be read — a mode outside the eight, a
 * notation not met before — the caller keeps the original, which is the only
 * honest fallback: better the source's own words than a guess at them.
 */

/**
 * Greek letters used as numerals for the four authentic tones. `ϛ` (stigma)
 * is 6 and is written `στ` as often as as a single glyph.
 */
const GREEK_NUMERAL = { α: 1, β: 2, γ: 3, δ: 4, ε: 5, ϛ: 6, ζ: 7, η: 8 };

export const TONES = 8;

/**
 * `1`–`8`, or null where the string says something this does not know.
 *
 * The plagal tones are the half of Greek notation that is not a numeral:
 * the Octoechos runs four authentic modes and their four plagals, and the
 * plagals are numbered 5–8 in the Slavonic and Romanian reckoning the site
 * counts in. So `πλ. α´` is 5, `πλ. β´` is 6, `βαρύς` — the grave tone, which
 * is named rather than numbered — is 7, and `πλ. δ´` is 8.
 */
export function toneNumber(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  // Greek first, because a Greek string can also carry a stray digit in a
  // citation and the notation is what should decide.
  if (/[Ͱ-Ͽἀ-῿]/.test(s)) {
    const plagal = /πλ\.?\s*([αβγδ])/i.exec(s);
    if (plagal) {
      const base = GREEK_NUMERAL[plagal[1].toLowerCase()];
      return base >= 1 && base <= 4 ? base + 4 : null;
    }
    if (/βαρ[υύ]ς/i.test(s)) return 7;
    // `Ἦχος γ´` — the numeral is the letter after the tone word, and the
    // tone word itself is full of letters that are also numerals, so it is
    // cut off first rather than searched around.
    const after = s.replace(/[ἦἠήῆη]χος/i, ' ');
    const m = /(?:^|[\s.])([αβγδεϛζη])[´΄'’]?/i.exec(after);
    if (m) return GREEK_NUMERAL[m[1].toLowerCase()] ?? null;
    if (/στ[´΄'’]/i.test(after)) return 6;
    return null;
  }

  const digits = /(\d+)/.exec(s);
  if (digits) {
    const n = Number(digits[1]);
    return n >= 1 && n <= TONES ? n : null;
  }
  return null;
}
