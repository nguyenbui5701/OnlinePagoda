import {mkdir,writeFile} from 'node:fs/promises';
import {dynamicThanksText} from '../packages/shared/src/gifts.ts';
import {synthesizeGtts32} from '../apps/server/src/voice32.ts';
const out='artifacts/gift-showcase/voice-samples';await mkdir(out,{recursive:true});const report={voice:'Existing Vietnamese gTTS pipeline, atempo 1.5',samples:[],passed:false};
for(const [i,group] of ['bouquet','bouquet','offering','lion','heart'].entries()){
  const text=dynamicThanksText({eventKey:`showcase-sample-${i}`,displayName:'An Nhiên',thanksTemplateKey:group});
  try{
    const data=await synthesizeGtts32(text),pcm=Buffer.from(data.pcm16,'base64'),h=Buffer.alloc(44);
    h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVE',8);h.write('fmt ',12);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
    const file=`${i+1}-${group}.wav`;await writeFile(out+'/'+file,Buffer.concat([h,pcm]));report.samples.push({file,text,seconds:pcm.length/48000,passed:true});console.log(file+' OK');
  }catch(e){report.samples.push({text,passed:false,error:String(e.message)});console.log('FAIL '+String(e.message));}
}
report.passed=report.samples.every(s=>s.passed);await writeFile(out+'/voice-report.json',JSON.stringify(report,null,2));
console.log('Mo file WAV trong '+out+' de nghe. Khong thay doi LIVE hay cai dat.');if(!report.passed)process.exitCode=1;
