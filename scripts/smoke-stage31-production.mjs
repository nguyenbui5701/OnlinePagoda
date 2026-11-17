import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const directory=resolve(`test-results/stage31-production-${Date.now()}`);await mkdir(directory,{recursive:true});
const url='http://127.0.0.1:3111';
const server=spawn(process.execPath,[resolve('dist/server.mjs')],{cwd:directory,env:{...process.env,PORT:'3111',APP_BUILD_DIRECTORY:resolve('dist')},windowsHide:true,stdio:'ignore'});
const report={kind:'REAL BUNDLED ENTRY / ISOLATED DEMO DATA / NOT LIVE',checks:[]};
try{
  let health;for(let i=0;i<60;i++){try{health=await(await fetch(url+'/api/health')).json();break;}catch{await new Promise(r=>setTimeout(r,100));}}
  assert.equal(health?.ok,true);assert.equal(health.mode,'DEMO');assert.ok(!health.fixture);report.checks.push('Production bundle starts isolated DEMO, no automatic LIVE connection');
  for(const path of ['/dashboard/','/overlay/','/overlay/art/golden/devotees-back.png',...['rose','heart','bouquet','donut','offering','corgi','lantern','lion','generic'].map(k=>`/overlay/audio/vi-v2/${k}.voice.json`)]){const r=await fetch(url+path);assert.equal(r.status,200,path);assert.ok((await r.arrayBuffer()).byteLength>100);}
  report.checks.push('Dashboard, overlay, rear atlas and all nine approved PCM voice files served');
  const redirected=await fetch(url+'/overlay?sound=1');assert.equal(redirected.url,url+'/overlay/?sound=1');report.checks.push('Production sound activation URL preserved');report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack||e);process.exitCode=1;}
finally{server.kill();await writeFile('artifacts/stage3_1/production-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
