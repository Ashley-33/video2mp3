import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
const root = path.dirname(new URL(import.meta.url).pathname);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// 与 functions/fetch.js 保持同一套逻辑
function isPageLink(url) {
  try {
    const h = new URL(url).hostname;
    return /(^|\.)xiaohongshu\.com$/i.test(h) || /(^|\.)xhslink\.com$/i.test(h);
  } catch { return false; }
}
function extractVideo(html) {
  const m = html.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i)
         || html.match(/"masterUrl"\s*:\s*"([^"]+)"/);
  if (!m) return null;
  let v = m[1].replace(/\\u002F/gi, '/').replace(/&amp;/g, '&');
  if (v.startsWith('//')) v = 'https:' + v;
  if (v.startsWith('http://')) v = 'https://' + v.slice(7);
  return v;
}
function extractTitle(html) {
  const m = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  if (!m) return null;
  return m[1].replace(/\s*-\s*小红书\s*$/, '').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || null;
}

http.createServer((req, res) => {
  // 本地版下载代理，与 functions/fetch.js 行为一致
  if (req.url.startsWith('/fetch?')) {
    const target = new URL(req.url, 'http://localhost').searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) { res.writeHead(400); res.end('bad url'); return; }
    (async () => {
      let videoUrl = target, filename = null;
      if (isPageLink(target)) {
        const page = await fetch(target, { redirect: 'follow', headers: { 'User-Agent': UA } });
        if (!page.ok) { res.writeHead(502); res.end('page status ' + page.status); return; }
        const html = await page.text();
        const v = extractVideo(html);
        if (!v) { res.writeHead(502); res.end('no video found in page'); return; }
        videoUrl = v;
        const t = extractTitle(html);
        if (t) filename = t + '.mp4';
      }
      const up = await fetch(videoUrl, { redirect: 'follow', headers: { 'User-Agent': UA } });
      if (!up.ok || !up.body) { res.writeHead(502); res.end('upstream ' + up.status); return; }
      const headers = { 'Content-Type': up.headers.get('content-type') || 'application/octet-stream' };
      const len = up.headers.get('content-length');
      if (len) headers['Content-Length'] = len;
      if (filename) headers['X-Filename'] = encodeURIComponent(filename);
      res.writeHead(200, headers);
      Readable.fromWeb(up.body).pipe(res);
    })().catch(() => { res.writeHead(502); res.end('fetch failed'); });
    return;
  }
  const file = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
    res.end(data);
  });
}).listen(8321, () => console.log('listening on 8321'));
