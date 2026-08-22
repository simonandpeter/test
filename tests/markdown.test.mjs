import test from 'node:test';
import assert from 'node:assert/strict';

import { escapeHtml, firstParagraphText, renderMarkdown, stripLeadingHeading } from '../src/lib/markdown.js';

test('markup in the source text is escaped before anything is rendered', () => {
  const html = renderMarkdown('A <script>alert(1)</script> in a life.');
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('&lt;script&gt;'), true);
  assert.equal(escapeHtml('"a" & <b>'), '&quot;a&quot; &amp; &lt;b&gt;');
});

test('paragraphs join their wrapped lines and split on blank lines', () => {
  const html = renderMarkdown('one\ntwo\n\nthree');
  assert.equal(html, '<p>one two</p>\n<p>three</p>');
});

test('headings are pushed below the page heading rather than skipping levels', () => {
  assert.equal(renderMarkdown('# Life'), '<h2>Life</h2>');
  assert.equal(renderMarkdown('## Sources', { headingOffset: 2 }), '<h4>Sources</h4>');
  assert.equal(renderMarkdown('###### deep', { headingOffset: 2 }), '<h6>deep</h6>');
});

test('links resolve through the caller, and only external ones get rel', () => {
  const html = renderMarkdown('see [Athanasius](/saints/athanasius) and [PG](https://example.org/x).', {
    link: (href) => (href.startsWith('/') ? `/test${href}` : href),
  });
  assert.match(html, /<a href="\/test\/saints\/athanasius">Athanasius<\/a>/);
  assert.match(html, /<a href="https:\/\/example.org\/x" rel="noopener noreferrer">PG<\/a>/);
});

test('emphasis needs a boundary, so a mid-word asterisk is left alone', () => {
  assert.equal(renderMarkdown('the *Life* of Paul'), '<p>the <em>Life</em> of Paul</p>');
  assert.equal(renderMarkdown('2*3*4 stays'), '<p>2*3*4 stays</p>');
  assert.equal(renderMarkdown('**bold** then'), '<p><strong>bold</strong> then</p>');
});

test('lists close when the list ends, and switching kind starts a new one', () => {
  assert.equal(renderMarkdown('- a\n- b\n\ntail'), '<ul>\n<li>a</li>\n<li>b</li>\n</ul>\n<p>tail</p>');
  assert.equal(renderMarkdown('1. a\n2. b'), '<ol>\n<li>a</li>\n<li>b</li>\n</ol>');
  assert.match(renderMarkdown('- a\n1. b'), /<\/ul>\n<ol>/);
});

test('a rule and a blockquote survive as themselves', () => {
  assert.equal(renderMarkdown('---'), '<hr />');
  assert.equal(renderMarkdown('> quoted\n> again'), '<blockquote><p>quoted</p><p>again</p></blockquote>');
});

test('the life own title is dropped, because the page already sets it', () => {
  assert.equal(stripLeadingHeading('# Anthony the Great\n\nBorn to a family.'), 'Born to a family.');
  // Only the leading one: a heading further down is structure, not a repeat.
  assert.equal(stripLeadingHeading('Text\n\n# Later'), 'Text\n\n# Later');
});

test('the first paragraph of a life reads as plain text, links and emphasis flattened', () => {
  // The Index's Detailed card shows this, so it is derived from the life the
  // author wrote rather than authored a second time (Addendum H1).
  const md =
    '# Paul of Thebes\n\nAlmost everything told of Paul comes from a single text: the *Life of Paul*,\n' +
    'written by [Jerome](/saints/jerome) around **375**.\n\nThe narrative turns on a meeting.';
  assert.equal(
    firstParagraphText(md),
    'Almost everything told of Paul comes from a single text: the Life of Paul, written by Jerome around 375.',
  );
});

test('the first paragraph skips headings, quotes, lists and rules, and an empty life is an empty string', () => {
  assert.equal(
    firstParagraphText('# Name\n\n## Early life\n\n> a quote\n\n- a list\n\n---\n\nThe paragraph.'),
    'The paragraph.',
  );
  assert.equal(firstParagraphText(''), '');
  assert.equal(firstParagraphText(null), '');
});
