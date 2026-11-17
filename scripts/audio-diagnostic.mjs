import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
const page=await browser.newPage();page.on('response',r=>{if(r.url().includes('/audio/'))console.log('HTTP',r.request().method(),r.url(),r.status(),r.headers());});await page.goto('http://127.0.0.1:3119/overlay/?sound=1');await page.waitForFunction(()=>window.__audioControl);
console.log(await page.evaluate(()=>({url:location.href,controls:document.getElementById('audio-controls')?.outerHTML,debug:window.__audioControl.debug()})));
await page.keyboard.press('a');
await page.locator('#audio-controls button').first().click({force:true});await page.waitForTimeout(4000);
console.log(await page.evaluate(()=>window.__audioControl.debug()));
console.log(await page.evaluate(async()=>{const r=await fetch('/overlay/audio/vi-v2/generic.wav');const a=await r.arrayBuffer();return {status:r.status,type:r.headers.get('content-type'),length:a.byteLength,header:Array.from(new Uint8Array(a).slice(0,44))};}));
}finally{await browser.close();}
