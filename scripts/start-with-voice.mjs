import 'dotenv/config';
import { spawn } from 'node:child_process';
const port=Number(process.env.PORT||3000);
try{
  const r=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(1200)});
  if(r.ok){console.error('Server dang chay. Dung server cu khi da san sang; khong build de len LIVE.');process.exit(1);}
}catch{}
async function run(exe,args){const c=spawn(exe,args,{windowsHide:true,stdio:'inherit',env:{...process.env,TTS_DYNAMIC_ENABLED:'1'}});const code=await new Promise((done,fail)=>{c.once('error',fail);c.once('exit',done);});if(code!==0)process.exit(code||1);}
await run(process.env.TTS_PYTHON||'python',['scripts/synthesize-stage32.py','--check']);
await run(process.execPath,['scripts/build.mjs']);
await run(process.execPath,['scripts/start.mjs']);
