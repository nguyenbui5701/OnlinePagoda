import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const phase=Number(process.argv[2]||3);
if(![1,2,3].includes(phase))throw Error('Use phase 1, 2 or 3');
const out=`artifacts/expansion/phase${phase}`,build=`test-results/expansion-phase${phase}`;
await mkdir(out,{recursive:true});
const digest=b=>createHash('sha256').update(b).digest('hex');
async function settingsHash(){try{return digest(await readFile('data/settings.json'));}catch(e){if(e.code==='ENOENT')return 'absent';throw e;}}
const before=await settingsHash(),checks=[],startedAt=new Date().toISOString();
const jobs=[['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],['unit',['node_modules/vitest/vitest.mjs','run']],['build',['scripts/build.mjs']],['e2e',['scripts/e2e-expansion.mjs']]];
if(phase===3)jobs.push(['voice-regression',['scripts/e2e-fortune-voice.mjs']],['mobile-regression',['scripts/e2e-live-mobile.mjs']]);
for(const [name,args] of jobs){
  console.log(`Dot ${phase} - ${name}...`);let log='';
  const child=spawn(process.execPath,args,{windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:build,EXPANSION_PHASE:String(phase),ARTIFACT_DIR:name.endsWith('regression')?`${out}/${name}`:out},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
  const code=await new Promise(done=>{child.once('error',e=>{log+=e.stack;done(-1);});child.once('exit',done);});
  checks.push({name,code});await writeFile(`${out}/${name}.log`,log);
  console.log(`${name}: ${code===0?'PASS':'FAIL'}`);
  if(code!==0){await writeFile(`${out}/FAIL-${name}.log`,log);console.log(log.slice(-3000));break;}
}
const after=await settingsHash();let capture;
if(checks.find(c=>c.name==='e2e'))try{capture=JSON.parse(await readFile(`${out}/e2e-report.json`,'utf8'));}catch{}
const passed=checks.length===jobs.length&&checks.every(c=>c.code===0)&&before===after;
await writeFile(`${out}/run-report.json`,JSON.stringify({phase,startedAt,finishedAt:new Date().toISOString(),passed,checks,settings:{before,after,unchanged:before===after},capture,realLive:'NOT VERIFIED',productionServer:'Not restarted. Isolated fixture and build only.'},null,2));
console.log(passed?`DA QUA KIEM THU TU DONG. Xem anh tai ${out}. LIVE that va loa may can ban duyet.`:`CHUA DAT. Gui ${out}/run-report.json va FAIL-*.log.`);
if(!passed)process.exitCode=1;
