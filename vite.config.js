import { defineConfig } from 'vite';
import { cpSync, copyFileSync, createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const TYPES = {
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * saints/ and data/ are content, not source, and live outside Vite's publicDir
 * so that the one-folder contract stays visible at the repo root. This plugin
 * closes the gap: in dev it serves both directories; at build it copies them
 * into dist/ and ships a copy of index.html as 404.html, which is how GitHub
 * Pages serves a single-page app's deep links (/calendar/2026-08-20 has no
 * file behind it; Pages falls through to 404.html, which is the app).
 */
const contentDirs = () => ({
  name: 'gallery-content-dirs',

  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = decodeURIComponent((req.url ?? '').split('?')[0]);
      const top = url.startsWith('/saints/') ? 'saints' : url.startsWith('/data/') ? 'data' : null;
      if (!top) return next();

      // Resolve, then confine to the directory the URL claimed — confining
      // only to the repo root would let /saints/../package.json through.
      const dir = path.join(ROOT, top) + path.sep;
      const file = path.resolve(ROOT, url.slice(1));
      if (!file.startsWith(dir) || !existsSync(file) || !statSync(file).isFile()) {
        res.statusCode = 404;
        return res.end('not found');
      }
      res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
      createReadStream(file).pipe(res);
    });
  },

  closeBundle() {
    cpSync(path.join(ROOT, 'saints'), path.join(ROOT, 'dist/saints'), { recursive: true });
    cpSync(path.join(ROOT, 'data'), path.join(ROOT, 'dist/data'), { recursive: true });
    copyFileSync(path.join(ROOT, 'dist/index.html'), path.join(ROOT, 'dist/404.html'));
  },
});

export default defineConfig({
  // '/' locally; CI sets BASE_PATH to '/<repo>/' for project Pages. A custom
  // domain later means removing the variable from the workflow, nothing else.
  base: process.env.BASE_PATH || '/',
  plugins: [contentDirs()],
});
