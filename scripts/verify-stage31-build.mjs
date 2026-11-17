import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const checks=[];
for(const [name,args,extra] of [
  ['typecheck',['node_modules/typescript/bin/tsc','--noEmit'],{}],
  ['unit',['node_modules/vitest/vitest.mjs','run'],{}],
  ['build',['scripts/build.mjs'],{APP_BUILD_DIRECTORY:'dist'}],
  ['build-fixture',['scripts/build.mjs'],{APP_BUILD_DIRECTORY:'test-results/stage31-dist'}]
]){let log='';const child=spawn(process.execPath,args,{env:{...process.env,...extra},windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);const code=await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',done);});await writeFile(`artifacts/stage3_1/${name}.log`,log);checks.push({name,code});console.log(name+': '+code);if(code!==0){console.log(log);process.exitCode=1;break;}}
await writeFile('artifacts/stage3_1/build-report.json',JSON.stringify({checks,passed:checks.length===4&&checks.every(c=>c.code===0)},null,2));
