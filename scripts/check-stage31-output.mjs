// Records only the short, explicitly requested local output check. No LIVE mutations.
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=3119,out='artifacts/stage3_1/capture',start=Date.now();
const health=await(await fetch(`http://127.0.0.1:${port}/api/health`)).json();
assert.equal(health.fixture,true);assert.equal(health.mode,'DEMO');
function run(exe,args,env={}){const child=spawn(exe,args,{env:{...process.env,...env},windowsHide:true,stdio:'inherit'});const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code));});return {child,done};}
const recording=run('python',['scripts/record-stage31-loopback.py']);
try{
  let ready=false;for(let i=0;i<100;i++){try{ready=(await stat(out+'/loopback-ready.txt')).mtimeMs>=start;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,'WASAPI recorder did not become ready');
  const capture=run(process.execPath,['scripts/open-overlay.mjs','--check'],{PORT:String(port),CAPTURE_ARTIFACT_DIR:out,CAPTURE_AUDIO_CHECK:'1'});
  assert.equal(await capture.done,0,'Electron playback/capture failed');assert.equal(await recording.done,0,'Output recording failed');
}finally{recording.child.kill();}
