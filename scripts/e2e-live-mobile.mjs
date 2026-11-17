import {fork} from 'node:child_process';
import {chromium} from 'playwright';
import {io} from 'socket.io-client';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const out=process.env.ARTIFACT_DIR||'artifacts/live-mobile-fix',port=3152,url=`http://127.0.0.1:${port}`;await mkdir(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=16000){const t=Date.now();while(Date.now()-t<timeout){if(await fn())return;await sleep(100);}throw Error('Timeout '+label);}
const report={kind:'FIXTURE: compact card and audio output; chat band below is a simulation, not TikTok UI',checks:[],errors:[],externalRequests:[],realLiveAudio:'NOT VERIFIED'};
let child,browser,socket,state;
try{
  try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)});throw Error('Port occupied');}catch(e){if(e.message==='Port occupied')throw e;}
  child=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:process.env.APP_BUILD_DIRECTORY||resolve('test-results/live-mobile-dist'),FIXTURE_PORT:String(port),FIXTURE_DATA_DIRECTORY:resolve(`test-results/live-mobile-${Date.now()}`),FORTUNE_VOICE_FIXTURE:'1'},stdio:['ignore','pipe','pipe','ipc']});
  let stderr='';child.stderr.on('data',v=>stderr+=v);child.stdout.on('data',()=>{});
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',v=>state=v);socket.on('delta',v=>state=v);await until(()=>state,'snapshot');
  const cmd=c=>new Promise((done,fail)=>socket.timeout(5000).emit('command',c,(e,r)=>e?fail(e):r.ok?done(r):fail(Error(r.error))));
  const chat=(id,text)=>cmd({type:'event',event:{type:'chat',userId:id,nickname:'Khách An Lành',text,eventId:crypto.randomUUID()}});
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();await context.route('**/*',r=>{if(!['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)){report.externalRequests.push(r.request().url());return r.abort();}return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:576,height:1024});await page.goto(url+'/overlay/?capture=1&sound');await page.waitForFunction(()=>window.__sceneDebug);
  assert.ok(await page.getByRole('button',{name:'Bật âm thanh',exact:true}).isVisible());
  assert.equal((await(await fetch(url+'/api/audio/status')).json()).claimed,false);
  await page.getByRole('button',{name:'Nghe thử tại cửa sổ này',exact:true}).click();
  await page.waitForFunction(()=>window.__audioControl.debug().peak>.001);
  assert.equal(state.metrics.giftUnits,0);assert.equal(state.metrics.giftTransactions,0);const owner=await(await fetch(url+'/api/audio/status')).json();assert.equal(owner.surface,'capture');assert.equal(owner.claimed,true);
  report.checks.push('Visible capture audio controls; fixed approved voice produces PCM without gift/score; server identifies capture output');
  await page.getByRole('button',{name:'Ẩn bảng · phím A mở lại',exact:true}).click();await chat('one','vào chùa');
  await page.waitForFunction(()=>window.__sceneDebug.actors===1&&window.__sceneDebug.states.every(s=>s==='idle'));assert.equal(state.queue,0);
  assert.equal(await page.evaluate(()=>typeof window.__joinDebug),'undefined');await page.screenshot({path:out+'/clear-courtyard.png'});
  report.checks.push('One comment automatically sits; center guidance panel removed, courtyard clear');
  await cmd({type:'settings',patch:{fortuneVoiceEnabled:true}});await chat('fortune','xem quẻ 123');await page.waitForFunction(()=>window.__fortuneVoice.status==='speaking');
  for(const [width,height] of [[576,1024],[1080,1920]]){
    await page.setViewportSize({width,height});await sleep(350);
    const card=await page.evaluate(()=>window.__fortuneDebug);assert.equal(card.compact,true);assert.ok(card.bounds.y>=1050);assert.ok(card.bounds.y+card.bounds.height<=1240);assert.ok(card.bounds.height<200);
    await page.screenshot({path:`${out}/fortune-compact-${width}.png`});
  }
  await page.evaluate(()=>{const band=document.createElement('div');band.id='chat-simulation';band.textContent='MÔ PHỎNG VÙNG CHAT — không phải giao diện TikTok thật';Object.assign(band.style,{position:'fixed',left:'0',right:'0',top:'65%',bottom:'0',background:'#0008',color:'white',padding:'24px',font:'22px Segoe UI',pointerEvents:'none'});document.body.append(band);});
  await page.screenshot({path:out+'/fortune-chat-simulation.png'});await page.evaluate(()=>document.getElementById('chat-simulation').remove());
  report.checks.push('Compact fortune above sampled chat band, duplicate title removed, audio retained; full scene/capture ratio unchanged');
  const dashboard=await context.newPage();dashboard.on('pageerror',e=>report.errors.push(e.message));await dashboard.setViewportSize({width:1440,height:1100});await dashboard.goto(url+'/dashboard/');
  await dashboard.getByLabel('Thẻ quẻ gọn',{exact:true}).waitFor();await dashboard.getByLabel('Thẻ quẻ gọn',{exact:true}).uncheck();await page.waitForFunction(()=>window.__fortuneDebug.compact===false);await dashboard.getByLabel('Thẻ quẻ gọn',{exact:true}).check();await page.waitForFunction(()=>window.__fortuneDebug.compact===true);
  await dashboard.locator('[data-testid="audio-owner"]').getByText(/cửa sổ Capture dọc/).waitFor();
  await dashboard.locator('.audio-card').screenshot({path:out+'/audio-dashboard.png'});
  // A second browser cannot steal the capture lease or introduce double audio.
  const other=await context.newPage();await other.goto(url+'/overlay/?sound');await other.getByRole('button',{name:'Bật âm thanh',exact:true}).click();await other.waitForFunction(()=>window.__audioControl.debug().detail.includes('Overlay khác'));
  assert.equal((await(await fetch(url+'/api/audio/status')).json()).surface,'capture');await other.close();
  report.checks.push('Compact toggle preserves state; dashboard identifies actual output; second overlay cannot steal audio');
  await cmd({type:'reset'});await until(()=>state.fortuneStatus.revealed===0,'reset for lanterns');
  await cmd({type:'settings',patch:{lanternEnabled:true}});await page.bringToFront();
  const topics=['bình an','gia đình','cha mẹ','sức khỏe','học tập','công việc'];
  for(let i=0;i<topics.length;i++){
    const previous=state.lantern?.revealId;
    await cmd({type:'settings',patch:{lanternEnabled:false}});await page.waitForFunction(()=>!window.__lanternDebug.visible);
    await cmd({type:'settings',patch:{lanternEnabled:true}});await until(()=>state.settings.lanternEnabled,'enable lantern');
    await chat('lantern-'+i,'hoa đăng '+topics[i]);await until(()=>state.lantern&&state.lantern.revealId!==previous,'new lantern reveal');
    const expected=state.lantern.revealId;
    await page.waitForFunction(id=>window.__lanternDebug.visible&&window.__lanternDebug.revealId===id&&window.__lanternDebug.progress>.20&&window.__lanternDebug.progress<.7,expected);
    const lamp=await page.evaluate(()=>window.__lanternDebug);assert.equal(lamp.compact,true);assert.deepEqual(lamp.bounds,{x:148,y:1056,width:784,height:184});assert.equal(await page.evaluate(()=>window.__fortuneDebug.visible),false);
    if(i===1){await page.setViewportSize({width:576,height:1024});await page.screenshot({path:out+'/lantern-compact-576.png'});await page.setViewportSize({width:1080,height:1920});await page.screenshot({path:out+'/lantern-compact-1080.png'});}
    if(i===5){await page.setViewportSize({width:576,height:1024});await page.screenshot({path:out+'/lantern-long-wish.png'});}
  }
  const lampId=state.lantern.revealId,deadline=state.lantern.expiresAt;
  await cmd({type:'settings',patch:{liveSafeLayout:false}});await page.waitForFunction(()=>window.__lanternDebug.visible&&!window.__lanternDebug.compact);assert.equal(state.lantern.revealId,lampId);
  await cmd({type:'settings',patch:{liveSafeLayout:true,reducedEffects:true}});await page.waitForFunction(()=>window.__lanternDebug.compact&&window.__lanternDebug.reduced);
  assert.equal(state.lantern.expiresAt,deadline);await page.reload();await page.waitForFunction(()=>window.__lanternDebug?.visible);assert.equal(await page.evaluate(()=>window.__lanternDebug.revealId),lampId);
  await page.waitForFunction(()=>!window.__lanternDebug.visible);
  await page.getByRole('button',{name:'Ẩn bảng · phím A mở lại',exact:true}).click();await page.screenshot({path:out+'/after-lantern-clear.png'});
  report.checks.push('All six lantern topics use compact slot; original layout toggle, reduced effects, reload and expiry preserve one 8-second reveal');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);assert.equal(stderr,'');report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{
  socket?.disconnect();await browser?.close();if(child&&child.exitCode===null){if(child.connected)child.send('shutdown');await Promise.race([new Promise(r=>child.once('exit',r)),sleep(5000)]);if(child.exitCode===null)child.kill();}
  await writeFile(out+'/e2e-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
