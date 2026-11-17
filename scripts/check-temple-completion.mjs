import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,rename,cp,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const part=process.argv.find(a=>['actors','combos','panels'].includes(a))||'all',stress=process.argv.includes('--stress');
const out=`artifacts/temple-experience-v2/completion-${part}`,build='test-results/temple-completion-dist',baseline='test-results/temple-completion-baseline';
const startedAt=new Date().toISOString(),run=`${out}/runs/${startedAt.replace(/[:.]/g,'-')}`;await mkdir(run,{recursive:true});
const hash=async p=>{try{return createHash('sha256').update(await readFile(p)).digest('hex');}catch(e){if(e.code==='ENOENT')return 'absent';throw e;}};
const protectedFiles=['data/settings.json','dist/server.mjs'],before=await Promise.all(protectedFiles.map(hash)),checks=[];
// Optional baseline copy; never write to the running production directory.
let baselineAvailable=false;
if(stress){try{await access('dist/overlay/index.html');await cp('dist',baseline,{recursive:true});baselineAvailable=true;}catch(e){console.log('Baseline unavailable: '+e.message);}}
const parts=part==='all'?['actors','combos','panels']:[part];
const jobs=[['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],['unit',['node_modules/vitest/vitest.mjs','run']],['build',['scripts/build.mjs']],...parts.map(p=>[p,['scripts/e2e-temple-completion.mjs',p]])];
if(stress)jobs.push(['load-120x30',['scripts/soak-temple-completion.mjs']]);
for(const [name,args] of jobs){
 console.log(name+'...');let log='';
 const child=spawn(process.execPath,args,{windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:`${run}/${name}`,TEMPLE_BASELINE:baselineAvailable?baseline:''},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>{log+=d;if(name==='load-120x30')process.stdout.write(d);});child.stderr.on('data',d=>log+=d);
 const code=await new Promise(done=>{child.once('error',e=>{log+=e.stack;done(-1);});child.once('exit',done);});
 checks.push({name,code});await writeFile(`${run}/${code===0?'':'FAIL-'}${name}.log`,log);console.log(name+': '+(code===0?'PASS':'FAIL'));
 if(code!==0){console.log(log.slice(-4000));break;}
}
const after=await Promise.all(protectedFiles.map(hash)),settingsUnchanged=before[0]===after[0],productionBuildUnchanged=before[1]===after[1];
const passed=checks.length===jobs.length&&checks.every(c=>c.code===0)&&settingsUnchanged&&productionBuildUnchanged;
try{await rename(`${out}/run-report.json`,`${out}/previous-${Date.now()}.json`);}catch(e){if(e.code!=='ENOENT')throw e;}
await writeFile(`${out}/run-report.json`,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),part,passed,checks,artifactDirectory:run,settingsUnchanged,productionBuildUnchanged,implementationRevision:'actor-combo-layout-v2-upper-altar-gifts',load120x30:stress?'SEE load-120x30/report.json':'NOT RUN',realLive:'NOT VERIFIED',realGiftIds:'NOT VERIFIED',avatarCdn:'NOT VERIFIED',liveStudio:'NOT VERIFIED',phoneAudio:'NOT VERIFIED',productionServer:'Not restarted'},null,2));
console.log(`Report: ${out}/run-report.json`);console.log(passed?'PASS automated checks. Review images and test LIVE separately.':'CHUA DAT. Gui run-report.json va FAIL-*.log trong artifactDirectory.');if(!passed)process.exitCode=1;
