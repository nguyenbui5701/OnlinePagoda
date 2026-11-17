import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const directory=resolve('test-results/stage3-production-smoke'); await mkdir(directory,{recursive:true});
const port=3111, url=`http://127.0.0.1:${port}`;
// Run the real bundled entry with an isolated working/data directory. No TikTok connection.
const server=spawn(process.execPath,[resolve('dist/server.mjs')],{cwd:directory,env:{...process.env,PORT:String(port),APP_BUILD_DIRECTORY:resolve('dist')},windowsHide:true,stdio:'ignore'});
const report={kind:'PRODUCTION BUILD, LOCAL DEMO SMOKE ONLY',checks:[]};
try {
  let health;
  for(let i=0;i<50;i++){try{health=await(await fetch(`${url}/api/health`)).json();break;}catch{await new Promise(r=>setTimeout(r,100));}}
  assert.equal(health?.ok,true); assert.equal(health.mode,'DEMO'); assert.ok(!health.fixture);
  report.checks.push('Bundled server starts in DEMO without automatic LIVE connection');
  for(const path of ['/dashboard/','/overlay/','/overlay/art/golden/temple-hall.png','/overlay/art/golden/buddha-lotus.png','/overlay/art/golden/devotees.png','/overlay/art/golden/incense-burner.png']){const response=await fetch(url+path);assert.equal(response.status,200,path);assert.ok((await response.arrayBuffer()).byteLength>0);}
  report.checks.push('Production dashboard, overlay and all four local textures are served');report.passed=true;
}catch(error){report.passed=false;report.failure=String(error);process.exitCode=1;}
finally{server.kill();await writeFile('artifacts/stage3/production-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
