import {fork} from 'node:child_process';
import {chromium} from 'playwright';
import {io} from 'socket.io-client';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const port=3182,url=`http://127.0.0.1:${port}`,out=process.env.ARTIFACT_DIR||'artifacts/gift-showcase';
await mkdir(out,{recursive:true});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=15000){const t=Date.now();while(Date.now()-t<timeout){if(await fn())return;await sleep(70);}throw Error('Timeout '+label);}
let server,browser,socket,state,serial=0;
const report={checks:[],renders:[],errors:[],avatar:'Synthetic portrait served by test route; actual TikTok CDN NOT VERIFIED',realLive:'NOT VERIFIED'};
const rpc=(event,data)=>new Promise((ok,bad)=>socket.timeout(6000).emit(event,data,(e,r)=>e?bad(e):r?.ok?ok(r):bad(Error(r?.error||'Rejected'))));
const cmd=data=>rpc('command',data);
const avatar='https://p16.tiktokcdn.com/avatar/showcase-fixture.png';
const chat=(text,photo=avatar)=>rpc('fixture',{event:'chat',payload:{user:{id:`${++serial}`,nickname:'An Nhiên',avatarThumb:{urlList:[photo]}},content:text,common:{roomId:state.connection.roomId,msgId:crypto.randomUUID()}}});
try{
  try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)});throw Error('Port occupied');}catch(e){if(e.message==='Port occupied')throw e;}
  server=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,FIXTURE_PORT:String(port),APP_BUILD_DIRECTORY:process.env.APP_BUILD_DIRECTORY||resolve('test-results/gift-showcase-dist'),FIXTURE_DATA_DIRECTORY:resolve(`test-results/showcase-${Date.now()}`)},stdio:['ignore','pipe','pipe','ipc']});
  server.stdout.on('data',()=>{});server.stderr.on('data',d=>report.errors.push(String(d)));
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',v=>state=v);socket.on('delta',v=>{const actors=new Map((state?.actors||[]).map(a=>[a.key,a]));for(const key of v.removed||[])actors.delete(key);for(const a of v.upserts||[])actors.set(a.key,a);state={...v,actors:[...actors.values()]};});await until(()=>state,'snapshot');
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();let avatarPng;
  await context.route('**/*',r=>{
    const req=r.request(),host=new URL(req.url()).hostname;
    if(['127.0.0.1','localhost'].includes(host))return r.continue();
    if(req.url()===avatar&&avatarPng)return r.fulfill({status:200,contentType:'image/png',headers:{'Access-Control-Allow-Origin':'*'},body:avatarPng});
    if(host==='p16.tiktokcdn.com')return r.fulfill({status:404,body:''});
    report.errors.push('Unexpected external host '+host);return r.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:576,height:1024});await page.goto(url+'/overlay/?capture=1');
  await page.waitForFunction(()=>window.__sceneDebug&&window.__communityDebug);
  // Deliberately synthetic portrait, not a real viewer's identity or an external request.
  avatarPng=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#456c79';g.fillRect(0,0,128,128);g.fillStyle='#edcaa6';g.beginPath();g.ellipse(64,55,29,35,0,0,7);g.fill();g.fillStyle='#29253b';g.beginPath();g.ellipse(64,30,31,17,0,0,7);g.fill();g.fillStyle='#f6e9c8';g.beginPath();g.ellipse(64,125,48,38,0,0,7);g.fill();g.fillStyle='#29253b';g.fillRect(49,52,5,4);g.fillRect(74,52,5,4);g.strokeStyle='#a16a61';g.lineWidth=3;g.beginPath();g.arc(64,65,10,0,Math.PI);g.stroke();return c.toDataURL('image/png').split(',')[1];}),'base64');
  await cmd({type:'settings',patch:{theme:'golden',effects:true,effectIntensity:.65,commentEffectsEnabled:true,showBubbles:true,autoJoinChat:false,sceneLight:'day'}});
  await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_showcase'});await until(()=>state.connection.status==='LIVE_CONNECTED','fixture connected');
  await page.evaluate(()=>{window.__chunks=[];window.__stream=document.querySelector('canvas').captureStream(20);window.__recorder=new MediaRecorder(window.__stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2000000});window.__recorder.ondataavailable=e=>window.__chunks.push(e.data);window.__recorder.start(250);});
  const phrases=[['Xin một ngọn nến lung linh','candle'],['gửi yêu thương đến cả nhà','heart'],['Cho mình một đóa hoa sen nhé','lotus'],['Mình xin tiếng chuông bình an','bell'],['Mâm trái cây cho gia đình','offering'],['Cho mình đôi chép vàng','fish'],['Hôm nay mình chọn kim long','dragon']];
  for(const [space,width,height] of [['hall',576,1024],['courtyard',1080,1920]]){
    await cmd({type:'settings',patch:{sceneSpace:space}});await page.setViewportSize({width,height});
    for(const [phrase,kind] of phrases){
      await until(()=>!state.commentEffects.length,'free slot');await chat(phrase);
      await page.waitForFunction(k=>window.__communityDebug.rendered[0]?.effect===k&&window.__communityDebug.rendered[0]?.alpha>.95,kind);
      if(kind==='lotus')assert.equal(await page.evaluate(()=>window.__communityDebug.rendered[0]?.portrait),'lotus:plain');
      await sleep(200);const rendered=await page.evaluate(()=>window.__communityDebug.rendered[0]);
      assert.ok(rendered.body.height>130);assert.ok(rendered.body.width<=440);assert.ok(rendered.body.y>=rendered.region.y&&rendered.body.y+rendered.body.height<=rendered.region.y+rendered.region.height);
      assert.ok(rendered.caption.includes('An Nhiên'));assert.equal(state.metrics.giftUnits,0);assert.equal(state.actors.length,0);
      report.renders.push({space,width,...rendered});await page.screenshot({path:`${out}/${space}-${kind}-${width}.png`});
    }
  }
  report.checks.push('Seven phrase aliases render at 576 and 1080; hall/courtyard, no actor, no gift points; comment lotus has NO avatar');
  const video=await page.evaluate(()=>new Promise(done=>{window.__recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(window.__chunks,{type:'video/webm'}).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));window.__stream.getTracks().forEach(t=>t.stop());done(btoa(s));};window.__recorder.stop();}));
  await writeFile(out+'/seven-effects.webm',Buffer.from(video,'base64'));
  await until(()=>!state.commentEffects.length,'slot');await chat('hoa sen','https://p16.tiktokcdn.com/avatar/missing.png');
  await page.waitForFunction(()=>window.__communityDebug.rendered[0]?.effect==='lotus'&&window.__communityDebug.rendered[0]?.alpha>.95);await sleep(300);
  assert.equal(await page.evaluate(()=>window.__communityDebug.rendered[0].portrait),'lotus:plain');await page.screenshot({path:out+'/comment-lotus-no-avatar.png'});
  const original=state.commentEffects[0],deadline=original.expiresAt,shown=state.commentEffectStatus.shown;
  await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.revision>0&&window.__communityDebug);
  const resumed=await page.evaluate(()=>window.__communityDebug.rendered[0]);
  if(resumed){assert.equal(resumed.id,original.id);assert.equal(resumed.expiresAt,deadline);}
  else assert.ok(state.serverTime>=deadline,'Unexpired effect disappeared after reload');
  assert.equal(state.commentEffectStatus.shown,shown,'Reload must not create another event');
  await until(()=>!state.commentEffects.length,'reload expires');
  await cmd({type:'settings',patch:{sceneLight:'night'}});await sleep(20500);
  for(const text of ['ngũ quả','rồng vàng']){await until(()=>!state.commentEffects.length,'night slot');await chat(text);await page.waitForFunction(()=>window.__communityDebug.rendered[0]?.alpha>.95);await sleep(150);await page.screenshot({path:`${out}/night-${text==='ngũ quả'?'offering':'dragon'}.png`});}
  await until(()=>!state.commentEffects.length,'gift slot');
  await rpc('fixture',{event:'gift',payload:{user:{id:'donor',nickname:'An Nhiên',avatarThumb:{urlList:[avatar]}},giftId:'999',repeatCount:2,repeatEnd:1,gift:{type:0,name:'Bó hoa thử'},common:{roomId:state.connection.roomId,msgId:crypto.randomUUID()}}});
  await page.waitForFunction(()=>window.__sceneDebug.golden.giftEffects.portraits.some(p=>p.status==='lotus-portrait:loaded'&&p.alpha>.7));
  const startY=await page.evaluate(()=>window.__sceneDebug.golden.giftEffects.portraits[0].y);await page.screenshot({path:out+'/gift-lotus-avatar-1080.png'});
  await sleep(650);assert.ok(await page.evaluate(y=>window.__sceneDebug.golden.giftEffects.portraits[0].y<y-10,startY));assert.equal(state.metrics.giftUnits,2);
  await page.setViewportSize({width:576,height:1024});await page.screenshot({path:out+'/gift-lotus-avatar-576.png'});
  report.checks.push('Failed avatar fallback, reload deadline, night contrast, confirmed gift with avatar rises; gift score exactly 2');
  await cmd({type:'settings',patch:{reducedEffects:true}});await sleep(7500);await chat('hoa sen');await page.waitForFunction(()=>window.__communityDebug.rendered[0]?.alpha>.95);
  assert.equal(await page.evaluate(()=>window.__communityDebug.rendered[0].particles),0);await page.screenshot({path:out+'/reduced-lotus.png'});
  await cmd({type:'settings',patch:{commentEffectsEnabled:false}});await page.waitForFunction(()=>window.__communityDebug.rendered.length===0);
  await cmd({type:'source',mode:'demo'});await cmd({type:'settings',patch:{reducedEffects:false,commentEffectsEnabled:true,compactGiftPanels:false}});
  await until(()=>state.mode==='demo','demo source snapshot');
  await page.waitForFunction(revision=>window.__sceneDebug.revision>=revision,state.revision);
  const groups=['rose','heart','bouquet','donut','offering','corgi','lantern','lion'];
  for(const [i,group] of groups.entries()){
    await page.waitForFunction(()=>window.__sceneDebug.golden.giftEffects.active.length===0,{},{timeout:15000});
    await cmd({type:'event',event:{type:'gift',userId:`donor-${i}`,nickname:`Người tặng ${i+1}`,avatarUrl:avatar,eventId:crypto.randomUUID(),gift:{id:`demo:${group}`,demoGroup:group,count:1,finished:true}}});
    await page.waitForFunction(()=>window.__sceneDebug.golden.giftEffects.active.length===1);
    await sleep(600);await page.screenshot({path:`${out}/gift-${group}-effect.png`});
    await page.waitForFunction(name=>window.__sceneDebug.golden.giftEffects.portraits.some(p=>p.displayName===name&&p.status==='lotus-portrait:loaded'&&p.alpha>.7),`Người tặng ${i+1}`);
    await page.screenshot({path:`${out}/gift-${group}-avatar.png`});assert.equal(state.metrics.giftUnits,i+1);
  }
  await page.waitForFunction(()=>window.__sceneDebug.golden.giftEffects.active.length===0,{},{timeout:15000});
  await cmd({type:'event',event:{type:'gift',userId:'no-photo',nickname:'Không ảnh',avatarUrl:'https://p16.tiktokcdn.com/missing.png',eventId:crypto.randomUUID(),gift:{id:'unknown',count:1,finished:true}}});
  await page.waitForFunction(()=>window.__sceneDebug.golden.giftEffects.portraits.some(p=>p.status==='lotus-portrait:fallback'&&p.alpha>.7));
  await page.screenshot({path:out+'/gift-avatar-fallback.png'});
  report.checks.push('Every gift group (8) produces donor-only lotus portrait after its effect; clean donor name, exact score, unknown gift fallback, failed photo initials');
  await page.screenshot({path:out+'/free-command-guide.png'});
  const dash=await context.newPage();await dash.setViewportSize({width:1400,height:1100});await dash.goto(url+'/dashboard/');await dash.locator('#community-settings').screenshot({path:out+'/dashboard.png'});
  report.checks.push('Reduced mode, disable and source reset; free command guide and dashboard');assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);report.lastState={mode:state?.mode,metrics:state?.metrics,recentGifts:state?.recentGifts?.map(g=>({kind:g.mappedEffect,name:g.displayName}))};process.exitCode=1;}
finally{socket?.disconnect();await browser?.close();if(server&&server.exitCode===null){if(server.connected)server.send('shutdown');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);if(server.exitCode===null)server.kill();}await writeFile(out+'/showcase-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
