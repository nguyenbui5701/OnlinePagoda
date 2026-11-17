import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const phase='multicamera',out=`artifacts/${phase}`,build=`test-results/${phase}-dist`,stress=process.argv.includes('--stress');
await mkdir(out,{recursive:true});const startedAt=new Date().toISOString(),checks=[];
async function hash(path){try{return createHash('sha256').update(await readFile(path)).digest('hex');}catch(e){if(e.code==='ENOENT')return 'absent';throw e;}}
const settingsBefore=await hash('data/settings.json'),distBefore=await hash('dist/server.mjs');
const jobs=[['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],['unit',['node_modules/vitest/vitest.mjs','run']],['build',['scripts/build.mjs']],['e2e',[`scripts/e2e-${phase}.mjs`]]];

if(stress)jobs.push(['benchmark',['scripts/soak-multicamera.mjs']]);
for(const [name,args] of jobs){
 try{await rename(`${out}/FAIL-${name}.log`,`${out}/previous-FAIL-${name}-${Date.now()}.log`);}catch(e){if(e.code!=='ENOENT')throw e;}
 console.log(name+'...');let log='';const child=spawn(process.execPath,args,{windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:`${out}/${name}`},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
 const code=await new Promise(done=>{child.once('error',e=>{log+=e.stack;done(-1);});child.once('exit',done);});
 checks.push({name,code});await writeFile(`${out}/${name}.log`,log);console.log(name+': '+(code===0?'PASS':'FAIL'));
 if(code!==0){await writeFile(`${out}/FAIL-${name}.log`,log);console.log(log.slice(-3500));break;}
}
const settingsUnchanged=settingsBefore===await hash('data/settings.json'),productionBuildUnchanged=distBefore===await hash('dist/server.mjs');
const passed=checks.length===jobs.length&&checks.every(c=>c.code===0)&&settingsUnchanged&&productionBuildUnchanged;
await writeFile(`${out}/run-report.json`,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),passed,checks,stress,settingsUnchanged,productionBuildUnchanged,productionServer:'Not restarted; isolated fixture',realLive:'NOT VERIFIED',realAvatarCdn:'NOT VERIFIED',phoneAudio:'NOT VERIFIED'},null,2));
console.log(passed?`PASS. Xem ${out}`:`CHUA DAT. Gui ${out}/run-report.json va FAIL-*.log`);if(!passed)process.exitCode=1;
