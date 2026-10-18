// Serves the admin e2e build (/dist) on localhost:5273 with SPA fallback, like `vite preview`.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json' };
http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join('/dist', p);
  let body;
  try { body = await readFile(file); } catch { file = '/dist/index.html'; body = await readFile(file); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  res.end(body);
}).listen(5273);
