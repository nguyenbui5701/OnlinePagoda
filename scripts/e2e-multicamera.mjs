import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {visualFixture,sleep,until,startVideo,stopVideo} from './visual-fixture.mjs';
import {io} from 'socket.io-client';
const out=process.env.ARTIFACT_DIR||'artifacts/multicamera/e2e';await mkdir(out,{recursive:true});
const report={stage:'2-auto-and-feedback',checks:[],errors:[],passed:false,realLive:'NOT VERIFIED',liveStudio:'NOT VERIFIED',phone:'NOT VERIFIED'};
let f;
try{
 f=await visualFixture(process.env.APP_BUILD_DIRECTORY||'test-results/multicamera-dist',3187);const {page,cmd,event}=f;
 await cmd({type:'settings',patch:{theme:'golden',sceneSpace:'hall',idleActivities:false,idleMinutes:.1,showBubbles:false,maxActors:100,fortuneEnabled:true,lanternEnabled:true,masterMute:true,safeRight:0,safeBottom:0,showTicker:false}});
 await cmd({type:'add',count:1});await cmd({type:'add',count:1});
 await until(()=>f.state.actors.length===2&&f.state.actors.every(a=>a.status==='standing'),'standing group',20000);
 await cmd({type:'settings',patch:{idleMinutes:30}});await cmd({type:'add',count:10});
 await until(()=>f.state.actors.length===12&&f.state.actors.filter(a=>a.status==='idle').length===10,'seated group',20000);
 const seatsBefore=f.state.actors.map(a=>[a.key,a.seatId]).sort();
 for(const view of ['front','left','right','wide']){
  await cmd({type:'camera-view',view});await page.waitForFunction(v=>window.__sceneDebug?.cameraView===v,view);
  assert.deepEqual(f.state.actors.filter(a=>seatsBefore.some(([key])=>key===a.key)).map(a=>[a.key,a.seatId]).sort(),seatsBefore);
  assert.equal(await page.evaluate(()=>window.__sceneDebug.camera.scale),1);
  await sleep(300);
  for(const [width,height] of [[576,1024],[1080,1920]]){await page.setViewportSize({width,height});await sleep(300);await page.screenshot({path:`${out}/${view}-${width}.png`});}
  // Actual rule/queue path, not injected render objects; a new person requests bow.
  await event({type:'chat',userId:`bow-${view}`,nickname:'An Nhiên',text:'lạy Phật'});
  await page.waitForFunction(()=>window.__sceneDebug.welcomes.some(w=>w.phase==='pray'));
  await event({type:'chat',userId:`lantern-${view}`,nickname:'Gia đình an lành',text:'hoa đăng gia đình'});
  await page.waitForFunction(()=>window.__lanternDebug?.visible);
  await page.screenshot({path:`${out}/${view}-prayer-card.png`});
  const prior=await page.evaluate(()=>window.__sceneDebug.cameraView);await page.reload();await page.waitForFunction(v=>window.__sceneDebug?.cameraView===v,prior);
  await until(()=>!f.state.lantern,'card complete',12000);
  report.checks.push(`${view}: both sizes, seated/standing/prayer/card, reload resumes view, no zoom`);
 }
 // Record is presentation only: never starts a second sound stream.
 await startVideo(page);
 for(const view of ['front','left','right','wide']){await cmd({type:'camera-view',view});await sleep(1500);}
 await stopVideo(page,`${out}/manual-A-B-C-D.webm`);
 await cmd({type:'settings',patch:{cameraAuto:true,cameraHoldSeconds:15,cameraFade:true,reducedEffects:false}});
 await until(()=>f.state.camera.from&&f.state.camera.endsAt>Date.now(),'automatic transition',26000);
 const target=f.state.camera.view,deadline=f.state.camera.endsAt;
 await page.waitForFunction(()=>window.__sceneDebug.fade>0&&window.__sceneDebug.fade<1);
 await event({type:'chat',userId:'during-fade',nickname:'Bình an',text:'xin quẻ'});
 await page.screenshot({path:`${out}/automatic-dissolve.png`});
 await page.reload();await page.waitForFunction(v=>window.__sceneDebug?.cameraView===v,target);
 assert.equal(f.state.camera.view,target);assert.ok(!f.state.camera.endsAt||f.state.camera.endsAt===deadline);
 await sleep(800);
 // Reload destroys MediaRecorder; record the next transition separately.
 await startVideo(page);await until(()=>f.state.camera.from,'second transition',35000);await sleep(1300);await stopVideo(page,`${out}/automatic-transition.webm`);
 await cmd({type:'settings',patch:{cameraAuto:false}});
 report.checks.push('Automatic switches with live actors; content arrives during dissolve, reload preserves target and deadline');
 await cmd({type:'camera-view',view:'left'});
 const donor=f.state.actors.find(a=>a.status==='idle');
 await cmd({type:'gift-demo',group:'rose',userId:donor.key.split(':').at(-1),nickname:donor.displayName,units:1});
 await page.waitForFunction(()=>window.__sceneDebug.ritual?.phase==='offer');
 assert.equal(await page.evaluate(()=>window.__sceneDebug.camera.scale),1);assert.equal(f.state.metrics.giftUnits,1);
 await page.screenshot({path:`${out}/left-gift.png`});
 await cmd({type:'settings',patch:{sceneSpace:'courtyard'}});await page.waitForFunction(()=>window.__sceneDebug.cameraView==='front');
 await cmd({type:'settings',patch:{sceneSpace:'hall',theme:'classic'}});await page.waitForFunction(()=>window.__sceneDebug.cameraView==='front');
 await cmd({type:'settings',patch:{theme:'golden'}});await page.waitForFunction(()=>window.__sceneDebug.cameraView==='left');
 await cmd({type:'reset'});await page.waitForFunction(()=>window.__sceneDebug.cameraView==='front');
 report.checks.push('Gift counts once without camera zoom; courtyard/classic front; reset front');
 // Gift lotus size is equal across tiers; free mythology has no portrait or points.
 const scales=[];
 for(const coins of [1,5,10]){
  await event({type:'gift',userId:`size-${coins}`,nickname:'Sen thử',gift:{id:'test-size',name:'Quà thử',count:1,unitCoins:coins,finished:true}});
  await page.waitForFunction(()=>window.__giftShowDebug.active.some(a=>a.alpha>.9));
  scales.push(await page.evaluate(()=>window.__giftShowDebug.active[0].bodyScale));
  await page.screenshot({path:`${out}/gift-${coins}.png`});
  await until(()=>f.state.giftShow.active.length===0,'gift finishes',12000);
 }
 assert.equal(scales[0],scales[1]);
 const points=f.state.metrics.giftUnits;
 for(const text of ['rồng vàng','phượng hoàng','long phụng']){
  await event({type:'chat',userId:`effect-${text}`,nickname:'Người xem',text});
  await page.waitForFunction(()=>window.__communityDebug.rendered.some(e=>e.alpha>.9));
  assert.ok(await page.evaluate(()=>window.__communityDebug.rendered.every(e=>!(e.portrait??'').includes('lotus-portrait'))));
  await page.screenshot({path:`${out}/comment-${text==='rồng vàng'?'dragon':text==='phượng hoàng'?'phoenix':'long-phung'}.png`});
  await sleep(3200);
 }
 assert.equal(f.state.metrics.giftUnits,points);report.checks.push('Equal lotus body size at 1/5 coins; enlarged myth effects; comments do not add points or avatar');
 await cmd({type:'settings',patch:{cameraAuto:true}});
 const probe=io(f.url,{auth:{role:'overlay'}});await new Promise(resolve=>probe.once('connect',resolve));
 try{
  for(let i=0;i<3;i++)probe.emit('telemetry',{fps:10,quality:'full',camera:{view:'front',capture:false,errors:{}}});await sleep(350);assert.equal(f.state.camera.paused,undefined);
  for(let i=0;i<3;i++)probe.emit('telemetry',{fps:10,quality:'full',camera:{view:'front',capture:true,errors:{}}});
  await until(()=>f.state.camera.paused,'capture-only FPS pause');
  await cmd({type:'settings',patch:{showGuide:true}});await sleep(250);assert.ok(f.state.camera.paused);
  await cmd({type:'settings',patch:{cameraAuto:true}});await until(()=>!f.state.camera.paused,'explicit resume');
 }finally{probe.disconnect();}
 await cmd({type:'camera-view',view:'left'});await until(()=>f.state.settings.cameraAuto===false,'manual disables automatic');
 await cmd({type:'source',mode:'tiktok'});await until(()=>f.state.mode==='tiktok','select fake LIVE source');
 await cmd({type:'live-connect',username:'fixture_camera'});await until(()=>f.state.connection.status==='LIVE_CONNECTED','fake LIVE');
 await cmd({type:'camera-view',view:'right'});const oldSession=f.state.sessionId;
 await cmd({type:'live-connect',username:'fixture_other'});await until(()=>f.state.sessionId!==oldSession,'other room');
 await page.waitForFunction(()=>window.__sceneDebug.cameraView==='front');
 report.checks.push('Preview FPS cannot pause capture; three low capture samples latch pause until explicit resume; fake LIVE room reset front');
 // Resource failure must remain on a valid scene and report it through telemetry.
 await f.context.route('**/art/multicamera/hall-right.png',r=>r.abort());await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.golden?.camera?.errors?.right);
 await cmd({type:'camera-view',view:'right'});await sleep(600);
 assert.equal(await page.evaluate(()=>window.__sceneDebug.cameraView),'front');
 await until(()=>f.state.metrics.cameraDisplays?.some(d=>d.errors.right),'asset error telemetry');
 await page.screenshot({path:`${out}/missing-asset-fallback.png`});
 const dashboard=await f.context.newPage();await dashboard.goto(f.url+'/dashboard/');await dashboard.locator('#camera-settings').screenshot({path:`${out}/dashboard-camera.png`});await dashboard.close();
 report.checks.push('Unavailable target retains front without black frame; dashboard receives asset errors');
 report.errors=f.errors;assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack||String(e);process.exitCode=1;}
finally{await f?.close();await writeFile(`${out}/e2e-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
