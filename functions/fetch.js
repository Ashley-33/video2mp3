// 同源下载代理：前端拿不到跨域视频时，由这里代为下载再流式转发。
// 支持两类 url：视频文件直链，以及小红书笔记页链接（服务端抓页面、
// 从 og:video / masterUrl 里解析出真实视频地址再下载）。
// 部署在 Cloudflare Pages Functions，路径 /fetch?url=<链接>
const MAX_SIZE = 1024 * 1024 * 1024; // 与前端一致：1 GB
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

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

export async function onRequestGet({ request }) {
  const target = new URL(request.url).searchParams.get('url');
  if (!target || !/^https?:\/\//i.test(target)) {
    return new Response('missing or invalid url', { status: 400 });
  }
  let videoUrl = target, filename = null;
  if (isPageLink(target)) {
    let page;
    try {
      page = await fetch(target, { redirect: 'follow', headers: { 'User-Agent': UA } });
    } catch {
      return new Response('page unreachable', { status: 502 });
    }
    if (!page.ok) return new Response('page status ' + page.status, { status: 502 });
    const html = await page.text();
    const v = extractVideo(html);
    if (!v) return new Response('no video found in page', { status: 502 });
    videoUrl = v;
    const t = extractTitle(html);
    if (t) filename = t + '.mp4';
  }
  let upstream;
  try {
    upstream = await fetch(videoUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': UA },
    });
  } catch {
    return new Response('upstream unreachable', { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response('upstream status ' + upstream.status, { status: 502 });
  }
  const len = upstream.headers.get('content-length');
  if (len && parseInt(len, 10) > MAX_SIZE) {
    return new Response('file too large', { status: 413 });
  }
  const headers = {
    'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
  };
  if (len) headers['Content-Length'] = len;
  if (filename) headers['X-Filename'] = encodeURIComponent(filename);
  return new Response(upstream.body, { headers });
}
