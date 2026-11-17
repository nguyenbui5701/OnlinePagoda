import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const url='http://127.0.0.1:3119';assert.equal((await(await fetch(url+'/api/health')).json()).fixture,true);
const socket=io(url,{auth:{role:'dashboard'}});let state;socket.on('snapshot',s=>state=s);socket.on('delta',s=>state=s);
const cmd=data=>new Promise((done,reject)=>socket.timeout(5000).emit('command',data,(e,r)=>e?reject(e):r.ok?done():reject(Error(r.error))));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const report={kind:'MEASURED LOCAL WEB AUDIO OUTPUT STREAM, NOT LIVE OR OBS',checks:[],levels:{}};let saved;
try{
  for(let i=0;i<50&&!state;i++)await new Promise(r=>setTimeout(r,100));assert.ok(state);saved=state.settings;
  await cmd({type:'source',mode:'demo'});await cmd({type:'settings',patch:{masterMute:false,voiceMode:'fallback',showGiftThanks:true,ambienceEnabled:false,voiceVolume:.8,sfxVolume:.65,ambienceVolume:.15}});
  const page=await browser.newPage();await page.goto(url+'/overlay?sound=1');
  assert.equal(new URL(page.url()).pathname,'/overlay/');assert.equal(new URL(page.url()).search,'?sound=1');
  await page.getByRole('button',{name:'Bật âm thanh',exact:true}).click();await page.waitForFunction(()=>window.__audioControl?.state==='ready');
  await page.evaluate(async()=>{const ctx=new AudioContext();await ctx.resume();const a=ctx.createAnalyser();a.fftSize=2048;const gain=ctx.createGain();gain.gain.value=0;ctx.createMediaStreamSource(window.__audioControl.getStream()).connect(a);a.connect(gain);gain.connect(ctx.destination);window.__measure=async(ms)=>{let sum=0,count=0,peak=0;const data=new Float32Array(a.fftSize),end=performance.now()+ms;while(performance.now()<end){a.getFloatTimeDomainData(data);for(const v of data){sum+=v*v;count++;peak=Math.max(peak,Math.abs(v));}await new Promise(r=>setTimeout(r,25));}return{rms:Math.sqrt(sum/count),peak};};});
  async function sample(name,patch,kind){await cmd({type:'settings',patch});await page.waitForTimeout(500);if(kind)await page.evaluate(k=>window.__audioControl.test(k,'rose'),kind);report.levels[name]=await page.evaluate(ms=>window.__measure(ms),kind==='voice'?5200:2600);await page.waitForFunction(()=>!window.__audioControl.debug().playing);}
  await sample('voiceOn',{voiceVolume:.8,sfxVolume:0},'voice');await sample('voiceZero',{voiceVolume:0},'voice');
  await sample('sfxOn',{sfxVolume:.65},'sfx');await sample('sfxZero',{sfxVolume:0},'sfx');
  await sample('ambienceOn',{ambienceEnabled:true,ambienceVolume:.3});await sample('ambienceZero',{ambienceVolume:0});
  await sample('masterMuted',{voiceVolume:.8,sfxVolume:.65,ambienceVolume:.3,masterMute:true},'full');
  for(const [on,off] of [['voiceOn','voiceZero'],['sfxOn','sfxZero'],['ambienceOn','ambienceZero']]){assert.ok(report.levels[on].rms>.0001,on);assert.ok(report.levels[off].rms<.00001,off);report.checks.push(`${on}/${off}: actual PCM channel audible then silent`);}
  assert.ok(report.levels.masterMuted.rms<.00001);report.checks.push('Master mute silences actual mixed PCM output');
  assert.ok(Object.values(report.levels).every(l=>l.peak<.999));report.checks.push('No clipping in measured voice/SFX/ambience output');
  await cmd({type:'settings',patch:{masterMute:false,voiceVolume:0,sfxVolume:.65,ambienceEnabled:false}});await page.waitForTimeout(400);
  await page.evaluate(async()=>{for(let i=0;i<3;i++)await window.__audioControl.test('full','rose');});
  await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__audioControl.debug().queued),2);
  report.checks.push('Voice at zero still serializes SFX: three full events leave two waiting');
  await cmd({type:'settings',patch:{masterMute:true}});await page.waitForFunction(()=>window.__audioControl.state==='muted');
  report.checks.push('Overlay slash redirect preserves sound query and gesture activation');report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{if(saved)await cmd({type:'settings',patch:{masterMute:saved.masterMute,voiceVolume:saved.voiceVolume,sfxVolume:saved.sfxVolume,ambienceVolume:saved.ambienceVolume,ambienceEnabled:saved.ambienceEnabled,voiceMode:saved.voiceMode,showGiftThanks:saved.showGiftThanks}}).catch(()=>{});socket.disconnect();await browser.close();await writeFile('artifacts/stage3_1/audio-levels-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
