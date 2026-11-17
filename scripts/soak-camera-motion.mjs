import {mkdir,writeFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {visualFixture,until,sleep} from './visual-fixture.mjs';
const out=process.env.ARTIFACT_DIR||'artifacts/camera-motion/benchmark';await mkdir(out,{recursive:true});
const report={passed:false,actors:120,captureOnly:true,baselineMinutes:2,durationMinutes:30,baseline:[],samples:[],realLive:'NOT VERIFIED',liveStudio:'NOT VERIFIED',comparison:'Sequential same-machine capture, 576x1024, 120 identities. Previous isolated frontend versus new frontend; fixture backend is current source in both. No dashboard preview.'};let f;
async function setup(build,port,motion){
 f=await visualFixture(build,port);await f.cmd({type:'settings',patch:{theme:'golden',sceneSpace:'hall',maxActors:100,idleMinutes:30,standingMinutes:30,masterMute:true,cameraAuto:true,cameraHoldSeconds:60,cameraFade:true,cameraDriftEnabled:motion,cameraGiftFocusEnabled:motion,reducedEffects:false,compactGiftPanels:true}});
 for(let i=0;i<120;i++){await f.event({type:'chat',userId:`load-${i}`,nickname:`Khách ${i}`,text:'vào chùa'});if(i%10===9)await sleep(1100);}
 await until(()=>f.state.actors.length===120,'120 actors',60000);await sleep(30000);
}
async function sample(minutes,output){
 const begin=Date.now();let lastMinute=-1;
 while(Date.now()-begin<minutes*60000){
  const minute=Math.floor((Date.now()-begin)/60000);
  if(minute!==lastMinute){lastMinute=minute;console.log(`Capture ${minute+1}/${minutes} phút`);
   await f.event({type:'gift',userId:`load-${minute%120}`,nickname:'Khách thử tải',gift:{id:'load',count:1,unitCoins:minute%2?10:1,finished:true}});
   if(minute>0&&minute%5===0)for(let i=0;i<120;i++){await f.event({type:'chat',userId:`load-${i}`,nickname:`Khách ${i}`,text:'an lành'});if(i%10===9)await sleep(1100);}
  }
  await sleep(2000);
  const s=await f.page.evaluate(()=>({fps:window.__sceneDebug.fps,fade:window.__sceneDebug.fade,view:window.__sceneDebug.cameraView,kind:window.__sceneDebug.motion?.kind,actors:window.__sceneDebug.actors}));
  output.push({...s,at:Date.now()-begin,paused:f.state.camera.paused});
 }
 assert.deepEqual(f.errors,[]);
}
const average=items=>items.length?items.reduce((n,s)=>n+s.fps,0)/items.length:null;
try{
 const previous=process.env.CAMERA_BASELINE_BUILD||'test-results/before-camera-motion-dist';await access(`${previous}/overlay/index.html`);
 await setup(previous,3192,false);await sample(2,report.baseline);await f.close();f=undefined;
 await setup(process.env.APP_BUILD_DIRECTORY||'test-results/camera-motion-dist',3192,true);await sample(30,report.samples);
 report.baselineFps=average(report.baseline);report.averageFps=average(report.samples);report.changePercent=(report.averageFps/report.baselineFps-1)*100;
 report.fadeAverageFps=average(report.samples.filter(s=>s.fade!==null));report.focusAverageFps=average(report.samples.filter(s=>s.kind==='focus'||s.kind==='recover'));
 report.measurement='2-second rolling capture FPS; grouped values are not frame-exact phase-only FPS.';
 await f.page.screenshot({path:`${out}/capture-120.png`});
 assert.ok(report.averageFps>=24,'Capture average below 24 FPS');assert.ok(report.samples.every(s=>s.actors===120),'Actor count changed');assert.ok(report.samples.every(s=>!s.paused),'Automatic camera was paused: inspect phase and FPS');assert.ok(report.samples.some(s=>s.kind==='focus'),'Donor focus not observed');assert.ok(report.samples.some(s=>s.fade!==null),'Dissolve not observed');report.passed=true;
}catch(e){report.failure=e.stack||String(e);process.exitCode=1;}
finally{await f?.close();await writeFile(`${out}/soak-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,baseline:report.baseline.length,samples:report.samples.length},null,2));}
