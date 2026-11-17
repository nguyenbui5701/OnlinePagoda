import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='artifacts/welcome-feedback',build='test-results/welcome-feedback-dist';await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),before=hash(await readFile('data/settings.json')),checks=[];
const jobs=[['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],['unit',['node_modules/vitest/vitest.mjs','run']],['build',['scripts/build.mjs']],['e2e-welcome',['scripts/e2e-welcome-feedback.mjs']],['e2e-mobile',['scripts/e2e-live-mobile.mjs']],['e2e-voice',['scripts/e2e-fortune-voice.mjs']]];
for(const [name,args] of jobs){console.log('Dang chay '+name);let log='';const c=spawn(process.execPath,args,{windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:name==='e2e-welcome'?out:`${out}/${name}`},stdio:['ignore','pipe','pipe']});c.stdout.on('data',d=>log+=d);c.stderr.on('data',d=>log+=d);const code=await new Promise(done=>{c.once('error',e=>{log+=e.stack;done(-1);});c.once('exit',done);});checks.push({name,code});await writeFile(`${out}/${name}.log`,log);console.log(name+': '+(code===0?'PASS':'FAIL'));if(code!==0){console.log(log.slice(-3000));break;}}
const preserved=before===hash(await readFile('data/settings.json')),passed=checks.length===jobs.length&&checks.every(c=>c.code===0)&&preserved;
await writeFile(out+'/run-report.json',JSON.stringify({checks,passed,operatingSettingsUnchanged:preserved,realLive:'NOT VERIFIED'},null,2));if(!passed)process.exitCode=1;
