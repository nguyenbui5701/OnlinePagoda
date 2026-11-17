import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='artifacts/temple-experience-v2/routes',build='test-results/temple-experience-v2-dist';await mkdir(out,{recursive:true});
const startedAt=new Date().toISOString(),run=`${out}/runs/${startedAt.replace(/[:.]/g,'-')}`;await mkdir(run,{recursive:true});
const hash=async p=>{try{return createHash('sha256').update(await readFile(p)).digest('hex');}catch(e){if(e.code==='ENOENT')return 'absent';throw e;}};
const protectedFiles=['data/settings.json','dist/server.mjs'],before=await Promise.all(protectedFiles.map(hash)),checks=[];
const jobs=[['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],['unit',['node_modules/vitest/vitest.mjs','run']],['build',['scripts/build.mjs']],['cluster1',['scripts/e2e-temple-experience-v2.mjs']],['cluster2',['scripts/e2e-temple-routes.mjs']]];
for(const [name,args] of jobs){
 console.log(name+'...');let log='';const child=spawn(process.execPath,args,{windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:`${run}/${name}`},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
 const code=await new Promise(done=>{child.once('error',e=>{log+=e.stack;done(-1);});child.once('exit',done);});
 checks.push({name,code});await writeFile(`${run}/${code===0?'':'FAIL-'}${name}.log`,log);console.log(name+': '+(code===0?'PASS':'FAIL'));
 if(code!==0){console.log(log.slice(-4000));break;}
}
const after=await Promise.all(protectedFiles.map(hash));const settingsUnchanged=before[0]===after[0],productionBuildUnchanged=before[1]===after[1];
const passed=checks.length===jobs.length&&checks.every(c=>c.code===0)&&settingsUnchanged&&productionBuildUnchanged;
try{await rename(`${out}/run-report.json`,`${out}/previous-${Date.now()}.json`);}catch(e){if(e.code!=='ENOENT')throw e;}
await writeFile(`${out}/run-report.json`,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),passed,implementationRevision:'parallel-prayer-original-carpet-v1',artifactDirectory:run,checks,settingsUnchanged,productionBuildUnchanged,fullPlanComplete:false,realLive:'NOT VERIFIED',phoneAudio:'NOT VERIFIED',load120x30:'NOT RUN',productionServer:'Not restarted'},null,2));
console.log('Anh/video/log: '+run);console.log(passed?'PASS cum 1 + 2. Can duyet hinh va thu LIVE sau.':'CHUA DAT. Gui routes/run-report.json va log FAIL trong artifactDirectory.');if(!passed)process.exitCode=1;
