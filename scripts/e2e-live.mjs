import { fork } from 'node:child_process';
import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const port=Number(process.env.FIXTURE_PORT||3107),url=`http://127.0.0.1:${port}`;
const directory=resolve(`test-results/stage2-fixture-${Date.now()}`),outDir=process.env.ARTIFACT_DIR || 'artifacts/stage2/live-fixture';
const report={kind:'FIXTURE ONLY — NOT REAL LIVE',platform:process.platform,checks:[],errors:[],externalRequests:[],fpsSamples:[]};
await mkdir(outDir,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,ms=15000){const begin=Date.now();while(Date.now()-begin<ms){if(await fn())return;await sleep(100);}throw new Error(`Timeout: ${label}`);}
const ROOM='7444444444444444444';
const chat=(id,content='xin chào',msgId)=>({user:{id,displayId:`fixture_${id}`,nickname:'An Nhiên 🌸'},content,common:{roomId:ROOM,msgId}});
let server,browser,socket,state;
try{
  server=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,FIXTURE_PORT:String(port),FIXTURE_DATA_DIRECTORY:directory},stdio:['ignore','pipe','pipe','ipc']});
  server.stdout.on('data',()=>{});server.stderr.on('data',data=>report.errors.push(data.toString()));
  await until(async()=>{try{return(await(await fetch(`${url}/api/health`)).json()).fixture===true;}catch{return false;}},'fixture server');
  socket=io(url,{auth:{role:'dashboard'}});
  socket.on('snapshot',s=>state=s);socket.on('delta',d=>{if(!state||state.sessionId!==d.sessionId||state.revision+1!==d.revision){socket.emit('resync');return;}const map=new Map(state.actors.map(a=>[a.key,a]));d.removed.forEach(k=>map.delete(k));d.upserts.forEach(a=>map.set(a.key,a));state={...d,actors:[...map.values()]};});
  const rpc=(event,payload)=>new Promise((done,reject)=>socket.timeout(5000).emit(event,payload,(err,r)=>err?reject(err):done(r)));
  const command=async cmd=>{const r=await rpc('command',cmd);assert.equal(r.ok,true,r.error);};
  const emit=(event,payload)=>rpc('fixture',{event,payload});
  await until(()=>state,'snapshot');assert.equal(state.mode,'demo');assert.equal(state.settings.autoJoinChat,true);assert.equal(state.settings.autoJoinMember,false);assert.equal(state.settings.likeEffects,false);
  const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  browser=await chromium.launch({headless:true,...(existsSync(edge)?{executablePath:edge}:{}),args:['--enable-webgl','--ignore-gpu-blocklist']});
  report.browser=browser.version();const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1});context.setDefaultTimeout(15000);
  await context.route('**/*',route=>{const host=new URL(route.request().url()).hostname;if(!['127.0.0.1','localhost'].includes(host)){report.externalRequests.push(route.request().url());return route.abort();}return route.continue();});
  const page=await context.newPage(),overlay=await context.newPage();await overlay.setViewportSize({width:1080,height:1920});
  page.on('pageerror',e=>report.errors.push(e.message));overlay.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${url}/dashboard/`);await overlay.goto(`${url}/overlay/`);await overlay.waitForFunction(()=>window.__sceneDebug);
  await page.getByRole('button',{name:'+10 người',exact:true}).click();await until(()=>state.actors.length===10,'demo 10 guests');
  await page.getByRole('button',{name:'TIKTOK LIVE',exact:true}).click();await until(()=>state.mode==='tiktok','select TikTok');
  await page.getByLabel('Tên kênh TikTok',{exact:true}).fill('https://evil.example/@fixture/live');await page.getByRole('button',{name:'Kết nối',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(state.connection.status,'DISCONNECTED');report.checks.push('Username rejects unrelated URL without connecting');
  const connect=async(username,status='LIVE_CONNECTED')=>{
    await page.getByLabel('Tên kênh TikTok',{exact:true}).fill(username);await page.getByRole('button',{name:'Kết nối',exact:true}).click();await until(()=>state.connection.status===status,`connect ${username} -> ${status}`);
  };
  await connect('@fixture_offline','LIVE_OFFLINE');assert.equal(state.actors.length,0);await page.getByRole('button',{name:'DEMO',exact:true}).click();await until(()=>state.mode==='demo'&&state.actors.length===10,'demo survives offline');report.checks.push('Offline is distinct; DEMO preserves its ten actors and works');
  await page.getByRole('button',{name:'TIKTOK LIVE',exact:true}).click();await until(()=>state.mode==='tiktok','select live again');await connect('https://www.tiktok.com/@fixture_live/live');assert.equal(state.connection.roomId,ROOM);assert.equal(state.connection.username,'fixture_live');
  report.checks.push('UI connects through provider, normalizes URL and shows room/status');
  const spoof=await rpc('command',{type:'event',event:{type:'chat',source:'tiktok',scope:ROOM,userId:'spoof'}});assert.equal(spoof.ok,false);
  const mock=await rpc('command',{type:'add',count:1});assert.equal(mock.ok,false);report.checks.push('LIVE rejects browser-injected TikTok and DEMO events');
  await emit('chat',chat('9123456789012345678','cầu an','chat-1'));
  await emit('chat',chat('9123456789012345678','cầu an','chat-2'));
  await emit('chat',chat('9223456789012345678','lễ Phật','chat-3'));
  await until(()=>state.actors.length===2,'two user IDs');await overlay.waitForFunction(()=>window.__sceneDebug?.effects>0);await sleep(300);await overlay.screenshot({path:`${outDir}/first-chat-lotus.png`});
  assert.equal(new Set(state.actors.map(a=>a.key)).size,2);report.checks.push('Modern first-chat prayer waits for seat; same ID deduped, same nickname different IDs distinct');
  await emit('chat',{...chat('bad'),content:{not:'a string'}});await emit('chat',{...chat('old','cầu an'),common:{roomId:ROOM,createTime:String(Math.floor(Date.now()/1000)-3600)}});await sleep(250);assert.equal(state.actors.length,2);report.checks.push('Malformed and historical connector payloads do not create actors');
  await emit('member',chat('300','', 'member-off'));await sleep(200);assert.equal(state.actors.length,2);
  await page.getByLabel('Người vừa vào LIVE ⇒ thêm người vào chùa (beta)',{exact:true}).check();await until(()=>state.settings.autoJoinMember,'member setting');await emit('member',chat('300','', 'member-on'));await until(()=>state.actors.length===3,'member opt-in');report.checks.push('Member OFF/ON works with real-shaped events');
  await emit('like',{...chat('like-only'),count:20});await sleep(200);assert.equal(state.actors.length,3);
  await page.getByLabel('Like ⇒ hiệu ứng nhẹ',{exact:true}).check();await until(()=>state.settings.likeEffects,'like setting');for(let i=0;i<10;i++)await emit('like',{...chat('like-only','',`like-${i}`),count:3});await until(()=>state.metrics.likeUnits===50,'aggregated likes');assert.equal(state.actors.length,3);report.checks.push('Likes are opt-in aggregated effects and never create actors');
  const gift=(n,end,id)=>({...chat('gift-only','',id),giftId:'5655',gift:{type:1},repeatCount:n,repeatEnd:end,groupId:'9000'});
  for(const n of [1,2,3])await emit('gift',gift(n,0,`gift-${n}`));await emit('gift',gift(3,1,'gift-final'));await emit('gift',gift(3,1,'gift-final'));await emit('gift',gift(3,1,'gift-final-replay'));
  await until(()=>state.metrics.giftUnits===3,'gift streak counted once');
  for(const id of ['single-1','single-2'])await emit('gift',{...gift(1,0,id),gift:{type:2},groupId:'0'});
  await until(()=>state.metrics.giftUnits===5,'two single gifts');assert.equal(state.metrics.giftTransactions,3);assert.equal(state.actors.length,3);report.checks.push('Gift 1→2→3→final3 counts 3; independent singles count once despite effect cooldown');
  await emit('roomUser',{total:'42',totalUser:'9999'});await until(()=>state.connection.viewers==='42','ROOM_USER viewers');assert.equal(state.actors.length,3);report.checks.push('Concurrent viewers from ROOM_USER remain separate from actors and cumulative audience');
  await overlay.reload();await overlay.waitForFunction(()=>window.__sceneDebug?.actors===3);await overlay.waitForFunction(()=>window.__sceneDebug?.states.every(s=>s==='idle'));
  await overlay.screenshot({path:`${outDir}/overlay-1080x1920.png`});await page.screenshot({path:`${outDir}/dashboard-connected-fixture.png`,fullPage:true});
  const scene=state.sessionId;await emit('error',{code:'ECONNRESET',message:'PRIVATE_COOKIE_SENTINEL'});await until(()=>state.connection.status==='RECONNECTING','network failure');assert.equal(state.actors.length,3);assert.ok(!state.connection.lastError.includes('PRIVATE_COOKIE_SENTINEL'));
  await until(()=>state.connection.status==='LIVE_CONNECTED','network reconnect');assert.equal(state.sessionId,scene);assert.equal(state.actors.length,3);report.checks.push('Network retry retains scene, redacts errors and uses one connection');
  const inspect=await rpc('fixture',{operation:'inspect'});assert.equal(inspect.active,1);
  await page.getByRole('button',{name:'Ngắt kết nối',exact:true}).click();await until(()=>state.connection.status==='DISCONNECTED','manual disconnect');assert.equal(state.actors.length,3);
  await connect('@fixture_slow','CONNECTING');await until(()=>page.getByRole('button',{name:'Kết nối',exact:true}).isDisabled(),'browser renders pending connection');
  await page.getByRole('button',{name:'DEMO',exact:true}).click();await until(()=>state.mode==='demo','cancel pending connect');assert.equal(state.actors.length,10);assert.equal((await rpc('fixture',{operation:'inspect'})).active,0);report.checks.push('Connect is disabled in flight; switch to DEMO cancels pending connection');
  await command({type:'source',mode:'tiktok'});await connect('@fixture_live');
  let measuring=true;const sampling=(async()=>{while(measuring){report.fpsSamples.push(await overlay.evaluate(()=>window.__sceneDebug?.fps||0));await sleep(500);}})();
  for(let i=0;i<100;i++){await emit('chat',chat(String(1000+i),'xin chào PRIVATE_CHAT_SENTINEL',`burst-${i}`));await sleep(100);}
  measuring=false;await sampling;await until(()=>state.total===100&&state.queue===40,'100 raw messages / 10 sec');assert.equal(state.actors.length,60);await overlay.waitForFunction(()=>window.__sceneDebug?.states.length===60&&window.__sceneDebug.states.every(s=>s==='idle'));
  await overlay.screenshot({path:`${outDir}/overlay-60-tiktok-fixture.png`});report.checks.push('100 modern messages / 10s: 60 actors, 40 FIFO waiting, responsive browser');
  await page.getByRole('button',{name:'Ngắt kết nối',exact:true}).click();await until(()=>state.connection.status==='DISCONNECTED','disconnect before room switch');await connect('@fixture_other');assert.equal(state.actors.length,0);assert.equal(state.connection.roomId,'7555555555555555555');
  await emit('chat',{...chat('1000'),common:{roomId:'7555555555555555555',msgId:'different-room'}});await until(()=>state.actors.length===1,'actor in new room');assert.ok(state.actors[0].key.startsWith('tiktok:7555555555555555555:'));report.checks.push('Changing room cannot mix identities from the previous room');
  await page.getByRole('button',{name:'Ngắt kết nối',exact:true}).click();await until(()=>state.connection.status==='DISCONNECTED','disconnect before rate test');await connect('@fixture_rate','RATE_LIMITED');
  assert.ok(state.connection.retryAt-Date.now()>115000);await until(()=>page.getByRole('button',{name:'Thử lại',exact:true}).isDisabled(),'browser renders retry cooldown');await page.screenshot({path:`${outDir}/dashboard-rate-limited-fixture.png`,fullPage:true});
  await command({type:'live-disconnect'});const attempts=(await rpc('fixture',{operation:'inspect'})).created;
  const blocked=await rpc('command',{type:'live-connect',username:'fixture_live'});assert.equal(blocked.ok,false);assert.equal((await rpc('fixture',{operation:'inspect'})).created,attempts);report.checks.push('Retry-After respected; manual/channel retry cannot bypass rate limit');
  await command({type:'source',mode:'demo'});await command({type:'add',count:1});await until(()=>state.actors.length===11,'demo after rate limit');report.checks.push('DEMO remains fully usable while TikTok is rate limited');
  for(const name of await readdir(directory)){assert.equal(name,'settings.json');const content=await readFile(resolve(directory,name),'utf8');assert.ok(!/PRIVATE_CHAT_SENTINEL|PRIVATE_COOKIE_SENTINEL|9123456789012345678|rawChat|accessToken|sessionid/.test(content));}
  report.checks.push('Only allowlisted settings persisted; no raw chat, viewer IDs, cookies or tokens');
  const previousSession=state.sessionId;await rpc('fixture',{operation:'restart'});
  await until(()=>state.sessionId!==previousSession&&state.mode==='demo','restart server in DEMO',20000);assert.equal(state.settings.tiktokUsername,'fixture_live');assert.equal(state.settings.autoJoinMember,true);assert.equal(state.settings.likeEffects,true);assert.equal(state.connection.status,'DISCONNECTED');report.checks.push('Restart preserves settings but never auto-connects TikTok');
  await page.reload();await page.getByTestId('live-status').filter({hasText:'DEMO'}).waitFor();await page.setViewportSize({width:390,height:844});await sleep(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.checks.push('Added LIVE panel works on mobile without horizontal scroll');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.checks.push('No JavaScript errors or external requests in the fixture suite');
  report.fps={min:Math.min(...report.fpsSamples),average:report.fpsSamples.reduce((a,b)=>a+b,0)/report.fpsSamples.length,max:Math.max(...report.fpsSamples)};report.passed=true;
}catch(error){report.passed=false;report.failure=String(error.stack||error);process.exitCode=1;}
finally{
  socket?.disconnect();await browser?.close();
  if(server&&server.exitCode===null){await new Promise(done=>{const timer=setTimeout(()=>{server.kill();done();},5000);server.once('exit',()=>{clearTimeout(timer);done();});server.send('shutdown');});}
  await writeFile(`${outDir}/test-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
