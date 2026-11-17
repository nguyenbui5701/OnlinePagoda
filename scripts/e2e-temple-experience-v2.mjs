import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {visualFixture,until,sleep,startVideo,stopVideo} from './visual-fixture.mjs';
const out=process.env.ARTIFACT_DIR||`artifacts/temple-experience-v2/clean-art/runs/${new Date().toISOString().replace(/[:.]/g,'-')}/cluster1`;await mkdir(out,{recursive:true});
const fullMedia=process.env.TEMPLE_FULL_MEDIA==='1';
const report={scope:'Clean architecture + continuous straight carpet; cards 4s and camera pace',implementationRevision:'reference-plates-v4',passed:false,checks:[],errors:[],realLive:'NOT VERIFIED',artApproval:'PENDING',routingV2:'NOT IMPLEMENTED',comboV2:'NOT IMPLEMENTED',media:fullMedia?'full':'2 review images (left/right); failure image if needed'};let f;
process.env.FORTUNE_VOICE_FIXTURE='1';process.env.FORTUNE_VOICE_FIXTURE_SECONDS='7';
report.routingV2='Implemented; route-specific acceptance is in cluster2';
try{
 f=await visualFixture(process.env.APP_BUILD_DIRECTORY||'test-results/temple-experience-v2-dist',3194);const {page,cmd,event}=f;
 await cmd({type:'settings',patch:{theme:'golden',sceneSpace:'hall',cameraAuto:false,cameraDriftEnabled:false,cameraGiftFocusEnabled:false,templeFloorPreview:false,fortuneEnabled:true,lanternEnabled:true,fortuneVoiceEnabled:true,lanternVoiceEnabled:true,masterMute:false,autoJoinChat:false,showTicker:false}});
 await page.goto(f.url+'/overlay/?capture=1&sound');await page.getByRole('button',{name:'Bật âm thanh',exact:true}).click();await page.waitForFunction(()=>window.__audioControl.debug().state==='ready');
 for(const kind of ['fortune','lantern'])for(const compact of [true,false]){
  await cmd({type:'settings',patch:{liveSafeLayout:compact}});const text=kind==='fortune'?'xem quẻ 123':'hoa đăng gia đình';
  await event({type:'chat',userId:`card-${kind}-${compact}`,nickname:'Bình An',text});
  await page.waitForFunction(k=>window[k==='fortune'?'__fortuneVoice':'__lanternVoice']?.status==='speaking',kind);
  await until(()=>f.state[kind],'reveal');const current=f.state[kind],end=current.expiresAt;
  if(fullMedia)await page.screenshot({path:`${out}/${kind}-${compact?'compact':'full'}-visible.png`});
  await until(()=>Date.now()>=current.startedAt+4400,'4s visible deadline');
  const status=await page.evaluate(k=>({visible:window[k==='fortune'?'__fortuneDebug':'__lanternDebug'].visible,voice:window[k==='fortune'?'__fortuneVoice':'__lanternVoice'].status}),kind);
  assert.equal(status.visible,false);assert.equal(status.voice,'speaking');assert.equal(f.state[kind].expiresAt,end);
  if(fullMedia)await page.screenshot({path:`${out}/${kind}-${compact?'compact':'full'}-hidden-speaking.png`});
  await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.revision>0);
  assert.equal(await page.evaluate(k=>window[k==='fortune'?'__fortuneDebug':'__lanternDebug'].visible,kind),false);
  await until(()=>!f.state[kind],'original deadline clears',18000);
  await page.getByRole('button',{name:'Bật âm thanh',exact:true}).click();await page.waitForFunction(()=>window.__audioControl.debug().state==='ready');
  report.checks.push(`${kind} ${compact?'compact':'full'}: hidden at 4s while synthetic PCM still speaking; original queue deadline retained; reload stays hidden`);
 }
 await cmd({type:'settings',patch:{templeFloorPreview:false,liveSafeLayout:true,masterMute:true,autoJoinChat:true,idleMinutes:30,idleActivities:false,maxActors:100,showBlessingTree:false}});
 for(let i=0;i<10;i++){await cmd({type:'add',count:10});await sleep(150);}
 await until(()=>f.state.actors.length===100&&f.state.actors.every(a=>a.status==='idle'&&!a.welcome),'100 seated',65000);
 await cmd({type:'settings',patch:{templeFloorPreview:true}});
 const seats=f.state.actors.map(a=>[a.key,a.seatId]);
 for(const view of ['front','left','right','wide']){
  await cmd({type:'camera-view',view});await page.waitForFunction(v=>window.__sceneDebug.cameraView===v&&window.__sceneDebug.floorPreview,view);
  for(const [width,height] of [[576,1024],[1080,1920]]){
   await page.setViewportSize({width,height});await sleep(300);
   const d=await page.evaluate(()=>window.__sceneDebug);
   if(view==='left')assert.ok(d.golden.camera.profile.statue.x<540,'reference left statue is left of centre');
   if(view==='right')assert.ok(d.golden.camera.profile.statue.x>540,'reference right statue is right of centre');
   assert.equal(d.golden.camera.cleanArchitecture,true);assert.deepEqual(d.golden.camera.errors,{});
   assert.equal(d.golden.camera.floor.seats,100);assert.equal(d.golden.camera.floor.view,view);
   assert.equal(d.golden.camera.floor.woodOverlay,false,'original floor artwork is never covered by generated wood');
   assert.equal(d.golden.camera.floor.originalFloor,view==='front');
   assert.equal(d.golden.camera.floor.projectedRugs,view!=='front','front retains its original lotus carpet');
   const carpet=d.golden.camera.floor.carpet;
   assert.equal(carpet.prayerPanels,0,'old prayer rug boxes are removed');
   assert.equal(carpet.textureMode,'original-band-seamless','overlap band boundaries rather than butt-joining the carpet tiles');
   assert.equal(carpet.crossingStrips,0,'no transverse carpet paints over the central runner');
   for(const edge of [carpet.leftEdge,carpet.rightEdge]){
    const a=edge[0],b=edge.at(-1),length=Math.hypot(b.x-a.x,b.y-a.y);
    for(const p of edge)assert.ok(Math.abs((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))/length<.01,'actual mesh edge stays straight (Float32 tolerance)');
   }
   const b=d.golden.camera.backdrop;assert.ok(b.x<=0&&b.y<=0&&b.x+b.width>=1079.99&&b.y+b.height>=1919.99,'background covers frame');
   assert.equal(d.actors,100);assert.ok(d.bodies.every(b=>b.width>0&&b.height>0),'all actors rendered');
   if(fullMedia)await page.screenshot({path:`${out}/floor-${view}-${width}.png`});
  }
  assert.deepEqual(f.state.actors.map(a=>[a.key,a.seatId]),seats);
 }
 await cmd({type:'reset'});await until(()=>f.state.actors.length===0,'reset geometry preview');await cmd({type:'add',count:10});await until(()=>f.state.actors.length===10&&f.state.actors.every(a=>a.status==='idle'&&!a.welcome&&!a.travel),'10 seated preview',140000);
 for(const view of ['front','left','right','wide']){await cmd({type:'camera-view',view});await page.waitForFunction(v=>window.__sceneDebug.cameraView===v,view);await page.setViewportSize({width:576,height:1024});await sleep(300);if(fullMedia||view==='left'||view==='right')await page.screenshot({path:`${out}/floor-${view}-10-people.png`});}
 await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.cameraView==='wide'&&window.__sceneDebug?.golden?.camera?.cleanArchitecture);
 assert.equal(f.state.actors.length,10);
 report.checks.push('Reference statue side verified; continuous carpet mesh edges straight; no strips cross runner; 100 actor objects retain identity (edge seats may be cropped in B/C); reload retains view');
 // Missing V2 art never substitutes an uncalibrated legacy background under V2 actors.
 await cmd({type:'camera-view',view:'right'});
 await f.context.route('**/art/temple-v2/reference/hall-right.png',r=>r.abort());
 await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.golden?.camera?.errors?.right);
 assert.notEqual(await page.evaluate(()=>window.__sceneDebug.cameraView),'right');
 report.checks.push('Missing clean right architecture keeps a loaded view with matching projection; error reported');
 await f.context.unroute('**/art/temple-v2/reference/hall-right.png');await cmd({type:'reset'});await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.revision>0);
 await cmd({type:'settings',patch:{sceneSpace:'courtyard'}});await page.waitForFunction(()=>window.__sceneDebug.floorPreview===false);
 await cmd({type:'settings',patch:{sceneSpace:'hall',templeFloorPreview:false,cameraDriftEnabled:true,cameraDriftSpeed:'fast'}});
 await page.setViewportSize({width:576,height:1024});if(fullMedia)await startVideo(page);await sleep(10000);if(fullMedia)await stopVideo(page,`${out}/fast-camera.webm`);
 assert.equal(f.state.settings.cameraHoldSeconds,60);const m=f.state.camera.motion;assert.equal(m.kind,'drift');assert.ok(m.endsAt-m.startedAt>=6000&&m.endsAt-m.startedAt<=9000);
 const dashboard=await f.context.newPage();await dashboard.goto(f.url+'/dashboard/');await dashboard.locator('#camera-settings').waitFor();if(fullMedia)await dashboard.locator('#camera-settings').screenshot({path:`${out}/dashboard.png`});await dashboard.close();
 report.checks.push('100 identities retain seats through A/B/C/D, 2 resolutions; preview off in courtyard; fast drift 6–9s without changing angle dwell');
 report.errors=f.errors;assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack||String(e);process.exitCode=1;try{await f?.page.screenshot({path:`${out}/FAIL.png`});}catch{/* Keep the original failure. */}}
finally{await f?.close();await writeFile(`${out}/e2e-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
