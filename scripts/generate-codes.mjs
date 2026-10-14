import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

// Private, local output only. Never write purchase credentials under public/.
const count=Number(process.env.CODE_COUNT || 1000);
if(!Number.isInteger(count) || count<1000 || count>10000) throw new Error('Choose 1000–10000 codes, then verify the current AppSumo upload limits');
const dir=resolve('private'); await mkdir(dir,{recursive:true});
const csv=resolve(dir,'counterkeep-appsumo-codes.csv');
try { await access(csv); throw new Error('A codes batch already exists. Do not regenerate or replace an uploaded batch.'); } catch(error) { if(error.code!=='ENOENT') throw error; }
const codes=new Set(); while(codes.size<count) codes.add(`CK-${randomBytes(24).toString('hex').toUpperCase()}`);
const hashes=[...codes].map(code=>createHash('sha256').update(code).digest('hex'));
const batch='appsumo-232349-batch-01';
await writeFile(csv,`code\r\n${[...codes].join('\r\n')}\r\n`,{mode:0o600,flag:'wx'});
await writeFile(resolve(dir,'code-hashes.json'),JSON.stringify({batch,hashes}),{mode:0o600,flag:'wx'});
await writeFile(resolve(dir,'batch-manifest.json'),JSON.stringify({batch,count,submissionId:232349,codeLength:51,format:'^[A-Za-z0-9_-]{3,200}$',entropyBits:192,csvSha256:createHash('sha256').update(await import('node:fs/promises').then(fs=>fs.readFile(csv))).digest('hex')},null,2),{mode:0o600,flag:'wx'});
console.log(`Generated ${count} distinct, 51-character AppSumo-compatible codes. Private CSV and SHA-256 hashes saved under private/. No codes printed.`);
