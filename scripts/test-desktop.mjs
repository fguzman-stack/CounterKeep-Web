import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const executable=process.env.PRODUCT_EXECUTABLE || 'C:/Users/holam/Documents/02_Proyectos/apps de escritorio/CounterKeep/src-tauri/target/release/counterkeep.exe';
const context=JSON.parse(await readFile('private/test-context.json','utf8'));
const revoked=process.argv.includes('--check-revoked');
await mkdir('test-results',{recursive:true});
const profile=resolve('test-results/native-webview-profile');
const child=spawn(executable,[],{env:{...process.env,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9224',WEBVIEW2_USER_DATA_FOLDER:profile},stdio:'ignore'});
let browser;
try{
  const deadline=Date.now()+45000;
  while(Date.now()<deadline){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9224');break;}catch{await new Promise(r=>setTimeout(r,500));}}
  if(!browser)throw Error('Native WebView could not be attached for the release smoke test');
  const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost')) || browser.contexts()[0].pages()[0];
  await page.locator('#license-device').waitFor({timeout:20000});
  const invoke=(command,args={})=>page.evaluate(async({command,args})=>{
    try{return{ok:true,value:await window.__TAURI_INTERNALS__.invoke(command,args)};}
    catch(error){return{ok:false,error:typeof error==='string'?error:String(error)};}
  },{command,args});
  const initial=await invoke('license_status',{checkOnline:false});
  assert.ok(initial.ok);assert.equal(initial.value.required,true,'Release builds must require a license');
  const deviceId=initial.value.deviceId;assert.match(deviceId,/^[a-f0-9]{64}$/);
  if(revoked){
    assert.equal(initial.value.active,false);assert.equal(initial.value.error,'license.revoked');
    const rejected=await invoke('license_import',{content:await readFile('private/native-test.cklicense','utf8')});
    assert.equal(rejected.ok,false);assert.equal(rejected.error,'license.revoked');
    const denied=await invoke('database_query',{request:{query:'SELECT 1',values:[],select:true,context:'a'.repeat(32)}});
    assert.equal(denied.ok,false);assert.equal(denied.error,'license.revoked');
    await page.screenshot({path:'test-results/native-revoked.png'});
    console.log('PASS: the installed release detects revocation and blocks file re-import and native database access.');
  }else{
    assert.equal(initial.value.active,false,'Abort rather than overwrite an existing active user license');
    assert.equal(initial.value.licenseId,null);
    const denied=await invoke('database_query',{request:{query:'SELECT 1',values:[],select:true,context:'a'.repeat(32)}});
    assert.equal(denied.ok,false);assert.equal(denied.error,'license.required');
    const plugin=await invoke('plugin:sql|execute',{db:'sqlite:counterkeep.db',query:'SELECT 1',values:[]});
    assert.equal(plugin.ok,false,'Raw SQL plugin writes must not bypass native license checks');
    const malformed=await invoke('license_import',{content:'{}'});assert.equal(malformed.ok,false);assert.equal(malformed.error,'license.invalidFile');
    const wrongDevice=await invoke('license_import',{content:await readFile('private/backend-test.cklicense','utf8')});
    assert.equal(wrongDevice.ok,false);assert.equal(wrongDevice.error,'license.wrongDevice');
    await page.screenshot({path:'test-results/native-activation.png'});
    const activated=await invoke('license_activate',{code:context.codes.native,email:'qa-native@example.com'});
    assert.ok(activated.ok,`Native activation failed: ${activated.error||'unknown'}`);assert.equal(activated.value.active,true);
    const local=await invoke('license_status',{checkOnline:false});assert.equal(local.value.active,true,'Local signature verification does not require a network check');
    const response=await fetch(context.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'redeem',code:context.codes.native,email:'qa-native@example.com',deviceId})});
    assert.equal(response.status,200);
    await writeFile('private/native-test.cklicense',JSON.stringify((await response.json()).license),{mode:0o600});
    await writeFile('private/native-test-result.json',JSON.stringify({passed:true,licenseId:activated.value.licenseId,deviceId,email:'qa-native@example.com',executable,cases:['release requires activation','native database gate','SQL plugin bypass blocked','invalid file rejected','other device rejected','native HTTPS activation','local signature verification']},null,2),{mode:0o600});
    console.log('PASS: release build activation, native DB gating, SQL ACL, file validation, device binding, HTTPS redemption and offline signature verification. No business database was opened or modified.');
  }
}finally{
  if(browser)await browser.close().catch(()=>{});
  // Terminate only the process this test spawned, including its WebView children.
  if(child.pid) await new Promise(resolve=>{const stop=spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});stop.on('exit',resolve);stop.on('error',resolve);});
}
