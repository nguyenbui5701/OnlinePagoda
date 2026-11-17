import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const out='artifacts/live-experience',build='test-results/live-experience-dist';
await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const before=hash(await readFile('data/settings.json')),checks=[];
const jobs=[
  ['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],
  ['unit',['node_modules/vitest/vitest.mjs','run']],
  ['build',['scripts/build.mjs']],
  ['e2e-experience',['scripts/e2e-live-experience.mjs']],
  ['e2e-mobile',['scripts/e2e-live-mobile.mjs']],
  ['e2e-voice',['scripts/e2e-fortune-voice.mjs']],
  ['e2e-fortune',['scripts/e2e-fortune2027.mjs']]
];
for(const [name,args] of jobs){
  console.log('Dang chay '+name);let log='';
  const child=spawn(process.execPath,args,{windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:name==='e2e-experience'?out:`${out}/${name}`},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
  const code=await new Promise(done=>{child.once('error',e=>{log+=e.stack;done(-1);});child.once('exit',done);});
  await writeFile(`${out}/${name}.log`,log);checks.push({name,code});console.log(name+': '+(code===0?'PASS':'FAIL'));
  if(code!==0){console.log(log.slice(-3000));break;}
}
const preserved=before===hash(await readFile('data/settings.json'));
const passed=checks.length===jobs.length&&checks.every(c=>c.code===0)&&preserved;
await writeFile(out+'/run-report.json',JSON.stringify({checks,passed,operatingSettingsUnchanged:preserved,realLive:'NOT VERIFIED',phoneAndLiveStudioAudio:'NOT VERIFIED'},null,2));
if(!passed)process.exitCode=1;
