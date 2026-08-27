// 把 lame.min.js 内联进 template.html，生成自包含的 index.html
import fs from 'node:fs';
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const tpl = fs.readFileSync(path.join(root, 'template.html'), 'utf8');
const lame = fs.readFileSync(path.join(root, 'lame.min.js'), 'utf8');
const out = tpl.replace('<script src="__LAME__"></script>', '<script>\n' + lame + '\n</script>');
if (out === tpl) { console.error('marker not found'); process.exit(1); }
fs.writeFileSync(path.join(root, 'index.html'), out);
console.log('index.html bytes:', out.length);
