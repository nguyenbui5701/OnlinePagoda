import { fork } from 'node:child_process';
import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const out=process.env.ARTIFACT_DIR||'artifacts/live-experience';
const build=resolve(process.env.APP_BUILD_DIRECTORY||'test-results/live-experience-dist');
const baseline=resolve('test-results/live-experience-baseline');
const port=3156,url=`http://127.0.0.1:${port}`;
await mkdir(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=20000){const at=Date.now();while(Date.now()-at<timeout){if(await fn())return;await sleep(80);}throw Error('Timeout: '+label);}
const report={kind:'DEMO / LIVE fixture only',checks:[],errors:[],fps:[],realLive:'NOT VERIFIED',phone:'NOT VERIFIED',videoAudio:'Silent visual recording; audio tested separately with fixture'};
let server,browser,socket,state,serverErrors='';
const rpc=(event,data)=>new Promise((done,fail)=>socket.timeout(6000).emit(event,data,(e,r)=>e?fail(e):r?.ok?done(r):fail(Error(r?.error||'Rejected'))));
const cmd=data=>rpc('command',data).catch(e=>{throw Error(`${e.message} (${JSON.stringify(data)})`);});
const chat=(id,text='Xin chào',eventId=crypto.randomUUID())=>cmd({type:'event',event:{type:'chat',userId:id,nickname:'Khách '+id,text,eventId}});
async function stop(){
  socket?.disconnect();socket=undefined;await browser?.close();browser=undefined;
  if(server&&server.exitCode===null){if(server.connected)server.send('shutdown');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);if(server.exitCode===null)server.kill();}
  server=undefined;state=undefined;
}
async function boot(directory){
  try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)});throw Error('Test port occupied; refusing to touch existing server');}catch(e){if(e.message.includes('occupied'))throw e;}
  server=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:directory,FIXTURE_PORT:String(port),FIXTURE_DATA_DIRECTORY:resolve(`test-results/experience-${Date.now()}`),FORTUNE_VOICE_FIXTURE:'1'},stdio:['ignore','pipe','pipe','ipc']});
  server.stdout.on('data',()=>{});server.stderr.on('data',d=>serverErrors+=d);
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture ready');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',s=>state=s);socket.on('delta',s=>state=s);await until(()=>state,'snapshot');
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();await context.route('**/*',r=>{if(!['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)){report.errors.push('External request '+r.request().url());return r.abort();}return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:576,height:1024});await page.goto(url+'/overlay/?capture=1');await page.waitForFunction(()=>window.__sceneDebug);
  return {page,context};
}
async function bench(page,label){
  await cmd({type:'settings',patch:{idleMinutes:30,fortuneVoiceEnabled:false,masterMute:true}});await cmd({type:'add',count:100});
  await page.waitForFunction(()=>window.__sceneDebug.actors===60&&window.__sceneDebug.states.every(s=>s==='idle')&&(!window.__sceneDebug.welcomes||window.__sceneDebug.welcomes.length===0),{},{timeout:90000});
  for(const [width,height] of [[576,1024],[1080,1920]]){
    await page.setViewportSize({width,height});await sleep(2300);const samples=[];
    for(let i=0;i<4;i++){await sleep(2100);samples.push(await page.evaluate(()=>window.__sceneDebug.fps));}
    report.fps.push({label,width,height,actors:60,samples,average:samples.reduce((a,b)=>a+b)/samples.length});
    await page.screenshot({path:`${out}/${label}-60-${width}.png`});
    if(label==='current'){const d=await page.evaluate(()=>window.__sceneDebug);assert.ok(d.walkers<=6);assert.equal(d.actorSize,1.45);assert.equal(d.golden.compactPanels.width,230);}
  }
}
try{
  await access(baseline+'/overlay/index.html');let app=await boot(baseline);await bench(app.page,'baseline');await stop();
  app=await boot(build);const {page,context}=app;await bench(page,'current');
  report.performance=report.fps.filter(r=>r.label==='current').map(r=>{const b=report.fps.find(x=>x.label==='baseline'&&x.width===r.width);return {width:r.width,before:b.average,after:r.average,passed:r.average>=b.average*.9};});
  assert.ok(report.performance.every(x=>x.passed),'Average FPS regression over 10%');report.checks.push('60 actors, same machine/browser/settings at both sizes; FPS within 10%');
  const positions=await page.evaluate(()=>window.__sceneDebug.bodies.map(b=>({key:b.key,x:b.x,y:b.y})));await sleep(600);
  assert.notDeepEqual(await page.evaluate(()=>window.__sceneDebug.bodies.map(b=>({key:b.key,x:b.x,y:b.y}))),positions);
  await cmd({type:'settings',patch:{idleActivities:false,giftCameraEnabled:false,actorSize:1,compactGiftPanels:false,showBubbles:false}});
  await page.waitForFunction(()=>window.__sceneDebug.walkers===0&&window.__sceneDebug.actorSize===1&&!window.__sceneDebug.golden.compactPanels.visible);
  await cmd({type:'reset'});await until(()=>state.total===0,'reset');
  await cmd({type:'settings',patch:{idleActivities:true,giftCameraEnabled:true,actorSize:1.45,compactGiftPanels:true,showBubbles:true,lanternEnabled:true,masterMute:false}});
  for(let i=0;i<8;i++)await chat('person'+i,'vào chùa');
  await page.waitForFunction(()=>window.__sceneDebug.actors===8&&window.__sceneDebug.states.every(s=>s==='idle'));
  await chat('person1','Chúc mọi người một ngày bình an 🌸');
  await page.waitForFunction(()=>window.__sceneDebug.bubbles.some(b=>b.text.includes('Chúc')));
  const bubble=await page.evaluate(()=>window.__sceneDebug.bubbles.find(b=>b.text.includes('Chúc')));assert.ok(bubble.actorId.endsWith(':person1'));
  for(const [width,height] of [[576,1024],[1080,1920]]){await page.setViewportSize({width,height});await page.screenshot({path:`${out}/chat-${width}.png`});}
  await chat('person2','cho mình xin một quẻ gia đình');await page.waitForFunction(()=>window.__fortuneDebug.visible);
  await page.waitForFunction(()=>window.__sceneDebug.bubbles.some(b=>b.text.includes('xin một quẻ')));
  const textBubbles=await page.evaluate(()=>window.__sceneDebug.bubbles);const card=await page.evaluate(()=>window.__fortuneDebug.bounds);
  assert.ok(textBubbles.every(b=>!(b.x<card.x+card.width&&b.x+b.width>card.x&&b.y<card.y+card.height&&b.y+b.height>card.y)));
  await chat('person3','mình muốn thả đèn ba mẹ');await until(()=>state.lanternStatus.queued===1,'lantern queued behind fortune');
  await cmd({type:'gift-demo',group:'rose',userId:'person1',nickname:'Khách person1',units:3});
  await cmd({type:'gift-demo',group:'donut',userId:'person4',nickname:'Khách person4',units:2});
  await until(()=>state.metrics.giftUnits===5,'gift score');
  await page.waitForFunction(()=>window.__sceneDebug.camera.scale>1.25);
  assert.ok((await page.evaluate(()=>window.__sceneDebug.ritual.actorId)).endsWith(':person1'));
  for(const [width,height] of [[576,1024],[1080,1920]]){await page.setViewportSize({width,height});await page.screenshot({path:`${out}/gift-focus-${width}.png`});}
  await page.waitForFunction(()=>window.__sceneDebug.ritual?.actorId.endsWith(':person4'),{},{timeout:18000});
  await page.waitForFunction(()=>window.__sceneDebug.camera.scale>1.15);
  const ritual=await page.evaluate(()=>window.__sceneDebug.ritual);await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.ritual);
  const resumed=await page.evaluate(()=>window.__sceneDebug.ritual);assert.equal(resumed.startedAt,ritual.startedAt);assert.equal(resumed.actorId,ritual.actorId);
  // A reload does not replay old chat.
  assert.equal((await page.evaluate(()=>window.__sceneDebug.bubbles)).length,0);
  await page.waitForFunction(()=>!window.__sceneDebug.ritual&&window.__sceneDebug.camera.scale===1,{},{timeout:18000});
  report.checks.push('Chat and command bubbles bound to identity; compact card never overlaps; two gifts score exactly and focus correct ritual; reload resumes timestamps without chat replay');
  await cmd({type:'settings',patch:{chatBlockedWords:['từ chặn']}});await chat('person5','từ chặn');await chat('person6','https://example.com');await sleep(300);assert.equal((await page.evaluate(()=>window.__sceneDebug.bubbles)).length,0);
  await cmd({type:'settings',patch:{showBubbles:false}});await chat('person7','Xin chào lần nữa');await sleep(200);assert.equal((await page.evaluate(()=>window.__sceneDebug.bubbles)).length,0);
  await cmd({type:'settings',patch:{showBubbles:true,reducedEffects:true}});await cmd({type:'gift-demo',group:'rose',userId:'person1',nickname:'Khách person1',units:1});
  await until(()=>state.ritual,'reduced ritual');await sleep(3100);assert.equal(await page.evaluate(()=>window.__sceneDebug.camera.scale),1);assert.equal(await page.evaluate(()=>window.__sceneDebug.walkers),0);
  await page.waitForFunction(()=>!window.__sceneDebug.ritual,{},{timeout:12000});
  await cmd({type:'settings',patch:{reducedEffects:false}});
  await page.setViewportSize({width:576,height:1024});
  await page.evaluate(()=>{window.__videoChunks=[];window.__recorder=new MediaRecorder(document.querySelector('canvas').captureStream(15),{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2500000});window.__recorder.ondataavailable=e=>window.__videoChunks.push(e.data);window.__recorder.start(500);});
  await chat('person1','Cùng giữ một chút bình an');await sleep(2500);await cmd({type:'gift-demo',group:'rose',userId:'person1',nickname:'Khách person1',units:1});await sleep(10500);
  const video=await page.evaluate(()=>new Promise(resolve=>{window.__recorder.onstop=async()=>{const b=new Blob(window.__videoChunks,{type:'video/webm'});const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(b);window.__recorder.stream.getTracks().forEach(t=>t.stop());};window.__recorder.stop();}));
  await writeFile(out+'/motion-chat-gift.webm',Buffer.from(video,'base64'));
  // Fake LIVE exercises the exact mapper/source-switch path, never contacts TikTok.
  await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_experience'});await until(()=>state.connection.status==='LIVE_CONNECTED','LIVE fixture');
  const room=state.connection.roomId;
  const emit=(id,text,roomId=room,msgId=crypto.randomUUID())=>rpc('fixture',{event:'chat',payload:{user:{id,nickname:'Khách '+id},content:text,common:{roomId,msgId}}});
  await emit('bad','hoa đăng','wrong-room');await sleep(200);assert.equal(state.lanternStatus.revealed,0);
  await emit('live1','cho mình thả đèn gia đình');await page.waitForFunction(()=>window.__lanternDebug.visible);
  await sleep(6000);await emit('live1','xin quẻ học hành nhé');await page.waitForFunction(()=>window.__sceneDebug.bubbles.some(b=>b.text.includes('xin quẻ')));
  await emit('live1','Xin chào',''+room,'duplicate-msg');await emit('live1','Xin chào',''+room,'duplicate-msg');
  for(let i=0;i<24;i++)await emit('burst'+i,'Chào cả nhà');await sleep(500);assert.ok((await page.evaluate(()=>window.__sceneDebug.bubbles)).length<=4);
  await cmd({type:'live-connect',username:'fixture_other'});await until(()=>state.connection.status==='LIVE_CONNECTED'&&state.connection.roomId!==room,'room switch');
  await page.waitForFunction(()=>window.__sceneDebug.bubbles.length===0&&window.__sceneDebug.camera.scale===1&&!window.__lanternDebug.visible&&!window.__fortuneDebug.visible);
  const dashboard=await context.newPage();await dashboard.setViewportSize({width:1440,height:1100});await dashboard.goto(url+'/dashboard/');await dashboard.getByLabel('Kích thước nhân vật',{exact:true}).waitFor();await dashboard.locator('.appearance-card').screenshot({path:out+'/dashboard.png'});
  report.checks.push('Block list, URL filtering, toggles, reduced effects, silent video, LIVE fixture/wrong-room/burst and source reset');
  assert.deepEqual(report.errors,[]);assert.equal(serverErrors,'');report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{await stop();await writeFile(out+'/e2e-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
