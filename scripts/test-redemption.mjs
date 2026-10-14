import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createPublicKey, verify } from 'node:crypto';
const context=JSON.parse(await readFile('private/test-context.json','utf8'));
const base='/CounterKeep-Web/';
const origin='https://fguzman-stack.github.io';
const browser=await chromium.launch();
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.xml':'application/xml','.txt':'text/plain'};
await mkdir('test-results',{recursive:true});
try{
  // Serve the actual build under the eventual production origin during preflight.
  // Supabase is NOT mocked: the four QA redemptions hit the deployed service.
  for(const language of ['en','es']) for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:1000},acceptDownloads:true});
    if(!process.env.LIVE_SITE) await page.route(`${origin}${base}**`,async route=>{
      const relative=new URL(route.request().url()).pathname.slice(base.length);
      const safe=resolve('dist',relative.endsWith('/')?relative+'index.html':relative||'index.html');
      if(!safe.startsWith(resolve('dist')+'/') && !safe.startsWith(resolve('dist')+'\\')){await route.abort();return;}
      try{await route.fulfill({status:200,contentType:types[extname(safe)]||'application/octet-stream',body:await readFile(safe)});}
      catch{await route.fulfill({status:404,body:'Not found'});}
    });
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${origin}${base}${language==='es'?'es/':''}activate-ck-8f42b19e/`,{waitUntil:'networkidle'});
    assert.match(await page.locator('meta[name=robots]').getAttribute('content'),/noindex/);
    assert.equal(await page.locator('nav').count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1);
    await page.screenshot({path:`test-results/redemption-${language}-${width}.png`,fullPage:true});
    await page.locator('#redeem-email').fill('qa-web@example.com');
    await page.locator('#redeem-code').fill(context.codes.web);
    await page.locator('#redeem-device').fill('5'.repeat(64));
    await page.getByRole('checkbox').check();
    await page.locator('button[type=submit]').click();
    await page.locator('#download-license:not([hidden])').waitFor({timeout:25000});
    const event=page.waitForEvent('download');await page.locator('#download-license').click();
    const download=await event;const file=await download.path();const token=JSON.parse(await readFile(file,'utf8'));
    const key=createPublicKey({key:{kty:'OKP',crv:'Ed25519',x:context.publicKey},format:'jwk'});
    assert.ok(verify(null,Buffer.from('CounterKeep/license/v1\n'+token.payload),key,Buffer.from(token.signature,'base64url')));
    const claims=JSON.parse(Buffer.from(token.payload,'base64url').toString('utf8'));
    assert.equal(claims.deviceId,'5'.repeat(64));assert.equal(claims.email,'qa-web@example.com');
    assert.equal(await page.locator('#redeem-code').inputValue(),'');
    assert.ok(!page.url().includes(context.codes.web));
    await page.locator('#redeem-device').fill('6'.repeat(64));
    assert.equal(await page.locator('#download-license').isVisible(),false);
    assert.deepEqual(errors,[]);
    await page.close();
  }
  for(const path of ['dist/index.html','dist/es/index.html','dist/sitemap.xml']) assert.ok(!(await readFile(path,'utf8')).includes('activate-ck-8f42b19e'),'Redemption must not appear in marketing navigation or sitemap');
  console.log('PASS: direct-link redemption in English/Spanish at desktop/mobile sizes, real backend, signed file download, noindex, no menu links, no URL credential leakage and form-state reset.');
}finally{await browser.close();}
