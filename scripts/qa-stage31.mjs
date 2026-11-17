// Run against an already-started isolated fixture. Never use the operating LIVE server.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/stage3_1',url=process.env.TEST_URL||'http://127.0.0.1:3119';
assert.equal((await(await fetch(url+'/api/health')).json()).fixture,true);
await mkdir(out,{recursive:true});await mkdir(out+'/regression-scene',{recursive:true});
const checks=[];
const jobs=[
  ['stage31','scripts/e2e-stage31.mjs',{}],
  ['config','scripts/e2e-stage31-config.mjs',{}],
  ['regression-demo','scripts/e2e.mjs',{ARTIFACT_DIR:out+'/regression-demo'}],
  ['regression-live','scripts/e2e-live.mjs',{ARTIFACT_DIR:out+'/regression-live',FIXTURE_PORT:'3107'}],
  ['regression-scene','scripts/e2e-stage3.mjs',{ARTIFACT_DIR:out+'/regression-scene'}],
  ['regression-controls','scripts/e2e-stage3-controls.mjs',{ARTIFACT_DIR:out+'/regression-scene'}]
];
for(const [name,file,extra] of jobs){
  console.log('Running '+name);let log='';const started=Date.now();
  const child=spawn(process.execPath,[file],{env:{...process.env,TEST_URL:url,APP_BUILD_DIRECTORY:'test-results/stage31-dist',...extra},windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
  const code=await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',done);});
  await writeFile(`${out}/${name}.log`,log);checks.push({name,code,seconds:(Date.now()-started)/1000});
  await writeFile(out+'/qa-summary.json',JSON.stringify({checks,passed:checks.length===jobs.length&&checks.every(c=>c.code===0)},null,2));
  console.log(name+': '+code);if(code!==0){console.error(log.slice(-4000));process.exitCode=1;break;}
}
