import {fork} from 'node:child_process';
import {chromium} from 'playwright';
import {io} from 'socket.io-client';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const out=process.env.ARTIFACT_DIR||'artifacts/welcome-feedback',port=3157,url=`http://127.0.0.1:${port}`;
await mkdir(out,{recursive:true});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=18000){const t=Date.now();while(Date.now()-t<timeout){if(await fn())return;await sleep(70);}throw Error('Timeout '+label);}
const report={kind:'DEMO and TikTok fixture only',checks:[],errors:[],realLive:'NOT VERIFIED'};
let child,browser,socket,state;const actions=[];
const rpc=(event,data)=>new Promise((done,fail)=>socket.timeout(5000).emit(event,data,(e,r)=>e?fail(e):r?.ok?done(r):fail(Error(r?.error||'Rejected'))));
const cmd=c=>rpc('command',c);
const chat=(id,text)=>cmd({type:'event',event:{type:'chat',userId:id,nickname:'An Nhiên '+id,text,eventId:crypto.randomUUID()}});
try{
  try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)});throw Error('Port occupied');}catch(e){if(e.message==='Port occupied')throw e;}
  child=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:process.env.APP_BUILD_DIRECTORY||resolve('test-results/welcome-feedback-dist'),FIXTURE_PORT:String(port),FIXTURE_DATA_DIRECTORY:resolve(`test-results/welcome-${Date.now()}`),FORTUNE_VOICE_FIXTURE:'1'},stdio:['ignore','pipe','pipe','ipc']});
  let stderr='';child.stderr.on('data',v=>stderr+=v);child.stdout.on('data',()=>{});
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',v=>state=v);socket.on('delta',v=>{state=v;actions.push(...v.actions);});await until(()=>state,'snapshot');
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();await context.route('**/*',r=>{if(!['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)){report.errors.push('External request');return r.abort();}return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:576,height:1024});await page.goto(url+'/overlay/?capture=1');await page.waitForFunction(()=>window.__sceneDebug?.welcomes);
  await chat('one','Mình mới ghé thăm');await page.waitForFunction(()=>window.__sceneDebug.welcomes.some(w=>w.phase==='approach'));await sleep(500);await page.screenshot({path:out+'/welcome-approach.png'});
  await page.waitForFunction(()=>window.__sceneDebug.welcomes.some(w=>w.phase==='pray'));await page.screenshot({path:out+'/welcome-pray.png'});
  const visit=await page.evaluate(()=>window.__sceneDebug.welcomes[0]);await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.welcomes.length===1);
  const resumed=await page.evaluate(()=>window.__sceneDebug.welcomes[0]);assert.equal(resumed.key,visit.key);assert.notEqual(resumed.phase,'approach');
  await page.waitForFunction(()=>window.__sceneDebug.welcomes.some(w=>w.phase==='return'));await page.screenshot({path:out+'/welcome-return.png'});
  await page.waitForFunction(()=>window.__sceneDebug.welcomes.length===0&&window.__sceneDebug.states.every(s=>s==='idle'));
  assert.equal(state.metrics.giftUnits,0);assert.equal(state.metrics.giftTransactions,0);assert.equal(state.ritual,undefined);
  assert.equal(actions.filter(a=>a.type==='GIFT_CONFIRMED'||a.type==='GIFT_THANKS').length,0);
  report.checks.push('First visit approaches urn, bows, returns to reserved seat; reload resumes; no gift points/voice actions');
  await cmd({type:'gift-demo',group:'rose',userId:'one',nickname:'An Nhiên one',units:1});await until(()=>state.ritual,'gift ritual');
  await chat('fortune','xin quẻ gia đình');await page.waitForFunction(()=>window.__fortuneDebug.visible);
  await page.waitForFunction(()=>window.__sceneDebug.ritual?.phase==='offer'&&window.__sceneDebug.camera.scale>1.2);
  const donor=await page.evaluate(()=>{const d=window.__sceneDebug;return d.labels.find(l=>l.key===d.ritual.actorId);});assert.ok(donor);assert.equal(donor.name,'An Nhiên one');
  const card=await page.evaluate(()=>window.__fortuneDebug.bounds);assert.ok(donor.y+donor.height<card.y,'Donor label is above compact card');
  for(const [width,height] of [[576,1024],[1080,1920]]){await page.setViewportSize({width,height});await page.screenshot({path:`${out}/donor-name-${width}.png`});}
  await cmd({type:'settings',patch:{showLabels:false}});await page.waitForFunction(()=>window.__sceneDebug.labels.length===0);
  await cmd({type:'settings',patch:{showLabels:true}});await page.waitForFunction(()=>window.__sceneDebug.labels.some(l=>l.key===window.__sceneDebug.ritual?.actorId));
  await page.waitForFunction(()=>!window.__sceneDebug.ritual);
  assert.equal(state.metrics.giftUnits,1);report.checks.push('Donor name visible throughout offer/zoom, above card, obeys showLabels; gifts still score once');
  await page.waitForFunction(()=>window.__sceneDebug.welcomes.length===0);
  await cmd({type:'reset'});await until(()=>state.total===0,'reset');
  const before=actions.length;await cmd({type:'add',count:10});await until(()=>state.total===10,'ten demo guests');
  const greetings=actions.slice(before).filter(a=>a.type==='CHAT_BUBBLE').map(a=>a.bubble.text);assert.ok(new Set(greetings).size>=8);
  await page.waitForFunction(()=>window.__sceneDebug.welcomes.filter(w=>w.phase==='waiting').length===4);
  assert.ok((await page.evaluate(()=>window.__sceneDebug.welcomes.filter(w=>w.phase!=='waiting').length))<=6);
  await cmd({type:'gift-demo',group:'rose',userId:'guest-1',nickname:'An Nhiên 1',units:2});
  await page.waitForFunction(()=>window.__sceneDebug.ritual?.actorId.endsWith(':guest-1'));
  assert.ok((await page.evaluate(()=>window.__sceneDebug.welcomes)).every(w=>w.phase==='waiting'));
  await page.waitForFunction(()=>!window.__sceneDebug.ritual,{},{timeout:12000});await page.waitForFunction(()=>window.__sceneDebug.welcomes.some(w=>w.phase!=='waiting'));
  report.checks.push('Ten DEMO guests use varied greetings; six-person batches, gifts take next altar turn without interrupting a batch');
  await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_welcome'});await until(()=>state.connection.status==='LIVE_CONNECTED','LIVE fixture');
  const actual='Bình luận thật của người xem';const room=state.connection.roomId;
  await rpc('fixture',{event:'chat',payload:{user:{id:'live-one',nickname:'Khách LIVE'},content:actual,common:{roomId:room,msgId:'welcome-live'}}});
  await until(()=>actions.some(a=>a.type==='CHAT_BUBBLE'&&a.bubble.text===actual),'unmodified live text');
  await page.waitForFunction(()=>window.__sceneDebug.welcomes.length===1);assert.equal(state.metrics.giftUnits,0);
  await cmd({type:'live-connect',username:'fixture_other'});await until(()=>state.connection.roomId!==room,'other room');await page.waitForFunction(()=>window.__sceneDebug.welcomes.length===0);
  report.checks.push('LIVE fixture preserves actual comment and uses welcome route; changing rooms clears visits');
  assert.deepEqual(report.errors,[]);assert.equal(stderr,'');report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{socket?.disconnect();await browser?.close();if(child&&child.exitCode===null){if(child.connected)child.send('shutdown');await Promise.race([new Promise(r=>child.once('exit',r)),sleep(5000)]);if(child.exitCode===null)child.kill();}await writeFile(out+'/e2e-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
