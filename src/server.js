import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { SQLiteStore } from './sqlite-store.js';
import { DomainError } from '../docs/domain.js';

const DOCS = resolve(dirname(fileURLToPath(import.meta.url)), '../docs');
const STATIC_FILES = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/index.html',['index.html','text/html; charset=utf-8']],
  ['/styles.css',['styles.css','text/css; charset=utf-8']],
  ['/app.js',['app.js','text/javascript; charset=utf-8']],
  ['/domain.js',['domain.js','text/javascript; charset=utf-8']],
  ['/seed.js',['seed.js','text/javascript; charset=utf-8']]
]);
const HEADERS = {
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'"
};
function json(res,status,data) {
  res.writeHead(status,{...HEADERS,'Content-Type':'application/json; charset=utf-8'});
  res.end(JSON.stringify(data));
}
async function receiveJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new DomainError('Content-Type must be application/json.');
  let size = 0; const parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32768) throw new DomainError('Request too large.');
    parts.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { throw new DomainError('Invalid JSON body.'); }
}
export function createApp(filename=':memory:') {
  const store = new SQLiteStore(filename);
  const server = http.createServer(async(req,res)=>{
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/api/health') return json(res,200,{status:'ok',demo:true});
      if (req.method === 'GET' && path === '/api/state') return json(res,200,store.read());
      if (req.method === 'POST' && path === '/api/commands') {
        const payload = await receiveJson(req);
        const result = store.execute(payload.command,{operationId:payload.operationId,expectedRevision:payload.expectedRevision});
        return json(res,200,result);
      }
      if (req.method === 'POST' && path === '/api/reset') return json(res,200,store.reset());
      if (req.method === 'GET' && STATIC_FILES.has(path)) {
        const [file,mime] = STATIC_FILES.get(path);
        const body = await readFile(join(DOCS,file));
        res.writeHead(200,{...HEADERS,'Content-Type':mime});
        return res.end(body);
      }
      return json(res,404,{error:'Not found',code:'NOT_FOUND'});
    } catch(e) {
      if (e instanceof DomainError) {
        const status = e.code === 'NOT_FOUND' ? 404 : ['CONFLICT','REVISION_CONFLICT','CHRONOLOGY'].includes(e.code) ? 409 : 400;
        return json(res,status,{error:e.message,code:e.code});
      }
      // Keep exception detail out of network responses.
      console.error('Demo request failed:',e);
      return json(res,500,{error:'Internal server error',code:'INTERNAL'});
    }
  });
  server.on('close',()=>store.close());
  return {server,store};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  // Intentionally loopback-only: no auth or production exposure.
  const {server} = createApp(process.env.DEMO_DB_PATH || ':memory:');
  server.listen(port,'127.0.0.1',()=>console.log(`Fictional beekeeping demo: http://127.0.0.1:${port}`));
}
