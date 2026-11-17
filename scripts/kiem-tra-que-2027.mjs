import { spawn } from 'node:child_process';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const out='artifacts/fortune2027';await mkdir(out,{recursive:true});
const checks=[];const before=await readFile('data/settings.json').catch(()=>null);
const jobs=[
  ['pack',['--test','chuaonl_2027_que/tests/fortune.test.mjs'],{}],
  ['typecheck',['node_modules/typescript/bin/tsc','--noEmit'],{}],
  ['unit',['node_modules/vitest/vitest.mjs','run'],{}],
  ['build',['scripts/build.mjs'],{APP_BUILD_DIRECTORY:'test-results/fortune2027-dist'}],
  ['e2e',['scripts/e2e-fortune2027.mjs'],{APP_BUILD_DIRECTORY:'test-results/fortune2027-dist'}],
  ['live-regression',['scripts/e2e-live.mjs'],{APP_BUILD_DIRECTORY:'test-results/fortune2027-dist',ARTIFACT_DIR:out+'/live-regression',FIXTURE_PORT:'3148'}]
];
for(const [name,args,env] of jobs){
  console.log('Dang chay '+name+' ...');let log='';const child=spawn(process.execPath,args,{env:{...process.env,...env},windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',v=>log+=v);child.stderr.on('data',v=>log+=v);
  const code=await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',done);});
  await writeFile(`${out}/${name}.log`,log);checks.push({name,code});console.log(`${name}: ${code===0?'PASS':'FAIL'}`);
  if(code!==0){console.log(log.slice(-2500));process.exitCode=1;break;}
}
const after=await readFile('data/settings.json').catch(()=>null);
const hash=b=>b?createHash('sha256').update(b).digest('hex'):null;
const preserved=hash(before)===hash(after);if(!preserved)process.exitCode=1;
const report={checks,operatingSettingsUnchanged:preserved,passed:checks.length===jobs.length&&checks.every(c=>c.code===0)&&preserved};
await writeFile(out+'/run-report.json',JSON.stringify(report,null,2));
console.log(report.passed?'DA QUA KIEM THU. Anh va log: artifacts/fortune2027':'CHUA QUA HET. Gui artifacts/fortune2027/run-report.json va file log FAIL cho Codex.');
console.log('Ban build thu rieng; server/LIVE dang dung khong bi khoi dong lai.');
