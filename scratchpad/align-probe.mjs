/* The three alignment/treatment claims, measured on both: where the name sits
   against the picture's mount, whether the lede is faded and by what, and what
   the continue control says and where it is. */
import { chromium } from '@playwright/test';

const MOCK = 'file:///C:/Users/matei/Documents/Agios%20Website/mockup-scratch/daily-sidebar.html';
const LIVE = 'http://localhost:4173/';

const probe = `
  const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const cs = (e) => getComputedStyle(e);
  const box = (e) => e.getBoundingClientRect();
  const main = document.querySelector('main') || document.body;

  // the biggest picture on the page = the day's hero
  const img = [...main.querySelectorAll('img')].filter(vis)
    .sort((a, b) => box(b).width * box(b).height - box(a).width * box(a).height)[0];
  // the mount: the nearest ancestor whose background differs from transparent
  let mount = img ? img.parentElement : null;
  for (let i = 0; i < 4 && mount; i += 1) {
    if (cs(mount).backgroundColor !== 'rgba(0, 0, 0, 0)') break;
    mount = mount.parentElement;
  }
  // the saint's name: the first h2/h1 to the right of the picture
  const name = [...main.querySelectorAll('h1,h2')].filter(vis)
    .find((h) => img && box(h).left > box(img).left + 40);

  // first baseline of the name, via a probe span in the same face
  let baseline = null, capTop = null;
  if (name) {
    const r = document.createRange();
    r.selectNodeContents(name);
    const first = r.getClientRects()[0];
    if (first) { baseline = first.bottom; capTop = first.top; }
  }

  // the fade: look for a mask or a gradient overlay on the lede or its wrapper
  const ps = [...main.querySelectorAll('p')].filter(vis)
    .sort((a, b) => b.textContent.length - a.textContent.length);
  const lede = ps[0] ?? null;
  const fadeInfo = [];
  let n = lede;
  for (let i = 0; i < 4 && n; i += 1) {
    const c = cs(n);
    const after = getComputedStyle(n, '::after');
    fadeInfo.push({
      el: n.tagName + '.' + (n.className || ''),
      mask: c.webkitMaskImage !== 'none' ? c.webkitMaskImage.slice(0, 60) : (c.maskImage !== 'none' ? c.maskImage.slice(0, 60) : null),
      clamp: c.webkitLineClamp !== 'none' ? c.webkitLineClamp : null,
      maxH: c.maxHeight,
      overflow: c.overflow,
      afterBg: after.backgroundImage !== 'none' ? after.backgroundImage.slice(0, 60) : null,
      afterContent: after.content,
    });
    n = n.parentElement;
  }

  const more = [...main.querySelectorAll('a,button,span')].filter(vis)
    .find((e) => /continue reading|read more/i.test(e.textContent.trim()) && e.textContent.trim().length < 30);

  return {
    imgW: img ? Math.round(box(img).width) : null,
    imgH: img ? Math.round(box(img).height) : null,
    mountEl: mount ? mount.tagName + '.' + (mount.className || '') : null,
    mountPad: mount ? cs(mount).padding : null,
    mountTop: mount ? Math.round(box(mount).top) : null,
    imgTop: img ? Math.round(box(img).top) : null,
    nameCapTop: capTop !== null ? Math.round(capTop) : null,
    nameBaseline: baseline !== null ? Math.round(baseline) : null,
    nameSize: name ? cs(name).fontSize : null,
    capTopMinusMountTop: capTop !== null && mount ? Math.round(capTop - box(mount).top) : null,
    ledeChars: lede ? lede.textContent.trim().length : null,
    ledeSize: lede ? cs(lede).fontSize : null,
    fade: fadeInfo,
    moreText: more ? more.textContent.trim() : null,
    moreLeft: more ? Math.round(box(more).left) : null,
    moreRight: more ? Math.round(box(more).right) : null,
    colLeft: name ? Math.round(box(name).left) : null,
    colRight: name ? Math.round(box(name).right) : null,
  };
`;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1400 } });
await ctx.addInitScript(() => {
  const k = 'gos-settings';
  const n = JSON.parse(localStorage.getItem(k) ?? '{}');
  localStorage.setItem(k, JSON.stringify({ ...n, church: 'greek', language: 'en', reckoning: 'gregorian', seenCoach: true }));
});
for (const [label, url] of [['MOCKUP', MOCK], ['LIVE', LIVE]]) {
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate(new Function(probe));
  console.log(`\n===== ${label} =====`);
  for (const [k, v] of Object.entries(r)) {
    if (k === 'fade') { console.log('  fade chain:'); for (const f of v) console.log('    ', JSON.stringify(f)); }
    else console.log(`  ${k.padEnd(22)} ${JSON.stringify(v)}`);
  }
}
await b.close();
