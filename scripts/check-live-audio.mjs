import { spawn } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import { synthesizeGtts32 } from '../apps/server/src/voice32.ts';
const out='artifacts/live-mobile-fix';await mkdir(out,{recursive:true});
const report={checkedAt:new Date().toISOString(),dependencies:false,realTts:false,listening:'PENDING USER',liveStudioAudio:'NOT VERIFIED'};
try{
  let data='';const p=spawn(process.env.TTS_PYTHON||'python',['scripts/synthesize-stage32.py','--check'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  p.stdout.on('data',c=>data+=c);p.stderr.resume();const code=await new Promise((done,fail)=>{p.once('error',fail);p.once('exit',done);});
  if(code!==0)throw Error('Python/gTTS/FFmpeg unavailable. Install dependencies or set FFMPEG_PATH.');
  report.dependencies=JSON.parse(data);
  const start=Date.now(),pcm=await synthesizeGtts32('Xin mời Khách An Lành. Chúc gia đình luôn bình an.');
  const raw=Buffer.from(pcm.pcm16,'base64'),h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(raw.length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(raw.length,40);
  let peak=0,sum=0;for(let i=0;i<raw.length;i+=2){const n=raw.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(n));sum+=n*n;}
  if(peak<.001)throw Error('Silent PCM');
  await writeFile(out+'/giong-live.wav',Buffer.concat([h,raw]));report.realTts={generated:true,latencyMs:Date.now()-start,durationSeconds:raw.length/48000,peak,rms:Math.sqrt(sum/(raw.length/2))};
  console.log('Da tao artifacts/live-mobile-fix/giong-live.wav. Mo file de nghe.');
}catch(e){report.error=String(e);process.exitCode=1;console.error(report.error);}
await writeFile(out+'/audio-check.json',JSON.stringify(report,null,2));
