import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {visualFixture,until,sleep,startVideo,stopVideo} from './visual-fixture.mjs';
const out=process.env.ARTIFACT_DIR||`artifacts/temple-experience-v2/routes/runs/${Date.now()}`;
await mkdir(out,{recursive:true});let f;
const report={passed:false,implementationRevision:'parallel-prayer-original-carpet-v1',checks:[],errors:[],realLive:'NOT VERIFIED',phoneAudio:'NOT VERIFIED',load120x30:'NOT RUN',fullPlanComplete:false};
try{
 f=await visualFixture(process.env.APP_BUILD_DIRECTORY||'test-results/temple-experience-v2-dist',3197);
 const {page,cmd,event}=f;
 await cmd({type:'settings',patch:{theme:'golden',sceneSpace:'hall',templeFloorPreview:true,cameraAuto:false,cameraDriftEnabled:false,cameraGiftFocusEnabled:true,cameraFade:false,walkSpeed:160,masterMute:true,idleActivities:true,idleMinutes:30,maxActors:100,autoJoinChat:true,showBlessingTree:false,fortuneEnabled:true,lanternEnabled:true}});
 await startVideo(page);
 await event({type:'chat',userId:'route-a',nickname:'An Nhiên',text:'vào chùa'});
 await event({type:'chat',userId:'route-b',nickname:'Minh Tâm',text:'vào chùa'});
 await until(()=>f.state.actors.some(a=>a.welcome?.journey),'outbound route');
 const first=f.state.actors.find(a=>a.welcome?.journey),journey=first.welcome.journey;
 await sleep(700);await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.revision>0);
 const resumed=f.state.actors.find(a=>a.key===first.key);
 if(resumed.welcome)assert.deepEqual(resumed.welcome.journey,journey,'reload retains server route');
 else {assert.ok(Date.now()>=journey.endsAt,'fast visit may naturally complete during reload');assert.equal(resumed.seatId,first.seatId);}
 // Reload stops the first recorder; record the remaining journey rather than replaying it.
 await startVideo(page);await sleep(8000);await stopVideo(page,`${out}/welcome-route.webm`);
 await until(()=>f.state.actors.length===2&&f.state.actors.every(a=>!a.welcome&&!a.travel&&a.status==='idle'),'two visitors seated',70000);
 assert.equal(f.state.metrics.giftUnits,0);assert.equal(f.state.movement.moving,0);
 report.checks.push('Two new visitors reserve lanes, welcome/return, keep route across reload; no gift points');

 await event({type:'chat',userId:'route-a',nickname:'An Nhiên',text:'con muốn lên thắp nhang'});
 await until(()=>f.state.ritual?.source==='comment','free incense');const free=f.state.ritual;
 await event({type:'chat',userId:'route-b',nickname:'Minh Tâm',text:'dâng hương'});
 await cmd({type:'gift-demo',group:'rose',userId:'route-b',nickname:'Minh Tâm',units:1});
 await sleep(400);assert.equal(f.state.ritual.actorId,free.actorId);assert.notEqual(f.state.camera.motion?.kind,'focus');
 await until(()=>f.state.ritual?.source==='gift','gift takes next turn',40000);
 const gift=f.state.ritual;assert.ok(gift.actorId.endsWith(':route-b'));assert.ok(gift.journey);
 await startVideo(page);
 await until(()=>f.state.camera.motion?.kind==='focus','focus at actual arrival',20000);
 assert.ok(Date.now()>=gift.journey.arrivedAt-100);assert.equal(f.state.camera.motion.actorId,gift.actorId);
 const names=await page.evaluate(()=>window.__sceneDebug.focusName||window.__sceneDebug.labels.find(a=>a.key===window.__sceneDebug.ritual?.actorId));assert.ok(names,'donor name remains visible');
 await until(()=>!f.state.ritual,'gift and pending free ceremony complete',50000);await stopVideo(page,`${out}/incense-gift-priority.webm`);
 assert.equal(f.state.metrics.giftUnits,1);assert.equal(f.state.metrics.giftTransactions,1);assert.equal(f.state.movement.incenseCompleted,2);
 report.checks.push('Free incense is uninterrupted; gift goes next, actual arrival drives focus, one gift transaction; free request has no gift points');

 // Seed the crowd using the legacy entry sequence, then exercise the new routes in a full hall.
 // This keeps the capacity test separate from the 60s welcome-queue expiry test covered by units.
 await cmd({type:'reset'});await cmd({type:'settings',patch:{templeFloorPreview:false,cameraGiftFocusEnabled:false}});
 for(let i=0;i<12;i++){await cmd({type:'add',count:10});await sleep(150);}
 await until(()=>f.state.actors.length===120&&f.state.actors.every(a=>!a.welcome&&!a.travel&&['idle','standing'].includes(a.status)),'100 seated +20 standing seeded',80000);
 await cmd({type:'settings',patch:{templeFloorPreview:true}});await until(()=>f.state.movement.enabled,'V2 routes enabled');
 assert.equal(f.state.room.seated,100);assert.equal(f.state.room.visibleStanding,20);
 const homes=f.state.actors.map(a=>[a.key,a.seatId]);
 for(const [view,width,height] of [['left',576,1024],['right',1080,1920]]){
  await cmd({type:'camera-view',view});await page.setViewportSize({width,height});await page.waitForFunction(v=>window.__sceneDebug?.cameraView===v,view);await sleep(300);
  const d=await page.evaluate(()=>window.__sceneDebug);assert.equal(d.actors,120);assert.equal(d.golden.camera.floor.seats,100);assert.deepEqual(d.golden.camera.errors,{});
  assert.ok(d.labels.length>0);assert.ok(d.labels.every(n=>n.height>14),'names stay legible');
  await page.screenshot({path:`${out}/${view}-${width}.png`});
 }
 const standing=f.state.actors.find(a=>a.seatId.startsWith('standing-'));
 await event({type:'chat',userId:standing.key.split(':').at(-1),nickname:standing.displayName,text:'thắp nhang'});
 await until(()=>f.state.ritual?.actorId===standing.key,'standing incense',20000);
 assert.equal(f.state.ritual.source,'comment');assert.ok(f.state.ritual.journey.home.id.startsWith('standing-'));
 const [cardUser,lanternUser]=f.state.actors.filter(a=>a.seatId.startsWith('seat-'));
 await event({type:'chat',userId:cardUser.key.split(':').at(-1),nickname:cardUser.displayName,text:'xin quẻ gia đình'});
 await event({type:'chat',userId:lanternUser.key.split(':').at(-1),nickname:lanternUser.displayName,text:'hoa đăng'});
 await until(()=>f.state.fortune||f.state.lantern,'content card');
 for(let i=0;i<40;i++){assert.ok(f.state.movement.moving<=18);await sleep(100);}
 await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.revision>0);
 await until(()=>!f.state.ritual,'standing returns',40000);
 assert.equal(f.state.actors.find(a=>a.key===standing.key)?.seatId,standing.seatId);
 for(const [key,seatId] of homes)assert.equal(f.state.actors.find(a=>a.key===key)?.seatId,seatId);
 report.checks.push('120 actors, two portrait resolutions, same seat ownership through B/C; standing incense + cards and reload; parallel movers <=18');

 await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_routes'});await until(()=>f.state.connection.status==='LIVE_CONNECTED','fake LIVE connected');
 const liveChat=text=>f.rpc('fixture',{event:'chat',payload:{user:{id:'9911223344556677',nickname:'Khách LIVE thử'},content:text,common:{roomId:f.state.connection.roomId,msgId:crypto.randomUUID()}}});
 await liveChat('vào chùa');await until(()=>f.state.actors.some(a=>a.welcome?.journey),'LIVE welcome');
 await until(()=>f.state.actors.some(a=>a.key.includes('9911223344556677')&&!a.welcome&&a.status==='idle'),'LIVE seated',35000);
 await liveChat('thap huong');await until(()=>f.state.ritual?.source==='comment','LIVE free command');
 const session=f.state.sessionId;await cmd({type:'live-connect',username:'fixture_other'});await until(()=>f.state.sessionId!==session,'room changed');
 assert.equal(f.state.ritual,undefined);assert.equal(f.state.movement.moving,0);assert.equal(f.state.movement.incenseQueued,0);
 report.checks.push('Fake connector recognizes incense; changing room clears routes/rituals');
 report.errors=f.errors;assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack||String(e);process.exitCode=1;}
finally{await f?.close();await writeFile(`${out}/e2e-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
