import {fork} from 'node:child_process';
import {chromium} from 'playwright';
import {io} from 'socket.io-client';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function until(fn,label,timeout=18000){const t=Date.now();while(Date.now()-t<timeout){if(await fn())return;await sleep(80);}throw Error('Timeout '+label);}
export async function visualFixture(build,port=3185){
 const url=`http://127.0.0.1:${port}`,errors=[];let server,browser,socket,state,page;
 async function close(){socket?.disconnect();await browser?.close();if(server&&server.exitCode===null){if(server.connected)server.send('shutdown');await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);if(server.exitCode===null)server.kill();}}
 try{
  try{await fetch(url+'/api/health',{signal:AbortSignal.timeout(400)});throw Error('Port occupied');}catch(e){if(e.message==='Port occupied')throw e;}
  server=fork('tests/fixtures/server.ts',[],{execArgv:['--import','tsx'],windowsHide:true,env:{...process.env,FIXTURE_PORT:String(port),APP_BUILD_DIRECTORY:resolve(build),FIXTURE_DATA_DIRECTORY:resolve(`test-results/visual-${port}-${Date.now()}`)},stdio:['ignore','pipe','pipe','ipc']});
  server.stdout.on('data',()=>{});server.stderr.on('data',d=>errors.push(String(d)));
  await until(async()=>{try{return(await(await fetch(url+'/api/health')).json()).fixture===true;}catch{return false;}},'fixture ready');
  socket=io(url,{auth:{role:'dashboard'}});socket.on('snapshot',v=>state=v);socket.on('delta',v=>{const actors=new Map((state?.actors||[]).map(a=>[a.key,a]));for(const k of v.removed||[])actors.delete(k);for(const a of v.upserts||[])actors.set(a.key,a);state={...v,actors:[...actors.values()]};});await until(()=>state,'snapshot');
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const context=await browser.newContext();await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:576,height:1024});await page.goto(url+'/overlay/?capture=1');await page.waitForFunction(()=>window.__sceneDebug?.revision>0);
  const rpc=(name,data)=>new Promise((ok,bad)=>socket.timeout(6000).emit(name,data,(e,r)=>e?bad(e):r?.ok?ok(r):bad(Error(r?.error||'Rejected'))));
  const cmd=data=>rpc('command',data),event=e=>cmd({type:'event',event:{eventId:crypto.randomUUID(),...e}});
  return {page,context,url,errors,close,cmd,event,rpc,get state(){return state;}};
 }catch(e){await close();throw e;}
}
export async function startVideo(page){await page.evaluate(()=>{window.__vchunks=[];window.__vstream=document.querySelector('canvas').captureStream(20);window.__vrec=new MediaRecorder(window.__vstream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2000000});window.__vrec.ondataavailable=e=>window.__vchunks.push(e.data);window.__vrec.start(250);});}
export async function stopVideo(page,path){const data=await page.evaluate(()=>new Promise(done=>{window.__vrec.onstop=async()=>{const bytes=new Uint8Array(await new Blob(window.__vchunks,{type:'video/webm'}).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));window.__vstream.getTracks().forEach(t=>t.stop());done(btoa(s));};window.__vrec.stop();}));await writeFile(path,Buffer.from(data,'base64'));}
