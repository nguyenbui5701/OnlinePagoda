// Two review screenshots from Vite source only. No build and no final E2E suite.
import {mkdir,writeFile} from 'node:fs/promises';
import {visualFixture,until,sleep} from './visual-fixture.mjs';
process.env.FIXTURE_SERVE_SOURCE='1';
const out=`artifacts/temple-experience-v2/reference-preview/${new Date().toISOString().replace(/[:.]/g,'-')}`;
await mkdir(out,{recursive:true});let f;
try{
 f=await visualFixture('test-results/temple-experience-v2-dist',3196);
 await f.cmd({type:'settings',patch:{theme:'golden',sceneSpace:'hall',templeFloorPreview:true,cameraAuto:false,cameraDriftEnabled:false,cameraGiftFocusEnabled:false,cameraFade:false,masterMute:true,idleActivities:false,idleMinutes:30,maxActors:100,showTicker:false,showBlessingTree:false}});
 await f.cmd({type:'add',count:10});
 await until(()=>f.state.actors.length===10&&f.state.actors.every(a=>a.status==='idle'&&!a.welcome&&!a.travel),'seated preview',140000);
 for(const view of (process.env.PREVIEW_CARPET_WIDE==='1'?['wide']:process.env.PREVIEW_CARPET_REVIEW==='1'?['right','wide']:process.env.PREVIEW_FRONT_ONLY==='1'?['front']:['left','right'])){
  await f.cmd({type:'camera-view',view});await f.page.waitForFunction(v=>window.__sceneDebug?.cameraView===v,view);await sleep(400);
  await f.page.screenshot({path:`${out}/${view}.png`});
 }
 await writeFile(`${out}/preview.json`,JSON.stringify({scope:'Visual review from source, not build/E2E acceptance',errors:f.errors,productionServer:'Not restarted'},null,2));
 console.log(out);
}finally{await f?.close();}
