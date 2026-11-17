import { fork } from 'node:child_process';
import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const port=3147,url=`http://127.0.0.1:${port}`,out=process.env.ARTIFACT_DIR||'artifacts/fortune2027';
await mkdir(out,{recursive:true});
// Refuse an occupied port so the test can never attach to someone else's session.
try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(600)});throw Error('Port 3147 is occupied; stop the old fixture first.');}catch(e){if(e.message.includes('occupied'))throw e;}
const report={kind:'DEMO / TIKTOK FIXTURE ONLY, NOT REAL LIVE',checks:[],errors:[],fps:[],externalRequests:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=15000){const start=Date.now();while(Date.now()-start<timeout){if(await fn())return;await sleep(100);}throw Error('Timeout '+label);}
let server,browser,socket,state;
try{
  server=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:process.env.APP_BUILD_DIRECTORY||resolve('test-results/fortune2027-dist'),FIXTURE_PORT:String(port),FIXTURE_DATA_DIRECTORY:resolve(`test-results/fortune2027-e2e-${Date.now()}`)},stdio:['ignore','pipe','pipe','ipc']});
  let serverErrors='';server.stderr.on('data',d=>serverErrors+=d);server.stdout.on('data',()=>{});
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture startup');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',s=>state=s);socket.on('delta',s=>state=s);await until(()=>state,'snapshot');
  const rpc=(event,data)=>new Promise((done,reject)=>socket.timeout(5000).emit(event,data,(err,r)=>err?reject(err):r.ok?done(r):reject(Error(r.error||'Fixture rejected'))));
  const cmd=data=>rpc('command',data);
  const chat=(id,text='xin quẻ',eventId='event-'+id)=>cmd({type:'event',event:{type:'chat',userId:id,nickname:'Khách thử quẻ',eventId,text}});
  // This suite covers the original full-detail card; compact layout has its own E2E.
  await cmd({type:'settings',patch:{liveSafeLayout:false}});
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();await context.route('**/*',r=>{if(!['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)){report.externalRequests.push(r.request().url());return r.abort();}return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:1080,height:1920});await page.goto(url+'/overlay/');await page.waitForFunction(()=>window.__fortuneDebug);
  const dashboard=await context.newPage();dashboard.on('pageerror',e=>report.errors.push(e.message));await dashboard.setViewportSize({width:1440,height:1100});await dashboard.goto(url+'/dashboard/');await dashboard.getByRole('heading',{name:'576 lời chiêm nghiệm'}).waitFor();
  assert.equal(state.fortuneStatus.available,true);assert.equal(state.settings.fortuneVoiceEnabled,false);assert.equal(state.fortuneStatus.revealed,0);
  report.checks.push('Bundled 576-item catalogue ready, no sample card, fortune voice OFF');
  await chat('one','xem quẻ 123');
  // Check the short cooldown before browser reload/screenshots can consume it.
  await chat('one','xin quẻ gia đạo','cooldown');await until(()=>state.fortuneStatus.cooldown===1,'cooldown');
  await page.waitForFunction(()=>window.__fortuneDebug?.visible&&window.__fortuneDebug.number===123);await sleep(250);await page.screenshot({path:out+'/fortune-123-1080.png'});
  const first={...state.fortune};assert.equal(state.metrics.giftUnits,0);await page.reload();await page.waitForFunction(()=>window.__fortuneDebug?.revealId);
  assert.equal(await page.evaluate(()=>window.__fortuneDebug.revealId),first.revealId);assert.equal(state.fortuneStatus.revealed,1);assert.equal(await page.evaluate(()=>window.__fortuneVoice.status),'off');
  report.checks.push('DEMO command reveals exact #123 free; reload resumes same expiry with no speech replay');
  await dashboard.getByLabel('Bật xin quẻ',{exact:true}).uncheck();await until(()=>state.settings.fortuneEnabled===false,'disable');await page.waitForFunction(()=>!window.__fortuneDebug.visible);
  await chat('disabled');await until(()=>state.fortuneStatus.disabled===1,'disabled request');
  await dashboard.getByLabel('Bật xin quẻ',{exact:true}).check();await until(()=>state.settings.fortuneEnabled,'enable');assert.equal(state.fortuneStatus.queued,0);
  report.checks.push('Dashboard toggles persist, disabled clears card/queue, cooldown counted');
  await cmd({type:'gift-demo',group:'rose',userId:'one',nickname:'Khách thử quẻ',units:3});await until(()=>state.metrics.giftUnits===3,'gift independent');assert.equal(state.fortuneStatus.revealed,1);
  report.checks.push('Gift still scores three, creates no extra fortune');
  await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_fortune'});await until(()=>state.connection.status==='LIVE_CONNECTED','fixture connection');
  let refused=false;try{await chat('spoof');}catch{refused=true;}assert.ok(refused);
  const room=state.connection.roomId;
  const emit=(id,text='xin quẻ gia đạo',roomId=room)=>rpc('fixture',{event:'chat',payload:{user:{id,nickname:'Cùng tên'},content:text,common:{roomId,msgId:'fortune-'+id}}});
  await emit('wrong','xin quẻ','wrong-room');await sleep(150);assert.equal(state.fortuneStatus.revealed,0);
  await page.bringToFront();for(let i=0;i<50;i++){await emit('burst'+i);await sleep(200);}
  assert.ok(state.fortuneStatus.queued<=32);assert.ok(state.fortuneStatus.busy>0);assert.equal(state.metrics.giftUnits,0);
  const before=state.fortuneStatus.revealed+state.fortuneStatus.queued;await emit('burst0');await sleep(200);assert.equal(state.fortuneStatus.revealed+state.fortuneStatus.queued,before);
  report.checks.push('LIVE fixture rejects browser injection/wrong room; 50 chats/10s bounded; replay not duplicated');
  for(let i=50;i<60;i++)await emit('burst'+i,'xin chào');
  await page.waitForFunction(()=>window.__sceneDebug.actors===60&&window.__sceneDebug.states.every(s=>s==='idle'));
  for(const [width,height] of [[1080,1920],[576,1024]]){
    await page.setViewportSize({width,height});await page.bringToFront();await sleep(2200);await page.waitForFunction(()=>window.__fortuneDebug.visible);
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,card:window.__fortuneDebug.bounds}));
    assert.equal(layout.overflow,false);assert.ok(layout.card.height<=1920*.26&&layout.card.y>1100);
    await page.screenshot({path:`${out}/fortune-60-${width}.png`});const samples=[];for(let i=0;i<4;i++){await sleep(500);samples.push(await page.evaluate(()=>window.__sceneDebug.fps));}
    report.fps.push({width,height,actors:60,average:samples.reduce((a,b)=>a+b)/samples.length,min:Math.min(...samples)});
  }
  report.checks.push('60 actors plus bounded fortunes: portrait fit, card <=26% below altar; actual FPS recorded');
  await dashboard.screenshot({path:out+'/dashboard-fortune.png',fullPage:true});await dashboard.setViewportSize({width:390,height:844});assert.ok(await dashboard.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await cmd({type:'live-connect',username:'fixture_other'});await until(()=>state.connection.status==='LIVE_CONNECTED'&&state.connection.roomId!==room,'room switch');assert.equal(state.fortuneStatus.revealed,0);assert.equal(state.fortuneStatus.queued,0);assert.ok(!state.fortune);
  await rpc('fixture',{event:'chat',payload:{user:{id:'new',nickname:'Khách mới'},content:'xem quẻ 576',common:{roomId:state.connection.roomId,msgId:'new'}}});await page.waitForFunction(()=>window.__fortuneDebug.number===576&&window.__fortuneDebug.visible);
  const nextId=state.fortune.revealId;await cmd({type:'settings',patch:{theme:'classic'}});await page.waitForFunction(()=>window.__sceneDebug.theme==='classic');assert.equal(state.fortune.revealId,nextId);
  await page.screenshot({path:out+'/fortune-classic.png'});await cmd({type:'source',mode:'demo'});await cmd({type:'reset'});await until(()=>state.fortuneStatus.revealed===0,'reset');assert.ok(!state.fortune);
  report.checks.push('Different room clears old requests; classic displays card; DEMO reset clears all fortune state');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);assert.equal(serverErrors,'');report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{
  socket?.disconnect();await browser?.close();
  if(server&&server.exitCode===null){if(server.connected)server.send('shutdown');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);if(server.exitCode===null)server.kill();}
  await writeFile(out+'/e2e-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
