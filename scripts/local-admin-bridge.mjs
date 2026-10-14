import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Temporary loopback-only transport for MCP. Reject browser origins and require
// a custom header so a cross-site page cannot read or mutate these local files.
// No CORS, no arbitrary file paths, no network credentials, no code logging.
const files={
  '/code-hashes': ['private/code-hashes.json','application/json'],
  '/codes-csv': ['private/counterkeep-appsumo-codes.csv','text/csv'],
  '/migration': ['supabase/migrations/202610140001_counterkeep_licensing.sql','text/plain'],
  '/edge-source': ['supabase/functions/counterkeep-license/index.ts','text/plain'],
  '/test-context': ['private/test-context.json','application/json'],
};
const server=createServer(async(req,res)=>{
  if(req.headers.origin || req.headers['x-counterkeep-local-admin']!=='1'){res.writeHead(403).end();return;}
  if(req.method==='POST' && req.url==='/upload-ticket') {
    try {
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413).end();return;}chunks.push(chunk);}
      const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(typeof value.ticket!=='string'){res.writeHead(400).end();return;}
      await writeFile(resolve('private/appsumo-upload-ticket.json'),JSON.stringify(value),{mode:0o600});
      res.writeHead(204,{'Cache-Control':'no-store'}).end();
    } catch {res.writeHead(400).end();}
    return;
  }
  if(req.method!=='GET' || !files[req.url]){res.writeHead(404).end();return;}
  try { const [path,type]=files[req.url];const body=await readFile(resolve(path));res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(body); }
  catch { res.writeHead(404).end(); }
});
server.listen(18437,'127.0.0.1',()=>console.log('CounterKeep local admin bridge listening on loopback port 18437. Stop after provisioning/upload.'));
const timeout=setTimeout(()=>server.close(),60*60*1000);timeout.unref();
process.on('SIGINT',()=>server.close());
