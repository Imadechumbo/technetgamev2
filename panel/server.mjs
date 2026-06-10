import http from 'http'; import fs from 'fs'; import path from 'path'; import url from 'url';
const __dirname=path.dirname(url.fileURLToPath(import.meta.url)); const root=path.resolve(__dirname,'..'); const PORT=process.env.PORT||4177;
const server=http.createServer((req,res)=>{const p=req.url==='/'?'/panel/index.html':req.url; const full=path.join(root,p); if(fs.existsSync(full)&&fs.statSync(full).isFile()){const ext=path.extname(full); const t={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json'}; res.writeHead(200,{'Content-Type':t[ext]||'text/plain'}); res.end(fs.readFileSync(full)); return;} res.writeHead(404); res.end('not found');});
server.listen(PORT,()=>console.log(`TechNet AI Dashboard em http://localhost:${PORT}`));
