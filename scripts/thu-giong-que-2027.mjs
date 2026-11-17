import { mkdir,writeFile } from 'node:fs/promises';
import { fortuneVoiceText } from '../apps/server/src/fortune-voice-service.ts';
import { synthesizeGtts32 } from '../apps/server/src/voice32.ts';
import { getFortuneCatalog } from '../apps/server/src/fortune-catalog.ts';
const out='artifacts/fortune2027-voice';await mkdir(out,{recursive:true});
const f=getFortuneCatalog().find(f=>f.number===123);
if(!f)throw Error('Missing fortune #123');
const text=fortuneVoiceText({displayName:'Khách An Lành',number:f.number,short:f.short_text});
try{
  const result=await synthesizeGtts32(text),pcm=Buffer.from(result.pcm16,'base64');
  const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  let peak=0,sum=0;for(let i=0;i<pcm.length;i+=2){const n=pcm.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(n));sum+=n*n;}
  const metrics={generated:true,text,durationSeconds:pcm.length/48000,peak,rms:Math.sqrt(sum/(pcm.length/2)),listening:'PENDING USER',realLive:'NOT VERIFIED'};
  await writeFile(out+'/thu-giong-que.wav',Buffer.concat([header,pcm]));await writeFile(out+'/voice-sample-report.json',JSON.stringify(metrics,null,2));
  console.log('Da tao '+out+'/thu-giong-que.wav. Hay mo file de nghe ten va loi que.');
}catch(e){await writeFile(out+'/voice-sample-report.json',JSON.stringify({generated:false,error:String(e)},null,2));throw e;}
