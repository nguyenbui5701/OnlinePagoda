import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {visualFixture,until,sleep} from './visual-fixture.mjs';
const out=process.env.ARTIFACT_DIR||'artifacts/temple-experience-v2/completion-all/load';await mkdir(out,{recursive:true});
const report={passed:false,captureOnly:true,baseline:[],samples:[],realLive:'NOT VERIFIED',phoneAudio:'NOT VERIFIED',comparison:'Same machine, one 576x1024 capture. Baseline uses copied production frontend; both runs use current fixture backend and local assets.'};let f;
async function measure(build,minutes,output){
 f=await visualFixture(build,3199);
 await f.cmd({type:'settings',patch:{theme:'golden',sceneSpace:'hall',templeFloorPreview:false,maxActors:100,standingMinutes:30,idleMinutes:30,masterMute:true,cameraAuto:false,showBlessingTree:false,compactGiftPanels:true}});
 for(let i=0;i<12;i++){await f.cmd({type:'add',count:10});await sleep(150);}
 await until(()=>f.state.actors.length===120&&f.state.actors.every(a=>!a.welcome),'120 actors ready',100000);
 await f.cmd({type:'settings',patch:{templeFloorPreview:true,cameraAuto:true,cameraHoldSeconds:15,cameraFade:true,cameraDriftEnabled:true,cameraGiftFocusEnabled:true,giftTierEffects:true}});
 const begin=Date.now();let minute=-1;
 while(Date.now()-begin<minutes*60000){
  const next=Math.floor((Date.now()-begin)/60000);
  if(next!==minute){minute=next;console.log(`Capture ${minute+1}/${minutes} minutes`);
   await f.event({type:'gift',userId:`guest-${minute%100+1}`,nickname:'Khách thử tải',gift:{id:'load',demoGroup:'rose',count:1,unitCoins:[1,5,10,30][minute%4],finished:true}});
   if(minute&&minute%5===0)for(let i=1;i<=120;i++){await f.event({type:'chat',userId:`guest-${i}`,nickname:`Khách ${i}`,text:'chào cả nhà'});if(i%10===0)await sleep(150);}
  }
  await sleep(2000);
  const s=await f.page.evaluate(()=>({fps:window.__sceneDebug.fps,actors:window.__sceneDebug.actors,view:window.__sceneDebug.cameraView,fade:window.__sceneDebug.fade,kind:window.__sceneDebug.motion?.kind}));
  output.push({...s,at:Date.now()-begin,paused:f.state.camera.paused});
 }
 assert.deepEqual(f.errors,[]);await f.close();f=undefined;
}
const mean=a=>a.length?a.reduce((n,s)=>n+s.fps,0)/a.length:null;
try{
 if(process.env.TEMPLE_BASELINE)await measure(process.env.TEMPLE_BASELINE,2,report.baseline);
 await measure(process.env.APP_BUILD_DIRECTORY||'test-results/temple-completion-dist',30,report.samples);
 report.averageFps=mean(report.samples);report.baselineFps=mean(report.baseline);report.changePercent=report.baselineFps?(report.averageFps/report.baselineFps-1)*100:null;
 report.dissolveFps=mean(report.samples.filter(s=>s.fade!==null));report.focusFps=mean(report.samples.filter(s=>s.kind==='focus'));
 assert.ok(report.averageFps>=24,'Capture below 24 FPS');assert.ok(report.samples.every(s=>s.actors===120),'Actor count changed');assert.ok(report.samples.every(s=>!s.paused),'Capture paused: review FPS');report.passed=true;
}catch(e){report.failure=String(e.stack||e);process.exitCode=1;}
finally{await f?.close();await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,baseline:report.baseline.length,samples:report.samples.length},null,2));}
