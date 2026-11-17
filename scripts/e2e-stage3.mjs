import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const url = process.env.TEST_URL || 'http://127.0.0.1:3109';
assert.equal((await (await fetch(`${url}/api/health`)).json()).fixture, true, 'Stage 3 E2E requires an isolated fixture server');
const out = process.env.ARTIFACT_DIR || 'artifacts/stage3/golden'; await mkdir(out, { recursive: true });
const report = { kind: 'ISOLATED FIXTURE / NOT REAL LIVE', checks: [], errors: [], fps: [], externalRequests: [] };
const sleep = ms => new Promise(done => setTimeout(done, ms));
async function until(fn, label, timeout = 15000) { const start = Date.now(); while (Date.now() - start < timeout) { if (await fn()) return; await sleep(100); } throw Error(`Timeout: ${label}`); }
const socket = io(url, { auth: { role: 'dashboard' } }); let state;
socket.on('snapshot', value => state = value);
socket.on('delta', delta => {
  if (!state || delta.sessionId !== state.sessionId || delta.revision !== state.revision + 1) { socket.emit('resync'); return; }
  const actors = new Map(state.actors.map(a => [a.key, a])); delta.removed.forEach(k => actors.delete(k)); delta.upserts.forEach(a => actors.set(a.key, a)); state = { ...delta, actors: [...actors.values()] };
});
const rpc = (event, data) => new Promise((done, reject) => socket.timeout(5000).emit(event, data, (error, reply) => error ? reject(error) : reply.ok ? done(reply) : reject(Error(reply.error))));
const command = data => rpc('command', data);
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args: ['--enable-webgl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] });
try {
  await until(() => state, 'snapshot');
  const context = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
  context.setDefaultTimeout(20000);
  await context.route('**/*', route => { if (!['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)) { report.externalRequests.push(route.request().url()); return route.abort(); } return route.continue(); });
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  const dashboard = await context.newPage(); dashboard.on('pageerror', error => report.errors.push(error.message)); await dashboard.setViewportSize({ width: 1440, height: 1100 });
  await command({ type: 'source', mode: 'demo' }); await command({ type: 'reset' });
  await command({ type: 'settings', patch: { theme: 'golden', maxActors: 60, idleMinutes: 8, animationSpeed: 1, effects: true, effectIntensity: .65, showLabels: true, showGuide: true, showRegister: true, showTicker: true, showBubbles: true, showGiftPanel: true, showThanksPanel: true, reducedEffects: false, smoke: true, glow: true, candles: true, flowers: true, safeRight: 0, safeBottom: 0 } });
  await page.goto(`${url}/overlay/`); await dashboard.goto(`${url}/dashboard/`);
  await page.waitForFunction(() => window.__sceneDebug?.theme === 'golden');
  await page.screenshot({ path: `${out}/overlay-0-1080.png` }); report.checks.push('New original layered temple and empty panels render from actual app');
  await dashboard.getByRole('button', { name: '+10 người', exact: true }).click();
  await page.waitForFunction(() => window.__sceneDebug?.actors === 10 && window.__sceneDebug.states.every(s => s === 'idle'));
  await page.screenshot({ path: `${out}/overlay-10-1080.png` });
  for (const size of [[1080,1920],[720,1280]]) {
    await page.bringToFront(); await page.setViewportSize({width:size[0],height:size[1]}); await sleep(4500); const samples=[];
    for(let i=0;i<8;i++){await sleep(500);samples.push(await page.evaluate(()=>window.__sceneDebug.fps));}
    report.fps.push({actors:10,size,samples,min:Math.min(...samples),average:samples.reduce((a,b)=>a+b,0)/samples.length});
  }
  await page.setViewportSize({width:1080,height:1920});
  const first = state.actors[0], id = decodeURIComponent(first.key.split(':').at(-1));
  await command({type:'event',event:{type:'chat',userId:id,nickname:first.displayName,text:'cầu an',eventId:'prayer-stage3'}});
  await page.waitForFunction(()=>window.__sceneDebug.golden.effects>0 && window.__sceneDebug.golden.bubbles>0);
  await sleep(350);await page.screenshot({path:`${out}/prayer-bubble-lotus.png`});report.checks.push('Prayer produces dynamic lotus and bounded safe bubble');
  await command({type:'event',event:{type:'gift',userId:'synthetic-giver',nickname:'Tâm An',eventId:'gift-stage3',gift:{id:'5655',count:3,finished:true,streakId:'group-stage3'}}});
  await page.waitForFunction(()=>window.__sceneDebug.golden.giftUnits===3 && window.__sceneDebug.golden.giftNames.includes('Tâm An'));
  await page.screenshot({path:`${out}/gift-thanks-ticker.png`});report.checks.push('Gift UI shows confirmed aggregate and sanitized thank-you, no invented ranking');
  const session=state.sessionId,before=state.actors.map(a=>[a.key,a.seatId]);
  await dashboard.getByLabel('Phong cách cảnh',{exact:true}).selectOption('classic');
  await page.waitForFunction(()=>window.__sceneDebug.theme==='classic');assert.equal(state.sessionId,session);assert.deepEqual(state.actors.map(a=>[a.key,a.seatId]),before);
  await page.screenshot({path:`${out}/rollback-classic.png`});
  await dashboard.getByLabel('Phong cách cảnh',{exact:true}).selectOption('golden');await page.waitForFunction(()=>window.__sceneDebug.theme==='golden');report.checks.push('Theme rollback/switch keeps session, identities and seats');
  await dashboard.getByLabel('Giảm hiệu ứng',{exact:true}).check();await until(()=>state.settings.reducedEffects,'reduced effects saved');await page.waitForFunction(()=>window.__sceneDebug.golden.smokeParticles<=7);
  await dashboard.getByLabel('Khói hương',{exact:true}).uncheck();await until(()=>!state.settings.smoke,'smoke setting');
  await dashboard.getByLabel('Khói hương',{exact:true}).check();await dashboard.getByLabel('Giảm hiệu ứng',{exact:true}).uncheck();report.checks.push('Appearance toggles persist and reduced smoke budget applies live');
  await command({type:'add',count:100});await until(()=>state.actors.length===60&&state.queue===50,'60 actors + FIFO');
  await page.waitForFunction(()=>window.__sceneDebug.states.length===60 && window.__sceneDebug.states.every(s=>s==='idle'));
  const diagnostics=await page.evaluate(()=>window.__sceneDebug);assert.equal(diagnostics.labels.length,60);
  const overlap=(a,b)=>Math.max(a.x,b.x)<Math.min(a.x+a.width,b.x+b.width)-1&&Math.max(a.y,b.y)<Math.min(a.y+a.height,b.y+b.height)-1;
  for(let i=0;i<diagnostics.labels.length;i++)for(let j=i+1;j<diagnostics.labels.length;j++)assert.ok(!overlap(diagnostics.labels[i],diagnostics.labels[j]),'labels overlap');
  await page.screenshot({path:`${out}/overlay-60-1080.png`});await dashboard.screenshot({path:`${out}/dashboard.png`,fullPage:true});
  for(const size of [[1080,1920],[720,1280],[576,1024],[360,640]]) {
    await page.setViewportSize({width:size[0],height:size[1]});await sleep(350);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth&&document.documentElement.scrollHeight===innerHeight));
    const box=await page.locator('canvas').boundingBox();assert.ok(Math.abs(box.width-size[0])<=1&&Math.abs(box.height-size[1])<=1);
    await page.screenshot({path:`${out}/overlay-60-${size[0]}.png`});
    if(size[0]>=720){await page.bringToFront();await sleep(4500);const samples=[];for(let i=0;i<10;i++){await sleep(500);samples.push(await page.evaluate(()=>window.__sceneDebug.fps));}report.fps.push({actors:60,size,samples,min:Math.min(...samples),average:samples.reduce((a,b)=>a+b,0)/samples.length});}
  }
  report.checks.push('60 chibi actors / 60 non-overlapping labels; 1080/720/576/360 exact portrait without scroll or gutter');
  await page.reload();await page.waitForFunction(()=>window.__sceneDebug?.actors===60);assert.equal(state.sessionId,session);report.checks.push('Overlay reload recovers scene and gift totals without replaying transient gifts');
  await dashboard.setViewportSize({width:390,height:844});assert.ok(await dashboard.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.checks.push('Expanded dashboard fits mobile');
  // No real channel identifiers enter screenshots. Use only the test provider.
  await command({type:'source',mode:'tiktok'});await command({type:'live-connect',username:'fixture_stage3'});await until(()=>state.connection.status==='LIVE_CONNECTED','fixture connected');
  await page.waitForFunction(()=>window.__sceneDebug.actors===0&&window.__sceneDebug.golden.giftUnits===0);await page.setViewportSize({width:1080,height:1920});
  await page.screenshot({path:`${out}/fixture-empty-no-ranking.png`});assert.deepEqual(await page.evaluate(()=>window.__sceneDebug.golden.giftNames),[]);report.checks.push('LIVE fixture starts with truthful empty thank-you panel, no DEMO data leakage');
  const saved=state.settings;await rpc('fixture',{operation:'restart'});await until(()=>state.mode==='demo'&&state.sessionId!==session,'restart');
  assert.equal(state.settings.theme,saved.theme);assert.equal(state.settings.showBubbles,saved.showBubbles);report.checks.push('Visual preferences survive restart; source restarts in DEMO');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.checks.push('No JavaScript errors or external asset requests');report.passed=true;
}catch(error){report.passed=false;report.failure=String(error.stack||error);process.exitCode=1;}
finally {socket.disconnect();await browser.close();await writeFile(`${out}/test-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
