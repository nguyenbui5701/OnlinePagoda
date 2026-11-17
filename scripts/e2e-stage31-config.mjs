import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const url=process.env.TEST_URL||'http://127.0.0.1:3119';assert.equal((await(await fetch(url+'/api/health')).json()).fixture,true);
const socket=io(url,{auth:{role:'dashboard'}});let settings;socket.on('snapshot',s=>settings=s.settings);socket.on('delta',s=>settings=s.settings);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});const report={kind:'FIXTURE CONFIG / SYNTHETIC IDS ONLY',checks:[]};
try{const page=await browser.newPage({viewport:{width:1440,height:1100}});await page.goto(url+'/dashboard/');await page.getByLabel('Gift ID 8',{exact:true}).waitFor();
for(let i=1;i<=8;i++){await page.getByLabel(`Gift ID ${i}`,{exact:true}).fill(String(990000+i));await page.getByLabel(`Xác minh quà ${i}`,{exact:true}).check();}
await page.getByRole('button',{name:'Lưu danh mục quà',exact:true}).click();
for(let i=0;i<40&&!settings?.giftCatalog?.some(g=>g.giftId==='990008');i++)await page.waitForTimeout(100);
assert.equal(settings.giftCatalog.filter(g=>g.verified).length,8);await page.reload();await page.waitForFunction(()=>document.querySelector('[aria-label="Gift ID 8"]')?.value==='990008');report.checks.push('Eight synthetic mappings saved via UI and restored after reload');
await page.getByLabel('Gift ID 8',{exact:true}).fill('990001');await page.getByRole('button',{name:'Lưu danh mục quà',exact:true}).click();await page.getByRole('alert').filter({hasText:'Kiểm tra ID'}).waitFor();assert.ok(settings.giftCatalog.some(g=>g.giftId==='990008'));report.checks.push('Duplicate IDs rejected without overwriting valid config');
await page.getByLabel('Âm lượng Voice',{exact:true}).fill('0.5');await page.getByLabel('Âm lượng SFX',{exact:true}).fill('0.25');await page.getByLabel('Âm lượng Ambience',{exact:true}).fill('0.1');
for(let i=0;i<40&&settings?.ambienceVolume!==.1;i++)await page.waitForTimeout(100);
assert.equal(settings.voiceVolume,.5);assert.equal(settings.sfxVolume,.25);assert.equal(settings.ambienceVolume,.1);report.checks.push('Three independent volume controls persist server settings');
await new Promise((done,reject)=>socket.timeout(5000).emit('command',{type:'settings',patch:{giftCatalog:[],voiceVolume:.8,sfxVolume:.65,ambienceVolume:.15}},(e,r)=>e?reject(e):r.ok?done():reject(Error(r.error))));
await page.reload();await page.getByLabel('Gift ID 8',{exact:true}).waitFor();assert.equal(await page.getByLabel('Gift ID 1',{exact:true}).inputValue(),'');report.checks.push('Unmapping returns all eight editable unverified groups');
await page.screenshot({path:'artifacts/stage3_1/dashboard-gift-audio-settings.png',fullPage:true});report.passed=true;
}catch(error){report.passed=false;report.failure=String(error.stack||error);process.exitCode=1;}
finally{socket.disconnect();await browser.close();await writeFile('artifacts/stage3_1/config-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
