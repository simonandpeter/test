#!/usr/bin/env node
/**
 * Prints the token tables in `STRUCTURE.md` §3 from `src/styles/tokens.css`, which
 * is the only place a token's value or its meaning is written.
 *
 * `--check` exits non-zero if the file on disk is not what this would write;
 * `tests/structure.test.mjs` runs it that way.
 *
 * A colour declared in the day block and absent from the table was the one
 * direction the old hand-written table could not check: it was read and searched for
 * the token, so a token nobody wrote down passed. Here the table *is* the day
 * block, so a new colour arrives in it or fails for having no meaning.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = readFileSync(path.join(ROOT, 'src/styles/tokens.css'), 'utf8');
const DOC = path.join(ROOT, 'STRUCTURE.md');

const ruleBody = (selector) => {
  const at = TOKENS.indexOf(`${selector} {`);
  if (at === -1) throw new Error(`tokens.css has no ${selector} block`);
  return TOKENS.slice(at, TOKENS.indexOf('\n}', at));
};

/** Declarations in source order, each with the trailing comment on its line. */
const declarations = (body) => {
  const out = [];
  const re = /^[ \t]*(--[\w-]+):[ \t]*([^;]+);(?:[ \t]*\/\*((?:(?!\*\/).)*)\*\/)?/gm;
  for (const m of body.matchAll(re)) {
    out.push({ name: m[1], value: m[2].trim(), means: m[3]?.trim() ?? null });
  }
  return out;
};

const DAY = declarations(ruleBody(':root'));
const VIGIL = new Map(declarations(ruleBody('html.dark')).map((d) => [d.name, d.value]));
const byName = new Map(DAY.map((d) => [d.name, d]));

const isColour = (value, seen = new Set()) => {
  if (/^#[0-9a-f]{3,8}$/i.test(value) || /^rgba?\(/i.test(value)) return true;
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  if (!ref || seen.has(ref[1])) return false;
  seen.add(ref[1]);
  const target = byName.get(ref[1]);
  return target ? isColour(target.value, seen) : false;
};

const row = (cells) => `| ${cells.join(' | ')} |`;
const head = (cells) => [row(cells), row(cells.map(() => '---'))];

const meaningOf = (d, table) => {
  if (!d.means) {
    throw new Error(
      `${d.name} has no meaning beside it, so the ${table} table cannot name it.\n` +
        `  Write one as a trailing comment in tokens.css:  ${d.name}: ${d.value}; /* … */`,
    );
  }
  return d.means;
};

const colourTable = () => {
  const rows = DAY.filter((d) => isColour(d.value)).map((d) => {
    const vigil = VIGIL.get(d.name);
    return row([
      `\`${d.name}\``,
      `\`${d.value}\``,
      vigil ? `\`${vigil}\`` : '—',
      meaningOf(d, 'colour'),
    ]);
  });
  return [...head(['token', 'day', 'vigil', 'means']), ...rows].join('\n');
};

const scaleTable = (prefix, unit, columns, skip = () => false) => {
  const rows = DAY.filter((d) => d.name.startsWith(prefix) && !skip(d)).map((d) =>
    row([
      `\`${d.name}\``,
      `\`${unit && d.value.endsWith(unit) ? d.value.slice(0, -unit.length) : d.value}\``,
      meaningOf(d, columns[1]),
    ]),
  );
  return [...head(columns), ...rows].join('\n');
};

const BLOCKS = {
  colour: colourTable,
  // The masthead is a mark rather than a step in the reading scale, and §3's
  // prose names its two sizes where it says so.
  type: () => scaleTable('--text-', 'px', ['token', 'px', 'for'], (d) => d.name.startsWith('--text-mast')),
  duration: () => scaleTable('--dur-', 'ms', ['token', 'ms', 'for']),
  easing: () => scaleTable('--ease', '', ['token', 'curve', 'for']),
};

const rewrite = (doc) => {
  let out = doc;
  for (const [name, build] of Object.entries(BLOCKS)) {
    const open = `<!-- generated: ${name} — scripts/tokens-table.mjs -->`;
    const close = '<!-- /generated -->';
    const re = new RegExp(`${open.replace(/[-[\]{}()*+?.\\^$|]/g, '\\$&')}\\n[\\s\\S]*?${close}`);
    if (!re.test(out)) throw new Error(`STRUCTURE.md has no "${name}" generated block`);
    out = out.replace(re, `${open}\n${build()}\n${close}`);
  }
  return out;
};

const doc = readFileSync(DOC, 'utf8');
const next = rewrite(doc);

if (process.argv.includes('--check')) {
  if (next !== doc) {
    console.error('STRUCTURE.md is not what tokens.css says. Run: node scripts/tokens-table.mjs');
    process.exit(1);
  }
  console.log('STRUCTURE.md token tables are current.');
} else if (next === doc) {
  console.log('STRUCTURE.md token tables are already current.');
} else {
  writeFileSync(DOC, next);
  console.log('STRUCTURE.md token tables rewritten from tokens.css.');
}
