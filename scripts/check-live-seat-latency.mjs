import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const full=process.argv.includes('--e2e');
const root='artifacts/live-seat-latency',startedAt=new Date().toISOString();
const run=`${root}/runs/${startedAt.replace(/[:.]/g,'-')}`;
const build='test-results/live-seat-latency-dist';
await mkdir(run,{recursive:true});
const hash=async path=>{try{return createHash('sha256').update(await readFile(path)).digest('hex');}catch(e){if(e.code==='ENOENT')return null;throw e;}};
const protectedFiles=['data/settings.json','dist/server.mjs'];
const before=await Promise.all(protectedFiles.map(hash));
const jobs=[['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],['unit',['node_modules/vitest/vitest.mjs','run']]];
if(full)jobs.push(['build',['scripts/build.mjs']],['e2e',['scripts/e2e-temple-routes.mjs']]);
const report={startedAt,passed:false,scope:full?'typecheck + unit + isolated build + routes E2E':'typecheck + unit',artifactDirectory:run,checks:[],realLive:'NOT VERIFIED',phoneAudio:'NOT VERIFIED',capturePerformance:'NOT VERIFIED',productionServer:'Not restarted'};
try{
  for(const [name,args] of jobs){
    console.log(`${name}...`);let log='';
    const child=spawn(process.execPath,args,{windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:`${run}/${name}`},stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',data=>log+=data);child.stderr.on('data',data=>log+=data);
    const code=await new Promise(resolve=>{child.once('error',e=>{log+=e.stack;resolve(-1);});child.once('exit',resolve);});
    const logFile=`${run}/${code===0?'':'FAIL-'}${name}.log`;
    await writeFile(logFile,log);report.checks.push({name,code,log:logFile});
    console.log(`${name}: ${code===0?'PASS':'FAIL'}`);
    if(code!==0){console.log(log.slice(-6000));break;}
  }
}catch(e){report.failure=e.stack||String(e);}
finally{
  const after=await Promise.all(protectedFiles.map(hash));
  report.settingsUnchanged=before[0]===after[0];report.productionBuildUnchanged=before[1]===after[1];
  report.passed=!report.failure&&report.checks.length===jobs.length&&report.checks.every(c=>c.code===0)&&report.settingsUnchanged&&report.productionBuildUnchanged;
  report.finishedAt=new Date().toISOString();
  await writeFile(`${run}/run-report.json`,JSON.stringify(report,null,2));
  await writeFile(`${root}/run-report.json`,JSON.stringify(report,null,2));
  console.log(`Report: ${root}/run-report.json`);
  console.log(report.passed?(full?'PASS bo kiem thu cach ly. LIVE that va FPS chua kiem chung.':'PASS typecheck/unit. Chay lai BAT voi --e2e de build va kiem thu giao dien cach ly.'):'CHUA DAT. Gui run-report.json va FAIL-*.log trong artifactDirectory.');
  if(!report.passed)process.exitCode=1;
}
