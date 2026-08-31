import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
const root = path.dirname(new URL(import.meta.url).pathname);

http.createServer((req, res) => {
  // 本地版下载代理，与 functions/fetch.js 行为一致
  if (req.url.startsWith('/fetch?')) {
    const target = new URL(req.url, 'http://localhost').searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) { res.writeHead(400); res.end('bad url'); return; }
    fetch(target, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; video2mp3)' } })
      .then(up => {
        if (!up.ok || !up.body) { res.writeHead(502); res.end('upstream ' + up.status); return; }
        const headers = { 'Content-Type': up.headers.get('content-type') || 'application/octet-stream' };
        const len = up.headers.get('content-length');
        if (len) headers['Content-Length'] = len;
        res.writeHead(200, headers);
        Readable.fromWeb(up.body).pipe(res);
      })
      .catch(() => { res.writeHead(502); res.end('fetch failed'); });
    return;
  }
  const file = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
    res.end(data);
  });
}).listen(8321, () => console.log('listening on 8321'));
