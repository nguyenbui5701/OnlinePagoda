import {fork} from 'node:child_process';
import {chromium} from 'playwright';
import {io} from 'socket.io-client';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const extended=process.env.SIDE_RAIN_TEST==='1';
const port=extended?3180:3179,url=`http://127.0.0.1:${port}`,out=process.env.ARTIFACT_DIR||'artifacts/actor-facing';
await mkdir(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){const t=Date.now();while(Date.now()-t<18000){if(await fn())return;await sleep(80);}throw Error('Timeout '+label);}
let server,browser,socket,state;const report={checks:[],errors:[],realLive:'NOT VERIFIED'};
const cmd=data=>new Promise((ok,bad)=>socket.timeout(5000).emit('command',data,(e,r)=>e?bad(e):r?.ok?ok(r):bad(Error(`${r?.error||'Rejected'}; command=${JSON.stringify(data)}`))));
try{
  try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(500)});throw Error('Port occupied');}catch(e){if(e.message==='Port occupied')throw e;}
  server=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:process.env.APP_BUILD_DIRECTORY||resolve('test-results/actor-facing-dist'),FIXTURE_PORT:String(port),FIXTURE_DATA_DIRECTORY:resolve(`test-results/actor-facing-${Date.now()}`),FORTUNE_VOICE_FIXTURE:'1'},stdio:['ignore','pipe','pipe','ipc']});
  server.stdout.on('data',()=>{});server.stderr.on('data',s=>report.errors.push(String(s)));
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',v=>state=v);socket.on('delta',v=>state=v);await until(()=>state,'snapshot');
  // Direction-review screenshots must show faces, not the DEMO greeting bubbles.
  await cmd({type:'settings',patch:{theme:'golden',idleActivities:false,idleMinutes:30,showBubbles:false}});
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  for(const [width,height] of [[576,1024],[1080,1920]]){
    await cmd({type:'reset'});await page.setViewportSize({width,height});await page.goto(url+'/overlay/?capture=1');
    await page.waitForFunction(()=>window.__actorFacingDebug);
    // The public DEMO command only accepts 1, 10 or 100 people per request.
    for(let i=0;i<4;i++)await cmd({type:'add',count:1});
    await page.waitForFunction(()=>window.__sceneDebug.welcomes.length===4&&window.__sceneDebug.welcomes.every(w=>w.phase==='approach'));
    assert.ok(await page.evaluate(()=>window.__actorFacingDebug.every(a=>['back','left','right'].includes(a.facing))));
    await page.screenshot({path:`${out}/approach-back-${width}.png`});
    await page.waitForFunction(()=>window.__sceneDebug.welcomes.length===4&&window.__sceneDebug.welcomes.every(w=>w.phase==='pray'));
    assert.ok(await page.evaluate(()=>window.__actorFacingDebug.every(a=>a.facing==='back')));
    await page.waitForFunction(()=>window.__sceneDebug.welcomes.length===4&&window.__sceneDebug.welcomes.every(w=>w.phase==='return'));
    assert.ok(await page.evaluate(()=>window.__actorFacingDebug.every(a=>['front','left','right'].includes(a.facing))));
    await sleep(500);
    await page.screenshot({path:`${out}/return-front-${width}.png`});
    if(width===576){await page.reload();await page.waitForFunction(()=>window.__actorFacingDebug?.length===4&&window.__actorFacingDebug.every(a=>['front','left','right'].includes(a.facing)));}
    await page.waitForFunction(()=>window.__sceneDebug.welcomes.length===0&&window.__sceneDebug.states.every(s=>s==='idle'));
    assert.ok(await page.evaluate(()=>window.__actorFacingDebug.every(a=>a.facing==='back')));
    await page.screenshot({path:`${out}/seated-back-${width}.png`});
    assert.equal(state.metrics.giftUnits,0);
  }
  report.checks.push('Welcome approach/prayer rear, return front, seated rear at both capture sizes; reload resumes front; no gift points');
  // Discover an existing DEMO identity; reset does not reset the provider serial.
  const key=await page.evaluate(()=>window.__actorFacingDebug[0].key),userId=key.split(':').at(-1);
  await cmd({type:'gift-demo',group:'rose',userId,nickname:'Khách thử hướng',units:1});
  if(extended){
    await page.waitForFunction(()=>window.__sceneDebug.ritual?.phase==='to-aisle'&&window.__actorFacingDebug.some(a=>a.key===window.__sceneDebug.ritual.actorId&&a.facing==='right'));
    await sleep(500);
    await page.screenshot({path:out+'/walk-right.png'});
  }
  await page.waitForFunction(()=>window.__sceneDebug.ritual?.phase==='offer');
  assert.equal(await page.evaluate(k=>window.__actorFacingDebug.find(a=>a.key===k)?.facing,key),'back');
  await page.screenshot({path:out+'/gift-offer-back.png'});
  await page.waitForFunction(()=>window.__sceneDebug.ritual?.phase==='back-aisle');
  assert.equal(await page.evaluate(k=>window.__actorFacingDebug.find(a=>a.key===k)?.facing,key),'front');
  await page.screenshot({path:out+'/gift-return-front.png'});
  if(extended){
    await page.waitForFunction(()=>window.__sceneDebug.ritual?.phase==='back-seat'&&window.__actorFacingDebug.some(a=>a.key===window.__sceneDebug.ritual.actorId&&a.facing==='left'));
    await page.screenshot({path:out+'/walk-left.png'});
    report.checks.push('Gift approach across aisle uses right profile; return across aisle uses left profile; altar pose remains rear');
  }
  await page.waitForFunction(()=>!window.__sceneDebug.ritual);
  assert.equal(state.metrics.giftUnits,1);report.checks.push('Gift offering rear, return front; gift still scores once');
  await cmd({type:'settings',patch:{idleMinutes:.1}});
  await page.waitForFunction(()=>window.__sceneDebug.states.includes('to-standing'));
  assert.ok(await page.evaluate(()=>window.__actorFacingDebug.some(a=>a.facing==='front')));
  await page.screenshot({path:out+'/to-standing-front.png'});
  report.checks.push('Expired seated visitors face forward when walking out');
  if(extended){
    await cmd({type:'settings',patch:{treeEnabled:true,treeTarget:1000,effects:true,effectIntensity:.8,reducedEffects:false}});
    await cmd({type:'event',event:{type:'like',userId:'rain-test',likeCount:3500,eventId:'rain-1'}});
    await page.waitForFunction(()=>window.__treeDebug.rainVisible&&window.__treeDebug.flowers>12);
    await sleep(1800);
    for(const [width,height] of [[576,1024],[1080,1920]]){await page.setViewportSize({width,height});await page.screenshot({path:`${out}/flower-rain-${width}.png`});}
    const ends=state.tree.endsAt;await page.reload();await page.waitForFunction(()=>window.__treeDebug?.rainVisible);
    assert.equal(await page.evaluate(()=>window.__treeDebug.endsAt),ends);
    await until(()=>state.tree.phase==='growing','bloom completes');assert.equal(state.tree.completed,3);assert.equal(state.tree.progress,500);
    await page.waitForFunction(()=>!window.__treeDebug.rainVisible);
    await cmd({type:'settings',patch:{reducedEffects:true}});
    await cmd({type:'event',event:{type:'like',userId:'rain-test',likeCount:500,eventId:'rain-2'}});
    await page.waitForFunction(()=>window.__treeDebug.rainVisible&&window.__treeDebug.flowers>0);
    assert.ok(await page.evaluate(()=>window.__treeDebug.flowers<=12));await page.screenshot({path:out+'/flower-rain-reduced.png'});
    await cmd({type:'settings',patch:{effects:false}});await page.waitForFunction(()=>!window.__treeDebug.rainVisible);
    await cmd({type:'reset'});await page.waitForFunction(()=>window.__treeDebug.phase==='growing'&&!window.__treeDebug.rainVisible);
    report.checks.push('3500 likes trigger one rain; reload preserves deadline; 3 milestones and 500 overflow; reduced budget, effects off and reset clear rain');
    if(process.env.SIDE_RAIN_STRESS==='1'){
      await cmd({type:'settings',patch:{maxActors:100,idleMinutes:30,idleActivities:true,reducedEffects:false,effects:true}});
      await cmd({type:'add',count:100});await cmd({type:'add',count:10});await cmd({type:'add',count:10});
      await page.waitForFunction(()=>window.__sceneDebug.actors===120&&window.__sceneDebug.welcomes.length===0,{},{timeout:90000});
      report.fps=[];
      for(const [width,height] of [[576,1024],[1080,1920]]){
        await page.setViewportSize({width,height});await sleep(2300);
        await cmd({type:'event',event:{type:'like',userId:'rain-stress',likeCount:1000,eventId:`stress-${width}`}});
        await page.waitForFunction(()=>window.__treeDebug.rainVisible&&window.__treeDebug.flowers>0);
        const samples=[];for(let i=0;i<3;i++){await sleep(2100);samples.push(await page.evaluate(()=>window.__sceneDebug.fps));}
        report.fps.push({width,height,surface:'one capture page with 120 actors and flower rain',samples,average:samples.reduce((a,b)=>a+b)/samples.length});
        await page.screenshot({path:`${out}/rain-120-${width}.png`});await until(()=>state.tree.phase==='growing','stress bloom ends');
      }
      assert.ok(report.fps.every(s=>s.average>=24),'120 actor rain capture below 24 FPS');
      report.checks.push('120 actors and rain: capture-only FPS at both sizes >=24');
    }
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{socket?.disconnect();await browser?.close();if(server&&server.exitCode===null){if(server.connected)server.send('shutdown');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);if(server.exitCode===null)server.kill();}await writeFile(out+'/e2e-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
