# 视频转 MP3

纯前端的 MP4 → MP3 转换工具。全部在浏览器本地完成：不需要服务器、不联网、文件不出本机。

用浏览器打开 `index.html` 即可使用（它是自包含的单文件，MP3 编码器已内联）。

- 支持 mp4 / mov / m4a 中的 **AAC 音轨**（浏览器自带解码，覆盖手机拍摄、微信导出等绝大多数文件）
- 文件上限 100 MB
- 码率可选 96 / 128 / 192 / 256 kbps
- 输出文件名沿用原名（`视频.mp4` → `视频.mp3`）

## 开发

- 源码在 `template.html`（含全部界面与逻辑，MP3 编码用 [lamejs](https://github.com/zhuker/lamejs)）
- 改完后运行 `node build.mjs`，把 `lame.min.js` 内联生成 `index.html`
- `node serve.mjs` 可在 http://localhost:8321 起本地预览

## 限制

依赖浏览器的解码能力，冷门音轨编码（如 AC-3）不支持；要兼容那些得换 ffmpeg.wasm 方案（体积大约多 30 MB）。
