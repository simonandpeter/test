/** What the Prayer asides measure before and after the payload lands, at 360 px. */
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 360, height: 780 } });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
await p.goto('http://localhost:4173/prayer', { waitUntil: 'commit' });
const read = async (when) => {
  const r = await p.evaluate(() => [...document.querySelectorAll('.hy-side')].map((el) => ({
    id: el.id, h: Math.round(el.getBoundingClientRect().height), rows: el.querySelectorAll('.index-card').length,
  })));
  console.log(when, JSON.stringify(r));
};
await p.waitForSelector('.hy-side', { timeout: 10000 });
await read('early ');
await p.waitForTimeout(2500);
await read('settled');
await b.close();
