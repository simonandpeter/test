#!/usr/bin/env node
/**
 * Fetch one or more pages into `.tmp/day-cache/` with the same manners as
 * `day-candidates.mjs`: one at a time, 2 s between hits on a host, a real
 * user-agent, and the declared charset then UTF-8 strictly then cp1251 —
 * never `replace`, which turns an error into data.
 *
 * `node scratchpad/fetchpage.mjs <url> [url …]` prints each cache path.
 */
import fs from 'node:fs';
import path from 'node:path';

const CACHE_DIR = path.join(process.cwd(), '.tmp', 'day-cache');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const url of process.argv.slice(2)) {
  const key = url.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 120) + '.html';
  const cached = path.join(CACHE_DIR, key);
  if (fs.existsSync(cached)) {
    console.log(`cached ${cached}`);
    continue;
  }
  await sleep(2000);
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (agios-corpus; one page at a time)' } });
  if (!res.ok) {
    console.log(`FAILED ${res.status} ${url}`);
    continue;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const declared = /charset=([\w-]+)/i.exec(res.headers.get('content-type') ?? '')?.[1];
  let text = null;
  for (const enc of [declared, 'utf-8', 'windows-1251'].filter(Boolean)) {
    try {
      text = new TextDecoder(enc, { fatal: true }).decode(bytes);
      break;
    } catch {
      /* the next one */
    }
  }
  if (text === null) {
    console.log(`NO CLEAN ENCODING ${url}`);
    continue;
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cached, text, 'utf8');
  console.log(`wrote ${cached}`);
}
