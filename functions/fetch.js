// 同源下载代理：前端拿不到跨域视频时，由这里代为下载再流式转发。
// 部署在 Cloudflare Pages Functions，路径 /fetch?url=<视频直链>
const MAX_SIZE = 1024 * 1024 * 1024; // 与前端一致：1 GB

export async function onRequestGet({ request }) {
  const target = new URL(request.url).searchParams.get('url');
  if (!target || !/^https?:\/\//i.test(target)) {
    return new Response('missing or invalid url', { status: 400 });
  }
  let upstream;
  try {
    upstream = await fetch(target, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; video2mp3)' },
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
  return new Response(upstream.body, { headers });
}
