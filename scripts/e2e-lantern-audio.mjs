import {fork} from 'node:child_process';
import {chromium} from 'playwright';
import {io} from 'socket.io-client';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const port=3183,url=`http://127.0.0.1:${port}`,out=process.env.ARTIFACT_DIR||'artifacts/gift-v3/lantern-audio';
await mkdir(out,{recursive:true});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=16000){const t=Date.now();while(Date.now()-t<timeout){if(await fn())return;await sleep(80);}throw Error('Timeout '+label);}
let server,browser,socket,state,serial=0;
const report={checks:[],errors:[],kind:'Synthetic PCM fixture, not Vietnamese listening or real LIVE',passed:false};
const cmd=data=>new Promise((ok,bad)=>socket.timeout(6000).emit('command',data,(e,r)=>e?bad(e):r?.ok?ok(r):bad(Error(r?.error))));
const chat=(text='hoa đăng gia đình')=>cmd({type:'event',event:{type:'chat',userId:`voice-${++serial}`,nickname:'An Nhiên',text,eventId:crypto.randomUUID()}});
const post=body=>fetch(url+'/api/lantern-voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
try{
  try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)});throw Error('Port occupied');}catch(e){if(e.message==='Port occupied')throw e;}
  server=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,FIXTURE_PORT:String(port),APP_BUILD_DIRECTORY:process.env.APP_BUILD_DIRECTORY||resolve('test-results/gift-v3-dist'),FIXTURE_DATA_DIRECTORY:resolve(`test-results/lantern-audio-${Date.now()}`),FORTUNE_VOICE_FIXTURE:'1'},stdio:['ignore','pipe','pipe','ipc']});
  server.stdout.on('data',()=>{});server.stderr.on('data',d=>report.errors.push(String(d)));
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',v=>state=v);socket.on('delta',v=>state=v);await until(()=>state,'snapshot');
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:576,height:1024});await page.goto(url+'/overlay/?capture=1&sound');
  await page.waitForFunction(()=>window.__lanternVoice&&window.__audioControl);
  await cmd({type:'settings',patch:{autoJoinChat:false,lanternEnabled:true,lanternVoiceEnabled:true,lanternVolume:.3,fortuneVoiceEnabled:true,ambienceEnabled:false,masterMute:false,speechBoost:1}});
  await page.getByRole('button',{name:'Bật âm thanh',exact:true}).click();await page.waitForFunction(()=>window.__audioControl.debug().state==='ready');
  await page.evaluate(async()=>{window.__probeContext=new AudioContext();await window.__probeContext.resume();window.__probe=window.__probeContext.createAnalyser();window.__probe.fftSize=2048;window.__probeContext.createMediaStreamSource(window.__audioControl.getStream()).connect(window.__probe);});
  const rms=()=>page.evaluate(()=>{const b=new Float32Array(window.__probe.fftSize);window.__probe.getFloatTimeDomainData(b);return Math.sqrt(b.reduce((n,x)=>n+x*x,0)/b.length);});
  await chat();await page.waitForFunction(()=>window.__lanternVoice.status==='speaking');await sleep(500);
  const base=await rms();assert.ok(base>.005);
  await cmd({type:'settings',patch:{speechBoost:3}});await page.waitForFunction(()=>window.__audioControl.debug().speechBoost===3);await sleep(500);
  const boosted=await rms();report.gain={baseRms:base,boostedRms:boosted,ratio:boosted/base};assert.ok(boosted/base>2.5&&boosted/base<3.5);
  assert.ok(await page.evaluate(()=>window.__audioControl.debug().peak<1));await page.screenshot({path:out+'/lantern-speaking.png'});
  const reveal={sessionId:state.sessionId,revealId:state.lantern.revealId};assert.equal((await post({...reveal,text:'arbitrary text'})).status,400);assert.equal((await post({...reveal,revealId:'unknown'})).status,404);
  await cmd({type:'gift-demo',group:'donut',userId:'voice-donor',nickname:'Khách tặng',units:1});await page.waitForFunction(()=>window.__lanternVoice.status==='gift-priority');await until(()=>state.metrics.giftUnits===1,'gift score');
  report.checks.push('Lantern speaks through shared mixer, 3x gain measured on quiet PCM, peak below 1; gift interrupts; API rejects arbitrary text and unknown reveal');
  await cmd({type:'reset'});await until(()=>!state.lantern,'reset');await chat();await page.waitForFunction(()=>window.__lanternVoice.status==='speaking');
  await cmd({type:'settings',patch:{masterMute:true}});await page.waitForFunction(()=>window.__lanternVoice.status==='off');
  assert.equal((await post({sessionId:state.sessionId,revealId:state.lantern.revealId})).status,409);
  await cmd({type:'settings',patch:{masterMute:false}});await sleep(300);assert.notEqual(await page.evaluate(()=>window.__lanternVoice.status),'speaking');
  await cmd({type:'reset'});await until(()=>!state.lantern,'reset reload');await chat();await page.waitForFunction(()=>window.__lanternVoice.status==='speaking');
  const before=(await(await fetch(url+'/api/lantern-voice/status')).json()).generated;
  await page.reload();await page.waitForFunction(()=>window.__lanternDebug?.visible&&window.__lanternVoice);
  await page.getByRole('button',{name:'Bật âm thanh',exact:true}).click();await sleep(500);assert.notEqual(await page.evaluate(()=>window.__lanternVoice.status),'speaking');
  assert.equal((await(await fetch(url+'/api/lantern-voice/status')).json()).generated,before);
  await cmd({type:'reset'});await until(()=>!state.lantern,'reset disable');await chat();await page.waitForFunction(()=>window.__lanternVoice.status==='speaking');
  await cmd({type:'settings',patch:{lanternVoiceEnabled:false}});await page.waitForFunction(()=>window.__lanternVoice.status==='off');
  await cmd({type:'reset'});await until(()=>!state.lantern,'reset fortune');await chat('xin quẻ');await page.waitForFunction(()=>window.__fortuneVoice.status==='speaking');
  await cmd({type:'settings',patch:{masterMute:true}});await page.waitForFunction(()=>window.__fortuneVoice.status==='off');
  report.checks.push('Master mute, disabling lantern voice, reset and reload do not replay; fortune voice still plays');
  const dash=await context.newPage();await dash.setViewportSize({width:1440,height:1200});await dash.goto(url+'/dashboard/');
  await dash.getByLabel('Khuếch đại giọng đọc').waitFor();
  await until(async()=>await dash.getByLabel('Khuếch đại giọng đọc').inputValue()==='3','dashboard receives saved boost');
  await dash.locator('.audio-card').screenshot({path:out+'/audio-settings.png'});await dash.locator('#lantern-settings').screenshot({path:out+'/lantern-settings.png'});
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String(e.stack||e);process.exitCode=1;}
finally{socket?.disconnect();await browser?.close();if(server&&server.exitCode===null){if(server.connected)server.send('shutdown');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);if(server.exitCode===null)server.kill();}await writeFile(out+'/lantern-audio-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
