import {mkdir,writeFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {visualFixture,until,sleep} from './visual-fixture.mjs';
const phase=process.argv.includes('--petals')?'petal-upgrade':'gift-tiers',out=process.env.ARTIFACT_DIR||`artifacts/${phase}/benchmark`;
await mkdir(out,{recursive:true});const report={passed:false,captureOnly:true,actors:120,realLive:'NOT VERIFIED',measurements:[],errors:[]};let f;
try{
 for(const [label,build] of [['before',`test-results/before-${phase}-dist`],['after',process.env.APP_BUILD_DIRECTORY||`test-results/${phase}-dist`]]){
  await access(build+'/overlay/index.html');f=await visualFixture(build,3186);
  const {cmd,page,event}=f;await cmd({type:'settings',patch:{autoJoinChat:true,maxActors:100,idleMinutes:30,standingMinutes:30,masterMute:true,effects:true,reducedEffects:false,giftTierEffects:true,treeEnabled:true,showBlessingTree:true,petalDensity:'medium'}});
  for(let i=0;i<120;i++){await event({type:'chat',userId:'load-'+i,nickname:'Khách '+i,text:'vào chùa'});if(i%10===9)await sleep(1100);}
  await until(()=>f.state.actors.length===120,'120 actors',60000);await sleep(25000);
  for(const [scene,width,height] of [['hall',576,1024],['courtyard',1080,1920]]){
   await cmd({type:'settings',patch:{sceneSpace:scene}});await page.setViewportSize({width,height});await sleep(3000);
   if(phase==='petal-upgrade')await event({type:'like',userId:'load-likes',likeCount:1000});
   else await event({type:'gift',userId:'no-character',nickname:'Người tặng',gift:{id:'benchmark',count:1,unitCoins:10,finished:true}});
   await sleep(400);const samples=[];
   for(let i=0;i<3;i++){await sleep(2100);samples.push(await page.evaluate(()=>window.__sceneDebug.fps));}
   const avg=samples.reduce((a,b)=>a+b,0)/samples.length,quality=await page.evaluate(()=>window.__sceneDebug.quality);
   report.measurements.push({label,build,scene,width,height,samples,averageFps:avg,quality});await page.screenshot({path:`${out}/${label}-${scene}-${width}.png`});await sleep(2200);
  }
  assert.deepEqual(f.errors,[]);await f.close();f=undefined;
 }
 report.comparison=report.measurements.filter(x=>x.label==='after').map(after=>{const before=report.measurements.find(x=>x.label==='before'&&x.scene===after.scene);return {scene:after.scene,before:before.averageFps,after:after.averageFps,dropPercent:(before.averageFps-after.averageFps)/before.averageFps*100};});
 assert.ok(report.comparison.every(x=>x.after>=24),'Upgraded capture below24 FPS');report.passed=true;
}catch(e){report.failure=String(e.stack||e);process.exitCode=1;}
finally{if(f){report.errors.push(...f.errors);await f.close();}await writeFile(out+'/benchmark-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
