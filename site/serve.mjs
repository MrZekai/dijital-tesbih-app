import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.png':'image/png'};
http.createServer(async (req,res) => {
  try {
    const requested = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file = path.resolve(root,'.'+requested);
    if (file !== root && !file.startsWith(root+path.sep)) { res.writeHead(403); res.end(); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file,'index.html');
    const bytes = await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(bytes);
  } catch { res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}); res.end('404 — Page not found'); }
}).listen(port,'127.0.0.1',()=>console.log(`Preview: http://localhost:${port}/tr/`));
