import {fork} from 'node:child_process';
import {chromium} from 'playwright';
import {io} from 'socket.io-client';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const port=3181,url=`http://127.0.0.1:${port}`,out=process.env.ARTIFACT_DIR||'artifacts/quan-am-courtyard';
await mkdir(out,{recursive:true});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=20000){const t=Date.now();while(Date.now()-t<timeout){if(await fn())return;await sleep(100);}throw Error('Timeout '+label);}
let server,browser,socket,state;const report={checks:[],errors:[],fps:[],realLive:'NOT VERIFIED'};
const cmd=data=>new Promise((ok,bad)=>socket.timeout(6000).emit('command',data,(e,r)=>e?bad(e):r?.ok?ok(r):bad(Error(`${r?.error}; ${JSON.stringify(data)}`))));
const rpc=data=>new Promise((ok,bad)=>socket.timeout(6000).emit('fixture',data,(e,r)=>e?bad(e):r?.ok?ok(r):bad(Error(r?.error))));
const chat=(id,text)=>cmd({type:'event',event:{type:'chat',userId:id,nickname:'Khách sân '+id,text,eventId:crypto.randomUUID()}});
try{
  try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)});throw Error('Port occupied');}catch(e){if(e.message==='Port occupied')throw e;}
  server=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,FIXTURE_PORT:String(port),APP_BUILD_DIRECTORY:process.env.APP_BUILD_DIRECTORY||resolve('test-results/courtyard-dist'),FIXTURE_DATA_DIRECTORY:resolve(`test-results/courtyard-${Date.now()}`),FORTUNE_VOICE_FIXTURE:'1'},stdio:['ignore','pipe','pipe','ipc']});
  server.stdout.on('data',()=>{});server.stderr.on('data',d=>report.errors.push(String(d)));
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',v=>state=v);socket.on('delta',v=>{const actors=new Map((state?.actors||[]).map(a=>[a.key,a]));for(const key of v.removed||[])actors.delete(key);for(const a of v.upserts||[])actors.set(a.key,a);state={...v,actors:[...actors.values()]};});await until(()=>state,'snapshot');
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:576,height:1024});await page.goto(url+'/overlay/?capture=1');
  await page.waitForFunction(()=>window.__sceneDebug?.golden?.courtyard);
  report.hardware=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return {cores:navigator.hardwareConcurrency,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown'};});
  assert.equal(await page.evaluate(()=>window.__sceneDebug.golden.courtyard.active),false);
  await cmd({type:'settings',patch:{sceneSpace:'courtyard',theme:'golden',sceneLight:'day',showBubbles:false,idleMinutes:30,lanternEnabled:true,treeEnabled:true,fortuneVoiceEnabled:false}});
  await cmd({type:'add',count:10});await page.waitForFunction(()=>window.__sceneDebug.actors===10&&window.__sceneDebug.welcomes.length===0,{},{timeout:20000});
  const identities=state.actors.map(a=>[a.key,a.seatId]),session=state.sessionId;
  await page.evaluate(()=>{window.__cqChunks=[];window.__cqStream=document.querySelector('canvas').captureStream(15);window.__cqRecorder=new MediaRecorder(window.__cqStream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:1600000});window.__cqRecorder.ondataavailable=e=>window.__cqChunks.push(e.data);window.__cqRecorder.start(500);});
  for(const light of ['day','sunset','night']){
    await cmd({type:'settings',patch:{sceneLight:light}});
    await page.waitForFunction(l=>window.__sceneDebug.golden.courtyard.weights[l]>.999,light,{timeout:26000});
    for(const [width,height] of [[576,1024],[1080,1920]]){await page.setViewportSize({width,height});await page.screenshot({path:`${out}/${light}-${width}.png`});}
    assert.equal(state.sessionId,session);assert.deepEqual(state.actors.map(a=>[a.key,a.seatId]),identities);
  }
  const video=await page.evaluate(()=>new Promise(done=>{window.__cqRecorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(window.__cqChunks).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));window.__cqStream.getTracks().forEach(t=>t.stop());done(btoa(s));};window.__cqRecorder.stop();}));await writeFile(out+'/day-sunset-night.webm',Buffer.from(video,'base64'));
  assert.ok(await page.evaluate(()=>window.__sceneDebug.golden.courtyard.lamps>.9));
  report.checks.push('Day/sunset/night assets, 20s transitions, night lamps, both capture sizes; same session, identities and seats');
  for(const kind of ['leaves','petals']){
    await cmd({type:'weather',preset:kind});await page.waitForFunction(()=>window.__sceneDebug.golden.courtyard.particles>3);await sleep(800);
    await page.screenshot({path:`${out}/${kind}.png`});const ends=state.environment.weather.endsAt;
    await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.golden?.courtyard?.particles>0);
    assert.equal(state.environment.weather.endsAt,ends);await cmd({type:'weather',preset:'stop'});
    await until(()=>!state.environment.weather,'weather stops');await page.waitForFunction(()=>window.__sceneDebug.golden.courtyard.particles===0);
  }
  const userId=state.actors[0].key.split(':').at(-1);
  await cmd({type:'weather',preset:'petals'});await cmd({type:'gift-demo',group:'rose',userId,nickname:'Khách sân',units:2});
  await until(()=>!state.environment.weather,'gift suppresses weather');await page.waitForFunction(()=>window.__sceneDebug.ritual?.phase==='offer');
  assert.ok(await page.evaluate(()=>window.__sceneDebug.labels.some(l=>l.key===window.__sceneDebug.ritual.actorId)));
  await page.screenshot({path:out+'/gift-zoom.png'});await page.waitForFunction(()=>!window.__sceneDebug.ritual);assert.equal(state.metrics.giftUnits,2);
  await chat('fortune','xin quẻ gia đình');await page.waitForFunction(()=>window.__fortuneDebug.visible);await page.screenshot({path:out+'/fortune.png'});
  await chat('lantern','hoa đăng gia đình');await page.waitForFunction(()=>window.__lanternDebug.visible,{},{timeout:25000});await page.screenshot({path:out+'/lantern.png'});
  await cmd({type:'weather',preset:'leaves'});await cmd({type:'event',event:{type:'like',userId:'tree',likeCount:1000,eventId:'courtyard-tree'}});
  await until(()=>!state.environment.weather,'tree suppresses weather');await page.waitForFunction(()=>window.__treeDebug.rainVisible&&window.__treeDebug.flowers>12);await sleep(1200);await page.screenshot({path:out+'/tree-rain.png'});
  await until(()=>state.tree.phase==='growing','tree completes');
  await cmd({type:'weather',preset:'leaves'});await cmd({type:'settings',patch:{reducedEffects:true}});await until(()=>!state.environment.weather,'reduced clears weather');
  await page.waitForFunction(()=>window.__sceneDebug.golden.courtyard.particles===0);assert.equal(await page.evaluate(()=>window.__sceneDebug.golden.courtyard.poolSize),32);
  await cmd({type:'settings',patch:{reducedEffects:false,sceneSpace:'hall'}});await page.waitForFunction(()=>!window.__sceneDebug.golden.courtyard.active);
  await page.screenshot({path:out+'/hall-preserved.png'});assert.equal(state.metrics.giftUnits,2);assert.equal(state.sessionId,session);
  report.checks.push('Weather/reload/stop, gift and tree preemption; gift score/name/camera, fortune and lantern cards; reduced mode and hall restore');
  await cmd({type:'settings',patch:{sceneSpace:'courtyard'}});
  const dashboard=await context.newPage();await dashboard.setViewportSize({width:1440,height:1200});await dashboard.goto(url+'/dashboard/');await dashboard.locator('#courtyard-settings').waitFor();
  await dashboard.getByLabel('Ánh sáng sân',{exact:true}).selectOption('day');await until(()=>state.settings.sceneLight==='day','dashboard light setting');
  await dashboard.locator('#courtyard-settings').screenshot({path:out+'/dashboard.png'});await dashboard.close();
  await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_courtyard'});await until(()=>state.connection.status==='LIVE_CONNECTED','LIVE fixture');
  await cmd({type:'weather',preset:'petals'});const room=state.connection.roomId;
  await rpc({event:'chat',payload:{user:{id:'cq-live',nickname:'Khách sân LIVE'},content:'hoa đăng',common:{roomId:room,msgId:'cq-live-chat'}}});
  await page.waitForFunction(()=>window.__lanternDebug.visible);
  await cmd({type:'live-connect',username:'fixture_other'});await until(()=>state.connection.roomId!==room&&!state.environment.weather,'room clears weather');
  report.checks.push('Dashboard controls, LIVE connector fixture interaction and room reset; no actual TikTok connection');
  if(process.env.COURTYARD_STRESS==='1'){
    await cmd({type:'source',mode:'demo'});await cmd({type:'reset'});await cmd({type:'settings',patch:{sceneSpace:'hall',maxActors:100,idleMinutes:30,reducedEffects:false}});
    await cmd({type:'add',count:100});await cmd({type:'add',count:10});await cmd({type:'add',count:10});await page.waitForFunction(()=>window.__sceneDebug.actors===120&&window.__sceneDebug.welcomes.length===0,{},{timeout:90000});
    for(const [width,height] of [[576,1024],[1080,1920]]){
      await page.setViewportSize({width,height});
      const baselineIndex=report.fps.length;
      for(const [space,light] of [['hall','night'],['courtyard','day'],['courtyard','sunset'],['courtyard','night']]){
        await cmd({type:'settings',patch:{sceneSpace:space,sceneLight:light}});
        if(space==='courtyard')await page.waitForFunction(l=>window.__sceneDebug.golden.courtyard.weights[l]>.999,light,{timeout:26000});
        await sleep(10000);
        const samples=[];for(let i=0;i<15;i++){await sleep(2100);samples.push(await page.evaluate(()=>window.__sceneDebug.fps));}
        report.fps.push({width,height,space,light,surface:'one capture page',actors:120,quality:await page.evaluate(()=>window.__sceneDebug.quality),samples,average:samples.reduce((a,b)=>a+b)/samples.length});
        await page.screenshot({path:`${out}/stress-${space}-${light}-${width}.png`});
      }
      const [base,...changes]=report.fps.slice(baselineIndex);assert.ok(changes.every(changed=>changed.average>=24&&changed.average>=base.average*.9),'FPS >=24 and regression <=10%');
    }
    report.checks.push('120 actors, capture-only baseline comparison, 10s warm-up and >=30s samples; >=24 FPS, <=10% regression');
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{socket?.disconnect();await browser?.close();if(server&&server.exitCode===null){if(server.connected)server.send('shutdown');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);if(server.exitCode===null)server.kill();}await writeFile(out+'/e2e-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
