/**
 * What actually crosses when the theme changes, and over how long.
 *
 * Samples every painted element's computed colour across a theme press and
 * reports, per element *and property*, whether it snapped, eased, or sat
 * still. An element at its end state on the first sample snapped; one still
 * travelling at 300 ms is on a longer curve than the page.
 *
 * MSYS_NO_PATHCONV=1 node scratchpad/fade-probe.mjs [route] [width]
 */
import { chromium } from 'playwright';

const route = process.argv[2] || '/calendar';
const width = Number(process.argv[3] || 1280);
const BASE = process.env.BASE || 'http://localhost:5173';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const SAMPLE_MS = [8, 40, 80, 120, 160, 200, 240, 280, 320, 360, 420, 520];

const result = await page.evaluate(async (sampleMs) => {
  const PROPS = ['backgroundColor', 'color', 'borderTopColor', 'borderBottomColor',
    'borderLeftColor', 'borderRightColor', 'outlineColor', 'fill', 'stroke',
    'boxShadow', 'backgroundImage'];
  const PSEUDO = [null, '::before', '::after'];

  const describe = (el) => {
    const cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return el.tagName.toLowerCase() + cls + (el.id ? '#' + el.id : '');
  };

  const nodes = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    for (const p of PSEUDO) {
      const cs = getComputedStyle(el, p);
      if (p && (cs.content === 'none' || cs.content === 'normal')) continue;
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const key = describe(el) + (p || '');
      if (seen.has(key)) continue;
      seen.add(key);
      nodes.push({ el, p, key,
        tp: cs.transitionProperty, td: cs.transitionDuration, tf: cs.transitionTimingFunction });
    }
  }

  /* Only what a reader can actually see change on this element: a fill that is
     not transparent, a border that has width, an SVG paint, a shadow. `color`
     on a box with no text of its own, and the four border colours of a box
     with no border, are the same number reported five times. */
  const visible = (el, p) => {
    const cs = getComputedStyle(el, p);
    const on = new Set();
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') on.add('backgroundColor');
    if (cs.backgroundImage !== 'none') on.add('backgroundImage');
    for (const side of ['Top', 'Bottom', 'Left', 'Right']) {
      if (parseFloat(cs[`border${side}Width`]) > 0) on.add(`border${side}Color`);
    }
    if (cs.boxShadow !== 'none') on.add('boxShadow');
    if (el instanceof SVGElement) { on.add('fill'); on.add('stroke'); }
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasOwnText || p) on.add('color');
    return on;
  };
  nodes.forEach((n) => { n.on = visible(n.el, n.p); });

  const read = () => nodes.map(({ el, p }) => {
    const cs = getComputedStyle(el, p);
    return PROPS.map((k) => cs[k]);
  });

  const before = read();
  document.getElementById('theme-toggle')?.click();

  const frames = [];
  const t0 = performance.now();
  for (const ms of sampleMs) {
    while (performance.now() - t0 < ms) await new Promise((r) => requestAnimationFrame(r));
    frames.push({ t: Math.round(performance.now() - t0), v: read() });
  }
  await new Promise((r) => setTimeout(r, 900));
  const after = read();

  const out = [];
  nodes.forEach((n, i) => {
    PROPS.forEach((prop, j) => {
      if (before[i][j] === after[i][j]) return;
      if (!n.on.has(prop)) return;
      const track = frames.map((f) =>
        f.v[i][j] === before[i][j] ? '.' : f.v[i][j] === after[i][j] ? 'X' : '~').join('');
      out.push({ key: n.key, prop, track, tp: n.tp, td: n.td, tf: n.tf,
        from: before[i][j], to: after[i][j] });
    });
  });
  return out;
}, SAMPLE_MS);

console.log(`route ${route} @ ${width}   samples: ${SAMPLE_MS.join(' ')} ms`);
console.log(`legend: . still at start   ~ mid-fade   X arrived\n`);

const buckets = new Map();
for (const r of result) {
  const b = `${r.track}  [${r.tp} / ${r.td} / ${r.tf}]`;
  if (!buckets.has(b)) buckets.set(b, []);
  buckets.get(b).push(`${r.key}{${r.prop}}`);
}
for (const [b, keys] of [...buckets.entries()].sort((a, c) => c[1].length - a[1].length)) {
  console.log(`${b}   ${keys.length}`);
  console.log(`    ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? ` … +${keys.length - 10}` : ''}`);
}

if (process.env.SNAPPED) {
  console.log('\n--- everything that SNAPS ---');
  const byEl = new Map();
  for (const r of result) {
    if (r.track[0] !== 'X') continue;
    if (!byEl.has(r.key)) byEl.set(r.key, []);
    byEl.get(r.key).push(`${r.prop}: ${r.from} -> ${r.to}`);
  }
  for (const [k, v] of byEl) console.log(k + '\n    ' + v.join('\n    '));
}
const snapped = result.filter((r) => r.track[0] === 'X');
const eased = result.filter((r) => r.track[0] !== 'X');
console.log(`\n${result.length} (element, property) pairs changed colour: ${snapped.length} SNAPPED, ${eased.length} eased.`);

await browser.close();
