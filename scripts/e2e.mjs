import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const url=process.env.TEST_URL||'http://127.0.0.1:3000';
assert.equal((await (await fetch(`${url}/api/health`)).json()).fixture, true, 'E2E requires an isolated fixture server');
const outDir=process.env.ARTIFACT_DIR || 'artifacts/stage2/demo';
const report={url,platform:process.platform,checks:[],fpsSamples:[],errors:[],externalRequests:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,label,timeout=15000){const start=Date.now();while(Date.now()-start<timeout){if(await check())return;await sleep(100);}throw new Error(`Timeout: ${label}`);}
const socket=io(url,{auth:{role:'dashboard'}});let state;const phases=new Set();
socket.on('snapshot',s=>{state=s;s.actors.forEach(a=>phases.add(a.status));});
socket.on('delta',d=>{if(!state||d.sessionId!==state.sessionId||d.revision!==state.revision+1){socket.emit('resync');return;}const map=new Map(state.actors.map(a=>[a.key,a]));d.removed.forEach(k=>map.delete(k));d.upserts.forEach(a=>{map.set(a.key,a);phases.add(a.status);});state={...d,actors:[...map.values()]};});
const command=cmd=>new Promise((resolve,reject)=>socket.timeout(5000).emit('command',cmd,(err,reply)=>err?reject(err):reply.ok?resolve(reply):reject(new Error(reply.error))));
let browser,originalSettings;
try{
  await until(()=>state,'server snapshot');if(state.mode && state.mode !== 'demo')throw new Error('E2E refused: switch to DEMO before testing');originalSettings={...state.settings};
  const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  browser=await chromium.launch({headless:true,...(existsSync(edge)?{executablePath:edge}:{}),args:['--enable-webgl','--ignore-gpu-blocklist']});
  const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1});
  context.setDefaultTimeout(15000);
  await context.route('**/*',route=>{const host=new URL(route.request().url()).hostname;if(host!=='127.0.0.1'&&host!=='localhost'){report.externalRequests.push(route.request().url());return route.abort();}return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  const overlay=await context.newPage();await overlay.setViewportSize({width:1080,height:1920});overlay.on('pageerror',e=>report.errors.push(e.message));
  await command({type:'reset'});await command({type:'settings',patch:{maxActors:60,idleMinutes:8,animationSpeed:1,showLabels:true,showGuide:true,showRegister:true,effects:true,effectIntensity:.65,safeRight:0,safeBottom:0}});
  await page.goto(`${url}/dashboard/`);await overlay.goto(`${url}/overlay/`);
  await overlay.waitForFunction(()=>window.__sceneDebug?.actors===0);
  await page.getByRole('button',{name:'+10 người',exact:true}).click();
  await until(()=>state.actors.length===10,'10 actors');
  await overlay.waitForFunction(()=>window.__sceneDebug?.states.includes('walk'));
  report.checks.push('Dashboard +10 creates ten walking actors');
  await overlay.waitForFunction(()=>window.__sceneDebug?.states.length===10&&window.__sceneDebug.states.every(s=>s==='idle'));
  const ten=await overlay.evaluate(()=>window.__sceneDebug);assert.equal(ten.labels.length,10);assert.equal(new Set(state.actors.map(a=>a.seatId)).size,10);
  await mkdir(outDir,{recursive:true});await overlay.screenshot({path:outDir+'/overlay-1080x1920.png'});await page.screenshot({path:outDir+'/dashboard.png',fullPage:true});
  report.checks.push('Ten named actors seated; original overlay screenshot 1080x1920');
  await page.getByRole('button',{name:'Cầu an',exact:true}).click();
  await overlay.waitForFunction(()=>window.__sceneDebug?.effects>0);await sleep(400);await overlay.screenshot({path:outDir+'/lotus-effect.png'});report.checks.push('Cầu an produces visible lotus bloom');
  const id=decodeURIComponent(state.actors[0].key.split(':').at(-1));
  for(const text of ['Xin chào','lễ phật','cầu an'])await command({type:'event',event:{type:'chat',userId:id,nickname:'An Nhiên 1',text}});
  await sleep(400);assert.equal(state.actors.length,10);report.checks.push('Three comments for same ID do not duplicate actor');
  await command({type:'event',event:{type:'chat',userId:'safe-test',nickname:'<script>alert(1)</script><b>An</b> https://bad.example',text:'<img src=x onerror=alert(1)> cầu an'}});
  await until(()=>state.actors.length===11,'sanitized guest');assert.equal(state.actors.find(a=>a.key.endsWith('safe-test')).displayName,'An');report.checks.push('Untrusted HTML/script is sanitized and never rendered as markup');
  await command({type:'reset'});await command({type:'add',count:100});await command({type:'add',count:10});await command({type:'add',count:10});
  await until(()=>state.total===120&&state.actors.length===60&&state.queue===60,'120-user burst');
  await page.getByTestId('queue').filter({hasText:'60'}).waitFor();
  await overlay.waitForFunction(()=>window.__sceneDebug?.states.length===60&&window.__sceneDebug.states.every(s=>s==='idle'));
  const before=state.actors.map(a=>`${a.key}:${a.seatId}`).sort();
  const labels=await overlay.evaluate(()=>window.__sceneDebug.labels);assert.equal(labels.length,60);
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j];assert.ok(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),`Overlapping labels: ${a.name}, ${b.name}`);}
  const bodies=await overlay.evaluate(()=>window.__sceneDebug.bodies);
  for(const label of labels)for(const body of bodies)if(label.key!==body.key)assert.ok(!(label.x<body.x+body.width&&label.x+label.width>body.x&&label.y<body.y+body.height&&label.y+label.height>body.y),`Body obscures label: ${label.name}`);
  await overlay.screenshot({path:outDir+'/overlay-60-actors.png'});report.checks.push('120-user burst: 60 actors, 60 FIFO waiting, 60 non-overlapping labels');
  await overlay.reload();await overlay.waitForFunction(()=>window.__sceneDebug?.actors===60);assert.deepEqual(state.actors.map(a=>`${a.key}:${a.seatId}`).sort(),before);report.checks.push('Overlay reload restores exact seat allocation');
  const noScroll=await overlay.evaluate(()=>document.documentElement.scrollWidth===innerWidth&&document.documentElement.scrollHeight===innerHeight);assert.ok(noScroll);report.checks.push('1080x1920 overlay has no scrollbars');
  await page.getByLabel('Tên nhân vật',{exact:true}).click();await overlay.waitForFunction(()=>window.__sceneDebug?.labels.length===0);assert.equal(await page.getByLabel('Tên nhân vật',{exact:true}).isChecked(),false);
  await page.getByLabel('Tên nhân vật',{exact:true}).click();await overlay.waitForFunction(()=>window.__sceneDebug?.labels.length===60);assert.equal(await page.getByLabel('Tên nhân vật',{exact:true}).isChecked(),true);report.checks.push('Live dashboard label toggle updates overlay');
  await command({type:'settings',patch:{animationSpeed:1.5,showGuide:false,effects:false}});await sleep(300);assert.equal(state.settings.showLabels,true);assert.equal(state.settings.animationSpeed,1.5);
  await command({type:'settings',patch:{animationSpeed:1,showGuide:true,effects:true}});report.checks.push('Settings patches preserve unrelated preferences');
  await command({type:'disconnect'});await until(()=>state.provider==='reconnecting','mock disconnect');assert.equal(state.actors.length,60);await until(()=>state.provider==='connected','mock reconnect');report.checks.push('Mock disconnect reconnects without clearing scene');
  await context.setOffline(true);await sleep(1000);await context.setOffline(false);await overlay.waitForFunction(()=>window.__sceneDebug?.actors===60);await until(()=>state.metrics.overlayCount>=2,'browser socket reconnection');report.checks.push('Browser transport reconnects and resynchronizes');
  // Sustained benchmark: 100 distinct chats over ten seconds with 60 visible actors.
  let stop=false;const sampling=(async()=>{while(!stop){report.fpsSamples.push(await overlay.evaluate(()=>window.__sceneDebug.fps));await sleep(500);}})();
  for(let i=0;i<100;i++){await command({type:'event',event:{type:'chat',userId:`load-${i}`,nickname:`Khách tải ${i}`,text:'bình an'}});await sleep(100);}
  stop=true;await sampling;await until(()=>state.total===220,'sustained 100 chats');assert.equal(state.actors.length,60);assert.equal(state.queue,160);report.checks.push('100 chats / 10 seconds: UI responsive, 60 actors, 160 waiting');
  await overlay.setViewportSize({width:720,height:1280});await sleep(300);assert.ok(await overlay.evaluate(()=>document.documentElement.scrollWidth===innerWidth&&document.documentElement.scrollHeight===innerHeight));await overlay.screenshot({path:outDir+'/overlay-720x1280.png'});report.checks.push('720x1280 aspect ratio and no overflow');
  await page.setViewportSize({width:390,height:844});await sleep(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.checks.push('Mobile dashboard has no horizontal overflow');
  await command({type:'reset'});await command({type:'settings',patch:{maxActors:1,idleMinutes:.1,animationSpeed:1}});await command({type:'add',count:1});await command({type:'add',count:1});
  await until(()=>state.actors.length===1&&state.queue===1,'idle test queue');const exitingKey=state.actors[0].key;
  await until(()=>state.actors[0]?.status==='exit','idle exit animation',10000);assert.equal(state.queue,1);
  await until(()=>state.actors.length===1&&state.actors[0].key!==exitingKey&&state.queue===0,'FIFO replacement after exit');
  report.actorPhases=[...phases];for(const phase of ['enter','walk','kneel','pray','idle','exit'])assert.ok(phases.has(phase));report.checks.push('All six actor phases and FIFO promotion after visible idle exit');
  assert.deepEqual(report.externalRequests,[]);report.checks.push('No external HTTP assets or network services requested');
  assert.deepEqual(report.errors,[]);report.checks.push('No browser JavaScript errors');
  report.fps={min:Math.min(...report.fpsSamples),average:report.fpsSamples.reduce((a,b)=>a+b,0)/report.fpsSamples.length,max:Math.max(...report.fpsSamples)};
  report.passed=true;
}catch(error){report.passed=false;report.failure=String(error.stack||error);throw error;}
finally{
  if(originalSettings)await command({type:'settings',patch:originalSettings}).catch(()=>{});
  await command({type:'reset'}).catch(()=>{});socket.disconnect();await browser?.close();
  await mkdir(outDir,{recursive:true});await writeFile(outDir+'/test-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
