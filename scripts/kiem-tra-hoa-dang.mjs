import { spawn } from 'node:child_process';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const out='artifacts/lantern2027',build='test-results/lantern2027-dist';await mkdir(out,{recursive:true});
const checks=[],before=await readFile('data/settings.json').catch(()=>null);
const jobs=[
  ['typecheck',['node_modules/typescript/bin/tsc','--noEmit'],{}],
  ['unit',['node_modules/vitest/vitest.mjs','run'],{}],
  ['build',['scripts/build.mjs'],{APP_BUILD_DIRECTORY:build}],
  ['e2e-lantern',['scripts/e2e-lantern2027.mjs'],{APP_BUILD_DIRECTORY:build}],
  ['e2e-voice',['scripts/e2e-fortune-voice.mjs'],{APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:out+'/voice-regression'}],
  ['e2e-fortune',['scripts/e2e-fortune2027.mjs'],{APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:out+'/fortune-regression'}]
];
try{
  for(const [name,args,env] of jobs){
    console.log('Dang chay '+name+' ...');let log='';
    const child=spawn(process.execPath,args,{env:{...process.env,...env},windowsHide:true,stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',v=>log+=v);child.stderr.on('data',v=>log+=v);
    const code=await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',done);});
    await writeFile(`${out}/${name}.log`,log);checks.push({name,code});console.log(`${name}: ${code===0?'PASS':'FAIL'}`);
    if(code!==0){console.log(log.slice(-3500));break;}
  }
}catch(e){checks.push({name:'runner',code:1,error:String(e)});}
const hash=b=>b?createHash('sha256').update(b).digest('hex'):null;
const preserved=hash(before)===hash(await readFile('data/settings.json').catch(()=>null));
const passed=checks.length===jobs.length&&checks.every(c=>c.code===0)&&preserved;
await writeFile(out+'/run-report.json',JSON.stringify({checks,operatingSettingsUnchanged:preserved,passed,realLive:'NOT VERIFIED',visualApproval:'PENDING USER'},null,2));
console.log(passed?'PASS kiem thu gia lap. Can duyet anh va thu LIVE that.':'CHUA QUA HET. Gui run-report.json va log FAIL.');
console.log('Ket qua: '+out+'; server va LIVE dang dung khong bi khoi dong lai.');if(!passed)process.exitCode=1;
