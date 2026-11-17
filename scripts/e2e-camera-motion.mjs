import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {io} from 'socket.io-client';
import {visualFixture,sleep,until,startVideo,stopVideo} from './visual-fixture.mjs';
const out=process.env.ARTIFACT_DIR||'artifacts/camera-motion/e2e';await mkdir(out,{recursive:true});
const report={checks:[],errors:[],passed:false,realLive:'NOT VERIFIED',liveStudio:'NOT VERIFIED',phoneAudio:'NOT VERIFIED'};let f;
try{
 f=await visualFixture(process.env.APP_BUILD_DIRECTORY||'test-results/camera-motion-dist',3190);const {page,cmd,event}=f;
 await cmd({type:'settings',patch:{theme:'golden',sceneSpace:'hall',idleActivities:false,idleMinutes:30,showBubbles:true,compactGiftPanels:true,fortuneEnabled:true,lanternEnabled:true,masterMute:true,safeRight:0,safeBottom:0,showTicker:false,cameraDriftEnabled:true,cameraGiftFocusEnabled:true}});
 await cmd({type:'add',count:10});await until(()=>f.state.actors.length===10&&f.state.actors.every(a=>a.status==='idle'),'seated',20000);
 const donor=f.state.actors[0],seats=f.state.actors.map(a=>[a.key,a.seatId]);let units=0;
 async function gift(){await cmd({type:'gift-demo',group:'rose',userId:donor.key.split(':').at(-1),nickname:donor.displayName,units:1});units++;}
 for(const view of ['front','left','right','wide']){
  await cmd({type:'camera-view',view});await page.waitForFunction(v=>window.__sceneDebug?.cameraView===v,view);
  await page.waitForFunction(()=>window.__sceneDebug.camera.scale>1.001);await sleep(800);
  for(const [width,height] of [[576,1024],[1080,1920]]){await page.setViewportSize({width,height});await sleep(200);await page.screenshot({path:`${out}/${view}-drift-${width}.png`});}
  await page.setViewportSize({width:576,height:1024});
  const label=await page.evaluate(()=>window.__sceneDebug.labels[1]);
  await startVideo(page);await gift();
  await page.waitForFunction(()=>window.__sceneDebug.motion?.kind==='focus'&&window.__sceneDebug.camera.scale>1.29);
  const focus=await page.evaluate(()=>window.__sceneDebug);
  assert.equal(focus.focusName.key,donor.key);assert.equal(focus.focusName.text,donor.displayName);assert.ok(focus.focusName.y>180&&focus.focusName.y<1056);
  assert.equal(focus.ritual.actorId,donor.key);assert.ok(focus.camera.x<=0&&focus.camera.y<=0);
  const stable=focus.labels.find(l=>l.key===label.key);assert.ok(stable&&Math.abs(stable.height-label.height)<1,'label size stable');
  await page.screenshot({path:`${out}/${view}-focus-576.png`});await page.setViewportSize({width:1080,height:1920});await sleep(100);await page.screenshot({path:`${out}/${view}-focus-1080.png`});await page.setViewportSize({width:576,height:1024});
  await until(()=>f.state.camera.motion?.kind==='recover','recovery');await sleep(1300);assert.equal(f.state.camera.motion.kind,'drift');
  await stopVideo(page,`${out}/${view}-drift-focus-recover.webm`);
  await until(()=>!f.state.ritual,'ritual done');assert.equal(f.state.metrics.giftUnits,units);
  assert.deepEqual(f.state.actors.map(a=>[a.key,a.seatId]),seats);
  const motion=f.state.camera.motion;await page.reload();await page.waitForFunction(v=>window.__sceneDebug?.cameraView===v,view);
  assert.equal(f.state.camera.motion.startedAt,motion.startedAt);assert.equal(f.state.camera.motion.endsAt,motion.endsAt);
  report.checks.push(`${view}: drift, actual donor focus, readable name/constant labels, recovery, no seat or point changes, reload resumes; 2 resolutions and video`);
 }
 // Unknown donors never create a camera target. Cards retain their screen bounds.
 await event({type:'gift',userId:'no-actor',nickname:'Khách chưa có nhân vật',gift:{id:'unknown',count:1,finished:true,unitCoins:1}});units++;
 await sleep(3200);assert.equal(f.state.camera.motion.kind,'drift');assert.ok(!f.state.actors.some(a=>a.key.includes('no-actor')));
 await event({type:'chat',userId:'fortune-person',nickname:'An Nhiên',text:'xin quẻ'});await page.waitForFunction(()=>window.__fortuneDebug.visible);
 const bounds=await page.evaluate(()=>window.__fortuneDebug.bounds);await gift();
 await page.waitForFunction(()=>window.__sceneDebug.motion?.kind==='focus');assert.deepEqual(await page.evaluate(()=>window.__fortuneDebug.bounds),bounds);
 const start=f.state.camera.motion.startedAt;await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.revision>0);
 assert.ok(f.state.camera.motion.startedAt>=start);await until(()=>!f.state.ritual,'reload ritual completes');assert.equal(f.state.metrics.giftUnits,units);
 await event({type:'chat',userId:'lantern-person',nickname:'An Lành',text:'hoa đăng gia đình'});
 await page.waitForFunction(()=>window.__lanternDebug.visible,undefined,{timeout:30000});const lanternBounds=await page.evaluate(()=>window.__lanternDebug.bounds);await sleep(1000);assert.deepEqual(await page.evaluate(()=>window.__lanternDebug.bounds),lanternBounds);
 await until(()=>!f.state.lantern&&!f.state.fortune,'cards done',30000);report.checks.push('No actor = no fake focus; fortune/lantern remain fixed; reload during ritual does not replay gift points');
 await cmd({type:'settings',patch:{idleMinutes:.1}});await until(()=>f.state.actors.every(a=>a.status==='standing'),'standing donors',18000);await cmd({type:'settings',patch:{idleMinutes:30}});
 const second=f.state.actors.find(a=>a.key!==donor.key);
 await gift();await cmd({type:'gift-demo',group:'rose',userId:second.key.split(':').at(-1),nickname:second.displayName,units:1});units++;
 for(const person of [donor,second]){await page.waitForFunction(key=>window.__sceneDebug.motion?.kind==='focus'&&window.__sceneDebug.focusName?.key===key,person.key);await page.screenshot({path:`${out}/standing-focus-${person===donor?1:2}.png`});}
 await until(()=>!f.state.ritual,'queued donors finish');assert.equal(f.state.metrics.giftUnits,units);assert.ok(f.state.actors.every(a=>a.status==='standing'));
 report.checks.push('Two standing donors focus in ritual order, retain standing status, gifts counted once');
 await cmd({type:'settings',patch:{cameraAuto:true,cameraHoldSeconds:15,cameraFade:true}});
 await until(()=>f.state.camera.from,'fade',26000);const end=f.state.camera.endsAt;
 await gift();await sleep(1200);assert.ok(!f.state.camera.endsAt||f.state.camera.endsAt===end);
 await until(()=>f.state.camera.motion?.kind==='focus','gift after fade');await until(()=>!f.state.ritual,'finish');assert.equal(f.state.metrics.giftUnits,units);
 await cmd({type:'camera-stop'});await page.waitForFunction(()=>Math.abs(window.__sceneDebug.camera.scale-1)<1e-6&&!window.__sceneDebug.motion);assert.equal(f.state.settings.cameraAuto,false);assert.equal(f.state.settings.cameraDriftEnabled,false);assert.equal(f.state.settings.cameraGiftFocusEnabled,false);
 await cmd({type:'settings',patch:{cameraDriftEnabled:true,cameraGiftFocusEnabled:true,reducedEffects:true}});await sleep(1200);assert.ok(await page.evaluate(()=>Math.abs(window.__sceneDebug.camera.scale-1)<1e-6&&!window.__sceneDebug.motion));
 await cmd({type:'settings',patch:{reducedEffects:false,cameraDriftEnabled:true}});
 const probe=io(f.url,{auth:{role:'overlay'}});await new Promise(r=>probe.once('connect',r));
 try{for(let i=0;i<3;i++)probe.emit('telemetry',{fps:10,quality:'full',camera:{view:'front',capture:false,errors:{}}});await sleep(300);assert.ok(!f.state.camera.paused);
  for(let i=0;i<3;i++)probe.emit('telemetry',{fps:10,quality:'full',camera:{view:'front',capture:true,errors:{}}});await until(()=>f.state.camera.paused,'FPS pause');await sleep(1000);assert.ok(await page.evaluate(()=>Math.abs(window.__sceneDebug.camera.scale-1)<1e-6&&!window.__sceneDebug.motion));
  await cmd({type:'settings',patch:{showGuide:true}});await sleep(200);assert.ok(f.state.camera.paused);await cmd({type:'settings',patch:{cameraDriftEnabled:true}});await until(()=>!f.state.camera.paused,'explicit resume');
 }finally{probe.disconnect();}
 report.checks.push('Gift arriving in dissolve waits; stop settles; reduced effects disable motion; capture-only FPS pause latches until explicit resume');
 await cmd({type:'settings',patch:{sceneSpace:'courtyard'}});await page.waitForFunction(()=>Math.abs(window.__sceneDebug.camera.scale-1)<1e-6&&!window.__sceneDebug.motion&&window.__sceneDebug?.cameraView==='front');
 await cmd({type:'settings',patch:{sceneSpace:'hall',theme:'classic'}});await page.waitForFunction(()=>window.__sceneDebug.theme==='classic'&&Math.abs(window.__sceneDebug.camera.scale-1)<1e-6&&!window.__sceneDebug.motion);
 await cmd({type:'settings',patch:{theme:'golden'}});
 await cmd({type:'source',mode:'tiktok'});await until(()=>f.state.mode==='tiktok','source');await cmd({type:'live-connect',username:'fixture_motion'});await until(()=>f.state.connection.status==='LIVE_CONNECTED','fake live');
 await cmd({type:'camera-view',view:'right'});const session=f.state.sessionId;await cmd({type:'live-connect',username:'fixture_other'});await until(()=>f.state.sessionId!==session,'room');await page.waitForFunction(()=>window.__sceneDebug?.cameraView==='front');
 report.checks.push('Courtyard/classic unchanged; fake LIVE room change cancels old motion and returns A');
 const dashboard=await f.context.newPage();await dashboard.goto(f.url+'/dashboard/');await dashboard.locator('#camera-settings').screenshot({path:`${out}/dashboard.png`});await dashboard.close();
 report.errors=f.errors;assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack||String(e);process.exitCode=1;}
finally{await f?.close();await writeFile(`${out}/e2e-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
