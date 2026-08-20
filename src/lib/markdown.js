/**
 * A small Markdown renderer for the lives and the source texts.
 *
 * The corpus is hand-authored in this repo and uses a deliberately narrow
 * subset — headings, paragraphs, emphasis, links, lists, rules, blockquotes —
 * so a full CommonMark implementation would be a dependency and a bundle cost
 * bought for constructs nothing in `saints/` contains. If a life ever needs
 * tables or footnotes, replace this with a real parser rather than growing it
 * one regex at a time.
 *
 * Everything is escaped before any markup is produced, so an author's stray
 * angle bracket cannot become an element. Pure and string-returning, which is
 * what makes it testable in Node.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ESCAPES[c]);

/**
 * A life's own `# Name` heading repeats the display name the page already sets
 * as its h1, so the detail page drops it rather than printing the name twice.
 */
export function stripLeadingHeading(md) {
  return String(md).replace(/^\s*#\s+[^\n]*\n+/, '');
}

/**
 * Inline constructs, applied to text that has already been escaped — block
 * structure is decided on the raw line, because `>` becomes `&gt;` the moment
 * it is escaped and a blockquote would stop being one. Links run first so that
 * emphasis inside a URL — a stray underscore in a path — cannot corrupt it.
 *
 * `link(href)` is the caller's chance to rewrite destinations: internal ones
 * (`/saints/agnes-of-rome`) need the deployment's base path, which this module
 * has no business knowing. Anything it returns unchanged is left alone.
 */
function inline(text, link) {
  return text
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      // href arrives escaped with the rest of the line; only a quote could
      // still break out of the attribute, and only if link() introduced one.
      const resolved = String(link ? link(href) : href).replace(/"/g, '&quot;');
      const external = /^https?:/i.test(href);
      const rel = external ? ' rel="noopener noreferrer"' : '';
      return `<a href="${resolved}"${rel}>${label}</a>`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
}

/**
 * `headingOffset` pushes the document's headings down the outline: a life's
 * `##` sits inside a page whose h1 is the saint's name, and skipping from h1
 * to h3 is an accessibility fault rather than a style choice.
 */
export function renderMarkdown(md, { link, headingOffset = 1 } = {}) {
  const lines = String(md ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const out = [];
  let paragraph = [];
  let list = null; // 'ul' | 'ol'
  let quote = [];

  const text = (s) => inline(escapeHtml(s), link);

  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${text(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    out.push(`</${list}>`);
    list = null;
  };
  const flushQuote = () => {
    if (!quote.length) return;
    out.push(`<blockquote>${quote.map((q) => `<p>${text(q)}</p>`).join('')}</blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      const level = Math.min(6, heading[1].length + headingOffset);
      out.push(`<h${level}>${text(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(---+|\*\*\*+)$/.test(line.trim())) {
      flushAll();
      out.push('<hr />');
      continue;
    }

    const quoted = /^>\s?(.*)$/.exec(line);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
      continue;
    }

    const item = /^\s*(?:([-*+])|(\d+)\.)\s+(.*)$/.exec(line);
    if (item) {
      flushParagraph();
      flushQuote();
      const kind = item[1] ? 'ul' : 'ol';
      if (list !== kind) {
        flushList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${text(item[3])}</li>`);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  flushAll();
  return out.join('\n');
}
