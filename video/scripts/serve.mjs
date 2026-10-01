// Serves the exported web build (video/.app) with the cross-origin isolation
// headers Expo SQLite needs on the web, falling back to index.html for routes.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.app');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
};

async function resolveFile(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^[/\\]+/, '');
  const candidate = path.join(ROOT, clean);
  if (!candidate.startsWith(ROOT)) return null;
  try {
    if ((await stat(candidate)).isFile()) return candidate;
  } catch {
    // fall through to the SPA entry
  }
  return path.join(ROOT, 'index.html');
}

export function startServer(port = Number(process.env.PORT ?? 8090)) {
  const server = http.createServer(async (request, response) => {
    const file = await resolveFile(request.url ?? '/');
    if (!file) {
      response.writeHead(403).end();
      return;
    }
    response.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'cross-origin-embedder-policy': 'require-corp',
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const server = await startServer();
  console.log(`Cykla build served at http://localhost:${server.address().port}`);
}
