import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out=process.env.ARTIFACT_DIR||'artifacts/live-mobile-fix',build=process.env.APP_BUILD_DIRECTORY||'test-results/live-mobile-dist';await mkdir(out,{recursive:true});
const before=await readFile('data/settings.json'),checks=[];
const jobs=[
 ['typecheck',process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{}],
 ['unit',process.execPath,['node_modules/vitest/vitest.mjs','run'],{}],
 ['python',process.env.TTS_PYTHON||'python',['tests/test_tts_environment.py'],{}],
 ['build',process.execPath,['scripts/build.mjs'],{APP_BUILD_DIRECTORY:build}],
 ['e2e-mobile',process.execPath,['scripts/e2e-live-mobile.mjs'],{APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:out}],
 ['e2e-voice',process.execPath,['scripts/e2e-fortune-voice.mjs'],{APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:out+'/voice-regression'}],
 ['e2e-fortune',process.execPath,['scripts/e2e-fortune2027.mjs'],{APP_BUILD_DIRECTORY:build,ARTIFACT_DIR:out+'/fortune-regression'}]
];
for(const [name,exe,args,env] of jobs){let log='';console.log('Dang chay '+name);const c=spawn(exe,args,{windowsHide:true,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});c.stdout.on('data',d=>log+=d);c.stderr.on('data',d=>log+=d);const code=await new Promise((done,fail)=>{c.once('error',fail);c.once('exit',done);});checks.push({name,code});await writeFile(`${out}/${name}.log`,log);console.log(name+': '+(code===0?'PASS':'FAIL'));if(code!==0){console.log(log.slice(-2500));break;}}
const hash=b=>createHash('sha256').update(b).digest('hex'),preserved=hash(before)===hash(await readFile('data/settings.json'));
const passed=checks.length===jobs.length&&checks.every(c=>c.code===0)&&preserved;
await writeFile(out+'/run-report.json',JSON.stringify({checks,operatingSettingsUnchanged:preserved,passed,liveStudioAudio:'NOT VERIFIED'},null,2));if(!passed)process.exitCode=1;
