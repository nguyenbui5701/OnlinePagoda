import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='artifacts/temple-experience-v2/clean-art',build='test-results/temple-experience-v2-dist';await mkdir(out,{recursive:true});
const runId=new Date().toISOString().replace(/[:.]/g,'-'),artifactDirectory=`${out}/runs/${runId}`;
await mkdir(artifactDirectory,{recursive:true});
const hash=async path=>{try{return createHash('sha256').update(await readFile(path)).digest('hex');}catch(e){if(e.code==='ENOENT')return 'absent';throw e;}};
const before=await Promise.all(['data/settings.json','dist/server.mjs'].map(hash)),startedAt=new Date().toISOString(),checks=[];
try{await rename(`${out}/run-report.json`,`${out}/previous-run-report-${Date.now()}.json`);}catch(e){if(e.code!=='ENOENT')throw e;}
const jobs=[['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],['unit',['node_modules/vitest/vitest.mjs','run']],['build',['scripts/build.mjs']],['cluster1',['scripts/e2e-temple-experience-v2.mjs']]];
for(const [name,args] of jobs){
 try{await rename(`${out}/FAIL-${name}.log`,`${out}/previous-FAIL-${name}-${Date.now()}.log`);}catch(e){if(e.code!=='ENOENT')throw e;}
 console.log(name+'...');let log='';const child=spawn(process.execPath,args,{windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:`${artifactDirectory}/${name}`},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
 const code=await new Promise(done=>{child.once('error',e=>{log+=e.stack;done(-1);});child.once('exit',done);});checks.push({name,code});await writeFile(`${out}/${name}.log`,log);
 console.log(name+': '+(code===0?'PASS':'FAIL'));if(code!==0){await writeFile(`${out}/FAIL-${name}.log`,log);console.log(log.slice(-4000));break;}
}
const after=await Promise.all(['data/settings.json','dist/server.mjs'].map(hash)),settingsUnchanged=before[0]===after[0],productionBuildUnchanged=before[1]===after[1];
const passed=checks.length===jobs.length&&checks.every(c=>c.code===0)&&settingsUnchanged&&productionBuildUnchanged;
await writeFile(`${out}/run-report.json`,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),scope:'Reference left/right composition + cards/camera regression',implementationRevision:'reference-plates-v4',artifactDirectory,passed,checks,settingsUnchanged,productionBuildUnchanged,fullPlanComplete:false,assets:'Replacement B/C plates mapped directly; existing D retained; 941x1672; visual approval PENDING',media:process.env.TEMPLE_FULL_MEDIA==='1'?'full':'2 review images (left/right)',load120x30:'NOT RUN',realLive:'NOT VERIFIED',phoneAudio:'NOT VERIFIED',productionServer:'Not restarted'},null,2));
console.log('Anh va E2E report: '+artifactDirectory);
console.log(passed?'PASS cum 1. Chua hoan tat toan bo plan.':'CHUA DAT. Gui run-report.json va FAIL-*.log.');if(!passed)process.exitCode=1;
