/**
 * Measures the mockup's hero geometry: the crop, the focus, and the proportion
 * of the picture's column to the text column beside it and to the left column
 * that holds both. Scratch — not part of the build.
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const file = path.resolve(process.argv[2]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const out = await page.evaluate(() => {
  const frame = document.querySelector('.frame');
  const cal = frame.querySelector('.cal');
  const main = frame.querySelector('.main');
  const side = frame.querySelector('.side');
  const hero = frame.querySelector('.hero');
  const himg = hero.querySelector('.himg');
  const img = himg.querySelector('img');
  const body = hero.children[1];
  const lede = hero.querySelector('.hlede');
  const cs = getComputedStyle(img);
  const r = (el) => {
    const b = el.getBoundingClientRect();
    return { w: +b.width.toFixed(3), h: +b.height.toFixed(3), l: +b.left.toFixed(3), t: +b.top.toFixed(3) };
  };
  return {
    frame: r(frame),
    calPad: getComputedStyle(cal).padding,
    calGap: getComputedStyle(cal).columnGap,
    main: r(main),
    side: r(side),
    hero: r(hero),
    heroTracks: getComputedStyle(hero).gridTemplateColumns,
    heroGap: getComputedStyle(hero).columnGap,
    mount: r(himg),
    mountPad: getComputedStyle(himg).padding,
    picture: r(img),
    body: r(body),
    lede: r(lede),
    objectPosition: cs.objectPosition,
    objectFit: cs.objectFit,
    aspectRatio: cs.aspectRatio,
    drawnRatio: +(img.getBoundingClientRect().width / img.getBoundingClientRect().height).toFixed(4),
  };
});

const p = (a, b) => +(a / b).toFixed(5);
console.log(JSON.stringify(out, null, 2));
console.log('\n--- proportions -------------------------------------------');
console.log('left column (.main)            ', out.main.w);
console.log('hero column (.himg mount)      ', out.mount.w);
console.log('text column (hero body)        ', out.body.w);
console.log('picture inside the mount       ', out.picture.w, 'x', out.picture.h);
console.log('mount / left column            ', p(out.mount.w, out.main.w));
console.log('mount / text column            ', p(out.mount.w, out.body.w));
console.log('picture / text column          ', p(out.picture.w, out.body.w));
console.log('picture / left column          ', p(out.picture.w, out.main.w));
console.log('object-position                ', out.objectPosition);
console.log('drawn w/h                      ', out.drawnRatio);

await browser.close();
