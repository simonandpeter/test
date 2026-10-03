/**
 * A static server over `dist/`, started by the probe that needs it and stopped
 * with it. A `vite preview` left from an earlier command is the one thing
 * CLAUDE.md says never to reuse, and on this desk it also keeps dying and
 * handing the next probe a page that was built two edits ago.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json',
};

export async function serveDist(root = 'dist') {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = join(root, normalize(url).replace(/^(\.\.[/\\])+/, ''));
    try {
      const s = await stat(file);
      if (s.isDirectory()) file = join(file, 'index.html');
    } catch {
      file = join(root, 'index.html');
    }
    let body = null;
    try {
      body = await readFile(file);
    } catch {
      // Any path the build did not emit is a route: the SPA's own index answers.
      file = join(root, 'index.html');
      try {
        body = await readFile(file);
      } catch {
        res.writeHead(404).end('not found');
        return;
      }
    }
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  });
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();
  return { base: `http://localhost:${port}`, close: () => new Promise((r) => server.close(r)) };
}
