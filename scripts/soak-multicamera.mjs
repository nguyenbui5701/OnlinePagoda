import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {visualFixture,until,sleep} from './visual-fixture.mjs';
const out=process.env.ARTIFACT_DIR||'artifacts/multicamera/soak';await mkdir(out,{recursive:true});
const report={passed:false,durationMinutes:30,captureOnly:true,actors:120,samples:[],realLive:'NOT VERIFIED',liveStudio:'NOT VERIFIED'};let f;
try{
 f=await visualFixture(process.env.APP_BUILD_DIRECTORY||'test-results/multicamera-dist',3188);
 await f.cmd({type:'settings',patch:{theme:'golden',sceneSpace:'hall',maxActors:100,idleMinutes:30,standingMinutes:30,masterMute:true,cameraAuto:false,reducedEffects:false}});
 for(let i=0;i<120;i++){await f.event({type:'chat',userId:`load-${i}`,nickname:`Khách ${i}`,text:'vào chùa'});if(i%10===9)await sleep(1100);}
 await until(()=>f.state.actors.length===120,'120 actors',60000);await sleep(30000);
 const baseline=[];for(let i=0;i<5;i++){await sleep(2100);baseline.push(await f.page.evaluate(()=>window.__sceneDebug.fps));}
 report.baselineFps=baseline.reduce((a,b)=>a+b)/baseline.length;
 await f.cmd({type:'settings',patch:{cameraAuto:true,cameraHoldSeconds:60,cameraFade:true}});
 const start=Date.now();let lastMinute=-1;
 while(Date.now()-start<30*60000){
  await sleep(2000);const m=Math.floor((Date.now()-start)/60000);
  if(m!==lastMinute){lastMinute=m;console.log(`Camera load ${m+1}/30 phút`);
   await f.event({type:'gift',userId:`load-${m}`,nickname:'Khách thử tải',gift:{id:'soak',count:1,unitCoins:m%2?10:1,finished:true}});
   // Keep 120 real test identities active without duplicate actors.
   for(let n=0;n<120;n++){await f.event({type:'chat',userId:`load-${n}`,nickname:`Khách ${n}`,text:'an lành'});if(n%10===9)await sleep(1100);}
  }
  const sample=await f.page.evaluate(()=>({fps:window.__sceneDebug.fps,fade:window.__sceneDebug.fade,quality:window.__sceneDebug.quality,view:window.__sceneDebug.cameraView,actors:window.__sceneDebug.actors}));
  report.samples.push({at:Date.now()-start,...sample,paused:f.state.camera.paused});
 }
 report.averageFps=report.samples.reduce((n,s)=>n+s.fps,0)/report.samples.length;
 const fades=report.samples.filter(s=>s.fade!==null);report.fadeAverageFps=fades.length?fades.reduce((n,s)=>n+s.fps,0)/fades.length:null;
 report.fadeNote=fades.length?'2-second rolling FPS while dissolve active; not frame-exact fade-only FPS':'No fade samples. Two-layer stress not verified; inspect automatic pause and reduced-effects settings.';
 report.comparison='Same capture/machine, current build: 120 actors static vs auto; not a measurement of an older release.';
 await f.page.screenshot({path:`${out}/capture-120.png`});assert.ok(report.averageFps>=24,'Capture under 24 FPS');assert.deepEqual(f.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack||String(e);process.exitCode=1;}
finally{await f?.close();await writeFile(`${out}/soak-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,samples:report.samples.length},null,2));}
