import { fork } from 'node:child_process';
import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const port=3149,url=`http://127.0.0.1:${port}`,out=process.env.ARTIFACT_DIR||'artifacts/fortune2027-voice';
await mkdir(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=20000){const start=Date.now();while(Date.now()-start<timeout){if(await fn())return;await sleep(100);}throw Error('Timeout '+label);}
try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(600)});throw Error('Port 3149 occupied');}catch(e){if(e.message.includes('occupied'))throw e;}
const report={kind:'SYNTHETIC PCM / FIXTURE ONLY. Vietnamese listening and real LIVE NOT VERIFIED.',checks:[],errors:[],externalRequests:[]};
let server,browser,socket,state;
try{
  server=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:process.env.APP_BUILD_DIRECTORY||resolve('test-results/fortune2027-voice-dist'),FIXTURE_PORT:String(port),FIXTURE_DATA_DIRECTORY:resolve(`test-results/fortune-voice-${Date.now()}`),FORTUNE_VOICE_FIXTURE:'1'},stdio:['ignore','pipe','pipe','ipc']});
  let errors='';server.stderr.on('data',d=>errors+=d);server.stdout.on('data',()=>{});
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',s=>state=s);socket.on('delta',s=>state=s);await until(()=>state,'snapshot');
  const cmd=data=>new Promise((done,reject)=>socket.timeout(5000).emit('command',data,(e,r)=>e?reject(e):r.ok?done(r):reject(Error(r.error))));
  const chat=id=>cmd({type:'event',event:{type:'chat',userId:id,nickname:'Khách An Lành',eventId:crypto.randomUUID(),text:'xem quẻ 123'}});
  const post=body=>fetch(url+'/api/fortune-voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();await context.route('**/*',r=>{if(!['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)){report.externalRequests.push(r.request().url());return r.abort();}return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:576,height:1024});
  await page.goto(url+'/overlay/?sound');await page.waitForFunction(()=>window.__fortuneVoice&&window.__audioControl);
  await cmd({type:'settings',patch:{fortuneVoiceEnabled:true,ambienceEnabled:false,masterMute:false,fortuneVolume:.5}});
  await page.getByRole('button',{name:'Bật âm thanh',exact:true}).click();await page.waitForFunction(()=>window.__audioControl.debug().state==='ready');
  await chat('one');await page.waitForFunction(()=>window.__fortuneVoice.status==='speaking');
  await until(async()=>await page.evaluate(()=>window.__audioControl.debug().peak>.001),'audible mixer PCM');
  report.mixer=await page.evaluate(()=>({peak:window.__audioControl.debug().peak,recordableTracks:window.__audioControl.getStream().getAudioTracks().length}));
  assert.equal(report.mixer.recordableTracks,1);assert.ok(report.mixer.peak<1);
  await page.screenshot({path:out+'/fortune-speaking.png'});
  const current={sessionId:state.sessionId,revealId:state.fortune.revealId};
  assert.equal((await post({...current,text:'injected'})).status,400);
  assert.equal((await post({...current,revealId:'unknown'})).status,404);
  report.checks.push('Named fortune action uses shared mixer with nonzero unclipped PCM and recording track; API rejects arbitrary text/unknown reveal');
  await cmd({type:'gift-demo',group:'rose',userId:'one',nickname:'Khách An Lành',units:1});
  await page.waitForFunction(()=>window.__fortuneVoice.status==='gift-priority');
  await until(()=>state.metrics.giftUnits===1,'gift score');report.checks.push('Gift interrupts fortune audio and retains gift score');
  await cmd({type:'reset'});await until(()=>state.fortuneStatus.revealed===0,'reset');
  await chat('two');await page.waitForFunction(()=>window.__fortuneVoice.status==='speaking');
  const generated=(await(await fetch(url+'/api/fortune-voice/status')).json()).generated;
  await page.reload();await page.waitForFunction(()=>window.__fortuneDebug?.visible);
  await page.getByRole('button',{name:'Bật âm thanh',exact:true}).click();await sleep(600);
  assert.notEqual(await page.evaluate(()=>window.__fortuneVoice.status),'speaking');
  assert.equal((await(await fetch(url+'/api/fortune-voice/status')).json()).generated,generated);
  report.checks.push('Reload resumes current card without another speech request');
  await cmd({type:'reset'});await until(()=>state.fortuneStatus.revealed===0,'reset before mute');
  await chat('three');await page.waitForFunction(()=>window.__fortuneVoice.status==='speaking');
  const third={sessionId:state.sessionId,revealId:state.fortune.revealId};
  await cmd({type:'settings',patch:{masterMute:true}});await page.waitForFunction(()=>window.__fortuneVoice.status==='off');
  assert.equal((await post(third)).status,409);report.checks.push('Master mute stops fortune playback and server refuses synthesis');
  const dashboard=await context.newPage();dashboard.on('pageerror',e=>report.errors.push(e.message));await dashboard.setViewportSize({width:1440,height:1100});await dashboard.goto(url+'/dashboard/');
  await dashboard.getByRole('heading',{name:'576 lời chiêm nghiệm'}).waitFor();await dashboard.locator('#fortune-settings').screenshot({path:out+'/fortune-settings.png'});
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);assert.equal(errors,'');report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{
  socket?.disconnect();await browser?.close();
  if(server&&server.exitCode===null){if(server.connected)server.send('shutdown');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);if(server.exitCode===null)server.kill();}
  await writeFile(out+'/e2e-voice-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
