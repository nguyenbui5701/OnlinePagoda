import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
const out = process.env.ARTIFACT_DIR || 'artifacts/stage3/golden';
const url = process.env.TEST_URL || 'http://127.0.0.1:3109';
assert.equal((await (await fetch(`${url}/api/health`)).json()).fixture, true);
const socket = io(url, { auth: { role: 'dashboard' } });
let settings;
socket.on('snapshot', state => settings = state.settings); socket.on('delta', state => settings = state.settings);
const command = data => new Promise((done, reject) => socket.timeout(5000).emit('command', data, (error, reply) => error ? reject(error) : reply.ok ? done(reply) : reject(Error(reply.error))));
const report = { kind: 'FIXTURE ONLY', checks: [], machine: { cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, ramGiB: Math.round(os.totalmem()/2**30), os: os.release(), node: process.version } };
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
try {
  await command({ type: 'source', mode: 'demo' }); await command({ type: 'reset' });
  await command({ type: 'settings', patch: { theme: 'golden', effects: true, effectIntensity: .65, maxActors: 60, idleMinutes: 8, reducedEffects: false } });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`${url}/dashboard/`);
  await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.__sceneDebug);
  const frame = page.frames().find(f => f.url().includes('/overlay'));
  assert.ok(frame); await frame.waitForFunction(() => window.__sceneDebug?.theme === 'golden');
  report.machine.browser = browser.version();
  report.machine.gpu = await frame.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'); const ext = gl?.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable'; });
  for (const [key, label] of [['showGiftPanel','Bảng nghi thức & quà'],['showThanksPanel','Bảng lời cảm ơn'],['showTicker','Thông báo cuối sân'],['showBubbles','Bong bóng cầu an'],['glow','Hào quang'],['smoke','Khói hương'],['candles','Ánh nến']]) {
    await page.getByLabel(label, {exact: true}).uncheck(); await frame.waitForFunction(k => window.__sceneDebug.golden.visible[k] === false, key);
    await page.getByLabel(label, {exact: true}).check(); await frame.waitForFunction(k => window.__sceneDebug.golden.visible[k] === true, key);
    report.checks.push(`Dashboard toggles ${key} off/on in actual renderer`);
  }
  await command({ type: 'add', count: 10 });
  await frame.waitForFunction(() => window.__sceneDebug.actors === 10 && window.__sceneDebug.states.every(s => s === 'idle'));
  await page.getByLabel('Hoa sen tương tác',{exact:true}).uncheck();
  for (let i=0; i<50 && settings?.flowers !== false; i++) await new Promise(done => setTimeout(done,100));
  assert.equal(settings?.flowers,false);
  await page.getByRole('button',{name:'Gift thử',exact:true}).click();
  await frame.waitForFunction(() => window.__sceneDebug.golden.giftUnits > 0);
  assert.equal(await frame.evaluate(() => window.__sceneDebug.golden.effects), 0);
  await page.getByLabel('Hoa sen tương tác',{exact:true}).check(); report.checks.push('Flowers off suppresses gift bloom while finalized totals still update');
  const fallback = await browser.newPage();
  await fallback.route('**/art/golden/*.png', route => route.abort());
  await fallback.goto(`${url}/overlay/`);
  await fallback.waitForFunction(() => window.__sceneDebug?.theme === 'classic' && window.__sceneDebug.actors === 10, null, {timeout:30000});
  report.checks.push('Missing golden assets falls back to functional classic with same actors'); await fallback.close();
  // Final delivery capture uses only synthetic DEMO visitors, never a real channel.
  await page.screenshot({path:`${out}/dashboard-controls.png`,fullPage:true});
  report.passed = true;
} catch (error) { report.passed = false; report.failure = String(error.stack || error); process.exitCode = 1; }
finally { socket.disconnect(); await browser.close(); await writeFile(`${out}/controls-report.json`,JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2)); }
