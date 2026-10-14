// No client-visible Supabase keys. All privileged RPCs use the built-in service
// credential inside Supabase's Edge runtime; do not log bodies or key material.
const ORIGINS = new Set(['https://fguzman-stack.github.io']);
const PREFIX = 'CounterKeep/license/v1\n';
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function decode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4-value.length%4)%4)), c => c.charCodeAt(0));
}
async function sha(value: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)))].map(b => b.toString(16).padStart(2,'0')).join('');
}
async function rpc(name: string, args: Record<string, unknown> = {}): Promise<any> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify(args), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Database unavailable');
  return await response.json();
}
let keyPromise: Promise<any> | undefined;
async function keys(): Promise<any> {
  if (!keyPromise) {
    keyPromise = (async () => {
      let stored = await rpc('counterkeep_signing_key');
      if (!stored) {
        const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']) as CryptoKeyPair;
        const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
        const publicKey = encode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
        stored = await rpc('counterkeep_signing_key', { p_private_jwk: privateJwk, p_public_key: publicKey });
      }
      return {
        kid: stored.kid, publicKey: stored.publicKey,
        signer: await crypto.subtle.importKey('jwk', stored.privateJwk, { name: 'Ed25519' }, false, ['sign']),
        verifier: await crypto.subtle.importKey('raw', decode(stored.publicKey), { name: 'Ed25519' }, false, ['verify']),
      };
    })();
    keyPromise.catch(() => { keyPromise = undefined; });
  }
  return await keyPromise;
}
function response(req: Request, status: number, data: unknown): Response {
  const headers: Record<string,string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' };
  const origin = req.headers.get('origin');
  if (origin && ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(data), { status, headers });
}
async function readBody(req: Request): Promise<any> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('Invalid request');
  const reader = req.body?.getReader();
  if (!reader) throw new Error('Invalid request');
  const chunks: Uint8Array[] = []; let size=0;
  try {
    for (;;) { const {done,value}=await reader.read(); if (done) break; size+=value.length; if(size>8192) { await reader.cancel(); throw new Error('Invalid request'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size); let offset=0; for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(dec.decode(body));
}

Deno.serve(async req => {
  const origin = req.headers.get('origin');
  if (origin && !ORIGINS.has(origin)) return response(req,403,{error:'origin_not_allowed'});
  if (req.method==='OPTIONS') return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin||'https://fguzman-stack.github.io','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600',Vary:'Origin'}});
  if (req.method==='GET') {
    try { const k=await keys(); return response(req,200,{product:'CounterKeep',kid:k.kid,publicKey:k.publicKey,algorithm:'Ed25519',version:1}); }
    catch { return response(req,503,{error:'service_unavailable'}); }
  }
  if (req.method!=='POST') return response(req,405,{error:'method_not_allowed'});
  let body: any;
  try { body=await readBody(req); } catch { return response(req,400,{error:'invalid_request'}); }
  if (!body || typeof body!=='object' || Array.isArray(body)) return response(req,400,{error:'invalid_request'});
  const mode=body.mode;
  if (mode!=='redeem' && mode!=='check') return response(req,400,{error:'invalid_request'});
  const deviceId=typeof body.deviceId==='string' ? body.deviceId.trim().toLowerCase() : '';
  if(!/^[a-f0-9]{64}$/.test(deviceId)) return response(req,400,{error:'invalid_request'});
  try {
    const ip=req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown';
    if(!await rpc('counterkeep_rate_limit',{p_ip_hash:await sha(`CounterKeep/IP/${ip}`),p_device_hash:deviceId})) return response(req,429,{error:'rate_limited'});
    const k=await keys();
    if(mode==='redeem') {
      const code=typeof body.code==='string' ? body.code.trim() : '';
      const email=typeof body.email==='string' ? body.email.trim().toLowerCase() : '';
      if(!/^[A-Za-z0-9_-]{3,200}$/.test(code) || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response(req,400,{error:'invalid_request'});
      const record=await rpc('counterkeep_redeem',{p_code_hash:await sha(code),p_email:email,p_device_id:deviceId});
      if(!record) return response(req,409,{error:'invalid_or_unavailable_code'});
      const payload=encode(enc.encode(JSON.stringify({v:1,product:'CounterKeep',licenseId:record.id,plan:'lifetime-1',devices:1,deviceId:record.deviceId,email:record.email,issuedAt:record.issuedAt,kid:k.kid})));
      const signature=encode(new Uint8Array(await crypto.subtle.sign('Ed25519',k.signer,enc.encode(PREFIX+payload))));
      return response(req,200,{license:{algorithm:'Ed25519',payload,signature}});
    }
    const token=body.license;
    if(!token || token.algorithm!=='Ed25519' || typeof token.payload!=='string' || typeof token.signature!=='string' || token.payload.length>2048 || token.signature.length!==86) return response(req,400,{error:'invalid_license'});
    let claims: any;
    try {
      if(!await crypto.subtle.verify('Ed25519',k.verifier,decode(token.signature),enc.encode(PREFIX+token.payload))) throw new Error('Invalid');
      claims=JSON.parse(dec.decode(decode(token.payload)));
      if(claims.product!=='CounterKeep' || claims.v!==1 || claims.kid!==k.kid || claims.deviceId!==deviceId || claims.plan!=='lifetime-1' || claims.devices!==1 || !/^[a-f0-9-]{36}$/.test(claims.licenseId)) throw new Error('Invalid');
    } catch { return response(req,400,{error:'invalid_license'}); }
    const state=await rpc('counterkeep_license_state',{p_id:claims.licenseId,p_device_id:deviceId});
    return response(req,200,{state:state==='active'?'active':'revoked'});
  } catch { return response(req,503,{error:'service_unavailable'}); }
});
