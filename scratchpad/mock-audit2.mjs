/* Visible elements only, and the register expanded, so the comparison is
   against what a desktop reader actually sees. */
import { chromium } from '@playwright/test';

const MOCK = 'file:///C:/Users/matei/Documents/Agios%20Website/mockup-scratch/daily-sidebar.html';
const LIVE = 'http://localhost:4173/';

const shared = `
  const vis = (e) => {
    if (!e) return false;
    const b = e.getBoundingClientRect();
    return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden';
  };
  const all = (sel, root = document) => [...root.querySelectorAll(sel)].filter(vis);
  const one = (sel, root = document) => all(sel, root)[0] ?? null;
  const cs = (e) => (e ? getComputedStyle(e) : null);
  const box = (e) => (e ? e.getBoundingClientRect() : null);
`;

const monthProbe = `
  ${shared}
  const out = {};
  // the visible month grid's today/selected cell
  const cands = all('[aria-current], [class*=today], [class*=is-sel], [class*=selected], .mgrid b.on');
  const on = cands[0] ?? null;
  if (on) {
    const c = cs(on), b = box(on);
    out.el = on.tagName + '.' + (on.className || '');
    out.radius = c.borderRadius;
    out.border = c.borderWidth + ' ' + c.borderStyle + ' ' + c.borderColor;
    out.color = c.color;
    out.background = c.backgroundColor;
    out.w = Math.round(b.width); out.h = Math.round(b.height);
    out.font = c.fontSize;
    // a neighbouring cell, for cell width
    const sibs = [...on.parentElement.parentElement.querySelectorAll(on.tagName)].filter(vis);
    const other = sibs.find((s) => s !== on);
    if (other) { out.cellW = Math.round(box(other).width); out.cellH = Math.round(box(other).height); }
  }
  return out;
`;

const sectionProbe = `
  ${shared}
  // the sidebar is the narrow column on the right
  const cols = all('aside, [class*=side], [class*=bub]')
    .filter((e) => box(e).width < 420 && box(e).width > 150)
    .sort((a, b) => box(b).height - box(a).height);
  const side = cols[0] ?? null;
  if (!side) return { sections: [], note: 'no sidebar found' };
  return { sections: all('h2,h3', side).map((h) => h.textContent.trim()).slice(0, 12),
           sideW: Math.round(box(side).width) };
`;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1400 } });
await ctx.addInitScript(() => {
  const k = 'gos-settings';
  const n = JSON.parse(localStorage.getItem(k) ?? '{}');
  localStorage.setItem(k, JSON.stringify({ ...n, church: 'greek', language: 'en', reckoning: 'gregorian', seenCoach: true }));
});

const run = async (url, label) => {
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const month = await p.evaluate(new Function(monthProbe));
  const sect = await p.evaluate(new Function(sectionProbe));
  console.log(`\n===== ${label} =====`);
  console.log('today marker :', JSON.stringify(month, null, 0));
  console.log('sidebar      :', JSON.stringify(sect, null, 0));
  return p;
};

await run(MOCK, 'MOCKUP');
const live = await run(LIVE, 'LIVE');

// expand the register on the live page and measure the expanded entry
const toggled = await live.evaluate(() => {
  const btns = [...document.querySelectorAll('button,[role=button],a')];
  const t = btns.find((b) => /expand|full|register|view/i.test(
    (b.getAttribute('aria-label') || '') + ' ' + (b.title || '') + ' ' + (b.className || '')));
  if (t) { t.click(); return t.getAttribute('aria-label') || t.className; }
  return null;
});
console.log('\nexpand control clicked:', toggled);
await live.waitForTimeout(600);
const expanded = await live.evaluate(new Function(`
  ${shared}
  const main = document.querySelector('main');
  const heads = all('h3, h2', main).map((h) => h.textContent.trim());
  // the entries under "Also today"
  const imgs = all('img', main).map((i) => ({ w: Math.round(box(i).width), h: Math.round(box(i).height) }));
  const ps = all('p', main).map((p) => p.textContent.trim().length).filter((n) => n > 40);
  return { heads: heads.slice(0, 8), imgs: imgs.slice(0, 6), pLens: ps.slice(0, 6) };
`));
console.log('after expand :', JSON.stringify(expanded));
await b.close();
