import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const extended=process.argv.includes('--side-rain');
const out=extended?'artifacts/side-walk-flower-rain':'artifacts/actor-facing',build=extended?'test-results/side-rain-dist':'test-results/actor-facing-dist';await mkdir(out,{recursive:true});
async function settingsHash(){try{return createHash('sha256').update(await readFile('data/settings.json')).digest('hex');}catch(e){if(e.code==='ENOENT')return 'absent';throw e;}}
const before=await settingsHash(),checks=[],startedAt=new Date().toISOString();
const jobs=[['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],['unit',['node_modules/vitest/vitest.mjs','run']],['build',['scripts/build.mjs']],['e2e',['scripts/e2e-actor-facing.mjs']]];
for(const [name,args] of jobs){
  try{await rename(`${out}/FAIL-${name}.log`,`${out}/previous-FAIL-${name}-${Date.now()}.log`);}catch(e){if(e.code!=='ENOENT')throw e;}
  console.log(name+'...');let log='';const c=spawn(process.execPath,args,{windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:out,SIDE_RAIN_TEST:extended?'1':'0',SIDE_RAIN_STRESS:process.argv.includes('--stress')?'1':'0'},stdio:['ignore','pipe','pipe']});
  c.stdout.on('data',d=>log+=d);c.stderr.on('data',d=>log+=d);
  const code=await new Promise(done=>{c.once('error',e=>{log+=e.stack;done(-1);});c.once('exit',done);});
  checks.push({name,code});await writeFile(`${out}/${name}.log`,log);console.log(`${name}: ${code===0?'PASS':'FAIL'}`);
  if(code!==0){await writeFile(`${out}/FAIL-${name}.log`,log);console.log(log.slice(-2500));break;}
}
const after=await settingsHash(),passed=checks.length===jobs.length&&checks.every(c=>c.code===0)&&before===after;
await writeFile(out+'/run-report.json',JSON.stringify({startedAt,finishedAt:new Date().toISOString(),passed,checks,settingsUnchanged:before===after,productionServer:'Not restarted; isolated build and fixture',realLive:'NOT VERIFIED'},null,2));
console.log(passed?'PASS. Xem anh trong '+out:'CHUA DAT. Gui '+out+'/run-report.json va FAIL-*.log');if(!passed)process.exitCode=1;
