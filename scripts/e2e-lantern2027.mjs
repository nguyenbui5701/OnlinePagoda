import { fork } from 'node:child_process';
import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import { mkdir,writeFile,access } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const out='artifacts/lantern2027',build=resolve(process.env.APP_BUILD_DIRECTORY||'test-results/lantern2027-dist');
const baseline=resolve(process.env.LANTERN_BASELINE_BUILD||'test-results/fortune2027-voice-dist');
const port=3150,url=`http://127.0.0.1:${port}`;
await mkdir(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=20000){const at=Date.now();while(Date.now()-at<timeout){if(await fn())return;await sleep(100);}throw Error('Timeout: '+label);}
const report={kind:'DEMO / LIVE FIXTURE ONLY; real TikTok LIVE not verified',checks:[],errors:[],externalRequests:[],fps:[],baselineBuild:baseline,comparison:'Previous approved overlay vs new overlay, same current fixture backend, sequential browser runs on same machine'};
let server,browser,socket,state,serverErrors='';
async function stop(){
  socket?.disconnect();socket=undefined;await browser?.close();browser=undefined;
  if(server&&server.exitCode===null){if(server.connected)server.send('shutdown');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);if(server.exitCode===null)server.kill();}
  server=undefined;state=undefined;
}
const rpc=(event,data)=>new Promise((done,reject)=>socket.timeout(5000).emit(event,data,(err,r)=>err?reject(err):r.ok?done(r):reject(Error(r.error||'Rejected fixture request'))));
const cmd=data=>rpc('command',data);
const chat=(id,text='hoa đăng gia đình',eventId=crypto.randomUUID())=>cmd({type:'event',event:{type:'chat',userId:id,nickname:'Khách An Lành',text,eventId}});
async function boot(directory){
  try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(600)});throw Error('Port 3150 occupied; cannot attach to an existing session');}catch(e){if(e.message.includes('occupied'))throw e;}
  server=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:directory,FIXTURE_PORT:String(port),FIXTURE_DATA_DIRECTORY:resolve(`test-results/lantern-fixture-${Date.now()}`),FORTUNE_VOICE_FIXTURE:'1'},stdio:['ignore','pipe','pipe','ipc']});
  server.stdout.on('data',()=>{});server.stderr.on('data',d=>serverErrors+=d);
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'server');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',s=>state=s);socket.on('delta',s=>state=s);await until(()=>state,'snapshot');
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();await context.route('**/*',r=>{if(!['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)){report.externalRequests.push(r.request().url());return r.abort();}return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:1080,height:1920});await page.goto(url+'/overlay/');await page.waitForFunction(()=>window.__sceneDebug&&window.__fortuneDebug);
  return {page,context};
}
async function benchmark(page,label,lantern){
  await cmd({type:'settings',patch:{idleMinutes:30,lanternEnabled:lantern,fortuneVoiceEnabled:false,ambienceEnabled:false,masterMute:false,liveSafeLayout:false}});
  await cmd({type:'add',count:100});await page.bringToFront();
  await page.waitForFunction(()=>window.__sceneDebug.actors===60&&window.__sceneDebug.states.every(s=>s==='idle'));
  if(lantern){
    // All free slots are occupied: lamps must work independently of seats.
    for(let i=0;i<16;i++){await chat('bench-lamp'+i);await sleep(80);}
    await page.waitForFunction(()=>window.__lanternDebug?.visible);
  }
  for(const [width,height] of [[1080,1920],[576,1024]]){
    await page.setViewportSize({width,height});await page.bringToFront();await sleep(2300);
    const samples=[];for(let i=0;i<3;i++){await sleep(2100);samples.push(await page.evaluate(()=>window.__sceneDebug.fps));}
    const average=samples.reduce((a,b)=>a+b)/samples.length;assert.ok(average>0);
    report.fps.push({label,width,height,actors:60,samples,average,min:Math.min(...samples)});
    if(lantern){
      await page.waitForFunction(()=>window.__lanternDebug.visible&&window.__lanternDebug.progress>.15&&window.__lanternDebug.progress<.8);
      const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,card:window.__lanternDebug.bounds,fortune:window.__fortuneDebug.visible}));
      assert.equal(layout.overflow,false);assert.equal(layout.fortune,false);assert.ok(layout.card.y>=1340&&layout.card.height===450);
      await page.screenshot({path:`${out}/lantern-60-${width}.png`});
    }
  }
}
try{
  await access(baseline+'/overlay/index.html');assert.notEqual(build,baseline,'Baseline build must remain separate');
  let app=await boot(baseline);await benchmark(app.page,'baseline',false);await stop();
  app=await boot(build);const {page,context}=app;
  assert.equal(state.settings.lanternEnabled,false);assert.equal(state.lanternStatus.revealed,0);
  assert.equal(await page.evaluate(()=>window.__lanternDebug.visible),false);report.checks.push('Feature OFF by default; no sample lamp or anonymous AI visitors');
  await benchmark(page,'lantern',true);report.checks.push('60 actors, bounded lantern queue and no overlap/overflow at both portrait sizes');
  // Clear only this isolated fixture session before functional cases.
  await cmd({type:'reset'});await until(()=>state.lanternStatus.revealed===0,'reset after benchmark');
  const dashboard=await context.newPage();dashboard.on('pageerror',e=>report.errors.push(e.message));await dashboard.setViewportSize({width:1440,height:1100});await dashboard.goto(url+'/dashboard/');
  await dashboard.getByRole('heading',{name:'Hoa đăng cầu an',exact:true}).waitFor();
  await dashboard.getByLabel('Bật hoa đăng cầu an',{exact:true}).uncheck();await until(()=>!state.settings.lanternEnabled,'disable');
  await chat('off');await until(()=>state.lanternStatus.disabled===1,'disabled rejection');
  await dashboard.getByLabel('Chủ đề hoa đăng').selectOption('cha_me');
  // Regression: immediate DOM clicks in one browser task beat the 140 ms settings debounce.
  await dashboard.evaluate(()=>{
    document.querySelector('input[aria-label="Bật hoa đăng cầu an"]').click();
    document.querySelector('#lantern-settings button').click();
  });
  await page.waitForFunction(()=>window.__lanternDebug.visible&&window.__lanternDebug.topic==='cha_me');
  await chat('lantern-demo','hoa đăng','cooldown');await until(()=>state.lanternStatus.cooldown===1,'cooldown');
  const first={...state.lantern};await sleep(1200);await page.reload();await page.waitForFunction(()=>window.__lanternDebug?.visible);
  const resumed=await page.evaluate(()=>window.__lanternDebug);assert.equal(resumed.revealId,first.revealId);assert.equal(resumed.expiresAt,first.expiresAt);assert.ok(resumed.progress>.1);assert.equal(state.lanternStatus.revealed,1);
  await dashboard.locator('#lantern-settings').screenshot({path:out+'/dashboard-lantern.png'});
  await dashboard.setViewportSize({width:390,height:844});assert.equal(await dashboard.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  report.checks.push('Immediate toggle + DEMO waits for settings acknowledgement; cooldown, reload resume same deadline; mobile dashboard fits');
  await cmd({type:'settings',patch:{reducedEffects:true,theme:'classic'}});await page.waitForFunction(()=>window.__lanternDebug.reduced&&window.__sceneDebug.theme==='classic');
  // Start another lamp after disabling/reenabling to avoid screenshot timing near expiry.
  await cmd({type:'settings',patch:{lanternEnabled:false}});await cmd({type:'settings',patch:{lanternEnabled:true}});await chat('classic');
  await page.waitForFunction(()=>window.__lanternDebug.visible&&window.__lanternDebug.progress>.15);await page.screenshot({path:out+'/lantern-classic-reduced.png'});
  await cmd({type:'settings',patch:{theme:'golden',reducedEffects:false}});
  await cmd({type:'reset'});await until(()=>state.lanternStatus.revealed===0,'reset before alternation');
  await cmd({type:'settings',patch:{fortuneVoiceEnabled:true}});await page.keyboard.press('a');
  // The sound panel may be visible from ?sound already; ensure it is visible before clicking.
  await page.evaluate(()=>document.getElementById('audio-controls').hidden=false);
  await page.getByRole('button',{name:'Bật âm thanh',exact:true}).click();await page.waitForFunction(()=>window.__audioControl.debug().state==='ready');
  await chat('fortune','xem quẻ 123');await page.waitForFunction(()=>window.__fortuneVoice.status==='speaking');
  const fortune={...state.fortune};await chat('after-fortune');await sleep(4500);
  assert.equal(state.fortune.revealId,fortune.revealId);assert.ok(!state.lantern);assert.equal(state.fortune.expiresAt-fortune.startedAt,15000);
  await page.waitForFunction(()=>window.__lanternDebug.visible&&!window.__fortuneDebug.visible,{},{timeout:20000});
  await cmd({type:'gift-demo',group:'rose',userId:'after-fortune',nickname:'Khách An Lành',units:3});await until(()=>state.metrics.giftUnits===3,'gift score');assert.ok(state.lantern);
  report.checks.push('Voiced fortune retains full 15 seconds then lantern starts; lantern adds no speech and gift still scores');
  await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_lantern'});await until(()=>state.connection.status==='LIVE_CONNECTED','LIVE fixture');assert.ok(!state.lantern);
  let refused=false;try{await chat('injection');}catch{refused=true;}assert.ok(refused);
  const room=state.connection.roomId;
  const emit=(id,text='hoa dang gia dinh',roomId=room)=>rpc('fixture',{event:'chat',payload:{user:{id,nickname:'Cùng tên'},content:text,common:{roomId,msgId:'lamp-'+id}}});
  await emit('wrong','hoa đăng','wrong-room');await sleep(200);assert.equal(state.lanternStatus.revealed,0);
  for(let i=0;i<50;i++){await emit(String(i));await sleep(70);}
  assert.ok(state.lanternStatus.queued<=16);assert.ok(state.lanternStatus.busy>0);assert.equal(state.metrics.giftUnits,0);
  const accepted=state.lanternStatus.revealed+state.lanternStatus.queued;await emit('0');await sleep(150);assert.equal(state.lanternStatus.revealed+state.lanternStatus.queued,accepted);
  await cmd({type:'live-connect',username:'fixture_other'});await until(()=>state.connection.status==='LIVE_CONNECTED'&&state.connection.roomId!==room,'room switch');assert.ok(!state.lantern);assert.equal(state.lanternStatus.queued,0);
  await cmd({type:'source',mode:'demo'});await until(()=>state.mode==='demo','back to DEMO');assert.ok(!state.lantern);assert.equal(state.lanternStatus.queued,0);
  report.checks.push('LIVE fixture rejects browser injection/wrong room/replay; 50 chats bounded; room/source switches clear old lamps');
  report.performance=report.fps.filter(r=>r.label==='lantern').map(r=>{const old=report.fps.find(b=>b.label==='baseline'&&b.width===r.width);return {width:r.width,baseline:old.average,current:r.average,ratio:r.average/old.average,passed:r.average>=old.average*.9};});
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);assert.equal(serverErrors,'');
  assert.ok(report.performance.every(r=>r.passed),'FPS regression exceeds 10%; inspect samples and reduce scene cost before accepting');
  report.checks.push('FPS average at both sizes remains within 10% of previous approved overlay');report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{await stop();await writeFile(out+'/e2e-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
