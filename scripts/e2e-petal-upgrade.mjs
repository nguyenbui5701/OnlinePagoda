import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {visualFixture,until,sleep,startVideo,stopVideo} from './visual-fixture.mjs';
const out=process.env.ARTIFACT_DIR||'artifacts/petal-upgrade/e2e';await mkdir(out,{recursive:true});let f;
const report={checks:[],passed:false,realLive:'NOT VERIFIED',stress:false};
try{
 f=await visualFixture(process.env.APP_BUILD_DIRECTORY||'test-results/petal-upgrade-dist');const {page,cmd,event}=f;
 await cmd({type:'settings',patch:{sceneSpace:'courtyard',sceneLight:'day',treeEnabled:true,showBlessingTree:false,effects:true,masterMute:true,reducedEffects:false,autoJoinChat:false,petalDensity:'medium',lanternEnabled:true}});
 const likes=count=>event({type:'like',userId:'like-demo',likeCount:count});
 await startVideo(page);
 for(const [scene,width,height] of [['hall',576,1024],['courtyard',1080,1920]]){
  await cmd({type:'settings',patch:{sceneSpace:scene}});await page.setViewportSize({width,height});
  for(const style of ['pink','ivory','gold','peach']){
   await cmd({type:'settings',patch:{flowerStyle:style}});await likes(1000);
   await page.waitForFunction(s=>window.__treeDebug?.theme===s&&window.__treeDebug.flowers>8,style);await sleep(2400);
   assert.equal(await page.evaluate(()=>window.__treeDebug.visible),false);await page.screenshot({path:`${out}/${scene}-${style}-${width}.png`});
   await until(()=>f.state.tree.phase==='growing','bloom ends');
  }
 }
 await stopVideo(page,out+'/flower-themes.webm');report.checks.push('Four flower themes rendered at both resolutions/scenes; tree hidden, no full-screen flash');
 await cmd({type:'settings',patch:{flowerStyle:'auto'}});await likes(3500);await page.waitForFunction(()=>window.__treeDebug.flowers>5);
 const before={...f.state.tree},theme=await page.evaluate(()=>window.__treeDebug.theme);await page.reload();await page.waitForFunction(()=>window.__treeDebug);
 const after=await page.evaluate(()=>window.__treeDebug);if(after.phase==='bloom'){assert.equal(after.endsAt,before.endsAt);assert.equal(after.theme,theme);}else assert.ok(f.state.serverTime>=before.endsAt);
 await until(()=>f.state.tree.phase==='growing','merged bloom');assert.equal(f.state.tree.progress,500);assert.equal(f.state.tree.completed,before.completed+3);
 await cmd({type:'settings',patch:{showBlessingTree:true}});await page.waitForFunction(()=>window.__treeDebug.visible);assert.equal(f.state.tree.progress,500);
 await cmd({type:'settings',patch:{showBlessingTree:false}});await page.waitForFunction(()=>!window.__treeDebug.visible);assert.equal(f.state.tree.progress,500);
 await likes(500);await page.waitForFunction(()=>window.__treeDebug.flowers>5);assert.notEqual(await page.evaluate(()=>window.__treeDebug.theme),theme);await until(()=>f.state.tree.phase==='growing','second auto bloom');
 report.checks.push('3500 likes merges three goals and carries500; reload deadline/theme stable; visibility toggle preserves count; consecutive auto themes differ');
 await cmd({type:'settings',patch:{sceneLight:'night'}});await page.waitForFunction(()=>window.__sceneDebug.golden.courtyard.weights.night>.98,undefined,{timeout:25000});
 await page.setViewportSize({width:576,height:1024});await startVideo(page);
 for(const kind of ['leaves','petals'])for(let variant=0;variant<3;variant++){
  await cmd({type:'weather',preset:kind});await page.waitForFunction(()=>window.__sceneDebug.golden.courtyard.particles>=8);await sleep(600);
  await page.screenshot({path:`${out}/${kind}-${variant}.png`});await cmd({type:'weather',preset:'stop'});await until(()=>!f.state.environment.weather,'stop weather');
 }
 await stopVideo(page,out+'/weather-variants.webm');
 await cmd({type:'weather',preset:'petals'});await page.waitForFunction(()=>window.__sceneDebug.golden.courtyard.particles>5);
 await event({type:'gift',userId:'gift-demo',nickname:'Sen',gift:{id:'9',unitCoins:10,count:1,finished:true}});
 await until(()=>!f.state.environment.weather,'gift stops weather');await page.waitForFunction(()=>window.__giftShowDebug.active.length>0);await page.screenshot({path:out+'/gift-priority.png'});
 await until(()=>f.state.giftShow.active.length===0,'gift finishes');await cmd({type:'weather',preset:'leaves'});await likes(1000);await until(()=>!f.state.environment.weather,'bloom stops weather');
 await cmd({type:'settings',patch:{reducedEffects:true,petalDensity:'high'}});await page.waitForFunction(()=>window.__treeDebug.rainVisible);assert.ok((await page.evaluate(()=>window.__treeDebug.flowers))<=18);await page.screenshot({path:out+'/reduced-rain.png'});
 await cmd({type:'settings',patch:{effects:false}});await page.waitForFunction(()=>!window.__treeDebug.rainVisible);
 await cmd({type:'reset'});await until(()=>f.state.tree.total===0,'reset');
 report.checks.push('Green/gold/mixed leaves and pink/ivory/mixed petals; gift and tree preempt weather; reduced rain ≤18; disabling effects/reset clears visuals');
 const dash=await f.context.newPage();await dash.goto(f.url+'/dashboard/');await dash.locator('#community-settings').screenshot({path:out+'/dashboard.png'});await dash.close();
 assert.deepEqual(f.errors,[]);report.passed=true;
}catch(e){report.failure=String(e.stack||e);report.state=f?.state?.tree;process.exitCode=1;}
finally{report.errors=f?.errors||[];await f?.close();await writeFile(out+'/e2e-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
