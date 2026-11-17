import {mkdir,writeFile} from 'node:fs/promises';
import {lanternThemes} from '../packages/shared/src/lantern.ts';
import {lanternVoiceText} from '../apps/server/src/fortune-voice-service.ts';
import {synthesizeGtts32} from '../apps/server/src/voice32.ts';
const out='artifacts/gift-v3/voice-samples';await mkdir(out,{recursive:true});
const report={voice:'Same Vietnamese gTTS pipeline / atempo 1.5',note:'WAV at base level. Speech boost is applied by the overlay mixer, not these files.',samples:[],passed:false};
for(const theme of lanternThemes){
  const text=lanternVoiceText({version:1,revealId:'sample',sessionId:'sample',displayName:'An Nhiên',topic:theme.id,startedAt:0,expiresAt:8000});
  try{
    const data=await synthesizeGtts32(text),pcm=Buffer.from(data.pcm16,'base64'),h=Buffer.alloc(44);
    h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVE',8);h.write('fmt ',12);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
    const file=theme.id+'.wav';await writeFile(out+'/'+file,Buffer.concat([h,pcm]));report.samples.push({file,text,seconds:pcm.length/48000,passed:true});console.log(file+' OK');
  }catch(e){report.samples.push({text,passed:false,error:String(e.message)});console.log('FAIL '+String(e.message));}
}
report.passed=report.samples.every(s=>s.passed);await writeFile(out+'/voice-report.json',JSON.stringify(report,null,2));console.log('Mo WAV trong '+out+' de nghe.');if(!report.passed)process.exitCode=1;
