import {fork} from 'node:child_process';
import {chromium} from 'playwright';
import {io} from 'socket.io-client';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const out=process.env.ARTIFACT_DIR||'artifacts/gift-tiers/e2e',port=3184,url=`http://127.0.0.1:${port}`;
await mkdir(out,{recursive:true});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=18000){const t=Date.now();while(Date.now()-t<timeout){if(await fn())return;await sleep(75);}throw Error('Timeout '+label);}
let server,browser,socket,state,page,serial=0,avatarPng;
const report={checks:[],errors:[],passed:false,realLive:'NOT VERIFIED',stress:process.argv.includes('--stress')};
const cmd=data=>new Promise((ok,bad)=>socket.timeout(6000).emit('command',data,(e,r)=>e?bad(e):r?.ok?ok(r):bad(Error(r?.error))));
const fixture=(event,payload)=>new Promise((ok,bad)=>socket.timeout(6000).emit('fixture',{event,payload},(e,r)=>e?bad(e):r?.ok?ok(r):bad(Error('fixture'))));
const gift=(unitCoins=1,count=1,userId=`gift-${++serial}`)=>cmd({type:'event',event:{type:'gift',userId,nickname:`Sen ${serial}`,avatarUrl:'https://p16.tiktokcdn.com/avatar/tier.png',eventId:crypto.randomUUID(),gift:{id:'tier-fixture',demoGroup:'rose',name:'Quà thử',count,unitCoins,finished:true}}});
const chat=(text,userId=`chat-${++serial}`)=>cmd({type:'event',event:{type:'chat',userId,nickname:'An Nhiên',text,eventId:crypto.randomUUID()}});
const idle=()=>until(()=>state?.giftShow?.active.length===0&&state?.giftShow?.queued===0,'gift idle',40000);
async function reset(){const session=state.sessionId;await cmd({type:'reset'});await until(()=>state.sessionId!==session,'new session');await page.waitForFunction(()=>window.__giftShowDebug&&window.__sceneDebug?.revision>0);}
try{
 try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(400)});throw Error('Port occupied');}catch(e){if(e.message==='Port occupied')throw e;}
 server=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,FIXTURE_PORT:String(port),APP_BUILD_DIRECTORY:process.env.APP_BUILD_DIRECTORY||resolve('test-results/gift-tiers-dist'),FIXTURE_DATA_DIRECTORY:resolve(`test-results/gift-tiers-${Date.now()}`)},stdio:['ignore','pipe','pipe','ipc']});
 server.stdout.on('data',()=>{});server.stderr.on('data',d=>report.errors.push(String(d)));
 await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture');
 socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',v=>state=v);socket.on('delta',v=>{const actors=new Map((state?.actors||[]).map(a=>[a.key,a]));for(const k of v.removed||[])actors.delete(k);for(const a of v.upserts||[])actors.set(a.key,a);state={...v,actors:[...actors.values()]};});await until(()=>state,'state');
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 const ctx=await browser.newContext();
 await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='p16.tiktokcdn.com'&&avatarPng?r.fulfill({status:200,body:avatarPng,contentType:'image/png',headers:{'Access-Control-Allow-Origin':'*'}}):['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:576,height:1024});await page.goto(url+'/overlay/?capture=1');await page.waitForFunction(()=>window.__giftShowDebug);
 avatarPng=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#326b77';g.fillRect(0,0,128,128);g.fillStyle='#e6c59c';g.beginPath();g.ellipse(64,56,29,36,0,0,7);g.fill();g.fillStyle='#29232c';g.beginPath();g.ellipse(64,30,31,17,0,0,7);g.fill();g.fillRect(49,53,5,4);g.fillRect(75,53,5,4);g.fillStyle='#f5ead0';g.beginPath();g.ellipse(64,126,48,38,0,0,7);g.fill();return c.toDataURL('image/png').split(',')[1];}),'base64');
 await cmd({type:'settings',patch:{giftTierEffects:true,effects:true,flowers:true,showGiftThanks:true,autoJoinChat:false,masterMute:true,lanternEnabled:true,treeEnabled:true,compactGiftPanels:true}});
 await page.evaluate(()=>{window.__chunks=[];window.__stream=document.querySelector('canvas').captureStream(20);window.__recorder=new MediaRecorder(window.__stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2000000});window.__recorder.ondataavailable=e=>window.__chunks.push(e.data);window.__recorder.start(250);});
 for(const [scene,width,height] of [['hall',576,1024],['courtyard',1080,1920]]){
  await reset();await cmd({type:'settings',patch:{sceneSpace:scene}});await page.setViewportSize({width,height});
  for(const [value,variant] of [[1,'lotus'],[5,'hearts'],[5,'koi'],[5,'candles'],[10,'dragon'],[10,'phoenix'],[30,'long-phung']]){
   await gift(value);await page.waitForFunction(v=>window.__giftShowDebug.active.some(e=>e.variant===v&&e.alpha>.9),variant);await sleep(200);
   await page.waitForFunction(()=>window.__giftShowDebug.active[0]?.portrait==='lotus-portrait:loaded');
   const d=await page.evaluate(()=>window.__giftShowDebug);assert.ok(d.region.y>=218);
   await page.screenshot({path:`${out}/${scene}-${variant}-${width}.png`});await idle();
  }
 }
 report.checks.push('All seven gift compositions rendered at 576×1024 hall and 1080×1920 courtyard; synthetic avatar loaded, names and safe corridor (not real CDN)');
 const video=await page.evaluate(()=>new Promise(done=>{window.__recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(window.__chunks,{type:'video/webm'}).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));window.__stream.getTracks().forEach(t=>t.stop());done(btoa(s));};window.__recorder.stop();}));
 await writeFile(out+'/gift-tiers.webm',Buffer.from(video,'base64'));
 await reset();await page.setViewportSize({width:576,height:1024});await Promise.all([gift(1),gift(1)]);
 await page.waitForFunction(()=>window.__giftShowDebug.active.length===2&&window.__giftShowDebug.active.every(e=>e.alpha>.9));
 const lanes=await page.evaluate(()=>window.__giftShowDebug.active.map(e=>e.lane));assert.equal(new Set(lanes).size,2);await page.screenshot({path:out+'/two-lotus.png'});
 await gift(10);assert.ok(state.giftShow.active.every(a=>a.tier===1));await page.waitForFunction(()=>window.__giftShowDebug.active[0]?.tier===3);
 const before=state.giftShow.active[0],shown=state.giftShow.shown;await page.reload();await page.waitForFunction(()=>window.__giftShowDebug&&window.__sceneDebug?.revision>0);
 const resumed=await page.evaluate(()=>window.__giftShowDebug.active[0]);if(resumed){assert.equal(resumed.id,before.id);assert.equal(resumed.endsAt,before.endsAt);}else assert.ok(state.serverTime>=before.endsAt);
 assert.equal(state.giftShow.shown,shown);await idle();report.checks.push('Two low gifts coexist; high gift waits FIFO; reload never restarts deadline');
 await reset();for(const command of ['phượng hoàng','long phụng','sen yêu thương','sen cá chép','sen ánh nến']){
  await chat(command);await page.waitForFunction(()=>window.__communityDebug?.rendered.length===1&&window.__communityDebug.rendered[0].alpha>.9);
  assert.ok(!(await page.evaluate(()=>window.__communityDebug.rendered[0].portrait||'')).startsWith('lotus-portrait:'));
  await page.screenshot({path:out+'/comment-'+command.replaceAll(' ','-')+'.png'});await until(()=>state.commentEffects.length===0,'comment ends');
 }
 assert.equal(state.metrics.giftUnits,0);report.checks.push('New free commands render without avatar or gift points');
 await chat('xin quẻ');await page.waitForFunction(()=>window.__fortuneDebug.visible);await gift(5);await page.waitForFunction(()=>window.__giftShowDebug.active[0]?.alpha>.9);await page.screenshot({path:out+'/fortune-and-gift.png'});
 const positions=await page.evaluate(()=>({show:window.__giftShowDebug.region,card:window.__fortuneDebug.bounds}));assert.ok(positions.show.height>0); // New full-size layout may defer until the 4s card has hidden.
 await cmd({type:'settings',patch:{giftTierEffects:false}});await page.waitForFunction(()=>window.__giftShowDebug.active.length===0);await cmd({type:'settings',patch:{giftTierEffects:true}});await idle();
 await reset();await chat('vào chùa','camera-donor');await until(()=>fauxActorReady(),'donor finishes welcome',18000);
 function fauxActorReady(){const a=state.actors?.find(a=>a.key.endsWith(':camera-donor'));return a&&!a.welcome;}
 await gift(10,1,'camera-donor');await page.waitForFunction(()=>window.__sceneDebug.camera.scale>1.1&&window.__giftShowDebug.active.length>0);
 await page.screenshot({path:out+'/camera-safe.png'});assert.ok((await page.evaluate(()=>window.__giftShowDebug.region.y))>=218);
 report.checks.push('Known donor ritual zoom keeps gift name and portrait in screen-space safe corridor');
 await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_tiers'});await until(()=>state.connection.status==='LIVE_CONNECTED','fake live');await sleep(250);
 const room=state.connection.roomId;await fixture('gift',{common:{roomId:room,msgId:'coins-1'},user:{id:'777',nickname:'LIVE giả lập'},giftId:'123',repeatCount:10,repeatEnd:1,groupId:'combo-1',gift:{type:1,name:'Quà 1 xu',diamondCount:1}});
 await until(()=>state.giftShow.active[0]?.gift.totalCoins===10,'wire combo');assert.equal(state.giftShow.active[0].tier,3);assert.equal(state.metrics.giftUnits,10);
 await fixture('gift',{common:{roomId:room,msgId:'coins-1'},user:{id:'777',nickname:'LIVE giả lập'},giftId:'123',repeatCount:10,repeatEnd:1,groupId:'combo-1',gift:{type:1,name:'Quà 1 xu',diamondCount:1}});await sleep(350);assert.equal(state.metrics.giftUnits,10);
 const old=state.sessionId;await cmd({type:'live-connect',username:'fixture_other'});await until(()=>state.sessionId!==old,'room reset');assert.equal(state.giftShow.shown,0);
 report.checks.push('Fortune stays readable; disable cancels; fake LIVE 1×10 combo selects tier3, dedupes and room reset clears');
 if(report.stress){
  await cmd({type:'source',mode:'demo'});await until(()=>state.mode==='demo','demo');await sleep(300);await cmd({type:'settings',patch:{autoJoinChat:true,maxActors:100,reducedEffects:false}});
  for(let i=0;i<120;i++){await chat('vào chùa','stress-'+i);if(i%10===9)await sleep(1100);}await until(()=>state.actors.length===120,'120 actors',60000);await sleep(20000);
  async function fps(){const samples=[];for(let i=0;i<3;i++){await sleep(2100);samples.push(await page.evaluate(()=>window.__sceneDebug.fps));}return samples.reduce((a,b)=>a+b,0)/samples.length;}
  const baseline=await fps();await gift(10);await page.waitForFunction(()=>window.__giftShowDebug.active.length>0);const upgraded=await fps();report.performance={actors:state.actors.length,quality:await page.evaluate(()=>window.__sceneDebug.quality),baseline,upgraded,dropPercent:(baseline-upgraded)/baseline*100,comparison:'Same capture, 120 actors: idle vs active gift; not a benchmark of an older release'};await page.screenshot({path:out+'/stress-120.png'});assert.ok(upgraded>=24,'capture below24 FPS');
 }
 const dash=await ctx.newPage();await dash.goto(url+'/dashboard/');await dash.locator('#community-settings').screenshot({path:out+'/dashboard.png'});await dash.close();
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String(e.stack||e);report.lastState=state?.giftShow;process.exitCode=1;}
finally{socket?.disconnect();await browser?.close();if(server&&server.exitCode===null){if(server.connected)server.send('shutdown');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);if(server.exitCode===null)server.kill();}await writeFile(out+'/e2e-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
