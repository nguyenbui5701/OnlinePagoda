import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {visualFixture,until,sleep,startVideo,stopVideo} from './visual-fixture.mjs';
const part=process.argv[2]||'all',out=process.env.ARTIFACT_DIR||'artifacts/temple-experience-v2/completion/e2e';
await mkdir(out,{recursive:true});let f;
const report={passed:false,part,checks:[],errors:[],realLive:'NOT VERIFIED',avatarCdn:'NOT VERIFIED',phoneAudio:'NOT VERIFIED'};
try{
 f=await visualFixture(process.env.APP_BUILD_DIRECTORY||'test-results/temple-completion-dist',3198);
 const {page,cmd,event}=f;
 await cmd({type:'settings',patch:{theme:'golden',sceneSpace:'hall',templeFloorPreview:true,cameraAuto:false,cameraFade:false,cameraDriftEnabled:false,cameraGiftFocusEnabled:false,masterMute:true,showBlessingTree:false,compactGiftPanels:true,giftTierEffects:true,effects:true,flowers:true,showGiftThanks:true,maxActors:100,idleMinutes:30,standingMinutes:30,fortuneEnabled:true,lanternEnabled:true,commentEffectsEnabled:true}});
 const idle=()=>until(()=>!f.state.giftShow?.active.length&&!f.state.giftShow?.queued,'visual queue drained',50000);
 if(part==='actors'||part==='all'){
  await cmd({type:'camera-view',view:'front'});
  await page.waitForFunction(()=>window.__sceneDebug?.floorPreview&&window.__sceneDebug?.cameraView==='front');
  await event({type:'chat',userId:'pose',nickname:'An Nhiên thử tư thế',text:'vào chùa'});
  await until(()=>f.state.actors.some(a=>a.welcome?.journey),'welcome route');
  const a=f.state.actors[0],journey=a.welcome.journey,samples=[];
  // Socket state can arrive before the next overlay diagnostic frame. Do not
  // accidentally measure an invisible pre-route placeholder as the approach.
  await page.waitForFunction(k=>window.__sceneDebug?.welcomes.some(w=>w.key===k&&w.phase==='approach'),a.key);
  await startVideo(page);
  while(Date.now()<journey.endsAt+800){
   const sample=await page.evaluate(k=>{
    const d=window.__sceneDebug,body=d.bodies.find(b=>b.key===k);
    return body?{...body,cameraView:d.cameraView,phase:d.welcomes.find(w=>w.key===k)?.phase??'seated',sampledAt:Date.now()}:undefined;
   },a.key);
   if(sample)samples.push(sample);await sleep(120);
  }
  await stopVideo(page,`${out}/actor-postures.webm`);
  // Save evidence before asserting, including on a failed run. Root scale includes
  // floor perspective; only the pre-projection reference must stay unchanged.
  await writeFile(`${out}/actor-scale-samples.json`,JSON.stringify({actorId:a.key,seatId:a.seatId,journey,samples},null,2));
  assert.ok(samples.length>4);
  for(const sample of samples){
   for(const field of ['referenceScale','projectionScale','rootScale','bodyScale','localHeight'])assert.ok(Number.isFinite(sample[field]),`missing actor measurement: ${field}`);
   assert.ok(sample.projectionScale>0,'invalid perspective scale');
   assert.ok(Math.abs(sample.rootScale-sample.referenceScale*sample.projectionScale)<1e-6,'rendered scale differs from reference × perspective');
  }
  const range=field=>{const values=samples.map(s=>s[field]);return {min:Math.min(...values),max:Math.max(...values)};};
  report.actorMeasurement={reference:range('referenceScale'),projection:range('projectionScale'),rendered:range('rootScale'),body:range('bodyScale'),phases:[...new Set(samples.map(s=>s.phase))]};
  assert.ok(report.actorMeasurement.reference.max-report.actorMeasurement.reference.min<.001,'reference scale changed across poses');
  assert.ok(report.actorMeasurement.body.max-report.actorMeasurement.body.min<.001,'body enlarged independently of perspective');
  for(const phase of ['approach','pray','return','seated'])assert.ok(report.actorMeasurement.phases.includes(phase),`missing pose coverage: ${phase}`);
  const heights=samples.map(a=>a.localHeight);assert.ok(Math.max(...heights)>Math.min(...heights)*1.15,'standing and seated dimensions recorded');
  await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.revision>0);
  assert.equal(f.state.actors[0].seatId,a.seatId);assert.equal(f.state.metrics.giftUnits,0);
  report.checks.push('Approach/prayer/return/seated keep reference and body scale; rendered root equals reference × floor perspective; posture heights differ naturally; reload preserves seat');
 }
 if(part==='combos'||part==='all'){
  await cmd({type:'source',mode:'tiktok'});await cmd({type:'live-connect',username:'fixture_completion'});await until(()=>f.state.connection.status==='LIVE_CONNECTED','fixture LIVE');
  const room=f.state.connection.roomId,row={...f.state.settings.giftCatalog[0],giftId:'5655',unitCoins:1,verified:true};
  await cmd({type:'settings',patch:{giftCatalog:[row]}});
  const wire=(u,n,end)=>f.rpc('fixture',{event:'gift',payload:{user:{id:u,nickname:`Người ${u}`},common:{roomId:room,msgId:`progress-${u}`},groupId:`group-${u}`,giftId:'5655',repeatCount:n,repeatEnd:end?1:0,gift:{name:'Fixture rose',type:1,diamondCount:1}}});
  await startVideo(page);await wire('A',1,false);await wire('B',1,false);await wire('A',3,false);
  await until(()=>f.state.giftShow.active.length===2,'two independent previews');
  await page.waitForFunction(()=>window.__giftShowDebug.active.filter(a=>a.visible).length===2);
  assert.equal(f.state.metrics.giftUnits,0);assert.equal(f.state.actors.length,0);
  await wire('A',2,false);await wire('B',5,false);await wire('A',3,true);await wire('B',5,true);
  await until(()=>f.state.metrics.giftUnits===8,'final counts');
  assert.equal(f.state.metrics.giftTransactions,2);const active=f.state.giftShow.active.map(a=>({id:a.id,endsAt:a.endsAt}));
  await sleep(300);await stopVideo(page,`${out}/two-combos.webm`);
  await page.reload();await page.waitForFunction(()=>window.__giftShowDebug);
  for(const before of active){const current=f.state.giftShow.active.find(a=>a.id===before.id);if(current)assert.equal(current.endsAt,before.endsAt);}
  await wire('A',3,true);await sleep(300);assert.equal(f.state.metrics.giftUnits,8);await idle();
  for(const [n,tier] of [[10,3],[30,4]]){await wire(`tier${n}`,n,true);await until(()=>f.state.giftShow.active.some(a=>a.tier===tier),'tier '+tier);await idle();}
  const session=f.state.sessionId;await cmd({type:'live-connect',username:'fixture_other'});await until(()=>f.state.sessionId!==session,'room switch');assert.equal(f.state.giftShow.pendingCombos,0);
  report.checks.push('Fixture connector A/B progress, stale count, final exactly once, no phantom actor; reload deadlines and room reset');
  await cmd({type:'source',mode:'demo'});
 }
 if(part==='panels'||part==='all'){
  await cmd({type:'reset'});await cmd({type:'settings',patch:{autoJoinChat:false}});
  const heights=[];report.panelMeasurements=[];
  for(const [view,w,h] of [['front',576,1024],['left',576,1024],['right',1080,1920],['wide',1080,1920]]){
   await cmd({type:'camera-view',view});await page.setViewportSize({width:w,height:h});
   await page.waitForFunction(v=>window.__sceneDebug?.cameraView===v,view);
   await event({type:'chat',userId:`comment-${view}`,nickname:'Bình luận miễn phí',text:'rồng vàng'});
   await page.waitForFunction(()=>window.__communityDebug.rendered.some(e=>e.visible&&e.alpha>.9));
   const d=await page.evaluate(()=>window.__communityDebug.rendered.find(e=>e.visible&&e.alpha>.9));
   assert.ok(d,'visible comment artwork missing');
   report.panelMeasurements.push({view,width:w,height:h,...d});
   assert.equal(d.hasAvatar,false,'free comment artwork must not contain an avatar, including nested children');
   assert.ok(Number.isFinite(d.body.height)&&d.body.height>0,'invalid comment artwork height');
   heights.push(d.body.height);
   // Review screenshots below focus on the gift composition being corrected.
   await until(()=>!f.state.commentEffects.length,'comment ends');
  }
  assert.ok(Math.max(...heights)/Math.min(...heights)<1.12,'comment size differs by view');
  await event({type:'chat',userId:'plain-lotus',nickname:'Sen bình luận',text:'hoa sen'});
  await page.waitForFunction(()=>window.__communityDebug.rendered.some(e=>e.effect==='lotus'&&e.visible&&e.alpha>.9));
  const plainLotus=await page.evaluate(()=>window.__communityDebug.rendered.find(e=>e.effect==='lotus'));
  report.panelMeasurements.push({kind:'plain-comment-lotus',...plainLotus});
  assert.equal(plainLotus.hasAvatar,false,'comment lotus must not contain a portrait');
  assert.equal(plainLotus.portrait,'lotus:plain');
  await until(()=>!f.state.commentEffects.length,'plain lotus ends');
  await event({type:'gift',userId:'fallback',nickname:'Avatar lỗi dùng tên',avatarUrl:'https://p16.tiktokcdn.com/fixture/blocked.png',gift:{id:'test',demoGroup:'rose',count:1,unitCoins:1,finished:true}});
  await page.waitForFunction(()=>window.__giftShowDebug.active.some(a=>a.visible&&a.alpha>.9));
  const first=await page.evaluate(()=>window.__giftShowDebug.active[0]);assert.equal(first.bodyScale*280,360);assert.equal(first.portrait,'lotus-portrait:fallback');
  assert.ok(first.flight,'server must send a fixed flight');
  const flightSamples=[first];
  await cmd({type:'settings',patch:{cameraDriftEnabled:true}});
  await event({type:'chat',userId:'late-card',nickname:'Thẻ đến giữa đường bay',text:'hoa đăng'});
  for(let i=0;i<18;i++){
   await sleep(80);
   const sample=await page.evaluate(id=>window.__giftShowDebug.active.find(a=>a.id===id),first.id);
   if(!sample)break;
   flightSamples.push(sample);
  }
  await writeFile(`${out}/gift-flight-samples.json`,JSON.stringify(flightSamples,null,2));
  assert.ok(flightSamples.length>=5,'not enough flight samples');
  for(let i=1;i<flightSamples.length;i++){
   const a=flightSamples[i-1],b=flightSamples[i];
   assert.deepEqual(b.flight,first.flight,'camera/card changed the flight');
   assert.equal(b.x,first.x,'gift teleported horizontally');
   assert.ok(b.y<=a.y+1e-6,'gift moved back down');
   const expected=a.y-first.flight.rise*(b.at-a.at)/(first.endsAt-first.startedAt);
   assert.ok(Math.abs(b.y-expected)<.05,'gift jumped vertically off its timestamped flight');
  }
  assert.ok(flightSamples.at(-1).y<first.y,'lotus flies upward');
  await cmd({type:'settings',patch:{giftTierEffects:false}});await until(()=>!f.state.giftShow.active.length,'disable clears visuals');
  report.checks.push('Equal-size comments across A/B/C/D; 360px rising lotus remains on fixed trajectory during camera drift and late lantern card; CDN-failure initials; disable clears visuals');
  await cmd({type:'reset'});
  await cmd({type:'settings',patch:{giftTierEffects:true,cameraDriftEnabled:false,cameraGiftFocusEnabled:false}});
  report.giftCompositionSamples=[];
  for(const [view,coins,variant] of [['front',10,'dragon'],['left',10,'phoenix'],['right',30,'long-phung'],['wide',30,'long-phung']]){
   await cmd({type:'camera-view',view});await page.setViewportSize({width:view==='wide'?1080:576,height:view==='wide'?1920:1024});
   await page.waitForFunction(v=>window.__sceneDebug?.cameraView===v,view);
   await event({type:'gift',userId:`group-${view}`,nickname:'Sen cùng long phụng',gift:{id:'group-test',demoGroup:'rose',count:1,unitCoins:coins,finished:true}});
   await page.waitForFunction(v=>window.__giftShowDebug.active.some(a=>a.variant===v&&a.visible&&a.alpha>.9),variant);
   const frames=[];
   for(let i=0;i<8;i++){frames.push(await page.evaluate(()=>window.__giftShowDebug.active[0]));await sleep(100);}
   report.giftCompositionSamples.push({view,variant,frames});
   for(const frame of frames){
    assert.equal(frame.ornaments.length,2,'both companions must be rendered');
    const [left,right]=frame.ornaments;
    assert.ok(left.visible&&right.visible,'missing flank');
    const span=285*(frame.flight.ornamentScale??1);
    assert.equal(left.offsetX,-span);assert.equal(right.offsetX,span);
    assert.equal(frame.bodyScale*280,360,'lotus must retain its size');
    assert.ok(Number.isFinite(frame.flight.stageBottom),'missing upper-stage boundary');
    assert.ok(frame.y+220<=Math.min(1100,frame.flight.stageBottom)+1e-6,'gift group escaped into the seats');
    assert.ok(Math.abs(left.offsetY-right.offsetY)<1e-6,'companions are vertically split');
    assert.ok(Math.abs(left.y-frame.y+20)<=6.01&&Math.abs(right.y-frame.y+20)<=6.01,'companions detached from lotus');
    assert.ok(Math.abs(left.alpha-right.alpha)<1e-6,'one companion faded independently');
   }
   if(view==='front'||view==='wide')await page.screenshot({path:`${out}/gift-group-${view}.png`});
   if(view==='wide'){
    const before=frames.at(-1);await page.reload();await page.waitForFunction(()=>window.__giftShowDebug?.active.length>0);
    const after=await page.evaluate(()=>window.__giftShowDebug.active[0]);
    assert.equal(after.id,before.id);assert.deepEqual(after.flight,before.flight);assert.equal(after.ornaments[0].offsetX,before.ornaments[0].offsetX);assert.equal(after.ornaments[1].offsetX,before.ornaments[1].offsetX);
   }
   await cmd({type:'settings',patch:{giftTierEffects:false}});await until(()=>!f.state.giftShow.active.length,'clear group');
   await cmd({type:'settings',patch:{giftTierEffects:true}});
  }
  report.checks.push('Dragon/phoenix flank the full-size lotus in the upper altar area, never fall back to seats; adaptive decoration size, shared flight/opacity in A/B/C/D; wide reload preserves composition');
 }
 report.errors=f.errors;assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String(e.stack||e);report.lastState=f?.state?.giftShow;process.exitCode=1;}
finally{await f?.close();await writeFile(`${out}/e2e-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
