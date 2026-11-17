import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.TEST_URL||'http://127.0.0.1:3119',out='artifacts/stage3_1';
assert.equal((await(await fetch(url+'/api/health')).json()).fixture,true,'Fixture required before mutations');
await mkdir(out,{recursive:true});
const report={kind:'FIXTURE ONLY / NOT REAL LIVE',checks:[],errors:[],fps:[],audio:{},externalRequests:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=20000){const start=Date.now();while(Date.now()-start<timeout){if(await fn())return;await sleep(100);}throw Error('Timeout: '+label);}
let state;const socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',s=>state=s);socket.on('delta',d=>{if(!state||state.sessionId!==d.sessionId||state.revision+1!==d.revision){socket.emit('resync');return;}const actors=new Map(state.actors.map(a=>[a.key,a]));d.removed.forEach(k=>actors.delete(k));d.upserts.forEach(a=>actors.set(a.key,a));state={...d,actors:[...actors.values()]};});
const rpc=(event,data)=>new Promise((done,reject)=>socket.timeout(5000).emit(event,data,(error,reply)=>error?reject(error):reply.ok?done(reply):reject(Error(reply.error))));
const cmd=data=>rpc('command',data);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-webgl','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
try{
  await until(()=>state,'snapshot');await cmd({type:'source',mode:'demo'});await cmd({type:'reset'});
  await cmd({type:'settings',patch:{theme:'golden',masterMute:false,voiceMode:'fallback',voiceVolume:.8,sfxVolume:.65,ambienceEnabled:false,giftCatalog:[],effects:true,flowers:true,candles:true,glow:true,smoke:true,showGiftThanks:true,showGiftPanel:true,showThanksPanel:true,showTicker:true,showBubbles:true,showRegister:true,maxActors:60,idleMinutes:8,reducedEffects:false}});
  const context=await browser.newContext();await context.route('**/*',route=>{if(!['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)){report.externalRequests.push(route.request().url());return route.abort();}return route.continue();});
  const page=await context.newPage();await page.setViewportSize({width:1080,height:1920});page.on('pageerror',e=>report.errors.push(e.message));
  const dashboard=await context.newPage();await dashboard.setViewportSize({width:1440,height:1100});dashboard.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url+'/overlay/');await dashboard.goto(url+'/dashboard/');await page.waitForFunction(()=>window.__sceneDebug?.golden?.giftRows===8);
  await page.screenshot({path:out+'/overlay-empty-leaderboard.png'});assert.deepEqual(state.leaderboard,[]);report.checks.push('B01 B02 B06: eight gift rows; empty scoreboard; no verified live IDs');
  await cmd({type:'add',count:1});await page.waitForFunction(()=>window.__sceneDebug.states.includes('walk'));await page.screenshot({path:out+'/actor-walk.png'});
  await page.waitForFunction(()=>window.__sceneDebug.states.includes('kneel'));await page.screenshot({path:out+'/actor-kneel.png'});
  await page.waitForFunction(()=>window.__sceneDebug.states.includes('pray'));await sleep(700);await page.screenshot({path:out+'/actor-bow.png'});
  await cmd({type:'reset'});await cmd({type:'add',count:10});await page.waitForFunction(()=>window.__sceneDebug.actors===10&&window.__sceneDebug.states.every(s=>s==='idle'));await page.screenshot({path:out+'/overlay-10-back-facing.png'});report.checks.push('A01 A02: rear-facing walk/kneel/bow and 10 seated actors captured');
  await dashboard.getByRole('button',{name:'Bật âm thanh preview',exact:true}).click();await dashboard.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.__audioControl?.state==='ready');
  const frame=dashboard.frames().find(f=>f.url().includes('/overlay/'));
  report.audio.initial=await frame.evaluate(()=>window.__audioControl.debug());
  await page.keyboard.press('a');await page.getByRole('button',{name:'Bật âm thanh',exact:true}).click();
  await page.waitForFunction(()=>window.__audioControl.detail.includes('Overlay khác'));await page.getByRole('button',{name:'Ẩn bảng · phím A mở lại',exact:true}).click();report.checks.push('C06: second output activation cannot steal active audio lease');
  await frame.evaluate(()=>{const c=window.__audioControl;const chunks=[];window.__recordChunks=chunks;window.__recorder=new MediaRecorder(c.getStream());window.__recorder.ondataavailable=e=>chunks.push(e.data);window.__recorder.start(300);});
  await dashboard.getByRole('button',{name:'Test Voice',exact:true}).click();await frame.waitForFunction(()=>window.__audioControl.played>=1);
  await dashboard.getByRole('button',{name:'Test SFX',exact:true}).click();await frame.waitForFunction(()=>window.__audioControl.played>=2);
  const groups=['rose','heart','bouquet','donut','offering','corgi','lantern','lion'],effects=['rose','heart','lotus','bell','offering','fish','lantern','dragon'];
  await page.bringToFront();
  for(let i=0;i<groups.length;i++){
    await until(()=>page.evaluate(()=>window.__sceneDebug.golden.giftEffects.active.length===0),'effect drained');
    await cmd({type:'gift-demo',group:groups[i],userId:'donor-'+(i%5),nickname:['Tâm An','Diệu Linh','Minh Tâm','An Nhiên','An Nhiên'][i%5],units:i+1});
    await page.waitForFunction(kind=>window.__sceneDebug.golden.giftEffects.active.includes(kind),effects[i]);await sleep(700);
    await page.screenshot({path:out+`/overlay-gift-${groups[i]}.png`});
  }
  await frame.waitForFunction(()=>window.__audioControl.played>=10,null,{timeout:60000});
  const encoded=await frame.evaluate(async()=>{await new Promise(done=>{window.__recorder.onstop=done;window.__recorder.stop();});const blob=new Blob(window.__recordChunks,{type:'audio/webm'});return await new Promise(done=>{const r=new FileReader();r.onload=()=>done(r.result.split(',')[1]);r.readAsDataURL(blob);});});
  await writeFile(out+'/browser-audio-sequence.webm',Buffer.from(encoded,'base64'));report.audio.afterEight=await frame.evaluate(()=>window.__audioControl.debug());assert.ok(report.audio.afterEight.peak>.001);assert.equal(report.audio.afterEight.voiceKind,'fallback-vi-no-name');
  report.checks.push('C01 C02 C03: real decoded Vietnamese fallback + distinct SFX/effects for eight groups; browser stream recorded (not OS loopback)');
  assert.equal(state.metrics.giftUnits,36);assert.equal(state.leaderboard.length,5);assert.equal(state.leaderboard.reduce((s,r)=>s+r.score,0),36);await page.screenshot({path:out+'/overlay-leaderboard-top5.png'});
  const board=state.leaderboard;await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.golden?.leaderboard.length===5);assert.deepEqual(state.leaderboard,board);assert.equal(await page.evaluate(()=>window.__audioControl.played),0);report.checks.push('B03 B07 B08 B09: absent donors counted; duplicate nicknames separate; snapshot recovers Top5 without audio replay');
  const base=state.metrics.giftUnits;
  for(let i=0;i<25;i++){await cmd({type:'gift-demo',group:'lion',userId:'burst',nickname:'Khách thử tải',units:1});await sleep(65);}
  await until(()=>state.metrics.giftUnits===base+25,'burst points');
  const burstAudio=await frame.evaluate(()=>window.__audioControl.debug());assert.ok(burstAudio.queued<=20&&burstAudio.playing);assert.ok(burstAudio.skipped>0);report.audio.burst=burstAudio;
  assert.ok(await page.evaluate(()=>window.__sceneDebug.golden.giftEffects.active.length<=2&&window.__sceneDebug.golden.giftEffects.queued<=20));
  await cmd({type:'settings',patch:{masterMute:true}});await frame.waitForFunction(()=>window.__audioControl.state==='muted');assert.equal(await frame.evaluate(()=>window.__audioControl.debug().queued),0);
  await cmd({type:'settings',patch:{masterMute:false}});await frame.waitForFunction(()=>window.__audioControl.state==='ready');assert.equal(await frame.evaluate(()=>window.__audioControl.debug().queued),0);report.checks.push('C04 C05: 25 gifts tally exactly; audio and effect queues bounded; mute clears and unmute does not replay');
  await cmd({type:'add',count:100});await page.waitForFunction(()=>window.__sceneDebug.actors===60&&window.__sceneDebug.states.every(s=>s==='idle'));assert.equal(state.queue,50);
  const labels=await page.evaluate(()=>window.__sceneDebug.labels);for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j];assert.ok(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),'label overlap');}
  await page.screenshot({path:out+'/overlay-60-back-facing.png'});report.checks.push('A03: 60 unique seats, 50 waiting, non-overlapping labels');
  for(const [width,height] of [[1080,1920],[720,1280],[576,1024]]){await page.setViewportSize({width,height});await page.bringToFront();await sleep(4500);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth&&document.documentElement.scrollHeight===innerHeight));await page.screenshot({path:out+`/overlay-60-${width}.png`});const samples=[];for(let i=0;i<8;i++){await sleep(500);samples.push(await page.evaluate(()=>window.__sceneDebug.fps));}report.fps.push({width,height,actors:60,min:Math.min(...samples),average:samples.reduce((a,b)=>a+b)/samples.length});}
  await dashboard.screenshot({path:out+'/dashboard-gift-audio-settings.png',fullPage:true});await dashboard.setViewportSize({width:390,height:844});assert.ok(await dashboard.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.checks.push('D07: portrait sizes and mobile Dashboard fit without overflow');
  const beforeTheme=JSON.stringify(state.leaderboard),session=state.sessionId;
  await cmd({type:'settings',patch:{theme:'classic'}});await page.waitForFunction(()=>window.__sceneDebug.theme==='classic');assert.equal(JSON.stringify(state.leaderboard),beforeTheme);assert.equal(state.sessionId,session);await cmd({type:'settings',patch:{theme:'golden'}});report.checks.push('D05: theme switch retains session and score');
  await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_stage31'});await until(()=>state.connection.status==='LIVE_CONNECTED','fixture live');assert.deepEqual(state.leaderboard,[]);
  let refused=false;try{await cmd({type:'gift-demo',group:'lion',userId:'x',nickname:'Không được tạo',units:1});}catch{refused=true;}assert.ok(refused);report.checks.push('D06: LIVE fixture starts empty and rejects injected gift-demo');
  await cmd({type:'source',mode:'demo'});await until(()=>state.mode==='demo','return demo');assert.equal(state.metrics.giftUnits,base+25);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=String(error.stack||error);report.diagnostics=[];for(const c of browser.contexts())for(const p of c.pages())for(const f of p.frames()){try{const d=await f.evaluate(()=>window.__audioControl?.debug());if(d)report.diagnostics.push(d);}catch{}}process.exitCode=1;}
finally{socket.disconnect();await browser.close();await writeFile(out+'/test-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
