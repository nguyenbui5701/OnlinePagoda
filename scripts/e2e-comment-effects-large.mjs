import {fork} from 'node:child_process';
import {chromium} from 'playwright';
import {io} from 'socket.io-client';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const port=3178,url=`http://127.0.0.1:${port}`,out=process.env.ARTIFACT_DIR||'artifacts/comment-effects-large';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));await mkdir(out,{recursive:true});
async function until(fn,label,timeout=18000){const start=Date.now();while(Date.now()-start<timeout){if(await fn())return;await sleep(80);}throw Error('Timeout '+label);}
let child,browser,socket,state;
const report={kind:'LIVE connector fixture and actual canvas screenshots; NOT real LIVE',checks:[],renders:[],fps:[],errors:[],realLive:'NOT VERIFIED'};
const rpc=(name,data)=>new Promise((ok,bad)=>socket.timeout(6000).emit(name,data,(e,r)=>e?bad(e):r?.ok?ok(r):bad(Error(r?.error||'Rejected'))));
const cmd=data=>rpc('command',data);
const liveChat=(id,text)=>rpc('fixture',{event:'chat',payload:{user:{id:String(id),nickname:`<b>Khách thử ${id}</b>\u202e`},content:text,common:{roomId:state.connection.roomId,msgId:crypto.randomUUID()}}});
const demoChat=(id,text)=>cmd({type:'event',event:{type:'chat',userId:id,nickname:'Khách '+id,text,eventId:crypto.randomUUID()}});
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
function inspect(render,bubbles){
  const b=render.body,r=render.region;
  assert.ok(render.alpha>.2,'Actual render is transparent');assert.ok(b.width>40&&b.height>90,'Main artwork too small');
  assert.ok(b.x>=r.x&&b.x+b.width<=r.x+r.width&&b.y>=r.y&&b.y+b.height<=r.y+r.height,'Artwork outside reserved region');
  assert.ok(b.width<=440&&render.label.y+render.label.height<1056,'Artwork or name overlaps card area');
  assert.ok(render.caption.includes(' · ')&&!/[<>\u202e]/.test(render.caption));
  for(const bubble of bubbles){assert.equal(overlap(bubble,r),false,'Bubble hides effect');assert.equal(overlap(bubble,render.label),false,'Bubble hides effect name');}
}
try{
  try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)});throw Error('Port occupied');}catch(e){if(e.message==='Port occupied')throw e;}
  child=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:process.env.APP_BUILD_DIRECTORY||resolve('test-results/comment-effects-large-dist'),FIXTURE_PORT:String(port),FIXTURE_DATA_DIRECTORY:resolve(`test-results/comment-effects-large-${Date.now()}`),FORTUNE_VOICE_FIXTURE:'1'},stdio:['ignore','pipe','pipe','ipc']});
  child.stdout.on('data',()=>{});child.stderr.on('data',d=>report.errors.push(String(d)));
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',v=>state=v);socket.on('delta',v=>{
    const actors=new Map((state?.actors||[]).map(a=>[a.key,a]));for(const key of v.removed||[])actors.delete(key);for(const a of v.upserts||[])actors.set(a.key,a);state={...v,actors:[...actors.values()]};
  });await until(()=>state,'snapshot');
  await cmd({type:'settings',patch:{commentEffectsEnabled:true,effects:true,effectIntensity:.65,showBubbles:true,maxActors:100,idleMinutes:30}});
  await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_effects'});await until(()=>state.connection.status==='LIVE_CONNECTED','LIVE fixture');
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();await context.route('**/*',r=>{if(!['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)){report.errors.push('Unexpected external request');return r.abort();}return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:576,height:1024});
  await page.goto(url+'/overlay/?capture=1');await page.waitForFunction(()=>window.__communityDebug&&window.__sceneDebug);
  for(let i=0;i<14;i++)await liveChat(1000+i,'vào chùa');
  await page.waitForFunction(()=>window.__sceneDebug.actors===14&&window.__sceneDebug.welcomes.length===0,{},{timeout:25000});
  const words=[['thắp nến','candle'],['trái tim','heart'],['hoa sen','lotus'],['thỉnh chuông','bell'],['ngũ quả','offering'],['cá chép','fish'],['rồng vàng','dragon']];
  for(const [pass,[width,height]] of [[576,1024],[1080,1920]].entries()){
    await page.setViewportSize({width,height});await sleep(300);
    if(!pass)await page.evaluate(()=>{
      window.__fxChunks=[];const stream=document.querySelector('canvas').captureStream(20);window.__fxStream=stream;
      window.__fxRecorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2500000});
      window.__fxRecorder.ondataavailable=e=>window.__fxChunks.push(e.data);window.__fxRecorder.start(250);
    });
    for(const [i,[word,kind]] of words.entries()){
      await page.waitForFunction(()=>window.__communityDebug.rendered.length===0);
      const before=await page.screenshot();await liveChat(1000+pass*7+i,word);
      await page.waitForFunction(k=>window.__communityDebug.rendered.some(r=>r.effect===k&&r.alpha>.25),kind);await sleep(400);
      const actual=await page.evaluate(()=>({render:window.__communityDebug.rendered[0],bubbles:window.__sceneDebug.bubbles,camera:window.__sceneDebug.camera,audio:window.__audioControl.debug()}));
      inspect(actual.render,actual.bubbles);assert.equal(actual.camera.scale,1);assert.equal(actual.audio.played,0);assert.equal(actual.audio.queued,0);
      const after=await page.screenshot({path:`${out}/${kind}-${width}.png`});
      // Compare real raster pixels inside the primary artwork, excluding its caption.
      const changed=await page.evaluate(async({before,after,body,scale})=>{
        const read=async b64=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(Math.floor(body.x*scale),Math.floor(body.y*scale),Math.max(1,Math.floor(body.width*scale)),Math.max(1,Math.floor(body.height*scale))).data;};
        const a=await read(before),b=await read(after);let count=0;for(let j=0;j<a.length;j+=4)if(Math.abs(a[j]-b[j])+Math.abs(a[j+1]-b[j+1])+Math.abs(a[j+2]-b[j+2])>45)count++;return count/(a.length/4);
      },{before:before.toString('base64'),after:after.toString('base64'),body:actual.render.body,scale:width/1080});
      assert.ok(changed>.06,`${kind}: event exists but primary artwork not visibly rendered (${changed})`);
      report.renders.push({width,height,kind,changedPixels:changed,...actual.render});assert.equal(state.metrics.giftUnits,0);
      await until(()=>!state.commentEffects.length,'effect expires');
    }
    if(!pass){
      const video=await page.evaluate(()=>new Promise(done=>{window.__fxRecorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(window.__fxChunks,{type:'video/webm'}).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));window.__fxStream.getTracks().forEach(t=>t.stop());done(btoa(s));};window.__fxRecorder.stop();}));
      await writeFile(out+'/seven-effects.webm',Buffer.from(video,'base64'));
    }
  }
  report.checks.push('All seven LIVE-mapped commands render large visible raster artwork and clean names at both sizes, with bubbles enabled; no voice, gift score or zoom');
  await cmd({type:'settings',patch:{autoJoinChat:false,reducedEffects:true}});const count=state.actors.length;
  await liveChat(99999,'thỉnh chuông');await page.waitForFunction(()=>window.__communityDebug.rendered[0]?.effect==='bell'&&window.__communityDebug.rendered[0]?.alpha>.25);
  assert.equal(state.actors.length,count);assert.equal(await page.evaluate(()=>window.__communityDebug.rendered[0].particles),0);
  await page.screenshot({path:out+'/no-actor-reduced.png'});
  await cmd({type:'settings',patch:{commentEffectsEnabled:false}});await page.waitForFunction(()=>window.__communityDebug.rendered.length===0);
  report.checks.push('A viewer without an actor can trigger the fixed effect; reduced mode keeps body/name; disabling clears it');
  await cmd({type:'source',mode:'demo'});await cmd({type:'reset'});
  await cmd({type:'settings',patch:{autoJoinChat:true,commentEffectsEnabled:true,reducedEffects:false,maxActors:100,lanternEnabled:true}});
  await page.setViewportSize({width:576,height:1024});await cmd({type:'add',count:100});await sleep(300);await cmd({type:'add',count:10});await cmd({type:'add',count:10});
  await page.waitForFunction(()=>window.__sceneDebug.actors===120&&window.__sceneDebug.welcomes.length===0,{},{timeout:90000});
  assert.equal(state.room.seated,100);assert.equal(state.room.visibleStanding,20);
  for(let i=0;i<3;i++){await sleep(2100);report.fps.push(await page.evaluate(()=>window.__sceneDebug.fps));}
  report.averageFps=report.fps.reduce((a,b)=>a+b)/report.fps.length;assert.ok(report.averageFps>=24,'120 visitor capture FPS below 24');
  await demoChat('guest-119','rồng vàng');await page.waitForFunction(()=>window.__communityDebug.rendered[0]?.effect==='dragon'&&window.__communityDebug.rendered[0]?.alpha>.25);
  await page.screenshot({path:out+'/standing-120.png'});assert.ok(state.actors.find(a=>a.key.endsWith(':guest-119')).seatId.startsWith('standing-'));
  await cmd({type:'settings',patch:{compactGiftPanels:false}});await sleep(250);await page.screenshot({path:out+'/full-panels.png'});
  await cmd({type:'settings',patch:{compactGiftPanels:true}});await until(()=>!state.commentEffects.length,'standing effect ends');
  await demoChat('guest-116','xin quẻ');await page.waitForFunction(()=>window.__fortuneDebug.visible);await demoChat('guest-114','hoa đăng');
  await demoChat('guest-115','hoa sen');await page.waitForFunction(()=>window.__communityDebug.rendered[0]?.effect==='lotus'&&window.__communityDebug.rendered[0]?.alpha>.95);
  const card=await page.evaluate(()=>({r:window.__communityDebug.rendered[0],card:window.__fortuneDebug.bounds}));assert.equal(overlap(card.r.region,card.card),false);assert.equal(overlap(card.r.label,card.card),false);
  await page.screenshot({path:out+'/with-fortune.png'});
  await page.waitForFunction(()=>window.__lanternDebug.visible&&!window.__fortuneDebug.visible,{},{timeout:20000});await demoChat('guest-113','cá chép');
  await page.waitForFunction(()=>window.__communityDebug.rendered[0]?.effect==='fish'&&window.__communityDebug.rendered[0]?.alpha>.95);await sleep(400);await page.screenshot({path:out+'/with-lantern.png'});
  const beforePreempt=state.commentEffectStatus.preempted;
  await cmd({type:'gift-demo',group:'offering',userId:'guest-117',nickname:'Khách tặng quà',units:2});
  await page.waitForFunction(()=>window.__communityDebug.rendered.length===0);await until(()=>state.commentEffectStatus.preempted===beforePreempt+1,'gift preemption');assert.equal(state.metrics.giftUnits,2);
  await page.waitForFunction(()=>window.__sceneDebug.ritual?.phase==='offer');await page.screenshot({path:out+'/paid-gift-priority.png'});
  await page.waitForFunction(()=>!window.__sceneDebug.ritual,{},{timeout:12000});
  await demoChat('guest-109','thắp nến');await page.waitForFunction(()=>window.__communityDebug.rendered[0]?.effect==='candle');
  const previous=state.commentEffects[0],shownBeforeReload=state.commentEffectStatus.shown;await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.revision>0&&window.__communityDebug);
  const resumed=await page.evaluate(()=>window.__communityDebug.rendered[0]);
  if(resumed){assert.equal(resumed.id,previous.id);assert.equal(resumed.expiresAt,previous.expiresAt);}
  else assert.ok(state.serverTime>=previous.expiresAt,'Unexpired effect missing');
  assert.equal(state.commentEffectStatus.shown,shownBeforeReload,'Reload replays the event');
  await until(()=>!state.commentEffects.length,'remaining time expires');
  report.checks.push('120 actors, standing caller, full panels, fortune/lantern coexistence, paid offering priority with score 2, reload preserves original effect deadline');
  await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_effects'});await until(()=>state.connection.status==='LIVE_CONNECTED','LIVE reconnect');
  await liveChat(88888,'rồng vàng');await until(()=>state.commentEffects.length===1,'pre-room effect');
  const old=state.sessionId;await cmd({type:'live-connect',username:'fixture_other'});await until(()=>state.sessionId!==old,'room reset');
  await page.waitForFunction(()=>window.__communityDebug.rendered.length===0);assert.equal(state.commentEffectStatus.shown,0);
  const dashboard=await context.newPage();dashboard.on('pageerror',e=>report.errors.push(e.message));await dashboard.setViewportSize({width:1440,height:1100});await dashboard.goto(url+'/dashboard/');await dashboard.locator('#community-settings').waitFor();
  await liveChat(77777,'trái tim');await dashboard.getByTestId('comment-effect-current').filter({hasText:'Trái tim'}).waitFor();
  await dashboard.locator('#community-settings').screenshot({path:out+'/dashboard.png'});
  report.checks.push('Changing room clears effects and counters; dashboard identifies sender/effect and explains server-delivery counts');
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{socket?.disconnect();await browser?.close();if(child&&child.exitCode===null){if(child.connected)child.send('shutdown');await Promise.race([new Promise(r=>child.once('exit',r)),sleep(5000)]);if(child.exitCode===null)child.kill();}await writeFile(out+'/e2e-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
