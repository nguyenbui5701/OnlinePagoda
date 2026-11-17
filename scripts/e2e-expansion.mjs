import {fork} from 'node:child_process';
import {chromium} from 'playwright';
import {io} from 'socket.io-client';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const phase=Number(process.env.EXPANSION_PHASE||3),out=process.env.ARTIFACT_DIR||`artifacts/expansion/phase${phase}`,port=3160+phase,url=`http://127.0.0.1:${port}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));await mkdir(out,{recursive:true});
async function until(fn,label,timeout=20000){const t=Date.now();while(Date.now()-t<timeout){if(await fn())return;await sleep(90);}throw Error('Timeout '+label);}
let child,browser,socket,state;const report={phase,checks:[],errors:[],fps:[],realLive:'NOT VERIFIED'};
const rpc=(name,data)=>new Promise((ok,bad)=>socket.timeout(6000).emit(name,data,(e,r)=>e?bad(e):r?.ok?ok(r):bad(Error(r?.error||'Rejected'))));
const cmd=data=>rpc('command',data);
const chat=(userId,text)=>cmd({type:'event',event:{type:'chat',userId,nickname:'Khách '+userId,text,eventId:crypto.randomUUID()}});
try{
  try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)});throw Error('Port occupied');}catch(e){if(e.message==='Port occupied')throw e;}
  child=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:process.env.APP_BUILD_DIRECTORY||resolve(`test-results/expansion-phase${phase}`),FIXTURE_PORT:String(port),FIXTURE_DATA_DIRECTORY:resolve(`test-results/expansion-data-${phase}-${Date.now()}`),FORTUNE_VOICE_FIXTURE:'1'},stdio:['ignore','pipe','pipe','ipc']});
  child.stdout.on('data',()=>{});child.stderr.on('data',d=>report.errors.push(String(d)));
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',v=>state=v);socket.on('delta',v=>state=v);await until(()=>state,'snapshot');
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();await context.route('**/*',r=>{if(!['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)){report.errors.push('External request');return r.abort();}return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:576,height:1024});await page.goto(url+'/overlay/?capture=1');await page.waitForFunction(()=>window.__sceneDebug);
  report.hardware=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return {cores:navigator.hardwareConcurrency,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown'};});
  await cmd({type:'settings',patch:{maxActors:100,idleMinutes:30,treeEnabled:phase>=3}});
  await cmd({type:'add',count:100});await sleep(300);await cmd({type:'add',count:10});await cmd({type:'add',count:10});
  await page.waitForFunction(()=>window.__sceneDebug.actors===120);assert.equal(state.room.seated,100);assert.equal(state.room.visibleStanding,20);assert.ok(state.prayerStatus.active<=18);
  await page.screenshot({path:out+'/prayer-rows-576.png'});
  await page.waitForFunction(()=>window.__sceneDebug.welcomes.length===0,{},{timeout:90000});
  let profiler;if(process.env.PROFILE_EXPANSION==='1'){profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.start');}
  for(const [width,height] of [[576,1024],[1080,1920]]){
    await page.setViewportSize({width,height});await sleep(2300);const samples=[];
    for(let i=0;i<3;i++){await sleep(2100);samples.push(await page.evaluate(()=>window.__sceneDebug.fps));}
    const average=samples.reduce((a,b)=>a+b)/samples.length;report.fps.push({width,height,actors:120,surface:'one capture page',samples,average});
    await page.screenshot({path:`${out}/capacity-${width}.png`});
  }
  if(profiler){const {profile}=await profiler.send('Profiler.stop');await writeFile(out+'/capture.cpuprofile',JSON.stringify(profile));await profiler.detach();}
  report.checks.push('100 seats + 20 standing, bounded 18 prayer slots; capture FPS recorded independently at both sizes');
  await chat('guest-101','con xin lạy Phật');await page.waitForFunction(()=>window.__sceneDebug.welcomes.some(w=>w.key.endsWith(':guest-101')));
  await cmd({type:'gift-demo',group:'rose',userId:'guest-102',nickname:'Khách 102',units:2});
  await page.waitForFunction(()=>window.__sceneDebug.ritual?.actorId.endsWith(':guest-102'),{},{timeout:20000});
  await page.waitForFunction(()=>window.__sceneDebug.ritual?.phase==='offer');assert.ok(await page.evaluate(()=>window.__sceneDebug.labels.some(l=>l.key.endsWith(':guest-102'))));
  await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.actors===120);
  assert.equal(state.metrics.giftUnits,2);await page.waitForFunction(()=>!window.__sceneDebug.ritual,{},{timeout:12000});
  if(phase>=2){
    for(const [id,text] of [['guest-103','rồng vàng'],['guest-104','nam mô a di đà phật']])await chat(id,text);
    await page.waitForFunction(()=>window.__communityDebug?.effects.some(e=>e.effect==='dragon')&&window.__communityDebug?.chants>0);
    await page.screenshot({path:out+'/comment-effects.png'});assert.equal(state.metrics.giftUnits,2);
    await page.reload();await page.waitForFunction(()=>window.__communityDebug);assert.ok(await page.evaluate(()=>window.__communityDebug.effects.every(e=>e.expiresAt>Date.now())));
    report.checks.push('Standing visitors trigger free dragon and chant; reload uses server deadlines, no gift scoring');
  }
  if(phase>=3){
    await cmd({type:'settings',patch:{treeEnabled:true,treeTarget:1000}});
    await cmd({type:'event',event:{type:'like',userId:'tree-demo',nickname:'Tim DEMO',likeCount:3500,eventId:'tree-burst'}});
    await page.waitForFunction(()=>window.__treeDebug?.phase==='bloom');
    for(const [width,height] of [[576,1024],[1080,1920]]){await page.setViewportSize({width,height});await page.screenshot({path:`${out}/tree-bloom-${width}.png`});}
    const ends=state.tree.endsAt;await page.reload();await page.waitForFunction(()=>window.__treeDebug);assert.equal(state.tree.endsAt,ends);
    await until(()=>state.tree.phase==='growing','tree reset');assert.equal(state.tree.progress,500);assert.equal(state.tree.completed,3);
    await cmd({type:'settings',patch:{compactGiftPanels:false}});await page.waitForFunction(()=>window.__treeDebug.compact===true);await page.screenshot({path:out+'/tree-full-panels.png'});
    await cmd({type:'settings',patch:{compactGiftPanels:true,lanternEnabled:true}});await chat('guest-105','xin quẻ gia đình');await chat('guest-106','hoa đăng cha mẹ');
    await page.waitForFunction(()=>window.__fortuneDebug.visible);assert.equal(await page.evaluate(()=>window.__lanternDebug.visible),false);
    await page.waitForFunction(()=>window.__lanternDebug.visible&&!window.__fortuneDebug.visible,{},{timeout:20000});
    await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_expansion'});await until(()=>state.connection.status==='LIVE_CONNECTED','fake LIVE');
    const room=state.connection.roomId;
    await rpc('fixture',{event:'like',payload:{user:{id:'likes',nickname:'Test'},count:1000,common:{roomId:room,msgId:'real-shape'}}});
    await until(()=>state.tree.phase==='bloom','LIVE shape tree');
    await rpc('fixture',{event:'like',payload:{user:{id:'likes',nickname:'Test'},count:1000,common:{roomId:room,msgId:'real-shape'}}});
    await sleep(300);assert.equal(state.tree.total,1000);
    const liveSession=state.sessionId,treeEnd=state.tree.endsAt;
    await cmd({type:'live-disconnect'});await cmd({type:'live-connect',username:'fixture_expansion'});await until(()=>state.connection.status==='LIVE_CONNECTED','same-room reconnect');
    assert.equal(state.sessionId,liveSession);assert.equal(state.tree.total,1000);assert.equal(state.tree.endsAt,treeEnd);
    await rpc('fixture',{event:'chat',payload:{user:{id:'live-comment',nickname:'Khách LIVE giả lập'},content:'con xin lạy Phật',common:{roomId:room,msgId:'bow-live'}}});
    await until(()=>state.prayerStatus.active>0,'LIVE bow');
    await cmd({type:'settings',patch:{commentEffectsEnabled:false,treeEnabled:false}});await until(()=>!state.tree.enabled,'disable tree');
    await rpc('fixture',{event:'like',payload:{user:{id:'likes'},count:1000,common:{roomId:room,msgId:'disabled'}}});await sleep(200);assert.equal(state.tree.total,0);
    await cmd({type:'settings',patch:{treeEnabled:true,commentEffectsEnabled:true}});
    await cmd({type:'live-connect',username:'fixture_other'});await until(()=>state.connection.roomId!==room,'change room');assert.equal(state.tree.total,0);
    report.checks.push('3500 likes -> one bloom, three milestones and 500 remainder; reload, legacy panels, fortune/lantern alternation, real mapper shape, dedupe and room reset');
  }
  const dashboard=await context.newPage();dashboard.on('pageerror',e=>report.errors.push(e.message));await dashboard.setViewportSize({width:1440,height:1000});await dashboard.goto(url+'/dashboard/');await dashboard.locator('#community-settings').waitFor();await dashboard.locator('#community-settings').screenshot({path:out+'/dashboard.png'});
  assert.deepEqual(report.errors,[]);assert.ok(report.fps.every(f=>f.average>=24),'Capture FPS below 24; functional checks above completed independently');report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{socket?.disconnect();await browser?.close();if(child&&child.exitCode===null){if(child.connected)child.send('shutdown');await Promise.race([new Promise(r=>child.once('exit',r)),sleep(5000)]);if(child.exitCode===null)child.kill();}await writeFile(out+'/e2e-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
