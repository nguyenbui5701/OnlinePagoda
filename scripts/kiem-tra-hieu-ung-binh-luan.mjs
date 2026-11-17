import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='artifacts/comment-effects-large',build='test-results/comment-effects-large-dist';await mkdir(out,{recursive:true});
async function settingsHash(){try{return createHash('sha256').update(await readFile('data/settings.json')).digest('hex');}catch(e){if(e.code==='ENOENT')return 'absent';throw e;}}
const before=await settingsHash(),checks=[],startedAt=new Date().toISOString();
const jobs=[['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],['unit',['node_modules/vitest/vitest.mjs','run']],['build',['scripts/build.mjs']],['e2e',['scripts/e2e-comment-effects-large.mjs']],['voice-regression',['scripts/e2e-fortune-voice.mjs']]];
for(const [name,args] of jobs){
  console.log(name+'...');let log='';const child=spawn(process.execPath,args,{windowsHide:true,env:{...process.env,APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:name==='voice-regression'?out+'/voice-regression':out},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
  const code=await new Promise(done=>{child.once('error',e=>{log+=e.stack;done(-1);});child.once('exit',done);});
  checks.push({name,code});await writeFile(`${out}/${name}.log`,log);console.log(`${name}: ${code===0?'PASS':'FAIL'}`);
  if(code!==0){await writeFile(`${out}/FAIL-${name}.log`,log);console.log(log.slice(-3000));break;}
}
const after=await settingsHash();let render;
if(checks.some(c=>c.name==='e2e'))try{render=JSON.parse(await readFile(out+'/e2e-report.json','utf8'));}catch{}
const passed=checks.length===jobs.length&&checks.every(c=>c.code===0)&&before===after;
await writeFile(out+'/run-report.json',JSON.stringify({startedAt,finishedAt:new Date().toISOString(),passed,checks,settings:{before,after,unchanged:before===after},render,productionServer:'Not restarted; isolated fixtures/build',realLive:'NOT VERIFIED'},null,2));
console.log(passed?'PASS. Xem anh va seven-effects.webm trong '+out:'CHUA DAT. Gui '+out+'/run-report.json va FAIL-*.log.');if(!passed)process.exitCode=1;
