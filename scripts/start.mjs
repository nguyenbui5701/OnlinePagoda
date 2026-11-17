import 'dotenv/config';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const port=Number(process.env.PORT||3000);
const base=`http://127.0.0.1:${port}`;
try {
  const response=await fetch(`${base}/api/health`,{signal:AbortSignal.timeout(1000)});
  if(response.ok){console.error(`Cong ${port} da duoc su dung. Mo http://localhost:${port}/dashboard/ hoac dung server cu.`);process.exit(1);}
}catch{}
const server=spawn(process.execPath,['dist/server.mjs'],{stdio:'inherit',windowsHide:true});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.on('exit',code=>{process.exitCode=code??0;});
let ready=false;
for(let i=0;i<60&&server.exitCode===null;i++){
  try{const r=await fetch(`${base}/api/health`,{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
}
if(!ready){console.error('Server khong san sang sau 30 giay.');server.kill();process.exitCode=1;}
else if(process.env.NO_BROWSER!=='1'){
  // Use the Windows URL handler; host and port are fixed/validated, never user text.
  for(const path of ['dashboard/','overlay/'])spawn('rundll32',['url.dll,FileProtocolHandler',`http://localhost:${port}/${path}`],{stdio:'ignore',windowsHide:true}).unref();
}
process.on('SIGINT',()=>server.kill('SIGINT'));process.on('SIGTERM',()=>server.kill('SIGTERM'));
if(server.exitCode===null)await once(server,'exit');
